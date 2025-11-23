import { UseCoinetDataParams, DataResult } from "../types";

/**
 * REST Adapter for historical and batch data
 * Uses CoinGecko public API as an example.
 * Extensible for multiple endpoints and data types.
 */
export async function fetchRestData<T = any>(
  params: UseCoinetDataParams
): Promise<DataResult<T>> {
  try {
    // Example: Fetch global market data
    const globalRes = await fetch("https://api.coingecko.com/api/v3/global");
    const global = await globalRes.json();
    // Example: Fetch trending coins
    const trendingRes = await fetch("https://api.coingecko.com/api/v3/search/trending");
    const trending = await trendingRes.json();
    // Example: Fetch BTC/ETH dominance (from global)
    const btcDominance = global.data.market_cap_percentage.btc;
    const ethDominance = global.data.market_cap_percentage.eth;
    // Example: Compose normalized data for MarketOverviewWidget
    const data: any = {
      globalMarketCap: `$${Number(global.data.total_market_cap.usd).toLocaleString()}`,
      volume24h: `$${Number(global.data.total_volume.usd).toLocaleString()}`,
      btcDominance: `${btcDominance.toFixed(1)}%`,
      ethDominance: `${ethDominance.toFixed(1)}%`,
      trending: trending.coins.slice(0, 5).map((c: any) => ({
        symbol: c.item.symbol,
        change: c.item.data?.price_change_percentage_24h?.usd
          ? `${c.item.data.price_change_percentage_24h.usd > 0 ? "+" : ""}${c.item.data.price_change_percentage_24h.usd.toFixed(1)}%`
          : "N/A",
      })),
      anomalies: [
        // Example anomaly
        { label: "Volume Spike", description: "Unusual 24h volume in SOL" },
      ],
      aiInsights:
        "Market is showing bullish momentum, led by BTC and SOL. Watch for potential regime change if ETH breaks resistance.",
    };
    return {
      state: "live",
      data,
      error: undefined,
      lastUpdated: new Date(),
      source: "rest",
      isLive: false,
      meta: {
        api: "CoinGecko",
        fetched: true,
      },
    };
  } catch (err: any) {
    return {
      state: "error",
      data: null,
      error: err,
      lastUpdated: new Date(),
      source: "rest",
      isLive: false,
      meta: {
        api: "CoinGecko",
        fetched: false,
      },
    };
  }
} 