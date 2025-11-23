/// <reference types="node" />
/**
 * =============================================================================
 * COINET DATABASE CONNECTION MANAGER
 * World-class database connection management with enterprise features
 * =============================================================================
 */

import { Pool /*, _PoolClient */ } from 'pg';
import { Redis, Cluster } from 'ioredis';
import { MongoClient, Db } from 'mongodb';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import { EventEmitter } from 'events';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface DatabaseConfig {
  postgres?: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
    poolSize?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    cluster?: boolean;
    nodes?: Array<{ host: string; port: number }>;
    maxRetriesPerRequest?: number;
    retryDelayOnFailover?: number;
  };
  mongodb?: {
    uri: string;
    database: string;
    maxPoolSize?: number;
    minPoolSize?: number;
    serverSelectionTimeoutMS?: number;
    connectTimeoutMS?: number;
  };
  clickhouse?: {
    host: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
    compression?: boolean;
  };
}

export interface ConnectionHealth {
  postgres?: { connected: boolean; poolSize: number; idleCount: number; error?: string };
  redis?: { connected: boolean; status: string; error?: string };
  mongodb?: { connected: boolean; error?: string };
  clickhouse?: { connected: boolean; error?: string };
}

export interface ConnectionMetrics {
  postgres?: {
    totalConnections: number;
    idleConnections: number;
    waitingCount: number;
    totalQueries: number;
    averageQueryTime: number;
  };
  redis?: {
    connectedClients: number;
    usedMemory: number;
    keyspaceHits: number;
    keyspaceMisses: number;
    hitRatio: number;
  };
  mongodb?: {
    activeConnections: number;
    availableConnections: number;
    totalCreated: number;
  };
  clickhouse?: {
    activeConnections: number;
    totalQueries: number;
    averageQueryTime: number;
  };
}

// =============================================================================
// CONNECTION MANAGER CLASS
// =============================================================================

export class ConnectionManager extends EventEmitter {
  private config: DatabaseConfig;
  private connections: {
    postgres?: Pool;
    redis?: Redis | Cluster;
    mongodb?: { client: MongoClient; db: Db };
    clickhouse?: ClickHouseClient;
  } = {};
  
  private healthCheckIntervals: NodeJS.Timeout[] = [];
  private metrics: ConnectionMetrics = {};
  private isShuttingDown = false;

  constructor(config: DatabaseConfig) {
    super();
    this.config = config;
    this.setupGracefulShutdown();
  }

  // =============================================================================
  // CONNECTION INITIALIZATION
  // =============================================================================

  async initialize(): Promise<void> {
    try {
      // console.log('🔌 Initializing database connections...');

      const initPromises: Promise<void>[] = [];

      if (this.config.postgres) {
        initPromises.push(this.initializePostgres());
      }

      if (this.config.redis) {
        initPromises.push(this.initializeRedis());
      }

      if (this.config.mongodb) {
        initPromises.push(this.initializeMongoDB());
      }

      if (this.config.clickhouse) {
        initPromises.push(this.initializeClickHouse());
      }

      await Promise.all(initPromises);
      
      this.startHealthChecks();
      this.startMetricsCollection();
      
      // console.log('✅ All database connections initialized successfully');
      this.emit('initialized');
    } catch (error) {
      // console.error('❌ Failed to initialize database connections:', error);
      this.emit('error', error);
      throw error;
    }
  }

  // =============================================================================
  // POSTGRESQL CONNECTION
  // =============================================================================

  private async initializePostgres(): Promise<void> {
    const config = this.config.postgres!;
    
    this.connections.postgres = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: config.poolSize || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    // Test connection
    const client = await this.connections.postgres.connect();
    await client.query('SELECT NOW()');
    client.release();

    // Setup event listeners
    this.connections.postgres.on('error', (err) => {
      // console.error('PostgreSQL pool error:', err);
      this.emit('postgres:error', err);
    });

    this.connections.postgres.on('connect', () => {
      this.emit('postgres:connect');
    });

    // console.log('✅ PostgreSQL connection pool initialized');
  }

  // =============================================================================
  // REDIS CONNECTION
  // =============================================================================

