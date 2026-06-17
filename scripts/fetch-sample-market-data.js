#!/usr/bin/env node
/**
 * fetch-sample-market-data.js — V0.4 小样本数据采集
 *
 * 目标股票:
 *   A股: 000001.SZ, 600519.SH, 601318.SH, 000858.SZ, 600036.SH
 *   港股: 0700.HK, 9988.HK, 3690.HK
 *
 * 模式:
 *   - mock: 生成合成数据（默认，无需真实 API）
 *   - real: 通过 AKShare/fetch 拉取真实数据（需网络）
 *
 * 运行: node scripts/fetch-sample-market-data.js
 *       LONGHOLD_FETCH_MODE=real node scripts/fetch-sample-market-data.js
 */

const fs = require('fs');
const path = require('path');
const { DuckDBClient } = require('../packages/data/src/duckdb-client.cjs');
const { KlineRepository, StockBasicRepository } = require('../packages/data/src/v0.4-repositories.cjs');

const TARGET_STOCKS = [
  { symbol: '000001.SZ', name: '平安银行', market: 'A_SHARE', status: 'NORMAL' },
  { symbol: '600519.SH', name: '贵州茅台', market: 'A_SHARE', status: 'NORMAL' },
  { symbol: '601318.SH', name: '中国平安', market: 'A_SHARE', status: 'NORMAL' },
  { symbol: '000858.SZ', name: '五粮液', market: 'A_SHARE', status: 'NORMAL' },
  { symbol: '600036.SH', name: '招商银行', market: 'A_SHARE', status: 'NORMAL' },
  { symbol: '0700.HK', name: '腾讯控股', market: 'HK', status: 'NORMAL' },
  { symbol: '9988.HK', name: '阿里巴巴', market: 'HK', status: 'NORMAL' },
  { symbol: '3690.HK', name: '美团', market: 'HK', status: 'NORMAL' },
];

// ===== Mock Data Generator =====
function generateMockKlines(symbol, basePrice, days = 300) {
  const bars = [];
  let price = basePrice;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    const change = (Math.random() - 0.48) * basePrice * 0.02; // slight upward bias
    price = Math.max(price * 0.5, price + change);
    const high = price * (1 + Math.random() * 0.02);
    const low = price * (1 - Math.random() * 0.02);
    bars.push({
      symbol,
      tradeDate: d.toISOString().slice(0, 10),
      open: +price.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +price.toFixed(2),
      volume: Math.floor(Math.random() * 10000000 + 1000000),
      amount: Math.floor(price * (Math.random() * 10000000 + 1000000)),
      source: 'mock_fetcher',
    });
  }
  return bars;
}

const BASE_PRICES = {
  '000001.SZ': 12, '600519.SH': 1500, '601318.SH': 45,
  '000858.SZ': 140, '600036.SH': 35,
  '0700.HK': 380, '9988.HK': 220, '3690.HK': 150,
};

// ===== Real Fetcher (placeholder) =====
async function fetchRealKlines(symbol) {
  // TODO: 接入 AKShare / Tushare
  // const url = `https://...`;
  // const resp = await fetch(url);
  // return parseResponse(resp);
  throw new Error(`真实数据采集尚未实现: ${symbol}`);
}

// ===== Main =====
async function main() {
  const mode = process.env.LONGHOLD_FETCH_MODE || 'mock';

  console.log('\n=== LongHold Assistant V0.4 数据采集 ===');
  console.log(`模式: ${mode}`);
  console.log(`目标: ${TARGET_STOCKS.length} 只股票\n`);

  // 初始化 DuckDB
  const db = new DuckDBClient();
  console.log(`后端: ${db.getBackend()}`);
  await db.init();
  console.log('数据库已初始化\n');

  const stockRepo = new StockBasicRepository(db);
  const klineRepo = new KlineRepository(db);

  for (const stock of TARGET_STOCKS) {
    process.stdout.write(`  ${stock.symbol} ${stock.name} ... `);

    try {
      // 写入基础信息
      await stockRepo.upsert(stock);

      // 获取 K 线
      let bars;
      if (mode === 'mock') {
        const basePrice = BASE_PRICES[stock.symbol] || 50;
        bars = generateMockKlines(stock.symbol, basePrice, 300);
      } else {
        bars = await fetchRealKlines(stock.symbol);
      }

      // 写入 K 线
      if (bars.length > 0) {
        await klineRepo.batchUpsert(bars);
        const startDate = bars[0].tradeDate;
        const endDate = bars[bars.length - 1].tradeDate;
        console.log(`✅ ${bars.length} bars (${startDate} ~ ${endDate})`);
      } else {
        console.log('⚠ 无数据');
      }
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }
  }

  console.log('\n完成');
}

main().catch(console.error);
