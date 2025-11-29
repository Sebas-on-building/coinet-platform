import React, { useEffect, useState } from "react";
import {
  calculateBollingerBands,
  calculateIchimoku,
  calculateElliottWave,
  calculateFibonacciTimeZones,
} from "@/services/analysis/technicalIndicatorsService";
import { technicalIndicatorsWebSocket } from "@/services/websocket/technicalIndicatorsWebSocket";
import { AdvancedChartTypes } from "@/components/charts/AdvancedChartTypes";
import { PatternRecognitionChart } from "@/components/charts/PatternRecognitionChart";

interface CandleData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PricePoint {
  timestamp: string;
  price: number;
  volume: number;
}

interface TechnicalAnalysisProps {
  symbol: string;
  timeframe: string;
}

export function TechnicalAnalysis({
  symbol,
  timeframe,
}: TechnicalAnalysisProps) {
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [pricePoints, setPricePoints] = useState<PricePoint[]>([]);
  const [indicators, setIndicators] = useState<any>(null);

  useEffect(() => {
    // Subscribe to WebSocket updates
    technicalIndicatorsWebSocket.subscribe(symbol, timeframe, (update) => {
      console.log(`${symbol} ${timeframe} update:`, update);

      const middlePrice = update.indicators.bollingerBands?.middle || 0;

      // Update candle data
      const newCandle: CandleData = {
        timestamp: update.timestamp,
        open: middlePrice,
        high: update.indicators.bollingerBands?.upper || middlePrice,
        low: update.indicators.bollingerBands?.lower || middlePrice,
        close: middlePrice,
        volume: update.indicators.obv || 0,
      };

      // Update price points
      const newPricePoint: PricePoint = {
        timestamp: update.timestamp,
        price: middlePrice,
        volume: update.indicators.obv || 0,
      };

      setCandleData((prev) => [...prev, newCandle].slice(-1000)); // Keep last 1000 points
      setPricePoints((prev) => [...prev, newPricePoint].slice(-1000));
      setIndicators(update.indicators);
    });

    return () => {
      technicalIndicatorsWebSocket.unsubscribe(symbol, timeframe);
    };
  }, [symbol, timeframe]);

  return (
    <div className="space-y-4">
      <AdvancedChartTypes
        data={candleData}
        timeframe={timeframe}
        symbol={symbol}
      />
      <PatternRecognitionChart
        data={pricePoints}
        timeframe={timeframe}
        symbol={symbol}
      />
    </div>
  );
}
