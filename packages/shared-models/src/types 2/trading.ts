export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  totalValue: number;
  totalCost: number;
  pnl: number;
  pnlPercent: number;
  holdings: Holding[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Holding {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  value: number;
  cost: number;
  pnl: number;
  pnlPercent: number;
  allocation: number;
}

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  type: 'dca' | 'momentum' | 'mean_reversion' | 'arbitrage';
  parameters: Record<string, unknown>;
  isActive: boolean;
  performance: StrategyPerformance;
}

export interface StrategyPerformance {
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
} 