import type { DailyBar, LongHoldDecision, StockProfile } from '@longhold/core';
import { screenBasicDelistingRisk } from '@longhold/core';
import { computeMarketPerformance250d } from '@longhold/tools';
import type { MonthlyHoldingReviewOutput, SkillContext, SkillResult } from './contracts';

export interface MonthlyHoldingReviewInput {
  holdings: Array<{
    symbol: string;
    costPrice?: number;
    quantity?: number;
  }>;
  profiles: StockProfile[];
  dailyBars: DailyBar[];
}

export async function runMonthlyHoldingReview(
  input: MonthlyHoldingReviewInput,
  context: SkillContext,
): Promise<SkillResult<MonthlyHoldingReviewOutput>> {
  const items = [];

  for (const holding of input.holdings) {
    const profile = input.profiles.find((item) => item.symbol === holding.symbol);

    if (!profile) {
      const decision: LongHoldDecision = {
        symbol: holding.symbol,
        action: 'CAUTIOUS_HOLD',
        confidence: 0.3,
        summary: '缺少股票基础信息，暂时无法判断。',
        evidence: [],
        risks: [],
        nextWatchPoints: ['补齐股票基础信息'],
      };
      items.push({ symbol: holding.symbol, decision });
      continue;
    }

    const risks = screenBasicDelistingRisk(profile);
    const bars = input.dailyBars.filter((bar) => bar.symbol === holding.symbol);
    const performance = await computeMarketPerformance250d({ symbol: holding.symbol, bars });

    const hasCriticalRisk = risks.some((risk) => risk.riskLevel === 'CRITICAL');
    const action = hasCriticalRisk ? 'EXCLUDE' : risks.length > 0 ? 'CAUTIOUS_HOLD' : 'HOLD';

    const decision: LongHoldDecision = {
      symbol: holding.symbol,
      action,
      confidence: performance.ok ? 0.65 : 0.45,
      summary: hasCriticalRisk
        ? '触发重大风险规则，建议剔除或退出长线池。'
        : risks.length > 0
          ? '存在风险信号，建议谨慎持有并继续观察。'
          : '未触发基础风险规则，可继续持有并等待财报验证。',
      evidence: performance.evidence ?? [],
      risks,
      nextWatchPoints: ['下一期财报', '250日相对强弱', '是否出现重大公告或政策变化'],
    };

    items.push({ symbol: holding.symbol, decision });
  }

  return {
    ok: true,
    data: {
      asOfDate: context.asOfDate,
      items,
      summary: {
        hold: items.filter((item) => item.decision.action === 'HOLD').length,
        watch: items.filter((item) => item.decision.action === 'WATCH').length,
        cautiousHold: items.filter((item) => item.decision.action === 'CAUTIOUS_HOLD').length,
        reduceExit: items.filter((item) => item.decision.action === 'REDUCE_EXIT').length,
        exclude: items.filter((item) => item.decision.action === 'EXCLUDE').length,
      },
    },
  };
}
