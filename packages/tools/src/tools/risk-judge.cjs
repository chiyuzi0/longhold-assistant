// risk-judge.cjs — V1.2 风控裁决
// 升级: regime + confidence weighting
// 硬约束: EXCLUDE 永远不可被 override

const SEVERITY = { EXCLUDE: 100, DATA_INSUFFICIENT: 90, REDUCE_EXIT: 80, CAUTIOUS_HOLD: 60, WATCH: 40, HOLD: 20 };

const DOWNGRADE_MAP = {
  HOLD: 'WATCH',
  WATCH: 'CAUTIOUS_HOLD',
  CAUTIOUS_HOLD: 'CAUTIOUS_HOLD',  // 不可再降
  REDUCE_EXIT: 'REDUCE_EXIT',
  EXCLUDE: 'EXCLUDE',
};

function downgradeOneLevel(action) {
  return DOWNGRADE_MAP[action] || action;
}

function upgradeOneLevel(action) {
  if (action === 'HOLD') return 'HOLD';
  if (action === 'WATCH') return 'HOLD';
  if (action === 'CAUTIOUS_HOLD') return 'WATCH';
  return action;
}

async function execute(input, ctx) {
  // Judge 独立评估
  let judgeAction = 'HOLD', judgeConf = 0.5;
  if (input.hasCriticalRisk) { judgeAction = 'EXCLUDE'; judgeConf = 0.95; }
  else if (!input.hasData) { judgeAction = 'DATA_INSUFFICIENT'; judgeConf = 0.5; }
  else if (!input.performanceOk) { judgeAction = 'CAUTIOUS_HOLD'; judgeConf = 0.5; }
  else { judgeAction = 'HOLD'; judgeConf = 0.65; }

  const jSev = SEVERITY[judgeAction] || 0;
  const mSev = SEVERITY[input.modelAction] || 0;

  // 硬规则触发 → 覆盖（不可被任何规则覆盖）
  if (input.hasCriticalRisk || !input.hasData) {
    return { ok: true, data: { action: judgeAction, confidence: judgeConf, hardRuleApplied: true, severityConflict: jSev !== mSev, reliabilityGateApplied: false } };
  }

  // ===== V1.2: Data Confidence Gate =====
  const dq = (ctx && ctx.dataQuality) || {};
  let adjustedAction = judgeAction;
  let reliabilityGateApplied = false;

  // ① LOW / UNTRUSTED → CAUTIOUS_HOLD 硬降（不可升）
  if (dq.qualityLevel === 'LOW' || dq.qualityLevel === 'UNTRUSTED') {
    if (adjustedAction === 'HOLD') adjustedAction = 'CAUTIOUS_HOLD';
    else adjustedAction = downgradeOneLevel(adjustedAction);
    reliabilityGateApplied = true;
  }

  // ② MEDIUM → CAUTIOUS_HOLD only（HOLD 不允许）
  if (dq.qualityLevel === 'MEDIUM' && adjustedAction === 'HOLD') {
    adjustedAction = 'CAUTIOUS_HOLD';
    reliabilityGateApplied = true;
  }

  // ③ BEAR regime → 更保守
  if (dq.regime === 'BEAR') {
    if (adjustedAction === 'HOLD') { adjustedAction = 'WATCH'; reliabilityGateApplied = true; }
    else if (adjustedAction === 'WATCH') { adjustedAction = 'CAUTIOUS_HOLD'; reliabilityGateApplied = true; }
  }

  // ④ BULL + HIGH confidence → 允许升级（不覆盖 EXCLUDE）
  if (dq.regime === 'BULL' && dq.qualityLevel === 'HIGH' && adjustedAction !== 'EXCLUDE') {
    const upgraded = upgradeOneLevel(adjustedAction);
    if (upgraded !== adjustedAction) reliabilityGateApplied = true;
    adjustedAction = upgraded;
  }

  // ===== Severity conflict with model =====
  const adjSev = SEVERITY[adjustedAction] || 0;

  if (adjSev > mSev) {
    return { ok: true, data: { action: adjustedAction, confidence: judgeConf, hardRuleApplied: false, severityConflict: true, reliabilityGateApplied } };
  }

  // 一致 → 用 LLM
  return { ok: true, data: { action: input.modelAction, confidence: input.modelConfidence, hardRuleApplied: false, severityConflict: false, reliabilityGateApplied } };
}

module.exports = {
  name: 'risk_judge',
  description: 'V1.2 风控裁决：硬规则优先 + regime/confidence 加权',
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
    reliabilityGateApplied: { type: 'boolean' },
  }},
  execute,
};
