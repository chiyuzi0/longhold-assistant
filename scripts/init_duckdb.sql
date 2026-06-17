-- LongHold Assistant — DuckDB 初始化脚本
-- 创建 V0.1-deterministic 核心表

-- 1. portfolio — 用户持仓
CREATE TABLE IF NOT EXISTS portfolio (
  symbol TEXT PRIMARY KEY,
  name TEXT,
  cost_price DOUBLE,
  quantity DOUBLE,
  buy_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. kline_daily — 日 K 线数据（供 250 日表现计算）
CREATE TABLE IF NOT EXISTS kline_daily (
  symbol TEXT NOT NULL,
  trade_date DATE NOT NULL,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume DOUBLE,
  amount DOUBLE,
  PRIMARY KEY (symbol, trade_date)
);

-- 3. risk_flags — 股票风险标记（供风险筛查）
CREATE TABLE IF NOT EXISTS risk_flags (
  symbol TEXT PRIMARY KEY,
  is_st BOOLEAN DEFAULT FALSE,
  is_delisting BOOLEAN DEFAULT FALSE,
  is_suspended BOOLEAN DEFAULT FALSE,
  has_data_issue BOOLEAN DEFAULT FALSE,
  note TEXT,
  updated_at DATE
);

-- 4. decision_log — 决策日志
CREATE TABLE IF NOT EXISTS decision_log (
  log_id TEXT PRIMARY KEY,
  task_id TEXT,
  skill_id TEXT,
  symbol TEXT,
  action TEXT NOT NULL,
  confidence DOUBLE,
  summary TEXT,
  evidence_json TEXT,
  risks_json TEXT,
  trace_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_kline_daily_symbol ON kline_daily (symbol);
CREATE INDEX IF NOT EXISTS idx_kline_daily_date ON kline_daily (trade_date);
CREATE INDEX IF NOT EXISTS idx_decision_log_symbol ON decision_log (symbol);
CREATE INDEX IF NOT EXISTS idx_decision_log_task ON decision_log (task_id);
