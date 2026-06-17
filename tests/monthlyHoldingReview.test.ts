import { describe, expect, it } from 'vitest';
import { runMonthlyHoldingReview } from '@longhold/skills';

function makeBars(symbol: string) {
  return Array.from({ length: 260 }).map((_, index) => ({
    symbol,
    tradeDate: `2025-01-${String((index % 28) + 1).padStart(2, '0')}`,
    open: 10 + index * 0.01,
    high: 10 + index * 0.01,
    low: 10 + index * 0.01,
    close: 10 + index * 0.01,
  }));
}

describe('monthly holding review', () => {
  it('returns HOLD when no basic risk is triggered', async () => {
    const result = await runMonthlyHoldingReview(
      {
        holdings: [{ symbol: '000001.SZ' }],
        profiles: [
          {
            symbol: '000001.SZ',
            name: '示例股票',
            market: 'A_SHARE',
            status: 'NORMAL',
          },
        ],
        dailyBars: makeBars('000001.SZ'),
      },
      { requestId: 'test', asOfDate: '2026-06-30' },
    );

    expect(result.ok).toBe(true);
    expect(result.data?.items[0].decision.action).toBe('HOLD');
  });
});
