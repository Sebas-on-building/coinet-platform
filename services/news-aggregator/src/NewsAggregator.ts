/**
 * =========================================
 * NEWS AGGREGATOR
 * =========================================
 * Main orchestration service for real-time news aggregation and analysis
 * across multiple sources with intelligent classification and tagging
 */

import { EventEmitter } from 'events';
import { RSSClient } from './sources/rss/RSSClient';
import { APIClient } from './sources/api/APIClient';
import { WebSocketClient } from './sources/websocket/WebSocketClient';
import { NewsClassifier } from './classification/NewsClassifier';
import { NLPAnalyzer } from './nlp/NLPAnalyzer';
import { TokenTagger } from './tagging/TokenTagger';
import { HealthMonitor } from './monitoring/HealthMonitor';
import { MetricsCollector } from './monitoring/MetricsCollector';
import { CacheManager } from './caching/CacheManager';
import { PriorityQueue } from './queue/PriorityQueue';
import { MetadataStorage } from './storage/MetadataStorage';
import { Logger } from './utils/Logger';

import type {
  NewsSource,
  NewsArticle,
  NewsAlert,
  NewsMetrics,
  AggregatorConfig,
  HealthStatus,
  StreamingEvent,
  ProcessingError,
  BackfillRequest,
  BackfillResult,
  NewsClassification
} from './types';

export interface NewsAggregatorConfig extends AggregatorConfig {
  sources: NewsSource[];
  tokenProjectMappings: any[]; // TokenProjectMapping[]
  classificationKeywords: Record<NewsClassification, string[]>;
}

export class NewsAggregator extends EventEmitter {
  private rssClient: RSSClient;
  private apiClient: APIClient;
  private websocketClient: WebSocketClient;
  private newsClassifier: NewsClassifier;
  private nlpAnalyzer: NLPAnalyzer;
  private tokenTagger: TokenTagger;
  private healthMonitor: HealthMonitor;
  private metricsCollector: MetricsCollector;
  private cacheManager: CacheManager;
  private priorityQueue: PriorityQueue;
  private metadataStorage: MetadataStorage;

  private logger: Logger;
  private config: NewsAggregatorConfig;
  private isRunning: boolean = false;
  private activeSources: Map<string, NewsSource> = new Map();

  // Performance tracking
  private articlesProcessed: number = 0;
  private startTime: number = Date.now();
  private processingLatencies: number[] = [];

  constructor(config?: Partial<NewsAggregatorConfig>) {
    super();
    this.logger = new Logger('NewsAggregator');

    // Default configuration
    this.config = {
      maxProcessingLatencyMs: 2000, // 2 seconds for news processing
      batchSize: 50,
      maxConcurrentRequests: 10,
      cacheTtlSeconds: 300,
      aggregationWindows: {
        short: 60,    // 1 minute
        medium: 300,  // 5 minutes
        long: 3600    // 1 hour
      },
      classificationThresholds: {
        breaking: 0.8,
        regulatory: 0.7,
        exploit: 0.9,
        macro: 0.6
      },
      backfillSettings: {
        maxDaysBack: 30,
        maxArticlesPerDay: 1000,
        retryAttempts: 3
      },
      sources: [
        {
          id: 'coindesk',
          name: 'CoinDesk',
          type: 'rss',
          url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
          enabled: true,
          updateInterval: 60000, // 1 minute
          errorCount: 0
        },
        {
          id: 'cointelegraph',
          name: 'CoinTelegraph',
          type: 'rss',
          url: 'https://cointelegraph.com/rss',
          enabled: true,
          updateInterval: 60000,
          errorCount: 0
        },
        {
          id: 'reuters-crypto',
          name: 'Reuters Crypto',
          type: 'rss',
          url: 'https://feeds.reuters.com/reuters/technologyNews',
          enabled: true,
          updateInterval: 300000, // 5 minutes
          errorCount: 0
        }
      ],
      tokenProjectMappings: [], // Will be loaded from external source
      classificationKeywords: {
        breaking_news: ['breaking', 'urgent', 'flash', 'alert', 'emergency'],
        regulatory: ['sec', 'fda', 'regulation', 'compliance', 'law', 'legal'],
        protocol_exploit: ['exploit', 'hack', 'breach', 'vulnerability', 'attack'],
        macroeconomic: ['fed', 'interest rate', 'inflation', 'recession', 'gdp'],
        technical_analysis: ['technical', 'chart', 'pattern', 'resistance', 'support'],
        market_analysis: ['market', 'analysis', 'trend', 'forecast', 'prediction'],
        company_news: ['company', 'announcement', 'earnings', 'quarterly'],
        partnership: ['partnership', 'alliance', 'collaboration', 'joint'],
        funding: ['funding', 'investment', 'raised', 'series', 'venture'],
        adoption: ['adoption', 'integration', 'implementation', 'mainstream'],
        security: ['security', 'protection', 'defense', 'safety'],
        general: []
      },
      ...config
    };

    // Initialize components
    this.rssClient = new RSSClient(this.config.sources.filter(s => s.type === 'rss'));
    this.apiClient = new APIClient(this.config.sources.filter(s => s.type === 'api'));
    this.websocketClient = new WebSocketClient(this.config.sources.filter(s => s.type === 'websocket'));
    this.newsClassifier = new NewsClassifier(this.config.classificationKeywords);
    this.nlpAnalyzer = new NLPAnalyzer();
    this.tokenTagger = new TokenTagger(this.config.tokenProjectMappings);
    this.healthMonitor = new HealthMonitor();
    this.metricsCollector = new MetricsCollector();
    this.cacheManager = new CacheManager(this.config.cacheTtlSeconds);
    this.priorityQueue = new PriorityQueue({
      maxConcurrent: this.config.maxConcurrentRequests,
      maxRetries: 3,
      baseRetryDelay: 5000
    });
    this.metadataStorage = new MetadataStorage();

    this.setupEventHandlers();
  }

