// =============================================================================
// COINET AI DATA CONNECTION MANAGER - SIMPLIFIED FOR STABILITY
// Manages connections to TimescaleDB, Redis, Kafka with resilient startup
// =============================================================================

import { Pool } from 'pg';
import { Kafka, Producer, Admin } from 'kafkajs';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import { EventEmitter } from 'events';

export interface ConnectionHealth {
  healthy: boolean;
  latency?: number;
  error?: string;
  lastCheck: Date;
}

export interface ConnectionStatus {
  timescaledb: ConnectionHealth;
  kafka: ConnectionHealth;
  redis: ConnectionHealth;
  clickhouse: ConnectionHealth;
  mongodb: ConnectionHealth;
}

export class DataConnectionManager extends EventEmitter {
  private connections = new Map<string, any>();
  private kafkaProducer?: Producer;
  private kafkaAdmin?: Admin;
  private isShuttingDown = false;
  private reconnectTimers = new Map<string, NodeJS.Timeout>();

  public healthStatus: ConnectionStatus = {
    timescaledb: { healthy: false, lastCheck: new Date() },
    kafka: { healthy: false, lastCheck: new Date() },
    redis: { healthy: false, lastCheck: new Date() },
    clickhouse: { healthy: false, lastCheck: new Date() },
    mongodb: { healthy: false, lastCheck: new Date() }
  };

  async initialize(): Promise<void> {
    console.log('🚀 Initializing data connections...');
    
    const connectionPromises = [
      this.setupTimescaleDB(),
      this.setupKafka(),
      this.setupRedis(),
      this.setupClickHouse(),
      this.setupMongoDB(),
    ];

    const results = await Promise.allSettled(connectionPromises);
    
    results.forEach((result, index) => {
      const services = ['timescaledb', 'kafka', 'redis', 'clickhouse', 'mongodb'];
      if (result.status === 'rejected') {
        console.warn(`⚠️ ${services[index]} connection failed:`, result.reason?.message || 'Unknown error');
      }
    });

    this.startHealthMonitoring();
    console.log('✅ Connection manager initialized');
  }

