// write-decision-log.js — 写入决策日志
const { DecisionLogRepository } = require('../../../data/src/repositories.cjs');

async function execute(input, ctx) {
  const repo = new DecisionLogRepository();
  const logIds = [];
  for (const d of (input.decisions || [])) {
    const logId = `log-${d.symbol}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    repo.write({
      logId, taskId: input.taskId, skillId: input.skillId,
      symbol: d.symbol, action: d.action, confidence: d.confidence, summary: d.summary,
      evidenceJson: JSON.stringify(d.evidence || []),
      risksJson: JSON.stringify(d.risks || []),
      decisionSource: d.decisionSource || 'unknown',
      modelCalled: !!d.modelCalled,
      hardRuleOverride: !!d.hardRuleOverride,
      traceId: input.traceId, createdAt: new Date().toISOString(),
    });
    logIds.push(logId);
  }
  return { ok: true, data: { logIds } };
}

module.exports = {
  name: 'write_decision_log',
  description: '写入决策日志到 memory/decision-log/（含 decisionSource）',
  category: 'memory',
  permission: 'write',
  inputSchema: { type: 'object', properties: { traceId: { type: 'string' }, taskId: { type: 'string' }, skillId: { type: 'string' }, decisions: { type: 'array' } } },
  outputSchema: { type: 'object', properties: { logIds: { type: 'array' } } },
  execute,
};
