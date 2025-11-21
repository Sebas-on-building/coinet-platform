/**
 * Strategy Types
 * 
 * Type definitions for the strategy system, including price data,
 * signals, and strategy interfaces.
 */

/**
 * OHLCV price data structure
 */
export interface OHLCV {
  time: number[];  // Timestamps
  open: number[];  // Open prices
  high: number[];  // High prices
  low: number[];   // Low prices
  close: number[]; // Close prices
  volume: number[]; // Volume data
}

/**
 * Signal types
 */
export type SignalType = 'buy' | 'sell' | 'stopLoss' | 'takeProfit' | 'info';

/**
 * Alert levels
 */
export type AlertLevel = 'info' | 'warning' | 'error';

/**
 * Trading signal interface
 */
export interface Signal {
  type: SignalType;
  price: number;
  time: number;
  size?: number;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Alert notification
 */
export interface Alert {
  message: string;
  level: AlertLevel;
  time: number;
  metadata?: Record<string, any>;
}

/**
 * Strategy context passed to update method
 */
export interface StrategyContext {
  ohlcv: OHLCV;
  time: number;
  currentPosition?: number;
  onSignal: (signal: Signal) => void;
  onAlert: (alert: Alert) => void;
}

/**
 * Strategy interface
 */
export interface Strategy {
  update(context: StrategyContext): void;
  reset(): void;
  getSignals(): Signal[];
}

/**
 * Strategy parameter
 */
export interface StrategyParameter {
  id: string;
  name: string;
  type: 'number' | 'boolean' | 'string' | 'select' | 'range';
  value: any;
  defaultValue: any;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string, value: any }>;
  description?: string;
} 