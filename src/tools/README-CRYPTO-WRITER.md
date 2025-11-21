# Crypto News Writer

This tool helps you create your own cryptocurrency news articles based on aggregated information from multiple trusted sources. It leverages our comprehensive news aggregation system to provide research, sentiment analysis, and article templates.

## Features

- **Automated Research**: Gather information from multiple trusted sources about any crypto topic
- **Sentiment Analysis**: Determine the market sentiment around a topic or specific assets
- **Article Templates**: Generate article templates with data-backed summaries and key points
- **Source Attribution**: Automatically include proper citations and references
- **Market Impact Analysis**: Analyze how news might affect specific cryptocurrencies

## Getting Started

### Installation

The CryptoNewsWriter is integrated into the Coinet platform. No additional installation is required.

### Basic Usage

```typescript
import { CryptoNewsWriter } from "./tools/CryptoNewsWriter";

// Create a new writer instance with a directory to save articles
const writer = new CryptoNewsWriter("./my-crypto-articles");

// Create a complete article
const filePath = await writer.createArticle(
  "The Impact of Bitcoin ETFs on Institutional Adoption", // Title
  "Bitcoin ETF approval", // Topic to research
  ["BTC", "ETH"], // Relevant assets
);

console.log(`Article created at: ${filePath}`);
```

## Research Capabilities

### Researching a Topic

The `researchTopic` method provides comprehensive information about any crypto topic:

```typescript
const research = await writer.researchTopic("Ethereum Shanghai upgrade", {
  assets: ["ETH", "LDO", "RPL"], // Related assets to look for
  timeframeHours: 48, // How far back to look for news
  limit: 15, // How many news items to analyze
  sources: ["cointelegraph", "glassnode-alerts"], // Specific sources to use
});

console.log(research.summary); // Overview of the topic
console.log(research.keyPoints); // Key points extracted from news
console.log(research.sources); // Sources used for attribution
```

### Analyzing Market Impact

The `researchMarketImpact` method analyzes how a topic might affect specific assets:

```typescript
const impact = await writer.researchMarketImpact(
  "Layer 2 scaling solutions", // Topic to analyze
  ["ETH", "MATIC", "ARBI", "OP"], // Assets to check for impact
);

console.log(`Overall sentiment: ${impact.overallSentiment}`);
console.log(`Sentiment score: ${impact.sentimentScore}`);
console.log(impact.keyAssets); // Impact on each specific asset
```

## Creating Articles

### Generating Article Templates

```typescript
// Generate an article template
const template = await writer.generateArticleTemplate(
  "The Evolving Landscape of DeFi Regulations", // Article title
  "DeFi regulation compliance", // Topic to research
  ["UNI", "AAVE", "MKR", "COMP"], // Relevant assets
);

// You can now edit this template as needed
console.log(template);
```

The generated template includes:

- Title and date
- Introduction with summary of recent news
- Key points section with main takeaways
- Market impact analysis (if assets are provided)
- Section templates for Background, Analysis, Expert Opinions, etc.
- Sources section with proper citations

### Saving Articles

After creating or modifying a template, you can save it:

```typescript
const filePath = await writer.saveArticle(
  "DeFi-Regulations-Analysis", // Filename (will be sanitized)
  customizedContent, // The content to save
);
```

## Advanced Usage

### Customizing Research

You can customize the research process to focus on specific sources or time periods:

```typescript
const customResearch = await writer.researchTopic(
  "Bitcoin mining sustainability",
  {
    sources: ["cointelegraph", "coindesk"], // Only use these sources
    timeframeHours: 72, // Look at the last 3 days
    limit: 25, // Analyze up to 25 news items
  },
);
```

### Creating a Custom Workflow

You can create a custom workflow by combining the different methods:

```typescript
// First research the topic
const research = await writer.researchTopic("NFT market recovery");

// Then check market impact
const impact = await writer.researchMarketImpact("NFT market recovery", [
  "ETH",
  "FLOW",
  "IMX",
]);

// Generate a custom template based on your findings
let customTemplate = `# NFT Market Shows Signs of Recovery\n\n`;
customTemplate += `**Date:** ${new Date().toISOString().split("T")[0]}\n\n`;
customTemplate += `## Overview\n\n${research.summary}\n\n`;

// Add market impact details
customTemplate += `## Market Impact\n\n`;
customTemplate += `The NFT market sentiment is currently **${impact.overallSentiment}**.\n\n`;

// Add your own analysis
customTemplate += `## My Analysis\n\n`;
customTemplate += `Based on the data collected, I believe the NFT market is showing these key trends:\n`;
customTemplate += `1. [Add your first insight here]\n`;
customTemplate += `2. [Add your second insight here]\n`;
customTemplate += `3. [Add your third insight here]\n\n`;

// Add sources
customTemplate += `## Sources\n\n`;
research.sources.forEach((source) => {
  customTemplate += `- ${source}\n`;
});

// Save your custom article
const filePath = await writer.saveArticle(
  "NFT-Market-Recovery-Analysis",
  customTemplate,
);
```

## Best Practices

1. **Always verify information**: While the tool aggregates from trusted sources, always review the information before publishing.

2. **Add your unique insights**: The tool provides data and templates, but your analysis and expertise are what make your articles valuable.

3. **Disclose sources**: Always keep the sources section to maintain transparency and credibility.

4. **Focus on specific topics**: More specific research queries yield better results than broad ones.

5. **Consider multiple assets**: When researching market impact, include related assets for a more comprehensive analysis.

## Available News Sources

The tool uses all news sources configured in the Coinet platform, including:

- **RSS-based Sources**: Cointelegraph, Crypto.news, CoinDesk, CryptoCompare
- **Twitter/X-based Sources**: Whale Alert, CryptoQuant, Glassnode Alerts, Santiment, RadarHits

## Example Output

Here's an example of what a generated article template might look like:

```markdown
# The Impact of Bitcoin ETFs on Institutional Adoption

**Date:** 2023-10-15

## Introduction

Recent news about Bitcoin ETF approval indicates a generally positive outlook, with 7 of 10 sources reporting bullish sentiment. The most discussed aspects include regulatory approval, institutional investment, market impact. Key information has been reported by CoinDesk, Cointelegraph, Glassnode Alerts.

## Key Points

- SEC approves Bitcoin ETF applications from BlackRock and Fidelity, setting the stage for trading to begin next week.
- Trading volumes could exceed $2 billion in the first week as institutional investors gain regulated exposure to Bitcoin.
- Market analysts predict the ETF approval could drive Bitcoin price above $70,000 in Q1 2024.
- Traditional finance firms are preparing dedicated crypto divisions to capitalize on growing institutional interest.
- On-chain metrics show accumulation by large holders ahead of the ETF launch date.

## Market Impact

The overall market sentiment is **bullish** with a sentiment score of 0.68.

### Impact on Key Assets

- **BTC**: bullish sentiment (0.75), mentioned in 10 news items
- **ETH**: neutral sentiment (0.15), mentioned in 4 news items

## Background

[Add relevant background information here]

## Analysis

[Add your analysis of the situation here]

## Expert Opinions

[Include quotes or insights from experts]

## Potential Implications

[Discuss what this means for the market and investors]

## Conclusion

[Summarize the key takeaways]

## Sources

- CoinDesk (https://www.coindesk.com/markets/2023/10/14/bitcoin-etf-approval/)
- Cointelegraph (https://cointelegraph.com/news/sec-approves-bitcoin-etf)
- Glassnode Alerts (https://twitter.com/glassnodealerts/status/1583142)
```
