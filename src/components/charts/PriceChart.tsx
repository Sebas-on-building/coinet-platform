/**
 * Advanced Price Chart Component
 * 
 * A professional-grade price chart component built with ApexCharts,
 * featuring support for technical indicators, annotations,
 * and real-time price updates.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { twMerge } from 'tailwind-merge';
import { useTheme } from 'next-themes';
import { Candle, IndicatorConfig } from '@/lib/indicators/types';
import { calculateIndicator, Indicators } from '@/lib/indicators';
import { MarketTick } from '@/lib/data/marketTick';

// ApexCharts must be imported dynamically to prevent SSR issues
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// Import types only for TypeScript
import type {
  ApexOptions,
  ApexAxisChartSeries
} from 'apexcharts';

export type ChartType = 'candlestick' | 'line' | 'area' | 'bar' | 'heikinashi';

export interface TimeframeOption {
  id: string;
  label: string;
  interval?: number; // Interval in milliseconds
}

export interface PriceChartProps {
  symbol: string;
  data: Candle[];
  indicators?: IndicatorConfig[];
  chartType?: ChartType;
  timeframe?: string;
  annotations?: any[];
  height?: number;
  width?: string | number;
  isFullscreen?: boolean;
  showVolume?: boolean;
  showGrid?: boolean;
  theme?: 'light' | 'dark' | 'system';
  isLoading?: boolean;
  onTimeframeChange?: (timeframe: string) => void;
  onChartTypeChange?: (type: ChartType) => void;
  onRangeChange?: (range: { from: number; to: number }) => void;
  onRealtimeUpdate?: (tick: MarketTick) => void;
  className?: string;
}

// Chart theme configurations
const chartThemes = {
  light: {
    background: '#ffffff',
    text: '#1F2937',
    grid: '#F3F4F6',
    border: '#E5E7EB',
    tooltip: {
      background: '#ffffff',
      text: '#1F2937',
      border: '#E5E7EB'
    },
    colors: {
      up: '#10B981', // emerald-500
      down: '#EF4444', // red-500
      volume: {
        up: 'rgba(16, 185, 129, 0.3)', // emerald-500 with opacity
        down: 'rgba(239, 68, 68, 0.3)', // red-500 with opacity
      }
    }
  },
  dark: {
    background: '#111827',
    text: '#F9FAFB',
    grid: '#374151',
    border: '#4B5563',
    tooltip: {
      background: '#1F2937',
      text: '#F9FAFB',
      border: '#374151'
    },
    colors: {
      up: '#34D399', // emerald-400
      down: '#F87171', // red-400
      volume: {
        up: 'rgba(52, 211, 153, 0.3)', // emerald-400 with opacity
        down: 'rgba(248, 113, 113, 0.3)', // red-400 with opacity
      }
    }
  }
};

/**
 * PriceChart component for displaying financial charts with technical indicators
 */
