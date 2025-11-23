export interface MarketOverviewData {
  globalMarketCap: number;
  volume24h: number;
  btcDominance: number;
  ethDominance: number;
  trending: { symbol: string; change: number }[];
}

export async function getMarketOverview(): Promise<MarketOverviewData> {
  // Fetch global data from CoinGecko
  const globalRes = await fetch("https://api.coingecko.com/api/v3/global");
  const global = await globalRes.json();

  // Fetch trending coins
  const trendingRes = await fetch(
    "https://api.coingecko.com/api/v3/search/trending",
  );
  const trendingData = await trendingRes.json();

  return {
    globalMarketCap: global.data.total_market_cap.usd,
    volume24h: global.data.total_volume.usd,
    btcDominance: global.data.market_cap_percentage.btc,
    ethDominance: global.data.market_cap_percentage.eth,
    trending: trendingData.coins.slice(0, 3).map((c: any) => ({
      symbol: c.item.symbol,
      change: c.item.data?.price_change_percentage_24h?.usd ?? 0,
    })),
  };
}
