// tool-registry.js — V0.3.1 瘦 ToolRegistry
// 只负责注册，工具实现迁移到 packages/tools/src/tools/

const toolModules = [
  require('../../../tools/src/tools/get-portfolio.cjs'),
  require('../../../tools/src/tools/get-kline-250d.cjs'),
  require('../../../tools/src/tools/calculate-250d-performance.cjs'),
  require('../../../tools/src/tools/check-risk-flags.cjs'),
  require('../../../tools/src/tools/build-evidence-list.cjs'),
  require('../../../tools/src/tools/model-analyze-stock.cjs'),
  require('../../../tools/src/tools/risk-judge.cjs'),
  require('../../../tools/src/tools/generate-monthly-report.cjs'),
  require('../../../tools/src/tools/write-decision-log.cjs'),
];

class ToolRegistry {
  constructor() {
    this._tools = {};
    for (const mod of toolModules) {
      if (mod && mod.name) {
        if (this._tools[mod.name]) throw new Error(`工具 "${mod.name}" 重复注册`);
        this._tools[mod.name] = mod;
      }
    }
  }

  get(name) { return this._tools[name] || null; }
  has(name) { return !!this._tools[name]; }
  list() { return Object.values(this._tools); }
  listByCategory(cat) { return this.list().filter(t => t.category === cat); }

  async call(name, input, ctx) {
    const tool = this._tools[name];
    if (!tool) return { ok: false, error: { code: 'TOOL_NOT_FOUND', message: `工具 "${name}" 未注册` } };
    const result = await tool.execute(input, ctx || {});
    result.toolName = name;
    return result;
  }
}

module.exports = { ToolRegistry };
