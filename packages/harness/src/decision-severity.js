// decision-severity.js — 显式决策严重程度映射
// 不使用数组 index，而是使用显式数值比较

const SEVERITY = Object.freeze({
  EXCLUDE: 100,
  DATA_INSUFFICIENT: 90,
  REDUCE_EXIT: 80,
  CAUTIOUS_HOLD: 60,
  WATCH: 40,
  HOLD: 20,
});

function getSeverity(action) {
  return SEVERITY[action] ?? 0;
}

function isMoreConservative(actionA, actionB) {
  return getSeverity(actionA) > getSeverity(actionB);
}

function getMostConservative(actions) {
  let max = { action: 'HOLD', severity: SEVERITY.HOLD };
  for (const a of actions) {
    const s = getSeverity(a);
    if (s > max.severity) max = { action: a, severity: s };
  }
  return max.action;
}

module.exports = { SEVERITY, getSeverity, isMoreConservative, getMostConservative };
