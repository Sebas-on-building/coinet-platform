/**
 * =========================================
 * RSS CLIENT
 * =========================================
 * RSS feed client for news aggregation
 */

import Parser from 'rss-parser';
import axios from 'axios';
import { Logger } from '../../utils/Logger';
import type { NewsSource, NewsArticle, BackfillRequest } from '../../types';

export class RSSClient {
  private logger: Logger;
  private parser: Parser;
  private sources: NewsSource[] = [];
  private isInitialized: boolean = false;
  private fetchIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(sources: NewsSource[] = []) {
    this.logger = new Logger('RSSClient');
    this.parser = new Parser({
      customFields: {
        item: [
          ['media:content', 'image'],
          ['enclosure', 'enclosure'],
          ['category', 'categories']
        ]
      }
    });
    this.sources = sources.filter(s => s.type === 'rss');
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing RSS Client...');

      // Test RSS parser
      const testFeed = await this.parser.parseURL('https://httpbin.org/xml');
      this.logger.debug('RSS parser test successful');

      this.isInitialized = true;
      this.logger.info('✅ RSS Client initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize RSS Client', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      // Clear all fetch intervals
      for (const [sourceId, interval] of this.fetchIntervals) {
        clearInterval(interval);
      }
      this.fetchIntervals.clear();

      this.isInitialized = false;
      this.logger.info('✅ RSS Client stopped successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to stop RSS Client', error);
      throw error;
    }
  }

  addSource(source: NewsSource): void {
    this.sources.push(source);
    this.setupSourcePolling(source);
  }

  private setupSourcePolling(source: NewsSource): void {
    if (!source.enabled) return;

    // Initial fetch
    this.fetchFeed(source).catch(error => {
      this.logger.error(`Initial fetch failed for ${source.id}`, error);
    });

    // Set up periodic fetching
    const interval = setInterval(() => {
      this.fetchFeed(source).catch(error => {
        this.logger.error(`Periodic fetch failed for ${source.id}`, error);
        source.errorCount++;
      });
    }, source.updateInterval);

    this.fetchIntervals.set(source.id, interval);
    this.logger.info(`Set up polling for ${source.id} every ${source.updateInterval / 1000}s`);
  }

  private async fetchFeed(source: NewsSource): Promise<void> {
    try {
      this.logger.debug(`Fetching RSS feed: ${source.name} (${source.url})`);

      // Parse RSS feed
      const feed = await this.parser.parseURL(source.url);

      // Process each item
      const articles = [];
      for (const item of feed.items) {
        try {
          const article = await this.convertRSSItemToArticle(item, source);
          articles.push(article);

          // Emit article for processing
          this.emit('article', item, source);

        } catch (error: any) {
          this.logger.error(`Failed to process RSS item from ${source.id}`, error);
        }
      }

      source.lastFetch = new Date();
      this.logger.debug(`Processed ${articles.length} articles from ${source.id}`);

    } catch (error: any) {
      source.errorCount++;
      this.logger.error(`Failed to fetch RSS feed from ${source.id}`, error);
      throw error;
    }
  }

  async fetchHistorical(source: NewsSource, request: BackfillRequest): Promise<NewsArticle[]> {
    try {
      this.logger.info(`Fetching historical data from ${source.id}`, {
        start_date: request.startDate.toISOString(),
        end_date: request.endDate.toISOString()
      });

      const feed = await this.parser.parseURL(source.url);
      const articles: NewsArticle[] = [];

      for (const item of feed.items) {
        const itemDate = new Date(item.pubDate || item.published || Date.now());

        // Filter by date range
        if (itemDate >= request.startDate && itemDate <= request.endDate) {
          try {
            const article = await this.convertRSSItemToArticle(item, source);
            articles.push(article);
          } catch (error: any) {
            this.logger.error(`Failed to convert historical RSS item`, error);
          }
        }

        // Limit results
        if (request.maxArticles && articles.length >= request.maxArticles) {
          break;
        }
      }

      this.logger.info(`Fetched ${articles.length} historical articles from ${source.id}`);
      return articles;

    } catch (error: any) {
      this.logger.error(`Failed to fetch historical data from ${source.id}`, error);
      throw error;
    }
  }

  private async convertRSSItemToArticle(item: any, source: NewsSource): Promise<NewsArticle> {
    // Extract image URL
    let imageUrl: string | undefined;
    if (item.enclosure?.url) {
      imageUrl = item.enclosure.url;
    } else if (item['media:content']?.$?.url) {
      imageUrl = item['media:content'].$.url;
    } else if (item.image?.url) {
      imageUrl = item.image.url;
    }

    // Extract categories
    const categories = [];
    if (item.categories) {
      if (Array.isArray(item.categories)) {
        categories.push(...item.categories);
      } else {
        categories.push(item.categories);
      }
    }
    if (item.category) {
      if (Array.isArray(item.category)) {
        categories.push(...item.category);
      } else {
        categories.push(item.category);
      }
    }

    return {
      id: `${source.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source,
      title: item.title || '',
      content: item.content || item.contentSnippet || item.summary || '',
      summary: '',
      url: item.link || item.guid || '',
      publishedAt: new Date(item.pubDate || item.published || Date.now()),
      fetchedAt: new Date(),
      author: item.creator || item.author || item['dc:creator'],
      imageUrl,
      classification: 'general',
      urgency: 'low',
      confidence: 0,
      sentiment: {
        score: 0,
        confidence: 0,
        label: 'neutral'
      },
      keyFacts: {
        tokens: [],
        projects: [],
        companies: [],
        people: [],
        locations: [],
        amounts: [],
        dates: []
      },
      entities: {
        organizations: [],
        persons: [],
        locations: [],
        monetary: [],
        percentages: []
      },
      processingLatencyMs: 0,
      wordCount: 0,
      language: 'en',
      marketImpact: {
        volatility: 0,
        relevance: 0,
        scope: 'local'
      }
    };
  }

  getStatus(): string {
    return this.isInitialized ? 'Active' : 'Not Initialized';
  }

  // Event emitter for articles
  private emit(event: string, data: any, source?: NewsSource): void {
    // This will be connected to the main aggregator's event system
  }

  on(event: string, listener: (...args: any[]) => void): void {
    // Event listener setup - will be connected to main aggregator
  }
}
