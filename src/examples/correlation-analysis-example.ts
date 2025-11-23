import { NewsItem } from "../types/news";
import { NewsCorrelationService } from "../services/news/NewsCorrelationService";
import {
  NewsImpactPredictor,
  AnalyzedNewsGroup,
} from "../tools/NewsImpactPredictor";
import { NewsAggregationService } from "../services/news/NewsAggregationService";
import { NewsDigestGenerator } from "../tools/NewsDigestGenerator";
import fs from "fs";
import path from "path";

/**
 * Example script demonstrating the enhanced correlation analysis and
 * market impact prediction features
 */
async function runCorrelationAnalysisExample() {
  console.log("Starting Correlation Analysis Example");
  console.log("=====================================\n");

  // Initialize services
  const newsService = NewsAggregationService.getInstance();
  const correlationService = NewsCorrelationService.getInstance();
  const impactPredictor = new NewsImpactPredictor();
  const digestGenerator = new NewsDigestGenerator("./examples/output");

  try {
    // 1. Get recent news items for analysis
    console.log("1. Fetching recent crypto news...");
    const recentNews = await newsService.searchNews("crypto", { limit: 10 });
    console.log(`   Found ${recentNews.length} news items\n`);

    // 2. Analyze historical correlations for a category
    console.log(
      '2. Analyzing historical correlations for "Regulation" category...',
    );
    const categoryCorrelations = correlationService
      .getCategoryCorrelations()
      .find((c) => c.category === "regulation");

    if (categoryCorrelations) {
      console.log("   Historical correlation statistics:");
      console.log(
        `   - Average correlation: ${categoryCorrelations.avg_correlation.toFixed(2)}`,
      );
      console.log(`   - Sample size: ${categoryCorrelations.count} events`);
      console.log("   - Average price impact by timeframe:");

      Object.entries(categoryCorrelations.avg_price_impact).forEach(
        ([timeframe, impact]) => {
          console.log(`     * ${timeframe}: ${impact.toFixed(2)}%`);
        },
      );

      console.log("   - Top affected assets:");
      Object.entries(categoryCorrelations.top_assets)
        .slice(0, 5)
        .forEach(([asset, data]) => {
          console.log(
            `     * ${asset}: ${data.avg_impact.toFixed(2)}% (reliability: ${(data.count / categoryCorrelations.count).toFixed(2)})`,
          );
        });
      console.log();
    } else {
      console.log("   No correlation data found for regulation category\n");
    }

    // 3. Basic impact prediction for a single news item
    console.log("3. Predicting market impact for a single news item...");
    const sampleNews: NewsItem = recentNews[0] || createSampleNewsItem();
    console.log(`   News: "${sampleNews.title}"`);

    const prediction = correlationService.predictNewsImpact(sampleNews);
    console.log("   Basic impact prediction:");
    console.log(
      `   - Overall direction: ${prediction.overall_prediction.direction}`,
    );
    console.log(
      `   - Confidence: ${(prediction.overall_prediction.confidence * 100).toFixed(1)}%`,
    );
    console.log(
      `   - Expected magnitude: ${prediction.overall_prediction.expected_magnitude.toFixed(2)}%`,
    );
    console.log(`   - Timeframe: ${prediction.overall_prediction.timeframe}`);

    if (Object.keys(prediction.asset_predictions).length > 0) {
      console.log("   - Asset-specific predictions:");
      Object.entries(prediction.asset_predictions).forEach(([asset, data]) => {
        console.log(
          `     * ${asset}: ${data.direction} ${data.expected_magnitude.toFixed(2)}% (confidence: ${(data.confidence * 100).toFixed(1)}%)`,
        );
      });
    }
    console.log();

    // 4. Enhanced prediction with market context
    console.log("4. Enhanced prediction with current market context...");
    const enhancedPrediction =
      await impactPredictor.predictImpactWithContext(sampleNews);

    console.log("   Market context analysis:");
    console.log(
      `   - Current market sentiment: ${enhancedPrediction.market_context_analysis.current_market_sentiment}`,
    );
    console.log(
      `   - Volatility factor: ${enhancedPrediction.market_context_analysis.volatility_factor.toFixed(2)}`,
    );
    console.log(
      `   - Market condition adjustment: ${enhancedPrediction.market_context_analysis.market_condition_adjustment.toFixed(2)}`,
    );
    console.log(
      `   - Liquidity impact: ${enhancedPrediction.market_context_analysis.liquidity_impact}`,
    );

    console.log("   Adjusted impact prediction:");
    console.log(
      `   - Overall direction: ${enhancedPrediction.overall_prediction.direction}`,
    );
    console.log(
      `   - Adjusted confidence: ${(enhancedPrediction.overall_prediction.confidence * 100).toFixed(1)}%`,
    );
    console.log(
      `   - Adjusted magnitude: ${enhancedPrediction.overall_prediction.expected_magnitude.toFixed(2)}%`,
    );
    console.log("   - Sector trends affecting prediction:");

    const sectorTrends = enhancedPrediction.market_context_analysis
      .sector_trends as {
      [sector: string]: {
        trend: "up" | "down" | "neutral";
        strength: number;
      };
    };

    Object.entries(sectorTrends)
      .slice(0, 3)
      .forEach(([sector, data]) => {
        console.log(
          `     * ${sector}: ${data.trend} (strength: ${(data.strength * 100).toFixed(1)}%)`,
        );
      });
    console.log();

    // 5. Analyze a group of related news
    console.log("5. Analyzing a group of related news...");
    const relatedNews = await newsService.searchNews("ethereum", { limit: 5 });
    console.log(`   Found ${relatedNews.length} Ethereum-related news items`);

    const analyzedGroups = await impactPredictor.analyzeNewsGroup(relatedNews);
    if (analyzedGroups.length > 0) {
      const firstGroup = analyzedGroups[0];

      console.log("   Group analysis results:");
      console.log(`   - Category: ${firstGroup.category}`);
      console.log(`   - News count: ${firstGroup.news_count}`);
      console.log("   - Sentiment distribution:");
      Object.entries(firstGroup.sentiment_distribution).forEach(
        ([sentiment, value]) => {
          console.log(`     * ${sentiment}: ${(value * 100).toFixed(1)}%`);
        },
      );

      console.log("   - Key assets mentioned:");
      firstGroup.key_assets.slice(0, 3).forEach((asset) => {
        console.log(
          `     * ${asset.symbol}: ${asset.mentions} mentions (avg sentiment: ${asset.avg_sentiment.toFixed(2)})`,
        );
      });

      console.log("   - Price predictions:");
      console.log(
        `     * Overall: ${firstGroup.predictions.overall_prediction.direction} ${firstGroup.predictions.overall_prediction.expected_magnitude.toFixed(2)}% (${firstGroup.predictions.overall_prediction.timeframe})`,
      );

      Object.entries(firstGroup.predictions.asset_predictions)
        .slice(0, 3)
        .forEach(([asset, prediction]) => {
          console.log(
            `     * ${asset}: ${prediction.direction} ${prediction.expected_magnitude.toFixed(2)}%, expected price: $${prediction.expected_price.toFixed(2)} (confidence: ${(prediction.confidence * 100).toFixed(1)}%)`,
          );
        });

      if (
        firstGroup.predictions.supporting_events &&
        firstGroup.predictions.supporting_events.length > 0
      ) {
        console.log("   - Supporting historical events:");
        firstGroup.predictions.supporting_events
          .slice(0, 2)
          .forEach((event) => {
            console.log(
              `     * "${event.title}" (similarity: ${(event.similarity_score * 100).toFixed(1)}%)`,
            );
            console.log(`       Impact: ${event.actual_impact}`);
          });
      }
    } else {
      console.log("   No analysis groups generated");
    }
    console.log();

    // 6. Generate digest with correlation analysis
    console.log("6. Generating news digest with correlation analysis...");
    const digestPath = await digestGenerator.generateDigestWithCorrelation({
      title: "Crypto Market Digest with Correlation Analysis",
      timeframeHours: 24,
      maxItemsPerCategory: 3,
      includeCategories: ["market", "regulatory", "technology"],
      includeSummaryBullets: true,
      includeMarketImpact: true,
      minImportance: 0.4,
      featuredAssets: ["BTC", "ETH", "SOL"],
    });

    console.log(`   Digest generated and saved to: ${digestPath}`);
    console.log();

    console.log("Example completed successfully!");
  } catch (error) {
    console.error("Error in correlation analysis example:", error);
  }
}

