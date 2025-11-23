import { useState, useEffect } from 'react';
import { generateTradingData } from './useTradingData';
import type { TradingViewData } from '@/types/tradingview';

export function useTradingViewData(symbol: string = 'BTCUSD', interval: string = '1H') {
  const [data, setData] = useState<TradingViewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    
    // Determine data points based on interval
    const dataPoints = interval === 'D' ? 365 : interval === 'W' ? 52 : 168;
    const tradingData = generateTradingData(50000, dataPoints);
    
    // Convert to TradingView format
    const candlesticks = tradingData.map(point => ({
      time: Math.floor(new Date(point.date).getTime() / 1000),
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
    }));

    const volumes = tradingData.map(point => ({
      time: Math.floor(new Date(point.date).getTime() / 1000),
      value: point.volume,
      color: point.close >= point.open ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255, 82, 82, 0.5)',
    }));

    setData({ candlesticks, volumes });
    setIsLoading(false);
  }, [symbol, interval]);

  return { data, isLoading };
}
