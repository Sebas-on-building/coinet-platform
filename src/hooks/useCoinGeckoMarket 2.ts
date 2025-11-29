import { useState, useEffect } from "react";

interface Coin {
  id: string;
  name: string;
  symbol: string;
  image: string;
  market_cap_rank: number;
}

interface GlobalData {
  total_market_cap: number;
  total_volume: number;
  btc_dominance: number;
}

export function useCoinGeckoMarket() {
  const [trending, setTrending] = useState<Coin[]>([]);
  const [global, setGlobal] = useState<GlobalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch trending coins
        const trendingRes = await fetch(
          "https://api.coingecko.com/api/v3/search/trending",
        );
        const trendingData = await trendingRes.json();
        setTrending(
          trendingData.coins.map((coin: any) => ({
            id: coin.item.id,
            name: coin.item.name,
            symbol: coin.item.symbol,
            image: coin.item.large,
            market_cap_rank: coin.item.market_cap_rank,
          })),
        );

        // Fetch global data
        const globalRes = await fetch(
          "https://api.coingecko.com/api/v3/global",
        );
        const globalData = await globalRes.json();
        setGlobal({
          total_market_cap: globalData.data.total_market_cap.usd,
          total_volume: globalData.data.total_volume.usd,
          btc_dominance: globalData.data.market_cap_percentage.btc,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch market data",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  return { trending, global, loading, error };
}
