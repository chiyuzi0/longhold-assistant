// data-quality-gate.cjs — V0.4 数据质量门
// 检查日K数据质量，在调用模型前执行

const DQ_STATUS = { PASS: 'PASS', WARN: 'WARN', FAIL: 'FAIL' };

/**
 * 检查单只股票的数据质量。
 *
 * 规则:
 * 1. kline_count >= 250  → PASS, else WARN (<250) or FAIL (<30)
 * 2. close 全 > 0        → PASS, else FAIL
 * 3. 无重复 trade_date   → PASS, else WARN
 * 4. 最近数据不陈旧      → < 30 天 → PASS, < 90 → WARN, >= 90 → FAIL
 * 5. 成交量不为 0 连续过多 → < 5 天连续 → PASS, else WARN
 *
 * 输出: { status, details, stopAction }
 *   stopAction 非空时，系统对该股票输出 DATA_INSUFFICIENT
 */
function checkDataQuality(symbol, bars) {
  const details = [];
  let failCount = 0;
  let warnCount = 0;

  // 1. 数量
  const count = bars.length;
  if (count >= 250) {
    details.push(`kline_count=${count} (PASS)`);
  } else if (count >= 30) {
    details.push(`kline_count=${count} (WARN, <250)`);
    warnCount++;
  } else {
    details.push(`kline_count=${count} (FAIL, <30)`);
    failCount++;
  }

  if (count === 0) {
    return { status: DQ_STATUS.FAIL, details: details.join('; '), stopAction: 'DATA_INSUFFICIENT' };
  }

  // 2. close > 0
  const zeroClose = bars.filter(b => !b.close || b.close <= 0);
  if (zeroClose.length > 0) {
    details.push(`zero_close=${zeroClose.length} bars (FAIL)`);
    failCount++;
  } else {
    details.push(`close>0 (PASS)`);
  }

  // 3. 重复日期
  const dates = bars.map(b => b.tradeDate);
  const unique = new Set(dates);
  const dupCount = dates.length - unique.size;
  if (dupCount > 0) {
    details.push(`dup_dates=${dupCount} (WARN)`);
    warnCount++;
  } else {
    details.push(`no_dup_dates (PASS)`);
  }

  // 4. 数据新鲜度
  const sorted = [...bars].sort((a, b) => String(b.tradeDate).localeCompare(String(a.tradeDate)));
  const lastDate = sorted[0].tradeDate;
  const daysSince = daysBetween(lastDate, today());
  if (daysSince <= 30) {
    details.push(`freshness=${daysSince}d (PASS)`);
  } else if (daysSince <= 90) {
    details.push(`freshness=${daysSince}d (WARN)`);
    warnCount++;
  } else {
    details.push(`freshness=${daysSince}d (FAIL)`);
    failCount++;
  }

  // 5. 零成交量连续
  let zeroVolStreak = 0;
  let maxZeroVolStreak = 0;
  for (const b of bars) {
    if (!b.volume || b.volume <= 0) { zeroVolStreak++; maxZeroVolStreak = Math.max(maxZeroVolStreak, zeroVolStreak); }
    else zeroVolStreak = 0;
  }
  if (maxZeroVolStreak >= 5) {
    details.push(`zero_vol_streak=${maxZeroVolStreak}d (WARN)`);
    warnCount++;
  } else {
    details.push(`zero_vol_streak=${maxZeroVolStreak}d (PASS)`);
  }

  // 最终判定
  let status = DQ_STATUS.PASS;
  let stopAction = null;
  if (failCount > 0) {
    status = DQ_STATUS.FAIL;
    stopAction = 'DATA_INSUFFICIENT';
  } else if (warnCount > 0) {
    status = DQ_STATUS.WARN;
  }

  return { status, details: details.join('; '), stopAction };
}

function today() { return new Date().toISOString().slice(0, 10); }

function daysBetween(d1, d2) {
  const a = new Date(d1), b = new Date(d2);
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

module.exports = { checkDataQuality, DQ_STATUS };
