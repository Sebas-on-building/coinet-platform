import { NewsDigestGenerator } from "../tools/NewsDigestGenerator";
import { NewsImpactPredictor } from "../tools/NewsImpactPredictor";
import { NewsAggregationService } from "../services/news/NewsAggregationService";
import { NewsCorrelationService } from "../services/news/NewsCorrelationService";

/**
 * Example script demonstrating the advanced correlation analysis and impact prediction features
 */
async function main() {
  console.log("🚀 News Correlation and Impact Analysis Example");

  // Initialize services
  const digestGenerator = new NewsDigestGenerator("./outputs/digests");
  const impactPredictor = new NewsImpactPredictor();
  const newsService = NewsAggregationService.getInstance();

  // 1. Track recent news for correlation analysis
  console.log("\n📊 Tracking recent news for correlation analysis...");
  const trackedCount = await digestGenerator.trackNewsForCorrelation(48); // Track last 48 hours
  console.log(`Tracked ${trackedCount} news items for correlation analysis`);

  // 2. Generate a daily digest with correlation analysis
  console.log("\n📰 Generating daily digest with correlation analysis...");
  const featuredAssets = ["BTC", "ETH", "SOL", "XRP", "ADA"];
  const dailyDigestPath =
    await digestGenerator.createDailyDigestWithCorrelation(featuredAssets);
  console.log(
    `Daily digest with correlation analysis saved to: ${dailyDigestPath}`,
  );

  // 3. Analyze specific assets
  console.log("\n💹 Generating asset-specific impact analysis...");
  for (const asset of ["BTC", "ETH"]) {
    try {
      const assetAnalysisPath = await digestGenerator.createAssetImpactAnalysis(
        asset,
        72,
      );
      console.log(`${asset} impact analysis saved to: ${assetAnalysisPath}`);
    } catch (error) {
      console.error(`Error generating impact analysis for ${asset}:`, error);
    }
  }

  // 4. Get category correlations with price movements
  console.log("\n📈 Category price correlations:");
  const categoryCorrelations = impactPredictor.getCategoryCorrelations();

  categoryCorrelations.forEach((correlation) => {
    console.log(`\n${correlation.category.toUpperCase()}`);
    console.log(
      `- Correlation Score: ${correlation.correlation_score.toFixed(2)}`,
    );
    console.log(
      `- Avg 24h Price Impact: ${correlation.avg_price_impact["24h"].toFixed(2)}%`,
    );
    console.log(`- Sample Size: ${correlation.sample_size} events`);

    if (correlation.top_affected_assets.length > 0) {
      console.log("- Top Affected Assets:");
      correlation.top_affected_assets.forEach((asset) => {
        console.log(
          `  * ${asset.symbol}: ${asset.avg_impact.toFixed(2)}% impact (${(asset.reliability * 100).toFixed(0)}% reliability)`,
        );
      });
    }
  });

  // 5. Get asset-specific correlations
  console.log("\n🔍 Asset-specific category correlations for BTC:");
  const btcCorrelations = impactPredictor.getAssetCategoryCorrelations("BTC");

  btcCorrelations.forEach((correlation) => {
    console.log(
      `- ${correlation.category} news: ${correlation.avg_price_impact["24h"].toFixed(2)}% impact`,
    );
    console.log(
      `  (${correlation.sample_size} events, ${(correlation.correlation_score * 100).toFixed(0)}% correlation score)`,
    );
  });

  // 6. Analyze recent news group
  console.log("\n🧠 Analyzing recent news groups...");
  const recentNews = await newsService.searchNews("", { limit: 20 });

  if (recentNews.length > 0) {
    const analyzedGroups = await impactPredictor.analyzeNewsGroup(recentNews);

    analyzedGroups.forEach((group) => {
      console.log(
        `\n${group.category.toUpperCase()} News Group (${group.news_count} items):`,
      );

      // Print sentiment distribution
      console.log(
        "- Sentiment: " +
          `${(group.sentiment_distribution.bullish * 100).toFixed(0)}% bullish, ` +
          `${(group.sentiment_distribution.bearish * 100).toFixed(0)}% bearish, ` +
          `${(group.sentiment_distribution.neutral * 100).toFixed(0)}% neutral`,
      );

      // Print key assets
      if (group.key_assets.length > 0) {
        console.log("- Key Assets:");
        group.key_assets.slice(0, 3).forEach((asset) => {
          console.log(
            `  * ${asset.symbol}: ${asset.mentions} mentions, ${asset.avg_sentiment.toFixed(2)} sentiment`,
          );
        });
      }

      // Print predictions
      const prediction = group.predictions.overall_prediction;
      console.log(
        "- Overall Prediction: " +
          `${prediction.direction === "up" ? "Upward" : prediction.direction === "down" ? "Downward" : "Neutral"} ` +
          `movement of ~${prediction.expected_magnitude.toFixed(2)}% ` +
          `(${(prediction.confidence * 100).toFixed(0)}% confidence)`,
      );

      // Print asset predictions
      const assetPredictions = group.predictions.asset_predictions;
      if (Object.keys(assetPredictions).length > 0) {
        console.log("- Asset Predictions:");
        Object.entries(assetPredictions)
          .slice(0, 3)
          .forEach(([asset, data]) => {
            console.log(
              `  * ${asset}: ${data.direction} by ${data.expected_magnitude.toFixed(2)}% ` +
                `(${(data.confidence * 100).toFixed(0)}% confidence)`,
            );
          });
      }
    });
  } else {
    console.log("No recent news found for analysis");
  }

  console.log("\n✅ Example completed!");
}

// Run the example
main().catch((error) => {
  console.error("Error running example:", error);
  process.exit(1);
});
