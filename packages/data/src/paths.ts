export interface DataPaths {
  duckdbPath: string;
  rawDir: string;
  parquetDir: string;
  reportDir: string;
}

export const defaultDataPaths: DataPaths = {
  duckdbPath: 'data/longhold.duckdb',
  rawDir: 'data/raw',
  parquetDir: 'data/parquet',
  reportDir: 'data/reports',
};
