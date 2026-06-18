// skill-runner.cjs — V0.3.1 月度持仓体检确定性流程
// 新增: pre_model_risk_gate, DecisionSource, budget early-stop, PARTIAL_REPORT

const path = require('path');
const { ToolRegistry } = require('../../../harness/src/registries/tool-registry');
const { BudgetPolicy } = require('../../../harness/src/budget/budget-policy');
const { checkPreModelRiskGate } = require('../../../harness/src/pre-model-risk-gate.cjs');
const { checkDataQuality, DQ_STATUS } = require('../../../harness/src/data-quality-gate.cjs');
const { DECISION_SOURCE, buildDecision } = require('../../../harness/src/decision-source.cjs');
const { computeConfidence } = require('../../../data/src/reliability/confidence-calculator.cjs');
const { detectRegime } = require('../../../data/src/reliability/market-regime.cjs');
const { computeReliabilityScore } = require('../../../data/src/reliability/reliability-scorer.cjs');

const DEFAULT_INPUT = {
  portfolioCsv: path.resolve('data/samples/portfolio.sample.csv'),
  klineCsv: path.resolve('data/samples/kline_250d.sample.csv'),
  asOfDate: new Date().toISOString().slice(0, 7),
};

class MonthlyHoldReviewRunner {
  constructor({ toolRegistry, budget, trace, gateway, dataProvider } = {}) {
    this.tools = toolRegistry || new ToolRegistry();
    this.budget = budget || new BudgetPolicy();
    this.trace = trace;
    this.gateway = gateway;
    this.dataProvider = dataProvider;
    this.toolCtx = {
      requestId: 'monthly-review',
      asOfDate: DEFAULT_INPUT.asOfDate,
      dataProvider,   // V1.1: inject for tools
    };
  }

