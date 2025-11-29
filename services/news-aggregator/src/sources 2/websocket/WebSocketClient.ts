/**
 * =========================================
 * WEBSOCKET CLIENT
 * =========================================
 * WebSocket client for real-time news feeds
 */

import WebSocket from 'ws';
import { Logger } from '../../utils/Logger';
import type { NewsSource, NewsArticle } from '../../types';

export class WebSocketClient {
  private logger: Logger;
  private sources: NewsSource[] = [];
  private isInitialized: boolean = false;
  private connections: Map<string, WebSocket> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(sources: NewsSource[] = []) {
    this.logger = new Logger('WebSocketClient');
    this.sources = sources.filter(s => s.type === 'websocket');
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing WebSocket Client...');

      // Connect to all WebSocket sources
      for (const source of this.sources) {
        await this.connectToSource(source);
      }

      this.isInitialized = true;
      this.logger.info('✅ WebSocket Client initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize WebSocket Client', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      // Close all connections
      for (const [sourceId, connection] of this.connections) {
        connection.close();
      }
      this.connections.clear();

      // Clear reconnect timers
      for (const [sourceId, timer] of this.reconnectTimers) {
        clearTimeout(timer);
      }
      this.reconnectTimers.clear();

      this.isInitialized = false;
      this.logger.info('✅ WebSocket Client stopped successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to stop WebSocket Client', error);
      throw error;
    }
  }

  addSource(source: NewsSource): void {
    this.sources.push(source);
    this.connectToSource(source);
  }

  private async connectToSource(source: NewsSource): Promise<void> {
    if (!source.enabled) return;

    try {
      this.logger.info(`Connecting to WebSocket: ${source.name} (${source.url})`);

      const ws = new WebSocket(source.url, {
        headers: {
          'User-Agent': 'CoinetNewsAggregator/1.0',
          ...source.apiKey && { 'Authorization': `Bearer ${source.apiKey}` }
        }
      });

      ws.on('open', () => {
        this.logger.info(`Connected to ${source.id} WebSocket`);
        source.lastFetch = new Date();
      });

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(message, source);
        } catch (error: any) {
          this.logger.error(`Failed to parse WebSocket message from ${source.id}`, error);
        }
      });

      ws.on('error', (error: Error) => {
        this.logger.error(`WebSocket error for ${source.id}`, error);
        source.errorCount++;
        this.scheduleReconnect(source);
      });

      ws.on('close', (code: number, reason: Buffer) => {
        this.logger.warn(`WebSocket closed for ${source.id}: ${code} - ${reason.toString()}`);
        this.scheduleReconnect(source);
      });

      this.connections.set(source.id, ws);

    } catch (error: any) {
      this.logger.error(`Failed to connect to ${source.id} WebSocket`, error);
      source.errorCount++;
      this.scheduleReconnect(source);
    }
  }

  private handleWebSocketMessage(message: any, source: NewsSource): void {
    try {
      // Handle different message types
      if (message.type === 'article' || message.article) {
        const article = this.convertWebSocketMessageToArticle(message, source);
        this.emit('article', article, source);
      } else if (message.type === 'heartbeat' || message.ping) {
        // Respond to heartbeat
        const ws = this.connections.get(source.id);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } else {
        this.logger.debug(`Received unknown message type from ${source.id}: ${message.type}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to handle WebSocket message from ${source.id}`, error);
    }
  }

  private convertWebSocketMessageToArticle(message: any, source: NewsSource): NewsArticle {
    const article = message.article || message;

    return {
      id: `${source.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source,
      title: article.title || article.headline || '',
      content: article.content || article.body || article.description || '',
      summary: article.summary || article.excerpt || '',
      url: article.url || article.link || '',
      publishedAt: new Date(article.publishedAt || article.timestamp || Date.now()),
      fetchedAt: new Date(),
      author: article.author || article.byline,
      imageUrl: article.imageUrl || article.image?.url,
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
      language: article.language || 'en',
      marketImpact: {
        volatility: 0,
        relevance: 0,
        scope: 'local'
      }
    };
  }

  private scheduleReconnect(source: NewsSource): void {
    // Clear existing reconnect timer
    const existingTimer = this.reconnectTimers.get(source.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule reconnect with exponential backoff
    const delay = Math.min(30000, 1000 * Math.pow(2, Math.min(source.errorCount, 10))); // Max 30 seconds

    const timer = setTimeout(() => {
      this.logger.info(`Attempting to reconnect to ${source.id} WebSocket`);
      this.connectToSource(source);
    }, delay);

    this.reconnectTimers.set(source.id, timer);
  }

  getStatus(): string {
    const connectedCount = Array.from(this.connections.values())
      .filter(ws => ws.readyState === WebSocket.OPEN).length;

    return this.isInitialized
      ? `Active (${connectedCount}/${this.connections.size} connected)`
      : 'Not Initialized';
  }

  // Event emitter for articles
  private emit(event: string, data: any, source?: NewsSource): void {
    // This will be connected to the main aggregator's event system
  }

  on(event: string, listener: (...args: any[]) => void): void {
    // Event listener setup - will be connected to main aggregator
  }
}
