// get-portfolio.js — 读取持仓
const { PortfolioRepository } = require('../../../data/src/repositories.cjs');

async function execute(input, ctx) {
  const repo = new PortfolioRepository(input.csvPath);
  const holdings = repo.getAll();
  return {
    ok: true, data: { holdings, count: holdings.length },
    evidence: [{ source: 'portfolio', title: '持仓数量', value: holdings.length }],
  };
}

module.exports = {
  name: 'get_portfolio',
  description: '从 sample CSV 读取持仓',
  category: 'data',
  permission: 'read',
  inputSchema: { type: 'object', properties: { csvPath: { type: 'string' } } },
  outputSchema: { type: 'object', properties: { holdings: { type: 'array' }, count: { type: 'number' } } },
  execute,
};