  async run(overrides = {}) {
    const input = { ...DEFAULT_INPUT, ...overrides };
    const asOfDate = input.asOfDate;
    this.toolCtx.asOfDate = asOfDate;
    this.budget.reset();
    let toolExecCount = 0;  // 实际工具执行数
    let traceEventCount = 0;

    // 1. get_portfolio
    this._trace('tool_call', { callId: 'tool-01', toolName: 'get_portfolio' });
    const portfolioR = await this.tools.call('get_portfolio', { csvPath: input.portfolioCsv }, this.toolCtx);
    if (!portfolioR.ok) return { ok: false, error: portfolioR.error, step: 'get_portfolio' };
    const holdings = portfolioR.data.holdings;
    this._onToolCall(toolExecCount++, traceEventCount++);

    if (holdings.length > (this.budget.getConfig().maxStocksPerRun || 20)) {
      return { ok: false, error: { code: 'TOO_MANY_STOCKS', message: `持仓数量 ${holdings.length} 超限 ${this.budget.getConfig().maxStocksPerRun}` } };
    }

    // 2. get_kline_250d
    this._trace('tool_call', { callId: 'tool-02', toolName: 'get_kline_250d' });
    const symbols = holdings.map(h => h.symbol);
    const klineR = await this.tools.call('get_kline_250d', { symbols, csvPath: input.klineCsv }, this.toolCtx);
    if (!klineR.ok) {
      // V1.1: Provider fallback — 安全降级，不终止任务
      if (klineR.error?.code === 'PROVIDER_FALLBACK') {
        this._trace('data_provider_fallback', { reason: klineR.error.message });
        // 所有股票标记为 DATA_INSUFFICIENT，继续生成报告
        const fbDecisions = holdings.map(h => buildDecision({
          symbol: h.symbol, action: 'DATA_INSUFFICIENT', confidence: 0.3,
          summary: `[${h.symbol}] 数据源不可用，安全降级`,
          evidence: [], risks: [],
          decisionSource: DECISION_SOURCE.DATA_INSUFFICIENT_GATE,
          modelCalled: false, hardRuleOverride: true,
          evidenceIds: [],
        }));
        return {
          ok: true,
          data: {
            asOfDate, decisions: fbDecisions,
            reportPath: null, logIds: [],
            budgetStats: this.budget.getStats(),
            traceStats: { traceEvents: traceEventCount, toolExecutions: toolExecCount, toolTraceEvents: toolExecCount + traceEventCount, modelCalls: 0, modelSkips: holdings.length },
            totalTokens: 0, budgetExceeded: false,
          },
        };
      }
      return { ok: false, error: klineR.error, step: 'get_kline_250d' };
    }
    const barsMap = klineR.data.bars;
    this._onToolCall(toolExecCount++, traceEventCount++);

    // Per-stock analysis
    const decisions = [];
    let totalTokens = 0;
    let budgetExceeded = false;
    let budgetExceededReason = null;
    let modelCallCount = 0;
    let modelSkipCount = 0;

    for (let stockIdx = 0; stockIdx < holdings.length; stockIdx++) {
      const holding = holdings[stockIdx];
      const symbol = holding.symbol;
      const bars = barsMap[symbol] || [];
      const status = (symbol.includes('.ST') || (holding.name || '').includes('ST')) ? 'ST' : 'NORMAL';
      const profile = { name: holding.name, status };

      // 3. calculate_250d_performance
      this._trace('tool_call', { callId: `tool-03-${symbol}`, toolName: 'calculate_250d_performance' });
      const perfR = await this.tools.call('calculate_250d_performance', { symbol, bars }, this.toolCtx);
      this._onToolCall(toolExecCount++, traceEventCount++);
      const perfOk = perfR.ok;
      const perfData = perfOk ? perfR.data : null;

      // 4. check_risk_flags
      this._trace('tool_call', { callId: `tool-04-${symbol}`, toolName: 'check_risk_flags' });
      const riskR = await this.tools.call('check_risk_flags', { symbol, status }, this.toolCtx);
      this._onToolCall(toolExecCount++, traceEventCount++);
      const riskData = riskR.ok ? riskR.data : { hasCriticalRisk: false, actions: [] };

      // ===== pre_model_risk_gate (硬规则优先) =====
      const gateResult = checkPreModelRiskGate({
        symbol, status, riskData, hasKline: bars.length > 0,
      });

      if (gateResult.stopReason) {
        // 硬规则阻止，不调用模型
        const action = gateResult.stopReason;
        const conf = action === 'EXCLUDE' ? 0.95 : 0.5;
        const ev = [{ source: 'stock_profile.status', title: '股票状态', value: status }];
        const skipDecision = buildDecision({
          symbol, action, confidence: conf,
          summary: `[${symbol}] ${gateResult.skipReason}`,
          evidence: ev, risks: [], nextWatchPoints: ['确认风险状态'],
          decisionSource: gateResult.decisionSource,
          modelCalled: false, hardRuleOverride: true,
          evidenceIds: ['ev-001'],
        });
        skipDecision.modelSource = gateResult.decisionSource;
        decisions.push(skipDecision);
        modelSkipCount++;
        this._trace('model_skipped', { symbol, reason: gateResult.skipReason, decisionSource: gateResult.decisionSource });
        continue;
      }

      // ===== data_quality_gate (V0.4) — 硬规则通过后检查数据质量 =====
      const dqResult = checkDataQuality(symbol, bars);
      this._trace('data_quality_gate', { symbol, status: dqResult.status, details: dqResult.details });
      if (dqResult.stopAction) {
        const dqDecision = buildDecision({
          symbol, action: dqResult.stopAction, confidence: 0.5,
          summary: `[${symbol}] 数据质量 FAIL (${dqResult.details})`,
          evidence: [{ source: 'data_quality_gate', title: '数据质量', value: dqResult.status }],
          risks: [], nextWatchPoints: ['补齐数据后重新分析'],
          decisionSource: DECISION_SOURCE.DATA_INSUFFICIENT_GATE,
          modelCalled: false, hardRuleOverride: true,
          evidenceIds: ['ev-001'],
        });
        dqDecision.modelSource = 'data_quality_gate';
        decisions.push(dqDecision);
        modelSkipCount++;
        this._trace('model_skipped', { symbol, reason: `data_quality: ${dqResult.status}` });
        continue;
      }

      // ===== V1.2: Inject Data Reliability context =====
      const providerName = this.dataProvider ? this.dataProvider.getProviderName() : 'mock';
      const dataSource = providerName === 'LiveDataProvider' ? 'live' : 'mock';
      const staleness = dqResult.status === 'PASS' ? 'fresh' : dqResult.status === 'WARN' ? 'stale_warn' : 'stale_fail';

      const regime = detectRegime(bars);
      const confidence = computeConfidence({
        symbol, source: dataSource, klines: bars,
        staleness, fallbackUsed: false, rateLimited: false,
      });
      const reliabilityScore = computeReliabilityScore(confidence, dqResult, regime);

      this.toolCtx.dataQuality = {
        confidence: confidence.dataConfidence,
        qualityLevel: confidence.qualityLevel,
        regime: regime.regime,
        volatility: regime.volatility,
        staleLevel: staleness,
        reliabilityScore,
      };

      // ===== pre_model_risk_gate: 正常，允许模型 =====
      // 5. build_evidence_list
      this._trace('tool_call', { callId: `tool-05-${symbol}`, toolName: 'build_evidence_list' });
      const evR = await this.tools.call('build_evidence_list', {
        symbol, performance: perfData, riskFlags: riskData, profile, asOfDate,
      }, this.toolCtx);
      const evidence = evR.ok ? evR.data.evidence : [];
      const evidenceIds = evR.ok ? evR.data.evidenceIds : [];
      this._onToolCall(toolExecCount++, traceEventCount++);

      // 6. model_analyze_stock
      this._trace('tool_call', { callId: `tool-06-${symbol}`, toolName: 'model_analyze_stock' });
      const modelR = await this.tools.call('model_analyze_stock', {
        symbol, name: holding.name, status,
        returnPct: perfData?.returnPct || 0, maxDrawdownPct: perfData?.maxDrawdownPct || 0,
        hasCriticalRisk: riskData.hasCriticalRisk, hasRiskSignals: status === 'SUSPENDED',
        asOfDate, gateway: this.gateway,
        llmStrategy: (this.gateway && this.gateway.llmStrategy) || 'mock_fallback',
      }, this.toolCtx);
      this._onToolCall(toolExecCount++, traceEventCount++);
      const modelOk = modelR.ok && modelR.data;
      if (!modelR.ok) {
        // strict mode error: 传播错误
        if (!this.gateway || this.gateway.llmStrategy === 'strict') {
          return { ok: false, error: modelR.error, step: `model_analyze_stock(${symbol})` };
        }
      }
      this.budget.recordModelCall(modelOk ? modelR.data?.tokenUsage : {});
      modelCallCount++;
      totalTokens += modelOk ? (modelR.data?.tokenUsage?.total_tokens || 0) : 0;

      // 处理模型输出
      const modelOutputValid = modelOk ? modelR.data.modelOutputValid : false;
      const mAction = modelOutputValid ? modelR.data.modelAction : null;
      const mConf = modelOutputValid ? modelR.data.modelConfidence : 0.5;
      const mReason = modelR.ok ? modelR.data.modelReasoning : '';
      const modelSource = modelR.ok ? modelR.data.modelSource : 'mock_fallback';

      // 如果 LLM 输出非法 → 触发 fallback（mAction=null，risk_judge 会覆盖）
      const modelOutputFallback = !modelOutputValid;

      // 7. risk_judge
      this._trace('tool_call', { callId: `tool-07-${symbol}`, toolName: 'risk_judge' });
      const judgeR = await this.tools.call('risk_judge', {
        symbol, hasCriticalRisk: riskData.hasCriticalRisk,
        performanceOk: perfOk, hasData: bars.length > 0,
        modelAction: mAction || 'CAUTIOUS_HOLD',  // 非法则给一个兜底值
        modelConfidence: mConf,
      }, this.toolCtx);
      this._onToolCall(toolExecCount++, traceEventCount++);

      // ===== 构建最终决策 =====
      const jd = judgeR.ok ? judgeR.data : { action: mAction || 'CAUTIOUS_HOLD', confidence: mConf, hardRuleApplied: false, severityConflict: false };

      let decisionSource;
      if (modelOutputFallback) {
        decisionSource = DECISION_SOURCE.FALLBACK_INVALID_MODEL;
      } else if (jd.hardRuleApplied) {
        decisionSource = DECISION_SOURCE.RISK_JUDGE_OVERRIDE;
      } else if (jd.severityConflict) {
        decisionSource = DECISION_SOURCE.RISK_JUDGE_OVERRIDE;
      } else {
        decisionSource = DECISION_SOURCE.MODEL_AGREED;
      }

      const finalAction = jd.action;
      const finalConf = jd.confidence;
      const summary = (jd.hardRuleApplied || jd.severityConflict || modelOutputFallback)
        ? `[${symbol}] ${jd.action}（模型建议 ${mAction || 'INVALID'} -> 风控覆盖 ${jd.action}）`
        : `[${symbol}] ${mReason}`;

      decisions.push(buildDecision({
        symbol, action: finalAction, confidence: finalConf, summary,
        evidence, risks: [], nextWatchPoints: ['下一期财报', '250日相对强弱', '重大公告或政策变化'],
        decisionSource, modelCalled: true, hardRuleOverride: jd.hardRuleApplied,
        evidenceIds,
        modelResult: { action: mAction, confidence: mConf, reasoning: mReason, modelSource },
      }));
      // 顶层 modelSource 用于 demo 打印
      decisions[decisions.length - 1].modelSource = modelSource;

      if (jd.hardRuleApplied) {
        this._trace('risk_override_applied', { symbol, from: mAction, to: jd.action });
      }

      // ===== Budget check: early-stop =====
      const bCheck = this.budget.check();
      if (!bCheck.allowed) {
        budgetExceeded = true;
        budgetExceededReason = bCheck.reason;
        this._trace('budget_exceeded', { symbol, reason: bCheck.reason, processedStocks: stockIdx + 1, totalStocks: holdings.length });
        // 为剩余股票添加 budget_exceeded 占位
        for (let i = stockIdx + 1; i < holdings.length; i++) {
          const s = holdings[i].symbol;
          decisions.push(buildDecision({
            symbol: s, action: 'CAUTIOUS_HOLD', confidence: 0.3,
            summary: `[${s}] 预算超限（${bCheck.reason}），未完成分析。`,
            evidence: [], risks: [],
            decisionSource: DECISION_SOURCE.BUDGET_EXCEEDED,
            modelCalled: false, hardRuleOverride: false,
            evidenceIds: [],
          }));
        }
        break;
      }
    }

    // 8. generate_monthly_report (含 budget info)
    const budgetInfo = budgetExceeded
      ? `\n> ⚠ 预算超限: ${budgetExceededReason}。部分股票未完成完整分析。`
      : '';
    this._trace('tool_call', { callId: 'tool-08', toolName: 'generate_monthly_report' });
    const reportR = await this.tools.call('generate_monthly_report', {
      asOfDate, items: decisions.map(d => ({
        symbol: d.symbol, action: d.action, confidence: d.confidence, summary: d.summary,
        evidence: d.evidence, nextWatchPoints: d.nextWatchPoints || [],
      })),
      budgetInfo,
    }, this.toolCtx);
    this._onToolCall(toolExecCount++, traceEventCount++);

    // 9. write_decision_log
    this._trace('tool_call', { callId: 'tool-09', toolName: 'write_decision_log' });
    const logR = await this.tools.call('write_decision_log', {
      traceId: 'trace-monthly', taskId: 'monthly-review', skillId: 'monthly-hold-review',
      decisions: decisions.map(d => ({
        symbol: d.symbol, action: d.action, confidence: d.confidence, summary: d.summary,
        evidence: d.evidence, risks: d.risks || [],
        decisionSource: d.decisionSource, modelCalled: d.modelCalled, hardRuleOverride: d.hardRuleOverride,
      })),
    }, this.toolCtx);
    this._onToolCall(toolExecCount++, traceEventCount++);

    const budgetStats = this.budget.getStats();

    return {
      ok: true,
      data: {
        asOfDate, decisions,
        reportPath: reportR.ok ? reportR.data.reportPath : null,
        logIds: logR.ok ? logR.data.logIds : [],
        budgetStats,
        traceStats: {
          traceEvents: traceEventCount,
          toolExecutions: toolExecCount,
          toolTraceEvents: traceEventCount + toolExecCount,
          modelCalls: modelCallCount,
          modelSkips: modelSkipCount,
        },
        totalTokens,
        budgetExceeded,
        budgetExceededReason,
      },
    };
  }

  _trace(type, data) {
    if (this.trace && typeof this.trace.recordToolCall === 'function') {
      this.trace.recordToolCall({ ...data, type, timestamp: new Date().toISOString() });
    }
  }

  _onToolCall() {
    this.budget.recordToolCall();
  }
}

module.exports = { MonthlyHoldReviewRunner };
