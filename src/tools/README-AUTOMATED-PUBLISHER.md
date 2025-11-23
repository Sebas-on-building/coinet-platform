# Automated Crypto News Publisher

The Automated Crypto News Publisher extends the [Crypto News Writer](./README-CRYPTO-WRITER.md) to automatically write and publish cryptocurrency news articles based on aggregated information from multiple trusted sources. It can run on a schedule, publish to different platforms, and ensure a consistent flow of high-quality content.

## Features

- **Scheduled Publishing**: Configure articles to be published hourly, daily, weekly, or at custom intervals
- **Multiple Publishing Platforms**: Publish to files, webhooks, APIs, Medium, Substack, Ghost, and more
- **Dynamic Content Generation**: Articles are created based on the latest information from trusted sources
- **Market Impact Analysis**: Includes sentiment analysis and impact on specific cryptocurrencies
- **Customizable Templates**: Use pre-defined templates or create your own with variables
- **Intelligent Publishing**: Only publish when there's enough new information available
- **Publishing History**: Track what has been published, when, and where

## Getting Started

### Basic Setup

```typescript
import { AutomatedNewsPublisher } from "./tools/AutomatedNewsPublisher";

// Create a publisher instance
const publisher = new AutomatedNewsPublisher(
  "./my-published-articles", // Where to save articles
  "./publishing-config.json", // Configuration file
);

// Configure publishing endpoints
publisher.addEndpoint({
  name: "local-files",
  type: "file",
  enabled: true,
});

// Configure scheduled articles
publisher.addSchedule({
  id: "daily-bitcoin",
  title: "Bitcoin Daily Market Update",
  topic: "Bitcoin price analysis",
  assets: ["BTC", "ETH"],
  frequency: "daily",
  timeOfDay: "08:00", // Publish at 8:00 AM
  endpoints: ["local-files"],
  enabled: true,
});

// Start the automated publishing service
publisher.start();
```

## Publishing Endpoints

The system supports multiple publishing platforms:

### File-based Publishing

```typescript
publisher.addEndpoint({
  name: "files",
  type: "file",
  enabled: true,
});
```

### Webhook Publishing (e.g., Discord, Slack)

```typescript
publisher.addEndpoint({
  name: "discord",
  type: "webhook",
  url: "https://discord.com/api/webhooks/your-webhook-url",
  headers: { "Content-Type": "application/json" },
  enabled: true,
});
```

### Medium.com Publishing

```typescript
publisher.addEndpoint({
  name: "medium",
  type: "medium",
  url: "https://api.medium.com/v1/users/YOUR_USER_ID/posts",
  apiKey: "YOUR_MEDIUM_API_KEY",
  enabled: true,
});
```

### Substack Publishing

```typescript
publisher.addEndpoint({
  name: "substack",
  type: "substack",
  url: "https://substack.com/api/v1/publication/YOUR_PUBLICATION/posts",
  apiKey: "YOUR_SUBSTACK_API_KEY",
  enabled: true,
});
```

### Ghost CMS Publishing

```typescript
publisher.addEndpoint({
  name: "ghost",
  type: "ghost",
  url: "https://your-ghost-blog.com",
  apiKey: "YOUR_GHOST_ADMIN_API_KEY",
  enabled: true,
});
```

### Custom API Endpoint

```typescript
publisher.addEndpoint({
  name: "custom-api",
  type: "api",
  url: "https://your-custom-api.com/publish",
  apiKey: "YOUR_API_KEY",
  headers: {
    "X-Custom-Header": "CustomValue",
  },
  enabled: true,
});
```

## Article Scheduling

### Daily Articles

```typescript
publisher.addSchedule({
  id: "daily-market-update",
  title: "Crypto Market Daily Update",
  topic: "cryptocurrency market overview",
  assets: ["BTC", "ETH", "BNB", "SOL", "ADA"],
  frequency: "daily",
  timeOfDay: "16:30", // Publish at 4:30 PM
  endpoints: ["files", "medium"],
  enabled: true,
});
```

### Weekly Articles

