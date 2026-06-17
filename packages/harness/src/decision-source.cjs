// decision-source.js — 统一的决策来源枚举和最终决策结构

const DECISION_SOURCE = Object.freeze({
  HARD_RULE_GATE: 'hard_rule_gate',
  DATA_INSUFFICIENT_GATE: 'data_insufficient_gate',
  RISK_JUDGE_OVERRIDE: 'risk_judge_override',
  MODEL_AGREED: 'model_agreed',
  // MODEL_ONLY 已禁用 — 所有投资决策必须经过 risk_judge
  BUDGET_EXCEEDED: 'budget_exceeded',
  FALLBACK_INVALID_MODEL: 'fallback_on_invalid_model_output',
});

const SEVERITY = Object.freeze({
  EXCLUDE: 100,
  DATA_INSUFFICIENT: 90,
  REDUCE_EXIT: 80,
  CAUTIOUS_HOLD: 60,
  WATCH: 40,
  HOLD: 20,
});

function getSeverity(action) {
  return SEVERITY[action] || 0;
}

function isMoreConservative(actionA, actionB) {
  return getSeverity(actionA) > getSeverity(actionB);
}

/**
 * 构建统一的 final decision 结构。
 * 每条 decision 必须包含 decisionSource。
 */
function buildDecision({
  symbol,
  action,
  confidence,
  summary,
  evidence,
  decisionSource,
  modelCalled,
  hardRuleOverride,
  evidenceIds,
  nextWatchPoints,
  risks,
  modelResult,
}) {
  return {
    symbol,
    action,
    confidence: Math.max(0, Math.min(1, confidence)),
    summary,
    evidence: evidence || [],
    risks: risks || [],
    nextWatchPoints: nextWatchPoints || [],
    decisionSource: decisionSource || DECISION_SOURCE.RISK_JUDGE_OVERRIDE,
    modelCalled: modelCalled || false,
    hardRuleOverride: hardRuleOverride || false,
    evidenceIds: evidenceIds || [],
    modelResult: modelResult || null,
    finalDecisionAt: new Date().toISOString(),
  };
}

module.exports = { DECISION_SOURCE, SEVERITY, getSeverity, isMoreConservative, buildDecision };
