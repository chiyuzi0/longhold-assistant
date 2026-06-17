// harness-runner.js — V0.3 任务执行入口
// 所有任务通过这里调度，不手写业务流程

const { ToolRegistry } = require('../registries/tool-registry');
const { BudgetPolicy } = require('../budget/budget-policy');
const { MonthlyHoldReviewRunner } = require('../../../skills/src/monthly-hold-review/skill-runner.cjs');

// ===== 简易 Trace Recorder（记录关键事件到 JSON） =====
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
}

// ===== Gateway 检测 =====
function createGateway() {
  const envPath = require('path').resolve('.env');
  const fs = require('fs');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
      const t = line.trim();
      if (t && !t.startsWith('#')) {
        const eq = t.indexOf('=');
        if (eq > 0) {
          const k = t.slice(0, eq).trim(), v = t.slice(eq + 1).trim();
          if (!process.env[k]) process.env[k] = v;
        }
      }
    }
  }
  const baseUrl = process.env.LONGHOLD_LLM_BASE_URL;
  const apiKey = process.env.LONGHOLD_LLM_API_KEY;
  const hasDeepSeek = !!(baseUrl && apiKey);
  return {
    hasDeepSeek,
    config: hasDeepSeek ? {
      baseUrl, apiKey,
      model: process.env.LONGHOLD_LLM_MODEL || 'deepseek-chat',
    } : null,
    label: hasDeepSeek ? `DeepSeek @ ${baseUrl}` : 'Mock（无 API key）',
  };
}

// ===================================================================
// HarnessRunner — 统一任务入口
// ===================================================================

class HarnessRunner {
  constructor(config = {}) {
    this.toolRegistry = new ToolRegistry();
    this.budget = new BudgetPolicy(config.budget);
    this.gateway = createGateway();
    this.fs = require('fs');
    this.path = require('path');
  }

  getGatewayLabel() {
    return this.gateway.label;
  }

  /**
   * 运行月度持仓体检任务。
   * 这是唯一的任务入口。
   */
  async runMonthlyReview(overrides = {}) {
    const trace = new HarnessTraceRecorder('monthly-review');
    trace.recordEvent('task_started', { gateway: this.gateway.label });

    // 构建 Skill Runner
    const skill = new MonthlyHoldReviewRunner({
      toolRegistry: this.toolRegistry,
      budget: this.budget,
      trace,
      gateway: this.gateway,
    });

    // 执行
    trace.recordEvent('skill_selected', { skillId: 'monthly-hold-review' });
    const result = await skill.run(overrides);

    // 记录 trace
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
    // 补充预算数据
    if (result.ok && result.data?.budgetStats) {
      traceObj.budget = result.data.budgetStats;
    }

    // 写入 trace 文件
    const traceDir = this.path.resolve('data/traces');
    this.fs.mkdirSync(traceDir, { recursive: true });
    const tracePath = this.path.resolve(traceDir, `monthly_hold_review_${overrides.asOfDate || new Date().toISOString().slice(0, 7)}.json`);
    this.fs.writeFileSync(tracePath, JSON.stringify(traceObj, null, 2), 'utf-8');

    return {
      ...result,
      tracePath,
      trace: traceObj,
      gateway: this.gateway.label,
    };
  }
}

module.exports = { HarnessRunner, HarnessTraceRecorder };
