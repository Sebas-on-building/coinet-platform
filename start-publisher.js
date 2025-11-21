// Script to start the AutomatedNewsPublisher service

// Use dynamic import to load the TypeScript module
(async () => {
  try {
    // Import the module dynamically
    console.log("Importing AutomatedNewsPublisher module...");
    const { AutomatedNewsPublisher } = await import(
      "./src/tools/AutomatedNewsPublisher.js"
    );

    console.log("Starting Coinet AutomatedNewsPublisher...");

    // Create publisher instance
    const publisher = new AutomatedNewsPublisher(
      "./auto-generated-articles", // Directory to save articles
      "./publishing-config.json", // Configuration file
    );

    // Check if we have any endpoints configured, if not set up defaults
    const endpoints = publisher.getEndpoints();
    if (endpoints.length === 0) {
      console.log("No endpoints configured, setting up defaults...");

      // Add file-based publishing
      publisher.addEndpoint({
        name: "local-files",
        type: "file",
        enabled: true,
      });

      console.log("Default file endpoint configured");
    }

    // Check if we have any schedules configured, if not set up defaults
    const schedules = publisher.getSchedules();
    if (schedules.length === 0) {
      console.log("No schedules configured, setting up defaults...");

      // Daily article about Bitcoin market analysis
      publisher.addSchedule({
        id: "daily-bitcoin",
        title: "Bitcoin Daily Market Update",
        topic: "Bitcoin price analysis",
        assets: ["BTC", "ETH"],
        frequency: "daily",
        timeOfDay: "08:00", // Publish at 8:00 AM
        endpoints: ["local-files"],
        minNewsItems: 3,
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
        minNewsItems: 2,
        template: breakingNewsTemplate,
        enabled: true,
      });

      console.log("Default schedules configured");
    }

    // Publish a test article immediately to verify setup
    console.log("Publishing a test article...");
    const testResult = await publisher.publishNow("daily-bitcoin");

    if (testResult) {
      console.log(`Test article "${testResult.title}" published successfully!`);
      console.log(`Saved to: ${testResult.filePath}`);
    } else {
      console.log("Unable to publish test article. Check your configuration.");
    }

    // Start the publisher service
    console.log("Starting automated publishing service...");
    publisher.start();
    console.log("Automated publishing service is now running!");
    console.log("Press Ctrl+C to stop the service");

    // Keep the process running
    process.stdin.resume();

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.log("Stopping automated publishing service...");
      publisher.stop();
      console.log("Service stopped.");
      process.exit(0);
    });
  } catch (error) {
    console.error("Error starting the publisher:", error);
  }
})();
