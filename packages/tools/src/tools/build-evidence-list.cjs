// build-evidence-list.js — 汇总证据

async function execute(input, ctx) {
  const ev = [];
  if (input.profile) {
    ev.push({ source: 'stock_profile', title: '股票名称', value: input.profile.name, asOfDate: input.asOfDate });
    ev.push({ source: 'stock_profile.status', title: '股票状态', value: input.profile.status || 'NORMAL', asOfDate: input.asOfDate });
  }
  if (input.performance) {
    ev.push({ source: 'market_performance', title: '250日收益率(%)', value: input.performance.returnPct, asOfDate: input.asOfDate });
    ev.push({ source: 'market_performance', title: '250日最大回撤(%)', value: input.performance.maxDrawdownPct, asOfDate: input.asOfDate });
  }
  ev.push({ source: 'risk_gate', title: '存在严重风险', value: !!input.riskFlags?.hasCriticalRisk, asOfDate: input.asOfDate });

  const ids = ev.map((_, i) => `ev-${String(i + 1).padStart(3, '0')}`);
  return { ok: true, data: { evidence: ev, evidenceIds: ids } };
}

module.exports = {
  name: 'build_evidence_list',
  description: '汇总工具输出的 evidence 并分配 evidenceId',
  category: 'risk',
  permission: 'read',
  inputSchema: { type: 'object', properties: {
    symbol: { type: 'string' }, performance: { type: 'object' },
    riskFlags: { type: 'object' }, profile: { type: 'object' }, asOfDate: { type: 'string' },
  }},
  outputSchema: { type: 'object', properties: { evidence: { type: 'array' }, evidenceIds: { type: 'array' } } },
  execute,
};
