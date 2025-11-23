export interface TradingViewChartConfig {
  symbol: string;
  interval: '1' | '5' | '15' | '30' | '60' | '240' | 'D' | 'W' | 'M';
  height?: number;
  theme?: 'light' | 'dark';
}

export interface CandlestickDataPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface VolumeDataPoint {
  time: number;
  value: number;
  color: string;
}

export interface TradingViewData {
  candlesticks: CandlestickDataPoint[];
  volumes: VolumeDataPoint[];
}
