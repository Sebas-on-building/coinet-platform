/**
 * CreateCryptoArticle.ts
 *
 * This is an example of how to use the CryptoNewsWriter to create
 * your own cryptocurrency news articles based on aggregated information
 * from trusted sources.
 */

import { CryptoNewsWriter } from "../tools/CryptoNewsWriter";

// Create a new instance of the CryptoNewsWriter
const writer = new CryptoNewsWriter("./my-crypto-articles");

// Example 1: Create an article about Bitcoin ETFs
async function createBitcoinETFArticle() {
  console.log("Creating article about Bitcoin ETFs...");

  const filePath = await writer.createArticle(
    "The Impact of Bitcoin ETFs on Institutional Adoption",
    "Bitcoin ETF approval",
    ["BTC", "ETH"],
  );

  console.log(`Article created and saved to: ${filePath}`);
}

// Example 2: Research a topic without creating a full article
async function researchEthereumUpgrade() {
  console.log("Researching Ethereum Shanghai upgrade...");

  const research = await writer.researchTopic("Ethereum Shanghai upgrade", {
    assets: ["ETH", "LDO", "RPL"],
    timeframeHours: 48,
    limit: 15,
  });

  console.log("Research Summary:");
  console.log(research.summary);

  console.log("\nKey Points:");
  research.keyPoints.forEach((point, index) => {
    console.log(`${index + 1}. ${point}`);
  });

  console.log("\nSources:");
  research.sources.forEach((source, index) => {
    console.log(`- ${source}`);
  });
}

// Example 3: Analyze market sentiment for a specific topic
async function analyzeMarketSentiment() {
  console.log("Analyzing market sentiment for Layer 2 scaling solutions...");

  const impact = await writer.researchMarketImpact(
    "Layer 2 scaling solutions",
    ["ETH", "MATIC", "ARBI", "OP"],
  );

  console.log(
    `Overall Sentiment: ${impact.overallSentiment} (${impact.sentimentScore.toFixed(2)})`,
  );

  console.log("\nImpact on Assets:");
  impact.keyAssets.forEach((asset) => {
    const sentiment =
      asset.sentiment > 0.2
        ? "bullish"
        : asset.sentiment < -0.2
          ? "bearish"
          : "neutral";
    console.log(
      `- ${asset.symbol}: ${sentiment} sentiment (${asset.sentiment.toFixed(2)}), mentioned in ${asset.mentions} news items`,
    );
  });
}

// Example 4: Create a custom article template and then edit it
async function createCustomArticle() {
  console.log("Creating a custom article about DeFi regulations...");

  // First, generate a template
  const template = await writer.generateArticleTemplate(
    "The Evolving Landscape of DeFi Regulations",
    "DeFi regulation compliance",
    ["UNI", "AAVE", "MKR", "COMP"],
  );

  // You could modify the template here if needed
  const customizedContent =
    template +
    "\n\n## Editor's Note\nThis article was created using the CryptoNewsWriter tool with data from multiple trusted sources.";

  // Save the customized article
  const filePath = await writer.saveArticle(
    "DeFi-Regulations-Analysis",
    customizedContent,
  );

  console.log(`Custom article saved to: ${filePath}`);
}

// Run all examples
async function runAllExamples() {
  try {
    await createBitcoinETFArticle();
    console.log("\n----------------------------\n");

    await researchEthereumUpgrade();
    console.log("\n----------------------------\n");

    await analyzeMarketSentiment();
    console.log("\n----------------------------\n");

    await createCustomArticle();
  } catch (error) {
    console.error("Error running examples:", error);
  }
}

// Execute the examples
runAllExamples();
