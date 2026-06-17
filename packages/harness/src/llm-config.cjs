// llm-config.cjs — LLM 模式配置 (mock / deepseek / auto)
//
// deepseek: 强制真实模型，API 不可用或不响应时报错，不允许 fallback
// auto:     有 API key 用 DeepSeek，无 API key 用 Mock（允许 fallback）
// mock:     强制 Mock，不调用真实 API

const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) return;
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

function loadLLMConfig() {
  loadEnv();

  const mode = (process.env.LONGHOLD_LLM_MODE || 'auto').toLowerCase();
  const baseUrl = process.env.LONGHOLD_LLM_BASE_URL;
  const apiKey = process.env.LONGHOLD_LLM_API_KEY;
  const model = process.env.LONGHOLD_LLM_MODEL || 'deepseek-chat';
  const hasApiKey = !!(baseUrl && apiKey);

  // deepseek 模式：强制真实模型
  if (mode === 'deepseek') {
    if (!hasApiKey) {
      return {
        mode: 'deepseek',
        label: 'DeepSeek (未配置)',
        config: null,
        error: 'LONGHOLD_LLM_MODE=deepseek 但 LONGHOLD_LLM_BASE_URL 或 LONGHOLD_LLM_API_KEY 未设置',
        hasDeepSeek: false,
        strategy: 'fail',     // 失败即失败，不 fallback
      };
    }
    return {
      mode: 'deepseek',
      label: `DeepSeek (${model}) @ ${baseUrl}`,
      config: { baseUrl, apiKey, model },
      error: null,
      hasDeepSeek: true,
      strategy: 'strict',    // API 失败时传播错误
    };
  }

  // auto 模式：有 key 用 DeepSeek，无 key 用 Mock
  if (mode === 'auto') {
    if (!hasApiKey) {
      return {
        mode: 'auto',
        label: 'Mock (无 API key)',
        config: null,
        error: null,
        hasDeepSeek: false,
        strategy: 'mock_fallback',
      };
    }
    return {
      mode: 'auto',
      label: `DeepSeek (${model}) @ ${baseUrl}`,
      config: { baseUrl, apiKey, model },
      error: null,
      hasDeepSeek: true,
      strategy: 'auto_fallback',  // API 失败时回退到 Mock
    };
  }

  // mock 模式
  if (mode === 'mock') {
    return {
      mode: 'mock',
      label: 'Mock (LONGHOLD_LLM_MODE=mock)',
      config: null,
      error: null,
      hasDeepSeek: false,
      strategy: 'mock_forced',
    };
  }

  // 未知模式
  return {
    mode: 'mock',
    label: `Mock (未知模式 "${mode}")`,
    config: null,
    error: `未知 LONGHOLD_LLM_MODE "${mode}"，使用 mock`,
    hasDeepSeek: false,
    strategy: 'mock_fallback',
  };
}

module.exports = { loadLLMConfig };
