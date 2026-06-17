// Agent Loop 状态定义 — 受控状态机，不允许自由循环

export type AgentState =
  | 'INIT'
  | 'LOAD_CONTEXT'
  | 'SELECT_SKILL'
  | 'PLAN'
  | 'EXECUTE_STEP'
  | 'VALIDATE_RESULT'
  | 'COLLECT_EVIDENCE'
  | 'ANALYZE'
  | 'JUDGE'
  | 'REPORT'
  | 'WRITE_MEMORY'
  | 'FINISH';

export type TerminalState = 'FINISH';

export type ErrorState =
  | 'HARD_RULE_TRIGGERED'
  | 'STEP_LIMIT_EXCEEDED'
  | 'BUDGET_EXCEEDED'
  | 'TIMEOUT'
  | 'MODEL_UNAVAILABLE';

export const STATE_TRANSITIONS: Record<AgentState, AgentState[]> = {
  INIT: ['LOAD_CONTEXT'],
  LOAD_CONTEXT: ['SELECT_SKILL'],
  SELECT_SKILL: ['PLAN'],
  PLAN: ['EXECUTE_STEP'],
  EXECUTE_STEP: ['EXECUTE_STEP', 'VALIDATE_RESULT', 'JUDGE'], // JUDGE for hard-rule early-exit
  VALIDATE_RESULT: ['COLLECT_EVIDENCE', 'EXECUTE_STEP'], // retry once
  COLLECT_EVIDENCE: ['ANALYZE'],
  ANALYZE: ['JUDGE'],
  JUDGE: ['REPORT'],
  REPORT: ['WRITE_MEMORY'],
  WRITE_MEMORY: ['FINISH'],
  FINISH: [],
};

export interface AgentLoopContext {
  taskId: string;
  skillId?: string;
  currentState: AgentState;
  stepCount: number;
  maxSteps: number;
  maxLlmCalls: number;
  llmCallCount: number;
  maxTimeMs: number;
  startedAt: Date;
  hardRuleTriggered: boolean;
  hardRuleSource?: string;
}

export function isTerminal(state: AgentState): boolean {
  return state === 'FINISH';
}

export function isValidTransition(from: AgentState, to: AgentState): boolean {
  const allowed = STATE_TRANSITIONS[from];
  return allowed !== undefined && allowed.includes(to);
}
