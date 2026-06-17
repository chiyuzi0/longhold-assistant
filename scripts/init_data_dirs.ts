import { mkdirSync } from 'node:fs';

const dirs = [
  'data/raw',
  'data/parquet',
  'data/processed',
  'data/reports',
  'data/memory',
];

for (const dir of dirs) {
  mkdirSync(dir, { recursive: true });
  console.log(`ensured ${dir}`);
}
