import { useState, useEffect } from "react";

interface SearchResult {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
}

export function useCoinGeckoSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchCoins = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
        );
        const data = await response.json();

        setResults(
          data.coins.map((coin: any) => ({
            id: coin.id,
            name: coin.name,
            symbol: coin.symbol,
            thumb: coin.thumb,
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to search coins");
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchCoins, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [query]);

  return { results, loading, error };
}
