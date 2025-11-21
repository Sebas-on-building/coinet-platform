/**
 * AutomatedNewsPublishing.ts
 *
 * This example demonstrates how to use the AutomatedNewsPublisher
 * to automatically create and publish cryptocurrency news articles
 * based on aggregated information from trusted sources.
 */

import { AutomatedNewsPublisher } from "../tools/AutomatedNewsPublisher";

// Create a new instance of AutomatedNewsPublisher
const publisher = new AutomatedNewsPublisher(
  "./auto-generated-articles", // Directory to save articles
  "./publishing-config.json", // Configuration file
);

// Example 1: Configure publishing endpoints
async function configureEndpoints() {
  console.log("Configuring publishing endpoints...");

  // Add file-based publishing (default)
  publisher.addEndpoint({
    name: "local-files",
    type: "file",
    enabled: true,
  });

  // Add webhook endpoint (e.g., for Discord, Slack, or your custom platform)
  publisher.addEndpoint({
    name: "webhook",
    type: "webhook",
    url: "https://your-webhook-url.com/crypto-news",
    headers: {
      "X-Custom-Header": "YourCustomValue",
    },
    enabled: false, // Disabled until you add a real URL
  });

  // Add Medium.com publishing endpoint
  publisher.addEndpoint({
    name: "medium",
    type: "medium",
    url: "https://api.medium.com/v1/users/YOUR_USER_ID/posts",
    apiKey: "YOUR_MEDIUM_API_KEY",
    enabled: false, // Disabled until you add real credentials
  });

  console.log("Publishing endpoints configured");
}

// Example 2: Set up scheduled articles
async function setupScheduledArticles() {
  console.log("Setting up article publishing schedules...");

  // Daily article about Bitcoin market analysis
  publisher.addSchedule({
    id: "daily-bitcoin",
    title: "Bitcoin Daily Market Update",
    topic: "Bitcoin price analysis",
    assets: ["BTC", "ETH"],
    frequency: "daily",
    timeOfDay: "08:00", // Publish at 8:00 AM
    endpoints: ["local-files"],
    minNewsItems: 3, // Only publish if at least 3 new articles are available
    enabled: true,
  });

  // Weekly article about DeFi developments
  publisher.addSchedule({
    id: "weekly-defi",
    title: "This Week in DeFi",
    topic: "DeFi ecosystem developments",
    assets: ["UNI", "AAVE", "MKR", "COMP"],
    frequency: "weekly",
    dayOfWeek: 1, // Monday
    timeOfDay: "10:00", // Publish at 10:00 AM
    endpoints: ["local-files"],
    enabled: true,
  });

  // Hourly article for breaking news (with custom template)
  const breakingNewsTemplate = `# {{title}}

**Date:** {{date}}

## Breaking News Update

{{summary}}

## Key Developments

{{keyPoints}}

## Market Impact

Overall market sentiment: **{{sentiment}}** (Score: {{sentimentScore}})

### Asset Impact

{{assetImpact}}

## Sources

{{sources}}
`;

  publisher.addSchedule({
    id: "breaking-news",
    title: "Crypto Breaking News",
    topic: "cryptocurrency breaking news",
    assets: ["BTC", "ETH", "BNB", "XRP", "SOL"],
    frequency: "hourly",
    endpoints: ["local-files"],
    minNewsItems: 2, // Only publish if at least 2 new important news items
    template: breakingNewsTemplate,
    enabled: true,
  });

  console.log("Article schedules configured");
}

// Example 3: Start the automated publishing
async function startPublishing() {
  console.log("Starting automated news publishing...");

  // Start the publishing service
  publisher.start();

  console.log("Automated publishing started");
  console.log(
    "The service will now run in the background, checking schedules and publishing articles",
  );
}

// Example 4: Force publish an article immediately
async function publishArticleNow() {
  console.log("Force publishing an article immediately...");

  const result = await publisher.publishNow("daily-bitcoin");

  if (result) {
    console.log(`Article published successfully: ${result.title}`);
    console.log(`Saved to: ${result.filePath}`);
    console.log(
      `Published to ${result.endpoints.filter((e) => e.success).length} endpoints`,
    );
  } else {
    console.log("Failed to publish article (schedule not found or disabled)");
  }
}

// Example 5: Get publishing history
function viewPublishingHistory() {
  console.log("Recent publishing history:");

  const history = publisher.getPublishingHistory(5); // Get last 5 publications

  history.forEach((record, index) => {
    console.log(`${index + 1}. "${record.title}" (${record.publishDate})`);
    console.log(`   File: ${record.filePath}`);
    console.log(
      `   Endpoints: ${record.endpoints.filter((e) => e.success).length} successful, ${record.endpoints.filter((e) => !e.success).length} failed`,
    );
    console.log("");
  });
}

// Run all examples
async function runDemo() {
  try {
    await configureEndpoints();
    console.log("\n----------------------------\n");

    await setupScheduledArticles();
    console.log("\n----------------------------\n");

    // Generate a test article immediately
    await publishArticleNow();
    console.log("\n----------------------------\n");

    // Start the automated publishing service
    await startPublishing();
    console.log("\n----------------------------\n");

    // View publishing history after publishing a test article
    viewPublishingHistory();

    // Keep the process running to allow the service to continue publishing
    console.log("\nThe service is now running in the background.");
    console.log("Press Ctrl+C to stop the service");

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.log("Stopping automated publishing service...");
      publisher.stop();
      console.log("Service stopped.");
      process.exit(0);
    });

    // Keep the process alive
    setInterval(() => {}, 1000);
  } catch (error) {
    console.error("Error running demo:", error);
  }
}

// Run the demo
runDemo();
