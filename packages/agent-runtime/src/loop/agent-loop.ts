// Agent Loop — 受控状态机执行器

import type { AgentLoopContext, AgentState } from './agent-state';
import { isTerminal, isValidTransition, STATE_TRANSITIONS } from './agent-state';
import type { TraceRecorder } from '../trace/trace-recorder';
import type { LongHoldDecision } from '@longhold/core';

export interface AgentLoopResult {
  ok: boolean;
  decision?: LongHoldDecision;
  error?: {
    code: string;
    message: string;
  };
  traceId: string;
  context: AgentLoopContext;
}

export interface AgentLoopOptions {
  maxSteps?: number;       // default: 12
  maxLlmCalls?: number;    // default: 6
  maxTimeMs?: number;      // default: 300_000
}

const DEFAULT_OPTIONS: Required<AgentLoopOptions> = {
  maxSteps: 12,
  maxLlmCalls: 6,
  maxTimeMs: 300_000,
};

/**
 * AgentLoop 是受控状态机的主执行器。
 *
 * 约束：
 * - 不允许无限循环（maxSteps 硬限制）
 * - 不允许绕过状态转换
 * - 硬规则触发时立刻进入 JUDGE
 * - 每步写入 Trace
 *
 * TODO:
 * - 实现完整的状态处理逻辑
 * - 集成 TaskRouter、SkillRunner、ToolRouter、ModelGateway
 * - 集成 Harness 的权限/预算检查
 * - 集成 OutputValidator
 */
export async function runAgentLoop(
  taskId: string,
  context: AgentLoopContext,
  options: AgentLoopOptions = {},
  _trace: TraceRecorder,
  // TODO: 注入依赖
  // taskRouter: TaskRouter,
  // skillRunner: SkillRunner,
  // toolRouter: ToolRouter,
  // modelGateway: ModelGateway,
  // harness: HarnessRunner,
): Promise<AgentLoopResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  context.maxSteps = opts.maxSteps;
  context.maxLlmCalls = opts.maxLlmCalls;
  context.maxTimeMs = opts.maxTimeMs;
  context.startedAt = new Date();

  // 主循环
  while (!isTerminal(context.currentState)) {
    // 检查硬限制
    if (context.stepCount >= opts.maxSteps) {
      return {
        ok: false,
        error: { code: 'STEP_LIMIT_EXCEEDED', message: `超过最大步数限制 ${opts.maxSteps}` },
        traceId: '',
        context,
      };
    }

    const elapsed = Date.now() - context.startedAt.getTime();
    if (elapsed >= opts.maxTimeMs) {
      return {
        ok: false,
        error: { code: 'TIMEOUT', message: `超过最大时间限制 ${opts.maxTimeMs}ms` },
        traceId: '',
        context,
      };
    }

    if (context.llmCallCount >= opts.maxLlmCalls) {
      return {
        ok: false,
        error: { code: 'BUDGET_EXCEEDED', message: `超过最大 LLM 调用次数 ${opts.maxLlmCalls}` },
        traceId: '',
        context,
      };
    }

    // TODO: 获取当前状态对应的处理器并执行
    // const handler = getStateHandler(context.currentState);
    // const result = await handler.execute(context);

    // TODO: 确定下一个状态
    const nextState = determineNextState(context);
    if (!isValidTransition(context.currentState, nextState)) {
      return {
        ok: false,
        error: {
          code: 'INVALID_TRANSITION',
          message: `无效状态转换: ${context.currentState} → ${nextState}`,
        },
        traceId: '',
        context,
      };
    }

    context.currentState = nextState;
    context.stepCount++;
  }

  // TODO: 返回 LongHoldDecision
  return {
    ok: true,
    traceId: '',
    context,
  };
}

/**
 * 根据当前上下文确定下一个状态。
 *
 * 规则：
 * 1. 硬规则触发 CRITICAL → 直接进入 JUDGE
 * 2. 否则按标准状态机流转
 *
 * TODO: 根据实际执行结果动态决策
 */
function determineNextState(context: AgentLoopContext): AgentState {
  // 硬规则提前触发
  if (context.hardRuleTriggered && context.currentState === 'EXECUTE_STEP') {
    return 'JUDGE';
  }

  // 标准流转：取第一个允许的下一状态
  const allowed = STATE_TRANSITIONS[context.currentState];
  if (allowed.length === 0) return 'FINISH';
  return allowed[0];
}
