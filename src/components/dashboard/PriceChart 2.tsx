import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

interface PriceData {
  timestamp: number;
  price: number;
}

interface PriceChartProps {
  coinId: string;
}

export function PriceChart({ coinId }: PriceChartProps) {
  const [data, setData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<"1d" | "7d" | "30d" | "1y">("7d");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const days =
          timeframe === "1d"
            ? 1
            : timeframe === "7d"
              ? 7
              : timeframe === "30d"
                ? 30
                : 365;
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=${timeframe === "1d" ? "hourly" : "daily"}`,
        );
        const result = await response.json();

        const formattedData = result.prices.map(
          ([timestamp, price]: [number, number]) => ({
            timestamp,
            price,
          }),
        );

        const normalizedData = normalizeChartData(formattedData);

        setData(normalizedData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch price data",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [coinId, timeframe]);

  if (loading)
    return <div className="text-gray-400">Loading price chart...</div>;
  if (error) return <div className="text-red-400">{error}</div>;
  if (data.length === 0)
    return <div className="text-gray-400">No price data available</div>;

  const currentPrice = data[data.length - 1].price;
  const firstPrice = data[0].price;
  const priceChange = ((currentPrice - firstPrice) / firstPrice) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-white">
            $
            {currentPrice.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </div>
          <div
            className={`text-sm ${priceChange >= 0 ? "text-green-400" : "text-red-400"}`}
          >
            {priceChange >= 0 ? "+" : ""}
            {priceChange.toFixed(2)}%
          </div>
        </div>
        <div className="flex gap-2">
          {(["1d", "7d", "30d", "1y"] as const).map((tf) => (
            <button
              key={tf}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                timeframe === tf
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="2 4"
              stroke="var(--color-surface-alt)"
              strokeWidth={1}
            />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(timestamp) =>
                format(timestamp, timeframe === "1d" ? "HH:mm" : "MMM d")
              }
              stroke="var(--color-text-muted)"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={["auto", "auto"]}
              tickFormatter={(price) => `$${price.toLocaleString()}`}
              stroke="var(--color-text-muted)"
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-surface-alt)",
                borderRadius: "0.75rem",
                color: "var(--color-text)",
                fontWeight: 500,
              }}
              labelStyle={{ color: "var(--color-text-muted)" }}
              formatter={(price: number) => [
                `$${price.toLocaleString()}`,
                "Price",
              ]}
              labelFormatter={(timestamp) =>
                format(timestamp, "MMM d, yyyy HH:mm")
              }
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: "var(--color-primary)" }}
              fill="url(#priceGradient)"
              isAnimationActive
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function normalizeChartData(data: PriceData[]): PriceData[] {
  return data.map((d) => ({
    ...d,
    timestamp: d.timestamp,
  }));
}