/**
 * Create a sample news item for testing when no real news is available
 */
function createSampleNewsItem(): NewsItem {
  return {
    id: "sample-news-1",
    title: "SEC Approves Spot Ethereum ETF Applications",
    content:
      "The Securities and Exchange Commission has approved applications for spot Ethereum ETFs, allowing institutional investors direct exposure to the second-largest cryptocurrency by market cap. This approval comes after months of speculation and follows the successful launch of Bitcoin ETFs earlier this year. Market analysts expect this development to bring significant institutional capital into the Ethereum ecosystem.",
    summary:
      "SEC approves spot Ethereum ETF applications, potentially bringing institutional investment to ETH.",
    url: "https://example.com/news/sec-approves-eth-etf",
    source: "Crypto News Daily",
    author: "Jane Smith",
    published_at: new Date().toISOString(),
    category: "regulatory",
    subcategories: ["etf", "ethereum", "sec", "regulation"],
    impact: {
      market_sentiment: "bullish",
      affected_assets: ["ETH", "ETC", "UNI", "AAVE"],
      importance: 0.85,
      score: 0.76,
      credibility: 0.9,
      volatility_change: 0.2,
    },
    verification_status: "verified",
    images: [],
  };
}

// Run the example
runCorrelationAnalysisExample().catch(console.error);

export { runCorrelationAnalysisExample };
