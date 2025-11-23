import axios from "axios";
import { getOnChainStats } from "./onchain";
import { getSocialStats } from "./social";
import { getDevStats } from "./dev";
import { getCoinNews } from "./news";
import { getDeFiStats } from "./defi";
import { getAiInsights } from "./ai";
import { getCommunityData } from "./community";

// Types for extensibility
export interface CoinProfile {
  id: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  marketData: any;
  onChainStats: any;
  social: any;
  dev: any;
  news: any;
  tokenomics: any;
  defi: any;
  historical: any;
  community: any;
  aiSummary: string;
  aiInsights: any;
}

// Main function to get all data for a coin
export async function getCoinProfile(coinId: string): Promise<CoinProfile> {
  // 1. CoinGecko for market data, description, image
  const cg = await axios.get(
    `https://api.coingecko.com/api/v3/coins/${coinId}`,
  );
  // 2. On-chain stats
  const onChainStats = await getOnChainStats(coinId);
  const social = await getSocialStats(coinId);
  const dev = await getDevStats(coinId);
  const news = await getCoinNews(coinId);
  const defi = await getDeFiStats(coinId);
  const aiInsights = await getAiInsights(coinId);
  const community = await getCommunityData(coinId);
  // 2. Messari for fundamentals (scaffold)
  // const messari = await axios.get(`https://data.messari.io/api/v1/assets/${coinId}/profile`);
  // 3. DeFiLlama for DeFi stats (scaffold)
  // const defi = await axios.get(`https://api.llama.fi/protocol/${coinId}`);
  // 4. Glassnode for on-chain metrics (scaffold)
  // 5. Etherscan for contract info (scaffold)
  // 6. GitHub for dev activity (scaffold)
  // 7. Twitter/social for sentiment (scaffold)
  // 8. News (scaffold)
  // 9. AI summary (placeholder)

  return {
    id: cg.data.id,
    name: cg.data.name,
    symbol: cg.data.symbol,
    description: cg.data.description?.en || "",
    image: cg.data.image?.large || "",
    marketData: cg.data.market_data,
    onChainStats,
    social,
    dev,
    news,
    tokenomics: cg.data.market_data, // Placeholder
    defi,
    historical: {}, // TODO: Historical price/volume
    community,
    aiSummary: aiInsights.summary,
    aiInsights,
  };
}

// Extensibility: Add more data sources, AI, and community hooks as needed.
