// Harness Runner — Agent 约束与控制统一入口

import type { TraceRecorder } from '@longhold/agent-runtime';

export interface HarnessResult {
  ok: boolean;
  traceId: string;
  output?: unknown;
  errors: string[];
  warnings: string[];
  riskGateResult: RiskGateResult;
  evidenceGateResult: EvidenceGateResult;
  budgetUsage: BudgetUsage;
}

export interface TaskRequest {
  taskId: string;
  skillId?: string;
  input: unknown;
  context?: Record<string, unknown>;
}

export interface RiskGateResult {
  triggered: boolean;
  hardRuleOverrides: HardRuleOverride[];
}

export interface HardRuleOverride {
  rule: string;
  llmAction: string;
  enforcedAction: string;
  reason: string;
}

export interface EvidenceGateResult {
  passed: boolean;
  evidenceCount: number;
  missingSources: string[];
}

export interface BudgetUsage {
  tokensUsed: number;
  llmCalls: number;
  steps: number;
  timeMs: number;
  budgetExceeded: boolean;
}

export interface HarnessConfig {
  maxSteps: number;
  maxLlmCalls: number;
  maxTimeMs: number;
  maxTokensPerTask: number;
  enableRiskGate: boolean;
  enableEvidenceGate: boolean;
  enableEvalGate: boolean;
  enableReplayLog: boolean;
  requireUserConfirmationForWrites: boolean;
}

/**
 * HarnessRunner 是 Harness 层的唯一对外接口。
 *
 * 职责：
 * 1. 启动时校验所有 Registry（Tool/Skill/MCP/Bash）
 * 2. 执行任务时做权限检查
 * 3. 预算消耗追踪
 * 4. Risk Gate 硬规则覆盖
 * 5. Evidence Gate 证据链检查
 * 6. Eval Gate（可选）
 * 7. Trace 记录
 *
 * TODO:
 * - 实现完整的 Registry 校验
 * - 集成真实的 Tool/Skill/MCP/Bash Registry
 * - 实现 Replay
 * - 实现 Regression Gate
 */
export class HarnessRunner {
  private config: HarnessConfig;

  constructor(config: Partial<HarnessConfig> = {}) {
    this.config = {
      maxSteps: 12,
      maxLlmCalls: 6,
      maxTimeMs: 300_000,
      maxTokensPerTask: 20_000,
      enableRiskGate: true,
      enableEvidenceGate: true,
      enableEvalGate: false, // 初期默认关闭
      enableReplayLog: true,
      requireUserConfirmationForWrites: true,
      ...config,
    };
  }

  async validateRegistry(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    // TODO: 校验 ToolRegistry、SkillRegistry、MCPRegistry、BashRegistry
    return { valid: errors.length === 0, errors };
  }

  async executeTask(request: TaskRequest, trace: TraceRecorder): Promise<HarnessResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // TODO: 权限检查
    // TODO: 预算初始化
    // TODO: 调用 AgentLoop
    // TODO: Risk Gate
    // TODO: Evidence Gate
    // TODO: Eval Gate (if enabled)

    const riskGateResult: RiskGateResult = { triggered: false, hardRuleOverrides: [] };
    const evidenceGateResult: EvidenceGateResult = { passed: true, evidenceCount: 0, missingSources: [] };
    const budgetUsage: BudgetUsage = { tokensUsed: 0, llmCalls: 0, steps: 0, timeMs: 0, budgetExceeded: false };

    return {
      ok: true,
      traceId: trace.getTrace().traceId,
      errors,
      warnings,
      riskGateResult,
      evidenceGateResult,
      budgetUsage,
    };
  }

  getConfig(): HarnessConfig {
    return { ...this.config };
  }
}
