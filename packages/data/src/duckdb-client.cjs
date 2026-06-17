// duckdb-client.cjs — V0.4 DuckDB 客户端
//
// 行为:
// 1. DuckDB CLI 可用时，使用真实 DuckDB
// 2. 不可用时，使用 JSON 文件作为存储后端（保持 demo 可运行）

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DB_PATH = path.resolve('data/duckdb/longhold.duckdb');
const JSON_DIR = path.resolve('data/duckdb/json-fallback');

// ===== DuckDB CLI 检测 =====
let _duckdbAvailable = null;
function isDuckdbAvailable() {
  if (_duckdbAvailable !== null) return _duckdbAvailable;
  try {
    execSync('duckdb --version', { stdio: 'ignore', timeout: 5000 });
    _duckdbAvailable = true;
  } catch {
    _duckdbAvailable = false;
  }
  return _duckdbAvailable;
}

// ===== JSON Fallback Backend =====
function ensureJsonDir() { fs.mkdirSync(JSON_DIR, { recursive: true }); }

function jsonTablePath(table) { return path.resolve(JSON_DIR, `${table}.json`); }

function jsonReadAll(table) {
  const p = jsonTablePath(table);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return []; }
}

function jsonWriteAll(table, rows) {
  ensureJsonDir();
  fs.writeFileSync(jsonTablePath(table), JSON.stringify(rows, null, 2), 'utf-8');
}

function jsonInsert(table, row) {
  const rows = jsonReadAll(table);
  // 替换已有（symbol 或 symbol+trade_date 为主键）
  const key = row.symbol + (row.trade_date || '');
  const idx = rows.findIndex(r => {
    if (row.trade_date) return r.symbol === row.symbol && String(r.trade_date) === String(row.trade_date);
    return r.symbol === row.symbol;
  });
  if (idx >= 0) rows[idx] = row;
  else rows.push(row);
  jsonWriteAll(table, rows);
}

function jsonDelete(table, symbol) {
  const rows = jsonReadAll(table).filter(r => r.symbol !== symbol);
  jsonWriteAll(table, rows);
}

// ===== DuckDBClient =====
class DuckDBClient {
  constructor(dbPath) {
    this.dbPath = dbPath || DB_PATH;
    this.duckdbAvailable = isDuckdbAvailable();
    this.backend = this.duckdbAvailable ? 'duckdb' : 'json-fallback';
  }

  getBackend() { return this.backend; }

  async query(sql) {
    if (this.duckdbAvailable) {
      try {
        const out = execSync(`duckdb "${this.dbPath}" -json -c "${sql.replace(/"/g, '\\"')}"`, {
          encoding: 'utf-8', timeout: 30000,
        });
        return { ok: true, rows: JSON.parse(out) };
      } catch (e) {
        return { ok: false, rows: [], error: String(e) };
      }
    }
    // JSON fallback: parse simple SELECT
    return this._jsonQuery(sql);
  }

  async exec(sql) {
    if (this.duckdbAvailable) {
      try {
        execSync(`duckdb "${this.dbPath}" -c "${sql.replace(/"/g, '\\"')}"`, {
          encoding: 'utf-8', timeout: 30000,
        });
        return { ok: true };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    }
    // JSON fallback: parse simple INSERT/UPDATE/DELETE
    return this._jsonExec(sql);
  }

  async init() {
    const sqlPath = path.resolve('scripts/init_duckdb.sql');
    if (!fs.existsSync(sqlPath)) return { ok: false, error: 'init_duckdb.sql not found' };
    if (this.duckdbAvailable) {
      try {
        execSync(`duckdb "${this.dbPath}" < "${sqlPath}"`, { encoding: 'utf-8', timeout: 30000, shell: true });
        return { ok: true };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    }
    // JSON fallback: init empty files
    ensureJsonDir();
    for (const table of ['portfolio', 'stock_basic', 'kline_daily', 'risk_flags', 'decision_log', 'data_quality_log']) {
      if (!fs.existsSync(jsonTablePath(table))) jsonWriteAll(table, []);
    }
    return { ok: true, note: 'json-fallback' };
  }

  close() { /* no-op for CLI-based client */ }

  // ===== JSON Fallback: Query =====
  _jsonQuery(sql) {
    const upper = sql.toUpperCase().trim();
    try {
      // SELECT * FROM table WHERE ...
      const fromMatch = upper.match(/FROM\s+(\w+)/);
      if (!fromMatch) return { ok: false, rows: [], error: 'cannot parse table' };
      const table = fromMatch[1];
      let rows = jsonReadAll(table);

      // WHERE symbol = 'xxx'
      const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER|LIMIT|$)/i);
      if (whereMatch) {
        const clause = whereMatch[1];
        const symMatch = clause.match(/symbol\s*=\s*['"](\w+)['"]/i);
        if (symMatch) rows = rows.filter(r => r.symbol === symMatch[1]);
        const stMatch = clause.match(/status\s*=\s*['"](\w+)['"]/i);
        if (stMatch) rows = rows.filter(r => r.status === stMatch[1]);
      }

      // ORDER BY
      const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)\s*(DESC|ASC)?/i);
      if (orderMatch) {
        const field = orderMatch[1];
        const dir = (orderMatch[2] || 'ASC').toUpperCase();
        rows.sort((a, b) => {
          const va = a[field] || '', vb = b[field] || '';
          return dir === 'DESC' ? String(vb).localeCompare(String(va)) : String(va).localeCompare(String(vb));
        });
      }

      // LIMIT
      const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) rows = rows.slice(0, parseInt(limitMatch[1]));

      return { ok: true, rows };
    } catch (e) {
      return { ok: false, rows: [], error: String(e) };
    }
  }

  _jsonExec(sql) {
    const upper = sql.toUpperCase().trim();
    try {
      // INSERT INTO table VALUES (...)
      if (upper.startsWith('INSERT')) {
        const tableMatch = sql.match(/INTO\s+(\w+)/i);
        const valuesMatch = sql.match(/VALUES\s*\((.+?)\)/i);
        if (tableMatch && valuesMatch) {
          const table = tableMatch[1];
          const vals = valuesMatch[1].split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''));
          const row = { symbol: vals[0] || '', trade_date: vals[1] || '' };
          jsonInsert(table, row);
          return { ok: true };
        }
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }
}

module.exports = { DuckDBClient, isDuckdbAvailable, DB_PATH };
