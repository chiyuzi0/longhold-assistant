import type { RiskFinding, StockProfile } from './domain';

export function screenBasicDelistingRisk(profile: StockProfile): RiskFinding[] {
  const findings: RiskFinding[] = [];

  if (profile.status === 'ST' || profile.status === 'DELISTING') {
    findings.push({
      riskLevel: 'CRITICAL',
      riskType: 'DELISTING_OR_ST',
      title: '触发 ST 或退市相关风险',
      suggestedAction: 'EXCLUDE',
      evidence: [
        {
          source: 'stock_profile.status',
          title: '股票状态',
          value: profile.status,
        },
      ],
      nextCheck: '确认交易所最新风险警示状态',
    });
  }

  if (profile.status === 'SUSPENDED') {
    findings.push({
      riskLevel: 'HIGH',
      riskType: 'SUSPENDED',
      title: '股票处于停牌状态',
      suggestedAction: 'CAUTIOUS_HOLD',
      evidence: [
        {
          source: 'stock_profile.status',
          title: '股票状态',
          value: profile.status,
        },
      ],
    });
  }

  return findings;
}
