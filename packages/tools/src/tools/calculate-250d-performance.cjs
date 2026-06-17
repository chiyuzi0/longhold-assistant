// calculate-250d-performance.js — 计算 250 日市场表现

function computePerformance(bars) {
  const sorted = (bars || [])
    .filter(b => Number.isFinite(b.close))
    .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate))
    .slice(-250);

  if (sorted.length < 30) return { ok: false, error: { code: 'INSUFFICIENT_DATA', message: `日K不足 ${sorted.length} 条` } };

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
    data: {
      returnPct: +returnPct.toFixed(2),
      maxDrawdownPct: +maxDrawdown.toFixed(2),
      windowDays: sorted.length,
    },
    evidence: [
      { source: 'daily_bar', title: '窗口交易日', value: sorted.length },
      { source: 'daily_bar.close', title: '起始收盘价', value: startClose },
      { source: 'daily_bar.close', title: '结束收盘价', value: endClose },
    ],
  };
}

async function execute(input, ctx) {
  const result = computePerformance(input.bars);
  return { ...result, data: result.ok ? { symbol: input.symbol, ...result.data } : undefined };
}

module.exports = {
  name: 'calculate_250d_performance',
  description: '计算 250 日市场表现（收益率 + 最大回撤）',
  category: 'market',
  permission: 'compute',
  inputSchema: { type: 'object', properties: { symbol: { type: 'string' }, bars: { type: 'array' } } },
  outputSchema: { type: 'object', properties: { symbol: { type: 'string' }, returnPct: { type: 'number' }, maxDrawdownPct: { type: 'number' }, windowDays: { type: 'number' } } },
  execute,
};
