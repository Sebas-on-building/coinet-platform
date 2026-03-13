import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  LineSeries,
  CrosshairMode,
} from "lightweight-charts";
import { useTheme } from "next-themes";

interface TradingViewChartProps {
  data: { time: number; value: number }[];
  containerHeight?: number;
  ma20?: { time: number; value: number }[];
  anomalies?: { time: number; value: number; pulse?: boolean }[];
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

  const fitToScreen = () => setFitTrigger((f) => f + 1);

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
    if (ma20) {
      const maSeries = chartRef.current.addSeries(LineSeries, {
        color: "#3b82f6",
        lineWidth: 2,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        lineType: 0,
      });
      maSeries.setData(ma20 as any);
    }

    // Overlay anomaly markers on the main series
    if (anomalies && anomalies.length > 0) {
      series.setMarkers(
        anomalies
          .map((a) => ({
            time: a.time as any,
            position: "aboveBar" as const,
            color: a.pulse ? "#f59e42" : "#fbbf24",
            shape: "circle" as const,
            text: "⚠",
          }))
          .sort((a, b) => (a.time as number) - (b.time as number))
      );
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
        {/* Chart rendered by lightweight-charts (anomaly markers via setMarkers) */}
      </div>
    </div>
  );
}
