// Market tick type definition

export interface MarketTick {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  change?: number;
  changePercent?: number;
}
