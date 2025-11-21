export async function getDeepHistoricalStats(coinId: string): Promise<any> {
  // Placeholder: Use real APIs for CoinGecko, Messari, on-chain, etc. in production
  const now = new Date();
  const days = Array.from(
    { length: 30 },
    (_, i) => new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000),
  );
  const priceHistory = days.map((d, i) => ({
    date: d.toISOString(),
    value: 20000 + i * 200 + (i % 5 === 0 ? 1000 : 0),
  }));
  const volumeHistory = days.map((d, i) => ({
    date: d.toISOString(),
    value: 10000000 + i * 100000,
  }));
  const marketCapHistory = days.map((d, i) => ({
    date: d.toISOString(),
    value: 400000000 + i * 5000000,
  }));
  const onChainHistory = days.map((d, i) => ({
    date: d.toISOString(),
    activeAddresses: 100000 + i * 1000,
    transactions: 50000 + i * 500,
  }));
  const events = [
    { date: days[5].toISOString(), type: "upgrade", label: "Network Upgrade" },
    { date: days[15].toISOString(), type: "news", label: "ETF Approval" },
    { date: days[25].toISOString(), type: "fork", label: "Chain Fork" },
  ];
  const anomalies = [
    {
      metric: "price",
      description: "Price spike detected",
      date: days[15].toISOString(),
    },
    {
      metric: "activeAddresses",
      description: "On-chain activity surge",
      date: days[25].toISOString(),
    },
  ];
  return {
    priceHistory,
    volumeHistory,
    marketCapHistory,
    onChainHistory,
    events,
    anomalies,
    aiExplainer:
      "Historical data shows strong growth, with notable spikes during major events. On-chain activity correlates with price surges.",
    qna: [],
    lastUpdated: now.toISOString(),
    definition:
      "Aggregated historical data from CoinGecko, Messari, and on-chain. Includes price, volume, market cap, on-chain metrics, and event overlays.",
  };
}
