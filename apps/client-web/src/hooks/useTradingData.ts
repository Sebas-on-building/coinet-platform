import { useMemo } from 'react';
import { TradingDataPoint } from '@/types/trading';

// Generate professional trading data with realistic patterns
export function generateTradingData(basePrice = 97000, days = 365): TradingDataPoint[] {
  const data: TradingDataPoint[] = [];
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  
  let currentPrice = basePrice;
  let trend = 1; // 1 for uptrend, -1 for downtrend
  let trendStrength = 0.5;
  let volatility = 0.02;
  
  for (let i = 0; i < days; i++) {
    const timestamp = now - (days - i - 1) * msPerDay;
    const date = new Date(timestamp).toISOString().split('T')[0];
    
    // Simulate market cycles and trends
    if (Math.random() < 0.05) { // 5% chance to change trend
      trend *= -1;
      trendStrength = 0.3 + Math.random() * 0.4;
    }
    
    // Calculate daily movement
    const dailyTrend = trend * trendStrength * (Math.random() * 0.02);
    const randomWalk = (Math.random() - 0.5) * volatility;
    const priceChange = dailyTrend + randomWalk;
    
    // Generate OHLC data
    const open = currentPrice;
    const changeRange = Math.abs(priceChange) * currentPrice;
    const high = open + changeRange * (0.5 + Math.random() * 0.5);
    const low = open - changeRange * (0.5 + Math.random() * 0.5);
    const close = open + (priceChange * currentPrice);
    
    // Ensure logical OHLC relationships
    const finalHigh = Math.max(open, close, high);
    const finalLow = Math.min(open, close, low);
    
    // Generate volume (higher during volatile periods)
    const baseVolume = 25000000; // Base volume in USD
    const volatilityMultiplier = 1 + Math.abs(priceChange) * 10;
    const volume = baseVolume * (0.5 + Math.random()) * volatilityMultiplier;
    
    data.push({
      timestamp,
      date,
      open,
      high: finalHigh,
      low: finalLow,
      close,
      volume: Math.round(volume),
      change: close - open,
      changePercent: ((close - open) / open) * 100
    });
    
    currentPrice = close;
    
    // Adjust volatility based on market conditions
    volatility = Math.max(0.005, Math.min(0.05, volatility + (Math.random() - 0.5) * 0.002));
  }
  
  return data;
}

// Hook for trading data with realistic patterns
export function useTradingData(symbol: string = 'BTC-USD', days: number = 365) {
  const data = useMemo(() => {
    const basePrice = symbol.includes('BTC') ? 97000 : 
                     symbol.includes('ETH') ? 3500 : 
                     symbol.includes('SOL') ? 180 : 50;
    
    return generateTradingData(basePrice, days);
  }, [symbol, days]);

  const currentPrice = data[data.length - 1];
  const previousPrice = data[data.length - 2];
  
  const stats = useMemo(() => {
    const prices = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    
    const high24h = Math.max(...prices.slice(-1));
    const low24h = Math.min(...prices.slice(-1));
    const volume24h = volumes.slice(-1)[0];
    const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
    
    // Calculate volatility (standard deviation of returns)
    const returns = data.slice(1).map((d, i) => 
      Math.log(d.close / data[i].close)
    );
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const volatility = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    ) * Math.sqrt(252); // Annualized
    
    return {
      currentPrice: currentPrice?.close || 0,
      change24h: currentPrice && previousPrice ? currentPrice.close - previousPrice.close : 0,
      changePercent24h: currentPrice && previousPrice ? 
        ((currentPrice.close - previousPrice.close) / previousPrice.close) * 100 : 0,
      high24h,
      low24h,
      volume24h,
      avgVolume,
      volatility,
      marketCap: (currentPrice?.close || 0) * 21000000, // Assuming 21M supply for BTC
    };
  }, [data, currentPrice, previousPrice]);

  return {
    data,
    stats,
    isLoading: false,
    error: null
  };
}

// Generate candlestick data with realistic patterns
export function generateCandlestickData(days = 100): TradingDataPoint[] {
  return generateTradingData(97000, days);
}

// Generate intraday data (1-minute intervals)
export function generateIntradayData(hours = 24): TradingDataPoint[] {
  const data: TradingDataPoint[] = [];
  const now = Date.now();
  const msPerMinute = 60 * 1000;
  const minutes = hours * 60;
  
  let currentPrice = 97000;
  
  for (let i = 0; i < minutes; i++) {
    const timestamp = now - (minutes - i - 1) * msPerMinute;
    const date = new Date(timestamp).toISOString();
    
    // Smaller movements for intraday
    const priceChange = (Math.random() - 0.5) * 0.002;
    const open = currentPrice;
    const close = open * (1 + priceChange);
    const high = Math.max(open, close) * (1 + Math.random() * 0.001);
    const low = Math.min(open, close) * (1 - Math.random() * 0.001);
    
    // Lower volume for individual minutes
    const volume = Math.round(1000000 * (0.5 + Math.random()));
    
    data.push({
      timestamp,
      date,
      open,
      high,
      low,
      close,
      volume,
      change: close - open,
      changePercent: ((close - open) / open) * 100
    });
    
    currentPrice = close;
  }
  
  return data;
}