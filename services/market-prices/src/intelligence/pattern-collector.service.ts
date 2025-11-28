/**
 * =========================================
 * PATTERN COLLECTOR SERVICE
 * =========================================
 * Collects and stores user access patterns for pattern mining
 * Privacy-aware design with configurable retention
 */

import { EventEmitter } from 'eventemitter3';
import { Pool } from 'pg';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';
import {
  AccessPattern,
  SessionContext,
  MarketConditionAnalysis,
  PatternMiningEvent,
} from './types/pattern.types';

export interface PatternCollectorConfig {
  database: Pool;
  batchSize?: number; // Batch writes for performance
  flushInterval?: number; // Auto-flush interval (ms)
  maxMemoryBufferSize?: number; // Max patterns in memory before forced flush
  enablePersistence?: boolean; // Store in database
  anonymizeUserIds?: boolean; // Hash user IDs for privacy
  retentionDays?: number; // How long to keep historical data
}

export class PatternCollectorService extends EventEmitter {
  private db: Pool;
  private config: PatternCollectorConfig;
  private memoryBuffer: AccessPattern[] = [];
  private flushTimer?: NodeJS.Timeout;
  private sessionCache: Map<string, SessionContext> = new Map();
  private initialized: boolean = false;

  constructor(config: PatternCollectorConfig) {
    super();

    this.config = {
      batchSize: 100,
      flushInterval: 30000, // 30 seconds
      maxMemoryBufferSize: 1000,
      enablePersistence: true,
      anonymizeUserIds: true,
      retentionDays: 90,
      ...config,
    };

    this.db = config.database;

    logger.info('Pattern Collector Service initialized', {
      batchSize: this.config.batchSize,
      flushInterval: this.config.flushInterval,
      anonymizeUserIds: this.config.anonymizeUserIds,
    });
  }

  /**
   * Initialize service - create database tables
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create access_patterns table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS access_patterns (
          id SERIAL PRIMARY KEY,
          user_id_hash VARCHAR(64) NOT NULL,
          requested_tokens TEXT[] NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          session_id VARCHAR(64) NOT NULL,
          sequence INTEGER NOT NULL,
          time_of_day INTEGER NOT NULL,
          day_of_week INTEGER NOT NULL,
          market_condition VARCHAR(20) NOT NULL,
          request_type VARCHAR(20) NOT NULL,
          response_time INTEGER NOT NULL,
          cached BOOLEAN NOT NULL,
          user_agent TEXT,
          region VARCHAR(10)
        );

        CREATE INDEX IF NOT EXISTS idx_access_patterns_session 
          ON access_patterns(session_id);
        
        CREATE INDEX IF NOT EXISTS idx_access_patterns_timestamp 
          ON access_patterns(timestamp DESC);
        
        CREATE INDEX IF NOT EXISTS idx_access_patterns_user 
          ON access_patterns(user_id_hash);
        
        CREATE INDEX IF NOT EXISTS idx_access_patterns_tokens 
          ON access_patterns USING GIN(requested_tokens);
      `);

      // Create sessions table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          session_id VARCHAR(64) PRIMARY KEY,
          user_id_hash VARCHAR(64),
          start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          request_count INTEGER DEFAULT 0,
          market_condition VARCHAR(20),
          time_of_day INTEGER,
          day_of_week INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_user 
          ON user_sessions(user_id_hash);
        
        CREATE INDEX IF NOT EXISTS idx_sessions_start_time 
          ON user_sessions(start_time DESC);
      `);

      // Start auto-flush timer
      this.startAutoFlush();

      this.initialized = true;
      logger.info('Pattern Collector tables initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Pattern Collector', { error });
      throw error;
    }
  }

  /**
   * Record a user access pattern
   */
  async recordAccess(
    userId: string,
    tokens: string[],
    sessionId: string,
    metadata?: {
      responseTime?: number;
      cached?: boolean;
      userAgent?: string;
      region?: string;
    }
  ): Promise<void> {
    try {
      // Get or create session context
      const session = await this.getOrCreateSession(sessionId, userId);

      // Create access pattern
      const pattern: AccessPattern = {
        userId: this.config.anonymizeUserIds ? this.hashUserId(userId) : userId,
        requestedTokens: tokens,
        timestamp: new Date(),
        sessionId,
        sequence: session.requestCount + 1,
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        marketCondition: session.marketCondition,
        requestType: this.determineRequestType(tokens),
        responseTime: metadata?.responseTime || 0,
        cached: metadata?.cached || false,
        userAgent: metadata?.userAgent,
        region: metadata?.region,
      };

      // Add to memory buffer
      this.memoryBuffer.push(pattern);

      // Update session
      session.requestCount++;
      session.recentTokens.push(...tokens);
      if (session.recentTokens.length > 20) {
        session.recentTokens = session.recentTokens.slice(-20); // Keep last 20
      }
      this.sessionCache.set(sessionId, session);

      // Emit event
      this.emit('access_recorded', pattern);

      // Flush if buffer is full
      if (this.memoryBuffer.length >= this.config.maxMemoryBufferSize!) {
        await this.flush();
      }
    } catch (error) {
      logger.error('Failed to record access pattern', { error, userId, tokens });
    }
  }

