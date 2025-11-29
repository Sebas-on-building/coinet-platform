import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  DeepPartial,
  ChartOptions,
  ISeriesApi,
  SeriesType,
  Time,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  BarSeries,
  HistogramSeries,
  LineStyle,
  PriceScaleMode
} from 'lightweight-charts';
import { twMerge } from 'tailwind-merge';
import { useTheme } from 'next-themes';
import {
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  CheckIcon,
  SwatchIcon,
  ChartBarIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  SquaresPlusIcon
} from '@heroicons/react/24/outline';

// Define types for chart data
interface ChartData {
  time: string; // ISO string
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Technical indicator data
interface IndicatorData {
  time: string; // ISO string
  value: number;
}

// Props interface
interface TradingViewChartProps {
  data: ChartData[];
  symbol: string;
  timeframe: string;
  chartType: string;
  theme?: 'light' | 'dark';
  showAnalysis?: boolean;
  height?: number;
  width?: number;
  onTimeRangeChange?: (range: { from: Time; to: Time } | null) => void;
}

// Chart themes
const chartThemes = {
  light: {
    backgroundColor: '#ffffff',
    textColor: '#191919',
    gridColor: '#f0f3fa',
    crosshairColor: 'rgba(42, 46, 57, 0.5)',
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderUpColor: '#26a69a',
    borderDownColor: '#ef5350',
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
    volumeUpColor: 'rgba(38, 166, 154, 0.5)',
    volumeDownColor: 'rgba(239, 83, 80, 0.5)',
  },
  dark: {
    backgroundColor: '#131722',
    textColor: '#d1d4dc',
    gridColor: '#2a2e39',
    crosshairColor: 'rgba(255, 255, 255, 0.5)',
    upColor: '#4caf50',
    downColor: '#ff5252',
    borderUpColor: '#4caf50',
    borderDownColor: '#ff5252',
    wickUpColor: '#4caf50',
    wickDownColor: '#ff5252',
    volumeUpColor: 'rgba(76, 175, 80, 0.5)',
    volumeDownColor: 'rgba(255, 82, 82, 0.5)',
  },
};

// Indicator configurations
const indicators = [
  { id: 'ma20', name: 'MA 20', color: '#7e57c2', visible: true },
  { id: 'ma50', name: 'MA 50', color: '#ff9800', visible: true },
  { id: 'ma200', name: 'MA 200', color: '#f44336', visible: false },
  { id: 'rsi', name: 'RSI', color: '#2196f3', visible: false },
  { id: 'macd', name: 'MACD', color: '#9c27b0', visible: false },
  { id: 'volume', name: 'Volume', color: '#607d8b', visible: true },
  { id: 'bollinger', name: 'Bollinger', color: '#4caf50', visible: false },
  { id: 'fibonacci', name: 'Fibonacci', color: '#ff5722', visible: false },
];

// Mock indicator data generation
const generateIndicatorData = (data: ChartData[], period: number): IndicatorData[] => {
  // Simple moving average calculation
  return data.map((candle, index, arr) => {
    if (index < period - 1) {
      return { time: candle.time, value: candle.close };
    }

    const sum = arr
      .slice(index - period + 1, index + 1)
      .reduce((total, val) => total + val.close, 0);

    return {
      time: candle.time,
      value: sum / period,
    };
  });
};

// Main chart component
const TradingViewChart: React.FC<TradingViewChartProps> = ({
  data,
  symbol,
  timeframe,
  chartType,
  theme = 'light',
  showAnalysis = true,
  height = 500,
  width = 800,
  onTimeRangeChange,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<string[]>(
    indicators.filter(ind => ind.visible).map(ind => ind.id)
  );
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [visibleToolbar, setVisibleToolbar] = useState(true);
  const [chartReady, setChartReady] = useState(false);

  // Series references - using any to avoid TypeScript issues with series types
  const seriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const indicatorSeriesRefs = useRef<Record<string, any>>({});

  // Get theme from context
  const { resolvedTheme } = useTheme();
  const currentTheme = theme === 'light' ? 'light' : 'dark';

  // Memoized chart options
  const chartOptions: DeepPartial<ChartOptions> = useMemo(() => {
    const theme = chartThemes[currentTheme];
    return {
      layout: {
        background: { color: theme.backgroundColor },
        textColor: theme.textColor,
        fontFamily: 'SF Pro Display, Inter, sans-serif',
      },
      grid: {
        vertLines: { color: theme.gridColor },
        horzLines: { color: theme.gridColor },
      },
      crosshair: {
        vertLine: {
          color: theme.crosshairColor,
          width: 1,
          style: LineStyle.Solid,
          visible: true,
          labelVisible: true,
        },
        horzLine: {
          color: theme.crosshairColor,
          width: 1,
          style: LineStyle.Solid,
          visible: true,
          labelVisible: true,
        },
        mode: 1,
      },
      rightPriceScale: {
        borderColor: theme.gridColor,
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: theme.gridColor,
        timeVisible: true,
        secondsVisible: false,
      },
      watermark: {
        color: 'rgba(0, 0, 0, 0.05)',
        visible: false,
        text: symbol,
        fontSize: 50,
        horzAlign: 'center',
        vertAlign: 'center',
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
    };
  }, [currentTheme, symbol]);

  // Create and setup chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // Create new chart
    const chart = createChart(chartContainerRef.current, {
      ...chartOptions,
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });

    // Save chart reference
    chartRef.current = chart;

    // Initialize main series based on chart type
    const seriesOptions = {
      upColor: chartThemes[currentTheme].upColor,
      downColor: chartThemes[currentTheme].downColor,
      borderUpColor: chartThemes[currentTheme].borderUpColor,
      borderDownColor: chartThemes[currentTheme].borderDownColor,
      wickUpColor: chartThemes[currentTheme].wickUpColor,
      wickDownColor: chartThemes[currentTheme].wickDownColor,
      priceFormat: {
        type: 'price' as const,
        precision: 2,
        minMove: 0.01,
      },
    };

    let series;
    switch (chartType) {
      case 'line':
        series = chart.addSeries(LineSeries, {
          color: chartThemes[currentTheme].upColor,
          lineWidth: 2,
          priceFormat: seriesOptions.priceFormat,
        });
        break;
      case 'area':
        series = chart.addSeries(AreaSeries, {
          topColor: `${chartThemes[currentTheme].upColor}50`,
          bottomColor: `${chartThemes[currentTheme].upColor}10`,
          lineColor: chartThemes[currentTheme].upColor,
          lineWidth: 2,
          priceFormat: seriesOptions.priceFormat,
        });
        break;
      case 'bars':
        series = chart.addSeries(BarSeries, {
          upColor: seriesOptions.upColor,
          downColor: seriesOptions.downColor,
          priceFormat: seriesOptions.priceFormat,
        });
        break;
      case 'candles':
      default:
        series = chart.addSeries(CandlestickSeries, seriesOptions);
        break;
    }

    seriesRef.current = series;

    // Initialize volume series
    if (activeIndicators.includes('volume')) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: {
          type: 'volume' as const,
        },
      });

      // Set additional options for the volume series
      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
        visible: true,
      });

      volumeSeriesRef.current = volumeSeries;
    }

    // Add indicators
    activeIndicators.forEach(indicatorId => {
      if (indicatorId === 'volume') return; // Already handled

      const indicator = indicators.find(ind => ind.id === indicatorId);
      if (!indicator) return;

      const indicatorSeries = chart.addSeries(LineSeries, {
        color: indicator.color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
      });

      indicatorSeriesRefs.current[indicatorId] = indicatorSeries;
    });

    // Set data
    if (data && data.length > 0) {
      // Main series data
      if (chartType === 'line') {
        series.setData(
          data.map(candle => ({ time: candle.time, value: candle.close }))
        );
      } else {
        series.setData(data);
      }

      // Volume data
      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.setData(
          data.map(candle => ({
            time: candle.time,
            value: candle.volume || 0,
            color: candle.close >= candle.open
              ? chartThemes[currentTheme].volumeUpColor
              : chartThemes[currentTheme].volumeDownColor,
          }))
        );
      }

      // Indicator data
      Object.entries(indicatorSeriesRefs.current).forEach(([indicatorId, series]) => {
        let indicatorData;

        if (indicatorId === 'ma20') {
          indicatorData = generateIndicatorData(data, 20);
        } else if (indicatorId === 'ma50') {
          indicatorData = generateIndicatorData(data, 50);
        } else if (indicatorId === 'ma200') {
          indicatorData = generateIndicatorData(data, 200);
        } else {
          // For demo, generate some mock data
          indicatorData = data.map(candle => ({
            time: candle.time,
            value: candle.close * (0.95 + Math.random() * 0.1), // Random offset from close
          }));
        }

        series.setData(indicatorData);
      });
    }

    // Fit content
    chart.timeScale().fitContent();

    // Time range change handling
    if (onTimeRangeChange) {
      chart.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
        onTimeRangeChange(timeRange);
      });
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Set chart as ready
    setChartReady(true);

    // Clean up on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      if (onTimeRangeChange && chartRef.current) {
        chartRef.current.timeScale().unsubscribeVisibleTimeRangeChange((timeRange) => {
          onTimeRangeChange(timeRange);
        });
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, chartType, currentTheme, chartOptions, activeIndicators]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!chartContainerRef.current) return;

    if (!isFullscreen) {
      if (chartContainerRef.current.requestFullscreen) {
        chartContainerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Toggle indicator
  const toggleIndicator = (indicatorId: string) => {
    if (activeIndicators.includes(indicatorId)) {
      // Remove indicator
      setActiveIndicators(prev => prev.filter(id => id !== indicatorId));

      // Remove the indicator series from the chart
      if (chartRef.current && indicatorSeriesRefs.current[indicatorId]) {
        chartRef.current.removeSeries(indicatorSeriesRefs.current[indicatorId]);
        delete indicatorSeriesRefs.current[indicatorId];
      }

      // Special handling for volume
      if (indicatorId === 'volume' && chartRef.current && volumeSeriesRef.current) {
        chartRef.current.removeSeries(volumeSeriesRef.current);
        volumeSeriesRef.current = null;
      }
    } else {
      // Add indicator
      setActiveIndicators(prev => [...prev, indicatorId]);

      // We'll need to re-create the chart to add the indicator
      // This is handled in the useEffect that depends on activeIndicators
    }
  };

  return (
    <div className="w-full h-full relative">
      {/* Chart toolbar */}
      {visibleToolbar && (
        <div className="absolute top-0 right-0 z-10 flex gap-1 p-2">
          {/* Toggle indicators button */}
          <button
            onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
            className="p-1.5 rounded-md bg-gray-100/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 backdrop-blur-sm transition-colors"
            title="Indicators"
          >
            <ChartBarIcon className="w-4 h-4" />
          </button>

          {/* Toggle fullscreen button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-md bg-gray-100/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 backdrop-blur-sm transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <ArrowsPointingInIcon className="w-4 h-4" />
            ) : (
              <ArrowsPointingOutIcon className="w-4 h-4" />
            )}
          </button>

          {/* Theme toggle button */}
          <button
            className="p-1.5 rounded-md bg-gray-100/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 backdrop-blur-sm transition-colors"
            title="Toggle theme"
          >
            <SwatchIcon className="w-4 h-4" />
          </button>

          {/* Settings button */}
          <button
            className="p-1.5 rounded-md bg-gray-100/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 backdrop-blur-sm transition-colors"
            title="Chart settings"
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4" />
          </button>

          {/* Add template button */}
          <button
            className="p-1.5 rounded-md bg-gray-100/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 backdrop-blur-sm transition-colors"
            title="Save as template"
          >
            <SquaresPlusIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Indicator menu */}
      {showIndicatorMenu && (
        <div className="absolute top-12 right-0 z-10 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 p-2 min-w-[200px]">
          <div className="text-sm font-medium mb-2 px-2">Indicators</div>
          <div className="space-y-1">
            {indicators.map(indicator => (
              <button
                key={indicator.id}
                onClick={() => toggleIndicator(indicator.id)}
                className={twMerge(
                  "flex items-center w-full px-2 py-1.5 rounded-md text-sm text-left transition-colors",
                  activeIndicators.includes(indicator.id)
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700/50"
                )}
              >
                <span
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: indicator.color }}
                ></span>
                {indicator.name}
                {activeIndicators.includes(indicator.id) && (
                  <CheckIcon className="w-4 h-4 ml-auto" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main chart container */}
      <div
        ref={chartContainerRef}
        className="w-full h-full"
        onMouseEnter={() => setVisibleToolbar(true)}
        onMouseLeave={() => setVisibleToolbar(false)}
      />

      {/* Chart status overlay - shown when chart is loading */}
      {!chartReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-3"></div>
            <div className="text-gray-700 dark:text-gray-300">Loading chart...</div>
          </div>
        </div>
      )}

      {/* Symbol and timeframe badge */}
      <div className="absolute top-2 left-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm">
        {symbol} • {timeframe}
      </div>
    </div>
  );
};

export default TradingViewChart; 