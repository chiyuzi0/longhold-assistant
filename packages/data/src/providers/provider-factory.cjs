// provider-factory.cjs — V1.1 统一 DataProvider 入口
//
// mode: mock | live | auto
// auto: 有 API url+key → Live，否则 Mock
// live: 强制 Live，无 key 报错

const { MockDataProvider } = require('./mock-provider.cjs');
const { LiveDataProvider } = require('./live-provider.cjs');

function createMarketDataProvider(config) {
  const mode = (config?.mode || process.env.DATA_MODE || 'auto').toLowerCase();
  const baseUrl = config?.baseUrl || process.env.MARKET_API_BASE_URL;
  const apiKey = config?.apiKey || process.env.MARKET_API_KEY;
  const timeoutMs = parseInt(config?.timeoutMs || process.env.DATA_TIMEOUT_MS || '5000', 10);
  const maxRetries = parseInt(config?.maxRetries || process.env.DATA_RETRY || '3', 10);

  if (mode === 'mock') {
    return new MockDataProvider();
  }

  if (mode === 'live') {
    if (!baseUrl) {
      throw new Error('DATA_MODE=live 但未配置 MARKET_API_BASE_URL');
    }
    return new LiveDataProvider({ baseUrl, apiKey, timeoutMs, maxRetries });
  }

  if (mode === 'auto') {
    if (baseUrl && apiKey) {
      return new LiveDataProvider({ baseUrl, apiKey, timeoutMs, maxRetries });
    }
    return new MockDataProvider();
  }

  // 未知模式 → 安全降级到 Mock
  console.warn(`[provider-factory] 未知 DATA_MODE="${mode}"，使用 Mock`);
  return new MockDataProvider();
}

module.exports = { createMarketDataProvider };
