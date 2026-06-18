// get-kline-250d.cjs — V1.1 使用 MarketDataProvider
// 优先从 ctx.dataProvider 获取，fallback 到 CSV 文件

const { KlineRepository } = require('../../../data/src/repositories.cjs');

async function execute(input, ctx) {
  const provider = ctx?.dataProvider;

  // V1.1 path: 通过 MarketDataProvider
  if (provider && typeof provider.getKline === 'function') {
    const barsMap = {};
    let total = 0;
    for (const s of (input.symbols || [])) {
      try {
        const klines = await provider.getKline(s, 250);
        barsMap[s] = klines.map(k => ({
          symbol: k.symbol,
          tradeDate: k.date,
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
          volume: k.volume,
        }));
        total += klines.length;
      } catch (e) {
        // Provider 异常（含安全 fallback）
        if (e.fallback) {
          return {
            ok: false,
            error: { code: 'PROVIDER_FALLBACK', message: e.fallback.summary, fallback: e.fallback },
            evidence: [{ source: 'get_kline_250d', title: '数据源不可用', value: e.fallback.decisionSource }],
          };
        }
        barsMap[s] = [];
      }
    }
    return {
      ok: true,
      data: { bars: barsMap },
      evidence: [{ source: 'kline_daily', title: '日K总条数', value: total }],
    };
  }

  // V0.x fallback: CSV 文件
  const repo = new KlineRepository(input.csvPath);
  const bars = {};
  let total = 0;
  for (const s of (input.symbols || [])) {
    const rows = repo.getBySymbol(s);
    bars[s] = rows;
    total += rows.length;
  }
  return {
    ok: true, data: { bars },
    evidence: [{ source: 'kline_daily', title: '日K总条数', value: total }],
  };
}

module.exports = {
  name: 'get_kline_250d',
  description: '按 symbol 列表获取日 K 线数据（V1.1: 优先 ctx.dataProvider，fallback CSV）',
  category: 'market',
  permission: 'read',
  inputSchema: { type: 'object', properties: {
    symbols: { type: 'array', items: { type: 'string' } },
    csvPath: { type: 'string' },
  }},
  outputSchema: { type: 'object', properties: { bars: { type: 'object' } } },
  execute,
};
