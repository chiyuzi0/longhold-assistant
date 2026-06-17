// Risk Rule Metric — 硬规则合规性评估 (Layer 4)

import type { LongHoldDecision, RiskFinding } from '@longhold/core';

export interface RiskRuleComplianceResult {
  passed: boolean;
  score: number;
  criticalRisks: number;
  actionConflicts: ActionConflict[];
  details: string;
}

export interface ActionConflict {
  riskType: string;
  riskLevel: string;
  expectedAction: string;
  actualAction: string;
  conflict: boolean;
}

/**
 * RiskRuleMetric 检查 LLM 输出是否违反了硬风险规则。
 *
 * 硬规则：
 * - CRITICAL 风险 → 不允许 HOLD / WATCH
 * - HIGH 风险 → 不允许 HOLD（建议 CAUTIOUS_HOLD 或以上）
 *
 * 如果 LLM 给出的 action 与硬规则冲突，系统标记 "硬规则覆盖"。
 */
export function evaluateRiskRuleCompliance(
  decision: LongHoldDecision,
  hardRules: RiskFinding[],
): RiskRuleComplianceResult {
  const conflicts: ActionConflict[] = [];
  const criticalRisks = hardRules.filter((r) => r.riskLevel === 'CRITICAL').length;

  for (const rule of hardRules) {
    const expectedAction = rule.suggestedAction;
    const actualAction = decision.action;

    // CRITICAL → 不允许 HOLD / WATCH
    if (rule.riskLevel === 'CRITICAL' && (actualAction === 'HOLD' || actualAction === 'WATCH')) {
      conflicts.push({ riskType: rule.riskType, riskLevel: rule.riskLevel, expectedAction, actualAction, conflict: true });
    }

    // HIGH → 不允许 HOLD
    if (rule.riskLevel === 'HIGH' && actualAction === 'HOLD') {
      conflicts.push({ riskType: rule.riskType, riskLevel: rule.riskLevel, expectedAction: 'CAUTIOUS_HOLD 或以上', actualAction, conflict: true });
    }
  }

  const passed = conflicts.length === 0;
  const score = passed ? 1.0 : 0.0;

  return {
    passed,
    score,
    criticalRisks,
    actionConflicts: conflicts,
    details: passed ? '所有硬规则合规' : `存在 ${conflicts.length} 个硬规则冲突`,
  };
}
