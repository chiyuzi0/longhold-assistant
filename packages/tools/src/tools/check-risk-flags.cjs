// check-risk-flags.js — 风险标记检查

async function execute(input, ctx) {
  const st = input.status || 'NORMAL';
  const isCR = st === 'ST' || st === 'DELISTING';
  const actions = [];
  if (isCR) actions.push('EXCLUDE');
  if (st === 'SUSPENDED') actions.push('CAUTIOUS_HOLD');
  return {
    ok: true,
    data: { symbol: input.symbol, status: st, hasCriticalRisk: isCR, actions },
    evidence: [{ source: 'stock_profile.status', title: '股票状态', value: st }],
  };
}

module.exports = {
  name: 'check_risk_flags',
  description: '检查单只股票的风险标记（ST/退市/停牌）',
  category: 'risk',
  permission: 'compute',
  inputSchema: { type: 'object', properties: { symbol: { type: 'string' }, status: { type: 'string' } } },
  outputSchema: { type: 'object', properties: { symbol: { type: 'string' }, status: { type: 'string' }, hasCriticalRisk: { type: 'boolean' }, actions: { type: 'array' } } },
  execute,
};
