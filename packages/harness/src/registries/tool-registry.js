// tool-registry.js — 工具注册表（V0.3-harness）
// 所有工具调用必须通过 ToolRegistry，不允许手写业务流程

const fs = require('fs');
const path = require('path');
const { PortfolioRepository, KlineRepository, DecisionLogRepository } = require('../../../data/src/repositories.cjs');

// ===== Decision Severity =====
const SEVERITY = Object.freeze({
  EXCLUDE: 100, DATA_INSUFFICIENT: 90, REDUCE_EXIT: 80,
  CAUTIOUS_HOLD: 60, WATCH: 40, HOLD: 20,
});

// ===== Tool Context =====
function emptyCtx(requestId) {
  return { requestId: requestId || 'unknown', asOfDate: new Date().toISOString().slice(0, 7) };
}

// ===================================================================
// Tool Implementations
// ===================================================================

const tools = {};

// 1. get_portfolio
tools.get_portfolio = {
  name: 'get_portfolio',
  description: '从 sample CSV 读取持仓',
  category: 'data',
  permission: 'read',
  inputSchema: { type: 'object', properties: { csvPath: { type: 'string' } } },
  outputSchema: { type: 'object', properties: { holdings: { type: 'array' }, count: { type: 'number' } } },
  async execute(input, ctx) {
    const repo = new PortfolioRepository(input.csvPath);
    const holdings = repo.getAll();
    return {
      ok: true, data: { holdings, count: holdings.length },
      evidence: [{ source: 'portfolio', title: '持仓数量', value: holdings.length }],
    };
  },
};

// 2. get_kline_250d
tools.get_kline_250d = {
  name: 'get_kline_250d',
  description: '按 symbol 列表获取日 K 线数据',
  category: 'market',
  permission: 'read',
  inputSchema: { type: 'object', properties: {
    symbols: { type: 'array', items: { type: 'string' } },
    csvPath: { type: 'string' },
  }},
  outputSchema: { type: 'object', properties: { bars: { type: 'object' } } },
  async execute(input, ctx) {
    const repo = new KlineRepository(input.csvPath);
    const map = {};
    let total = 0;
    for (const s of input.symbols) {
      const rows = repo.getBySymbol(s);
      map[s] = rows;
      total += rows.length;
    }
    return {
      ok: true, data: { bars: map },
      evidence: [{ source: 'kline_daily', title: '日K总条数', value: total }],
    };
  },
};

// 3. calculate_250d_performance
tools.calculate_250d_performance = {
  name: 'calculate_250d_performance',
  description: '计算 250 日市场表现（收益率 + 最大回撤）',
  category: 'market',
  permission: 'compute',
  inputSchema: { type: 'object', properties: {
    symbol: { type: 'string' },
    bars: { type: 'array' },
  }},
  outputSchema: { type: 'object', properties: {
    symbol: { type: 'string' }, returnPct: { type: 'number' },
    maxDrawdownPct: { type: 'number' }, windowDays: { type: 'number' },
  }},
  async execute(input, ctx) {
    const sorted = (input.bars || [])
      .filter(b => Number.isFinite(b.close))
      .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate))
      .slice(-250);

    if (sorted.length < 30) {
      return { ok: false, error: { code: 'INSUFFICIENT_DATA', message: `日K不足 ${sorted.length} 条` } };
    }

    const startClose = sorted[0].close;
    const endClose = sorted[sorted.length - 1].close;
    const returnPct = ((endClose - startClose) / startClose) * 100;

    let peak = sorted[0].close;
    let maxDrawdown = 0;
    for (const bar of sorted) {
      peak = Math.max(peak, bar.close);
      const dd = ((bar.close - peak) / peak) * 100;
      maxDrawdown = Math.min(maxDrawdown, dd);
    }

    return {
      ok: true,
      data: { symbol: input.symbol, returnPct: +returnPct.toFixed(2), maxDrawdownPct: +maxDrawdown.toFixed(2), windowDays: sorted.length },
      evidence: [
        { source: 'daily_bar', title: '窗口交易日', value: sorted.length },
        { source: 'daily_bar.close', title: '起始收盘价', value: startClose },
        { source: 'daily_bar.close', title: '结束收盘价', value: endClose },
      ],
    };
  },
};

