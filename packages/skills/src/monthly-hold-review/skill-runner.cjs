// skill-runner.js — monthly-hold-review 确定性流程
// 固定 12 步，不包含自由决策逻辑

const path = require('path');
const { ToolRegistry } = require('../../../harness/src/registries/tool-registry');
const { BudgetPolicy } = require('../../../harness/src/budget/budget-policy');

const DEFAULT_INPUT = {
  portfolioCsv: path.resolve('data/samples/portfolio.sample.csv'),
  klineCsv: path.resolve('data/samples/kline_250d.sample.csv'),
  asOfDate: new Date().toISOString().slice(0, 7),
};

class MonthlyHoldReviewRunner {
  constructor({ toolRegistry, budget, trace, gateway } = {}) {
    this.tools = toolRegistry || new ToolRegistry();
    this.budget = budget || new BudgetPolicy();
    this.trace = trace;
    this.gateway = gateway;
    this.toolCtx = { requestId: 'monthly-review', asOfDate: DEFAULT_INPUT.asOfDate };
  }

  async run(overrides = {}) {
    const input = { ...DEFAULT_INPUT, ...overrides };
    const asOfDate = input.asOfDate;
    this.toolCtx.asOfDate = asOfDate;
    this.budget.reset();

    // ---------- 1. get_portfolio ----------
    if (this.trace) this.trace.recordToolCall({ callId: 'tool-01', toolName: 'get_portfolio', startedAt: new Date().toISOString() });
    const portfolioR = await this.tools.call('get_portfolio', { csvPath: input.portfolioCsv }, this.toolCtx);
    if (!portfolioR.ok) return { ok: false, error: portfolioR.error, step: 'get_portfolio' };
    const holdings = portfolioR.data.holdings;
    const symbols = holdings.map(h => h.symbol);
    this.budget.recordToolCall();
    if (this.trace) this.trace.recordToolCall({ callId: 'tool-01', toolName: 'get_portfolio', output: { count: holdings.length } });

    if (holdings.length > (this.budget.getConfig().maxStocksPerRun || 20)) {
      return { ok: false, error: { code: 'TOO_MANY_STOCKS', message: `持仓数量 ${holdings.length} 超过限制 ${this.budget.getConfig().maxStocksPerRun}` } };
    }

    // ---------- 2. get_kline_250d ----------
    if (this.trace) this.trace.recordToolCall({ callId: 'tool-02', toolName: 'get_kline_250d', startedAt: new Date().toISOString() });
    const klineR = await this.tools.call('get_kline_250d', { symbols, csvPath: input.klineCsv }, this.toolCtx);
    if (!klineR.ok) return { ok: false, error: klineR.error, step: 'get_kline_250d' };
    const barsMap = klineR.data.bars;
    this.budget.recordToolCall();
    if (this.trace) this.trace.recordToolCall({ callId: 'tool-02', toolName: 'get_kline_250d', output: { symbols: symbols.length } });

    // ---------- Per-stock: 3-7 ----------
    const decisions = [];
    let totalTokens = 0;

    for (const holding of holdings) {
      const symbol = holding.symbol;
      const bars = barsMap[symbol] || [];
      const status = (symbol.includes('.ST') || (holding.name || '').includes('ST')) ? 'ST' : 'NORMAL';
      const profile = { name: holding.name, status };

      // 3. calculate_250d_performance
      if (this.trace) this.trace.recordToolCall({ callId: `tool-03-${symbol}`, toolName: 'calculate_250d_performance' });
      const perfR = await this.tools.call('calculate_250d_performance', { symbol, bars }, this.toolCtx);
      this.budget.recordToolCall();
      const perfOk = perfR.ok;
      const perfData = perfOk ? perfR.data : null;

      // 4. check_risk_flags
      if (this.trace) this.trace.recordToolCall({ callId: `tool-04-${symbol}`, toolName: 'check_risk_flags' });
      const riskR = await this.tools.call('check_risk_flags', { symbol, status }, this.toolCtx);
      this.budget.recordToolCall();
      const riskData = riskR.ok ? riskR.data : { hasCriticalRisk: false, actions: [] };

      // Hard-rule early exit (跳过后续工具)
      if (riskData.hasCriticalRisk || (!profile && bars.length === 0)) {
        const action = riskData.hasCriticalRisk ? 'EXCLUDE' : 'DATA_INSUFFICIENT';
        const conf = riskData.hasCriticalRisk ? 0.95 : 0.5;
        const ev = [{ source: 'stock_profile.status', title: '股票状态', value: status }];
        decisions.push({
          symbol, action, confidence: conf,
          summary: `[${symbol}] 硬规则触发: ${action}`,
          evidence: ev, risks: [], nextWatchPoints: ['确认风险状态'],
          modelSource: 'hard-rule-gate', hardRuleApplied: true,
        });
        if (this.trace) this.trace.recordToolCall({ callId: `tool-judge-${symbol}`, toolName: 'risk_judge', output: { action, hardRuleApplied: true } });
        continue;
      }

      // 5. build_evidence_list
      if (this.trace) this.trace.recordToolCall({ callId: `tool-05-${symbol}`, toolName: 'build_evidence_list' });
      const evR = await this.tools.call('build_evidence_list', {
        symbol, performance: perfData, riskFlags: riskData, profile, asOfDate,
      }, this.toolCtx);
      const evidence = evR.ok ? evR.data.evidence : [];
      this.budget.recordToolCall();

      // 6. model_analyze_stock
      if (this.trace) this.trace.recordToolCall({ callId: `tool-06-${symbol}`, toolName: 'model_analyze_stock' });
      const modelR = await this.tools.call('model_analyze_stock', {
        symbol, name: holding.name, status,
        returnPct: perfData?.returnPct || 0, maxDrawdownPct: perfData?.maxDrawdownPct || 0,
        hasCriticalRisk: riskData.hasCriticalRisk, hasRiskSignals: status === 'SUSPENDED',
        asOfDate, gateway: this.gateway,
      }, this.toolCtx);
      this.budget.recordModelCall(modelR.ok ? modelR.data?.tokenUsage : {});
      totalTokens += modelR.ok ? (modelR.data?.tokenUsage?.total_tokens || 0) : 0;
      const mAction = modelR.ok ? modelR.data.modelAction : 'CAUTIOUS_HOLD';
      const mConf = modelR.ok ? modelR.data.modelConfidence : 0.5;
      const mReason = modelR.ok ? modelR.data.modelReasoning : '';
      const modelSource = modelR.ok ? modelR.data.modelSource : 'mock';
      if (this.trace) this.trace.recordToolCall({ callId: `tool-06-${symbol}`, toolName: 'model_analyze_stock', output: { modelAction: mAction, modelSource } });

      // 7. risk_judge
      if (this.trace) this.trace.recordToolCall({ callId: `tool-07-${symbol}`, toolName: 'risk_judge' });
      const judgeR = await this.tools.call('risk_judge', {
        symbol, hasCriticalRisk: riskData.hasCriticalRisk,
        performanceOk: perfOk, hasData: bars.length > 0,
        modelAction: mAction, modelConfidence: mConf,
      }, this.toolCtx);
      this.budget.recordToolCall();

      if (judgeR.ok) {
        const jd = judgeR.data;
        const finalAction = jd.action;
        const finalConf = jd.confidence;
        const summary = jd.hardRuleApplied || jd.severityConflict
          ? `[${symbol}] ${jd.action}（模型建议 ${mAction} -> 风控覆盖 ${jd.action}）`
          : `[${symbol}] ${mReason}`;
        decisions.push({
          symbol, action: finalAction, confidence: finalConf, summary,
          evidence, risks: [], nextWatchPoints: ['下一期财报', '250日相对强弱', '重大公告或政策变化'],
          modelSource, modelResult: { action: mAction, confidence: mConf, reasoning: mReason },
          hardRuleApplied: jd.hardRuleApplied,
        });
        if (jd.hardRuleApplied && this.trace) {
          this.trace.recordToolCall({ callId: `trace-override-${symbol}`, toolName: 'risk_override_applied', output: { from: mAction, to: jd.action } });
        }
      } else {
        decisions.push({
          symbol, action: mAction, confidence: mConf,
          summary: `[${symbol}] ${mReason}`,
          evidence, risks: [], nextWatchPoints: [],
          modelSource, hardRuleApplied: false,
        });
      }

      // Budget check
      const bCheck = this.budget.check();
      if (!bCheck.allowed) {
        if (this.trace) this.trace.recordToolCall({ callId: 'budget-exceeded', toolName: 'budget_exceeded', output: { reason: bCheck.reason } });
        break;
      }
    }

    // ---------- 8. generate_monthly_report ----------
    if (this.trace) this.trace.recordToolCall({ callId: 'tool-08', toolName: 'generate_monthly_report' });
    const reportR = await this.tools.call('generate_monthly_report', {
      asOfDate, items: decisions.map(d => ({
        symbol: d.symbol, action: d.action, confidence: d.confidence, summary: d.summary,
        evidence: d.evidence, nextWatchPoints: d.nextWatchPoints || [],
      })),
    }, this.toolCtx);
    this.budget.recordToolCall();

    // ---------- 9. write_decision_log ----------
    if (this.trace) this.trace.recordToolCall({ callId: 'tool-09', toolName: 'write_decision_log' });
    const logR = await this.tools.call('write_decision_log', {
      traceId: 'trace-monthly', taskId: 'monthly-review', skillId: 'monthly-hold-review',
      decisions: decisions.map(d => ({
        symbol: d.symbol, action: d.action, confidence: d.confidence, summary: d.summary,
        evidence: d.evidence, risks: d.risks || [],
      })),
    }, this.toolCtx);
    this.budget.recordToolCall();

    const budgetStats = this.budget.getStats();

    return {
      ok: true,
      data: {
        asOfDate, decisions,
        reportPath: reportR.ok ? reportR.data.reportPath : null,
        logIds: logR.ok ? logR.data.logIds : [],
        budgetStats,
        totalTokens,
      },
    };
  }
}

module.exports = { MonthlyHoldReviewRunner };
