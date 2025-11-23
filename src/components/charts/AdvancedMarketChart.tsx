import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Tabs2 as Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  FireIcon,
  ChartPieIcon,
  ArrowPathIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  ScaleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface MarketData {
  timestamp: string;
  price: number;
  volume: number;
  marketCap: number;
  dominance: number;
}

interface ChartOptions {
  timeframe: "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";
  type: "price" | "volume" | "marketCap" | "dominance";
  showMA: boolean;
  showVolume: boolean;
  showDominance: boolean;
}

export function AdvancedMarketChart() {
  const [selectedAsset, setSelectedAsset] = useState("bitcoin");
  const [chartOptions, setChartOptions] = useState<ChartOptions>({
    timeframe: "1M",
    type: "price",
    showMA: true,
    showVolume: true,
    showDominance: false,
  });
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMarketData();
  }, [selectedAsset, chartOptions.timeframe]);

  const loadMarketData = async () => {
    setLoading(true);
    try {
      // Simulated data - replace with actual API call
      const data = generateSimulatedData();
      setMarketData(data);
    } catch (error) {
      console.error("Error loading market data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateSimulatedData = (): MarketData[] => {
    const data: MarketData[] = [];
    const now = Date.now();
    const interval = getIntervalInMs(chartOptions.timeframe);
    const points = getDataPoints(chartOptions.timeframe);

    for (let i = 0; i < points; i++) {
      const timestamp = new Date(now - (points - i) * interval);
      data.push({
        timestamp: timestamp.toISOString(),
        price: Math.random() * 1000 + 20000,
        volume: Math.random() * 1000000 + 5000000,
        marketCap: Math.random() * 1000000000 + 5000000000,
        dominance: Math.random() * 20 + 40,
      });
    }

    return data;
  };

  const getIntervalInMs = (timeframe: string): number => {
    switch (timeframe) {
      case "1D":
        return 5 * 60 * 1000; // 5 minutes
      case "1W":
        return 15 * 60 * 1000; // 15 minutes
      case "1M":
        return 60 * 60 * 1000; // 1 hour
      case "3M":
        return 4 * 60 * 60 * 1000; // 4 hours
      case "1Y":
        return 24 * 60 * 60 * 1000; // 1 day
      default:
        return 24 * 60 * 60 * 1000; // 1 day
    }
  };

  const getDataPoints = (timeframe: string): number => {
    switch (timeframe) {
      case "1D":
        return 288; // 5-minute intervals
      case "1W":
        return 672; // 15-minute intervals
      case "1M":
        return 720; // 1-hour intervals
      case "3M":
        return 540; // 4-hour intervals
      case "1Y":
        return 365; // Daily intervals
      default:
        return 365; // Daily intervals
    }
  };

  const calculateMA = (data: number[], period: number): number[] => {
    const ma: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        ma.push(NaN);
        continue;
      }
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      ma.push(sum / period);
    }
    return ma;
  };

  const renderChart = () => {
    const labels = marketData.map((d) =>
      new Date(d.timestamp).toLocaleString(),
    );
    const priceData = marketData.map((d) => d.price);
    const volumeData = marketData.map((d) => d.volume);
    const ma20 = calculateMA(priceData, 20);
    const ma50 = calculateMA(priceData, 50);

    const chartData = {
      labels,
      datasets: [
        {
          label: "Price",
          data: priceData,
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.5)",
          fill: true,
          tension: 0.4,
        },
        ...(chartOptions.showMA
          ? [
              {
                label: "MA20",
                data: ma20,
                borderColor: "rgb(255, 99, 132)",
                borderDash: [5, 5],
                fill: false,
              },
              {
                label: "MA50",
                data: ma50,
                borderColor: "rgb(54, 162, 235)",
                borderDash: [5, 5],
                fill: false,
              },
            ]
          : []),
        ...(chartOptions.showVolume
          ? [
              {
                label: "Volume",
                data: volumeData,
                borderColor: "rgb(153, 102, 255)",
                backgroundColor: "rgba(153, 102, 255, 0.5)",
                fill: true,
                yAxisID: "volume",
              },
            ]
          : []),
      ],
    };

    const options = {
      responsive: true,
      interaction: {
        mode: "index" as const,
        intersect: false,
      },
      stacked: false,
      scales: {
        y: {
          type: "linear" as const,
          display: true,
          position: "left" as const,
        },
        volume: {
          type: "linear" as const,
          display: chartOptions.showVolume,
          position: "right" as const,
          grid: {
            drawOnChartArea: false,
          },
        },
      },
      plugins: {
        legend: {
          position: "top" as const,
        },
        title: {
          display: true,
          text: `${selectedAsset.toUpperCase()} Price Chart`,
        },
      },
    };

    return <Line data={chartData} options={options} />;
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap gap-4 mb-6">
        <Select
          value={selectedAsset}
          onChange={(e) => setSelectedAsset(e.target.value)}
          className="min-w-[150px]"
        >
          <option value="bitcoin">Bitcoin</option>
          <option value="ethereum">Ethereum</option>
          <option value="solana">Solana</option>
        </Select>

        <Tabs
          value={chartOptions.timeframe}
          onValueChange={(value) =>
            setChartOptions((prev) => ({
              ...prev,
              timeframe: value as ChartOptions["timeframe"],
            }))
          }
        >
          <TabsList>
            <TabsTrigger value="1D">1D</TabsTrigger>
            <TabsTrigger value="1W">1W</TabsTrigger>
            <TabsTrigger value="1M">1M</TabsTrigger>
            <TabsTrigger value="3M">3M</TabsTrigger>
            <TabsTrigger value="1Y">1Y</TabsTrigger>
            <TabsTrigger value="ALL">ALL</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <button
            onClick={() =>
              setChartOptions((prev) => ({ ...prev, showMA: !prev.showMA }))
            }
            className="focus:outline-none"
          >
            <Badge
              variant={chartOptions.showMA ? "success" : "secondary"}
              className="cursor-pointer"
            >
              <ChartBarIcon className="w-4 h-4 mr-1" />
              MA
            </Badge>
          </button>
          <button
            onClick={() =>
              setChartOptions((prev) => ({
                ...prev,
                showVolume: !prev.showVolume,
              }))
            }
            className="focus:outline-none"
          >
            <Badge
              variant={chartOptions.showVolume ? "success" : "secondary"}
              className="cursor-pointer"
            >
              <ScaleIcon className="w-4 h-4 mr-1" />
              Volume
            </Badge>
          </button>
          <button
            onClick={() =>
              setChartOptions((prev) => ({
                ...prev,
                showDominance: !prev.showDominance,
              }))
            }
            className="focus:outline-none"
          >
            <Badge
              variant={chartOptions.showDominance ? "success" : "secondary"}
              className="cursor-pointer"
            >
              <GlobeAltIcon className="w-4 h-4 mr-1" />
              Dominance
            </Badge>
          </button>
        </div>
      </div>

      <div className="h-[500px]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <ArrowPathIcon className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          renderChart()
        )}
      </div>
    </Card>
  );
}
