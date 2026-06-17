// Replay Runner — Trace 回放执行

import type { Trace } from '@longhold/agent-runtime';

export interface ReplayResult {
  ok: boolean;
  originalTraceId: string;
  replayTraceId: string;
  match: boolean;
  diffs: ReplayDiff[];
}

export interface ReplayDiff {
  path: string;
  original: unknown;
  replay: unknown;
  severity: 'SAME' | 'MINOR' | 'MAJOR' | 'CRITICAL';
}

/**
 * ReplayRunner 用历史 Trace 重放任务，检查输出是否一致。
 *
 * 用途：
 * 1. 代码变更后回归测试
 * 2. Skill 版本升级验证
 * 3. 数据源变更影响评估
 *
 * 注意：
 * - 重放使用相同的 fixtures（不依赖实时数据）
 * - 定性一致即可（不是字节级一致）
 * - CRITICAL diff 触发 Regression Gate
 *
 * TODO:
 * - 实现真实 Replay 逻辑
 * - 定义 diff 容忍度策略
 * - 集成到 CI/CD
 */
export class ReplayRunner {
  /**
   * 重放一个 Trace。
   *
   * @param originalTrace 原始 Trace
   * @param _overrides 覆盖参数（可选）
   */
  async replay(originalTrace: Trace, _overrides?: Record<string, unknown>): Promise<ReplayResult> {
    // TODO: 从 Trace 中恢复输入，重新执行，对比输出

    return {
      ok: true,
      originalTraceId: originalTrace.traceId,
      replayTraceId: `replay-${Date.now()}`,
      match: true,
      diffs: [],
    };
  }

  /**
   * 对比两个 Trace 的关键输出。
   *
   * 定性一致规则：
   * - action 必须一致（HOLD → HOLD）
   * - risk_level 必须一致
   * - evidence 数量不能显著减少（>30%）
   * - 禁止内容不能出现
   */
  compare(_original: Trace, _replay: Trace): ReplayDiff[] {
    // TODO: 实现对比逻辑
    return [];
  }
}
