import type { DailyBar, Evidence } from '@longhold/core';
import type { ToolResult } from './contracts';

export interface MarketPerformance250dInput {
  symbol: string;
  bars: DailyBar[];
}

export interface MarketPerformance250dOutput {
  symbol: string;
  windowDays: number;
  startClose: number;
  endClose: number;
  returnPct: number;
  maxDrawdownPct: number;
}

export async function computeMarketPerformance250d(
  input: MarketPerformance250dInput,
): Promise<ToolResult<MarketPerformance250dOutput>> {
  const sorted = input.bars
    .filter((bar) => Number.isFinite(bar.close))
    .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate))
    .slice(-250);

  if (sorted.length < 30) {
    return {
      ok: false,
      error: {
        code: 'INSUFFICIENT_DAILY_BARS',
        message: `日K数量不足，无法计算 250 日表现：${input.symbol}`,
      },
    };
  }

  const startClose = sorted[0].close;
  const endClose = sorted[sorted.length - 1].close;
  const returnPct = ((endClose - startClose) / startClose) * 100;

  let peak = sorted[0].close;
  let maxDrawdown = 0;
  for (const bar of sorted) {
    peak = Math.max(peak, bar.close);
    const drawdown = ((bar.close - peak) / peak) * 100;
    maxDrawdown = Math.min(maxDrawdown, drawdown);
  }

  const evidence: Evidence[] = [
    { source: 'daily_bar', title: '计算窗口交易日数量', value: sorted.length },
    { source: 'daily_bar.close', title: '起始收盘价', value: startClose },
    { source: 'daily_bar.close', title: '结束收盘价', value: endClose },
  ];

  return {
    ok: true,
    data: {
      symbol: input.symbol,
      windowDays: sorted.length,
      startClose,
      endClose,
      returnPct: Number(returnPct.toFixed(2)),
      maxDrawdownPct: Number(maxDrawdown.toFixed(2)),
    },
    evidence,
  };
}
