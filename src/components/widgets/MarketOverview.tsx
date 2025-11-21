import { useQuery } from "@tanstack/react-query";
import { getGlobalMarketData } from "@/services/coingecko";

export function MarketOverview() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["global-market-data"],
    queryFn: getGlobalMarketData,
  });

  if (isLoading)
    return <div className="text-gray-400">Loading market stats...</div>;
  if (error || !data)
    return <div className="text-red-400">Failed to load market data.</div>;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow p-6 border border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row gap-6">
      <div className="flex-1">
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          Global Market Cap
        </div>
        <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
          $
          {data.total_market_cap.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}
        </div>
      </div>
      <div className="flex-1">
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          24h Volume
        </div>
        <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
          $
          {data.total_volume.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}
        </div>
      </div>
      <div className="flex-1">
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          BTC Dominance
        </div>
        <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
          {data.btc_dominance.toFixed(2)}%
        </div>
      </div>
      <div className="flex items-end">
        <span className="text-xs text-neutral-400">
          Source:{" "}
          <a
            href="https://coingecko.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            CoinGecko
          </a>
        </span>
      </div>
    </div>
  );
}
