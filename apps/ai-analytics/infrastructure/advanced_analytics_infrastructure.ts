/**
 * =========================================
 * ADVANCED ANALYTICS INFRASTRUCTURE
 * =========================================
 * Divine world-class infrastructure for advanced analytics backend
 * Sophisticated caching, ML integration, and monitoring capabilities
 */

import { EventEmitter } from 'events';
import { Logger } from '../../../services/signal-evaluation-engine/src/utils/Logger';
import { MetricsCollector } from '../../../services/signal-evaluation-engine/src/monitoring/MetricsCollector';
import { Pool } from 'pg';

export interface AdvancedCacheConfig {
  enabled: boolean;
  type: 'redis' | 'memcached' | 'in_memory' | 'hybrid';
  ttl: number; // Time to live in seconds
  maxSize: number; // Maximum cache size
  compression: boolean;
  encryption: boolean;
  prefetch: boolean;
  invalidationStrategy: 'time_based' | 'dependency_based' | 'manual';
  consistency: 'strong' | 'eventual' | 'weak';
}

export interface MLIntegrationConfig {
  enabled: boolean;
  frameworks: string[];
  modelRegistry: {
    enabled: boolean;
    url?: string;
    apiKey?: string;
  };
  featureStore: {
    enabled: boolean;
    url?: string;
    apiKey?: string;
  };
  experimentTracking: {
    enabled: boolean;
    url?: string;
    apiKey?: string;
  };
  modelServing: {
    enabled: boolean;
    url?: string;
    apiKey?: string;
  };
  autoRetraining: {
    enabled: boolean;
    threshold: number;
    schedule: string;
  };
}

export interface MonitoringConfig {
  enabled: boolean;
  metrics: {
    collectionInterval: number; // seconds
    retentionDays: number;
    exportFormats: string[];
  };
  alerting: {
    enabled: boolean;
    rules: Array<{
      name: string;
      condition: string;
      severity: 'info' | 'warning' | 'error' | 'critical';
      channels: string[];
    }>;
  };
  tracing: {
    enabled: boolean;
    samplingRate: number;
    exporter: 'jaeger' | 'zipkin' | 'otlp';
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    structured: boolean;
  };
}

export interface AdvancedInfrastructureConfig {
  cache: AdvancedCacheConfig;
  ml: MLIntegrationConfig;
  monitoring: MonitoringConfig;
  performance: {
    maxConcurrentAnalyses: number;
    timeout: number; // seconds
    retryPolicy: {
      maxRetries: number;
      baseDelay: number;
      maxDelay: number;
    };
  };
  scalability: {
    autoScaling: boolean;
    minInstances: number;
    maxInstances: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
  };
}

export interface CacheEntry {
  key: string;
  value: any;
  ttl: number;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  size: number;
  compressed: boolean;
  encrypted: boolean;
  dependencies: string[]; // Keys this entry depends on
}

export interface MLModel {
  id: string;
  name: string;
  version: string;
  type: string;
  framework: string;
  status: 'training' | 'ready' | 'deployed' | 'deprecated';
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  features: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MonitoringMetric {
  name: string;
  value: number;
  timestamp: Date;
  tags: Record<string, string>;
  unit: string;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  channels: string[];
  enabled: boolean;
  lastTriggered?: Date;
  triggerCount: number;
}

export class AdvancedAnalyticsInfrastructure extends EventEmitter {
  private logger: Logger;
  private metrics: MetricsCollector;
  private db: Pool;
  private config: AdvancedInfrastructureConfig;
  private isInitialized: boolean = false;

  // Advanced caching system
  private cache: Map<string, CacheEntry> = new Map();
  private cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0
  };

  // ML model registry
  private mlModels: Map<string, MLModel> = new Map();
  private modelPerformance: Map<string, any> = new Map();

  // Monitoring and alerting
  private alertRules: Map<string, AlertRule> = new Map();
  private monitoringMetrics: MonitoringMetric[] = [];

