// harness-runner.js — V0.3.1 任务执行入口
// 新增: loadLLMConfig, pre_model_risk_gate trace, traceStats/budgetStats 分离

const { ToolRegistry } = require('../registries/tool-registry');
const { BudgetPolicy } = require('../budget/budget-policy');
const { MonthlyHoldReviewRunner } = require('../../../skills/src/monthly-hold-review/skill-runner.cjs');
const { loadLLMConfig } = require('../llm-config.cjs');

// ===== Trace Recorder =====
class HarnessTraceRecorder {
  constructor(taskId) {
    this.taskId = taskId;
    this.events = [];
    this.toolCalls = [];
    this.evidenceItems = [];
    this.startTime = Date.now();
  }

  recordEvent(type, data = {}) {
    this.events.push({ type, timestamp: new Date().toISOString(), elapsedMs: Date.now() - this.startTime, ...data });
  }

  recordToolCall(entry) {
    const call = { ...entry, finishedAt: new Date().toISOString() };
    if (!call.durationMs) call.durationMs = Date.now() - this.startTime;
    this.toolCalls.push(call);
    this.recordEvent('tool_call', { toolName: entry.toolName });
  }

  addEvidence(evidence) {
    if (Array.isArray(evidence)) this.evidenceItems.push(...evidence);
    else this.evidenceItems.push(evidence);
  }

  setFinalDecision(decision) {
    this.finalDecision = decision;
  }

  toJSON() {
    return {
      traceId: `trace-monthly-${new Date().toISOString().slice(0, 7)}`,
      taskId: this.taskId,
      skillId: 'monthly-hold-review',
      startedAt: new Date(this.startTime).toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - this.startTime,
      status: 'COMPLETED',
      events: this.events,
      toolCalls: this.toolCalls,
      evidenceItems: this.evidenceItems,
      finalDecision: this.finalDecision || null,
    };
  }

  getEventsByType(type) {
    return this.events.filter(e => e.type === type);
  }
}

// ===================================================================
// HarnessRunner
// ===================================================================

class HarnessRunner {
  constructor(config = {}) {
    this.toolRegistry = new ToolRegistry();
    this.budget = new BudgetPolicy(config.budget);
    this.llmConfig = loadLLMConfig();
    this.fs = require('fs');
    this.path = require('path');
  }

  getGatewayLabel() {
    return this.llmConfig.label;
  }

  async runMonthlyReview(overrides = {}) {
    const trace = new HarnessTraceRecorder('monthly-review');
    trace.recordEvent('task_started', { llmMode: this.llmConfig.mode, llmLabel: this.llmConfig.label });
    if (this.llmConfig.error) {
      trace.recordEvent('config_warning', { message: this.llmConfig.error });
    }

    // 构建 gateway 对象（向后兼容 tool-registry 的 model_analyze_stock）
    const gateway = this.llmConfig.hasDeepSeek
      ? { hasDeepSeek: true, config: this.llmConfig.config, llmStrategy: this.llmConfig.strategy }
      : { hasDeepSeek: false, config: null, llmStrategy: this.llmConfig.strategy };

    const skill = new MonthlyHoldReviewRunner({
      toolRegistry: this.toolRegistry,
      budget: this.budget,
      trace,
      gateway,
    });

    trace.recordEvent('skill_selected', { skillId: 'monthly-hold-review' });
    const result = await skill.run(overrides);

    if (result.ok && result.data) {
      trace.setFinalDecision(result.data.decisions[0] || null);
      if (result.data.decisions) {
        for (const d of result.data.decisions) {
          if (d.evidence) trace.addEvidence(d.evidence);
        }
      }
    }
    trace.recordEvent('task_finished', { ok: result.ok });

    const traceObj = trace.toJSON();
    // Budget stats（SkillRunner 统计的工具执行次数）
    if (result.ok && result.data?.budgetStats) {
      traceObj.budget = result.data.budgetStats;
    }
    if (result.ok && result.data?.traceStats) {
      traceObj.traceStats = result.data.traceStats;
      traceObj.modelCallCount = result.data.traceStats.modelCalls;
      traceObj.modelSkipCount = result.data.traceStats.modelSkips;
    }
    if (result.ok && result.data?.budgetExceeded) {
      traceObj.budgetExceeded = true;
      traceObj.budgetExceededReason = result.data.budgetExceededReason;
    }

    // 写入 trace
    const traceDir = this.path.resolve('data/traces');
    this.fs.mkdirSync(traceDir, { recursive: true });
    const tracePath = this.path.resolve(traceDir, `monthly_hold_review_${overrides.asOfDate || new Date().toISOString().slice(0, 7)}.json`);
    this.fs.writeFileSync(tracePath, JSON.stringify(traceObj, null, 2), 'utf-8');

    const stats = result.ok && result.data?.traceStats ? {
      modelCalls: result.data.traceStats.modelCalls,
      modelSkips: result.data.traceStats.modelSkips,
      toolExecutions: result.data.traceStats.toolExecutions,
      traceEvents: result.data.traceStats.traceEvents,
      toolTraceEvents: result.data.traceStats.toolTraceEvents,
      budgetExceeded: result.data.budgetExceeded,
    } : {};

    return {
      ...result,
      tracePath,
      trace: traceObj,
      gateway: this.llmConfig.label,
      llmMode: this.llmConfig.mode,
      stats,
    };
  }
}

module.exports = { HarnessRunner, HarnessTraceRecorder };