  /**
   * Get or create session context
   */
  private async getOrCreateSession(
    sessionId: string,
    userId: string
  ): Promise<SessionContext> {
    // Check memory cache first
    let session = this.sessionCache.get(sessionId);
    if (session) return session;

    // Check database
    try {
      const result = await this.db.query(
        `SELECT * FROM user_sessions WHERE session_id = $1`,
        [sessionId]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        session = {
          sessionId,
          userId: row.user_id_hash,
          recentTokens: [],
          sessionStartTime: row.start_time,
          requestCount: row.request_count,
          marketCondition: row.market_condition,
          timeOfDay: row.time_of_day,
          dayOfWeek: row.day_of_week,
        };
      }
    } catch (error) {
      logger.warn('Failed to load session from database', { error, sessionId });
    }

    // Create new session if not found
    if (!session) {
      const marketCondition = await this.getCurrentMarketCondition();
      session = {
        sessionId,
        userId: this.config.anonymizeUserIds ? this.hashUserId(userId) : userId,
        recentTokens: [],
        sessionStartTime: new Date(),
        requestCount: 0,
        marketCondition,
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
      };

      // Save to database
      if (this.config.enablePersistence) {
        try {
          await this.db.query(
            `INSERT INTO user_sessions 
            (session_id, user_id_hash, market_condition, time_of_day, day_of_week)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (session_id) DO NOTHING`,
            [
              sessionId,
              session.userId,
              session.marketCondition,
              session.timeOfDay,
              session.dayOfWeek,
            ]
          );
        } catch (error) {
          logger.warn('Failed to save session to database', { error });
        }
      }
    }

    this.sessionCache.set(sessionId, session);
    return session;
  }

