// Output Validator — 输出结构与规则校验

import type { LongHoldDecision, RiskFinding } from '@longhold/core';

export interface ValidationResult {
  valid: boolean;
  checks: {
    schemaValid: boolean;
    evidencePresent: boolean;
    hardRuleCompliant: boolean;
    forbiddenContentClean: boolean;
  };
  errors: string[];
  warnings: string[];
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
  /一夜暴富/,
];

/**
 * OutputValidator 在 FINISH 前校验输出质量。
 *
 * 检查项：
 * 1. Schema 完整性（LongHoldDecision 结构）
 * 2. 证据链完整性（evidence 非空，关键字段有值）
 * 3. 硬规则合规（CRITICAL 风险 → 不可为 HOLD）
 * 4. 禁止内容检测（禁止"必涨""保证收益"等）
 *
 * TODO:
 * - 增强 evidence 质量检查（value 是否为空、asOfDate 是否过期）
 * - 与 RiskGate 集成
 */
export class OutputValidator {
  /**
   * 校验 LongHoldDecision。
   */
  validate(decision: LongHoldDecision, hardRules: RiskFinding[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Schema 校验
    const schemaValid = this.validateSchema(decision, errors);

    // 2. Evidence 校验
    const evidencePresent = this.validateEvidence(decision, errors, warnings);

    // 3. 硬规则合规检查
    const hardRuleCompliant = this.validateHardRuleCompliance(decision, hardRules, errors);

    // 4. 禁止内容检查
    const forbiddenContentClean = this.validateForbiddenContent(decision, errors);

    return {
      valid: errors.length === 0,
      checks: { schemaValid, evidencePresent, hardRuleCompliant, forbiddenContentClean },
      errors,
      warnings,
    };
  }

  private validateSchema(decision: LongHoldDecision, errors: string[]): boolean {
    let valid = true;

    if (!decision.symbol) {
      errors.push('LongHoldDecision.symbol 缺失');
      valid = false;
    }
    if (!decision.action) {
      errors.push('LongHoldDecision.action 缺失');
      valid = false;
    }
    if (decision.confidence == null || decision.confidence < 0 || decision.confidence > 1) {
      errors.push('LongHoldDecision.confidence 无效');
      valid = false;
    }
    if (!decision.summary) {
      errors.push('LongHoldDecision.summary 缺失');
      valid = false;
    }

    return valid;
  }

  private validateEvidence(
    decision: LongHoldDecision,
    errors: string[],
    warnings: string[],
  ): boolean {
    if (decision.evidence.length === 0) {
      errors.push('evidence 为空 — 每个决策必须附带至少一条证据');
      return false;
    }

    for (const ev of decision.evidence) {
      if (!ev.source) {
        warnings.push(`evidence 缺少 source: "${ev.title}"`);
      }
    }

    return true;
  }

  private validateHardRuleCompliance(
    decision: LongHoldDecision,
    hardRules: RiskFinding[],
    errors: string[],
  ): boolean {
    for (const rule of hardRules) {
      // CRITICAL 风险 + 硬规则 → 不允许 HOLD 或 WATCH
      if (
        rule.riskLevel === 'CRITICAL' &&
        (decision.action === 'HOLD' || decision.action === 'WATCH')
      ) {
        errors.push(
          `硬规则冲突: ${rule.riskType} (${rule.riskLevel}) → 不允许 ${decision.action}`,
        );
        return false;
      }
    }
    return true;
  }

  private validateForbiddenContent(decision: LongHoldDecision, errors: string[]): boolean {
    const textToCheck = `${decision.summary} ${decision.nextWatchPoints.join(' ')}`;

    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(textToCheck)) {
        errors.push(`禁止内容检测: 匹配 "${pattern.source}"`);
        return false;
      }
    }

    return true;
  }
}
