import { SocialPost } from "./socialMedia";
import { NewsItem } from "../types/news";
import { EventEmitter } from "events";

interface SentimentScore {
  score: number;
  confidence: number;
  aspects: {
    technical: number;
    fundamental: number;
    social: number;
  };
  entities: {
    name: string;
    sentiment: number;
    mentions: number;
  }[];
}

interface EntityAnalysis {
  entity: string;
  count: number;
  contexts: string[];
  sentiment: number;
}

interface SentimentResult {
  score: number;
  confidence: number;
  topics: string[];
}

/**
 * Service for analyzing sentiment in news content
 */
export class SentimentAnalysisService extends EventEmitter {
  private static instance: SentimentAnalysisService;
  private cache: Map<string, { result: SentimentResult; timestamp: number }> =
    new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Sentiment dictionaries with weights
  private readonly technicalTerms = new Map<string, number>([
    // Bullish patterns
    ["golden cross", 0.8],
    ["breakout", 0.6],
    ["support", 0.3],
    ["uptrend", 0.7],
    ["accumulation", 0.5],
    ["higher lows", 0.6],
    ["higher highs", 0.6],
    ["buy signal", 0.7],
    ["oversold", 0.4],
    ["double bottom", 0.6],
    ["bull flag", 0.6],
    ["cup and handle", 0.7],
    ["ascending triangle", 0.6],
    ["macd crossover", 0.5],
    ["rsi recovery", 0.4],
    ["volume spike", 0.3],
    ["bullish divergence", 0.7],
    ["hammer candlestick", 0.5],
    ["morning star", 0.6],
    ["fibonacci support", 0.4],

    // Bearish patterns
    ["death cross", -0.8],
    ["breakdown", -0.6],
    ["resistance", -0.3],
    ["downtrend", -0.7],
    ["distribution", -0.5],
    ["lower lows", -0.6],
    ["lower highs", -0.6],
    ["sell signal", -0.7],
    ["overbought", -0.4],
    ["double top", -0.6],
    ["bear flag", -0.6],
    ["head and shoulders", -0.7],
    ["descending triangle", -0.6],
    ["macd bearish", -0.5],
    ["rsi overbought", -0.4],
    ["volume decline", -0.3],
    ["bearish divergence", -0.7],
    ["shooting star", -0.5],
    ["evening star", -0.6],
    ["fibonacci resistance", -0.4],
  ]);

  private readonly fundamentalTerms = new Map<string, number>([
    // Positive fundamentals
    ["adoption", 0.6],
    ["partnership", 0.7],
    ["integration", 0.5],
    ["upgrade", 0.6],
    ["development", 0.4],
    ["launch", 0.5],
    ["milestone", 0.6],
    ["growth", 0.5],
    ["utility", 0.4],
    ["scalability", 0.5],

    // Negative fundamentals
    ["hack", -0.9],
    ["vulnerability", -0.7],
    ["delay", -0.5],
    ["bug", -0.6],
    ["fork", -0.3],
    ["competition", -0.3],
    ["regulation", -0.4],
    ["ban", -0.8],
    ["lawsuit", -0.7],
    ["investigation", -0.6],
  ]);

  private readonly marketSentimentTerms = new Map<string, number>([
    // Positive sentiment
    ["bullish", 0.7],
    ["moon", 0.6],
    ["hodl", 0.4],
    ["fomo", 0.3],
    ["undervalued", 0.5],
    ["gem", 0.4],
    ["potential", 0.3],
    ["confident", 0.5],
    ["strong", 0.4],
    ["opportunity", 0.5],

    // Negative sentiment
    ["bearish", -0.7],
    ["dump", -0.6],
    ["fud", -0.4],
    ["overvalued", -0.5],
    ["scam", -0.9],
    ["ponzi", -0.9],
    ["weak", -0.4],
    ["sell", -0.3],
    ["risk", -0.4],
    ["bubble", -0.6],
  ]);

  // Emoji sentiment mapping
  private readonly emojiSentiment = new Map<string, number>([
    ["🚀", 0.8], // Rocket
    ["🌙", 0.6], // Moon
    ["📈", 0.5], // Chart up
    ["💪", 0.4], // Strong
    ["🔥", 0.5], // Fire
    ["💎", 0.6], // Diamond
    ["🐂", 0.7], // Bull
    ["📉", -0.5], // Chart down
    ["🐻", -0.7], // Bear
    ["💩", -0.8], // Poo
    ["😱", -0.4], // Scared
    ["🤮", -0.6], // Sick
    ["⚠️", -0.3], // Warning
    ["🔪", -0.5], // Knife
    ["💀", -0.7], // Skull
  ]);

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SentimentAnalysisService {
    if (!SentimentAnalysisService.instance) {
      SentimentAnalysisService.instance = new SentimentAnalysisService();
    }
    return SentimentAnalysisService.instance;
  }

