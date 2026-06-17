-- LongHold Assistant V0.4 — DuckDB 初始化脚本
-- 6 张核心表

-- 1. portfolio — 用户持仓
CREATE TABLE IF NOT EXISTS portfolio (
  symbol TEXT PRIMARY KEY,
  name TEXT,
  cost_price DOUBLE,
  quantity DOUBLE,
  buy_reason TEXT,
  source TEXT DEFAULT 'manual',
  updated_at DATE DEFAULT CURRENT_DATE
);

-- 2. stock_basic — 股票基础信息
CREATE TABLE IF NOT EXISTS stock_basic (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  market TEXT NOT NULL,   -- A_SHARE / HK
  exchange TEXT,
  industry TEXT,
  list_date DATE,
  status TEXT DEFAULT 'NORMAL',  -- NORMAL / ST / DELISTING / SUSPENDED
  is_hk_connect BOOLEAN DEFAULT NULL,
  source TEXT,
  updated_at DATE DEFAULT CURRENT_DATE
);

-- 3. kline_daily — 日 K 线数据
CREATE TABLE IF NOT EXISTS kline_daily (
  symbol TEXT NOT NULL,
  trade_date DATE NOT NULL,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume DOUBLE,
  amount DOUBLE,
  source TEXT,
  PRIMARY KEY (symbol, trade_date)
);

-- 4. risk_flags — 风险标记
CREATE TABLE IF NOT EXISTS risk_flags (
  symbol TEXT PRIMARY KEY,
  is_st BOOLEAN DEFAULT FALSE,
  is_delisting BOOLEAN DEFAULT FALSE,
  is_suspended BOOLEAN DEFAULT FALSE,
  has_data_issue BOOLEAN DEFAULT FALSE,
  note TEXT,
  source TEXT,
  updated_at DATE DEFAULT CURRENT_DATE
);

-- 5. decision_log — 决策日志
CREATE TABLE IF NOT EXISTS decision_log (
  log_id TEXT PRIMARY KEY,
  task_id TEXT,
  skill_id TEXT,
  symbol TEXT NOT NULL,
  action TEXT NOT NULL,
  confidence DOUBLE,
  summary TEXT,
  decision_source TEXT,
  model_called BOOLEAN,
  hard_rule_override BOOLEAN,
  evidence_json TEXT,
  risks_json TEXT,
  trace_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. data_quality_log — 数据质量检查日志
CREATE TABLE IF NOT EXISTS data_quality_log (
  check_id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  check_date DATE DEFAULT CURRENT_DATE,
  status TEXT NOT NULL,       -- PASS / WARN / FAIL
  kline_count INTEGER,
  last_trade_date DATE,
  days_since_last INTEGER,
  has_zero_close BOOLEAN,
  has_dup_dates BOOLEAN,
  has_zero_volume_streak BOOLEAN,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_kl_symbol ON kline_daily (symbol);
CREATE INDEX IF NOT EXISTS idx_kl_date ON kline_daily (trade_date);
CREATE INDEX IF NOT EXISTS idx_dl_symbol ON decision_log (symbol);
CREATE INDEX IF NOT EXISTS idx_dl_task ON decision_log (task_id);
CREATE INDEX IF NOT EXISTS idx_dq_symbol ON data_quality_log (symbol);
