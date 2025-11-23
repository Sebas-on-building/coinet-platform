/**
 * TrustedNewsSourcesDemo.ts
 *
 * This file demonstrates how to use the enhanced NewsAggregationService
 * with multiple trusted news sources including:
 * - Cointelegraph
 * - Crypto.news
 * - Whale Alert (Twitter/X)
 * - CryptoQuant (Twitter/X)
 * - Glassnode Alerts (Twitter/X)
 * - Santiment (Twitter/X)
 * - Radar Hits (Twitter/X)
 * - CoinDesk
 * - CryptoCompare
 */

import { NewsAggregationService } from "../services/news/NewsAggregationService";
import { NewsItem } from "../types/news";

// Create a configuration that specifies which sources to use
const config = {
  enabledSources: [
    "cointelegraph", // Cointelegraph RSS feed
    "crypto-news", // Crypto.news RSS feed
    "coindesk", // CoinDesk RSS feed
    "cryptocompare", // CryptoCompare API
    "whale-alert", // Whale Alert Twitter feed
    "cryptoquant", // CryptoQuant Twitter feed
    "glassnode-alerts", // Glassnode Alerts Twitter feed
    "santiment", // Santiment Twitter feed
    "radar-hits", // Radar Hits Twitter feed
  ],
  cacheDuration: 5 * 60 * 1000, // 5 minutes
  maxCacheItems: 1000,
  apiKeys: {
    cryptocompare: process.env.CRYPTOCOMPARE_API_KEY || "",
    twitter: process.env.TWITTER_API_KEY || "",
  },
};

// Initialize the news service
const newsService = NewsAggregationService.getInstance(config);

/**
 * Fetch and display the latest news from all sources
 */
async function displayLatestNews() {
  try {
    console.log("Fetching latest news from all trusted sources...");
    const latestNews = await newsService.fetchNews({ limit: 20 });

    console.log(
      `Retrieved ${latestNews.length} news items from trusted sources`,
    );
    displayNewsItems(latestNews);
  } catch (error) {
    console.error("Error fetching latest news:", error);
  }
}

/**
 * Fetch news about a specific cryptocurrency
 */
async function displayAssetNews(assetSymbol: string) {
  try {
    console.log(`Fetching news for ${assetSymbol}...`);
    const assetNews = await newsService.getAssetNews(assetSymbol, {
      limit: 10,
    });

    console.log(
      `Retrieved ${assetNews.length} news items about ${assetSymbol}`,
    );
    displayNewsItems(assetNews);
  } catch (error) {
    console.error(`Error fetching ${assetSymbol} news:`, error);
  }
}

/**
 * Fetch news from a specific source
 */
async function displaySourceNews(sourceId: string) {
  try {
    console.log(`Fetching news from ${sourceId}...`);
    const sourceNews = await newsService.fetchNews({
      sources: [sourceId],
      limit: 10,
    });

    console.log(`Retrieved ${sourceNews.length} news items from ${sourceId}`);
    displayNewsItems(sourceNews);
  } catch (error) {
    console.error(`Error fetching news from ${sourceId}:`, error);
  }
}

/**
 * Fetch high-impact market news
 */
async function displayHighImpactMarketNews() {
  try {
    console.log("Fetching high-impact market news...");
    const marketNews = await newsService.fetchNews({
      categories: ["market"],
      sortBy: "impact",
      limit: 10,
    });

    console.log(`Retrieved ${marketNews.length} high-impact market news items`);
    displayNewsItems(marketNews);
  } catch (error) {
    console.error("Error fetching high-impact market news:", error);
  }
}

/**
 * Display formatted news items
 */
function displayNewsItems(newsItems: NewsItem[]) {
  console.log("\n=========================================");

  newsItems.forEach((item, index) => {
    console.log(`\n[${index + 1}] ${item.title}`);
    console.log(
      `Source: ${item.source} (${new Date(item.published_at).toLocaleString()})`,
    );
    console.log(`Category: ${item.category}`);
    console.log(
      `Impact Score: ${item.impact.score.toFixed(2)} (${item.impact.market_sentiment})`,
    );
    console.log(`Affected Assets: ${item.impact.affected_assets.join(", ")}`);
    console.log(`URL: ${item.url}`);

    if (item.social_metrics.total_engagement > 0) {
      console.log(
        `Social Engagement: ${item.social_metrics.total_engagement} interactions`,
      );
    }

    console.log(`Summary: ${item.summary}`);
    console.log("------------------------------------------");
  });
}

/**
 * Main function to run the demo
 */
async function runDemo() {
  // Check which sources are available
  const sources = newsService.getAvailableSources();
  console.log("Available news sources:");
  sources.forEach((source) => {
    console.log(
      `- ${source.name} (${source.category}, reliability: ${(source.reliability * 100).toFixed(0)}%)`,
    );
  });
  console.log("\n");

  // Display latest news from all sources
  await displayLatestNews();

  // Display news for Bitcoin
  await displayAssetNews("BTC");

  // Display news from Whale Alert
  await displaySourceNews("whale-alert");

  // Display high-impact market news
  await displayHighImpactMarketNews();
}

// Run the demo
runDemo().catch((error) => {
  console.error("An error occurred in the demo:", error);
});