  /**
   * Flush memory buffer to database
   */
  async flush(): Promise<void> {
    if (this.memoryBuffer.length === 0) return;
    if (!this.config.enablePersistence) {
      this.memoryBuffer = []; // Clear buffer but don't persist
      return;
    }

    const patterns = [...this.memoryBuffer];
    this.memoryBuffer = [];

    try {
      // Batch insert for performance
      const values: any[] = [];
      const placeholders: string[] = [];

      patterns.forEach((pattern, index) => {
        const offset = index * 13;
        placeholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${
            offset + 5
          }, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${
            offset + 10
          }, $${offset + 11}, $${offset + 12}, $${offset + 13})`
        );

        values.push(
          pattern.userId,
          pattern.requestedTokens,
          pattern.timestamp,
          pattern.sessionId,
          pattern.sequence,
          pattern.timeOfDay,
          pattern.dayOfWeek,
          pattern.marketCondition,
          pattern.requestType,
          pattern.responseTime,
          pattern.cached,
          pattern.userAgent,
          pattern.region
        );
      });

      const query = `
        INSERT INTO access_patterns 
        (user_id_hash, requested_tokens, timestamp, session_id, sequence, 
         time_of_day, day_of_week, market_condition, request_type, 
         response_time, cached, user_agent, region)
        VALUES ${placeholders.join(', ')}
      `;

      await this.db.query(query, values);

      logger.debug('Flushed access patterns to database', {
        count: patterns.length,
      });

      this.emit('patterns_flushed', { count: patterns.length });
    } catch (error) {
      logger.error('Failed to flush patterns to database', { error });
      // Put patterns back in buffer
      this.memoryBuffer.unshift(...patterns);
    }
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush(): void {
    if (this.flushTimer) return;

    this.flushTimer = setInterval(() => {
      this.flush().catch((error) => {
        logger.error('Auto-flush failed', { error });
      });
    }, this.config.flushInterval);

    logger.debug('Auto-flush timer started', {
      interval: this.config.flushInterval,
    });
  }

  /**
   * Stop auto-flush timer
   */
  private stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
      logger.debug('Auto-flush timer stopped');
    }
  }

  /**
   * Get recent access patterns for analysis
   */
  async getRecentPatterns(
    limit: number = 10000,
    since?: Date
  ): Promise<AccessPattern[]> {
    try {
      const query = since
        ? `SELECT * FROM access_patterns 
           WHERE timestamp >= $1 
           ORDER BY timestamp DESC 
           LIMIT $2`
        : `SELECT * FROM access_patterns 
           ORDER BY timestamp DESC 
           LIMIT $1`;

      const params = since ? [since, limit] : [limit];
      const result = await this.db.query(query, params);

      return result.rows.map((row) => ({
        userId: row.user_id_hash,
        requestedTokens: row.requested_tokens,
        timestamp: row.timestamp,
        sessionId: row.session_id,
        sequence: row.sequence,
        timeOfDay: row.time_of_day,
        dayOfWeek: row.day_of_week,
        marketCondition: row.market_condition,
        requestType: row.request_type,
        responseTime: row.response_time,
        cached: row.cached,
        userAgent: row.user_agent,
        region: row.region,
      }));
    } catch (error) {
      logger.error('Failed to get recent patterns', { error });
      return [];
    }
  }

  /**
   * Get statistics about collected patterns
   */
  async getStatistics(): Promise<{
    totalPatterns: number;
    totalSessions: number;
    uniqueUsers: number;
    avgPatternsPerSession: number;
    cacheHitRate: number;
  }> {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) as total_patterns,
          COUNT(DISTINCT session_id) as total_sessions,
          COUNT(DISTINCT user_id_hash) as unique_users,
          AVG(CASE WHEN cached THEN 1 ELSE 0 END) as cache_hit_rate
        FROM access_patterns
        WHERE timestamp >= NOW() - INTERVAL '7 days'
      `);

      const row = result.rows[0];
      const totalPatterns = parseInt(row.total_patterns) || 0;
      const totalSessions = parseInt(row.total_sessions) || 0;
      
      return {
        totalPatterns,
        totalSessions,
        uniqueUsers: parseInt(row.unique_users) || 0,
        avgPatternsPerSession: totalSessions > 0 ? totalPatterns / totalSessions : 0,
        cacheHitRate: parseFloat(row.cache_hit_rate) || 0,
      };
    } catch (error) {
      logger.error('Failed to get statistics', { error });
      return {
        totalPatterns: 0,
        totalSessions: 0,
        uniqueUsers: 0,
        avgPatternsPerSession: 0,
        cacheHitRate: 0,
      };
    }
  }

  /**
   * Clean up old patterns (retention policy)
   */
  async cleanup(): Promise<number> {
    if (!this.config.enablePersistence) return 0;

    try {
      // Use parameterized query to prevent SQL injection
      const result = await this.db.query(
        `DELETE FROM access_patterns 
         WHERE timestamp < NOW() - INTERVAL '1 day' * $1
         RETURNING id`,
        [this.config.retentionDays]
      );

      const deletedCount = result.rowCount || 0;
      logger.info('Cleaned up old access patterns', { deletedCount });

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old patterns', { error });
      return 0;
    }
  }

  /**
   * Hash user ID for privacy
   */
  private hashUserId(userId: string): string {
    return crypto.createHash('sha256').update(userId).digest('hex');
  }

  /**
   * Determine request type based on tokens
   */
  private determineRequestType(tokens: string[]): 'single' | 'portfolio' | 'market_overview' {
    if (tokens.length === 1) return 'single';
    if (tokens.length >= 10) return 'market_overview';
    return 'portfolio';
  }

  /**
   * Get current market condition
   */
  private async getCurrentMarketCondition(): Promise<
    'bull' | 'bear' | 'neutral' | 'extreme_volatile'
  > {
    // Simplified - in production, would fetch from market data service
    return 'neutral';
  }

  /**
   * Destroy service - cleanup and flush remaining data
   */
  async destroy(): Promise<void> {
    this.stopAutoFlush();
    await this.flush();
    this.sessionCache.clear();
    this.removeAllListeners();
    logger.info('Pattern Collector Service destroyed');
  }
}