// 4. check_risk_flags
tools.check_risk_flags = {
  name: 'check_risk_flags',
  description: '检查单只股票的风险标记（ST/退市/停牌）',
  category: 'risk',
  permission: 'compute',
  inputSchema: { type: 'object', properties: { symbol: { type: 'string' }, status: { type: 'string' } } },
  outputSchema: { type: 'object', properties: {
    symbol: { type: 'string' }, status: { type: 'string' },
    hasCriticalRisk: { type: 'boolean' }, actions: { type: 'array' },
  }},
  async execute(input, ctx) {
    const s = input.symbol;
    const st = input.status || 'NORMAL';
    const isCR = st === 'ST' || st === 'DELISTING';
    const riskActions = [];
    if (isCR) riskActions.push('EXCLUDE');
    if (st === 'SUSPENDED') riskActions.push('CAUTIOUS_HOLD');
    return {
      ok: true,
      data: { symbol: s, status: st, hasCriticalRisk: isCR, actions: riskActions },
      evidence: [{ source: 'stock_profile.status', title: '股票状态', value: st }],
    };
  },
};

// 5. build_evidence_list
tools.build_evidence_list = {
  name: 'build_evidence_list',
  description: '汇总工具输出的 evidence 并分配 evidenceId',
  category: 'risk',
  permission: 'read',
  inputSchema: { type: 'object', properties: {
    symbol: { type: 'string' }, performance: { type: 'object' },
    riskFlags: { type: 'object' }, profile: { type: 'object' }, asOfDate: { type: 'string' },
  }},
  outputSchema: { type: 'object', properties: { evidence: { type: 'array' }, evidenceIds: { type: 'array' } } },
  async execute(input, ctx) {
    const ev = [];
    if (input.profile) {
      ev.push({ source: 'stock_profile', title: '股票名称', value: input.profile.name, asOfDate: input.asOfDate });
      ev.push({ source: 'stock_profile.status', title: '股票状态', value: input.profile.status || 'NORMAL', asOfDate: input.asOfDate });
    }
    if (input.performance) {
      ev.push({ source: 'market_performance', title: '250日收益率(%)', value: input.performance.returnPct, asOfDate: input.asOfDate });
      ev.push({ source: 'market_performance', title: '250日最大回撤(%)', value: input.performance.maxDrawdownPct, asOfDate: input.asOfDate });
    }
    ev.push({ source: 'risk_gate', title: '存在严重风险', value: !!input.riskFlags?.hasCriticalRisk, asOfDate: input.asOfDate });

    const ids = ev.map((_, i) => `ev-${String(i + 1).padStart(3, '0')}`);
    return { ok: true, data: { evidence: ev, evidenceIds: ids } };
  },
};

