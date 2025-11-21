import { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { useTradingViewData } from '@/hooks/useTradingViewData';
import { useTheme } from 'next-themes';
import type { TradingViewChartConfig } from '@/types/tradingview';

export function TradingViewLightweightChart({
  symbol,
  interval,
  height = 400,
}: TradingViewChartConfig) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useTradingViewData(symbol, interval);
  const { theme } = useTheme();

  useEffect(() => {
    if (!chartContainerRef.current || !data) return;

    const isDark = theme === 'dark';
    
    // TradingView authentic styling - matches official TradingView theme
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#0e1217' : '#ffffff' },
        textColor: isDark ? '#d1d4dc' : '#131722',
      },
      grid: {
        vertLines: { 
          color: isDark ? '#1c2028' : '#e1e3e8',
          style: 0,
          visible: true,
        },
        horzLines: { 
          color: isDark ? '#1c2028' : '#e1e3e8',
          style: 0,
          visible: true,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height,
      crosshair: {
        mode: 1 as any,
        vertLine: {
          color: isDark ? '#758696' : '#9598a1',
          width: 1,
          style: 3,
          labelBackgroundColor: isDark ? '#363c4e' : '#ffffff',
        },
        horzLine: {
          color: isDark ? '#758696' : '#9598a1',
          width: 1,
          style: 3,
          labelBackgroundColor: isDark ? '#363c4e' : '#ffffff',
        },
      },
      timeScale: {
        borderColor: isDark ? '#2b2f3a' : '#d6dcde',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: isDark ? '#2b2f3a' : '#d6dcde',
      },
    });

    // Add candlestick series with TradingView colors
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: isDark ? '#26a69a' : '#089981',
      downColor: isDark ? '#ef5350' : '#f23645',
      borderVisible: false,
      wickUpColor: isDark ? '#26a69a' : '#089981',
      wickDownColor: isDark ? '#ef5350' : '#f23645',
    });
    candlestickSeries.setData(data.candlesticks as any);

    // Add volume series with dynamic colors
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: isDark ? '#26a69a80' : '#08998180',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
    volumeSeries.setData(data.volumes as any);

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, height, theme]);

  if (isLoading) {
    return (
      <div 
        className="flex items-center justify-center bg-muted/50 rounded-lg animate-pulse"
        style={{ height }}
      >
        <p className="text-muted-foreground">Loading chart...</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-border">
      <div className="absolute top-2 left-2 z-10 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-md border border-border/50">
        <p className="text-sm font-semibold text-foreground">{symbol}</p>
        <p className="text-xs text-muted-foreground">{interval}</p>
      </div>
      <div ref={chartContainerRef} />
    </div>
  );
}
