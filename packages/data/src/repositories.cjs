// repositories.js — JS 版仓库实现（V0.3-harness 兼容层）
// TypeScript 版在 repositories.ts

const fs = require('fs');
const path = require('path');

// ===== CSV Parser =====
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
}

// ===== PortfolioRepository =====
class PortfolioRepository {
  constructor(csvPath) {
    this.path = csvPath || path.resolve('data/samples/portfolio.sample.csv');
  }

  getAll() {
    if (!fs.existsSync(this.path)) return [];
    return parseCSV(fs.readFileSync(this.path, 'utf-8')).map(r => ({
      symbol: r.symbol,
      name: r.name,
      costPrice: Number(r.cost_price) || 0,
      quantity: Number(r.quantity) || 0,
      buyReason: r.buy_reason || undefined,
    }));
  }

  getBySymbol(symbol) {
    return this.getAll().find(r => r.symbol === symbol) || null;
  }

  getSymbols() {
    return this.getAll().map(r => r.symbol);
  }
}

// ===== KlineRepository =====
class KlineRepository {
  constructor(csvPath) {
    this.path = csvPath || path.resolve('data/samples/kline_250d.sample.csv');
  }

  getBySymbol(symbol) {
    return this.getAll().filter(r => r.symbol === symbol);
  }

  getBySymbols(symbols) {
    const all = this.getAll();
    const map = {};
    for (const s of symbols) map[s] = all.filter(r => r.symbol === s);
    return map;
  }

  getAll() {
    if (!fs.existsSync(this.path)) return [];
    return parseCSV(fs.readFileSync(this.path, 'utf-8'))
      .filter(r => r.close && !isNaN(Number(r.close)))
      .map(r => ({
        symbol: r.symbol,
        tradeDate: r.trade_date,
        open: Number(r.open) || 0,
        high: Number(r.high) || 0,
        low: Number(r.low) || 0,
        close: Number(r.close) || 0,
        volume: r.volume ? Number(r.volume) : undefined,
        amount: r.amount ? Number(r.amount) : undefined,
      }));
  }
}

// ===== DecisionLogRepository =====
class DecisionLogRepository {
  constructor(dir) {
    this.dir = dir || path.resolve('memory/decision-log');
    fs.mkdirSync(this.dir, { recursive: true });
  }

  write(log) {
    const filePath = path.resolve(this.dir, `${log.logId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(log, null, 2), 'utf-8');
  }
}

module.exports = { PortfolioRepository, KlineRepository, DecisionLogRepository };
