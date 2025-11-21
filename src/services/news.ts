import {
  NewsItem,
  ChartAnnotation,
  TimeframeData,
  NewsFilter,
} from "@/types/news";
import { api } from "./api";
import { EventEmitter } from "events";
import axios from "axios";
import { JsonRpcProvider, id } from "ethers";
import crypto from "crypto";

const CREDIBLE_SOURCES = [
  "reuters.com",
  "bloomberg.com",
  "ft.com",
  "wsj.com",
  // Add more trusted sources
];

class NewsService extends EventEmitter {
  private newsCache: Map<string, NewsItem[]> = new Map();
  private annotationsCache: Map<string, ChartAnnotation[]> = new Map();
  private socket: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private subscribedSymbols: Set<string> = new Set();
  private lastUpdate: Map<string, number> = new Map();

  constructor() {
    super();
    this.initializeWebSocket();
  }

  private initializeWebSocket() {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = require("socket.io-client")(
      process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001",
      {
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
      },
    );

    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("WebSocket connected");
      this.reconnectAttempts = 0;
      this.resubscribeToSymbols();
    });

    this.socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
    });

    this.socket.on("news_update", (news: NewsItem) => {
      this.handleNewsUpdate(news);
    });

    this.socket.on(
      "social_metrics_update",
      (update: { newsId: string; metrics: NewsItem["social_metrics"] }) => {
        this.handleSocialMetricsUpdate(update);
      },
    );

    this.socket.on(
      "market_impact_update",
      (update: { newsId: string; impact: NewsItem["impact"] }) => {
        this.handleMarketImpactUpdate(update);
      },
    );
  }

  private async resubscribeToSymbols() {
    if (!this.socket?.connected) return;

    Array.from(this.subscribedSymbols).forEach(async (symbol) => {
      await this.subscribeToUpdates(symbol);
    });
  }

  private handleNewsUpdate(news: NewsItem) {
    this.emit("news", news);
    this.updateCache(news);
  }

  private handleSocialMetricsUpdate(update: {
    newsId: string;
    metrics: NewsItem["social_metrics"];
  }) {
    this.emit("social_metrics", update);
    this.updateCacheMetrics(update);
  }

  private handleMarketImpactUpdate(update: {
    newsId: string;
    impact: NewsItem["impact"];
  }) {
    this.emit("market_impact", update);
    this.updateCacheImpact(update);
  }

  private updateCache(news: NewsItem) {
    Array.from(this.newsCache.entries()).forEach(([key, cachedNews]) => {
      const index = cachedNews.findIndex((n: NewsItem) => n.id === news.id);
      if (index !== -1) {
        cachedNews[index] = news;
        this.newsCache.set(key, [...cachedNews]);
      }
    });
  }

  private updateCacheMetrics(update: {
    newsId: string;
    metrics: NewsItem["social_metrics"];
  }) {
    Array.from(this.newsCache.entries()).forEach(([key, cachedNews]) => {
      const news = cachedNews.find((n: NewsItem) => n.id === update.newsId);
      if (news) {
        news.social_metrics = update.metrics;
        this.newsCache.set(key, [...cachedNews]);
      }
    });
  }

  private updateCacheImpact(update: {
    newsId: string;
    impact: NewsItem["impact"];
  }) {
    Array.from(this.newsCache.entries()).forEach(([key, cachedNews]) => {
      const news = cachedNews.find((n: NewsItem) => n.id === update.newsId);
      if (news) {
        news.impact = update.impact;
        this.newsCache.set(key, [...cachedNews]);
      }
    });
  }

  async subscribeToUpdates(symbol: string) {
    if (!this.socket?.connected) {
      throw new Error("WebSocket not connected");
    }

    this.subscribedSymbols.add(symbol);
    await this.socket.emit("subscribe", { symbol });
  }

  async unsubscribeFromUpdates(symbol: string) {
    if (!this.socket?.connected) return;

    this.subscribedSymbols.delete(symbol);
    await this.socket.emit("unsubscribe", { symbol });
  }

  async getNews(filter?: NewsFilter): Promise<NewsItem[]> {
    const cacheKey = filter ? JSON.stringify(filter) : "all";
    const now = Date.now();
    const lastUpdate = this.lastUpdate.get(cacheKey) || 0;
    const cacheExpiry = 60000; // 1 minute

    if (this.newsCache.has(cacheKey) && now - lastUpdate < cacheExpiry) {
      return this.newsCache.get(cacheKey)!;
    }

    try {
      const response = await api.get<NewsItem[]>("/news", { params: filter });
      this.newsCache.set(cacheKey, response);
      this.lastUpdate.set(cacheKey, now);
      return response;
    } catch (error) {
      console.error("Error fetching news:", error);
      return [];
    }
  }

  async getChartAnnotations(
    symbol: string,
    timeframe: TimeframeData["timeframe"],
    startTime: string,
    endTime: string,
  ): Promise<TimeframeData> {
    const cacheKey = `${symbol}-${timeframe}-${startTime}-${endTime}`;
    const now = Date.now();
    const lastUpdate = this.lastUpdate.get(cacheKey) || 0;
    const cacheExpiry = 30000; // 30 seconds

    if (this.annotationsCache.has(cacheKey) && now - lastUpdate < cacheExpiry) {
      return {
        timeframe,
        annotations: this.annotationsCache.get(cacheKey)!,
        significant_events: [],
        market_sentiment_score: 0,
        news_volume: 0,
        news_impact_score: 0,
      };
    }

    try {
      const response = await api.get<TimeframeData>("/chart-annotations", {
        params: { symbol, timeframe, startTime, endTime },
      });
      this.annotationsCache.set(cacheKey, response.annotations);
      this.lastUpdate.set(cacheKey, now);
      return response;
    } catch (error) {
      console.error("Error fetching chart annotations:", error);
      return {
        timeframe,
        annotations: [],
        significant_events: [],
        market_sentiment_score: 0,
        news_volume: 0,
        news_impact_score: 0,
      };
    }
  }

  async getNewsDetails(newsId: string): Promise<NewsItem | null> {
    try {
      return await api.get<NewsItem>(`/news/${newsId}`);
    } catch (error) {
      console.error("Error fetching news details:", error);
      return null;
    }
  }

  async getRelatedNews(newsId: string): Promise<NewsItem[]> {
    try {
      return await api.get<NewsItem[]>(`/news/${newsId}/related`);
    } catch (error) {
      console.error("Error fetching related news:", error);
      return [];
    }
  }

  async getSocialMetrics(newsId: string) {
    try {
      return await api.get(`/news/${newsId}/social-metrics`);
    } catch (error) {
      console.error("Error fetching social metrics:", error);
      return null;
    }
  }

  async getInfluencerMentions(newsId: string) {
    try {
      return await api.get(`/news/${newsId}/influencer-mentions`);
    } catch (error) {
      console.error("Error fetching influencer mentions:", error);
      return [];
    }
  }

  async getEntityAnalysis(newsId: string) {
    try {
      return await api.get(`/news/${newsId}/entity-analysis`);
    } catch (error) {
      console.error("Error fetching entity analysis:", error);
      return null;
    }
  }

  clearCache() {
    this.newsCache.clear();
    this.annotationsCache.clear();
    this.lastUpdate.clear();
  }

  disconnect() {
    this.socket?.disconnect();
  }
}

