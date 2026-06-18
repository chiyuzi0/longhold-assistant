// rate-limiter.cjs — V1.1 TokenBucketRateLimiter
// 防止 API 被批量调用打爆

class TokenBucketRateLimiter {
  constructor(capacity = 20, refillRate = 5) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
    this.totalConsumed = 0;
    this.totalWaited = 0;
  }

  _refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  tryConsume(count = 1) {
    this._refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      this.totalConsumed += count;
      return true;
    }
    return false;
  }

  async waitForToken(timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      this._refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        this.totalConsumed++;
        this.totalWaited++;
        return true;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    return false;  // timeout, no token
  }

  stats() {
    return {
      capacity: this.capacity,
      refillRate: this.refillRate,
      tokens: Math.round(this.tokens * 100) / 100,
      totalConsumed: this.totalConsumed,
      totalWaited: this.totalWaited,
    };
  }

  reset() {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
    this.totalConsumed = 0;
    this.totalWaited = 0;
  }
}

// 全局默认限流器：20 burst / 5 per sec refill
const DEFAULT_LIMITER = new TokenBucketRateLimiter(20, 5);

module.exports = { TokenBucketRateLimiter, DEFAULT_LIMITER };
