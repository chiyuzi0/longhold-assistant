// Deterministic Judge — 规则化评估 (Layer 1-2)

import type { EvalCase, EvalResult } from '../runner/eval-runner';
import type { LongHoldDecision } from '@longhold/core';

export interface DeterministicVerdict {
  passed: boolean;
  checks: {
    actionMatch: boolean;
    riskLevelMatch: boolean;
    evidencePresent: boolean;
    forbiddenContentClean: boolean;
    schemaValid: boolean;
  };
  score: number;
  failures: string[];
}

const FORBIDDEN_PATTERNS = [
  /必涨/,
  /保证收益/,
  /稳赚/,
  /抄底良机/,
  /推荐买入/,
  /强烈建议买入/,
  /无风险/,
  /保本/,
];

/**
 * DeterministicJudge 对确定性强的评估项做规则化评分。
 *
 * 用于 Layer 1 (Tool Eval) 和 Layer 2 (Skill Eval)。
 */
export class DeterministicJudge {
  evaluate(evalCase: EvalCase, decision: LongHoldDecision): DeterministicVerdict {
    const failures: string[] = [];

    // 1. Action 匹配
    const actionMatch = decision.action === evalCase.expected.action;
    if (!actionMatch) {
      failures.push(`action: 预期 ${evalCase.expected.action}, 实际 ${decision.action}`);
    }

    // 2. Risk Level 匹配
    let riskLevelMatch = true;
    if (evalCase.expected.riskLevel) {
      const hasExpectedRisk = decision.risks.some(
        (r) => r.riskLevel === evalCase.expected.riskLevel,
      );
      if (!hasExpectedRisk) {
        riskLevelMatch = false;
        failures.push(`riskLevel: 预期 ${evalCase.expected.riskLevel}，未找到匹配`);
      }
    }

    // 3. Evidence 存在
    const evidencePresent = decision.evidence.length > 0;
    if (!evidencePresent) {
      failures.push('evidence: 缺失');
    }

    // 4. 禁止内容检查
    const textToCheck = `${decision.summary} ${decision.nextWatchPoints.join(' ')}`;
    let forbiddenContentClean = true;
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(textToCheck)) {
        forbiddenContentClean = false;
        failures.push(`禁止内容: "${pattern.source}"`);
      }
    }

    // 5. Schema 校验
    const schemaValid =
      !!decision.symbol &&
      !!decision.action &&
      decision.confidence != null &&
      decision.confidence >= 0 &&
      decision.confidence <= 1 &&
      !!decision.summary;
    if (!schemaValid) {
      failures.push('schema: LongHoldDecision 结构不完整');
    }

    const checks = {
      actionMatch,
      riskLevelMatch,
      evidencePresent,
      forbiddenContentClean,
      schemaValid,
    };

    const passed = Object.values(checks).every(Boolean);
    const score = Object.values(checks).filter(Boolean).length / Object.keys(checks).length;

    return { passed, checks, score: Math.round(score * 100) / 100, failures };
  }
}