export async function fetchNews(): Promise<NewsItem[]> {
  try {
    const response = await axios.get("YOUR_NEWS_API_ENDPOINT");
    const newsItems: NewsItem[] = response.data;

    // If you need to verify news, call the /api/verify-news API route from the client or server.
    // Example:
    // const verifiedNews = await Promise.all(newsItems.map(item => fetch('/api/verify-news', { method: 'POST', body: JSON.stringify({ newsItem: item }) })));
    // return verifiedNews;

    return newsItems;
  } catch (error) {
    console.error("Error fetching news:", error);
    return [];
  }
}

export interface LocalNewsItem {
  title: string;
  url: string;
  published_at: string;
  source: string;
}

export async function getLatestNews(): Promise<LocalNewsItem[]> {
  // CryptoPanic public API (no key needed for public headlines)
  const url = "https://cryptopanic.com/api/v1/posts/?public=true";
  const { data } = await axios.get(url);
  return data.results.map((item: any) => ({
    title: item.title,
    url: item.url,
    published_at: item.published_at,
    source: item.source?.title || "Unknown",
  }));
}

// News data service for CoinProfile
// Extensible for CryptoPanic, RSS, Twitter, etc.

export async function getCoinNews(coinId: string): Promise<any[]> {
  // Placeholder: Use real APIs for CryptoPanic, RSS, etc. in production
  if (coinId === "bitcoin") {
    return [
      {
        title: "Bitcoin ETF Approval Rumor Moves Market",
        url: "https://cryptonews.com/bitcoin-etf-approval",
        published_at: new Date(Date.now() - 3600 * 1000).toISOString(),
        source: "CryptoNews",
        summary:
          "Rumors of a Bitcoin ETF approval led to a sharp price increase.",
      },
      {
        title: "Major Exchange Hack Impacts BTC",
        url: "https://cryptonews.com/exchange-hack",
        published_at: new Date(Date.now() - 7200 * 1000).toISOString(),
        source: "CryptoNews",
        summary: "A major exchange hack caused a temporary drop in BTC price.",
      },
    ];
  }
  // TODO: Add more coins and real API integration
  return [];
}

