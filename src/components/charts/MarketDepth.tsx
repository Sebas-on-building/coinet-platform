import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
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
  ChartData,
  ChartOptions,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

interface OrderBookEntry {
  price: number;
  quantity: number;
  side: "bid" | "ask";
}

interface MarketDepthProps {
  orderBook: OrderBookEntry[];
  symbol: string;
}

interface DepthLevel {
  price: number;
  bidQuantity: number;
  askQuantity: number;
  cumulativeBidQuantity: number;
  cumulativeAskQuantity: number;
}

export function MarketDepth({ orderBook, symbol }: MarketDepthProps) {
  const [depthData, setDepthData] = useState<ChartData<"line">>();
  const [depthLevels, setDepthLevels] = useState<DepthLevel[]>([]);

  useEffect(() => {
    if (orderBook.length > 0) {
      const levels = calculateDepthLevels(orderBook);
      setDepthLevels(levels);
      prepareDepthData(levels);
    }
  }, [orderBook]);

  const calculateDepthLevels = (orderBook: OrderBookEntry[]): DepthLevel[] => {
    const priceRange = {
      min: Math.min(...orderBook.map((o) => o.price)),
      max: Math.max(...orderBook.map((o) => o.price)),
    };

    const numLevels = 50; // Number of price levels to analyze
    const priceStep = (priceRange.max - priceRange.min) / numLevels;
    const levels: DepthLevel[] = [];

    for (let i = 0; i < numLevels; i++) {
      const price = priceRange.min + i * priceStep;
      let bidQuantity = 0;
      let askQuantity = 0;

      orderBook.forEach((order) => {
        if (Math.abs(order.price - price) < priceStep / 2) {
          if (order.side === "bid") {
            bidQuantity += order.quantity;
          } else {
            askQuantity += order.quantity;
          }
        }
      });

      levels.push({
        price,
        bidQuantity,
        askQuantity,
        cumulativeBidQuantity: 0, // Will be calculated below
        cumulativeAskQuantity: 0, // Will be calculated below
      });
    }

    // Calculate cumulative quantities
    let cumulativeBid = 0;
    let cumulativeAsk = 0;

    // Sort levels by price in descending order for bids
    const sortedLevels = [...levels].sort((a, b) => b.price - a.price);

    sortedLevels.forEach((level) => {
      cumulativeBid += level.bidQuantity;
      level.cumulativeBidQuantity = cumulativeBid;
    });

    // Sort levels by price in ascending order for asks
    sortedLevels.sort((a, b) => a.price - b.price);

    sortedLevels.forEach((level) => {
      cumulativeAsk += level.askQuantity;
      level.cumulativeAskQuantity = cumulativeAsk;
    });

    return sortedLevels;
  };

  const prepareDepthData = (levels: DepthLevel[]) => {
    const chartData: ChartData<"line"> = {
      labels: levels.map((l) => l.price.toFixed(2)),
      datasets: [
        {
          label: "Bid Depth",
          data: levels.map((l) => l.cumulativeBidQuantity),
          borderColor: "rgb(0, 255, 0)",
          backgroundColor: "rgba(0, 255, 0, 0.5)",
          fill: true,
        },
        {
          label: "Ask Depth",
          data: levels.map((l) => l.cumulativeAskQuantity),
          borderColor: "rgb(255, 0, 0)",
          backgroundColor: "rgba(255, 0, 0, 0.5)",
          fill: true,
        },
      ],
    };

    setDepthData(chartData);
  };

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: `${symbol} Market Depth`,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const level = depthLevels[context.dataIndex];
            return [
              `Price: ${level.price.toFixed(2)}`,
              `Bid Quantity: ${level.bidQuantity.toFixed(4)}`,
              `Ask Quantity: ${level.askQuantity.toFixed(4)}`,
              `Cumulative Bid: ${level.cumulativeBidQuantity.toFixed(4)}`,
              `Cumulative Ask: ${level.cumulativeAskQuantity.toFixed(4)}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Price",
        },
      },
      y: {
        title: {
          display: true,
          text: "Cumulative Quantity",
        },
      },
    },
  };

  return (
    <Card className="p-4">
      {depthData && <Line data={depthData} options={chartOptions} />}
    </Card>
  );
}
