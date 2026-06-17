// budget-policy.js — 资源消耗追踪与限制

const DEFAULT_CONFIG = {
  maxModelCalls: 10,
  maxToolCalls: 50,
  maxTotalTokens: 80000,
  maxRuntimeMs: 120000,
  maxStocksPerRun: 20,
};

class BudgetPolicy {
  constructor(config) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.reset();
  }

  reset() {
    this.stats = {
      toolCalls: 0,
      modelCalls: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      startedAt: Date.now(),
      exceeded: false,
      exceededReason: null,
    };
  }

  getConfig() {
    return { ...this.config };
  }

  getStats() {
    return { ...this.stats, runtimeMs: Date.now() - this.stats.startedAt };
  }

  check() {
    const elapsed = Date.now() - this.stats.startedAt;
    const errors = [];

    if (this.stats.toolCalls >= this.config.maxToolCalls) {
      errors.push(`工具调用超限: ${this.stats.toolCalls}/${this.config.maxToolCalls}`);
    }
    if (this.stats.modelCalls >= this.config.maxModelCalls) {
      errors.push(`模型调用超限: ${this.stats.modelCalls}/${this.config.maxModelCalls}`);
    }
    if (this.stats.totalTokens >= this.config.maxTotalTokens) {
      errors.push(`Token 超限: ${this.stats.totalTokens}/${this.config.maxTotalTokens}`);
    }
    if (elapsed >= this.config.maxRuntimeMs) {
      errors.push(`运行超时: ${elapsed}ms/${this.config.maxRuntimeMs}ms`);
    }

    if (errors.length > 0) {
      this.stats.exceeded = true;
      this.stats.exceededReason = errors[0];
      return { allowed: false, reason: errors[0] };
    }

    return { allowed: true };
  }

  recordToolCall() {
    this.stats.toolCalls++;
    return this.check();
  }

  recordModelCall(tokens = {}) {
    this.stats.modelCalls++;
    this.stats.promptTokens += tokens.prompt || 0;
    this.stats.completionTokens += tokens.completion || 0;
    this.stats.totalTokens += (tokens.prompt || 0) + (tokens.completion || 0);
    return this.check();
  }
}

module.exports = { BudgetPolicy, DEFAULT_CONFIG };
