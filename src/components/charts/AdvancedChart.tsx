import { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  MouseEventParams,
  Time,
  DeepPartial,
  ChartOptions,
  SeriesType,
  ISeriesApi,
  SeriesOptionsMap,
  AreaSeries,
  LineSeries,
  CandlestickSeries,
  HistogramSeries,
} from "lightweight-charts";
import { Card } from "@/components/ui/Card";

interface ChartData {
  time: string;
  value: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  additional?: Record<string, any>;
}

interface ChartOverlay {
  name: string;
  type: "Area" | "Line" | "Candlestick" | "Histogram";
  data: ChartData[];
  color: string;
}

interface AdvancedChartProps {
  data: ChartData[];
  type?: "Area" | "Line" | "Candlestick" | "Histogram";
  height?: number;
  width?: number;
  onCrosshairMove?: (price: number, time: string) => void;
  overlays?: ChartOverlay[];
}

export function AdvancedChart({
  data,
  type = "Area",
  height = 400,
  width = 800,
  onCrosshairMove,
  overlays = [],
}: AdvancedChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<SeriesType>[]>([]);

  // Helper function to ensure valid date format for the chart
  const formatChartData = (chartData: ChartData[]): ChartData[] => {
    if (!chartData || chartData.length === 0) return [];

    console.log("Original data length:", chartData.length);

    // Step 1: Normalize all timestamps to YYYY-MM-DD format and collect data
    const timeToDataMap = new Map<string, ChartData>();

    chartData.forEach((item) => {
      let formattedTime =
        typeof item.time === "string" ? item.time : String(item.time);

      // Handle ISO date strings
      if (formattedTime.includes("T")) {
        formattedTime = formattedTime.split("T")[0];
      }

      // Validate and ensure YYYY-MM-DD format
      const dateParts = formattedTime.split("-");
      if (
        dateParts.length !== 3 ||
        dateParts[0].length !== 4 ||
        dateParts[1].length !== 2 ||
        dateParts[2].length !== 2
      ) {
        console.warn(
          `Invalid date format: ${formattedTime}, using today's date`,
        );
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        formattedTime = `${year}-${month}-${day}`;
      }

      // Use a Map with time as key to ensure uniqueness
      // If a duplicate exists, the later one overwrites the earlier one
      timeToDataMap.set(formattedTime, {
        ...item,
        time: formattedTime,
      });
    });

    // Step 2: Create a new array from the map values and sort by time
    const uniqueData = Array.from(timeToDataMap.values()).sort((a, b) =>
      a.time.localeCompare(b.time),
    );

    console.log("Processed data length:", uniqueData.length);
    console.log("Data timestamps:", uniqueData.map((d) => d.time).join(", "));

    // Apply a second pass specifically for handling any remaining duplicates
    // This is a safeguard to ensure we have no duplicates at all
    const finalData: ChartData[] = [];
    const seenTimes = new Set<string>();

    uniqueData.forEach((item) => {
      if (seenTimes.has(item.time)) {
        // For any remaining duplicates, create synthetic dates
        // by adding days to the timestamp
        let newDate = new Date(item.time);
        do {
          newDate.setDate(newDate.getDate() + 1);
          const year = newDate.getFullYear();
          const month = String(newDate.getMonth() + 1).padStart(2, "0");
          const day = String(newDate.getDate()).padStart(2, "0");
          item.time = `${year}-${month}-${day}`;
        } while (seenTimes.has(item.time));
      }

      seenTimes.add(item.time);
      finalData.push(item);
    });

    // Verify no duplicates and return
    console.log("Final data length:", finalData.length);
    return finalData;
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chartOptions: DeepPartial<ChartOptions> = {
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.9)",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.1)" },
        horzLines: { color: "rgba(255, 255, 255, 0.1)" },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: "rgba(255, 255, 255, 0.4)",
          style: 3,
        },
        horzLine: {
          width: 1,
          color: "rgba(255, 255, 255, 0.4)",
          style: 3,
        },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.2)",
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.2)",
      },
      width,
      height,
    };

    const chart = createChart(chartContainerRef.current, chartOptions);
    chartRef.current = chart;

    // Create main series
    let mainSeries;
    switch (type) {
      case "Area":
        mainSeries = chart.addSeries(AreaSeries, {
          lineColor: "#2962FF",
          topColor: "rgba(41, 98, 255, 0.28)",
          bottomColor: "rgba(41, 98, 255, 0.05)",
        });
        break;
      case "Line":
        mainSeries = chart.addSeries(LineSeries, {
          color: "#2962FF",
        });
        break;
      case "Candlestick":
        mainSeries = chart.addSeries(CandlestickSeries, {
          upColor: "#26a69a",
          downColor: "#ef5350",
          borderVisible: false,
          wickUpColor: "#26a69a",
          wickDownColor: "#ef5350",
        });
        break;
      case "Histogram":
        mainSeries = chart.addSeries(HistogramSeries, {
          color: "#2962FF",
        });
        break;
      default:
        mainSeries = chart.addSeries(AreaSeries, {
          lineColor: "#2962FF",
          topColor: "rgba(41, 98, 255, 0.28)",
          bottomColor: "rgba(41, 98, 255, 0.05)",
        });
    }

    // Format and set the data
    const formattedData = formatChartData(data);
    mainSeries.setData(formattedData);
    seriesRef.current = [mainSeries];

    // Add overlay series with formatted data
    overlays.forEach((overlay) => {
      let overlaySeries;
      switch (overlay.type) {
        case "Area":
          overlaySeries = chart.addSeries(AreaSeries, {
            lineColor: overlay.color,
            topColor: `${overlay.color}28`,
            bottomColor: `${overlay.color}05`,
          });
          break;
        case "Line":
          overlaySeries = chart.addSeries(LineSeries, {
            color: overlay.color,
          });
          break;
        case "Candlestick":
          overlaySeries = chart.addSeries(CandlestickSeries, {
            upColor: overlay.color,
            downColor: `${overlay.color}88`,
            borderVisible: false,
            wickUpColor: overlay.color,
            wickDownColor: `${overlay.color}88`,
          });
          break;
        case "Histogram":
          overlaySeries = chart.addSeries(HistogramSeries, {
            color: overlay.color,
          });
          break;
      }
      if (overlaySeries) {
        const formattedOverlayData = formatChartData(overlay.data);
        overlaySeries.setData(formattedOverlayData);
        seriesRef.current.push(overlaySeries);
      }
    });

    if (onCrosshairMove) {
      chart.subscribeCrosshairMove((param: MouseEventParams) => {
        if (
          param.point === undefined ||
          !param.time ||
          param.point.x < 0 ||
          param.point.x > width ||
          param.point.y < 0 ||
          param.point.y > height
        ) {
          return;
        }

        const seriesData = param.seriesData.get(mainSeries);
        const price =
          type === "Candlestick"
            ? (seriesData as any)?.close
            : (seriesData as any)?.value;

        if (price !== undefined) {
          onCrosshairMove(Number(price), param.time.toString());
        }
      });
    }

    chart.timeScale().fitContent();

    return () => {
      seriesRef.current = [];
      chart.remove();
    };
  }, [data, type, height, width, onCrosshairMove, overlays]);

  return (
    <Card variant="glass" className="p-4">
      <div ref={chartContainerRef} />
    </Card>
  );
}
