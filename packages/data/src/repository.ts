import type { DailyBar, StockProfile } from '@longhold/core';

export interface StockRepository {
  getStockProfile(symbol: string): Promise<StockProfile | null>;
  listStockProfiles(): Promise<StockProfile[]>;
  getDailyBars(symbol: string, from?: string, to?: string): Promise<DailyBar[]>;
}

export class InMemoryStockRepository implements StockRepository {
  constructor(
    private readonly profiles: StockProfile[] = [],
    private readonly bars: DailyBar[] = [],
  ) {}

  async getStockProfile(symbol: string): Promise<StockProfile | null> {
    return this.profiles.find((item) => item.symbol === symbol) ?? null;
  }

  async listStockProfiles(): Promise<StockProfile[]> {
    return this.profiles;
  }

  async getDailyBars(symbol: string): Promise<DailyBar[]> {
    return this.bars.filter((item) => item.symbol === symbol);
  }
}
