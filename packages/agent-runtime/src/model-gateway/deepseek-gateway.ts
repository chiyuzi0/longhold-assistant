// DeepSeekModelGateway — 真实 DeepSeek API 调用
// Risk Gate 优先级高于 LLM 输出。
// API 不可用时自动回退到 Mock。

import type { ModelAnalysisInput, ModelAnalysisOutput } from './types';

export { MockModelGateway } from './mock-gateway';

export interface DeepSeekConfig {
  baseUrl: string;
  apiKey: string;
  model: string;         // "deepseek-v4-pro" | "deepseek-v4-flash"
  temperature: number;
  maxTokens: number;
  proxyUrl?: string;     // e.g. "http://127.0.0.1:7897"
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export type GatewayResult =
  | { ok: true; output: ModelAnalysisOutput; usage: TokenUsage }
  | { ok: false; error: string };

// ===== Default config from environment =====

export function loadDeepSeekConfig(): DeepSeekConfig | null {
  const baseUrl = process.env.LONGHOLD_LLM_BASE_URL;
  const apiKey = process.env.LONGHOLD_LLM_API_KEY;
  if (!baseUrl || !apiKey) return null;

  return {
    baseUrl,
    apiKey,
    model: process.env.LONGHOLD_LLM_MODEL || 'deepseek-chat',
    temperature: 0.2,
    maxTokens: 2000,
    proxyUrl: process.env.HTTP_PROXY || process.env.https_proxy,
  };
}

// ===== Prompt Template =====

function buildSystemPrompt(): string {
  return `你是 LongHold Assistant 的分析 Agent。
你的任务是基于证据对一只 A/H 股持仓做出分析判断。

规则：
1. 只基于提供的 evidence 做分析，不编造数据。
2. 输出结构化 JSON，不要多余文字。
3. 最终 action 只能选 HOLD / CAUTIOUS_HOLD / EXCLUDE 之一。
4. 如果触发了 ST/退市风险，必须输出 EXCLUDE。
5. 如果数据不完整，输出 CAUTIOUS_HOLD。
6. 不承诺收益、不预测短期涨跌、不输出"必涨""推荐买入"等。`;
}

function buildUserPrompt(input: ModelAnalysisInput): string {
  return `请分析 ${input.symbol}（${input.name}）。

## 股票状态
- 状态: ${input.status}
- 250日收益率: ${input.returnPct.toFixed(2)}%
- 250日最大回撤: ${input.maxDrawdownPct.toFixed(2)}%

## 风险信号
- 触发严重风险: ${input.hasCriticalRisk}
- 存在风险信号: ${input.hasRiskSignals}
- 数据完整: ${input.asOfDate}

请输出 JSON（不要任何额外文字）：
{
  "symbol": "${input.symbol}",
  "modelAction": "HOLD | CAUTIOUS_HOLD | EXCLUDE",
  "modelConfidence": 0.0-1.0,
  "modelReasoning": "分析理由（50字以内）",
  "bullPoints": ["看多理由1", "看多理由2"],
  "bearPoints": ["看空理由1", "看空理由2"]
}`;
}

// ===== DeepSeek Gateway =====

export class DeepSeekModelGateway {
  private config: DeepSeekConfig | null;
  private ready: boolean;
  private readyMessage: string;

  constructor(config?: DeepSeekConfig) {
    this.config = config ?? loadDeepSeekConfig();
    if (this.config) {
      this.ready = true;
      this.readyMessage = `DeepSeek (${this.config.model}) @ ${this.config.baseUrl}`;
    } else {
      this.ready = false;
      this.readyMessage = 'LONGHOLD_LLM_BASE_URL / LONGHOLD_LLM_API_KEY 未设置。请配置 .env 文件。';
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  getReadyMessage(): string {
    return this.readyMessage;
  }

  /**
   * 调用 DeepSeek API 分析一只股票。
   * 返回结构化 JSON + token 用量。
   * API 调用失败时返回错误，由调用方决定是否回退。
   */
  async analyze(input: ModelAnalysisInput): Promise<GatewayResult> {
    if (!this.ready || !this.config) {
      return { ok: false, error: this.readyMessage };
    }

    try {
      const system = buildSystemPrompt();
      const user = buildUserPrompt(input);

      const body = {
        model: this.config.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        response_format: { type: 'json_object' },
      };

      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
      };

      // 如果设置了代理，通过代理请求
      const url = this.config.proxyUrl
        ? `${this.config.baseUrl}/chat/completions`
        : `${this.config.baseUrl}/chat/completions`;

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const errText = await response.text();
        return { ok: false, error: `DeepSeek API 错误 (${response.status}): ${errText}` };
      }

      const json = await response.json() as any;

      const usage: TokenUsage = {
        promptTokens: json.usage?.prompt_tokens ?? 0,
        completionTokens: json.usage?.completion_tokens ?? 0,
        totalTokens: json.usage?.total_tokens ?? 0,
      };

      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        return { ok: false, error: 'DeepSeek 返回空内容' };
      }

      // 解析结构化 JSON
      const parsed = JSON.parse(content) as ModelAnalysisOutput;
      const output: ModelAnalysisOutput = {
        symbol: parsed.symbol || input.symbol,
        modelAction: validateAction(parsed.modelAction),
        modelConfidence: clampConfidence(parsed.modelConfidence),
        modelReasoning: parsed.modelReasoning || '',
        bullPoints: parsed.bullPoints || [],
        bearPoints: parsed.bearPoints || [],
      };

      return { ok: true, output, usage };
    } catch (e) {
      return { ok: false, error: `DeepSeek 调用异常: ${String(e)}` };
    }
  }
}

function validateAction(action: string): 'HOLD' | 'CAUTIOUS_HOLD' | 'EXCLUDE' {
  if (action === 'HOLD' || action === 'CAUTIOUS_HOLD' || action === 'EXCLUDE') return action;
  return 'CAUTIOUS_HOLD';
}

function clampConfidence(c: number): number {
  if (typeof c !== 'number' || isNaN(c)) return 0.5;
  return Math.max(0, Math.min(1, c));
}

export { buildUserPrompt, buildSystemPrompt };
