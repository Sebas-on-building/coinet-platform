import React from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  LineSeries,
  CrosshairMode,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TradingViewChartProps {
  data: { time: number; value: number }[];
  containerHeight?: number;
  ma20?: { time: number; value: number }[];
  anomalies?: { time: number; value: number; pulse?: boolean }[];
}

function toUnixTime(t: string | number): number {
  return typeof t === "number" ? t : Math.floor(new Date(t).getTime() / 1000);
}

export function TradingViewChart({
  data,
  containerHeight = 400,
  ma20,
  anomalies,
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);
  const { resolvedTheme } = useTheme();
  const [chartWidth, setChartWidth] = useState(0);

  // Fit to screen handler
  const fitToScreen = () => {
    setFitTrigger((f) => f + 1);
  };

  useEffect(() => {
    if (chartContainerRef.current) {
      setChartWidth(chartContainerRef.current.clientWidth);
    }
  }, [containerHeight, data]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Do not remove chart here; let cleanup handle it

    const chartOptions = {
      layout: {
        background: {
          type: ColorType.Solid,
          color: resolvedTheme === "dark" ? "#111827" : "#ffffff",
        },
        textColor: resolvedTheme === "dark" ? "#e5e7eb" : "#374151",
      },
      grid: {
        vertLines: { color: resolvedTheme === "dark" ? "#1f2937" : "#f3f4f6" },
        horzLines: { color: resolvedTheme === "dark" ? "#1f2937" : "#f3f4f6" },
      },
      width: chartContainerRef.current.clientWidth,
      height: containerHeight,
      crosshair: { mode: CrosshairMode.Normal },
      handleScroll: true,
      handleScale: true,
      timeScale: { timeVisible: true, secondsVisible: true },
    };

    chartRef.current = createChart(chartContainerRef.current, chartOptions);
    const series = chartRef.current.addSeries(LineSeries, {
      color: "#00ffa3",
      lineWidth: 3,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      lastValueVisible: true,
      lineType: 2,
    });

    series.setData(data as any);

    // Overlay MA20 if provided
    let maSeries;
    if (ma20) {
      maSeries = chartRef.current.addSeries(LineSeries, {
        color: "#3b82f6",
        lineWidth: 2,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        lineType: 0,
      });
      maSeries.setData(ma20 as any);
    }

    // Overlay anomaly markers if provided
    let anomalySeries;
    if (anomalies && anomalies.length > 0) {
      anomalySeries = chartRef.current.addSeries(LineSeries, {
        color: "#f59e42",
        lineWidth: 1,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        lineType: 0,
      });
      anomalySeries.setData(anomalies as any);
      // TODO: Markers for anomalies require CandlestickSeries or custom rendering
    }

    // Show all data by default or on fit trigger
    chartRef.current.timeScale().fitContent();

    // Add zoom/pan controls
    chartRef.current.applyOptions({
      handleScroll: true,
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
        axisDoubleClickReset: true,
      },
    });

    // Add crosshair and tooltip
    chartRef.current.subscribeCrosshairMove((param) => {
      // You can add a custom tooltip here if needed
    });

    // Responsive resize
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, resolvedTheme, containerHeight, fitTrigger, ma20, anomalies]);

  // Helper: get x position for a given time
  function getX(time: number) {
    if (!data.length || !chartWidth) return 0;
    const idx = data.findIndex((d) => d.time === time);
    if (idx === -1) return 0;
    return (idx / (data.length - 1)) * chartWidth;
  }

  return (
    <div className="w-full relative">
      <div className="flex justify-end mb-2">
        <button
          className="btn btn-secondary text-xs px-3 py-1"
          onClick={fitToScreen}
          aria-label="Fit chart to screen"
        >
          Fit to Screen
        </button>
      </div>
      <div
        ref={chartContainerRef}
        style={{
          width: "100%",
          height: containerHeight,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 2px 16px #00ffa355",
          position: "relative",
        }}
      >
        {/* Chart rendered by lightweight-charts */}
      </div>
      {/* Custom anomaly markers overlay */}
      {anomalies && anomalies.length > 0 && (
        <div
          className="pointer-events-none absolute left-0 top-0 w-full h-full"
          style={{ height: containerHeight }}
        >
          {anomalies.map((a, i) => {
            const x = getX(a.time);
            if (x === 0) return null;
            return (
              <motion.div
                key={a.time + i}
                className="absolute"
                style={{ left: x - 8, top: containerHeight / 2 - 8 }}
                initial={a.pulse ? { scale: 0.7, opacity: 0.7 } : false}
                animate={
                  a.pulse
                    ? { scale: [1.2, 1, 1.2], opacity: [1, 0.7, 1] }
                    : { scale: 1, opacity: 1 }
                }
                transition={
                  a.pulse
                    ? { duration: 1, repeat: 2, repeatType: "reverse" }
                    : {}
                }
              >
                <div
                  className={`w-4 h-4 rounded-full ${a.pulse ? "bg-yellow-400 shadow-lg" : "bg-yellow-300"} border-2 border-yellow-500`}
                />
              </motion.div>
            );
          })}
        </div>
      )}
      {/* Minimap/overview can be added here as a future enhancement */}
    </div>
  );
}

function normalizeChartData(
  data: { time: string | number; value: number }[],
): { time: number; value: number }[] {
  return data.map((d) => ({
    ...d,
    time:
      typeof d.time === "number"
        ? d.time
        : Math.floor(new Date(d.time).getTime() / 1000),
  }));
}
