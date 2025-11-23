// Atomic CQRS command types for Trading Context

export interface CreateStrategy {
  type: 'CreateStrategy';
  userId: string;
  parameters: any;
}

export interface ExecuteTrade {
  type: 'ExecuteTrade';
  strategyId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
}

export interface CompleteBacktest {
  type: 'CompleteBacktest';
  strategyId: string;
  results: any;
}

export interface StartTradingSimulation {
  type: 'StartTradingSimulation';
  strategyId: string;
}

export interface EndTradingSimulation {
  type: 'EndTradingSimulation';
  strategyId: string;
  results: any;
} 