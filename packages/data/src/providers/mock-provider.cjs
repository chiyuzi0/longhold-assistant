// mock-provider.cjs — V1.1 MockDataProvider
// 包装现有 KlineRepository / PortfolioRepository
// isLive() 返回 false

const path = require('path');
const { PortfolioRepository, KlineRepository } = require('../repositories.cjs');
const { DataCache, CACHE_TTL } = require('./cache.cjs');

const DEFAULT_PORTFOLIO_CSV = path.resolve('data/samples/portfolio.sample.csv');
const DEFAULT_KLINE_CSV = path.resolve('data/samples/kline_250d.sample.csv');

class MockDataProvider {
  constructor(config) {
    this.name = 'MockDataProvider';
    this.portfolioRepo = new PortfolioRepository(config?.portfolioCsv || DEFAULT_PORTFOLIO_CSV);
    this.klineRepo = new KlineRepository(config?.klineCsv || DEFAULT_KLINE_CSV);
    this.cache = new DataCache();
    this._mockPrices = {
      '000001.SZ': 12.5, '000002.SZ': 18.0, '000003.SZ': 5.0,
      '0700.HK': 380, '9988.HK': 220, '600519.SH': 1500,
      '601318.SH': 45, '000858.SZ': 140, '600036.SH': 35, '3690.HK': 150,
    };
  }

  isLive() { return false; }
  getProviderName() { return this.name; }

  async getKline(symbol, range = 250) {
    // Check cache
    const cached = this.cache.get('kline', symbol, CACHE_TTL.KLINE);
    if (cached && cached.hit && cached.level !== 'stale_warn') {
      return cached.data;
    }

    const rows = this.klineRepo.getBySymbol(symbol);
    const bars = rows
      .filter(r => r.close && !isNaN(Number(r.close)))
      .slice(-range)
      .map(r => ({
        symbol: r.symbol,
        date: r.tradeDate,
        open: Number(r.open),
        high: Number(r.high),
        low: Number(r.low),
        close: Number(r.close),
        volume: Number(r.volume || 0),
      }));

    this.cache.set('kline', symbol, bars, 'mock');
    return bars;
  }

  async getQuote(symbol) {
    const cached = this.cache.get('quote', symbol, CACHE_TTL.QUOTE);
    if (cached && cached.hit) return cached.data;

    // 从 kline 最后一行取 close 作为当前价
    const klines = await this.getKline(symbol, 1);
    const price = klines.length > 0 ? klines[0].close : (this._mockPrices[symbol] || 50);
    const quote = {
      symbol,
      price,
      changePct: 0,
      timestamp: Date.now(),
      source: 'mock',
    };

    this.cache.set('quote', symbol, quote, 'mock');
    return quote;
  }

  async getFundamentals(symbol) {
    const cached = this.cache.get('fund', symbol, CACHE_TTL.FUNDAMENTAL);
    if (cached && cached.hit) return cached.data;

    const fund = {
      symbol,
      pe: 15 + Math.random() * 30,
      pb: 1.5 + Math.random() * 8,
      roe: 10 + Math.random() * 15,
      eps: 0.5 + Math.random() * 7,
      marketCap: 50 + Math.random() * 2000,
      revenue: 10 + Math.random() * 500,
      profit: 1 + Math.random() * 100,
      source: 'mock',
    };

    this.cache.set('fund', symbol, fund, 'mock');
    return fund;
  }
}

module.exports = { MockDataProvider };
