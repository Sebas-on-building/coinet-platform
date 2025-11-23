import { useEffect, useState } from "react";

interface PricePoint {
  time: number;
  value: number;
}

export function useCoinGeckoPriceHistory(coinId: string, days: number = 7) {
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coinId) return;
    setLoading(true);
    setError(null);
    fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=hourly`,
    )
      .then((res) => res.json())
      .then((data) => {
        setHistory(
          (data.prices || []).map(([time, value]: [number, number]) => ({
            time,
            value,
          })),
        );
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch price history");
        setLoading(false);
      });
  }, [coinId, days]);

  return { history, loading, error };
}
