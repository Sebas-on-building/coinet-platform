import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface TokenomicsProps {
  coinId: string;
}

interface TokenomicsData {
  market_cap: number;
  total_supply: number;
  circulating_supply: number;
  max_supply: number | null;
  total_volume: number;
  market_cap_rank: number;
  market_cap_change_percentage_24h: number;
}

export function Tokenomics({ coinId }: TokenomicsProps) {
  const [data, setData] = useState<TokenomicsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
        );
        const result = await response.json();

        setData({
          market_cap: result.market_data.market_cap.usd,
          total_supply: result.market_data.total_supply,
          circulating_supply: result.market_data.circulating_supply,
          max_supply: result.market_data.max_supply,
          total_volume: result.market_data.total_volume.usd,
          market_cap_rank: result.market_cap_rank,
          market_cap_change_percentage_24h:
            result.market_data.market_cap_change_percentage_24h,
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch tokenomics data",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [coinId]);

  if (loading)
    return <div className="text-gray-400">Loading tokenomics data...</div>;
  if (error) return <div className="text-red-400">{error}</div>;
  if (!data)
    return <div className="text-gray-400">No tokenomics data available</div>;

  const supplyData = [
    { name: "Circulating", value: data.circulating_supply },
    {
      name: "Locked/Reserved",
      value: data.total_supply - data.circulating_supply,
    },
  ];

  const COLORS = ["#3B82F6", "#1F2937"];

  return (
    <div className="space-y-6">
      {/* Market Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Market Cap</div>
          <div className="text-white font-semibold">
            ${data.market_cap.toLocaleString()}
          </div>
          <div
            className={`text-sm ${data.market_cap_change_percentage_24h >= 0 ? "text-green-400" : "text-red-400"}`}
          >
            {data.market_cap_change_percentage_24h >= 0 ? "+" : ""}
            {data.market_cap_change_percentage_24h.toFixed(2)}%
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-gray-400 text-sm">24h Volume</div>
          <div className="text-white font-semibold">
            ${data.total_volume.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Supply Distribution */}
      <div>
        <h4 className="text-gray-300 text-sm mb-4">Supply Distribution</h4>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={supplyData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {supplyData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  border: "1px solid #374151",
                  borderRadius: "0.5rem",
                }}
                formatter={(value: number) => value.toLocaleString()}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-4">
          {supplyData.map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index] }}
              />
              <span className="text-gray-300 text-sm">{entry.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Supply Stats */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Circulating Supply</span>
          <span className="text-white">
            {data.circulating_supply.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Total Supply</span>
          <span className="text-white">
            {data.total_supply.toLocaleString()}
          </span>
        </div>
        {data.max_supply && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Max Supply</span>
            <span className="text-white">
              {data.max_supply.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
