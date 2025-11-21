/**
 * =========================================
 * METADATA STORAGE
 * =========================================
 * Structured storage for news articles and metadata
 */

import { Logger } from '../utils/Logger';
import type { NewsArticle, NewsAlert, NewsSource, NewsClassification } from '../types';

export interface StoredArticle extends NewsArticle {
  storedAt: Date;
  storageVersion: string;
  indexed: boolean;
  searchable: boolean;
}

export interface StorageStats {
  totalArticles: number;
  totalAlerts: number;
  storageSize: number;
  oldestArticle: Date | null;
  newestArticle: Date | null;
  sourcesCount: number;
  classificationsBreakdown: Record<NewsClassification, number>;
}

export interface StorageQuery {
  limit?: number;
  offset?: number;
  sources?: string[];
  classifications?: NewsClassification[];
  urgency?: string[];
  tokens?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: 'publishedAt' | 'storedAt' | 'urgency' | 'relevance';
  sortOrder?: 'asc' | 'desc';
  searchTerm?: string;
}

export interface StorageResult {
  articles: StoredArticle[];
  totalCount: number;
  hasMore: boolean;
  query: StorageQuery;
}

export class MetadataStorage {
  private logger: Logger;
  private isInitialized: boolean = false;
  private articles: Map<string, StoredArticle> = new Map();
  private alerts: Map<string, NewsAlert> = new Map();
  private sourceIndex: Map<string, Set<string>> = new Map(); // source -> article IDs
  private tokenIndex: Map<string, Set<string>> = new Map(); // token -> article IDs
  private classificationIndex: Map<NewsClassification, Set<string>> = new Map(); // classification -> article IDs
  private dateIndex: Map<string, Set<string>> = new Map(); // date string -> article IDs

  constructor() {
    this.logger = new Logger('MetadataStorage');
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Metadata Storage...');

      // In a real implementation, this would connect to a database
      // For now, we'll use in-memory storage with persistence capabilities

      this.isInitialized = true;
      this.logger.info('✅ Metadata Storage initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Metadata Storage', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      // In a real implementation, this would close database connections
      // and flush any pending writes

      this.isInitialized = false;
      this.logger.info('✅ Metadata Storage stopped successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to stop Metadata Storage', error);
      throw error;
    }
  }

