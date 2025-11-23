import useSWR from "swr";

export interface OHLCVData {
  time: string;
  value: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Fetcher for CoinGecko OHLC endpoint (daily candles)
const fetchOHLCV = async (
  symbol: string,
  days: number = 30,
): Promise<OHLCVData[]> => {
  // CoinGecko uses ids, e.g. 'bitcoin', 'ethereum', 'solana'
  const id = symbol.toLowerCase();
  const url = `/api/ohlcv/${id}?days=${days}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch OHLCV data");
  // Data format: [timestamp, open, high, low, close]
  const data = await res.json();

  // Fetch volume data from market_chart endpoint
  const volUrl = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`;
  const volRes = await fetch(volUrl);
  if (!volRes.ok) throw new Error("Failed to fetch volume data");
  const volData = await volRes.json();
  // volData.total_volumes: [ [timestamp, volume], ... ]
  const volumeMap = new Map(
    volData.total_volumes.map(([ts, vol]: [number, number]) => [
      new Date(ts).toISOString().slice(0, 10),
      vol,
    ]),
  );

  return data.map((d: [number, number, number, number, number]) => {
    const date = new Date(d[0]).toISOString().slice(0, 10);
    return {
      time: date,
      value: d[4],
      open: d[1],
      high: d[2],
      low: d[3],
      close: d[4],
      volume: volumeMap.get(date) || 0,
    };
  });
};

export function useCryptoOHLCV(symbol: string, days: number = 30) {
  const { data, error, isLoading } = useSWR(
    [symbol, days],
    () => fetchOHLCV(symbol, days),
    {
      revalidateOnFocus: true,
      refreshInterval: 60000, // refresh every minute
    },
  );
  return {
    data,
    isLoading,
    error,
  };
}
