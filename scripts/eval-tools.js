// eval-tools.js — Fixture-aware tool registry for Eval cases
// 注入 HarnessRunner，不读写 CSV 文件

const { ToolRegistry } = require('../packages/harness/src/registries/tool-registry');

/**
 * 为 eval case 创建 fixture-aware ToolRegistry。
 * 注入 portfolio/kline 数据直接从 eval case 的 fixtures 读取，不经过 CSV。
 */
function createFixtureTools(evalCase) {
  const holdings = (evalCase.portfolio?.holdings || []).map(h => ({
    symbol: h.symbol, name: h.symbol,
    costPrice: h.cost_price || 0, quantity: h.quantity || 0,
    buyReason: undefined,
  }));

  const profiles = {};
  for (const p of (evalCase.fixtures?.stock_profiles || [])) {
    profiles[p.symbol] = p;
  }

  const klines = {};
  for (const b of (evalCase.fixtures?.daily_bars || [])) {
    const sym = b.symbol;
    if (!klines[sym]) klines[sym] = [];
    klines[sym].push({
      symbol: sym,
      tradeDate: b.tradeDate || b.trade_date,
      open: b.open, high: b.high, low: b.low, close: b.close,
    });
  }

  // 创建 registry，覆盖 get_portfolio 和 get_kline_250d
  const registry = new ToolRegistry();

  // 覆盖 get_portfolio
  const origPortfolio = registry.get('get_portfolio');
  registry.register({
    name: 'get_portfolio',
    description: '从 fixture 读取持仓',
    category: 'data',
    permission: 'read',
    inputSchema: {},
    outputSchema: {},
    async execute() {
      return {
        ok: true, data: { holdings, count: holdings.length },
        evidence: [{ source: 'fixture', title: '持仓数量', value: holdings.length }],
      };
    },
  });

  // 覆盖 get_kline_250d
  registry.register({
    name: 'get_kline_250d',
    description: '从 fixture 读取日 K',
    category: 'market',
    permission: 'read',
    inputSchema: {},
    outputSchema: {},
    async execute(input) {
      const symbols = input.symbols || holdings.map(h => h.symbol);
      const bars = {};
      for (const s of symbols) {
        bars[s] = klines[s] || [];
      }
      return {
        ok: true, data: { bars },
        evidence: [{ source: 'fixture', title: '日K股票数', value: symbols.length }],
      };
    },
  });

  return registry;
}

class DeterministicJudge {
  evaluate(evalCase, decisions) {
    const errors = [];
    const holdings = evalCase.portfolio?.holdings || [];

    for (const h of holdings) {
      const sym = h.symbol;
      const found = decisions.find(d => d.symbol === sym);
      const actual = found ? found.action : 'NOT_FOUND';

      if (actual !== evalCase.expected.action) {
        errors.push(`[${sym}] 期望 "${evalCase.expected.action}"，实际 "${actual}"`);
      }

      for (const forbidden of (evalCase.forbidden_outputs || [])) {
        if (actual === forbidden) {
          errors.push(`[${sym}] 禁止输出 "${forbidden}"`);
        }
      }

      // Evidence check
      if (found && (!found.evidence || found.evidence.length === 0)) {
        errors.push(`[${sym}] 缺少 evidence`);
      }
    }

    const passed = errors.length === 0;
    const score = passed ? 1.0 : Math.max(0.1, 1.0 - errors.length * 0.3);

    return {
      caseId: evalCase.case_id,
      name: evalCase.name,
      passed,
      expected: evalCase.expected.action,
      actual: holdings.map(h => `${h.symbol}=${decisions.find(d => d.symbol === h.symbol)?.action || 'N/A'}`).join(', '),
      errors,
      score,
    };
  }
}

module.exports = { createFixtureTools, DeterministicJudge };
