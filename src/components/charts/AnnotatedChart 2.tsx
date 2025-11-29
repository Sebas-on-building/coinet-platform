import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/design-system/components/Button/Button";
import { Dialog } from "@/components/ui/dialog";
import { newsService } from "@/services/news";
import type { NewsItem } from "@/types/news";
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { InputValidator } from '@/lib/validation/InputValidator';

// Placeholder imports - install packages with: npm install chart.js react-chartjs-2 chartjs-plugin-annotation
// import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartOptions, ChartData } from "chart.js";
// import { Line } from "react-chartjs-2";
// import "chartjs-plugin-annotation";
// import annotationPlugin from "chartjs-plugin-annotation";

// Placeholder types for chart.js
interface ChartOptions<T> {
  responsive?: boolean;
  interaction?: any;
  plugins?: any;
  scales?: any;
}

interface ChartData<T> {
  labels: string[];
  datasets: any[];
}

interface ChartJS<T> {
  // Placeholder for chart.js types
}

interface ChartAnnotation {
  timestamp: string;
  price: number;
  impact_type: "positive" | "negative" | "neutral";
  price_change_percent: number;
  volume_change_percent: number;
  news_id: string;
}

// Placeholder chart component
const Line: React.FC<any> = () => null;

// Placeholder registration (would normally register chart.js components)
// ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, annotationPlugin);

interface AnnotatedChartProps {
  symbol: string;
  data: {
    timestamps: string[];
    prices: number[];
    volumes: number[];
  };
  timeframe: string;
}

