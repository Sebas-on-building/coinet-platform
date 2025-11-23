/**
 * TypeScript definitions for technical indicator inputs and outputs
 */

/**
 * Represents a price candle (OHLCV)
 */
export interface Candle {
  time: string | number; // ISO string or timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/**
 * An array of numerical values, typically closing prices
 */
export type Series = number[];

/**
 * Result of an indicator calculation can be either:
 * - A simple array of values (e.g., SMA)
 * - An object containing multiple arrays (e.g., MACD with multiple lines)
 */
export type IndicatorResult = (number | null)[] | { [key: string]: (number | null)[] };

/**
 * Interface for an indicator calculation function
 */
export interface IndicatorFunction {
  name: string;
  calculate: (series: Series, options?: any) => IndicatorResult;
  defaultOptions: Record<string, any>;
  description: string;
  category: 'trend' | 'momentum' | 'volatility' | 'volume' | 'other';
  overlayOnPrice?: boolean; // Whether indicator is typically shown on price chart
  references?: { name: string; url: string }[]; // Optional learning resources
}

/**
 * Common visual properties for an indicator
 */
export interface IndicatorVisual {
  color: string;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  opacity?: number;
  area?: boolean; // Whether to fill area under the line
  type?: 'line' | 'column' | 'area' | 'scatter'; // Chart type
}

/**
 * Complete indicator configuration as used in the UI
 */
export interface IndicatorConfig {
  id: string; // Unique ID for this instance
  name: string; // The indicator name (e.g., "SMA")
  isActive: boolean;
  options: Record<string, any>; // Indicator-specific options (periods, etc.)
  visuals: Record<string, IndicatorVisual>; // Visual settings for each output series
  position: 'main' | 'below' | 'separate'; // Where to render (on price chart, below, etc.)
}

/**
 * Complete chart configuration for persistence
 */
export interface ChartConfig {
  id?: string;
  userId?: string;
  symbol: string;
  timeframe: string;
  chartType: 'candlestick' | 'line' | 'area' | 'bar' | 'heikinashi';
  indicators: IndicatorConfig[];
  theme?: 'light' | 'dark' | 'system';
  zoom?: { from: string | number; to?: string | number }; // Currently visible range
  scales?: { y: { type: 'linear' | 'log'; min?: number; max?: number } };
  showVolume?: boolean;
  showGrid?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  name?: string; // For template naming
  isDefault?: boolean;
} 