  /**
   * Store a news article with metadata
   */
  async storeArticle(article: NewsArticle): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('MetadataStorage is not initialized');
    }

    try {
      const storedArticle: StoredArticle = {
        ...article,
        storedAt: new Date(),
        storageVersion: '1.0',
        indexed: false,
        searchable: true
      };

      // Store the article
      this.articles.set(article.id, storedArticle);

      // Update indexes
      await this.updateIndexes(storedArticle);

      // Mark as indexed
      storedArticle.indexed = true;

      this.logger.debug(`Stored article: ${article.id} (${article.title.substring(0, 50)}...)`);

    } catch (error: any) {
      this.logger.error(`Failed to store article ${article.id}`, error);
      throw error;
    }
  }

  /**
   * Store a news alert
   */
  async storeAlert(alert: NewsAlert): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('MetadataStorage is not initialized');
    }

    try {
      this.alerts.set(alert.id, alert);
      this.logger.debug(`Stored alert: ${alert.id} (${alert.title})`);

    } catch (error: any) {
      this.logger.error(`Failed to store alert ${alert.id}`, error);
      throw error;
    }
  }

  /**
   * Query articles based on criteria
   */
  async queryArticles(query: StorageQuery): Promise<StorageResult> {
    if (!this.isInitialized) {
      throw new Error('MetadataStorage is not initialized');
    }

    try {
      let matchingArticles = Array.from(this.articles.values());

      // Apply filters
      if (query.sources && query.sources.length > 0) {
        matchingArticles = matchingArticles.filter(article =>
          query.sources!.includes(article.source.id)
        );
      }

      if (query.classifications && query.classifications.length > 0) {
        matchingArticles = matchingArticles.filter(article =>
          query.classifications!.includes(article.classification)
        );
      }

      if (query.urgency && query.urgency.length > 0) {
        matchingArticles = matchingArticles.filter(article =>
          query.urgency!.includes(article.urgency)
        );
      }

      if (query.tokens && query.tokens.length > 0) {
        matchingArticles = matchingArticles.filter(article =>
          query.tokens!.some(token => article.keyFacts.tokens.includes(token))
        );
      }

      if (query.dateFrom) {
        matchingArticles = matchingArticles.filter(article =>
          article.publishedAt >= query.dateFrom!
        );
      }

      if (query.dateTo) {
        matchingArticles = matchingArticles.filter(article =>
          article.publishedAt <= query.dateTo!
        );
      }

      if (query.searchTerm) {
        const searchTerm = query.searchTerm.toLowerCase();
        matchingArticles = matchingArticles.filter(article =>
          article.title.toLowerCase().includes(searchTerm) ||
          article.content.toLowerCase().includes(searchTerm) ||
          article.summary.toLowerCase().includes(searchTerm)
        );
      }

      // Sort results
      const sortBy = query.sortBy || 'publishedAt';
      const sortOrder = query.sortOrder || 'desc';

      matchingArticles.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortBy) {
          case 'publishedAt':
            aValue = a.publishedAt.getTime();
            bValue = b.publishedAt.getTime();
            break;
          case 'storedAt':
            aValue = a.storedAt.getTime();
            bValue = b.storedAt.getTime();
            break;
          case 'urgency': {
            const urgencyOrder = { low: 1, medium: 2, high: 3, critical: 4 };
            aValue = urgencyOrder[a.urgency];
            bValue = urgencyOrder[b.urgency];
            break;
          }
          case 'relevance':
            aValue = a.marketImpact.relevance;
            bValue = b.marketImpact.relevance;
            break;
          default:
            aValue = a.publishedAt.getTime();
            bValue = b.publishedAt.getTime();
        }

        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      });

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || 50;
      const totalCount = matchingArticles.length;
      const paginatedArticles = matchingArticles.slice(offset, offset + limit);

      return {
        articles: paginatedArticles,
        totalCount,
        hasMore: offset + limit < totalCount,
        query
      };

    } catch (error: any) {
      this.logger.error('Failed to query articles', error);
      throw error;
    }
  }

  /**
   * Get article by ID
   */
  async getArticle(id: string): Promise<StoredArticle | null> {
    if (!this.isInitialized) {
      throw new Error('MetadataStorage is not initialized');
    }

    return this.articles.get(id) || null;
  }

  /**
   * Get articles by source
   */
  async getArticlesBySource(sourceId: string, limit?: number): Promise<StoredArticle[]> {
    if (!this.isInitialized) {
      throw new Error('MetadataStorage is not initialized');
    }

    const articleIds = this.sourceIndex.get(sourceId) || new Set();
    let articles = Array.from(articleIds).map(id => this.articles.get(id)).filter(Boolean) as StoredArticle[];

    // Sort by published date (newest first)
    articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    if (limit) {
      articles = articles.slice(0, limit);
    }

    return articles;
  }

  /**
   * Get articles by token
   */
  async getArticlesByToken(token: string, limit?: number): Promise<StoredArticle[]> {
    if (!this.isInitialized) {
      throw new Error('MetadataStorage is not initialized');
    }

    const articleIds = this.tokenIndex.get(token) || new Set();
    let articles = Array.from(articleIds).map(id => this.articles.get(id)).filter(Boolean) as StoredArticle[];

    // Sort by published date (newest first)
    articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    if (limit) {
      articles = articles.slice(0, limit);
    }

    return articles;
  }

  /**
   * Get articles by classification
   */
  async getArticlesByClassification(classification: NewsClassification, limit?: number): Promise<StoredArticle[]> {
    if (!this.isInitialized) {
      throw new Error('MetadataStorage is not initialized');
    }

    const articleIds = this.classificationIndex.get(classification) || new Set();
    let articles = Array.from(articleIds).map(id => this.articles.get(id)).filter(Boolean) as StoredArticle[];

    // Sort by published date (newest first)
    articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    if (limit) {
      articles = articles.slice(0, limit);
    }

    return articles;
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    if (!this.isInitialized) {
      throw new Error('MetadataStorage is not initialized');
    }

    const articles = Array.from(this.articles.values());
    const alerts = Array.from(this.alerts.values());

    // Calculate oldest and newest articles
    let oldestArticle: Date | null = null;
    let newestArticle: Date | null = null;

    if (articles.length > 0) {
      oldestArticle = new Date(Math.min(...articles.map(a => a.publishedAt.getTime())));
      newestArticle = new Date(Math.max(...articles.map(a => a.publishedAt.getTime())));
    }

    // Calculate classifications breakdown
    const classificationsBreakdown: Record<NewsClassification, number> = {
      breaking_news: 0,
      regulatory: 0,
      protocol_exploit: 0,
      macroeconomic: 0,
      technical_analysis: 0,
      market_analysis: 0,
      company_news: 0,
      partnership: 0,
      funding: 0,
      adoption: 0,
      security: 0,
      general: 0
    };

    articles.forEach(article => {
      classificationsBreakdown[article.classification]++;
    });

    // Estimate storage size (rough calculation)
    const storageSize = articles.length * 5000; // Assume ~5KB per article

    return {
      totalArticles: articles.length,
      totalAlerts: alerts.length,
      storageSize,
      oldestArticle,
      newestArticle,
      sourcesCount: this.sourceIndex.size,
      classificationsBreakdown
    };
  }

  /**
   * Delete old articles (cleanup)
   */
  async cleanup(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> { // 30 days default
    if (!this.isInitialized) {
      throw new Error('MetadataStorage is not initialized');
    }

    try {
      const cutoffDate = new Date(Date.now() - maxAge);
      let deletedCount = 0;

      for (const [id, article] of this.articles.entries()) {
        if (article.storedAt < cutoffDate) {
          await this.deleteArticle(id);
          deletedCount++;
        }
      }

      this.logger.info(`Cleaned up ${deletedCount} old articles`);
      return deletedCount;

    } catch (error: any) {
      this.logger.error('Failed to cleanup old articles', error);
      throw error;
    }
  }

  /**
   * Delete a specific article
   */
  private async deleteArticle(id: string): Promise<void> {
    const article = this.articles.get(id);
    if (!article) return;

    // Remove from all indexes
    this.removeFromIndexes(article);

    // Remove from storage
    this.articles.delete(id);

    this.logger.debug(`Deleted article: ${id}`);
  }

  /**
   * Update search indexes for an article
   */
  private async updateIndexes(article: StoredArticle): Promise<void> {
    // Source index
    if (!this.sourceIndex.has(article.source.id)) {
      this.sourceIndex.set(article.source.id, new Set());
    }
    this.sourceIndex.get(article.source.id)!.add(article.id);

    // Token index
    for (const token of article.keyFacts.tokens) {
      if (!this.tokenIndex.has(token)) {
        this.tokenIndex.set(token, new Set());
      }
      this.tokenIndex.get(token)!.add(article.id);
    }

    // Classification index
    if (!this.classificationIndex.has(article.classification)) {
      this.classificationIndex.set(article.classification, new Set());
    }
    this.classificationIndex.get(article.classification)!.add(article.id);

    // Date index (YYYY-MM-DD format)
    const dateKey = article.publishedAt.toISOString().split('T')[0];
    if (!this.dateIndex.has(dateKey)) {
      this.dateIndex.set(dateKey, new Set());
    }
    this.dateIndex.get(dateKey)!.add(article.id);
  }

  /**
   * Remove article from all indexes
   */
  private removeFromIndexes(article: StoredArticle): void {
    // Source index
    const sourceSet = this.sourceIndex.get(article.source.id);
    if (sourceSet) {
      sourceSet.delete(article.id);
      if (sourceSet.size === 0) {
        this.sourceIndex.delete(article.source.id);
      }
    }

    // Token index
    for (const token of article.keyFacts.tokens) {
      const tokenSet = this.tokenIndex.get(token);
      if (tokenSet) {
        tokenSet.delete(article.id);
        if (tokenSet.size === 0) {
          this.tokenIndex.delete(token);
        }
      }
    }

    // Classification index
    const classificationSet = this.classificationIndex.get(article.classification);
    if (classificationSet) {
      classificationSet.delete(article.id);
      if (classificationSet.size === 0) {
        this.classificationIndex.delete(article.classification);
      }
    }

    // Date index
    const dateKey = article.publishedAt.toISOString().split('T')[0];
    const dateSet = this.dateIndex.get(dateKey);
    if (dateSet) {
      dateSet.delete(article.id);
      if (dateSet.size === 0) {
        this.dateIndex.delete(dateKey);
      }
    }
  }

  /**
   * Export data for backup
   */
  async exportData(): Promise<{
    articles: StoredArticle[];
    alerts: NewsAlert[];
    exportDate: Date;
    version: string;
  }> {
    if (!this.isInitialized) {
      throw new Error('MetadataStorage is not initialized');
    }

    return {
      articles: Array.from(this.articles.values()),
      alerts: Array.from(this.alerts.values()),
      exportDate: new Date(),
      version: '1.0'
    };
  }

  /**
   * Import data from backup
   */
  async importData(data: {
    articles: StoredArticle[];
    alerts: NewsAlert[];
  }): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('MetadataStorage is not initialized');
    }

    try {
      // Clear existing data
      this.articles.clear();
      this.alerts.clear();
      this.sourceIndex.clear();
      this.tokenIndex.clear();
      this.classificationIndex.clear();
      this.dateIndex.clear();

      // Import articles
      for (const article of data.articles) {
        this.articles.set(article.id, article);
        await this.updateIndexes(article);
      }

      // Import alerts
      for (const alert of data.alerts) {
        this.alerts.set(alert.id, alert);
      }

      this.logger.info(`Imported ${data.articles.length} articles and ${data.alerts.length} alerts`);

    } catch (error: any) {
      this.logger.error('Failed to import data', error);
      throw error;
    }
  }

  getStatus(): string {
    return this.isInitialized ? 'Active' : 'Not Initialized';
  }
}