  private async initializeRedis(): Promise<void> {
    const config = this.config.redis!;

    if (config.cluster && config.nodes) {
      // Redis Cluster
      this.connections.redis = new Cluster(config.nodes, {
        redisOptions: {
          password: config.password,
          maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
        },
        retryDelayOnClusterDown: config.retryDelayOnFailover || 100,
        enableOfflineQueue: false,
        lazyConnect: true,
      });
    } else {
      // Single Redis instance
      this.connections.redis = new Redis({
        host: config.host,
        port: config.port,
        password: config.password,
        db: config.db || 0,
        maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
        enableOfflineQueue: false,
        lazyConnect: true,
      });
    }

    // Connect and test
    await this.connections.redis.connect();
    await this.connections.redis.ping();

    // Setup event listeners
    this.connections.redis.on('error', (err) => {
      // console.error('Redis connection error:', err);
      this.emit('redis:error', err);
    });

    this.connections.redis.on('connect', () => {
      this.emit('redis:connect');
    });

    this.connections.redis.on('ready', () => {
      this.emit('redis:ready');
    });

    // console.log('✅ Redis connection initialized');
  }

  // =============================================================================
  // MONGODB CONNECTION
  // =============================================================================

  private async initializeMongoDB(): Promise<void> {
    const config = this.config.mongodb!;

    const client = new MongoClient(config.uri, {
      maxPoolSize: config.maxPoolSize || 10,
      minPoolSize: config.minPoolSize || 2,
      serverSelectionTimeoutMS: config.serverSelectionTimeoutMS || 5000,
      connectTimeoutMS: config.connectTimeoutMS || 5000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
    });

    await client.connect();
    
    // Test connection
    await client.db(config.database).admin().ping();
    
    const db = client.db(config.database);
    this.connections.mongodb = { client, db };

    // Setup event listeners
    client.on('error', (err) => {
      // console.error('MongoDB connection error:', err);
      this.emit('mongodb:error', err);
    });

    client.on('open', () => {
      this.emit('mongodb:connect');
    });

    // console.log('✅ MongoDB connection initialized');
  }

  // =============================================================================
  // CLICKHOUSE CONNECTION
  // =============================================================================

  private async initializeClickHouse(): Promise<void> {
    const config = this.config.clickhouse!;

    this.connections.clickhouse = createClient({
      host: `http://${config.host}:${config.port || 8123}`,
      username: config.username || 'default',
      password: config.password,
      database: config.database || 'default',
      compression: {
        request: config.compression || false,
        response: config.compression || false,
      },
      clickhouse_settings: {
        async_insert: 1,
        wait_for_async_insert: 0,
      },
    });

    // Test connection
    await this.connections.clickhouse.ping();

    // console.log('✅ ClickHouse connection initialized');
  }

  // =============================================================================
  // CONNECTION GETTERS
  // =============================================================================

  getPostgres(): Pool {
    if (!this.connections.postgres) {
      throw new Error('PostgreSQL connection not initialized');
    }
    return this.connections.postgres;
  }

  getRedis(): Redis | Cluster {
    if (!this.connections.redis) {
      throw new Error('Redis connection not initialized');
    }
    return this.connections.redis;
  }

  getMongoDB(): { client: MongoClient; db: Db } {
    if (!this.connections.mongodb) {
      throw new Error('MongoDB connection not initialized');
    }
    return this.connections.mongodb;
  }

  getClickHouse(): ClickHouseClient {
    if (!this.connections.clickhouse) {
      throw new Error('ClickHouse connection not initialized');
    }
    return this.connections.clickhouse;
  }

  // =============================================================================
  // HEALTH CHECKS
  // =============================================================================

