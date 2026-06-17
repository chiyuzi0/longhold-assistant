// monthly-hold-review Skill — 确定性月度持仓体检
// DATA_INSUFFICIENT, EXCLUDE, HOLD 三选一

import type { LongHoldDecision } from '@longhold/core';
import { screenBasicDelistingRisk } from '@longhold/core';
import { computeMarketPerformance250d } from '@longhold/tools';
import type { Evidence } from '@longhold/core';

// ===== Types =====

export interface MonthlyHoldReviewInput {
  holdings: Array<{
    symbol: string;
    costPrice?: number;
    quantity?: number;
  }>;
  profiles: Array<{
    symbol: string;
    name: string;
    market: string;
    status?: string;
    industry?: string;
  }>;
  dailyBars: Array<{
    symbol: string;
    tradeDate: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    amount?: number;
  }>;
}

export interface MonthlyHoldReviewOutput {
  asOfDate: string;
  items: Array<{
    symbol: string;
    decision: LongHoldDecision;
  }>;
  summary: {
    hold: number;
    watch: number;
    cautiousHold: number;
    reduceExit: number;
    exclude: number;
    dataInsufficient: number;
  };
}

// ===== Hard-Rule Checks =====

type HardRuleResult =
  | { action: 'EXCLUDE'; reason: string; risks: LongHoldDecision['risks']; }
  | { action: 'DATA_INSUFFICIENT'; reason: string; risks: LongHoldDecision['risks']; }
  | null;

function checkHardRules(
  symbol: string,
  profile: { status?: string } | null,
  barCount: number,
): HardRuleResult {
  // Rule 1: Missing profile → DATA_INSUFFICIENT
  if (!profile) {
    return {
      action: 'DATA_INSUFFICIENT',
      reason: `[${symbol}] 缺少股票基础信息，无法判断。`,
      risks: [{
        riskLevel: 'HIGH',
        riskType: 'DATA_INSUFFICIENT',
        title: '股票基础信息缺失',
        suggestedAction: 'DATA_INSUFFICIENT',
        evidence: [{ source: 'portfolio', title: '持仓记录', value: symbol }],
        nextCheck: '补齐股票基础信息',
      }],
    };
  }

  // Rule 2: ST / DELISTING → EXCLUDE
  if (profile.status === 'ST' || profile.status === 'DELISTING') {
    return {
      action: 'EXCLUDE',
      reason: `[${symbol}] 触发退市风险规则，建议剔除。`,
      risks: [{
        riskLevel: 'CRITICAL',
        riskType: 'DELISTING_OR_ST',
        title: '触发 ST 或退市风险',
        suggestedAction: 'EXCLUDE',
        evidence: [{ source: 'stock_profile.status', title: '股票状态', value: profile.status }],
        nextCheck: '确认交易所最新风险警示状态',
      }],
    };
  }

  // Rule 3: No kline data → DATA_INSUFFICIENT (for normal stocks)
  if (barCount === 0) {
    return {
      action: 'DATA_INSUFFICIENT',
      reason: `[${symbol}] 缺少日K线数据，无法计算市场表现。`,
      risks: [{
        riskLevel: 'HIGH',
        riskType: 'DATA_INSUFFICIENT',
        title: '日K数据缺失',
        suggestedAction: 'DATA_INSUFFICIENT',
        evidence: [{ source: 'kline_daily', title: '日K记录数', value: 0 }],
        nextCheck: '补齐日K线数据',
      }],
    };
  }

  return null;
}

// ===== Execution =====

export async function runMonthlyHoldReview(
  input: MonthlyHoldReviewInput,
  asOfDate: string,
): Promise<MonthlyHoldReviewOutput> {
  const items: MonthlyHoldReviewOutput['items'] = [];

  for (const holding of input.holdings) {
    const symbol = holding.symbol;
    const profile = input.profiles.find((p) => p.symbol === symbol) ?? null;
    const bars = input.dailyBars.filter((b) => b.symbol === symbol);

    // Step 1: Hard-rule check (gate — runs first, overrides everything)
    const hardRule = checkHardRules(symbol, profile, bars.length);
    if (hardRule) {
      items.push({
        symbol,
        decision: {
          symbol,
          action: hardRule.action,
          confidence: hardRule.action === 'EXCLUDE' ? 0.95 : 0.5,
          summary: hardRule.reason,
          evidence: [{ source: 'risk_gate', title: '硬规则门', value: hardRule.action, asOfDate }],
          risks: hardRule.risks,
          nextWatchPoints: hardRule.action === 'EXCLUDE'
            ? ['确认交易所最新风险警示状态']
            : ['补齐缺失数据后重新分析'],
        },
      });
      continue;
    }

    // Step 2: Compute 250d performance
    const perfResult = await computeMarketPerformance250d({ symbol, bars });

    // Step 3: Additional risk checks
    const delistRisks = screenBasicDelistingRisk(profile as any);
    const allRisks = [...delistRisks];
    const hasCriticalRisk = allRisks.some((r) => r.riskLevel === 'CRITICAL');

    let action: LongHoldDecision['action'];
    let summary: string;

    if (hasCriticalRisk) {
      action = 'EXCLUDE';
      summary = `[${symbol}] 触发重大风险规则，建议剔除。`;
    } else if (allRisks.length > 0) {
      action = 'CAUTIOUS_HOLD';
      summary = `[${symbol}] 存在风险信号，建议谨慎持有。`;
    } else {
      action = 'HOLD';
      summary = `[${symbol}] 未触发基础风险规则，可继续持有。`;
    }

    const evidence: Evidence[] = [];
    if (perfResult.ok && perfResult.evidence) {
      evidence.push(...perfResult.evidence);
    }
    if (profile?.status) {
      evidence.push({ source: 'stock_profile.status', title: '股票状态', value: profile.status });
    }

    items.push({
      symbol,
      decision: {
        symbol,
        action,
        confidence: perfResult.ok ? 0.65 : 0.45,
        summary,
        evidence,
        risks: allRisks,
        nextWatchPoints: ['下一期财报', '250日相对强弱', '是否出现重大公告或政策变化'],
      },
    });
  }

  return {
    asOfDate,
    items,
    summary: {
      hold: items.filter((i) => i.decision.action === 'HOLD').length,
      watch: items.filter((i) => i.decision.action === 'WATCH').length,
      cautiousHold: items.filter((i) => i.decision.action === 'CAUTIOUS_HOLD').length,
      reduceExit: items.filter((i) => i.decision.action === 'REDUCE_EXIT').length,
      exclude: items.filter((i) => i.decision.action === 'EXCLUDE').length,
      dataInsufficient: items.filter((i) => i.decision.action === 'DATA_INSUFFICIENT').length,
    },
  };
}
