// Mock data for financial charts - matching Yahoo Finance style

export interface CandlestickDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceDataPoint {
  date: string;
  price: number;
  volume: number;
}

export interface HeatmapDataPoint {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
}

export interface SentimentDataPoint {
  date: string;
  sentiment: number;
  social_volume: number;
  news_sentiment: number;
}

// Bitcoin price data (last 30 days)
export const bitcoinCandlestickData: CandlestickDataPoint[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  
  const basePrice = 97235 + Math.sin(i * 0.3) * 2000 + (Math.random() - 0.5) * 1000;
  const volatility = 500 + Math.random() * 300;
  
  return {
    date: date.toISOString().split('T')[0],
    open: basePrice,
    high: basePrice + volatility * Math.random(),
    low: basePrice - volatility * Math.random(),
    close: basePrice + (Math.random() - 0.5) * volatility * 0.5,
    volume: 25000000000 + Math.random() * 10000000000
  };
});

// Market heatmap data
export const marketHeatmapData: HeatmapDataPoint[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 97235.18, change: 1936, changePercent: 2.03, marketCap: 1934000000000 },
  { symbol: 'ETH', name: 'Ethereum', price: 3542.85, change: -127.42, changePercent: -3.47, marketCap: 426000000000 },
  { symbol: 'BNB', name: 'BNB', price: 701.23, change: 15.84, changePercent: 2.31, marketCap: 101000000000 },
  { symbol: 'SOL', name: 'Solana', price: 189.45, change: -8.32, changePercent: -4.20, marketCap: 89000000000 },
  { symbol: 'XRP', name: 'XRP', price: 2.18, change: 0.07, changePercent: 3.32, marketCap: 124000000000 },
  { symbol: 'DOGE', name: 'Dogecoin', price: 0.31, change: -0.018, changePercent: -5.48, marketCap: 45000000000 },
  { symbol: 'ADA', name: 'Cardano', price: 0.89, change: 0.043, changePercent: 5.07, marketCap: 31000000000 },
  { symbol: 'AVAX', name: 'Avalanche', price: 41.23, change: -1.87, changePercent: -4.34, marketCap: 17000000000 },
  { symbol: 'LINK', name: 'Chainlink', price: 22.67, change: 1.24, changePercent: 5.79, marketCap: 14000000000 },
  { symbol: 'DOT', name: 'Polkadot', price: 7.42, change: -0.31, changePercent: -4.01, marketCap: 11000000000 },
];

// Social sentiment data
export const socialSentimentData: SentimentDataPoint[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  
  return {
    date: date.toISOString().split('T')[0],
    sentiment: 60 + Math.sin(i * 0.2) * 20 + (Math.random() - 0.5) * 10,
    social_volume: 8000 + Math.random() * 4000,
    news_sentiment: 55 + Math.sin(i * 0.25) * 15 + (Math.random() - 0.5) * 8
  };
});

// Fear & Greed Index data
export const fearGreedData = {
  current: 73,
  classification: 'Greed' as 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed',
  previous: {
    yesterday: 71,
    lastWeek: 69,
    lastMonth: 65
  }
};

// Technical indicators
export const technicalIndicators = {
  rsi: 67.4,
  macd: {
    macd: 1234.56,
    signal: 1156.78,
    histogram: 77.78
  },
  bollinger: {
    upper: 99500,
    middle: 97235,
    lower: 94970
  },
  movingAverages: {
    sma20: 96800,
    sma50: 94500,
    ema20: 97100,
    ema50: 95200
  }
};

// Volume profile data - Bitcoin price data for charts
export const volumeData: PriceDataPoint[] = generateBitcoinPriceData();

// Generate realistic Bitcoin price data for all timeframes
function generateBitcoinPriceData(): PriceDataPoint[] {
  const data: PriceDataPoint[] = [];
  const now = new Date();
  
  // Define Bitcoin's major historical price points and cycles
  const historicalCycles = [
    { year: 2015, price: 250, volatility: 0.05 },
    { year: 2016, price: 600, volatility: 0.04 },
    { year: 2017, price: 19000, volatility: 0.08 }, // First major bull run
    { year: 2018, price: 3500, volatility: 0.06 }, // Bear market
    { year: 2019, price: 7200, volatility: 0.05 },
    { year: 2020, price: 10000, volatility: 0.06 },
    { year: 2021, price: 65000, volatility: 0.07 }, // Second major bull run
    { year: 2022, price: 20000, volatility: 0.06 }, // Bear market
    { year: 2023, price: 45000, volatility: 0.05 },
    { year: 2024, price: 97000, volatility: 0.04 } // Current era
  ];
  
  // Generate data for the last 10 years
  for (let days = 3650; days >= 0; days--) {
    const date = new Date(now);
    date.setDate(date.getDate() - days);
    const currentYear = date.getFullYear() + (date.getMonth() / 12);
    
    // Find the appropriate cycle for interpolation
    let basePrice = 250; // Starting price
    let volatility = 0.05;
    
    for (let i = 0; i < historicalCycles.length - 1; i++) {
      const current = historicalCycles[i];
      const next = historicalCycles[i + 1];
      
      if (currentYear >= current.year && currentYear < next.year) {
        const progress = (currentYear - current.year) / (next.year - current.year);
        // Smooth interpolation between price points
        basePrice = current.price + (next.price - current.price) * easeInOutCubic(progress);
        volatility = current.volatility + (next.volatility - current.volatility) * progress;
        break;
      } else if (currentYear >= historicalCycles[historicalCycles.length - 1].year) {
        basePrice = historicalCycles[historicalCycles.length - 1].price;
        volatility = historicalCycles[historicalCycles.length - 1].volatility;
      }
    }
    
    // Add realistic market movements
    const dayOfYear = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    const weeklyTrend = Math.sin(dayOfYear * 0.02) * 0.1; // Weekly cycles
    const monthlyTrend = Math.sin(dayOfYear * 0.006) * 0.15; // Monthly cycles
    const randomWalk = (Math.random() - 0.5) * volatility;
    
    const finalPrice = basePrice * (1 + weeklyTrend + monthlyTrend + randomWalk);
    
    data.push({
      date: date.toISOString(),
      price: Math.max(50, finalPrice),
      volume: 20000000000 + Math.random() * 15000000000
    });
  }
  
  return data;
}

// Smooth easing function for realistic price transitions
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Chart timeframes (deprecated - use useTimeframeData hook instead)
export const timeframes = [
  { label: '1T', value: '1T', active: true },
  { label: '1W', value: '1W', active: false },
  { label: '1M', value: '1M', active: false },
  { label: '3M', value: '3M', active: false },
  { label: '6M', value: '6M', active: false },
  { label: '1Y', value: '1Y', active: false },
  { label: '2Y', value: '2Y', active: false },
  { label: '5Y', value: '5Y', active: false },
  { label: '10Y', value: '10Y', active: false },
  { label: 'ALLE', value: 'ALL', active: false }
];