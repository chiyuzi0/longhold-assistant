// v0.4-repositories.cjs — V0.4 数据仓库（DuckDB + JSON 双后端）
// 所有 Repository 接收 DuckDBClient，同时兼容旧 FileRepository 签名

const { DuckDBClient, isDuckdbAvailable } = require('./duckdb-client.cjs');

// ===== Helper: CSV Parser =====
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

// ===== 1. StockBasicRepository =====
class StockBasicRepository {
  constructor(client) {
    this.client = client || new DuckDBClient();
  }

  async getBySymbol(symbol) {
    const r = await this.client.query(`SELECT * FROM stock_basic WHERE symbol='${symbol}'`);
    if (!r.ok || r.rows.length === 0) return null;
    const row = r.rows[0];
    return { symbol: row.symbol, name: row.name, market: row.market, exchange: row.exchange, industry: row.industry, listDate: row.list_date, status: row.status };
  }

  async getBySymbols(symbols) {
    if (symbols.length === 0) return [];
    const quoted = symbols.map(s => `'${s}'`).join(',');
    const r = await this.client.query(`SELECT * FROM stock_basic WHERE symbol IN (${quoted})`);
    if (!r.ok) return [];
    return r.rows.map(row => ({ symbol: row.symbol, name: row.name, market: row.market, status: row.status }));
  }

  async upsert(profile) {
    await this.client.exec(`INSERT OR REPLACE INTO stock_basic (symbol, name, market, status, updated_at) VALUES ('${profile.symbol}','${profile.name}','${profile.market || 'A_SHARE'}','${profile.status || 'NORMAL'}', CURRENT_DATE)`);
  }
}

// ===== 2. PortfolioRepository (DuckDB version) =====
class PortfolioRepository {
  constructor(client) {
    this.client = client instanceof DuckDBClient ? client : new DuckDBClient();
    this.csvPath = typeof client === 'string' ? client : undefined;
  }

  async getAll() {
    if (this.csvPath) return this._fromCsv();
    const r = await this.client.query('SELECT * FROM portfolio');
    if (!r.ok) return [];
    return r.rows.map(row => ({ symbol: row.symbol, name: row.name, costPrice: row.cost_price || 0, quantity: row.quantity || 0, buyReason: row.buy_reason }));
  }

  async getBySymbol(symbol) {
    const all = await this.getAll();
    return all.find(r => r.symbol === symbol) || null;
  }

  async upsert(holding) {
    await this.client.exec(`INSERT OR REPLACE INTO portfolio (symbol, name, cost_price, quantity, buy_reason, updated_at) VALUES ('${holding.symbol}','${holding.name || ''}',${holding.costPrice || 0},${holding.quantity || 0},'${holding.buyReason || ''}', CURRENT_DATE)`);
  }

  _fromCsv() {
    if (!require('fs').existsSync(this.csvPath)) return [];
    return parseCSV(require('fs').readFileSync(this.csvPath, 'utf-8')).map(r => ({ symbol: r.symbol, name: r.name, costPrice: Number(r.cost_price) || 0, quantity: Number(r.quantity) || 0, buyReason: r.buy_reason }));
  }
}

// ===== 3. KlineRepository (DuckDB version) =====
class KlineRepository {
  constructor(client) {
    this.client = client instanceof DuckDBClient ? client : new DuckDBClient();
    this.csvPath = typeof client === 'string' ? client : undefined;
  }

  async getBySymbol(symbol, limit = 300) {
    if (this.csvPath) return this._fromCsv(symbol);
    const r = await this.client.query(`SELECT * FROM kline_daily WHERE symbol='${symbol}' ORDER BY trade_date DESC LIMIT ${limit}`);
    if (!r.ok) return [];
    return r.rows.map(row => ({
      symbol: row.symbol, tradeDate: row.trade_date, open: row.open, high: row.high, low: row.low, close: row.close, volume: row.volume, amount: row.amount,
    }));
  }

  async getBySymbols(symbols, limit = 300) {
    const map = {};
    for (const s of symbols) map[s] = await this.getBySymbol(s, limit);
    return map;
  }

  async batchUpsert(bars) {
    for (const b of bars) {
      await this.client.exec(`INSERT OR REPLACE INTO kline_daily (symbol, trade_date, open, high, low, close, volume, amount, source) VALUES ('${b.symbol}','${b.tradeDate}',${b.open},${b.high},${b.low},${b.close},${b.volume || 0},${b.amount || 0},'${b.source || 'fetcher'}')`);
    }
  }