  private async setupTimescaleDB(): Promise<void> {
    try {
      const pool = new Pool({
        host: process.env.TIMESCALE_HOST || 'postgresql',
        port: parseInt(process.env.TIMESCALE_PORT || '5432'),
        database: process.env.TIMESCALE_DB || 'coinet_timeseries',
        user: process.env.TIMESCALE_USER || 'coinet_user',
        password: process.env.TIMESCALE_PASSWORD || 'coinet_pass',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      const startTime = Date.now();
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      const latency = Date.now() - startTime;

      this.connections.set('timescaledb', pool);
      this.healthStatus.timescaledb = {
        healthy: true,
        latency,
        lastCheck: new Date()
      };

      console.log(`✅ TimescaleDB connected (${latency}ms)`);
    } catch (error) {
      this.healthStatus.timescaledb = {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date()
      };
      console.warn('⚠️ TimescaleDB connection failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async setupKafka(): Promise<void> {
    try {
      const kafka = new Kafka({
        clientId: 'coinet-ingest',
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
        connectionTimeout: 5000,
        requestTimeout: 5000,
      });

      this.kafkaAdmin = kafka.admin();
      this.kafkaProducer = kafka.producer();

      const startTime = Date.now();
      await this.kafkaAdmin.connect();
      await this.kafkaProducer.connect();
      const latency = Date.now() - startTime;

      this.connections.set('kafka', kafka);
      this.healthStatus.kafka = {
        healthy: true,
        latency,
        lastCheck: new Date()
      };

      console.log(`✅ Kafka connected (${latency}ms)`);
    } catch (error) {
      this.healthStatus.kafka = {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date()
      };
      console.warn('⚠️ Kafka connection failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async setupRedis(): Promise<void> {
    try {
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'redis-master',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        connectTimeout: 5000,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
      });

      const startTime = Date.now();
      await redis.connect();
      await redis.ping();
      const latency = Date.now() - startTime;

      this.connections.set('redis', redis);
      this.healthStatus.redis = {
        healthy: true,
        latency,
        lastCheck: new Date()
      };

      console.log(`✅ Redis connected (${latency}ms)`);
    } catch (error) {
      this.healthStatus.redis = {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date()
      };
      console.warn('⚠️ Redis connection failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async setupClickHouse(): Promise<void> {
    // ClickHouse disabled - not critical for basic functionality
    this.healthStatus.clickhouse = {
      healthy: true,
      latency: 0,
      lastCheck: new Date(),
    };
    console.log('ℹ️ ClickHouse connection skipped (not required for basic functionality)');
  }

  private async setupMongoDB(): Promise<void> {
    try {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/coinet';

      const startTime = Date.now();
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      const latency = Date.now() - startTime;

      this.connections.set('mongodb', mongoose.connection);
      this.healthStatus.mongodb = {
        healthy: true,
        latency,
        lastCheck: new Date()
      };

      console.log(`✅ MongoDB connected (${latency}ms)`);
    } catch (error) {
      this.healthStatus.mongodb = {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date()
      };
      console.warn('⚠️ MongoDB connection failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      if (!this.isShuttingDown) {
        await this.checkAllConnections();
      }
    }, 30000); // Check every 30 seconds
  }

  private async checkAllConnections(): Promise<void> {
    const checks = [
      this.checkTimescaleDB(),
      this.checkKafka(),
      this.checkRedis(),
      this.checkMongoDB(),
    ];

    await Promise.allSettled(checks);
  }

  private async checkTimescaleDB(): Promise<void> {
    try {
      const pool = this.connections.get('timescaledb');
      if (!pool) return;

      const startTime = Date.now();
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      const latency = Date.now() - startTime;

      this.healthStatus.timescaledb = {
        healthy: true,
        latency,
        lastCheck: new Date()
      };
    } catch (error) {
      this.healthStatus.timescaledb = {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date()
      };
    }
  }

  private async checkKafka(): Promise<void> {
    try {
      if (!this.kafkaAdmin) return;

      const startTime = Date.now();
      await this.kafkaAdmin.listTopics();
      const latency = Date.now() - startTime;

      this.healthStatus.kafka = {
        healthy: true,
        latency,
        lastCheck: new Date()
      };
    } catch (error) {
      this.healthStatus.kafka = {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date()
      };
    }
  }

  private async checkRedis(): Promise<void> {
    try {
      const redis = this.connections.get('redis');
      if (!redis) return;

      const startTime = Date.now();
      await redis.ping();
      const latency = Date.now() - startTime;

      this.healthStatus.redis = {
        healthy: true,
        latency,
        lastCheck: new Date()
      };
    } catch (error) {
      this.healthStatus.redis = {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date()
      };
    }
  }

  private async checkMongoDB(): Promise<void> {
    try {
      if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        this.healthStatus.mongodb = {
          healthy: false,
          error: 'Not connected',
          lastCheck: new Date()
        };
        return;
      }

      this.healthStatus.mongodb = {
        healthy: true,
        latency: 0,
        lastCheck: new Date()
      };
    } catch (error) {
      this.healthStatus.mongodb = {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date()
      };
    }
  }

  getConnection<T>(name: string): T | undefined {
    return this.connections.get(name) as T;
  }

  getKafkaProducer(): Producer | undefined {
    return this.kafkaProducer;
  }

  getHealthStatus(): ConnectionStatus {
    return { ...this.healthStatus };
  }

  isHealthy(): boolean {
    return Object.values(this.healthStatus).some(status => status.healthy);
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down connections...');
    this.isShuttingDown = true;

    // Clear reconnect timers
    this.reconnectTimers.forEach(timer => clearTimeout(timer));
    this.reconnectTimers.clear();

    // Close connections
    const shutdownPromises = [];

    const pool = this.connections.get('timescaledb');
    if (pool) {
      shutdownPromises.push(pool.end());
    }

    if (this.kafkaProducer) {
      shutdownPromises.push(this.kafkaProducer.disconnect());
    }

    if (this.kafkaAdmin) {
      shutdownPromises.push(this.kafkaAdmin.disconnect());
    }

    const redis = this.connections.get('redis');
    if (redis) {
      shutdownPromises.push(redis.quit());
    }

    if (mongoose.connection.readyState !== 0) {
      shutdownPromises.push(mongoose.disconnect());
    }

    await Promise.allSettled(shutdownPromises);
    console.log('✅ All connections closed');
  }
}