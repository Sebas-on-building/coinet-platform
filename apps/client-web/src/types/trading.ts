// ====== PROFESSIONAL TRADING DATA STRUCTURES ======

export interface TradingDataPoint {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  volumeWeightedPrice?: number;
  change?: number;
  changePercent?: number;
}

export interface CandlestickData extends TradingDataPoint {
  bodyColor: 'bullish' | 'bearish';
  wickColor: 'bullish' | 'bearish';
}

export interface VolumeData {
  timestamp: number;
  date: string;
  volume: number;
  volumeColor: 'bullish' | 'bearish' | 'neutral';
  avgVolume?: number;
}

export interface TechnicalIndicator {
  timestamp: number;
  date: string;
  value: number;
  signal?: 'buy' | 'sell' | 'hold';
  strength?: number;
}

export interface RSIData extends TechnicalIndicator {
  overbought: boolean;
  oversold: boolean;
  divergence?: 'bullish' | 'bearish';
}

export interface MACDData {
  timestamp: number;
  date: string;
  macd: number;
  signal: number;
  histogram: number;
  crossover?: 'bullish' | 'bearish';
}

export interface MovingAverageData {
  timestamp: number;
  date: string;
  sma20: number;
  sma50: number;
  sma200: number;
  ema20: number;
  ema50: number;
  goldenCross?: boolean;
  deathCross?: boolean;
}

export interface BollingerBandsData {
  timestamp: number;
  date: string;
  upper: number;
  middle: number;
  lower: number;
  width: number;
  position: 'above' | 'below' | 'inside';
  squeeze?: boolean;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}

export interface OrderBookData {
  timestamp: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPercent: number;
}

export interface MarketDepthData {
  timestamp: number;
  date: string;
  bidLiquidity: number;
  askLiquidity: number;
  imbalance: number;
  totalLiquidity: number;
}

export interface TradingSessionData {
  timestamp: number;
  date: string;
  session: 'asia' | 'london' | 'newyork' | 'overlap';
  volatility: number;
  averageSpread: number;
  participationRate: number;
}

export interface SupportResistanceLevel {
  price: number;
  strength: 'weak' | 'moderate' | 'strong';
  type: 'support' | 'resistance';
  touches: number;
  lastTouch: number;
  confidence: number;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  type: 'price_above' | 'price_below' | 'volume_spike' | 'volatility_spike';
  condition: number;
  triggered: boolean;
  triggeredAt?: number;
  isActive: boolean;
}

export interface TradeSignal {
  id: string;
  timestamp: number;
  symbol: string;
  type: 'entry' | 'exit' | 'stop_loss' | 'take_profit';
  side: 'buy' | 'sell';
  price: number;
  confidence: number;
  indicators: string[];
  reason: string;
}

export interface MarketMicrostructure {
  timestamp: number;
  tickSize: number;
  averageTickSize: number;
  bidAskSpread: number;
  relativeSpread: number;
  effectiveSpread: number;
  priceImpact: number;
  volatility: number;
}

export interface TimeAndSales {
  timestamp: number;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  aggressive: boolean;
  venue?: string;
}

// Chart configuration types
export interface ChartTheme {
  name: string;
  background: string;
  foreground: string;
  grid: string;
  candlestick: {
    bullish: string;
    bearish: string;
    wick: string;
  };
  volume: {
    bullish: string;
    bearish: string;
    neutral: string;
  };
  indicators: {
    sma: string;
    ema: string;
    rsi: string;
    macd: string;
    bollingerBands: string;
  };
  alerts: {
    support: string;
    resistance: string;
    entry: string;
    exit: string;
  };
}

export interface ChartSettings {
  timeframe: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';
  chartType: 'candlestick' | 'line' | 'area' | 'heikin_ashi' | 'renko';
  showVolume: boolean;
  showGrid: boolean;
  showCrosshair: boolean;
  showOrderBook: boolean;
  theme: ChartTheme;
  indicators: {
    movingAverages: boolean;
    rsi: boolean;
    macd: boolean;
    bollingerBands: boolean;
    volume: boolean;
    supportResistance: boolean;
  };
  alerts: PriceAlert[];
  autoScale: boolean;
  logScale: boolean;
}