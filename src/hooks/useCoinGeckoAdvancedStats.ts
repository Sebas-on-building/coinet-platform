import { useState, useEffect } from "react";

interface CoinStats {
  id: string;
  name: string;
  symbol: string;
  image: string;
  price_change_percentage_24h: number;
}

export function useCoinGeckoAdvancedStats() {
  const [gainers, setGainers] = useState<CoinStats[]>([]);
  const [losers, setLosers] = useState<CoinStats[]>([]);
  const [recent, setRecent] = useState<CoinStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch top 100 coins by market cap
        const response = await fetch(
          "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h",
        );
        const data = await response.json();

        // Process data
        const sortedByChange = [...data].sort(
          (a, b) =>
            b.price_change_percentage_24h - a.price_change_percentage_24h,
        );
        const sortedByDate = [...data].sort(
          (a, b) =>
            new Date(b.genesis_date || 0).getTime() -
            new Date(a.genesis_date || 0).getTime(),
        );

        setGainers(
          sortedByChange.slice(0, 5).map((coin) => ({
            id: coin.id,
            name: coin.name,
            symbol: coin.symbol,
            image: coin.image,
            price_change_percentage_24h: coin.price_change_percentage_24h,
          })),
        );

        setLosers(
          sortedByChange
            .reverse()
            .slice(0, 5)
            .map((coin) => ({
              id: coin.id,
              name: coin.name,
              symbol: coin.symbol,
              image: coin.image,
              price_change_percentage_24h: coin.price_change_percentage_24h,
            })),
        );

        setRecent(
          sortedByDate.slice(0, 5).map((coin) => ({
            id: coin.id,
            name: coin.name,
            symbol: coin.symbol,
            image: coin.image,
            price_change_percentage_24h: coin.price_change_percentage_24h,
          })),
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch advanced stats",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  return { gainers, losers, recent, loading, error };
}
