// Budget Policy — 资源消耗控制

export interface BudgetPolicyConfig {
  maxLlmCalls: number;
  maxSteps: number;
  maxTimeMs: number;
  maxTokensPerCall: number;
  maxTokensPerTask: number;
}

export interface BudgetStatus {
  tokensUsed: number;
  llmCalls: number;
  steps: number;
  startTime: number;
  lastCheckTime: number;
}

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  remainingTokens: number;
  remainingLlmCalls: number;
  remainingSteps: number;
  remainingTimeMs: number;
}

/**
 * BudgetPolicy 控制每次任务的资源消耗上限。
 *
 * TODO:
 * - 实时追踪 token 消耗（从 Model Gateway 获取）
 * - 超限自动终止
 */
export class BudgetPolicy {
  private config: BudgetPolicyConfig;
  private status: BudgetStatus;

  constructor(config: Partial<BudgetPolicyConfig> = {}) {
    this.config = {
      maxLlmCalls: 6,
      maxSteps: 12,
      maxTimeMs: 300_000,
      maxTokensPerCall: 8_000,
      maxTokensPerTask: 40_000,
      ...config,
    };

    this.status = {
      tokensUsed: 0,
      llmCalls: 0,
      steps: 0,
      startTime: 0,
      lastCheckTime: 0,
    };
  }

  /** 重置预算状态（每次新任务） */
  reset(): void {
    const now = Date.now();
    this.status = {
      tokensUsed: 0,
      llmCalls: 0,
      steps: 0,
      startTime: now,
      lastCheckTime: now,
    };
  }

  /** 记录 LLM 调用消耗 */
  recordLlmCall(tokens: number): BudgetCheckResult {
    this.status.llmCalls++;
    this.status.tokensUsed += tokens;
    this.status.lastCheckTime = Date.now();
    return this.check();
  }

  /** 记录一个步骤 */
  recordStep(): BudgetCheckResult {
    this.status.steps++;
    this.status.lastCheckTime = Date.now();
    return this.check();
  }

  /** 检查当前预算状态 */
  check(): BudgetCheckResult {
    const now = Date.now();
    const elapsed = this.status.startTime > 0 ? now - this.status.startTime : 0;

    const remainingTokens = this.config.maxTokensPerTask - this.status.tokensUsed;
    const remainingLlmCalls = this.config.maxLlmCalls - this.status.llmCalls;
    const remainingSteps = this.config.maxSteps - this.status.steps;
    const remainingTimeMs = this.config.maxTimeMs - elapsed;

    // 检查各项是否超限
    if (remainingTokens <= 0) {
      return { allowed: false, reason: 'Token 预算耗尽', remainingTokens: 0, remainingLlmCalls, remainingSteps, remainingTimeMs };
    }
    if (remainingLlmCalls <= 0) {
      return { allowed: false, reason: 'LLM 调用次数超限', remainingTokens, remainingLlmCalls: 0, remainingSteps, remainingTimeMs };
    }
    if (remainingSteps <= 0) {
      return { allowed: false, reason: '步数超限', remainingTokens, remainingLlmCalls, remainingSteps: 0, remainingTimeMs };
    }
    if (remainingTimeMs <= 0) {
      return { allowed: false, reason: '时间超限', remainingTokens, remainingLlmCalls, remainingSteps, remainingTimeMs: 0 };
    }

    return { allowed: true, remainingTokens, remainingLlmCalls, remainingSteps, remainingTimeMs };
  }

  getConfig(): BudgetPolicyConfig {
    return { ...this.config };
  }

  getStatus(): BudgetStatus {
    return { ...this.status };
  }
}
