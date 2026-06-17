// File-Based Repository — 通过 CSV / JSON 文件模拟 DuckDB 数据层
// V0.1 使用，后续可替换为真实 DuckDB 连接

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ===== Interfaces =====

export interface PortfolioRow {
  symbol: string;
  name: string;
  costPrice: number;
  quantity: number;
  buyReason?: string;
}

export interface KlineRow {
  symbol: string;
  tradeDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  amount?: number;
}

export interface RiskFlagRow {
  symbol: string;
  isST: boolean;
  isDelisting: boolean;
  isSuspended: boolean;
  hasDataIssue: boolean;
  note?: string;
  updatedAt?: string;
}

export interface DecisionLogRow {
  logId: string;
  taskId: string;
  skillId: string;
  symbol: string;
  action: string;
  confidence: number;
  summary: string;
  evidenceJson: string;
  risksJson: string;
  traceId?: string;
  createdAt: string;
}

// ===== CSV Parser =====

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
}

// ===== Portfolio Repository =====

export class PortfolioRepository {
  private path: string;

  constructor(csvPath?: string) {
    this.path = csvPath ?? resolve('data/samples/portfolio.sample.csv');
  }

  getAll(): PortfolioRow[] {
    if (!existsSync(this.path)) return [];
    const text = readFileSync(this.path, 'utf-8');
    return parseCSV(text).map((r) => ({
      symbol: r.symbol,
      name: r.name,
      costPrice: Number(r.cost_price) || 0,
      quantity: Number(r.quantity) || 0,
      buyReason: r.buy_reason || undefined,
    }));
  }

  getBySymbol(symbol: string): PortfolioRow | null {
    return this.getAll().find((r) => r.symbol === symbol) ?? null;
  }

  getSymbols(): string[] {
    return this.getAll().map((r) => r.symbol);
  }
}

// ===== Kline Repository =====

export class KlineRepository {
  private path: string;

  constructor(csvPath?: string) {
    this.path = csvPath ?? resolve('data/samples/kline_250d.sample.csv');
  }

  getBySymbol(symbol: string): KlineRow[] {
    return this.getAll().filter((r) => r.symbol === symbol);
  }

  getBySymbols(symbols: string[]): Map<string, KlineRow[]> {
    const all = this.getAll();
    const map = new Map<string, KlineRow[]>();
    for (const s of symbols) {
      map.set(s, all.filter((r) => r.symbol === s));
    }
    return map;
  }

  private getAll(): KlineRow[] {
    if (!existsSync(this.path)) return [];
    const text = readFileSync(this.path, 'utf-8');
    return parseCSV(text)
      .filter((r) => r.close && !isNaN(Number(r.close)))
      .map((r) => ({
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

// ===== Risk Flag Repository (derived from stock status) =====

export class RiskFlagRepository {
  /**
   * 从股票基础信息中提取风险标记。
   * V0.1 用简单规则：symbol 含 "ST" 后缀或 profile 中 status 为 ST/DELISTING。
   */
  getBySymbol(symbol: string, status?: string): RiskFlagRow {
    const isST = status === 'ST' || status === 'DELISTING' || symbol.includes('.ST');
    const isDelisting = status === 'DELISTING';
    const isSuspended = status === 'SUSPENDED';
    return {
      symbol,
      isST,
      isDelisting,
      isSuspended,
      hasDataIssue: false,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
  }

  /**
   * 批量从 profiles 获取风险标记。
   */
  getBySymbols(
    symbols: string[],
    profileMap: Map<string, string>, // symbol → status
  ): Map<string, RiskFlagRow> {
    const map = new Map<string, RiskFlagRow>();
    for (const s of symbols) {
      map.set(s, this.getBySymbol(s, profileMap.get(s)));
    }
    return map;
  }
}

// ===== Decision Log Repository (JSON file) =====

export class DecisionLogRepository {
  private dir: string;

  constructor(dir?: string) {
    this.dir = dir ?? resolve('memory/decision-log');
    mkdirSync(this.dir, { recursive: true });
  }

  write(log: DecisionLogRow): void {
    const filePath = resolve(this.dir, `${log.logId}.json`);
    writeFileSync(filePath, JSON.stringify(log, null, 2), 'utf-8');
  }

  writeBatch(logs: DecisionLogRow[]): void {
    for (const log of logs) {
      this.write(log);
    }
  }

  getAll(): DecisionLogRow[] {
    const { readdirSync } = require('node:fs') as typeof import('node:fs');
    if (!existsSync(this.dir)) return [];
    const files = readdirSync(this.dir).filter((f: string) => f.endsWith('.json'));
    return files.map((f: string) =>
      JSON.parse(readFileSync(resolve(this.dir, f), 'utf-8')) as DecisionLogRow,
    );
  }

  getByTaskId(taskId: string): DecisionLogRow[] {
    return this.getAll().filter((r) => r.taskId === taskId);
  }
}
