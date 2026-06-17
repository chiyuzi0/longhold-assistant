// get-kline-250d.js — 读取日K线
const { KlineRepository } = require('../../../data/src/repositories.cjs');

async function execute(input, ctx) {
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
  description: '按 symbol 列表获取日 K 线数据',
  category: 'market',
  permission: 'read',
  inputSchema: { type: 'object', properties: {
    symbols: { type: 'array', items: { type: 'string' } },
    csvPath: { type: 'string' },
  }},
  outputSchema: { type: 'object', properties: { bars: { type: 'object' } } },
  execute,
};
