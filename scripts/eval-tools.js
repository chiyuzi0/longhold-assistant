// eval-tools.js — V0.3.1 Eval 工具
// 为 eval case 创建 fixture-aware tool registry

const { ToolRegistry } = require('../packages/harness/src/registries/tool-registry');

/**
 * 为 eval case 创建 fixture-aware tool overrides。
 * 返回一个对象，包含可注入 SkillRunner 的工具方法。
 */
function createFixtureTools(evalCase) {
  const holdings = (evalCase.portfolio?.holdings || []).map(h => ({
    symbol: h.symbol, name: h.symbol,
    costPrice: h.cost_price || 0, quantity: h.quantity || 0,
  }));

  const klines = {};
  for (const b of (evalCase.fixtures?.daily_bars || [])) {
    const sym = b.symbol;
    if (!klines[sym]) klines[sym] = [];
    klines[sym].push({
      symbol: sym, tradeDate: b.tradeDate || b.trade_date,
      open: b.open, high: b.high, low: b.low, close: b.close,
    });
  }

  return {
    holdings,
    klines,
    getPortfolio() {
      return { ok: true, data: { holdings, count: holdings.length }, evidence: [{ source: 'fixture', title: '持仓数量', value: holdings.length }] };
    },
    getKline(symbols) {
      const bars = {};
      for (const s of (symbols || holdings.map(h => h.symbol))) bars[s] = klines[s] || [];
      const total = Object.values(bars).reduce((s, b) => s + b.length, 0);
      return { ok: true, data: { bars }, evidence: [{ source: 'fixture', title: '日K条数', value: total }] };
    },
  };
}

class DeterministicJudge {
  evaluate(evalCase, decisions) {
    const errors = [];
    const holdings = evalCase.portfolio?.holdings || [];

    for (const h of holdings) {
      const sym = h.symbol;
      const found = decisions.find(d => d.symbol === sym);
      const actual = found ? found.action : 'NOT_FOUND';
      const source = found ? found.decisionSource : 'N/A';

      if (actual !== evalCase.expected.action) {
        errors.push(`[${sym}] 期望 "${evalCase.expected.action}"，实际 "${actual}"（source: ${source}）`);
      }
      for (const forbidden of (evalCase.forbidden_outputs || [])) {
        if (actual === forbidden) errors.push(`[${sym}] 禁止输出 "${forbidden}"`);
      }
      if (found && (!found.evidence || found.evidence.length === 0)) {
        errors.push(`[${sym}] 缺少 evidence`);
      }
    }

    const passed = errors.length === 0;
    const score = passed ? 1.0 : Math.max(0.1, 1.0 - errors.length * 0.3);
    return {
      caseId: evalCase.case_id, name: evalCase.name, passed,
      expected: evalCase.expected.action,
      actual: holdings.map(h => `${h.symbol}=${decisions.find(d => d.symbol === h.symbol)?.action || 'N/A'}`).join(', '),
      errors, score,
    };
  }
}

module.exports = { createFixtureTools, DeterministicJudge };
