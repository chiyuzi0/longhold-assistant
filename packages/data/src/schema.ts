export const createTablesSql = `
CREATE TABLE IF NOT EXISTS stock_profile (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  market TEXT NOT NULL,
  exchange TEXT,
  industry TEXT,
  list_date DATE,
  status TEXT
);

CREATE TABLE IF NOT EXISTS daily_bar (
  symbol TEXT NOT NULL,
  trade_date DATE NOT NULL,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume DOUBLE,
  amount DOUBLE,
  PRIMARY KEY(symbol, trade_date)
);

CREATE TABLE IF NOT EXISTS factor_snapshot (
  symbol TEXT NOT NULL,
  as_of_date DATE NOT NULL,
  quality_score DOUBLE,
  growth_score DOUBLE,
  valuation_score DOUBLE,
  stability_score DOUBLE,
  shareholder_return_score DOUBLE,
  momentum_score DOUBLE,
  total_score DOUBLE,
  PRIMARY KEY(symbol, as_of_date)
);
`;
