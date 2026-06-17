// ToolRegistry — V0.1 Deterministic Tool Registry

import type { ToolContext, ToolResult } from '@longhold/tools';
import {
  importPortfolioCsv,
  getPortfolio,
  getKline250d,
  calculate250dPerformance,
  checkRiskFlags,
  buildEvidenceList,
  riskJudge,
  generateMonthlyReport,
  writeDecisionLog,
} from '@longhold/tools';
import type {
  ImportPortfolioInput, ImportPortfolioOutput,
  GetPortfolioInput, GetPortfolioOutput,
  GetKlineInput, GetKlineOutput,
  CalcPerfInput, CalcPerfOutput,
  CheckRiskInput, CheckRiskOutput,
  BuildEvidenceInput, BuildEvidenceOutput,
  RiskJudgeInput, RiskJudgeOutput,
  GenReportInput, GenReportOutput,
  WriteLogInput, WriteLogOutput,
} from '@longhold/tools';

export interface ToolEntry<I, O> {
  name: string;
  description: string;
  category: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  execute(input: I, ctx: ToolContext): Promise<ToolResult<O>>;
}

// ===== Registry =====

type AnyTool = ToolEntry<any, any>;

const toolMap = new Map<string, AnyTool>();

function register<I, O>(tool: ToolEntry<I, O>): void {
  if (toolMap.has(tool.name)) throw new Error(`Tool "${tool.name}" 已注册`);
  toolMap.set(tool.name, tool);
}

// ---- Register all 9 tools ----

register({
  name: 'import_portfolio_csv',
  description: '从 CSV 文件导入持仓数据',
  category: 'data',
  inputSchema: { type: 'object', properties: { csvPath: { type: 'string' } }, required: ['csvPath'] },
  outputSchema: { type: 'object', properties: { symbols: { type: 'array' }, count: { type: 'number' } } },
  execute: importPortfolioCsv,
});

register({
  name: 'get_portfolio',
  description: '获取当前持仓记录',
  category: 'data',
  inputSchema: { type: 'object', properties: { csvPath: { type: 'string' } } },
  outputSchema: { type: 'object', properties: { holdings: { type: 'array' } } },
  execute: getPortfolio,
});

register({
  name: 'get_kline_250d',
  description: '获取指定股票的 250 日日 K 线数据',
  category: 'market',
  inputSchema: { type: 'object', properties: { symbols: { type: 'array', items: { type: 'string' } } }, required: ['symbols'] },
  outputSchema: { type: 'object' },
  execute: getKline250d,
});

register({
  name: 'calculate_250d_performance',
  description: '计算 250 日市场表现（收益率 + 最大回撤）',
  category: 'market',
  inputSchema: { type: 'object', properties: { symbol: { type: 'string' }, bars: { type: 'array' } }, required: ['symbol', 'bars'] },
  outputSchema: { type: 'object', properties: { symbol: { type: 'string' }, returnPct: { type: 'number' }, maxDrawdownPct: { type: 'number' }, windowDays: { type: 'number' } } },
  execute: calculate250dPerformance,
});

register({
  name: 'check_risk_flags',
  description: '检查股票风险标记（ST/退市/停牌）',
  category: 'risk',
  inputSchema: { type: 'object', properties: { symbol: { type: 'string' }, status: { type: 'string' } }, required: ['symbol'] },
  outputSchema: { type: 'object', properties: { symbol: { type: 'string' }, status: { type: 'string' }, actions: { type: 'array' }, hasCriticalRisk: { type: 'boolean' } } },
  execute: checkRiskFlags,
});

register({
  name: 'build_evidence_list',
  description: '汇总证据列表，为每个证据分配 evidence_id',
  category: 'risk',
  inputSchema: { type: 'object', properties: { symbol: { type: 'string' }, performance: { type: 'object' }, riskFlags: { type: 'object' }, asOfDate: { type: 'string' } }, required: ['symbol', 'riskFlags', 'asOfDate'] },
  outputSchema: { type: 'object', properties: { evidence: { type: 'array' }, evidenceIds: { type: 'array' } } },
  execute: buildEvidenceList,
});

register({
  name: 'risk_judge',
  description: '根据风险标记和表现数据做出最终裁定',
  category: 'risk',
  inputSchema: { type: 'object', properties: { symbol: { type: 'string' }, hasCriticalRisk: { type: 'boolean' }, performanceOk: { type: 'boolean' }, hasData: { type: 'boolean' } }, required: ['symbol', 'hasCriticalRisk', 'performanceOk', 'hasData'] },
  outputSchema: { type: 'object', properties: { action: { type: 'string' }, confidence: { type: 'number' }, summary: { type: 'string' }, hardRuleApplied: { type: 'boolean' } } },
  execute: riskJudge,
});

register({
  name: 'generate_monthly_report',
  description: '生成月度持仓体检 Markdown 报告',
  category: 'report',
  inputSchema: { type: 'object', properties: { asOfDate: { type: 'string' }, items: { type: 'array' } }, required: ['asOfDate', 'items'] },
  outputSchema: { type: 'object', properties: { markdown: { type: 'string' }, reportPath: { type: 'string' } } },
  execute: generateMonthlyReport,
});

register({
  name: 'write_decision_log',
  description: '写入决策日志到 memory/decision-log/',
  category: 'memory',
  inputSchema: { type: 'object', properties: { traceId: { type: 'string' }, taskId: { type: 'string' }, skillId: { type: 'string' }, decisions: { type: 'array' } }, required: ['traceId', 'taskId', 'skillId', 'decisions'] },
  outputSchema: { type: 'object', properties: { logIds: { type: 'array' } } },
  execute: writeDecisionLog,
});

// ===== Public API =====

export class ToolRegistry {
  get<I, O>(name: string): ToolEntry<I, O> | undefined {
    return toolMap.get(name) as ToolEntry<I, O> | undefined;
  }

  has(name: string): boolean {
    return toolMap.has(name);
  }

  list(): AnyTool[] {
    return [...toolMap.values()];
  }

  listByCategory(category: string): AnyTool[] {
    return this.list().filter((t) => t.category === category);
  }

  async call<I, O>(name: string, input: I, ctx: ToolContext): Promise<ToolResult<O>> {
    const tool = this.get<I, O>(name);
    if (!tool) {
      return { ok: false, error: { code: 'TOOL_NOT_FOUND', message: `Tool "${name}" 未注册` } };
    }
    return tool.execute(input, ctx);
  }
}

/** 全局单例 */
export const toolRegistry = new ToolRegistry();
