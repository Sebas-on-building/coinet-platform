import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Tabs2 as Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

interface CandleData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface HeikinAshiData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface KagiData {
  timestamp: string;
  price: number;
  direction: "up" | "down";
  volume: number;
}

interface RenkoData {
  timestamp: string;
  price: number;
  direction: "up" | "down";
  volume: number;
}

interface AdvancedChartTypesProps {
  data: CandleData[];
  timeframe: string;
  symbol: string;
}

export function AdvancedChartTypes({
  data,
  timeframe,
  symbol,
}: AdvancedChartTypesProps) {
  const [activeTab, setActiveTab] = useState("candlestick");
  const [candlestickData, setCandlestickData] = useState<ChartData<"bar">>();
  const [renkoData, setRenkoData] = useState<ChartData<"line">>();
  const [heikinAshiData, setHeikinAshiData] = useState<ChartData<"bar">>();
  const [kagiData, setKagiData] = useState<ChartData<"line">>();

  useEffect(() => {
    if (activeTab === "candlestick") {
      prepareCandlestickData();
    } else if (activeTab === "renko") {
      prepareRenkoData();
    } else if (activeTab === "heikin-ashi") {
      prepareHeikinAshiData();
    } else if (activeTab === "kagi") {
      prepareKagiData();
    }
  }, [data, activeTab]);

  const prepareCandlestickData = () => {
    const chartData: ChartData<"bar"> = {
      labels: data.map((d) => new Date(d.timestamp).toLocaleTimeString()),
      datasets: [
        {
          label: "OHLC",
          data: data.map((d) => d.close),
          backgroundColor: data.map((d) =>
            d.close >= d.open ? "rgba(0, 255, 0, 0.5)" : "rgba(255, 0, 0, 0.5)",
          ),
          borderColor: data.map((d) =>
            d.close >= d.open ? "rgb(0, 255, 0)" : "rgb(255, 0, 0)",
          ),
          borderWidth: 1,
        },
      ],
    };
    setCandlestickData(chartData);
  };

  const prepareRenkoData = () => {
    const boxSize = calculateBoxSize(data);
    const renkoBlocks = generateRenkoBlocks(data, boxSize);

    const chartData: ChartData<"line"> = {
      labels: renkoBlocks.map((d) =>
        new Date(d.timestamp).toLocaleTimeString(),
      ),
      datasets: [
        {
          label: "Renko Blocks",
          data: renkoBlocks.map((d) => d.price),
          borderColor: renkoBlocks.map((d) =>
            d.direction === "up" ? "rgb(0, 255, 0)" : "rgb(255, 0, 0)",
          ),
          backgroundColor: renkoBlocks.map((d) =>
            d.direction === "up"
              ? "rgba(0, 255, 0, 0.5)"
              : "rgba(255, 0, 0, 0.5)",
          ),
          stepped: true,
        },
      ],
    };
    setRenkoData(chartData);
  };

  const prepareHeikinAshiData = () => {
    const heikinAshi = calculateHeikinAshi(data);

    const chartData: ChartData<"bar"> = {
      labels: heikinAshi.map((d) => new Date(d.timestamp).toLocaleTimeString()),
      datasets: [
        {
          label: "Heikin-Ashi",
          data: heikinAshi.map((d) => d.close),
          backgroundColor: heikinAshi.map((d) =>
            d.close >= d.open ? "rgba(0, 255, 0, 0.5)" : "rgba(255, 0, 0, 0.5)",
          ),
          borderColor: heikinAshi.map((d) =>
            d.close >= d.open ? "rgb(0, 255, 0)" : "rgb(255, 0, 0)",
          ),
          borderWidth: 1,
        },
      ],
    };
    setHeikinAshiData(chartData);
  };

  const prepareKagiData = () => {
    const kagi = calculateKagi(data);

    const chartData: ChartData<"line"> = {
      labels: kagi.map((d) => new Date(d.timestamp).toLocaleTimeString()),
      datasets: [
        {
          label: "Kagi",
          data: kagi.map((d) => d.price),
          borderColor: kagi.map((d) =>
            d.direction === "up" ? "rgb(0, 255, 0)" : "rgb(255, 0, 0)",
          ),
          backgroundColor: kagi.map((d) =>
            d.direction === "up"
              ? "rgba(0, 255, 0, 0.5)"
              : "rgba(255, 0, 0, 0.5)",
          ),
          stepped: true,
        },
      ],
    };
    setKagiData(chartData);
  };

  const calculateHeikinAshi = (data: CandleData[]): HeikinAshiData[] => {
    return data.map((candle, index) => {
      const prevCandle = index > 0 ? data[index - 1] : candle;

      const haClose =
        (candle.open + candle.high + candle.low + candle.close) / 4;
      const haOpen = (prevCandle.open + prevCandle.close) / 2;
      const haHigh = Math.max(candle.high, haOpen, haClose);
      const haLow = Math.min(candle.low, haOpen, haClose);

      return {
        timestamp: candle.timestamp,
        open: haOpen,
        high: haHigh,
        low: haLow,
        close: haClose,
        volume: candle.volume,
      };
    });
  };

  const calculateKagi = (data: CandleData[]): KagiData[] => {
    const reversalAmount = calculateReversalAmount(data);
    const kagi: KagiData[] = [];
    let currentPrice = data[0].close;
    let currentDirection: "up" | "down" = "up";

    data.forEach((candle) => {
      const priceChange = candle.close - currentPrice;

      if (Math.abs(priceChange) >= reversalAmount) {
        currentDirection = priceChange > 0 ? "up" : "down";
        currentPrice = candle.close;

        kagi.push({
          timestamp: candle.timestamp,
          price: currentPrice,
          direction: currentDirection,
          volume: candle.volume,
        });
      }
    });

    return kagi;
  };

  const calculateReversalAmount = (data: CandleData[]): number => {
    const priceChanges = data.map((d) => Math.abs(d.close - d.open));
    const avgChange =
      priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
    return avgChange * 0.5; // Adjust this multiplier as needed
  };

  const calculateBoxSize = (data: CandleData[]): number => {
    const priceChanges = data.map((d) => Math.abs(d.close - d.open));
    const avgChange =
      priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
    return avgChange * 0.5; // Adjust this multiplier as needed
  };

  const generateRenkoBlocks = (
    data: CandleData[],
    boxSize: number,
  ): RenkoData[] => {
    const blocks: RenkoData[] = [];
    let currentPrice = data[0].close;
    let currentDirection: "up" | "down" = "up";

    data.forEach((candle) => {
      const priceChange = candle.close - currentPrice;
      const numBlocks = Math.floor(Math.abs(priceChange) / boxSize);

      for (let i = 0; i < numBlocks; i++) {
        currentPrice += boxSize * (priceChange > 0 ? 1 : -1);
        blocks.push({
          timestamp: candle.timestamp,
          price: currentPrice,
          direction: priceChange > 0 ? "up" : "down",
          volume: candle.volume / numBlocks,
        });
      }
    });

    return blocks;
  };

  const chartOptions: ChartOptions<"bar" | "line"> = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: `${symbol} - ${timeframe}`,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  return (
    <Card className="p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="candlestick">Candlestick</TabsTrigger>
          <TabsTrigger value="renko">Renko</TabsTrigger>
          <TabsTrigger value="heikin-ashi">Heikin-Ashi</TabsTrigger>
          <TabsTrigger value="kagi">Kagi</TabsTrigger>
        </TabsList>

        <TabsContent value="candlestick">
          {candlestickData && (
            <Bar data={candlestickData} options={chartOptions} />
          )}
        </TabsContent>

        <TabsContent value="renko">
          {renkoData && <Line data={renkoData} options={chartOptions} />}
        </TabsContent>

        <TabsContent value="heikin-ashi">
          {heikinAshiData && (
            <Bar data={heikinAshiData} options={chartOptions} />
          )}
        </TabsContent>

        <TabsContent value="kagi">
          {kagiData && <Line data={kagiData} options={chartOptions} />}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
