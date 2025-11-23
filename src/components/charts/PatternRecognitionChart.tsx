import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Tabs2 as Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { PatternRecognitionService } from "@/services/analysis/patternRecognitionService";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

interface PricePoint {
  timestamp: string;
  price: number;
  volume: number;
}

interface Pattern {
  type: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  description: string;
  prediction: {
    direction: "up" | "down" | "sideways";
    target: number;
    stopLoss: number;
  };
}

interface PatternRecognitionChartProps {
  data: PricePoint[];
  timeframe: string;
  symbol: string;
}

export function PatternRecognitionChart({
  data,
  timeframe,
  symbol,
}: PatternRecognitionChartProps) {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const patternService = PatternRecognitionService.getInstance();

  useEffect(() => {
    const detectedPatterns = patternService.findPatterns(data);
    setPatterns(detectedPatterns);
  }, [data]);

  const chartData: ChartData<"line"> = {
    labels: data.map((d) => new Date(d.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: "Price",
        data: data.map((d) => d.price),
        borderColor: "rgb(75, 192, 192)",
        tension: 0.1,
      },
      ...patterns
        .filter((p) => activeTab === "all" || p.type === activeTab)
        .map((pattern, index) => ({
          label: `${pattern.type} (${(pattern.confidence * 100).toFixed(1)}% confidence)`,
          data: data.map((d, i) => {
            if (i >= pattern.startIndex && i <= pattern.endIndex) {
              return d.price;
            }
            return null;
          }),
          borderColor: getPatternColor(pattern.type),
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 0,
        })),
    ],
  };

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: `${symbol} - ${timeframe} - Pattern Recognition`,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const pattern = patterns.find(
              (p) =>
                context.datasetIndex > 0 &&
                context.dataIndex >= p.startIndex &&
                context.dataIndex <= p.endIndex,
            );

            if (pattern) {
              return [
                `Pattern: ${pattern.description}`,
                `Confidence: ${(pattern.confidence * 100).toFixed(1)}%`,
                `Prediction: ${pattern.prediction.direction.toUpperCase()}`,
                `Target: ${pattern.prediction.target.toFixed(2)}`,
                `Stop Loss: ${pattern.prediction.stopLoss.toFixed(2)}`,
              ];
            }

            return `Price: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  const getPatternColor = (type: string): string => {
    switch (type) {
      case "double_top":
        return "rgb(255, 99, 132)";
      case "double_bottom":
        return "rgb(54, 162, 235)";
      case "head_and_shoulders":
        return "rgb(255, 206, 86)";
      case "triangle":
        return "rgb(75, 192, 192)";
      case "flag":
        return "rgb(153, 102, 255)";
      case "pennant":
        return "rgb(255, 159, 64)";
      default:
        return "rgb(201, 203, 207)";
    }
  };

  const patternTypes = ["all", ...new Set(patterns.map((p) => p.type))];

  return (
    <Card className="p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {patternTypes.map((type) => (
            <TabsTrigger key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab}>
          <Line data={chartData} options={chartOptions} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
