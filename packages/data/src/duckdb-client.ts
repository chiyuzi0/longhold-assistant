// DuckDB Client — 真实 DuckDB 连接（需要 duckdb CLI 或 @duckdb/node-api）
// 当前环境不可用，作为接口保留。V0.1 使用 FileBasedRepository 替代。

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DUCKDB_PATH = resolve('data/duckdb/longhold.duckdb');

export interface DuckDBQueryResult {
  ok: boolean;
  rows: Record<string, unknown>[];
  error?: string;
}

/**
 * DuckDBClient — 通过 duckdb CLI 或 API 执行查询。
 *
 * 当前环境未安装 duckdb，调用时返回错误。
 * 安装后可以用 DUCKDB_AVAILABLE 切换。
 */
export const DUCKDB_AVAILABLE = existsSync(DUCKDB_PATH) && (() => {
  try {
    execSync('duckdb --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

export class DuckDBClient {
  private dbPath: string;

  constructor(dbPath: string = DUCKDB_PATH) {
    this.dbPath = dbPath;
  }

  /**
   * 执行 SQL 查询（只读）。
   */
  async query(sql: string): Promise<DuckDBQueryResult> {
    if (!DUCKDB_AVAILABLE) {
      return { ok: false, rows: [], error: 'DuckDB 不可用。请安装 duckdb CLI 或使用 FileBasedRepository。' };
    }
    try {
      const out = execSync(`duckdb "${this.dbPath}" -json -c "${sql.replace(/"/g, '\\"')}"`, {
        encoding: 'utf-8',
        timeout: 30000,
      });
      return { ok: true, rows: JSON.parse(out) as Record<string, unknown>[] };
    } catch (e) {
      return { ok: false, rows: [], error: String(e) };
    }
  }

  /**
   * 执行 SQL（写入）。
   */
  async exec(sql: string): Promise<{ ok: boolean; error?: string }> {
    if (!DUCKDB_AVAILABLE) {
      return { ok: false, error: 'DuckDB 不可用。' };
    }
    try {
      execSync(`duckdb "${this.dbPath}" -c "${sql.replace(/"/g, '\\"')}"`, {
        encoding: 'utf-8',
        timeout: 30000,
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  /**
   * 初始化数据库：运行建表 SQL。
   */
  async init(): Promise<{ ok: boolean; error?: string }> {
    // 通过 CLI 执行 init_duckdb.sql
    const sqlPath = resolve('scripts/init_duckdb.sql');
    if (!existsSync(sqlPath)) {
      return { ok: false, error: `建表脚本未找到: ${sqlPath}` };
    }
    try {
      execSync(`duckdb "${this.dbPath}" < "${sqlPath}"`, {
        encoding: 'utf-8',
        timeout: 30000,
        shell: true,
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }
}
