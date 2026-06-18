// confidence-calculator.cjs — V1.2 DataConfidence Score
//
// 每次数据请求计算 dataConfidence (0~1) + qualityLevel
//
// 规则:
//   base 0.3 + source_live 0.3 + kline_ok 0.2 + no_na 0.1
//   + fresh 0.1 + volume_ok 0.1 + cache_fresh 0.1 - stale_warn 0.3
//   - stale_fail 0.5 - fallback 0.7
//   clamp to [0, 1]

const QUALITY_LEVELS = Object.freeze({
  HIGH: 'HIGH',        // >= 0.7
  MEDIUM: 'MEDIUM',    // >= 0.4
  LOW: 'LOW',          // >= 0.2
  UNTRUSTED: 'UNTRUSTED', // < 0.2
});

function computeConfidence({ symbol, source, klines, staleness, fallbackUsed, rateLimited }) {
  let score = 0.3; // base

  // +0.3 live source
  if (source === 'live') score += 0.3;

  // +0.2 kline >= 250
  const klineCount = (klines || []).length;
  if (klineCount >= 250) score += 0.2;

  // +0.1 no missing close
  const missingClose = (klines || []).filter(k => k.close == null || isNaN(k.close)).length;
  if (missingClose === 0) score += 0.1;

  // +0.1 recent update (within 3 days)
  if (klines && klines.length > 0) {
    const lastDate = klines[klines.length - 1].date || klines[klines.length - 1].tradeDate;
    if (lastDate) {
      const daysSince = daysBetween(lastDate, today());
      if (daysSince <= 3) score += 0.1;
    }
  }

  // +0.1 volume > 0
  const avgVolume = klines && klines.length > 0
    ? klines.reduce((s, k) => s + (k.volume || 0), 0) / klines.length
    : 0;
  if (avgVolume > 0) score += 0.1;

  // +0.1 cache fresh
  if (staleness === 'fresh') score += 0.1;

  // +0.1 not rate limited
  if (!rateLimited) score += 0.1;

  // -0.3 stale warn
  if (staleness === 'stale_warn') score -= 0.3;

  // -0.5 stale fail
  if (staleness === 'stale_fail') score -= 0.5;

  // -0.7 fallback
  if (fallbackUsed) score -= 0.7;

  // clamp
  score = Math.max(0, Math.min(1, score));

  // quality level
  let level;
  if (score >= 0.7) level = QUALITY_LEVELS.HIGH;
  else if (score >= 0.4) level = QUALITY_LEVELS.MEDIUM;
  else if (score >= 0.2) level = QUALITY_LEVELS.LOW;
  else level = QUALITY_LEVELS.UNTRUSTED;

  return {
    symbol,
    dataConfidence: Math.round(score * 100) / 100,
    qualityLevel: level,
    staleLevel: staleness || 'unknown',
  };
}

function today() { return new Date().toISOString().slice(0, 10); }

function daysBetween(d1, d2) {
  return Math.floor((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24));
}

module.exports = { computeConfidence, QUALITY_LEVELS };
