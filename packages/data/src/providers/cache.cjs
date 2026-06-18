// cache.cjs — V1.1 Staleness-aware cache
// 4 staleness levels: fresh → stale_ok → stale_warn → stale_fail

const CACHE_TTL = {
  KLINE: 86_400_000,         // 24h
  QUOTE: 10_000,             // 10s
  FUNDAMENTAL: 86_400_000,   // 24h
};

class CacheEntry {
  constructor(data, source) {
    this.data = data;
    this.source = source;          // 'live' | 'mock'
    this.fetchedAt = Date.now();
    this.lastAccessedAt = Date.now();
    this.accessCount = 0;
  }

  _age() {
    return Date.now() - this.fetchedAt;
  }
}

class DataCache {
  constructor() {
    this._store = new Map();
  }

  _key(prefix, symbol) {
    return `${prefix}:${symbol}`;
  }

  stalenessLevel(entry, ttlMs) {
    const age = entry._age();
    if (age < ttlMs) return 'fresh';
    if (age < ttlMs * 2) return 'stale_ok';
    if (age < ttlMs * 5) return 'stale_warn';
    return 'stale_fail';
  }

  get(prefix, symbol, ttlMs) {
    const key = this._key(prefix, symbol);
    const entry = this._store.get(key);
    if (!entry) return null;

    entry.lastAccessedAt = Date.now();
    entry.accessCount++;
    const level = this.stalenessLevel(entry, ttlMs);

    if (level === 'stale_fail') {
      this._store.delete(key);
      return { hit: false, reason: 'stale_fail', level };
    }

    return { hit: true, data: entry.data, source: entry.source, level };
  }

  set(prefix, symbol, data, source) {
    const key = this._key(prefix, symbol);
    this._store.set(key, new CacheEntry(data, source));
  }

  clear() {
    this._store.clear();
  }

  stats() {
    return { size: this._store.size };
  }
}

module.exports = { DataCache, CACHE_TTL };