  _fromCsv(symbol) {
    const csvPath = this.csvPath || require('path').resolve('data/samples/kline_250d.sample.csv');
    if (!require('fs').existsSync(csvPath)) return [];
    const all = parseCSV(require('fs').readFileSync(csvPath, 'utf-8')).filter(r => r.symbol === symbol && r.close && !isNaN(Number(r.close)));
    const maxLimit = Math.min(all.length, limit || 300);
    return all.slice(-maxLimit).map(r => ({
      symbol: r.symbol, tradeDate: r.trade_date, open: Number(r.open), high: Number(r.high), low: Number(r.low), close: Number(r.close), volume: r.volume ? Number(r.volume) : undefined, amount: r.amount ? Number(r.amount) : undefined,
    }));
  }
}

// ===== 4. RiskFlagRepository =====
class RiskFlagRepository {
  constructor(client) {
    this.client = client || new DuckDBClient();
  }

  async getBySymbol(symbol) {
    const r = await this.client.query(`SELECT * FROM risk_flags WHERE symbol='${symbol}'`);
    if (!r.ok || r.rows.length === 0) return null;
    const row = r.rows[0];
    return { symbol: row.symbol, isST: !!row.is_st, isDelisting: !!row.is_delisting, isSuspended: !!row.is_suspended, hasDataIssue: !!row.has_data_issue, note: row.note };
  }

  async upsert(flag) {
    await this.client.exec(`INSERT OR REPLACE INTO risk_flags (symbol, is_st, is_delisting, is_suspended, has_data_issue, note, updated_at) VALUES ('${flag.symbol}',${flag.isST ? 1 : 0},${flag.isDelisting ? 1 : 0},${flag.isSuspended ? 1 : 0},${flag.hasDataIssue ? 1 : 0},'${flag.note || ''}', CURRENT_DATE)`);
  }
}

// ===== 5. DecisionLogRepository (DuckDB version) =====
class DecisionLogRepository {
  constructor(client) {
    this.client = client instanceof DuckDBClient ? client : new DuckDBClient();
    this.jsonDir = typeof client === 'string' ? client : undefined;
  }

  async write(log) {
    if (this.client.backend !== 'duckdb' || !this.jsonDir) {
      // Write to JSON file as well
      const fs = require('fs');
      const path = require('path');
      const dir = this.jsonDir || path.resolve('memory/decision-log');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.resolve(dir, `${log.logId}.json`), JSON.stringify(log, null, 2), 'utf-8');
    }
    if (this.client.backend === 'duckdb') {
      await this.client.exec(`INSERT INTO decision_log (log_id, task_id, skill_id, symbol, action, confidence, summary, decision_source, model_called, hard_rule_override, evidence_json, risks_json, trace_id) VALUES ('${log.logId}','${log.taskId}','${log.skillId}','${log.symbol}','${log.action}',${log.confidence || 0},'${(log.summary || '').replace(/'/g, "''")}','${log.decisionSource || ''}',${log.modelCalled ? 1 : 0},${log.hardRuleOverride ? 1 : 0},'${(log.evidenceJson || '[]').replace(/'/g, "''")}','${(log.risksJson || '[]').replace(/'/g, "''")}','${log.traceId || ''}')`);
    }
  }

  async writeBatch(logs) {
    for (const log of logs) await this.write(log);
  }

  async getByTaskId(taskId) {
    const r = await this.client.query(`SELECT * FROM decision_log WHERE task_id='${taskId}' ORDER BY created_at`);
    if (!r.ok) return [];
    return r.rows.map(row => ({ logId: row.log_id, symbol: row.symbol, action: row.action, confidence: row.confidence, summary: row.summary }));
  }
}

// ===== 6. DataQualityRepository =====
class DataQualityRepository {
  constructor(client) {
    this.client = client || new DuckDBClient();
  }

  async write(check) {
    await this.client.exec(`INSERT INTO data_quality_log (check_id, symbol, status, kline_count, last_trade_date, days_since_last, has_zero_close, has_dup_dates, has_zero_volume_streak, details) VALUES ('${check.checkId}','${check.symbol}','${check.status}',${check.klineCount || 0},'${check.lastTradeDate || ''}',${check.daysSinceLast || -1},${check.hasZeroClose ? 1 : 0},${check.hasDupDates ? 1 : 0},${check.hasZeroVolumeStreak ? 1 : 0},'${(check.details || '').replace(/'/g, "''")}')`);
  }

  async getBySymbol(symbol) {
    const r = await this.client.query(`SELECT * FROM data_quality_log WHERE symbol='${symbol}' ORDER BY check_date DESC LIMIT 1`);
    if (!r.ok || r.rows.length === 0) return null;
    const row = r.rows[0];
    return { checkId: row.check_id, symbol: row.symbol, status: row.status, klineCount: row.kline_count, lastTradeDate: row.last_trade_date, daysSinceLast: row.days_since_last };
  }
}

module.exports = { StockBasicRepository, PortfolioRepository, KlineRepository, RiskFlagRepository, DecisionLogRepository, DataQualityRepository };