// 6. model_analyze_stock
tools.model_analyze_stock = {
  name: 'model_analyze_stock',
  description: '调用模型分析单只股票（DeepSeek → Mock 回退）',
  category: 'model',
  permission: 'model',
  inputSchema: { type: 'object', properties: {
    symbol: { type: 'string' }, name: { type: 'string' }, status: { type: 'string' },
    returnPct: { type: 'number' }, maxDrawdownPct: { type: 'number' },
    hasCriticalRisk: { type: 'boolean' }, hasRiskSignals: { type: 'boolean' },
    asOfDate: { type: 'string' }, gateway: { type: 'object' },
  }},
  outputSchema: { type: 'object', properties: {
    modelAction: { type: 'string' }, modelConfidence: { type: 'number' },
    modelReasoning: { type: 'string' }, bullPoints: { type: 'array' }, bearPoints: { type: 'array' },
    modelSource: { type: 'string' }, tokenUsage: { type: 'object' },
  }},
  async execute(input, ctx) {
    const gw = input.gateway;
    // DeepSeek path
    if (gw && gw.hasDeepSeek) {
      const prompt = `分析 ${input.symbol}（${input.name}）：
状态: ${input.status}
250日收益率: ${(input.returnPct || 0).toFixed(2)}%
严重风险: ${input.hasCriticalRisk}
风险信号: ${input.hasRiskSignals}

输出 JSON:
{
  "symbol": "${input.symbol}",
  "modelAction": "HOLD"|"CAUTIOUS_HOLD"|"EXCLUDE",
  "modelConfidence": 0.0-1.0,
  "modelReasoning": "理由",
  "bullPoints": [],
  "bearPoints": []
}`;

      const fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gw.config.apiKey}` },
        body: JSON.stringify({
          model: gw.config.model, temperature: 0.2, max_tokens: 2000,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: '输出 JSON。只分析证据，不编造。action 选 HOLD/CAUTIOUS_HOLD/EXCLUDE。' },
            { role: 'user', content: prompt },
          ],
        }),
      };

      try {
        const url = `${gw.config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
        const response = await fetch(url, fetchOptions);
        if (response.ok) {
          const json = await response.json();
          const content = json.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            return {
              ok: true,
              data: {
                modelAction: ['HOLD', 'CAUTIOUS_HOLD', 'EXCLUDE'].includes(parsed.modelAction) ? parsed.modelAction : 'CAUTIOUS_HOLD',
                modelConfidence: Math.max(0, Math.min(1, parsed.modelConfidence || 0.5)),
                modelReasoning: parsed.modelReasoning || '',
                bullPoints: parsed.bullPoints || [], bearPoints: parsed.bearPoints || [],
                modelSource: 'deepseek',
                tokenUsage: json.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
              },
            };
          }
        }
      } catch (e) {
        // fall through to mock
      }
    }

    // Mock fallback
    let mockAction = 'HOLD';
    let mockConf = 0.7;
    let mockReason = `[${input.symbol}] 未发现重大风险信号。`;
    let bull = [], bear = [];

    if (input.hasCriticalRisk) {
      mockAction = 'EXCLUDE'; mockConf = 0.85; mockReason = `[${input.symbol}] 触发重大风险规则。`;
      bear = ['触发退市/ST 风险'];
    } else if (input.hasRiskSignals) {
      mockAction = 'CAUTIOUS_HOLD'; mockConf = 0.55; mockReason = `[${input.symbol}] 存在风险信号。`;
      bear = ['存在风险信号'];
    } else {
      bull = [(input.returnPct || 0) > 0 ? `250日收益 ${(input.returnPct || 0).toFixed(1)}%` : '波动可控'];
    }

    return {
      ok: true,
      data: {
        modelAction: mockAction, modelConfidence: mockConf, modelReasoning: mockReason,
        bullPoints: bull, bearPoints: bear,
        modelSource: 'mock',
        tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      },
    };
  },
};

// 7. risk_judge
tools.risk_judge = {
  name: 'risk_judge',
  description: '风控裁决：硬规则优先，judge severity > llm severity 时覆盖',
  category: 'risk',
  permission: 'judge',
  inputSchema: { type: 'object', properties: {
    symbol: { type: 'string' }, hasCriticalRisk: { type: 'boolean' },
    performanceOk: { type: 'boolean' }, hasData: { type: 'boolean' },
    modelAction: { type: 'string' }, modelConfidence: { type: 'number' },
  }},
  outputSchema: { type: 'object', properties: {
    action: { type: 'string' }, confidence: { type: 'number' },
    hardRuleApplied: { type: 'boolean' }, severityConflict: { type: 'boolean' },
  }},
  async execute(input, ctx) {
    // Judge 用自己的评估（不依赖 LLM）
    let judgeAction = 'HOLD';
    let judgeConf = 0.5;

    if (input.hasCriticalRisk) { judgeAction = 'EXCLUDE'; judgeConf = 0.95; }
    else if (!input.hasData) { judgeAction = 'DATA_INSUFFICIENT'; judgeConf = 0.5; }
    else if (!input.performanceOk) { judgeAction = 'CAUTIOUS_HOLD'; judgeConf = 0.5; }
    else { judgeAction = 'HOLD'; judgeConf = 0.65; }

    // 最终规则
    const severity = { EXCLUDE: 100, DATA_INSUFFICIENT: 90, REDUCE_EXIT: 80, CAUTIOUS_HOLD: 60, WATCH: 40, HOLD: 20 };
    const judgeSev = severity[judgeAction] || 0;
    const modelSev = severity[input.modelAction] || 0;

    // 硬规则触发 → 覆盖
    if (input.hasCriticalRisk || !input.hasData) {
      return {
        ok: true, data: {
          action: judgeAction, confidence: judgeConf,
          hardRuleApplied: true, severityConflict: judgeSev !== modelSev,
        },
      };
    }

    // Judge 更保守 → 覆盖
    if (judgeSev > modelSev) {
      return {
        ok: true, data: {
          action: judgeAction, confidence: judgeConf,
          hardRuleApplied: false, severityConflict: true,
        },
      };
    }

    // 一致 → 用 LLM
    return {
      ok: true, data: {
        action: input.modelAction, confidence: input.modelConfidence,
        hardRuleApplied: false, severityConflict: false,
      },
    };
  },
};