  /**
   * Analyze text for sentiment and extract topics
   */
  public async analyzeText(text: string): Promise<SentimentResult> {
    const cacheKey = this.getCacheKey(text);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }

    try {
      // In a real implementation, this would use a sentiment analysis API
      // For now, return simulated results
      const result = this.generateSimulatedSentiment(text);

      // Cache the results
      this.cache.set(cacheKey, {
        result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error("Error analyzing sentiment:", error);
      throw error;
    }
  }

  /**
   * Analyze a batch of news items
   */
  public async analyzeNewsBatch(newsItems: any[]): Promise<any[]> {
    const analyzedItems = await Promise.all(
      newsItems.map(async (item) => {
        const sentiment = await this.analyzeText(item.content);
        return {
          ...item,
          sentiment: sentiment.score,
          sentiment_confidence: sentiment.confidence,
          topics: sentiment.topics,
        };
      }),
    );

    return analyzedItems;
  }

  /**
   * Generate simulated sentiment analysis results
   */
  private generateSimulatedSentiment(text: string): SentimentResult {
    // Simple sentiment calculation based on positive/negative words
    const positiveWords = [
      "good",
      "great",
      "excellent",
      "positive",
      "bullish",
      "growth",
      "success",
      "profit",
    ];
    const negativeWords = [
      "bad",
      "poor",
      "negative",
      "bearish",
      "decline",
      "loss",
      "failure",
      "risk",
    ];

    const words = text.toLowerCase().split(/\W+/);
    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach((word) => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });

    const total = positiveCount + negativeCount;
    const score = total === 0 ? 0 : (positiveCount - negativeCount) / total;

    // Extract potential topics (simplified)
    const topics = this.extractTopics(text);

    return {
      score,
      confidence: Math.random() * 0.3 + 0.7, // Random confidence between 0.7 and 1.0
      topics,
    };
  }

  /**
   * Extract potential topics from text
   */
  private extractTopics(text: string): string[] {
    const commonTopics = [
      "defi",
      "nft",
      "blockchain",
      "crypto",
      "bitcoin",
      "ethereum",
      "regulation",
      "technology",
      "market",
      "trading",
      "investment",
      "security",
      "privacy",
      "scalability",
      "adoption",
    ];

    const words = text.toLowerCase().split(/\W+/);
    return commonTopics.filter((topic) => words.includes(topic));
  }

  /**
   * Generate cache key for text
   */
  private getCacheKey(text: string): string {
    return text.toLowerCase().replace(/\s+/g, "_");
  }

  /**
   * Analyze sentiment for a single news item
   */
  public async analyzeNewsItem(newsItem: NewsItem): Promise<NewsItem> {
    // In a real implementation, this would call an NLP API
    // For now, we'll just return the item unchanged since we're assuming
    // the news adapters already provide basic sentiment analysis
    return newsItem;
  }

  public analyzeSentiment(text: string): SentimentScore {
    const cleanText = this.preprocessText(text);
    const words = this.tokenize(cleanText);

    // Calculate different aspects of sentiment
    const technical = this.analyzeTechnicalSentiment(words);
    const fundamental = this.analyzeFundamentalSentiment(words);
    const market = this.analyzeMarketSentiment(words);
    const emoji = this.analyzeEmojiSentiment(text);

    // Weight the different components
    const weights = {
      technical: 0.3,
      fundamental: 0.3,
      market: 0.25,
      emoji: 0.15,
    };

    const score =
      technical.score * weights.technical +
      fundamental.score * weights.fundamental +
      market.score * weights.market +
      emoji.score * weights.emoji;

    // Calculate confidence based on the number of sentiment indicators found
    const confidence =
      technical.confidence * weights.technical +
      fundamental.confidence * weights.fundamental +
      market.confidence * weights.market +
      emoji.confidence * weights.emoji;

    return {
      score: this.normalizeScore(score),
      confidence,
      aspects: {
        technical: technical.score,
        fundamental: fundamental.score,
        social: market.score,
      },
      entities: this.extractEntities(text),
    };
  }

