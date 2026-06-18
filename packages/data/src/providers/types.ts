// types.ts — V1.1 MarketDataProvider interface + data types
// Strict typed, all providers MUST implement this interface.

export interface KlineBar {
  symbol: string
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Quote {
  symbol: string
  price: number
  changePct: number
  timestamp: number
  source: 'live' | 'mock' | 'cache'
}

export interface Fundamental {
  symbol: string
  pe?: number
  pb?: number
  roe?: number
  eps?: number
  marketCap?: number
  revenue?: number
  profit?: number
  source: 'live' | 'mock' | 'cache'
}

export interface MarketDataProvider {
  getKline(symbol: string, range: number): Promise<KlineBar[]>
  getQuote(symbol: string): Promise<Quote>
  getFundamentals(symbol: string): Promise<Fundamental>
  isLive(): boolean
  getProviderName(): string
}