```typescript
publisher.addSchedule({
  id: "weekly-defi-review",
  title: "This Week in DeFi",
  topic: "DeFi ecosystem developments",
  assets: ["UNI", "AAVE", "MKR", "COMP", "CRV"],
  frequency: "weekly",
  dayOfWeek: 5, // Friday (0 = Sunday, 1 = Monday, ...)
  timeOfDay: "12:00", // Publish at 12:00 PM
  endpoints: ["files", "substack", "ghost"],
  enabled: true,
});
```

### Hourly Updates for Breaking News

```typescript
publisher.addSchedule({
  id: "breaking-news",
  title: "Crypto Breaking News",
  topic: "cryptocurrency breaking news",
  assets: ["BTC", "ETH", "XRP"],
  frequency: "hourly",
  endpoints: ["files", "discord"],
  minNewsItems: 2, // Only publish if there are at least 2 new important items
  enabled: true,
});
```

### Custom Intervals

```typescript
publisher.addSchedule({
  id: "altcoin-review",
  title: "Altcoin Market Review",
  topic: "altcoin market analysis",
  assets: ["DOGE", "SHIB", "DOT", "AVAX", "MATIC"],
  frequency: "custom",
  customIntervalHours: 6, // Every 6 hours
  endpoints: ["files"],
  enabled: true,
});
```

## Custom Templates

You can create custom templates with variables that will be replaced with actual data:

```typescript
const customTemplate = `# {{title}}

**Date:** {{date}}

## Market Overview

{{summary}}

## Key Developments

{{keyPoints}}

## Market Sentiment

The overall sentiment for {{assets}} is currently **{{sentiment}}** with a score of {{sentimentScore}}.

### Impact on Assets

{{assetImpact}}

## Sources and References

{{sources}}

---
*This article was auto-generated based on data from trusted cryptocurrency news sources.*
`;

publisher.addSchedule({
  id: "custom-report",
  title: "Comprehensive Crypto Report",
  topic: "cryptocurrency market trends",
  assets: ["BTC", "ETH", "SOL", "BNB"],
  frequency: "daily",
  template: customTemplate,
  endpoints: ["files", "medium"],
  enabled: true,
});
```

## Manual Publishing

You can also trigger the publishing of any configured article manually:

```typescript
// Publish a specific article right now
const result = await publisher.publishNow("daily-market-update");

if (result) {
  console.log(`Article published: ${result.title}`);
  console.log(`Saved to: ${result.filePath}`);
}
```

## Publishing History

You can retrieve the publishing history to see what has been published:

```typescript
// Get the last 10 published articles
const history = publisher.getPublishingHistory(10);

history.forEach((item) => {
  console.log(
    `"${item.title}" published on ${new Date(item.publishDate).toLocaleString()}`,
  );
  console.log(
    `Published to: ${item.endpoints
      .filter((e) => e.success)
      .map((e) => e.name)
      .join(", ")}`,
  );
});
```

## Configuration Management

The publisher automatically saves and loads its configuration from the specified file:

```typescript
// Update an existing endpoint
publisher.updateEndpoint("medium", {
  apiKey: "NEW_API_KEY",
  enabled: false, // Temporarily disable this endpoint
});

// Update an existing schedule
publisher.updateSchedule("daily-bitcoin", {
  timeOfDay: "09:30", // Change publishing time to 9:30 AM
  minNewsItems: 5, // Require more news items
});

// Remove an endpoint
publisher.removeEndpoint("substack");

// Remove a schedule
publisher.removeSchedule("breaking-news");
```

## Best Practices

1. **Start with file-based publishing** to test your setup before enabling external platforms

2. **Use the minNewsItems option** to ensure you only publish when there's meaningful new content

3. **Customize templates** to match your brand's style and focus

4. **Implement appropriate error handling** when running the publisher as a service

5. **Monitor publishing history** to ensure everything is working as expected

## Complete Example

See the [AutomatedNewsPublishing.ts](../examples/AutomatedNewsPublishing.ts) file for a complete working example.
