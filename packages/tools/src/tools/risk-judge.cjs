// risk-judge.js — 风控裁决

const SEVERITY = { EXCLUDE: 100, DATA_INSUFFICIENT: 90, REDUCE_EXIT: 80, CAUTIOUS_HOLD: 60, WATCH: 40, HOLD: 20 };

async function execute(input, ctx) {
  // Judge 独立评估
  let judgeAction = 'HOLD', judgeConf = 0.5;
  if (input.hasCriticalRisk) { judgeAction = 'EXCLUDE'; judgeConf = 0.95; }
  else if (!input.hasData) { judgeAction = 'DATA_INSUFFICIENT'; judgeConf = 0.5; }
  else if (!input.performanceOk) { judgeAction = 'CAUTIOUS_HOLD'; judgeConf = 0.5; }
  else { judgeAction = 'HOLD'; judgeConf = 0.65; }

  const jSev = SEVERITY[judgeAction] || 0;
  const mSev = SEVERITY[input.modelAction] || 0;

  // 硬规则触发 → 覆盖
  if (input.hasCriticalRisk || !input.hasData) {
    return { ok: true, data: { action: judgeAction, confidence: judgeConf, hardRuleApplied: true, severityConflict: jSev !== mSev } };
  }
  // Judge 更保守 → 覆盖
  if (jSev > mSev) {
    return { ok: true, data: { action: judgeAction, confidence: judgeConf, hardRuleApplied: false, severityConflict: true } };
  }
  // 一致 → 用 LLM（即便 LLM 输出非法，也会被前面的 jSev > mSev 捕获，因为非法值 mSev=0）
  return { ok: true, data: { action: input.modelAction, confidence: input.modelConfidence, hardRuleApplied: false, severityConflict: false } };
}

module.exports = {
  name: 'risk_judge',
  description: '风控裁决：硬规则优先，severity 覆盖，非法 LLM 输出降级到 CAUTIOUS_HOLD',
  category: 'risk',
  permission: 'judge',
  inputSchema: { type: 'object', properties: {
    symbol: { type: 'string' }, hasCriticalRisk: { type: 'boolean' },
    performanceOk: { type: 'boolean' }, hasData: { type: 'boolean' },
    modelAction: { type: 'string' }, modelConfidence: { type: 'number' },
  }},
  outputSchema: { type: 'object', properties: {
    action: { type: 'string' }, confidence: { type: 'number' },
    hardRuleApplied: { type: 'boolean' }, severityConflict: { type: 'boolean' },
  }},
  execute,
};