  /**
   * Start the news aggregation service
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting News Aggregator...');

      // Initialize all components
      await this.rssClient.initialize();
      await this.apiClient.initialize();
      await this.websocketClient.initialize();
      await this.newsClassifier.initialize();
      await this.nlpAnalyzer.initialize();
      await this.tokenTagger.initialize();
      await this.healthMonitor.initialize();
      await this.metricsCollector.initialize();
      await this.cacheManager.initialize();
      await this.priorityQueue.start();
      await this.metadataStorage.initialize();

      // Set up source monitoring
      this.setupSourceMonitoring();

      this.isRunning = true;
      this.startTime = Date.now();

      this.logger.info('✅ News Aggregator started successfully');
      this.logger.info(`Monitoring ${this.config.sources.filter(s => s.enabled).length} active sources`);

    } catch (error: any) {
      this.logger.error('❌ Failed to start News Aggregator', error);
      throw error;
    }
  }

  /**
   * Stop the news aggregation service
   */
  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping News Aggregator...');

      // Stop all clients
      await this.rssClient.stop();
      await this.apiClient.stop();
      await this.websocketClient.stop();

      // Stop core components
      await this.newsClassifier.stop();
      await this.nlpAnalyzer.stop();
      await this.tokenTagger.stop();
      await this.healthMonitor.stop();
      await this.metricsCollector.stop();
      await this.cacheManager.stop();
      await this.priorityQueue.stop();
      await this.metadataStorage.stop();

