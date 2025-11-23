export interface StrategyConfig {
  id: string;
  name: string;
  description: string;
  symbol: string;
  timeframe: string;
  parameters: Record<string, number | string | boolean>;
  enabled: boolean;
}

export interface TradingSignal {
  id: string;
  timestamp: number;
  symbol: string;
  type: "buy" | "sell";
  price: number;
  confidence: number;
  strategy: string;
  position_size: number;
  risk_level: "low" | "medium" | "high";
  metadata?: Record<string, any>;
}

export interface StrategyParameter {
  name: string;
  type: "number" | "string" | "boolean";
  description: string;
  default: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export type OrderType = "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
export type OrderSide = "BUY" | "SELL";
export type TimeInForce = "GTC" | "IOC" | "FOK";
export type OrderStatus =
  | "NEW"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "CANCELED"
  | "REJECTED"
  | "EXPIRED";

export interface OrderFlags {
  postOnly: boolean;
  reduceOnly: boolean;
}

export interface OrderBook {
  bids: [number, number][]; // [price, quantity][]
  asks: [number, number][]; // [price, quantity][]
  timestamp: number;
}

export interface MarketDepth {
  price: number;
  quantity: number;
  total: number;
  side: OrderSide;
  bidPrice: number;
  bidQuantity: number;
  askPrice: number;
  askQuantity: number;
  spread: number;
  spreadPercent: number;
}

export interface Order {
  id: string;
  symbol: string;
  type: OrderType;
  side: OrderSide;
  price: number;
  stopPrice?: number;
  quantity: number;
  timeInForce: TimeInForce;
  status: OrderStatus;
  flags: OrderFlags;
  timestamp: number;
  filledQuantity: number;
  averagePrice: number;
  remainingQuantity: number;
  fee: number;
  feeAsset: string;
}

export interface ExecutionReport {
  orderId: string;
  tradeId: string;
  symbol: string;
  side: OrderSide;
  price: number;
  quantity: number;
  fee: number;
  feeAsset: string;
  timestamp: number;
}

export interface TradingMetrics {
  totalTrades: number;
  winRate: number;
  profitLoss: number;
  averageReturnPerTrade: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface SlippageInfo {
  expectedPrice: number;
  actualPrice: number;
  slippagePercent: number;
  impact: "HIGH" | "MEDIUM" | "LOW";
}

export interface SmartOrderParams {
  maxSlippage: number;
  splitOrders: boolean;
  maxSplits: number;
  timeWindow: number;
}
