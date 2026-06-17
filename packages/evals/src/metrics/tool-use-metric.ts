// Tool Use Metric — 工具调用效率评估 (Layer 3)

import type { Trace, ToolCallEntry } from '@longhold/agent-runtime';

export interface ToolUseMetricResult {
  passed: boolean;
  score: number;
  totalToolCalls: number;
  uniqueTools: number;
  redundantCalls: number;    // 同一工具同一参数重复调用
  failedCalls: number;
  retriedSuccessfully: number;
  unnecessaryCalls: string[];
}

/**
 * ToolUseMetric 评估 Agent 的工具调用效率。
 *
 * 规则：
 * - 不应有冗余调用（同一工具 + 同一参数）
 * - 不应有无关工具调用（未在 Skill.requiredTools 中）
 * - 失败率不应过高（>30%）
 * - 重试后成功的算合理
 */
export function evaluateToolUse(
  trace: Trace,
  _requiredTools: string[],
): ToolUseMetricResult {
  const toolCalls = trace.toolCalls;

  const totalToolCalls = toolCalls.length;
  const uniqueTools = new Set(toolCalls.map((tc) => tc.toolName)).size;

  const fails = toolCalls.filter((tc) => tc.error != null);
  const failedCalls = fails.length;
  const retriedSuccessfully = toolCalls.filter(
    (tc) => tc.retryCount > 0 && tc.error == null,
  ).length;

  // 检测冗余：同一工具 + 同一参数（简化版）
  const redundantCalls = detectRedundantCalls(toolCalls);

  // 检测不必要的调用
  const unnecessaryCalls: string[] = [];
  // TODO: 对比 requiredTools，标记不在列表中的调用

  const failRate = totalToolCalls > 0 ? failedCalls / totalToolCalls : 0;
  const redundancyRate = totalToolCalls > 0 ? redundantCalls / totalToolCalls : 0;

  const score = Math.max(
    0,
    1.0 - failRate * 0.4 - redundancyRate * 0.3 - (unnecessaryCalls.length / Math.max(totalToolCalls, 1)) * 0.3,
  );

  return {
    passed: score >= 0.6,
    score: Math.round(score * 100) / 100,
    totalToolCalls,
    uniqueTools,
    redundantCalls,
    failedCalls,
    retriedSuccessfully,
    unnecessaryCalls,
  };
}

function detectRedundantCalls(calls: ToolCallEntry[]): number {
  const seen = new Set<string>();
  let redundant = 0;

  for (const call of calls) {
    const key = `${call.toolName}:${JSON.stringify(call.input)}`;
    if (seen.has(key)) {
      redundant++;
    } else {
      seen.add(key);
    }
  }

  return redundant;
}
