import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import type { MarketRegimeData } from "@/types/api";

/**
 * Live market regime (Fear & Greed, BTC dominance, total market cap) from the
 * additive, read-only GET /api/market-regime endpoint. Refreshes every 5 min to
 * match the backend cache window. Never fabricates — null fields stay null and
 * are rendered as honest "unavailable" states.
 */
export function useMarketRegime() {
  const { data, error, isLoading } = useSWR<MarketRegimeData>(
    "market-regime",
    async () => {
      const res = await apiClient.getMarketRegime();
      return res.data;
    },
    {
      refreshInterval: 5 * 60 * 1000,
      revalidateOnFocus: false,
      dedupingInterval: 60 * 1000,
    },
  );

  return { regime: data, error, isLoading };
}