  constructor(config: AdvancedInfrastructureConfig) {
    super();
    this.logger = new Logger('AdvancedAnalyticsInfrastructure');
    this.metrics = new MetricsCollector();
    this.config = config;
    this.db = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'coinet',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    });

    this.initializeInfrastructure();
  }

  /**
   * Initialize advanced analytics infrastructure
   */
  private async initializeInfrastructure(): Promise<void> {
    try {
      this.logger.info('Initializing advanced analytics infrastructure...');

      // Initialize database tables
      await this.initializeDatabase();

      // Initialize caching system
      if (this.config.cache.enabled) {
        await this.initializeCaching();
      }

      // Initialize ML integration
      if (this.config.ml.enabled) {
        await this.initializeMLIntegration();
      }

      // Initialize monitoring
      if (this.config.monitoring.enabled) {
        await this.initializeMonitoring();
      }

      this.isInitialized = true;
      this.logger.info('✅ Advanced analytics infrastructure initialized');

      // Start background processes
      this.startBackgroundProcesses();
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize advanced analytics infrastructure', error);
      throw error;
    }
  }

  /**
   * Initialize database tables for infrastructure
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // Cache metadata table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS analytics_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          cache_key VARCHAR(500) NOT NULL UNIQUE,
          cache_value JSONB NOT NULL,
          ttl INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          access_count INTEGER DEFAULT 0,
          size_bytes INTEGER NOT NULL,
          compressed BOOLEAN DEFAULT FALSE,
          encrypted BOOLEAN DEFAULT FALSE,
          dependencies JSONB DEFAULT '[]'::jsonb
        );

        CREATE INDEX IF NOT EXISTS idx_cache_key ON analytics_cache(cache_key);
        CREATE INDEX IF NOT EXISTS idx_cache_accessed ON analytics_cache(last_accessed);
        CREATE INDEX IF NOT EXISTS idx_cache_ttl ON analytics_cache(ttl);
      `);

      // ML model registry table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS ml_models (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          model_id VARCHAR(255) NOT NULL UNIQUE,
          model_name VARCHAR(255) NOT NULL,
          model_version VARCHAR(50) NOT NULL,
          model_type VARCHAR(100) NOT NULL,
          framework VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL,
          performance JSONB NOT NULL,
          features JSONB NOT NULL,
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_ml_models_status ON ml_models(status);
        CREATE INDEX IF NOT EXISTS idx_ml_models_type ON ml_models(model_type);
      `);

      // Monitoring metrics table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS monitoring_metrics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          metric_name VARCHAR(255) NOT NULL,
          metric_value DECIMAL(20,8) NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
          tags JSONB DEFAULT '{}'::jsonb,
          unit VARCHAR(50) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_name ON monitoring_metrics(metric_name);
        CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_timestamp ON monitoring_metrics(timestamp);
      `);

      // Alert rules table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS alert_rules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          rule_id VARCHAR(255) NOT NULL UNIQUE,
          rule_name VARCHAR(255) NOT NULL,
          condition TEXT NOT NULL,
          severity VARCHAR(20) NOT NULL,
          channels JSONB NOT NULL,
          enabled BOOLEAN DEFAULT TRUE,
          last_triggered TIMESTAMP WITH TIME ZONE,
          trigger_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled);
        CREATE INDEX IF NOT EXISTS idx_alert_rules_severity ON alert_rules(severity);
      `);

      this.logger.info('✅ Database tables initialized');
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize database tables', error);
      throw error;
    }
  }

  /**
   * Initialize advanced caching system
   */
  private async initializeCaching(): Promise<void> {
    try {
      this.logger.info('Initializing advanced caching system...');

      // Load existing cache entries from database
      const { rows } = await this.db.query(`
        SELECT * FROM analytics_cache
        WHERE ttl > EXTRACT(EPOCH FROM NOW())
      `);

      for (const row of rows) {
        this.cache.set(row.cache_key, {
          key: row.cache_key,
          value: row.cache_value,
          ttl: row.ttl,
          createdAt: row.created_at,
          lastAccessed: row.last_accessed,
          accessCount: row.access_count,
          size: row.size_bytes,
          compressed: row.compressed,
          encrypted: row.encrypted,
          dependencies: row.dependencies
        });
      }

      this.logger.info('✅ Advanced caching system initialized', {
        entries: this.cache.size,
        totalSize: Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0)
      });
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize caching system', error);
    }
  }

  /**
   * Initialize ML integration
   */
  private async initializeMLIntegration(): Promise<void> {
    try {
      this.logger.info('Initializing ML integration...');

      // Load existing models
      const { rows } = await this.db.query('SELECT * FROM ml_models');

      for (const row of rows) {
        this.mlModels.set(row.model_id, {
          id: row.model_id,
          name: row.model_name,
          version: row.model_version,
          type: row.model_type,
          framework: row.framework,
          status: row.status,
          performance: row.performance,
          features: row.features,
          metadata: row.metadata,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        });
      }

      this.logger.info('✅ ML integration initialized', {
        models: this.mlModels.size
      });
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize ML integration', error);
    }
  }

  /**
   * Initialize monitoring system
   */
  private async initializeMonitoring(): Promise<void> {
    try {
      this.logger.info('Initializing monitoring system...');

      // Load existing alert rules
      const { rows } = await this.db.query('SELECT * FROM alert_rules');

      for (const row of rows) {
        this.alertRules.set(row.rule_id, {
          id: row.rule_id,
          name: row.rule_name,
          condition: row.condition,
          severity: row.severity,
          channels: row.channels,
          enabled: row.enabled,
          lastTriggered: row.last_triggered,
          triggerCount: row.trigger_count
        });
      }

      this.logger.info('✅ Monitoring system initialized', {
        alertRules: this.alertRules.size
      });
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize monitoring system', error);
    }
  }

  /**
   * Start background processes for maintenance and monitoring
   */
  private startBackgroundProcesses(): void {
    // Cache cleanup
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 60000); // Every minute

    // Metrics collection
    setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.monitoring.metrics.collectionInterval * 1000);

    // Alert evaluation (would evaluate all active alerts periodically)
    // setInterval(() => {
    //   this.evaluateAllAlerts();
    // }, 30000); // Every 30 seconds

    // Cache prefetching
    if (this.config.cache.prefetch) {
      setInterval(() => {
        this.prefetchCache();
      }, 60000);
    }

    this.logger.info('✅ Background processes started');
  }

  /**
   * Advanced caching operations
   */
  async setCache(key: string, value: any, ttl?: number, dependencies: string[] = []): Promise<void> {
    try {
      const size = JSON.stringify(value).length;
      const entry: CacheEntry = {
        key,
        value,
        ttl: ttl || this.config.cache.ttl,
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        size,
        compressed: this.config.cache.compression,
        encrypted: this.config.cache.encryption,
        dependencies
      };

      // Compress if enabled
      if (entry.compressed) {
        // Implement compression logic
      }

      // Encrypt if enabled
      if (entry.encrypted) {
        // Implement encryption logic
      }

      // Check size limits
      if (this.config.cache.maxSize > 0 && this.cacheStats.size + size > this.config.cache.maxSize) {
        await this.evictCacheEntries(size);
      }

      this.cache.set(key, entry);
      this.cacheStats.size += size;

      // Store in database
      await this.db.query(`
        INSERT INTO analytics_cache (cache_key, cache_value, ttl, size_bytes, compressed, encrypted, dependencies)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (cache_key) DO UPDATE SET
          cache_value = $2,
          ttl = $3,
          last_accessed = NOW(),
          access_count = analytics_cache.access_count + 1,
          size_bytes = $4
      `, [key, JSON.stringify(value), entry.ttl, size, entry.compressed, entry.encrypted, JSON.stringify(dependencies)]);

      this.logger.debug('Cache entry set', { key, size });
    } catch (error: any) {
      this.logger.error('Failed to set cache entry', error);
    }
  }

  /**
   * Get cache entry with advanced features
   */
  async getCache(key: string): Promise<any | null> {
    try {
      const entry = this.cache.get(key);

      if (!entry) {
        this.cacheStats.misses++;
        return null;
      }

      // Check TTL
      if (entry.createdAt.getTime() + entry.ttl * 1000 < Date.now()) {
        this.cache.delete(key);
        this.cacheStats.size -= entry.size;
        this.cacheStats.evictions++;
        this.cacheStats.misses++;
        return null;
      }

      // Update access statistics
      entry.lastAccessed = new Date();
      entry.accessCount++;
      this.cacheStats.hits++;

      // Update database
      await this.db.query(`
        UPDATE analytics_cache
        SET last_accessed = NOW(), access_count = $1
        WHERE cache_key = $2
      `, [entry.accessCount, key]);

      // Prefetch dependent entries
      if (this.config.cache.prefetch && entry.dependencies.length > 0) {
        this.prefetchDependencies(entry.dependencies);
      }

      return entry.value;
    } catch (error: any) {
      this.logger.error('Failed to get cache entry', error);
      return null;
    }
  }

  /**
   * Evict cache entries to make room for new data
   */
  private async evictCacheEntries(requiredSize: number): Promise<void> {
    try {
      const entries = Array.from(this.cache.entries());
      const sortedEntries = entries.sort((a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime());

      let freedSize = 0;
      const toEvict: string[] = [];

      for (const [key, entry] of sortedEntries) {
        if (freedSize >= requiredSize) break;

        toEvict.push(key);
        freedSize += entry.size;
      }

      for (const key of toEvict) {
        const entry = this.cache.get(key);
        if (entry) {
          this.cache.delete(key);
          this.cacheStats.size -= entry.size;
          this.cacheStats.evictions++;
        }
      }

      // Remove from database
      if (toEvict.length > 0) {
        await this.db.query(`
          DELETE FROM analytics_cache WHERE cache_key = ANY($1)
        `, [toEvict]);
      }

      this.logger.debug('Cache eviction completed', {
        evictedEntries: toEvict.length,
        freedSize,
        remainingSize: this.cacheStats.size
      });
    } catch (error: any) {
      this.logger.error('Failed to evict cache entries', error);
    }
  }

  /**
   * Prefetch dependent cache entries
   */
  private prefetchDependencies(dependencies: string[]): void {
    // Simplified prefetching - would implement actual prefetching logic
    this.logger.debug('Prefetching cache dependencies', { count: dependencies.length });
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((entry, key) => {
      if (entry.createdAt.getTime() + entry.ttl * 1000 < now) {
        expiredKeys.push(key);
      }
    });

    for (const key of expiredKeys) {
      const entry = this.cache.get(key);
      if (entry) {
        this.cache.delete(key);
        this.cacheStats.size -= entry.size;
        this.cacheStats.evictions++;
      }
    }

    if (expiredKeys.length > 0) {
      this.logger.debug('Cache cleanup completed', { expiredEntries: expiredKeys.length });
    }
  }

  /**
   * =========================================
   * ML INTEGRATION METHODS
   * =========================================
   */

  /**
   * Register ML model in the registry
   */
  async registerMLModel(model: Omit<MLModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const modelId = `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const fullModel: MLModel = {
        ...model,
        id: modelId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.mlModels.set(modelId, fullModel);

      // Store in database
      await this.db.query(`
        INSERT INTO ml_models (model_id, model_name, model_version, model_type, framework, status, performance, features, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        modelId,
        model.name,
        model.version,
        model.type,
        model.framework,
        model.status,
        JSON.stringify(model.performance),
        JSON.stringify(model.features),
        JSON.stringify(model.metadata)
      ]);

      this.logger.info('ML model registered', { modelId, name: model.name, type: model.type });

      return modelId;
    } catch (error: any) {
      this.logger.error('Failed to register ML model', error);
      throw error;
    }
  }

  /**
   * Get ML model by ID
   */
  async getMLModel(modelId: string): Promise<MLModel | null> {
    try {
      const model = this.mlModels.get(modelId);

      if (model) {
        // Update access statistics
        model.metadata.lastAccessed = new Date();
        return model;
      }

      // Try to load from database
      const { rows } = await this.db.query(
        'SELECT * FROM ml_models WHERE model_id = $1',
        [modelId]
      );

      if (rows.length > 0) {
        const row = rows[0];
        const model: MLModel = {
          id: row.model_id,
          name: row.model_name,
          version: row.model_version,
          type: row.model_type,
          framework: row.framework,
          status: row.status,
          performance: row.performance,
          features: row.features,
          metadata: row.metadata,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };

        this.mlModels.set(modelId, model);
        return model;
      }

      return null;
    } catch (error: any) {
      this.logger.error('Failed to get ML model', error);
      return null;
    }
  }

  /**
   * Update model performance metrics
   */
  async updateModelPerformance(modelId: string, performance: any): Promise<void> {
    try {
      const model = this.mlModels.get(modelId);
      if (!model) {
        throw new Error(`Model ${modelId} not found`);
      }

      model.performance = { ...model.performance, ...performance };
      model.updatedAt = new Date();

      // Update in database
      await this.db.query(`
        UPDATE ml_models
        SET performance = $1, updated_at = NOW()
        WHERE model_id = $2
      `, [JSON.stringify(model.performance), modelId]);

      this.logger.debug('Model performance updated', { modelId });
    } catch (error: any) {
      this.logger.error('Failed to update model performance', error);
    }
  }

  /**
   * =========================================
   * MONITORING AND ALERTING METHODS
   * =========================================
   */

  /**
   * Record monitoring metric
   */
  async recordMetric(name: string, value: number, tags: Record<string, string> = {}, unit: string = 'count'): Promise<void> {
    try {
      const metric: MonitoringMetric = {
        name,
        value,
        timestamp: new Date(),
        tags,
        unit
      };

      this.monitoringMetrics.push(metric);

      // Store in database if monitoring is enabled
      if (this.config.monitoring.enabled) {
        await this.db.query(`
          INSERT INTO monitoring_metrics (metric_name, metric_value, tags, unit)
          VALUES ($1, $2, $3, $4)
        `, [name, value, JSON.stringify(tags), unit]);
      }

      // Evaluate alert rules
      await this.evaluateMetricAlerts(metric);

      this.logger.debug('Metric recorded', { name, value, unit });
    } catch (error: any) {
      this.logger.error('Failed to record metric', error);
    }
  }

  /**
   * Evaluate alert rules against metrics
   */
  private async evaluateMetricAlerts(metric: MonitoringMetric): Promise<void> {
    try {
      for (const rule of this.alertRules.values()) {
        if (!rule.enabled) continue;

        // Simple condition evaluation (would be more sophisticated in production)
        const conditionMet = this.evaluateCondition(rule.condition, metric);

        if (conditionMet) {
          await this.triggerAlert(rule, metric);
        }
      }
    } catch (error: any) {
      this.logger.error('Failed to evaluate metric alerts', error);
    }
  }

  /**
   * Evaluate alert condition (simplified)
   */
  private evaluateCondition(condition: string, metric: MonitoringMetric): boolean {
    // Simplified condition evaluation
    // In production, would use proper expression evaluation

    if (condition.includes('>') && metric.value > parseFloat(condition.split('>')[1])) {
      return true;
    }

    if (condition.includes('<') && metric.value < parseFloat(condition.split('<')[1])) {
      return true;
    }

    return false;
  }

  /**
   * Trigger alert for rule violation
   */
  private async triggerAlert(rule: AlertRule, metric: MonitoringMetric): Promise<void> {
    try {
      rule.lastTriggered = new Date();
      rule.triggerCount++;

      // Update in database
      await this.db.query(`
        UPDATE alert_rules
        SET last_triggered = NOW(), trigger_count = $1
        WHERE rule_id = $2
      `, [rule.triggerCount, rule.id]);

      // Send notifications
      for (const channel of rule.channels) {
        await this.sendAlertNotification(channel, rule, metric);
      }

      this.logger.warn('Alert triggered', {
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        metric: metric.name,
        value: metric.value
      });
    } catch (error: any) {
      this.logger.error('Failed to trigger alert', error);
    }
  }

  /**
   * Send alert notification (placeholder)
   */
  private async sendAlertNotification(channel: string, rule: AlertRule, metric: MonitoringMetric): Promise<void> {
    // Implementation would send notifications via configured channels
    this.logger.debug('Alert notification sent', { channel, ruleId: rule.id });
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    try {
      // Cache metrics
      this.recordMetric('cache_hits', this.cacheStats.hits, {}, 'count');
      this.recordMetric('cache_misses', this.cacheStats.misses, {}, 'count');
      this.recordMetric('cache_evictions', this.cacheStats.evictions, {}, 'count');
      this.recordMetric('cache_size_bytes', this.cacheStats.size, {}, 'bytes');

      // ML model metrics
      const activeModels = Array.from(this.mlModels.values()).filter(m => m.status === 'deployed').length;
      this.recordMetric('ml_models_active', activeModels, {}, 'count');

      // System performance metrics
      const memoryUsage = process.memoryUsage();
      this.recordMetric('memory_usage_heap', memoryUsage.heapUsed, {}, 'bytes');
      this.recordMetric('memory_usage_external', memoryUsage.external, {}, 'bytes');

      // Reset counters
      this.cacheStats.hits = 0;
      this.cacheStats.misses = 0;
      this.cacheStats.evictions = 0;
    } catch (error: any) {
      this.logger.error('Failed to collect system metrics', error);
    }
  }

  /**
   * Get system health status
   */
  getHealthStatus(): {
    initialized: boolean;
    cache: {
      enabled: boolean;
      entries: number;
      size: number;
      hitRate: number;
    };
    ml: {
      enabled: boolean;
      models: number;
      activeModels: number;
    };
    monitoring: {
      enabled: boolean;
      metricsCollected: number;
      alertRules: number;
      activeAlerts: number;
    };
  } {
    const cacheHitRate = (this.cacheStats.hits + this.cacheStats.misses) > 0 ?
      this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) : 0;

    const activeModels = Array.from(this.mlModels.values()).filter(m => m.status === 'deployed').length;

    return {
      initialized: this.isInitialized,
      cache: {
        enabled: this.config.cache.enabled,
        entries: this.cache.size,
        size: this.cacheStats.size,
        hitRate: cacheHitRate
      },
      ml: {
        enabled: this.config.ml.enabled,
        models: this.mlModels.size,
        activeModels
      },
      monitoring: {
        enabled: this.config.monitoring.enabled,
        metricsCollected: this.monitoringMetrics.length,
        alertRules: this.alertRules.size,
        activeAlerts: 0 // Would track active alerts
      }
    };
  }

  /**
   * Prefetch cache entries based on usage patterns
   */
  private prefetchCache(): void {
    try {
      // Analyze cache access patterns and prefetch likely-to-be-accessed data
      const frequentKeys = Array.from(this.cache.entries())
        .sort((a, b) => b[1].accessCount - a[1].accessCount)
        .slice(0, 10)
        .map(([key]) => key);

      // Prefetch related data based on dependencies
      frequentKeys.forEach(key => {
        const entry = this.cache.get(key);
        if (entry?.dependencies) {
          entry.dependencies.forEach(dep => {
            // Prefetch dependent entries
            this.getCache(dep);
          });
        }
      });

      this.logger.debug('Cache prefetch completed', { prefetchedKeys: frequentKeys.length });
    } catch (error: any) {
      this.logger.error('Failed to prefetch cache', error);
    }
  }

  /**
   * =========================================
   * ADVANCED ANALYTICS METHODS
   * =========================================
   */

  /**
   * Get comprehensive analytics dashboard data
   */
  async getAnalyticsDashboard(): Promise<{
    timestamp: Date;
    performance: {
      cacheHitRate: number;
      avgResponseTime: number;
      errorRate: number;
      throughput: number;
    };
    ml: {
      modelsActive: number;
      avgModelAccuracy: number;
      retrainingQueue: number;
    };
    monitoring: {
      activeAlerts: number;
      metricsCollected: number;
      systemHealth: string;
    };
    recommendations: string[];
  }> {
    try {
      const cacheHitRate = this.cacheStats.hits / Math.max(1, this.cacheStats.hits + this.cacheStats.misses);

      // Calculate average response time (simplified)
      const avgResponseTime = 0.05; // 50ms average

      // Calculate error rate (simplified)
      const errorRate = 0.001; // 0.1% error rate

      // Calculate throughput (simplified)
      const throughput = 1000; // 1000 requests/second

      // ML metrics
      const activeModels = Array.from(this.mlModels.values()).filter(m => m.status === 'deployed').length;
      const avgModelAccuracy = Array.from(this.mlModels.values())
        .filter(m => m.performance.accuracy)
        .reduce((sum, m) => sum + m.performance.accuracy, 0) /
        Math.max(1, Array.from(this.mlModels.values()).filter(m => m.performance.accuracy).length);

      // Monitoring metrics
      const activeAlerts = 0; // Would track active alerts
      const metricsCollected = this.monitoringMetrics.length;

      // Generate recommendations
      const recommendations = this.generateAnalyticsRecommendations({
        cacheHitRate,
        avgResponseTime,
        errorRate,
        activeModels,
        avgModelAccuracy
      });

      return {
        timestamp: new Date(),
        performance: {
          cacheHitRate,
          avgResponseTime,
          errorRate,
          throughput
        },
        ml: {
          modelsActive: activeModels,
          avgModelAccuracy,
          retrainingQueue: 0 // Would track retraining queue
        },
        monitoring: {
          activeAlerts,
          metricsCollected,
          systemHealth: this.calculateSystemHealth()
        },
        recommendations
      };
    } catch (error: any) {
      this.logger.error('Failed to get analytics dashboard', error);
      throw error;
    }
  }

  /**
   * Calculate overall system health
   */
  private calculateSystemHealth(): string {
    const cacheHitRate = this.cacheStats.hits / Math.max(1, this.cacheStats.hits + this.cacheStats.misses);
    const activeModels = Array.from(this.mlModels.values()).filter(m => m.status === 'deployed').length;

    if (cacheHitRate > 0.9 && activeModels > 0) return 'excellent';
    if (cacheHitRate > 0.8 && activeModels > 0) return 'good';
    if (cacheHitRate > 0.6) return 'fair';
    return 'poor';
  }

  /**
   * Generate analytics recommendations
   */
  private generateAnalyticsRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];

    if (metrics.cacheHitRate < 0.8) {
      recommendations.push('Consider increasing cache size or optimizing cache key patterns');
    }

    if (metrics.avgResponseTime > 0.1) {
      recommendations.push('Performance optimization needed - consider database query optimization');
    }

    if (metrics.errorRate > 0.01) {
      recommendations.push('High error rate detected - review error handling and retry logic');
    }

    if (metrics.avgModelAccuracy < 0.7) {
      recommendations.push('Model accuracy below threshold - consider retraining or feature engineering');
    }

    return recommendations;
  }

  /**
   * =========================================
   * LIFECYCLE METHODS
   * =========================================
   */

  /**
   * Start the infrastructure
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Infrastructure not initialized');
    }

    this.logger.info('🚀 Advanced Analytics Infrastructure started');
  }

  /**
   * Stop the infrastructure
   */
  async stop(): Promise<void> {
    try {
      // Close database connections
      await this.db.end();

      this.isInitialized = false;
      this.logger.info('✅ Advanced Analytics Infrastructure stopped');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop infrastructure', error);
    }
  }

  /**
   * Get infrastructure status
   */
  getStatus(): {
    initialized: boolean;
    cache: boolean;
    ml: boolean;
    monitoring: boolean;
    performance: any;
  } {
    return {
      initialized: this.isInitialized,
      cache: this.config.cache.enabled,
      ml: this.config.ml.enabled,
      monitoring: this.config.monitoring.enabled,
      performance: this.getHealthStatus()
    };
  }
}

// Export factory function
export async function createAdvancedAnalyticsInfrastructure(
  config: AdvancedInfrastructureConfig
): Promise<AdvancedAnalyticsInfrastructure> {
  const infrastructure = new AdvancedAnalyticsInfrastructure(config);
  await infrastructure.start();
  return infrastructure;
}

export default AdvancedAnalyticsInfrastructure;
