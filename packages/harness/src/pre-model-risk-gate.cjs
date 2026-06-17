// pre-model-risk-gate.cjs — 在调用模型前执行的风险门
// 如果股票已经触发 EXCLUDE 或 DATA_INSUFFICIENT，跳过模型调用

/**
 * 检查是否应该跳过模型调用。
 *
 * 返回: { skipModel: boolean, skipReason: string|null, stopReason: string|null }
 *   skipModel: true 时跳过模型调用
 *   stopReason: 非空时整只股票停止处理（硬规则退出）
 */
function checkPreModelRiskGate({ symbol, status, riskData, hasKline }) {
  // 1. CRITICAL 风险 → 整只股票停止，不调用模型
  if (riskData?.hasCriticalRisk || status === 'ST' || status === 'DELISTING') {
    return {
      skipModel: true,
      skipReason: 'pre_model_gate: 触发退市/ST 风险',
      stopReason: 'EXCLUDE',
      decisionSource: 'hard_rule_gate',
    };
  }

  // 2. 无数据 → 整只股票停止
  if (!hasKline) {
    return {
      skipModel: true,
      skipReason: 'pre_model_gate: 缺少日K线数据',
      stopReason: 'DATA_INSUFFICIENT',
      decisionSource: 'data_insufficient_gate',
    };
  }

  // 3. 正常 → 允许模型调用
  return {
    skipModel: false,
    skipReason: null,
    stopReason: null,
    decisionSource: null,
  };
}

module.exports = { checkPreModelRiskGate };
