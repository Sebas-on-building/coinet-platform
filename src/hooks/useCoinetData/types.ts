// Unified types for Coinet Data Layer

export type DataType =
  | "price"
  | "ohlc"
  | "volume"
  | "sentiment"
  | "news"
  | "ai"
  | "portfolio"
  | "analytics"
  | "custom";

export type DataState =
  | "loading"
  | "live"
  | "stale"
  | "error"
  | "empty"
  | "reconnecting";

export type DataSource =
  | "websocket"
  | "rest"
  | "ai"
  | "cache"
  | "mock"
  | "custom";

export interface DataResult<T = any> {
  state: DataState;
  data: T | null;
  error?: Error;
  lastUpdated?: Date;
  source: DataSource;
  isLive: boolean;
  meta?: Record<string, any>;
}

export interface UseCoinetDataParams {
  type: DataType;
  asset?: string;
  timeframe?: string;
  ai?: boolean;
  sentiment?: boolean;
  realtime?: boolean;
  config?: Record<string, any>;
  onUpdate?: (data: any) => void;
  [key: string]: any;
} 