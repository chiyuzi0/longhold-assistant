// model-analyze-stock.js — 调用模型分析单只股票

async function execute(input, ctx) {
  const gw = input.gateway;
  const strategy = (input.llmStrategy || 'mock_fallback');

  // DeepSeek path
  if (gw && gw.hasDeepSeek) {
    const prompt = `分析 ${input.symbol}（${input.name}）：
状态: ${input.status}
250日收益率: ${(input.returnPct || 0).toFixed(2)}%
250日最大回撤: ${(input.maxDrawdownPct || 0).toFixed(2)}%
严重风险: ${input.hasCriticalRisk}
风险信号: ${input.hasRiskSignals}

输出 JSON:
{
  "symbol": "${input.symbol}",
  "modelAction": "HOLD"|"CAUTIOUS_HOLD"|"EXCLUDE",
  "modelConfidence": 0.0-1.0,
  "modelReasoning": "理由(50字内)",
  "bullPoints": ["理由1"],
  "bearPoints": ["理由1"]
}`;

    const url = `${gw.config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    try {
      // strict mode: DeepSeek API 失败时返回错误，不 fallback
      if (strategy === 'strict') {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gw.config.apiKey}` },
          body: JSON.stringify({
            model: gw.config.model, temperature: 0.2, max_tokens: 2000,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: '输出 JSON。只分析证据，不编造。action 选 HOLD/CAUTIOUS_HOLD/EXCLUDE。' },
              { role: 'user', content: prompt },
            ],
          }),
        });
        if (!resp.ok) {
          const errText = await resp.text();
          return { ok: false, error: { code: 'DEEPSEEK_API_ERROR', message: `DeepSeek API ${resp.status}: ${errText.slice(0, 200)}` } };
        }
        const json = await resp.json();
        const content = json.choices?.[0]?.message?.content;
        if (!content) return { ok: false, error: { code: 'DEEPSEEK_EMPTY', message: 'DeepSeek 返回空内容' } };
        const parsed = JSON.parse(content);
        const validActions = ['HOLD', 'CAUTIOUS_HOLD', 'EXCLUDE'];
        return {
          ok: true,
          data: {
            modelAction: validActions.includes(parsed.modelAction) ? parsed.modelAction : null,
            modelConfidence: Math.max(0, Math.min(1, parsed.modelConfidence || 0.5)),
            modelReasoning: parsed.modelReasoning || '',
            bullPoints: parsed.bullPoints || [], bearPoints: parsed.bearPoints || [],
            modelSource: 'deepseek',
            tokenUsage: json.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            modelOutputValid: validActions.includes(parsed.modelAction),
          },
        };
      }

      // auto/mock mode: DeepSeek API 失败时回退到 Mock
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gw.config.apiKey}` },
        body: JSON.stringify({
          model: gw.config.model, temperature: 0.2, max_tokens: 2000,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: '输出 JSON。只分析证据，不编造。action 选 HOLD/CAUTIOUS_HOLD/EXCLUDE。' },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (resp.ok) {
        const json = await resp.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          const validActions = ['HOLD', 'CAUTIOUS_HOLD', 'EXCLUDE'];
          return {
            ok: true,
            data: {
              modelAction: validActions.includes(parsed.modelAction) ? parsed.modelAction : null,
              modelConfidence: Math.max(0, Math.min(1, parsed.modelConfidence || 0.5)),
              modelReasoning: parsed.modelReasoning || '',
              bullPoints: parsed.bullPoints || [], bearPoints: parsed.bearPoints || [],
              modelSource: 'deepseek',
              tokenUsage: json.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
              modelOutputValid: validActions.includes(parsed.modelAction),
            },
          };
        }
      }
    } catch (e) {
      return { ok: true, data: makeMock(input, 'fallback_on_invalid_model_output') };
    }
  }

  // Mock path
  return { ok: true, data: makeMock(input, 'mock') };
}

function makeMock(input, modelSource) {
  let action = 'HOLD', conf = 0.7, reason = `[${input.symbol}] 未发现重大风险信号。`;
  let bull = [], bear = [];

  if (input.hasCriticalRisk) {
    action = 'EXCLUDE'; conf = 0.85; reason = `[${input.symbol}] 触发重大风险规则。`;
    bear = ['触发退市/ST 风险'];
  } else if (input.hasRiskSignals) {
    action = 'CAUTIOUS_HOLD'; conf = 0.55; reason = `[${input.symbol}] 存在风险信号。`;
    bear = ['存在风险信号'];
  } else {
    bull = [(input.returnPct || 0) > 0 ? `250日收益 ${(input.returnPct || 0).toFixed(1)}%` : '波动可控'];
  }

  return {
    modelAction: action, modelConfidence: conf, modelReasoning: reason,
    bullPoints: bull, bearPoints: bear,
    modelSource, tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    modelOutputValid: true,
  };
}

module.exports = {
  name: 'model_analyze_stock',
  description: '调用模型分析单只股票（DeepSeek → Mock 回退），标记 modelOutputValid',
  category: 'model',
  permission: 'model',
  inputSchema: { type: 'object', properties: {
    symbol: { type: 'string' }, name: { type: 'string' }, status: { type: 'string' },
    returnPct: { type: 'number' }, maxDrawdownPct: { type: 'number' },
    hasCriticalRisk: { type: 'boolean' }, hasRiskSignals: { type: 'boolean' },
    asOfDate: { type: 'string' }, gateway: { type: 'object' },
  }},
  outputSchema: { type: 'object', properties: {
    modelAction: { type: 'string' }, modelConfidence: { type: 'number' },
    modelReasoning: { type: 'string' }, bullPoints: { type: 'array' }, bearPoints: { type: 'array' },
    modelSource: { type: 'string' }, tokenUsage: { type: 'object' }, modelOutputValid: { type: 'boolean' },
  }},
  execute,
};