export function AnnotatedChart({
  symbol,
  data,
  timeframe,
}: AnnotatedChartProps) {
  const [annotations, setAnnotations] = useState<ChartAnnotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<ChartAnnotation | null>(null);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<ChartJS<"line">>(null);

  useEffect(() => {
    fetchAnnotations();

    const handleNewsUpdate = async (newsItem: NewsItem) => {
      // Only update annotations if the news item affects our current symbol
      if (newsItem.impact && newsItem.assets && newsItem.assets.includes(symbol)) {
        await fetchAnnotations();
      }
    };

    newsService.on("news", handleNewsUpdate);
    return () => {
      newsService.off("news", handleNewsUpdate);
    };
  }, [symbol, timeframe, data]);

  const fetchAnnotations = async () => {
    if (!data.timestamps.length) return;

    try {
      setLoading(true);
      const result = await newsService.getChartAnnotations(
        symbol,
        timeframe as any, // Cast to avoid strict timeframe type checking for now
        data.timestamps[0],
        data.timestamps[data.timestamps.length - 1],
      );
      setAnnotations(result.annotations);
    } catch (error) {
      console.error("Error fetching annotations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnnotationClick = async (annotation: ChartAnnotation) => {
    setSelectedAnnotation(annotation);
    try {
      const newsDetails = await newsService.getNewsDetails(annotation.news_id);
      if (newsDetails) {
        setSelectedNews(newsDetails);
      }
    } catch (error) {
      console.error("Error fetching news details:", error);
    }
  };

  const getAnnotationColor = (impact: ChartAnnotation["impact_type"]) => {
    switch (impact) {
      case "positive":
        return "#10B981"; // green
      case "negative":
        return "#EF4444"; // red
      default:
        return "#6B7280"; // gray
    }
  };

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const annotation = annotations.find(
              (a) => a.timestamp === data.timestamps[context.dataIndex],
            );
            if (annotation) {
              return [
                `Price: ${context.formattedValue}`,
                `Impact: ${annotation.price_change_percent.toFixed(2)}%`,
                `Volume Change: ${annotation.volume_change_percent.toFixed(2)}%`,
                "Click for details",
              ];
            }
            return `Price: ${context.formattedValue}`;
          },
        },
      },
      annotation: {
        annotations: annotations.map((annotation) => ({
          type: "point" as const,
          xValue: data.timestamps.indexOf(annotation.timestamp),
          yValue: annotation.price,
          backgroundColor: getAnnotationColor(annotation.impact_type),
          borderColor: "white",
          borderWidth: 2,
          radius: 6,
          onClick: () => handleAnnotationClick(annotation),
        })),
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 0,
          callback: (value: any) => {
            const date = new Date(data.timestamps[value as number]);
            return date.toLocaleTimeString();
          },
        },
      },
      y: {
        position: "right",
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          callback: (value: any) => `$${value.toLocaleString()}`,
        },
      },
      volume: {
        position: "left",
        grid: {
          display: false,
        },
        ticks: {
          callback: (value: any) => `${(Number(value) / 1000000).toFixed(1)}M`,
        },
      },
    },
  };

  const chartData: ChartData<"line"> = {
    labels: data.timestamps,
    datasets: [
      {
        label: "Price",
        data: data.prices,
        borderColor: "#3B82F6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        yAxisID: "y",
      },
      {
        label: "Volume",
        data: data.volumes,
        borderColor: "rgba(156, 163, 175, 0.5)",
        backgroundColor: "rgba(156, 163, 175, 0.1)",
        borderWidth: 1,
        fill: true,
        tension: 0.4,
        yAxisID: "volume",
      },
    ],
  };

  const renderNewsDetails = () => {
    if (!selectedNews) return null;

    return (
      <Dialog
        open={!!selectedNews}
        onClose={() => {
          setSelectedNews(null);
          setSelectedAnnotation(null);
        }}
        title={selectedNews.title}
        size="lg"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Badge
              variant={
                selectedAnnotation?.impact_type === "positive"
                  ? "success"
                  : "danger"
              }
            >
              Price Impact:{" "}
              {selectedAnnotation?.price_change_percent.toFixed(2)}%
            </Badge>
            <Badge variant="secondary">
              Volume Change:{" "}
              {selectedAnnotation?.volume_change_percent.toFixed(2)}%
            </Badge>
          </div>

          <div className="prose prose-invert max-w-none">
            <p className="text-lg font-medium text-gray-300">
              {selectedNews.summary}
            </p>
            <div
              className="mt-4"
            >
              <SafeNewsContent content={selectedNews.content} />
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">Impact Analysis</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Market Sentiment</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-medium">
                    {selectedNews.market_sentiment || "neutral"}
                  </span>
                  <Badge
                    variant={
                      selectedNews.market_sentiment === "bullish"
                        ? "success"
                        : selectedNews.market_sentiment === "bearish"
                          ? "danger"
                          : "secondary"
                    }
                  >
                    {selectedNews.impact?.score ? (selectedNews.impact.score * 100).toFixed(1) : "0"}% Impact
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-400">Expected Volatility</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-medium">
                    {selectedNews.impact_change ? (selectedNews.impact_change * 100).toFixed(1) : "0"}%
                  </span>
                  <Badge variant="secondary">Change</Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">Related Assets</h4>
            <div className="grid grid-cols-3 gap-4">
              {selectedNews.related_assets?.map((asset, index) => (
                <div key={index}>
                  <p className="text-sm text-gray-400">{asset}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-medium">
                      Related
                    </span>
                    <Badge variant="secondary">
                      Asset
                    </Badge>
                  </div>
                </div>
              )) || (
                <div className="col-span-3 text-gray-400 text-center">
                  No related assets available
                </div>
              )}
            </div>
          </div>
        </div>
      </Dialog>
    );
  };

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      )}
      <Line ref={chartRef} options={chartOptions} data={chartData} />
      {renderNewsDetails()}
    </div>
  );
}

const SafeNewsContent: React.FC<{ content: string }> = ({ content }) => {
  const sanitizedContent = useMemo(() =>
    InputValidator.sanitizeHTMLClient(content), [content]
  );

  return (
    <div className="news-content">
      {sanitizedContent}
    </div>
  );
};
