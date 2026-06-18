// request-validator.cjs — V1.1 显式请求校验层
//
// 集中所有 pre-request 校验逻辑，不分散在 provider / cache / limiter 中。
// 所有 provider 在发起 HTTP 请求前必须通过此校验。

const { applyFallback, FALLBACK_REASONS } = require('./fallback-policy.cjs');

// ===== Validation Rules =====

const VALID_SYMBOL_PATTERN = /^\d{6}\.(SZ|SH)$/;

const KNOWN_DELISTED = new Set([
  // 已知退市股票（示例，后续可从 DuckDB risk_flags 表加载）
]);

// ===== Validator =====

class RequestValidator {
  constructor(config) {
    this.config = config || {};
    this._checks = [
      this._checkSymbolFormat,
      this._checkSymbolDelisted,
      this._checkSymbolWhitelist,
    ];
  }

  validate(symbol, endpoint) {
    for (const check of this._checks) {
      const result = check.call(this, symbol, endpoint);
      if (!result.valid) return result;
    }
    return { valid: true };
  }

  /** 1. symbol 格式检查 */
  _checkSymbolFormat(symbol) {
    if (!VALID_SYMBOL_PATTERN.test(symbol)) {
      const fb = applyFallback(FALLBACK_REASONS.INVALID_SYMBOL, symbol);
      return { valid: false, reason: `symbol 格式错误: ${symbol}`, fallback: fb };
    }
    return { valid: true };
  }

  /** 2. 已知退市检查 */
  _checkSymbolDelisted(symbol) {
    if (KNOWN_DELISTED.has(symbol)) {
      const fb = applyFallback(FALLBACK_REASONS.INVALID_SYMBOL, symbol);
      return { valid: false, reason: `symbol 已退市: ${symbol}`, fallback: fb };
    }
    return { valid: true };
  }

  /** 3. 频率检查（可选：限制同一 symbol 的请求间隔） */
  _checkSymbolWhitelist(symbol) {
    // placeholder for future: check user-configured symbol whitelist
    return { valid: true };
  }

  getStats() {
    return { checks: this._checks.length };
  }
}

module.exports = { RequestValidator };