      this.isRunning = false;
      this.logger.info('✅ News Aggregator stopped successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to stop News Aggregator', error);
      throw error;
    }
  }

  /**
   * Process a news article through the entire pipeline
   */
  async processArticle(rawArticle: any, source: NewsSource): Promise<NewsArticle | null> {
    const startTime = Date.now();

    try {
      // Convert raw article to standardized format
      const article = await this.normalizeArticle(rawArticle, source);

      // Skip if article doesn't meet criteria
      if (!this.shouldProcessArticle(article)) {
        return null;
      }

      // Apply deduplication
      if (this.isDuplicateArticle(article)) {
        return null;
      }

      // Classify the article
      const classification = await this.newsClassifier.classifyArticle(article);

      // Apply NLP analysis
      const nlpResult = await this.nlpAnalyzer.analyzeArticle(article);

      // Extract key facts
      const keyFacts = await this.nlpAnalyzer.extractKeyFacts(article);

      // Tag with tokens and projects
      const tagging = await this.tokenTagger.tagArticle(article);

      // Build complete article
      const processedArticle: NewsArticle = {
        ...article,
        classification: classification.type,
        urgency: this.determineUrgency(classification),
        confidence: classification.confidence,
        sentiment: nlpResult.sentiment,
        keyFacts,
        entities: nlpResult.entities,
        processingLatencyMs: Date.now() - startTime,
        wordCount: article.content.split(' ').length,
        language: nlpResult.language,
        marketImpact: this.assessMarketImpact(article, classification, tagging)
      };

      // Record processing metrics
      this.processingLatencies.push(processedArticle.processingLatencyMs);
      this.articlesProcessed++;

      // Add to priority queue for processing
      this.priorityQueue.enqueue(processedArticle);

      // Generate alerts if needed (immediate for high priority)
      if (this.shouldGenerateAlert(processedArticle)) {
        const alert = await this.generateAlert(processedArticle);
        this.emit('alert', {
          type: 'alert',
          data: alert,
          timestamp: new Date(),
          source: source.id
        } as StreamingEvent);
      }

      // Performance logging
      this.logger.performance('article_processing', processedArticle.processingLatencyMs, {
        source: source.id,
        article_id: processedArticle.id,
        classification: processedArticle.classification,
        content_length: processedArticle.content.length
      });

      // Check if we're meeting latency requirements
      if (processedArticle.processingLatencyMs > this.config.maxProcessingLatencyMs) {
        this.logger.warn(`Processing latency exceeded target: ${processedArticle.processingLatencyMs}ms > ${this.config.maxProcessingLatencyMs}ms`);
      }

      return processedArticle;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Failed to process article from ${source.id}`, {
        error: error.message,
        processing_time_ms: processingTime,
        source: source.id,
        title: rawArticle.title
      });

      // Emit error event
      this.emit('error', {
        type: 'error',
        data: {
          id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          source: source.id,
          error_type: 'processing_error',
          error_message: error.message || 'Unknown error',
          retry_count: 0,
          timestamp: new Date(),
          will_retry: false
        } as ProcessingError,
        timestamp: new Date()
      } as StreamingEvent);

      return null;
    }
  }

  /**
   * Backfill historical news data
   */
  async backfillData(request: BackfillRequest): Promise<BackfillResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      this.logger.info('Starting news backfill', {
        start_date: request.startDate.toISOString(),
        end_date: request.endDate.toISOString(),
        sources: request.sources?.length || 'all',
        max_articles: request.maxArticles
      });

      const articles: NewsArticle[] = [];
      let totalFetched = 0;

      // Process each enabled source
      const sourcesToProcess = request.sources
        ? this.config.sources.filter(s => request.sources!.includes(s.id))
        : this.config.sources.filter(s => s.enabled);

      for (const source of sourcesToProcess) {
        try {
          const sourceArticles = await this.fetchHistoricalArticles(source, request);
          articles.push(...sourceArticles);
          totalFetched += sourceArticles.length;

          // Respect rate limits
          await this.delay(1000); // 1 second between sources

        } catch (error: any) {
          errors.push(`${source.id}: ${error.message}`);
          this.logger.error(`Failed to backfill from ${source.id}`, error);
        }
      }

      const result: BackfillResult = {
        request,
        articles: articles.slice(0, request.maxArticles),
        totalFetched,
        duration: Date.now() - startTime,
        errors
      };

      this.logger.info('Backfill completed', {
        articles_fetched: result.articles.length,
        total_found: totalFetched,
        duration_ms: result.duration,
        errors_count: errors.length
      });

      return result;

    } catch (error: any) {
      this.logger.error('Backfill failed', error);
      return {
        request,
        articles: [],
        totalFetched: 0,
        duration: Date.now() - startTime,
        errors: [error.message]
      };
    }
  }

  /**
   * Get current service status
   */
  getStatus(): string {
    const components = [
      `RSS: ${this.rssClient.getStatus()}`,
      `API: ${this.apiClient.getStatus()}`,
      `WebSocket: ${this.websocketClient.getStatus()}`,
      `Classifier: ${this.newsClassifier.getStatus()}`,
      `NLP: ${this.nlpAnalyzer.getStatus()}`,
      `Tagger: ${this.tokenTagger.getStatus()}`,
      `Queue: ${this.priorityQueue.getStatus()}`,
      `Storage: ${this.metadataStorage.getStatus()}`
    ];

    return this.isRunning ? `Running (${components.join(', ')})` : 'Stopped';
  }

  /**
   * Get detailed health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const avgLatency = this.processingLatencies.length > 0
      ? this.processingLatencies.reduce((a, b) => a + b, 0) / this.processingLatencies.length
      : 0;

    const queueStats = this.priorityQueue.getStats();

    return {
      is_running: this.isRunning,
      uptime_seconds: uptimeSeconds,
      active_sources: this.activeSources.size,
      articles_processed_total: this.articlesProcessed,
      articles_per_second: this.articlesProcessed / Math.max(1, uptimeSeconds),
      avg_processing_latency_ms: avgLatency,
      error_rate: await this.metricsCollector.getErrorRate(),
      source_health: await this.getSourceHealth(),
      queue_stats: {
        total_items: queueStats.totalItems,
        high_priority_items: queueStats.highPriorityItems,
        processing_items: queueStats.processingItems,
        failed_items: queueStats.failedItems,
        avg_processing_time_ms: queueStats.averageProcessingTime
      },
      memory_usage: {
        heap_used_mb: process.memoryUsage().heapUsed / 1024 / 1024,
        heap_total_mb: process.memoryUsage().heapTotal / 1024 / 1024,
        external_mb: process.memoryUsage().external / 1024 / 1024
      }
    };
  }

  // Private helper methods

  private setupEventHandlers(): void {
    // Handle articles from all sources
    this.rssClient.on('article', async (rawArticle: any, source: NewsSource) => {
      await this.processArticle(rawArticle, source);
    });

    this.apiClient.on('article', async (rawArticle: any, source: NewsSource) => {
      await this.processArticle(rawArticle, source);
    });

    this.websocketClient.on('article', async (rawArticle: any, source: NewsSource) => {
      await this.processArticle(rawArticle, source);
    });

    // Handle priority queue events
    this.priorityQueue.on('item-processed', async (event) => {
      const { item, processingTime, success } = event;

      // Store in metadata storage
      await this.metadataStorage.storeArticle(item.article);

      this.emit('article', {
        type: 'article',
        data: item.article,
        timestamp: new Date(),
        source: item.article.source.id,
        processingTime,
        priority: item.priority
      } as StreamingEvent);
    });

    this.priorityQueue.on('high-priority-item', (queueItem) => {
      this.logger.info(`High priority item detected: ${queueItem.article.title} (priority: ${queueItem.priority})`);
    });

    this.priorityQueue.on('item-failed', (event) => {
      this.logger.error(`Priority queue item failed: ${event.item.article.id}`, event.error);
    });
  }

  private setupSourceMonitoring(): void {
    // Monitor each enabled source
    for (const source of this.config.sources.filter(s => s.enabled)) {
      this.activeSources.set(source.id, source);

      // Set up periodic fetching based on source type
      switch (source.type) {
        case 'rss':
          this.rssClient.addSource(source);
          break;
        case 'api':
          this.apiClient.addSource(source);
          break;
        case 'websocket':
          this.websocketClient.addSource(source);
          break;
      }
    }
  }

  private async normalizeArticle(rawArticle: any, source: NewsSource): Promise<NewsArticle> {
    // Convert source-specific format to standardized NewsArticle
    return {
      id: `${source.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source,
      title: rawArticle.title || '',
      content: rawArticle.content || rawArticle.description || '',
      summary: '',
      url: rawArticle.url || rawArticle.link || '',
      publishedAt: new Date(rawArticle.publishedAt || rawArticle.pubDate || Date.now()),
      fetchedAt: new Date(),
      author: rawArticle.author || rawArticle.creator,
      imageUrl: rawArticle.imageUrl || rawArticle.image?.url,
      classification: 'general' as NewsClassification,
      urgency: 'low' as const,
      confidence: 0,
      sentiment: {
        score: 0,
        confidence: 0,
        label: 'neutral' as const
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
        scope: 'local' as const
      }
    };
  }

  private shouldProcessArticle(article: NewsArticle): boolean {
    // Basic filtering criteria
    if (!article.title || !article.content) return false;
    if (article.content.length < 50) return false; // Too short
    if (article.publishedAt.getTime() < Date.now() - 24 * 60 * 60 * 1000) return false; // Older than 24h

    return true;
  }

  private isDuplicateArticle(article: NewsArticle): boolean {
    // Check cache for duplicates
    const cacheKey = `article_${article.url}`;
    return this.cacheManager.has(cacheKey);
  }

  private determineUrgency(classification: any): any {
    // Determine urgency based on classification and content
    if (classification.type === 'breaking_news' && classification.confidence > 0.8) {
      return 'critical';
    }
    if (classification.type === 'protocol_exploit' && classification.confidence > 0.7) {
      return 'high';
    }
    if (classification.type === 'regulatory' && classification.confidence > 0.6) {
      return 'high';
    }
    return 'medium';
  }

  private assessMarketImpact(article: NewsArticle, classification: any, tagging: any): any {
    let volatility = 0;
    let relevance = classification.confidence;

    // Adjust based on classification
    switch (classification.type) {
      case 'breaking_news':
        volatility = 0.8;
        break;
      case 'protocol_exploit':
        volatility = 0.9;
        break;
      case 'regulatory':
        volatility = 0.7;
        break;
      case 'macroeconomic':
        volatility = 0.6;
        break;
      default:
        volatility = 0.3;
    }

    // Adjust based on token mentions
    const tokenCount = tagging.tokens?.length || 0;
    relevance = Math.min(1, relevance + (tokenCount * 0.1));

    return {
      volatility,
      relevance,
      scope: tokenCount > 5 ? 'global' : tokenCount > 2 ? 'regional' : 'local'
    };
  }

  private shouldGenerateAlert(article: NewsArticle): boolean {
    return article.urgency === 'high' || article.urgency === 'critical';
  }

  private async generateAlert(article: NewsArticle): Promise<NewsAlert> {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      articleId: article.id,
      type: article.classification === 'breaking_news' ? 'breaking' :
            article.classification === 'regulatory' ? 'regulatory' :
            article.classification === 'protocol_exploit' ? 'exploit' : 'macro',
      urgency: article.urgency,
      title: article.title,
      summary: article.summary,
      affectedTokens: article.keyFacts.tokens,
      affectedProjects: article.keyFacts.projects,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
  }

  private async fetchHistoricalArticles(source: NewsSource, request: BackfillRequest): Promise<NewsArticle[]> {
    // Implementation depends on source type
    switch (source.type) {
      case 'rss':
        return await this.rssClient.fetchHistorical(source, request);
      case 'api':
        return await this.apiClient.fetchHistorical(source, request);
      default:
        return [];
    }
  }

  private async getSourceHealth(): Promise<Record<string, any>> {
    const health: Record<string, any> = {};

    for (const source of this.config.sources) {
      health[source.id] = {
        status: source.enabled ? 'healthy' : 'disabled',
        last_success: source.lastFetch || new Date(),
        articles_fetched: 0, // Would be tracked per source
        error_count: source.errorCount
      };
    }

    return health;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Query stored articles
   */
  async queryArticles(query: any): Promise<any> {
    return await this.metadataStorage.queryArticles(query);
  }

  /**
   * Get articles by source
   */
  async getArticlesBySource(sourceId: string, limit?: number): Promise<any[]> {
    return await this.metadataStorage.getArticlesBySource(sourceId, limit);
  }

  /**
   * Get articles by token
   */
  async getArticlesByToken(token: string, limit?: number): Promise<any[]> {
    return await this.metadataStorage.getArticlesByToken(token, limit);
  }

  /**
   * Get articles by classification
   */
  async getArticlesByClassification(classification: NewsClassification, limit?: number): Promise<any[]> {
    return await this.metadataStorage.getArticlesByClassification(classification, limit);
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<any> {
    return await this.metadataStorage.getStats();
  }

  /**
   * Export data for backup
   */
  async exportData(): Promise<any> {
    return await this.metadataStorage.exportData();
  }

  /**
   * Import data from backup
   */
  async importData(data: any): Promise<void> {
    return await this.metadataStorage.importData(data);
  }

  /**
   * Cleanup old articles
   */
  async cleanupStorage(maxAge?: number): Promise<number> {
    return await this.metadataStorage.cleanup(maxAge);
  }
}
