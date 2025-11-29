"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import debounce from "lodash/debounce";
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  Time,
  TimeRangeChangeEventHandler,
  SeriesOptionsMap,
  SeriesPartialOptionsMap,
  DeepPartial,
  LineStyle,
  ChartOptions,
  SeriesDefinition,
  LineWidth,
  SeriesType,
  SeriesMarker,
  LineSeriesOptions,
} from "lightweight-charts";
import { DeepPartial as DeepPartialUtils } from "@/types/utils";

type SeriesTypeString = keyof SeriesOptionsMap;

interface ChartData {
  time: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  value?: number;
  volume?: number;
}

interface Overlay {
  id: string;
  name: string;
  type: "MA" | "EMA" | "BB" | "RSI" | "VOLUME";
  color: string;
  visible: boolean;
  params?: {
    period?: number;
    stdDev?: number;
  };
}

interface TradingAnnotation {
  time: string;
  position: "above" | "below";
  color: string;
  text: string;
  type: "order" | "trade" | "alert";
}

type ChartType = "Candlestick" | "Line" | "Area";

interface TradingChartProps {
  symbol: string;
  data: ChartData[];
  chartType?: ChartType;
  theme?: "light" | "dark";
  onTimeRangeChange?: TimeRangeChangeEventHandler<Time>;
  annotations?: TradingAnnotation[];
  orders?: Array<{
    price: number;
    type: "limit" | "stop";
    side: "buy" | "sell";
  }>;
}

type ChartSeriesType = "Candlestick" | "Line" | "Area" | "Histogram";

interface CustomSeriesOptions {
  markers?: SeriesMarker<Time>[];
  lastValueVisible?: boolean;
  priceLineVisible?: boolean;
  crosshairMarkerVisible?: boolean;
  lineWidth?: number;
}

interface CustomLineSeriesOptions extends LineSeriesOptions {
  markers?: SeriesMarker<Time>[];
}

const seriesDefinitions = {
  Candlestick: { type: "Candlestick" } as SeriesDefinition<"Candlestick">,
  Line: { type: "Line" } as SeriesDefinition<"Line">,
  Area: { type: "Area" } as SeriesDefinition<"Area">,
  Histogram: { type: "Histogram" } as SeriesDefinition<"Histogram">,
} as const;

