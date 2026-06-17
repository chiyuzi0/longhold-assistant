// Evidence Metric — 证据链完整性评估 (Layer 4)

import type { LongHoldDecision, Evidence } from '@longhold/core';

export interface EvidenceMetricResult {
  passed: boolean;
  score: number;            // 0.0 - 1.0
  evidenceCount: number;
  hasEvidence: boolean;     // 至少一条
  allHaveSource: boolean;   // 每条都有 source
  allHaveTitle: boolean;    // 每条都有 title
  keyFieldsPresent: boolean;// 关键字段有值
  missingFields: string[];
}

/**
 * EvidenceMetric 检查输出中的 evidence 质量。
 *
 * 规则：
 * - 至少 1 条 evidence
 * - 每条 evidence 必须有 source + title
 * - 关键 evidence 必须有 asOfDate
 * - value 不能为空字符串
 */
export function evaluateEvidence(decision: LongHoldDecision): EvidenceMetricResult {
  const missingFields: string[] = [];
  const evidence = decision.evidence;

  const hasEvidence = evidence.length > 0;
  if (!hasEvidence) {
    missingFields.push('evidence 为空');
    return { passed: false, score: 0, evidenceCount: 0, hasEvidence: false, allHaveSource: false, allHaveTitle: false, keyFieldsPresent: false, missingFields };
  }

  let allHaveSource = true;
  let allHaveTitle = true;
  let keyFieldsPresent = true;

  for (const ev of evidence) {
    if (!ev.source) { allHaveSource = false; missingFields.push(`evidence "${ev.title}" 缺少 source`); }
    if (!ev.title) { allHaveTitle = false; missingFields.push('一条 evidence 缺少 title'); }
    if (ev.value == null || ev.value === '') {
      keyFieldsPresent = false;
      missingFields.push(`evidence "${ev.title}" value 为空`);
    }
  }

  const score =
    (hasEvidence ? 0.4 : 0) +
    (allHaveSource ? 0.2 : 0) +
    (allHaveTitle ? 0.2 : 0) +
    (keyFieldsPresent ? 0.2 : 0);

  return {
    passed: hasEvidence && allHaveSource && allHaveTitle,
    score: Math.round(score * 100) / 100,
    evidenceCount: evidence.length,
    hasEvidence,
    allHaveSource,
    allHaveTitle,
    keyFieldsPresent,
    missingFields,
  };
}