const PriceChart: React.FC<PriceChartProps> = ({
  symbol,
  data,
  indicators = [],
  chartType = 'candlestick',
  timeframe = '1h',
  annotations = [],
  height = 500,
  width = '100%',
  isFullscreen = false,
  showVolume = true,
  showGrid = true,
  theme: themeOverride,
  isLoading = false,
  onTimeframeChange,
  onChartTypeChange,
  onRangeChange,
  onRealtimeUpdate,
  className
}) => {
  // Chart refs
  const chartRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Theme handling
  const { resolvedTheme } = useTheme();
  const currentTheme = themeOverride || resolvedTheme || 'light';
  const themeConfig = currentTheme === 'dark' ? chartThemes.dark : chartThemes.light;

  // Prepare chart series
  const { mainSeries, volumeSeries, indicatorSeries } = useMemo(() => {
    // Process main price series
    const mainSeries: ApexAxisChartSeries = [{
      name: symbol,
      type: chartType === 'heikinashi' ? 'candlestick' : chartType,
      data: data.map(candle => ({
        x: candle.time,
        y: [candle.open, candle.high, candle.low, candle.close],
        ...(chartType === 'heikinashi' && {
          haOpen: candle.open,
          haHigh: candle.high,
          haLow: candle.low,
          haClose: candle.close
        })
      }))
    }];

    // Process volume series (if enabled)
    const volumeSeries: ApexAxisChartSeries = showVolume ? [{
      name: 'Volume',
      type: 'bar',
      data: data.map(candle => ({
        x: candle.time,
        y: candle.volume || 0,
        color: (candle.close >= candle.open)
          ? themeConfig.colors.volume.up
          : themeConfig.colors.volume.down
      }))
    }] : [];

    // Process indicator series
    const indicatorSeries: ApexAxisChartSeries = [];

    // Only process active indicators
    const activeIndicators = indicators.filter(ind => ind.isActive);

    // Calculate each indicator
    activeIndicators.forEach(indicator => {
      const result = calculateIndicator(data, indicator);

      if (!result) return;

      // Handle different indicator result types
      if (Array.isArray(result)) {
        // Simple array result (e.g., SMA, EMA)
        indicatorSeries.push({
          name: indicator.name,
          type: 'line',
          data: data.map((candle, i) => ({
            x: candle.time,
            y: result[i]
          })),
          color: indicator.visuals.line?.color || '#3B82F6',
          lineWidth: indicator.visuals.line?.lineWidth || 1.5,
          dashArray: indicator.visuals.line?.lineStyle === 'dashed' ? [5, 5] :
            indicator.visuals.line?.lineStyle === 'dotted' ? [2, 2] : 0
        });
      } else {
        // Multiple series result (e.g., Bollinger Bands, MACD)
        Object.entries(result).forEach(([key, values]) => {
          if (!indicator.visuals[key]) return;

          const visual = indicator.visuals[key];
          const seriesType = visual.type || 'line';

          indicatorSeries.push({
            name: `${indicator.name} (${key})`,
            type: seriesType,
            data: data.map((candle, i) => ({
              x: candle.time,
              y: values[i]
            })),
            color: visual.color,
            opacity: visual.opacity,
            lineWidth: visual.lineWidth || 1.5,
            dashArray: visual.lineStyle === 'dashed' ? [5, 5] :
              visual.lineStyle === 'dotted' ? [2, 2] : 0
          });
        });
      }
    });

    return { mainSeries, volumeSeries, indicatorSeries };
  }, [data, chartType, symbol, indicators, showVolume, themeConfig]);

  // Chart options
  const chartOptions: ApexOptions = useMemo(() => {
    return {
      chart: {
        type: 'candlestick',
        height: height,
        width: width,
        animations: { enabled: false },
        background: themeConfig.background,
        foreColor: themeConfig.text,
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true
          }
        },
        zoom: {
          enabled: true,
          type: 'x',
          autoScaleYaxis: true
        },
        events: {
          zoomed: (chartContext, { xaxis }) => {
            if (onRangeChange && xaxis) {
              onRangeChange({
                from: xaxis.min,
                to: xaxis.max
              });
            }
          }
        }
      },
      grid: {
        show: showGrid,
        borderColor: themeConfig.grid,
        strokeDashArray: 1,
        position: 'back',
        xaxis: {
          lines: { show: showGrid }
        },
        yaxis: {
          lines: { show: showGrid }
        }
      },
      annotations: {
        xaxis: annotations.filter(a => a.type === 'xaxis'),
        yaxis: annotations.filter(a => a.type === 'yaxis'),
        points: annotations.filter(a => a.type === 'point')
      },
      tooltip: {
        enabled: true,
        theme: currentTheme === 'dark' ? 'dark' : 'light',
        shared: true,
        intersect: false,
        custom: ({ seriesIndex, dataPointIndex, w }) => {
          if (dataPointIndex < 0) return '';

          const series = w.globals.series;
          const seriesName = w.globals.seriesNames[seriesIndex];
          const timestamp = w.globals.categoryLabels[dataPointIndex];

          // For candlestick series
          if (seriesIndex === 0 && chartType === 'candlestick') {
            const ohlc = w.globals.seriesCandleO[0][dataPointIndex] + ',' +
              w.globals.seriesCandleH[0][dataPointIndex] + ',' +
              w.globals.seriesCandleL[0][dataPointIndex] + ',' +
              w.globals.seriesCandleC[0][dataPointIndex];

            const ohlcArray = ohlc.split(',').map(Number);
            const [open, high, low, close] = ohlcArray;
            const change = ((close - open) / open * 100).toFixed(2);
            const isPositive = close >= open;

            return `
              <div class="p-2 rounded-md shadow-md border ${isPositive ? 'border-emerald-400/30' : 'border-red-400/30'} bg-${currentTheme === 'dark' ? 'gray-800' : 'white'}">
                <div class="text-xs text-gray-400 mb-1">${new Date(timestamp).toLocaleString()}</div>
                <div class="font-medium">${symbol}</div>
                <div class="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-sm">
                  <div>Open: <span class="font-medium">${open.toFixed(2)}</span></div>
                  <div>Close: <span class="font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}">${close.toFixed(2)}</span></div>
                  <div>High: <span class="font-medium">${high.toFixed(2)}</span></div>
                  <div>Low: <span class="font-medium">${low.toFixed(2)}</span></div>
                </div>
                <div class="mt-1 text-xs ${isPositive ? 'text-emerald-400' : 'text-red-400'}">
                  Change: ${isPositive ? '+' : ''}${change}%
                </div>
              </div>
            `;
          }

          // For other series types
          return `
            <div class="p-2 rounded-md shadow-md bg-${currentTheme === 'dark' ? 'gray-800' : 'white'} border border-gray-200 dark:border-gray-700">
              <div class="text-xs text-gray-400 mb-1">${new Date(timestamp).toLocaleString()}</div>
              <div class="font-medium">${seriesName}</div>
              <div class="mt-1 text-sm font-medium">
                Value: ${typeof series[seriesIndex][dataPointIndex] === 'number' ?
              series[seriesIndex][dataPointIndex].toFixed(2) : 'N/A'}
              </div>
            </div>
          `;
        }
      },
      xaxis: {
        type: 'datetime',
        labels: {
          show: true,
          style: {
            colors: themeConfig.text,
            fontFamily: 'Inter, sans-serif'
          },
          datetimeUTC: false,
          datetimeFormatter: {
            year: 'yyyy',
            month: "MMM 'yy",
            day: 'dd MMM',
            hour: 'HH:mm'
          }
        },
        tooltip: {
          enabled: true
        }
      },
      yaxis: [
        // Main price axis
        {
          seriesName: symbol,
          axisTicks: { show: true },
          axisBorder: { show: true, color: themeConfig.border },
          labels: {
            style: {
              colors: themeConfig.text,
              fontFamily: 'Inter, sans-serif'
            },
            formatter: (val) => val.toFixed(2)
          },
          title: {
            text: 'Price',
            style: {
              color: themeConfig.text,
              fontFamily: 'Inter, sans-serif'
            }
          }
        },
        // Volume axis
        ...(showVolume ? [{
          seriesName: 'Volume',
          opposite: true,
          axisTicks: { show: true },
          axisBorder: { show: true, color: themeConfig.border },
          labels: {
            style: {
              colors: themeConfig.text,
              fontFamily: 'Inter, sans-serif'
            },
            formatter: (val) => {
              if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
              if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
              return val.toFixed(0);
            }
          },
          title: {
            text: 'Volume',
            style: {
              color: themeConfig.text,
              fontFamily: 'Inter, sans-serif'
            }
          }
        }] : [])
      ],
      plotOptions: {
        candlestick: {
          colors: {
            upward: themeConfig.colors.up,
            downward: themeConfig.colors.down
          },
          wick: {
            useFillColor: true
          }
        },
        bar: {
          colors: {
            ranges: [
              {
                from: -Infinity,
                to: 0,
                color: themeConfig.colors.volume.down
              },
              {
                from: 0,
                to: Infinity,
                color: themeConfig.colors.volume.up
              }
            ]
          }
        }
      },
      markers: {
        size: 0,
        hover: {
          size: 3
        }
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      dataLabels: {
        enabled: false
      },
      fill: {
        opacity: 1
      },
      legend: {
        show: true,
        position: 'top',
        horizontalAlign: 'right',
        floating: true,
        fontFamily: 'Inter, sans-serif',
        labels: {
          colors: themeConfig.text
        }
      },
      responsive: [
        {
          breakpoint: 768,
          options: {
            chart: {
              height: 400
            },
            legend: {
              position: 'bottom',
              horizontalAlign: 'center'
            }
          }
        }
      ]
    };
  }, [
    height,
    width,
    chartType,
    themeConfig,
    currentTheme,
    symbol,
    annotations,
    showGrid,
    showVolume,
    onRangeChange
  ]);

  // Effect for handling real-time updates
  useEffect(() => {
    if (!onRealtimeUpdate || !chartRef.current) return;

    const handleRealtimeUpdate = (tick: MarketTick) => {
      const chart = chartRef.current?.chart;
      if (!chart) return;

      // Get the latest candle
      const series = chart.w.globals.series[0];
      const lastIndex = series.length - 1;

      if (lastIndex < 0) return;

      const lastCandle = series[lastIndex];
      const lastTimestamp = chart.w.globals.seriesX[0][lastIndex];

      // Determine if we need to update the last candle or create a new one
      const tickTime = tick.timestamp;
      const canUpdateLastCandle = isInCurrentTimeframe(lastTimestamp, tickTime, timeframe);

      if (canUpdateLastCandle) {
        // Update the last candle
        const [open, high, low, close] = lastCandle;
        const newHigh = Math.max(high, tick.price);
        const newLow = Math.min(low, tick.price);

        chart.updateSeries([{
          data: [
            ...series.slice(0, lastIndex),
            [open, newHigh, newLow, tick.price]
          ]
        }], true);
      } else {
        // Add a new candle
        // We would want to create a new candle based on the timeframe
        // But for simplicity we just add the new tick as a new candle
        const newCandle = [tick.price, tick.price, tick.price, tick.price];

        chart.appendSeries({
          data: [{
            x: tickTime,
            y: newCandle
          }]
        }, true);
      }
    };

    // Set up listener for real-time updates
    const cleanup = onRealtimeUpdate(handleRealtimeUpdate);

    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [timeframe, onRealtimeUpdate]);

  // Helper to determine if a tick belongs to the current timeframe
  function isInCurrentTimeframe(lastTimestamp: number, tickTimestamp: number, timeframe: string): boolean {
    const timeframeMs = getTimeframeInMs(timeframe);
    return Math.floor(lastTimestamp / timeframeMs) === Math.floor(tickTimestamp / timeframeMs);
  }

  // Convert timeframe string to milliseconds
  function getTimeframeInMs(timeframe: string): number {
    const match = timeframe.match(/(\d+)([mhdw])/);
    if (!match) return 60 * 60 * 1000; // Default to 1h

    const [_, value, unit] = match;
    const numValue = parseInt(value, 10);

    switch (unit) {
      case 'm': return numValue * 60 * 1000;
      case 'h': return numValue * 60 * 60 * 1000;
      case 'd': return numValue * 24 * 60 * 60 * 1000;
      case 'w': return numValue * 7 * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  // Determine which series to display based on the chart configuration
  const displaySeries = useMemo(() => {
    // Combine all series
    let allSeries: ApexAxisChartSeries = [...mainSeries];

    // Add indicator series that should be on the main chart
    const mainIndicators = indicatorSeries.filter(s => {
      const indicator = indicators.find(i =>
        s.name.startsWith(i.name) && i.position === 'main'
      );
      return !!indicator;
    });

    allSeries = [...allSeries, ...mainIndicators];

    // Add volume series if enabled
    if (showVolume) {
      allSeries = [...allSeries, ...volumeSeries];
    }

    // Add indicators that should be below in separate panels
    const belowIndicators = indicatorSeries.filter(s => {
      const indicator = indicators.find(i =>
        s.name.startsWith(i.name) && i.position === 'below'
      );
      return !!indicator;
    });

    allSeries = [...allSeries, ...belowIndicators];

    return allSeries;
  }, [mainSeries, indicatorSeries, volumeSeries, indicators, showVolume]);

  return (
    <div
      ref={containerRef}
      className={twMerge(
        'relative rounded-xl overflow-hidden border',
        'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
        isFullscreen ? 'fixed inset-0 z-50' : '',
        className
      )}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/75 dark:bg-gray-900/75 z-10">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Loading chart data...</p>
          </div>
        </div>
      )}

      <div className="h-full w-full">
        {!isLoading && data.length > 0 && (
          <ReactApexChart
            ref={chartRef}
            options={chartOptions}
            series={displaySeries}
            type={chartType}
            height={height}
            width={width}
          />
        )}

        {(!data || data.length === 0) && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400">No data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceChart; 