import { useEffect, useState } from "react";

interface Stats {
  high: number;
  low: number;
  volume: number;
}

export function useCoinGeckoStats(id = "bitcoin", vs = "usd") {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    let isMounted = true;
    fetch(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=${vs}&days=1`,
    )
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        const prices = data.prices.map((p: any) => p[1]);
        const volumes = data.total_volumes.map((v: any) => v[1]);
        setStats({
          high: Math.max(...prices),
          low: Math.min(...prices),
          volume: Math.max(...volumes),
        });
      });
    return () => {
      isMounted = false;
    };
  }, [id, vs]);
  return stats;
}
