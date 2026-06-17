// Trace Recorder — 全链路执行记录

import type { AgentLoopContext, AgentState } from '../loop/agent-state';
import type { EvidenceItem } from '../evidence/evidence';
import type { LongHoldDecision } from '@longhold/core';

// ---- Trace Entry Types ----

export interface StateTransitionEntry {
  sequenceId: number;
  fromState: AgentState;
  toState: AgentState;
  timestamp: string;
  elapsedMs: number;
  metadata?: Record<string, unknown>;
}

export interface ToolCallEntry {
  callId: string;
  toolName: string;
  input: unknown;
  output: unknown;
  startedAt: string;
  durationMs: number;
  retryCount: number;
  error?: string;
}

export interface MCPCallEntry {
  callId: string;
  serverName: string;
  toolName: string;
  input: unknown;
  output: unknown;
  startedAt: string;
  durationMs: number;
  retryCount: number;
  error?: string;
}

export interface BashCommandEntry {
  commandId: string;
  command: string;
  workingDir: string;
  exitCode: number;
  stdoutTruncated: boolean;
  wasDryRun: boolean;
  requiredConfirmation: boolean;
  confirmedByUser: boolean;
  startedAt: string;
  durationMs: number;
}

export interface ValidationEntry {
  validationId: string;
  type: 'SCHEMA' | 'EVIDENCE' | 'HARD_RULE' | 'FORBIDDEN_CONTENT';
  passed: boolean;
  details: string;
  timestamp: string;
}

export interface MemoryWriteEntry {
  writeId: string;
  store: string;
  key: string;
  action: 'WRITE' | 'UPDATE' | 'DELETE';
  confirmedByUser: boolean;
  timestamp: string;
}

export interface EvalEntry {
  evalRunId: string;
  caseId: string;
  passed: boolean;
  layerScores: Record<string, number>;
  totalScore: number;
  failures: string[];
}

// ---- Top-Level Trace ----

export interface Trace {
  traceId: string;
  taskId: string;
  skillId?: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: 'COMPLETED' | 'TRUNCATED' | 'TIMEOUT' | 'ERROR' | 'BUDGET_EXCEEDED';
  model: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  budget: {
    totalTokensUsed: number;
    totalLlmCalls: number;
    totalSteps: number;
    budgetExceeded: boolean;
  };
  states: StateTransitionEntry[];
  toolCalls: ToolCallEntry[];
  mcpCalls: MCPCallEntry[];
  bashCommands: BashCommandEntry[];
  evidenceItems: EvidenceItem[];
  validationResults: ValidationEntry[];
  finalDecision?: LongHoldDecision;
  memoryWrites: MemoryWriteEntry[];
  evalResults: EvalEntry[];
}

// ---- Recorder ----

/**
 * TraceRecorder 负责记录 Agent Loop 执行过程中的所有关键事件。
 *
 * 设计：
 * - 单例 per task
 * - 每步追加（非全量替换）
 * - 序列化为 JSON Lines 存储
 *
 * TODO:
 * - 持久化到 data/traces/
 * - 实现从文件加载用于 Replay
 * - 内存/磁盘预算管理
 */
export class TraceRecorder {
  private trace: Trace;

  constructor(taskId: string) {
    this.trace = {
      traceId: `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      taskId,
      startedAt: new Date().toISOString(),
      finishedAt: '',
      durationMs: 0,
      status: 'COMPLETED',
      model: { provider: 'deepseek', model: 'deepseek-v4-pro', temperature: 0.2, maxTokens: 4000 },
      budget: { totalTokensUsed: 0, totalLlmCalls: 0, totalSteps: 0, budgetExceeded: false },
      states: [],
      toolCalls: [],
      mcpCalls: [],
      bashCommands: [],
      evidenceItems: [],
      validationResults: [],
      memoryWrites: [],
      evalResults: [],
    };
  }

  recordStateTransition(
    from: AgentState,
    to: AgentState,
    metadata?: Record<string, unknown>,
  ): void {
    this.trace.states.push({
      sequenceId: this.trace.states.length,
      fromState: from,
      toState: to,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - new Date(this.trace.startedAt).getTime(),
      metadata,
    });
  }

  recordToolCall(entry: ToolCallEntry): void {
    this.trace.toolCalls.push(entry);
    this.trace.budget.totalSteps++;
  }

  recordMCPCall(entry: MCPCallEntry): void {
    this.trace.mcpCalls.push(entry);
    this.trace.budget.totalSteps++;
  }

  recordBashCommand(entry: BashCommandEntry): void {
    this.trace.bashCommands.push(entry);
  }

  recordEvidence(items: EvidenceItem[]): void {
    this.trace.evidenceItems.push(...items);
  }

  recordValidation(entry: ValidationEntry): void {
    this.trace.validationResults.push(entry);
  }

  recordMemoryWrite(entry: MemoryWriteEntry): void {
    this.trace.memoryWrites.push(entry);
  }

  recordEvalResult(entry: EvalEntry): void {
    this.trace.evalResults.push(entry);
  }

  setFinalDecision(decision: LongHoldDecision): void {
    this.trace.finalDecision = decision;
  }

  setStatus(status: Trace['status']): void {
    this.trace.status = status;
  }

  setSkillId(skillId: string): void {
    this.trace.skillId = skillId;
  }

  addTokens(count: number): void {
    this.trace.budget.totalTokensUsed += count;
  }

  addLlmCall(): void {
    this.trace.budget.totalLlmCalls++;
    this.trace.budget.totalSteps++;
  }

  markBudgetExceeded(): void {
    this.trace.budget.budgetExceeded = true;
  }

  finish(): void {
    this.trace.finishedAt = new Date().toISOString();
    this.trace.durationMs =
      new Date(this.trace.finishedAt).getTime() -
      new Date(this.trace.startedAt).getTime();
  }

  getTrace(): Trace {
    return this.trace;
  }

  /**
   * TODO: 序列化为 JSON 写入 data/traces/
   */
  async persist(): Promise<void> {
    // TODO: writeFile(`data/traces/${this.trace.traceId}.json`, JSON.stringify(this.trace, null, 2));
  }
}