  public analyzePostsSentiment(posts: SocialPost[]): {
    overall: "positive" | "negative" | "neutral";
    score: number;
    confidence: number;
    posts: (SocialPost & { analysis: SentimentScore })[];
    trends: {
      technical: number[];
      fundamental: number[];
      social: number[];
    };
  } {
    const analyzedPosts = posts.map((post) => ({
      ...post,
      analysis: this.analyzeSentiment(post.content),
    }));

    const overallScore =
      analyzedPosts.reduce(
        (acc, post) => acc + post.analysis.score * post.analysis.confidence,
        0,
      ) / posts.length;

    const confidence =
      analyzedPosts.reduce((acc, post) => acc + post.analysis.confidence, 0) /
      posts.length;

    // Track sentiment trends over time
    const trends = {
      technical: analyzedPosts.map((p) => p.analysis.aspects.technical),
      fundamental: analyzedPosts.map((p) => p.analysis.aspects.fundamental),
      social: analyzedPosts.map((p) => p.analysis.aspects.social),
    };

    return {
      overall: this.getOverallSentiment(overallScore),
      score: overallScore,
      confidence,
      posts: analyzedPosts,
      trends,
    };
  }

  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s🚀🌙📈💪🔥💎🐂📉🐻💩😱🤮⚠️🔪💀]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private tokenize(text: string): string[] {
    // Split into words while preserving multi-word technical terms
    const tokens: string[] = [];
    const words = text.split(" ");

    for (let i = 0; i < words.length; i++) {
      // Check for multi-word terms
      for (let j = 3; j > 0; j--) {
        const phrase = words.slice(i, i + j).join(" ");
        if (
          this.technicalTerms.has(phrase) ||
          this.fundamentalTerms.has(phrase) ||
          this.marketSentimentTerms.has(phrase)
        ) {
          tokens.push(phrase);
          i += j - 1;
          break;
        }
        if (j === 1) {
          tokens.push(words[i]);
        }
      }
    }

    return tokens;
  }

  private analyzeTechnicalSentiment(words: string[]): {
    score: number;
    confidence: number;
  } {
    let score = 0;
    let matches = 0;

    words.forEach((word) => {
      if (this.technicalTerms.has(word)) {
        score += this.technicalTerms.get(word)!;
        matches++;
      }
    });

    return {
      score: matches > 0 ? score / matches : 0,
      confidence: Math.min(matches / 3, 1), // Normalize confidence
    };
  }

  private analyzeFundamentalSentiment(words: string[]): {
    score: number;
    confidence: number;
  } {
    let score = 0;
    let matches = 0;

    words.forEach((word) => {
      if (this.fundamentalTerms.has(word)) {
        score += this.fundamentalTerms.get(word)!;
        matches++;
      }
    });

    return {
      score: matches > 0 ? score / matches : 0,
      confidence: Math.min(matches / 3, 1),
    };
  }

  private analyzeMarketSentiment(words: string[]): {
    score: number;
    confidence: number;
  } {
    let score = 0;
    let matches = 0;

    words.forEach((word) => {
      if (this.marketSentimentTerms.has(word)) {
        score += this.marketSentimentTerms.get(word)!;
        matches++;
      }
    });

    return {
      score: matches > 0 ? score / matches : 0,
      confidence: Math.min(matches / 3, 1),
    };
  }

  private analyzeEmojiSentiment(text: string): {
    score: number;
    confidence: number;
  } {
    let score = 0;
    let matches = 0;

    for (const [emoji, value] of this.emojiSentiment) {
      const count = (text.match(new RegExp(emoji, "g")) || []).length;
      if (count > 0) {
        score += value * count;
        matches += count;
      }
    }

    return {
      score: matches > 0 ? score / matches : 0,
      confidence: Math.min(matches / 2, 1),
    };
  }

  private normalizeScore(score: number): number {
    return Math.max(Math.min(score, 1), -1);
  }

  private getOverallSentiment(
    score: number,
  ): "positive" | "negative" | "neutral" {
    if (score > 0.2) return "positive";
    if (score < -0.2) return "negative";
    return "neutral";
  }

  private extractEntities(
    text: string,
  ): { name: string; sentiment: number; mentions: number }[] {
    const entities = new Map<string, EntityAnalysis>();

    // Common cryptocurrency entities
    const cryptoEntities = [
      "bitcoin",
      "btc",
      "ethereum",
      "eth",
      "blockchain",
      "defi",
      "nft",
    ];
    const words = text.toLowerCase().split(/\s+/);

    words.forEach((word, index) => {
      if (cryptoEntities.includes(word)) {
        if (!entities.has(word)) {
          entities.set(word, {
            entity: word,
            count: 0,
            contexts: [],
            sentiment: 0,
          });
        }

        const entity = entities.get(word)!;
        entity.count++;

        // Get context (3 words before and after)
        const context = words
          .slice(Math.max(0, index - 3), Math.min(words.length, index + 4))
          .join(" ");
        entity.contexts.push(context);

        // Calculate sentiment for this mention
        const contextSentiment = this.analyzeSentiment(context);
        entity.sentiment += contextSentiment.score;
      }
    });

    return Array.from(entities.values()).map((entity) => ({
      name: entity.entity,
      sentiment: this.normalizeScore(entity.sentiment / entity.count),
      mentions: entity.count,
    }));
  }
}