// 8. generate_monthly_report
tools.generate_monthly_report = {
  name: 'generate_monthly_report',
  description: '生成月度持仓体检 Markdown 报告',
  category: 'report',
  permission: 'write',
  inputSchema: { type: 'object', properties: { asOfDate: { type: 'string' }, items: { type: 'array' } } },
  outputSchema: { type: 'object', properties: { reportPath: { type: 'string' }, markdown: { type: 'string' } } },
  async execute(input, ctx) {
    const summary = {};
    for (const item of input.items) {
      const action = item.action;
      summary[action] = (summary[action] || 0) + 1;
    }

    const rows = input.items.map(item => {
      const evIds = (item.evidence || []).map((_, i) => `ev-${String(i + 1).padStart(3, '0')}`).join(', ');
      const watch = (item.nextWatchPoints || []).join('；');
      return `| ${item.symbol} | ${item.action} | ${(item.confidence * 100).toFixed(0)}% | ${item.summary} | ${evIds} | ${watch} |`;
    }).join('\n');

    const summaryRows = Object.entries(summary).map(([a, c]) => `| ${a} | ${c} |`).join('\n');

    const markdown = `# 月度持仓体检报告

**分析日期**: ${input.asOfDate}
**生成时间**: ${new Date().toISOString()}

## 汇总

| 决策 | 数量 |
|---|---|
${summaryRows}

## 明细

| 股票 | 建议 | 置信度 | 摘要 | Evidence ID | 下次观察点 |
|---|---|---|---|---|---|
${rows}

---

> 本报告由 LongHold Assistant V0.3 自动生成，仅用于个人研究和复盘，不构成投资建议。
> 硬规则覆盖标记 (hard_rule_override): 当股票触发退市/ST/数据缺失等硬规则时，系统自动覆盖模型输出。
`;

    const reportDir = path.resolve('data/reports/monthly');
    fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.resolve(reportDir, `monthly_hold_review_${input.asOfDate}.md`);
    fs.writeFileSync(reportPath, markdown, 'utf-8');

    return { ok: true, data: { reportPath, markdown } };
  },
};

// 9. write_decision_log
tools.write_decision_log = {
  name: 'write_decision_log',
  description: '写入决策日志到 memory/decision-log/',
  category: 'memory',
  permission: 'write',
  inputSchema: { type: 'object', properties: {
    traceId: { type: 'string' }, taskId: { type: 'string' }, skillId: { type: 'string' },
    decisions: { type: 'array' },
  }},
  outputSchema: { type: 'object', properties: { logIds: { type: 'array' } } },
  async execute(input, ctx) {
    const repo = new DecisionLogRepository();
    const logIds = [];
    for (const d of input.decisions) {
      const logId = `log-${d.symbol}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      repo.write({
        logId, taskId: input.taskId, skillId: input.skillId,
        symbol: d.symbol, action: d.action, confidence: d.confidence, summary: d.summary,
        evidenceJson: JSON.stringify(d.evidence || []),
        risksJson: JSON.stringify(d.risks || []),
        traceId: input.traceId, createdAt: new Date().toISOString(),
      });
      logIds.push(logId);
    }
    return { ok: true, data: { logIds } };
  },
};

// ===================================================================
// ToolRegistry Class
// ===================================================================

class ToolRegistry {
  constructor() {
    this._tools = {};
    this._registerDefaults();
  }

  _registerDefaults() {
    for (const [name, tool] of Object.entries(tools)) {
      this.register(tool);
    }
  }

  register(tool) {
    if (!tool.name || !tool.execute) {
      throw new Error(`工具必须包含 name 和 execute: ${JSON.stringify(tool.name)}`);
    }
    this._tools[tool.name] = tool;
  }

  get(name) {
    return this._tools[name];
  }

  has(name) {
    return !!this._tools[name];
  }

  list() {
    return Object.values(this._tools);
  }

  listByCategory(cat) {
    return this.list().filter(t => t.category === cat);
  }

  async call(name, input, ctx) {
    const tool = this._tools[name];
    if (!tool) {
      return { ok: false, error: { code: 'TOOL_NOT_FOUND', message: `工具 "${name}" 未注册` } };
    }
    const result = await tool.execute(input, ctx || emptyCtx(name));
    result.toolName = name;
    return result;
  }
}

module.exports = { ToolRegistry, tools };
