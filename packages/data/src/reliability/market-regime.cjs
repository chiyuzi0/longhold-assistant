// market-regime.cjs — V1.2 市场环境检测
//
// 输入: klines 数组
// 输出: { regime, volatility, trendStrength }
//
// 规则:
//   250日收益 > +20% → BULL
//   250日收益 < -20% → BEAR
//   otherwise → SIDEWAYS

function detectRegime(klines) {
  if (!klines || klines.length < 2) {
    return { regime: 'SIDEWAYS', volatility: 0, trendStrength: 0 };
  }

  const sorted = [...klines]
    .filter(k => k.close != null && !isNaN(k.close))
    .sort((a, b) => (a.date || a.tradeDate || '').localeCompare(b.date || b.tradeDate || ''));

  if (sorted.length < 2) {
    return { regime: 'SIDEWAYS', volatility: 0, trendStrength: 0 };
  }

  const startClose = sorted[0].close;
  const endClose = sorted[sorted.length - 1].close;
  const returnPct = ((endClose - startClose) / startClose) * 100;

  // volatility: std of daily returns
  let returns = [];
  for (let i = 1; i < sorted.length; i++) {
    const r = (sorted[i].close - sorted[i - 1].close) / sorted[i - 1].close;
    returns.push(r);
  }
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  const volatility = Math.sqrt(variance) * 100; // percentage

  // trend strength: abs(return) / volatility
  const trendStrength = volatility > 0 ? Math.abs(returnPct) / (volatility * Math.sqrt(sorted.length)) : 0;

  // regime
  let regime;
  if (returnPct > 20) regime = 'BULL';
  else if (returnPct < -20) regime = 'BEAR';
  else regime = 'SIDEWAYS';

  return {
    regime,
    volatility: Math.round(volatility * 100) / 100,
    trendStrength: Math.round(trendStrength * 100) / 100,
    returnPct: Math.round(returnPct * 100) / 100,
  };
}

module.exports = { detectRegime };
