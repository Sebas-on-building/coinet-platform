import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
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

interface VolumeProfileProps {
  data: CandleData[];
  timeframe: string;
  symbol: string;
}

interface VolumeLevel {
  price: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
}

export function VolumeProfile({ data, timeframe, symbol }: VolumeProfileProps) {
  const [volumeData, setVolumeData] = useState<ChartData<"bar">>();
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [volumeLevels, setVolumeLevels] = useState<VolumeLevel[]>([]);

  useEffect(() => {
    if (data.length > 0) {
      const levels = calculateVolumeLevels(data);
      setVolumeLevels(levels);
      prepareVolumeData(levels);
    }
  }, [data]);

  const calculateVolumeLevels = (data: CandleData[]): VolumeLevel[] => {
    const priceRange = {
      min: Math.min(...data.map((d) => d.low)),
      max: Math.max(...data.map((d) => d.high)),
    };

    const numLevels = 24; // Number of price levels to analyze
    const priceStep = (priceRange.max - priceRange.min) / numLevels;
    const levels: VolumeLevel[] = [];

    for (let i = 0; i < numLevels; i++) {
      const price = priceRange.min + i * priceStep;
      let volume = 0;
      let buyVolume = 0;
      let sellVolume = 0;

      data.forEach((candle) => {
        if (candle.low <= price && candle.high >= price) {
          const volumeAtLevel =
            candle.volume * (priceStep / (candle.high - candle.low));
          volume += volumeAtLevel;

          if (candle.close > candle.open) {
            buyVolume += volumeAtLevel;
          } else {
            sellVolume += volumeAtLevel;
          }
        }
      });

      levels.push({ price, volume, buyVolume, sellVolume });
    }

    return levels;
  };

  const prepareVolumeData = (levels: VolumeLevel[]) => {
    const chartData: ChartData<"bar"> = {
      labels: levels.map((l) => l.price.toFixed(2)),
      datasets: [
        {
          label: "Buy Volume",
          data: levels.map((l) => l.buyVolume),
          backgroundColor: "rgba(0, 255, 0, 0.5)",
          borderColor: "rgb(0, 255, 0)",
          borderWidth: 1,
        },
        {
          label: "Sell Volume",
          data: levels.map((l) => l.sellVolume),
          backgroundColor: "rgba(255, 0, 0, 0.5)",
          borderColor: "rgb(255, 0, 0)",
          borderWidth: 1,
        },
      ],
    };

    setVolumeData(chartData);
  };

  const chartOptions: ChartOptions<"bar"> = {
    indexAxis: "y" as const,
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: `${symbol} - ${timeframe} Volume Profile`,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const level = volumeLevels[context.dataIndex];
            return [
              `Price: ${level.price.toFixed(2)}`,
              `Total Volume: ${level.volume.toFixed(2)}`,
              `Buy Volume: ${level.buyVolume.toFixed(2)}`,
              `Sell Volume: ${level.sellVolume.toFixed(2)}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: "Volume",
        },
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: "Price",
        },
      },
    },
  };

  return (
    <Card className="p-4">
      {volumeData && <Bar data={volumeData} options={chartOptions} />}
    </Card>
  );
}
