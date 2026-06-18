// reliability-scorer.cjs — V1.2 系统级可靠性分 (0~100)
//
// 组合: dataConfidence + freshness + source + completeness

function computeReliabilityScore(confidence, dqResult, regimeInfo) {
  const dataConfidence = (confidence && confidence.dataConfidence) || 0;

  // 1. dataConfidence 贡献 40%
  const confScore = dataConfidence * 40;

  // 2. freshness 贡献 20%: dqResult?.daysSinceLast (0~90映射到1~0)
  const daysSince = dqResult?.daysSinceLast ?? 90;
  const freshness = Math.max(0, 1 - daysSince / 90) * 20;

  // 3. source trust 贡献 20%: live=1.0, mock=0.5
  const sourceTrust = confidence?.staleLevel === 'fresh' ? 20 : 10;

  // 4. completeness 贡献 20%: data quality gate status
  const status = (dqResult?.status || 'PASS');
  const completeness = status === 'PASS' ? 20 : status === 'WARN' ? 10 : 5;

  let score = Math.round(confScore + freshness + sourceTrust + completeness);

  // clamp
  score = Math.max(0, Math.min(100, score));

  return score;
}

module.exports = { computeReliabilityScore };
