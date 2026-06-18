// fallback-policy.cjs — V1.1 安全 fallback 策略
//
// ★ 铁律 ★
// fallback ≠ continue analysis
// fallback = hard stop for model layer
//
// 禁止: API fail → MockProvider → 继续输出 HOLD
// 强制: API fail → DATA_INSUFFICIENT → 不调模型

const FALLBACK_REASONS = Object.freeze({
  LIVE_API_FAIL: 'live_api_fail',
  STALE_CACHE_ONLY: 'stale_cache_only',
  INVALID_SYMBOL: 'invalid_symbol',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
});

const FALLBACK_POLICY = Object.freeze({
  [FALLBACK_REASONS.LIVE_API_FAIL]: {
    mode: 'soft_fail',
    decision: 'DATA_INSUFFICIENT',           // 安全保守，不是 HOLD
    allow_model_analysis: false,              // pre_model_gate 必须拦
    allow_mock_fallback: false,               // ★ 禁止回退到 Mock
    trace_event: 'live_api_failed',
  },
  [FALLBACK_REASONS.STALE_CACHE_ONLY]: {
    mode: 'soft_fail',
    decision: 'DATA_INSUFFICIENT',           // 过期缓存不可信
    allow_model_analysis: false,
    allow_mock_fallback: false,
    trace_event: 'stale_cache_only',
  },
  [FALLBACK_REASONS.INVALID_SYMBOL]: {
    mode: 'hard_fail',
    decision: 'DATA_INSUFFICIENT',
    allow_model_analysis: false,
    allow_mock_fallback: false,
    trace_event: 'invalid_symbol',
  },
  [FALLBACK_REASONS.RATE_LIMIT_EXCEEDED]: {
    mode: 'soft_fail',
    decision: 'DATA_INSUFFICIENT',
    allow_model_analysis: false,
    allow_mock_fallback: false,
    trace_event: 'rate_limit_exceeded',
  },
});

function applyFallback(reason, symbol) {
  const policy = FALLBACK_POLICY[reason];
  if (!policy) {
    return {
      action: 'DATA_INSUFFICIENT',
      confidence: 0.3,
      decisionSource: 'data_untrusted',
      summary: `[${symbol}] 数据源不可用 (${reason})，安全降级`,
      allowModelAnalysis: false,
      allowMockFallback: false,
      traceEvent: 'fallback_unknown',
    };
  }
  return {
    action: policy.decision,
    confidence: 0.3,
    decisionSource: 'data_untrusted',
    summary: `[${symbol}] 数据源不可用 (${policy.trace_event})，安全降级`,
    allowModelAnalysis: policy.allow_model_analysis,
    allowMockFallback: policy.allow_mock_fallback,
    traceEvent: policy.trace_event,
  };
}

module.exports = { FALLBACK_REASONS, FALLBACK_POLICY, applyFallback };