export const TradingChart: React.FC<TradingChartProps> = ({
  symbol,
  data,
  chartType = "Candlestick",
  theme = "dark",
  onTimeRangeChange,
  annotations = [],
  orders = [],
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<IChartApi | null>(null);
  const [mainSeries, setMainSeries] = useState<ISeriesApi<any> | null>(null);
  const [volumeSeries, setVolumeSeries] = useState<ISeriesApi<any> | null>(
    null,
  );
  const [overlays, setOverlays] = useState<Overlay[]>([
    {
      id: "ma20",
      name: "MA 20",
      type: "MA",
      color: "#2962FF",
      visible: false,
      params: { period: 20 },
    },
    {
      id: "ma50",
      name: "MA 50",
      type: "MA",
      color: "#FF6B6B",
      visible: false,
      params: { period: 50 },
    },
    {
      id: "ema21",
      name: "EMA 21",
      type: "EMA",
      color: "#A5D6A7",
      visible: false,
      params: { period: 21 },
    },
    {
      id: "bb20",
      name: "Bollinger Bands",
      type: "BB",
      color: "#9575CD",
      visible: false,
      params: { period: 20, stdDev: 2 },
    },
    {
      id: "rsi14",
      name: "RSI 14",
      type: "RSI",
      color: "#FFB74D",
      visible: false,
      params: { period: 14 },
    },
    {
      id: "volume",
      name: "Volume",
      type: "VOLUME",
      color: "#78909C",
      visible: true,
    },
  ]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const annotationSeries = useRef<ISeriesApi<"Line">[]>([]);
  const orderLines = useRef<ISeriesApi<"Line">[]>([]);

  // Memoize chart options
  const chartOptions = useMemo(
    (): DeepPartial<ChartOptions> => ({
      layout: {
        background: {
          type: ColorType.Solid,
          color: theme === "dark" ? "#1E1E1E" : "#FFFFFF",
        },
        textColor: theme === "dark" ? "#D9D9D9" : "#191919",
      },
      grid: {
        vertLines: { color: theme === "dark" ? "#2B2B2B" : "#E6E6E6" },
        horzLines: { color: theme === "dark" ? "#2B2B2B" : "#E6E6E6" },
      },
      rightPriceScale: {
        borderColor: theme === "dark" ? "#2B2B2B" : "#E6E6E6",
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: theme === "dark" ? "#2B2B2B" : "#E6E6E6",
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1 as LineWidth,
          color: theme === "dark" ? "#758696" : "#9B9B9B",
          style: 1,
        },
        horzLine: {
          width: 1 as LineWidth,
          color: theme === "dark" ? "#758696" : "#9B9B9B",
          style: 1,
        },
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
    }),
    [theme],
  );

  // Handle resize
  const handleResize = useCallback(() => {
    if (containerRef.current && chart) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });
      chart.applyOptions({ width, height });
    }
  }, [chart]);

  const debouncedResize = useMemo(
    () => debounce(handleResize, 100),
    [handleResize],
  );

  useEffect(() => {
    window.addEventListener("resize", debouncedResize);
    return () => {
      window.removeEventListener("resize", debouncedResize);
      debouncedResize.cancel();
    };
  }, [debouncedResize]);

  // Initialize chart with memoized options
  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      const chartInstance = createChart(containerRef.current, {
        ...chartOptions,
        width,
        height,
      });

      // Add main series based on chart type
      let series;
      if (chartType === "Candlestick") {
        const options: DeepPartial<SeriesOptionsMap["Candlestick"]> = {
          upColor: "#26A69A",
          downColor: "#EF5350",
          borderVisible: false,
          wickUpColor: "#26A69A",
          wickDownColor: "#EF5350",
        };
        series = chartInstance.addSeries(
          seriesDefinitions.Candlestick,
          options,
        );
      } else if (chartType === "Area") {
        const options: DeepPartial<SeriesOptionsMap["Area"]> = {
          lineColor: "#2962FF",
          topColor: "#2962FF50",
          bottomColor: "#2962FF10",
          lineWidth: 2,
        };
        series = chartInstance.addSeries(seriesDefinitions.Area, options);
      } else {
        const options: DeepPartial<SeriesOptionsMap["Line"]> = {
          color: "#2962FF",
          lineWidth: 2,
          lineStyle: 0,
        };
        series = chartInstance.addSeries(seriesDefinitions.Line, options);
      }

      // Add volume series
      const volumeOptions: DeepPartial<SeriesOptionsMap["Histogram"]> = {
        color: "#26a69a50",
        priceFormat: {
          type: "volume",
          precision: 0,
          minMove: 1,
        },
        priceScaleId: "volume",
      };
      const volumeSeriesInstance = chartInstance.addSeries(
        seriesDefinitions.Histogram,
        volumeOptions,
      );

      setChart(chartInstance);
      setMainSeries(series);
      setVolumeSeries(volumeSeriesInstance);
      setDimensions({ width, height });

      // Set up time range change handler
      if (onTimeRangeChange) {
        chartInstance
          .timeScale()
          .subscribeVisibleTimeRangeChange(onTimeRangeChange);
      }

      return () => {
        chartInstance.remove();
      };
    }
  }, [chartOptions, chartType, onTimeRangeChange]);

  // Update data
  useEffect(() => {
    if (mainSeries && volumeSeries && data.length > 0) {
      if (chartType === "Candlestick") {
        mainSeries.setData(
          data.map((d) => ({
            time: d.time,
            open: d.open!,
            high: d.high!,
            low: d.low!,
            close: d.close!,
          })),
        );
      } else {
        mainSeries.setData(
          data.map((d) => ({
            time: d.time,
            value: d.close || d.value!,
          })),
        );
      }

      // Update volume data
      volumeSeries.setData(
        data.map((d) => ({
          time: d.time,
          value: d.volume!,
          color:
            (d.close || d.value)! >= (d.open || 0) ? "#26a69a50" : "#ef535050",
        })),
      );
    }
  }, [data, mainSeries, volumeSeries, chartType]);

  // Calculate and update overlays
  useEffect(() => {
    if (!mainSeries || !chart || data.length === 0) return;

    // Remove existing overlays
    const allSeries = (chart as any).series();
    allSeries.forEach((series: ISeriesApi<any>) => {
      if (series !== mainSeries && series !== volumeSeries) {
        chart.removeSeries(series);
      }
    });

    // Add visible overlays
    overlays.forEach((overlay) => {
      if (!overlay.visible) return;

      switch (overlay.type) {
        case "MA":
        case "EMA": {
          const period = overlay.params?.period || 20;
          const prices = data.map((d) => d.close || d.value!);
          const maData = calculateMA(prices, period, overlay.type === "EMA");

          const options: DeepPartial<SeriesOptionsMap["Line"]> = {
            color: overlay.color,
            lineWidth: 1,
            priceLineVisible: false,
            lineStyle: 0,
          };
          const series = chart.addSeries(seriesDefinitions.Line, options);

          series.setData(
            maData.map((value, i) => ({
              time: data[i].time,
              value: value,
            })),
          );
          break;
        }
        case "BB": {
          const period = overlay.params?.period || 20;
          const stdDev = overlay.params?.stdDev || 2;
          const bbData = calculateBollingerBands(data, period, stdDev);

          const lineOptions: DeepPartial<SeriesOptionsMap["Line"]> = {
            color: overlay.color,
            lineWidth: 1,
            priceLineVisible: false,
            lineStyle: 0,
          };

          const upperSeries = chart.addSeries(
            seriesDefinitions.Line,
            lineOptions,
          );
          const middleSeries = chart.addSeries(
            seriesDefinitions.Line,
            lineOptions,
          );
          const lowerSeries = chart.addSeries(
            seriesDefinitions.Line,
            lineOptions,
          );

          upperSeries.setData(bbData.upper);
          middleSeries.setData(bbData.middle);
          lowerSeries.setData(bbData.lower);
          break;
        }
        case "RSI": {
          const period = overlay.params?.period || 14;
          const rsiData = calculateRSI(data, period);

          const options: DeepPartial<SeriesOptionsMap["Line"]> = {
            color: overlay.color,
            lineWidth: 1,
            priceScaleId: "rsi",
            priceFormat: {
              type: "price",
              precision: 2,
              minMove: 0.01,
            },
          };
          const series = chart.addSeries(seriesDefinitions.Line, options);

          series.setData(rsiData);
          break;
        }
      }
    });
  }, [overlays, mainSeries, volumeSeries, chart, data]);

  // Update annotations
  useEffect(() => {
    if (!chart) return;

    // Clear existing annotations
    annotationSeries.current.forEach((series) => chart.removeSeries(series));
    annotationSeries.current = [];

    // Add new annotations
    annotations.forEach((annotation) => {
      const series = chart.addSeries(seriesDefinitions.Line);

      // Use setData to establish a single data point
      series.setData([
        {
          time: annotation.time as Time,
          value: 0, // Placeholder value, not shown
        },
      ]);

      // Access internal API to set markers (this is a workaround)
      const applyMarkers = (series as any).applyOptions?.bind(series);
      if (typeof applyMarkers === "function") {
        applyMarkers({
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
          lineWidth: 1,
          markers: [
            {
              time: annotation.time as Time,
              position:
                annotation.position === "above" ? "aboveBar" : "belowBar",
              color: annotation.color,
              shape:
                annotation.type === "order"
                  ? "circle"
                  : annotation.type === "trade"
                    ? "arrowUp"
                    : "square",
              text: annotation.text,
            },
          ],
        });
      }

      annotationSeries.current.push(series);
    });
  }, [chart, annotations]);

  // Update order lines
  useEffect(() => {
    if (!chart) return;

    // Clear existing order lines
    orderLines.current.forEach((series) => chart.removeSeries(series));
    orderLines.current = [];

    // Add new order lines
    orders.forEach((order) => {
      const series = chart.addSeries(seriesDefinitions.Line, {
        lastValueVisible: true,
        priceLineVisible: true,
        priceLineWidth: 2,
        priceLineColor: order.side === "buy" ? "#26A69A" : "#EF5350",
        priceLineStyle: LineStyle.Dashed,
        crosshairMarkerVisible: false,
        lineWidth: 1,
      });

      series.setData([
        {
          time: data[data.length - 1].time as Time,
          value: order.price,
        },
      ]);

      orderLines.current.push(series);
    });
  }, [chart, orders, data]);

  const toggleOverlay = (id: string) => {
    setOverlays((prevOverlays) =>
      prevOverlays.map((overlay) =>
        overlay.id === id ? { ...overlay, visible: !overlay.visible } : overlay,
      ),
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap gap-2 mb-4">
        {overlays.map((overlay) => (
          <button
            key={overlay.id}
            onClick={() => toggleOverlay(overlay.id)}
            className={`px-3 py-1 rounded text-sm ${
              overlay.visible
                ? "bg-blue-500 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            {overlay.name}
          </button>
        ))}
      </div>
      <div ref={containerRef} className="flex-grow relative">
        {/* Loading overlay */}
        {!data.length && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
            <div className="text-white">Loading chart data...</div>
          </div>
        )}
      </div>
    </div>
  );
};

// Technical Analysis Helper Functions
function calculateMA(
  prices: number[],
  period: number,
  exponential: boolean = false,
): number[] {
  const result: number[] = [];
  if (exponential) {
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    result.push(ema);

    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
      result.push(ema);
    }
  } else {
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
        continue;
      }

      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += prices[i - j];
      }
      result.push(sum / period);
    }
  }

  return result;
}

function calculateBollingerBands(
  data: ChartData[],
  period: number,
  stdDev: number,
) {
  const prices = data.map((d) => d.close || d.value!);
  const middle = calculateMA(prices, period);
  const upper: { time: string; value: number }[] = [];
  const lower: { time: string; value: number }[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upper.push({ time: data[i].time, value: NaN });
      lower.push({ time: data[i].time, value: NaN });
      continue;
    }

    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += Math.pow(prices[i - j] - middle[i], 2);
    }
    const std = Math.sqrt(sum / period);

    upper.push({
      time: data[i].time,
      value: middle[i] + stdDev * std,
    });
    lower.push({
      time: data[i].time,
      value: middle[i] - stdDev * std,
    });
  }

  return {
    upper,
    middle: middle.map((value, i) => ({ time: data[i].time, value })),
    lower,
  };
}

function calculateRSI(data: ChartData[], period: number) {
  const prices = data.map((d) => d.close || d.value!);
  const gains: number[] = [];
  const losses: number[] = [];
  const result: { time: string; value: number }[] = [];

  // Calculate price changes and separate gains and losses
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(Math.max(0, change));
    losses.push(Math.max(0, -change));

    if (i < period) {
      result.push({ time: data[i].time, value: NaN });
      continue;
    }

    const avgGain =
      gains.slice(i - period, i).reduce((sum, val) => sum + val, 0) / period;
    const avgLoss =
      losses.slice(i - period, i).reduce((sum, val) => sum + val, 0) / period;

    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    result.push({ time: data[i].time, value: rsi });
  }

  return result;
}