export async function getDeepNewsStats(coinId: string): Promise<any> {
  // Placeholder: Use real APIs for CryptoPanic, RSS, Twitter, etc. in production
  const now = new Date();
  const newsFeed = [
    {
      title: "Bitcoin ETF Approved by SEC",
      summary:
        "The SEC has approved the first spot Bitcoin ETF, sending prices higher.",
      source: "CryptoPanic",
      url: "https://cryptopanic.com/news/bitcoin-etf-approved",
      published_at: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      sentiment: "positive",
      impact: 0.9,
      causal: true,
    },
    {
      title: "Major Exchange Hacked",
      summary:
        "A leading crypto exchange suffered a security breach, with $100M lost.",
      source: "CoinDesk",
      url: "https://coindesk.com/news/major-exchange-hacked",
      published_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      sentiment: "negative",
      impact: 0.8,
      causal: false,
    },
    {
      title: "Bitcoin Halving Approaches",
      summary:
        "The next Bitcoin halving event is just weeks away, with miners preparing.",
      source: "Official Blog",
      url: "https://bitcoin.org/blog/halving",
      published_at: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      sentiment: "neutral",
      impact: 0.5,
      causal: false,
    },
  ];
  const trendingTopics = ["ETF", "Halving", "Security", "Regulation"];
  const trendingSources = ["CryptoPanic", "CoinDesk", "Official Blog"];
  const anomalies = [
    {
      metric: "news",
      description: "Spike in news coverage detected",
      date: now.toISOString(),
    },
  ];
  return {
    newsFeed,
    trendingTopics,
    trendingSources,
    anomalies,
    aiExplainer:
      "Recent news has been dominated by the ETF approval, which had a strong positive impact on price. Security incidents remain a risk factor.",
    qna: [],
    lastUpdated: now.toISOString(),
    definition:
      "Aggregated news from CryptoPanic, RSS, and more. Includes sentiment, impact, trending topics, and causal mapping.",
  };
}

// Extensibility: Add more sources, causal analysis, and community features as needed.

function simpleTokenize(text: string): string[] {
  return text.split(/\s+/);
}

// Export a singleton instance of NewsService
export const newsService = new NewsService();