  async getHealth(): Promise<ConnectionHealth> {
    const health: ConnectionHealth = {};

    if (this.connections.postgres) {
      try {
        const pool = this.connections.postgres;
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        
        health.postgres = {
          connected: true,
          poolSize: pool.totalCount,
          idleCount: pool.idleCount,
        };
      } catch (error) {
        health.postgres = {
          connected: false,
          poolSize: 0,
          idleCount: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    if (this.connections.redis) {
      try {
        await this.connections.redis.ping();
        health.redis = {
          connected: true,
          status: this.connections.redis.status,
        };
      } catch (error) {
        health.redis = {
          connected: false,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    if (this.connections.mongodb) {
      try {
        await this.connections.mongodb.client.db().admin().ping();
        health.mongodb = { connected: true };
      } catch (error) {
        health.mongodb = {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    if (this.connections.clickhouse) {
      try {
        await this.connections.clickhouse.ping();
        health.clickhouse = { connected: true };
      } catch (error) {
        health.clickhouse = {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    return health;
  }

  // =============================================================================
  // METRICS COLLECTION
  // =============================================================================

  async getMetrics(): Promise<ConnectionMetrics> {
    return this.metrics;
  }

  private startHealthChecks(): void {
    const healthCheckInterval = setInterval(async () => {
      if (this.isShuttingDown) return;

      try {
        const health = await this.getHealth();
        this.emit('health:check', health);

        // Check for critical issues
        const hasIssues = Object.values(health).some(h => h && !h.connected);
        if (hasIssues) {
          this.emit('health:warning', health);
        }
      } catch (error) {
        // console.error('Health check failed:', error);
        this.emit('health:error', error);
      }
    }, 30000); // Every 30 seconds

    this.healthCheckIntervals.push(healthCheckInterval);
  }

  private startMetricsCollection(): void {
    const metricsInterval = setInterval(async () => {
      if (this.isShuttingDown) return;

      try {
        await this.collectMetrics();
        this.emit('metrics:updated', this.metrics);
      } catch (error) {
        // console.error('Metrics collection failed:', error);
      }
    }, 60000); // Every minute

    this.healthCheckIntervals.push(metricsInterval);
  }

  private async collectMetrics(): Promise<void> {
    // PostgreSQL metrics
    if (this.connections.postgres) {
      this.metrics.postgres = {
        totalConnections: this.connections.postgres.totalCount,
        idleConnections: this.connections.postgres.idleCount,
        waitingCount: this.connections.postgres.waitingCount,
        totalQueries: 0, // Would need query tracking
        averageQueryTime: 0, // Would need query tracking
      };
    }

    // Redis metrics
    if (this.connections.redis) {
      try {
        const _info = await this.connections.redis.info();
        // Parse Redis INFO response for metrics
        // This is a simplified version
        this.metrics.redis = {
          connectedClients: 1,
          usedMemory: 0,
          keyspaceHits: 0,
          keyspaceMisses: 0,
          hitRatio: 0,
        };
      } catch (error) {
        // console.error('Failed to collect Redis metrics:', error);
      }
    }

    // MongoDB metrics
    if (this.connections.mongodb) {
      try {
        const serverStatus = await this.connections.mongodb.db.admin().serverStatus();
        this.metrics.mongodb = {
          activeConnections: serverStatus.connections?.active || 0,
          availableConnections: serverStatus.connections?.available || 0,
          totalCreated: serverStatus.connections?.totalCreated || 0,
        };
      } catch (error) {
        // console.error('Failed to collect MongoDB metrics:', error);
      }
    }

    // ClickHouse metrics
    if (this.connections.clickhouse) {
      this.metrics.clickhouse = {
        activeConnections: 1, // ClickHouse client doesn't expose this easily
        totalQueries: 0,
        averageQueryTime: 0,
      };
    }
  }

  // =============================================================================
  // GRACEFUL SHUTDOWN
  // =============================================================================

  private setupGracefulShutdown(): void {
    const shutdown = async (_signal: string) => {
      // console.log(`\n🛑 Received ${signal}, shutting down database connections gracefully...`);
      await this.shutdown();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    // console.log('🔌 Shutting down database connections...');

    // Clear intervals
    this.healthCheckIntervals.forEach(clearInterval);

    const shutdownPromises: Promise<void>[] = [];

    if (this.connections.postgres) {
      shutdownPromises.push(
        this.connections.postgres.end().then(() => {
          // console.log('✅ PostgreSQL connection pool closed');
        })
      );
    }

    if (this.connections.redis) {
      shutdownPromises.push(
        Promise.resolve(this.connections.redis.disconnect()).then(() => {
          // console.log('✅ Redis connection closed');
        }).catch(() => {})
      );
    }

    if (this.connections.mongodb) {
      shutdownPromises.push(
        this.connections.mongodb.client.close().then(() => {
          // console.log('✅ MongoDB connection closed');
        })
      );
    }

    if (this.connections.clickhouse) {
      shutdownPromises.push(
        this.connections.clickhouse.close().then(() => {
          // console.log('✅ ClickHouse connection closed');
        })
      );
    }

    await Promise.all(shutdownPromises);
    // console.log('✅ All database connections closed gracefully');
    this.emit('shutdown');
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let connectionManager: ConnectionManager | null = null;

export function createConnectionManager(config: DatabaseConfig): ConnectionManager {
  if (connectionManager) {
    throw new Error('Connection manager already exists');
  }
  connectionManager = new ConnectionManager(config);
  return connectionManager;
}

export function getConnectionManager(): ConnectionManager {
  if (!connectionManager) {
    throw new Error('Connection manager not initialized');
  }
  return connectionManager;
}

export default ConnectionManager;
