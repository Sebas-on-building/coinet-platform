/**
 * Traditional News Article Template (TypeScript version)
 *
 * Follows the inverted pyramid structure for crypto news articles
 * with headline, lede (5W+H), nut graf, and structured body
 */

/**
 * Data structure for article template
 */
export interface ArticleTemplateData {
  title: string;
  summary: string;
  keyPoints: string[];
  impact?: {
    score: number;
    market_sentiment: string;
    importance: number;
    affected_assets: string[];
  };
  keyAssets?: {
    symbol: string;
    sentiment: number;
    mentions: number;
  }[];
  expert_quotes?: {
    text: string;
    author: string;
    title: string;
  }[];
  background?: string;
  outlook?: string;
  sources: string[];
}

/**
 * Traditional news article template
 */
export const traditionalNewsTemplate = `# {{headline}}

{{lead_paragraph}}

{{nut_graf}}

## Key Developments

{{key_points}}

## Market Impact

{{market_impact}}

### Asset Details

{{asset_details}}

## Expert Analysis

{{expert_quotes}}

## Background

{{background}}

## Looking Forward

{{forward_outlook}}

---

**Sources:** 
{{sources}}
`;

/**
 * Format data using the traditional news article structure
 */
export const formatTraditionalNews = (data: ArticleTemplateData): string => {
  // Create headline - concise, under 10 words
  const headline = data.title;

  // Format lead paragraph (lede) - answers who, what, where, when, why, how
  let leadParagraph = data.summary;

  // If summary is too long for a lead, truncate it
  if (leadParagraph && leadParagraph.length > 200) {
    leadParagraph = leadParagraph.substring(0, 197) + "...";
  }

  // Create nut graf - why this matters
  let nutGraf = "";
  if (data.impact && data.impact.importance > 0.7) {
    nutGraf = `This development is significant as it could substantially impact ${data.impact.affected_assets.join(", ")} prices in the near term.`;
  } else if (data.impact && data.impact.importance > 0.4) {
    nutGraf = `Analysts are watching this trend closely as it relates to broader market movements in the ${data.impact.affected_assets.length > 0 ? data.impact.affected_assets.join(", ") : "crypto"} sector.`;
  } else {
    nutGraf = `While this news is still developing, it represents one of several factors currently influencing market sentiment.`;
  }

  // Format key points in inverted pyramid structure (most important first)
  const keyPoints =
    data.keyPoints && data.keyPoints.length > 0
      ? data.keyPoints.map((point) => `- ${point}`).join("\n")
      : "- No additional key points available at this time.";

  // Market impact section
  const marketImpact = data.impact
    ? `The overall market sentiment is **${data.impact.market_sentiment}** with a sentiment score of ${data.impact.score.toFixed(2)}.`
    : "Market impact analysis is currently unavailable.";

  // Asset details with specific impacts
  const assetDetails =
    data.keyAssets && data.keyAssets.length > 0
      ? data.keyAssets
          .map(
            (asset) =>
              `- **${asset.symbol}**: ${asset.sentiment > 0.2 ? "bullish" : asset.sentiment < -0.2 ? "bearish" : "neutral"} sentiment (${asset.sentiment.toFixed(2)}), mentioned in ${asset.mentions} news items`,
          )
          .join("\n")
      : "- Detailed asset impact data is unavailable at this time.";

  // Expert quotes section
  const expertQuotes =
    data.expert_quotes && data.expert_quotes.length > 0
      ? data.expert_quotes
          .map((quote) => `> "${quote.text}" — ${quote.author}, ${quote.title}`)
          .join("\n\n")
      : "> Market analysts are still evaluating the full implications of this development.";

  // Background context
  const background =
    data.background ||
    "Additional background and context will be provided as this story develops.";

  // Forward looking perspective
  const forwardOutlook =
    data.outlook ||
    "Market participants should monitor further developments as this situation evolves.";

  // Format sources for proper attribution
  const sources =
    data.sources && data.sources.length > 0
      ? data.sources.map((source) => `- ${source}`).join("\n")
      : "- Information compiled from multiple crypto news sources";

  // Replace template variables with actual content
  return traditionalNewsTemplate
    .replace("{{headline}}", headline)
    .replace("{{lead_paragraph}}", leadParagraph)
    .replace("{{nut_graf}}", nutGraf)
    .replace("{{key_points}}", keyPoints)
    .replace("{{market_impact}}", marketImpact)
    .replace("{{asset_details}}", assetDetails)
    .replace("{{expert_quotes}}", expertQuotes)
    .replace("{{background}}", background)
    .replace("{{forward_outlook}}", forwardOutlook)
    .replace("{{sources}}", sources);
};
