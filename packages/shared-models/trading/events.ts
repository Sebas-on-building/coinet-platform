// Atomic event types for Trading Context

export interface StrategyCreated {
  type: 'StrategyCreated';
  strategyId: string;
  userId: string;
  parameters: any;
  timestamp: string;
}

export interface TradeExecuted {
  type: 'TradeExecuted';
  tradeId: string;
  strategyId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: string;
}

export interface BacktestCompleted {
  type: 'BacktestCompleted';
  strategyId: string;
  results: any;
  timestamp: string;
}

export interface TradingSimulationStarted {
  type: 'TradingSimulationStarted';
  simulationId: string;
  strategyId: string;
  timestamp: string;
}

export interface TradingSimulationEnded {
  type: 'TradingSimulationEnded';
  simulationId: string;
  strategyId: string;
  results: any;
  timestamp: string;
} 