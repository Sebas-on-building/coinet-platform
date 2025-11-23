// =============================================================================
// COINET AI INGEST SERVICE - STREAMLINED DATABASE CONFIGURATION
// Essential database connections for production-ready ingestion
// =============================================================================

import { Pool } from 'pg';
import Redis from 'ioredis';
import { z } from 'zod';

// Environment configuration schema
const DatabaseConfigSchema = z.object({
  // PostgreSQL/TimescaleDB
  POSTGRES_HOST: z.string().default('timescaledb-ha'),
  POSTGRES_PORT: z.string().default('5432'),
  POSTGRES_DB: z.string().default('coinet_timeseries'),
  POSTGRES_USER: z.string().default('coinet_ingest'),
  POSTGRES_PASSWORD: z.string().default('ingest-2024!'),
  
  // Redis
  REDIS_HOST: z.string().default('redis'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().default('0'),
});

type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

class DatabaseManager {
  public postgres: Pool | null = null;
  public redisClient: Redis | null = null;
  private config: DatabaseConfig;

  constructor() {
    this.config = DatabaseConfigSchema.parse(process.env);
  }

  async connectAll(): Promise<void> {
    console.log('🔗 Initializing database connections...');
    
    try {
      // Connect to PostgreSQL/TimescaleDB (optional for basic operation)
      if (this.config.POSTGRES_HOST) {
        await this.connectPostgres();
      }

      // Connect to Redis (optional for caching)
      if (this.config.REDIS_HOST) {
        await this.connectRedis();
      }

      console.log('✅ Database connections initialized');
    } catch (error) {
      console.warn('⚠️ Some database connections failed, but continuing...', error);
      // Don't throw - allow service to start with partial functionality
    }
  }

  private async connectPostgres(): Promise<void> {
    try {
      this.postgres = new Pool({
        host: this.config.POSTGRES_HOST,
        port: parseInt(this.config.POSTGRES_PORT),
        database: this.config.POSTGRES_DB,
        user: this.config.POSTGRES_USER,
        password: this.config.POSTGRES_PASSWORD,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test connection
      const client = await this.postgres.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      console.log('✅ PostgreSQL/TimescaleDB connected');
    } catch (error) {
      console.warn('⚠️ PostgreSQL connection failed:', error);
      this.postgres = null;
    }
  }

  private async connectRedis(): Promise<void> {
    try {
      this.redisClient = new Redis({
        host: this.config.REDIS_HOST,
        port: parseInt(this.config.REDIS_PORT),
        password: this.config.REDIS_PASSWORD,
        db: parseInt(this.config.REDIS_DB),
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      await this.redisClient.connect();
      console.log('✅ Redis connected');
    } catch (error) {
      console.warn('⚠️ Redis connection failed:', error);
      this.redisClient = null;
    }
  }

  async disconnect(): Promise<void> {
    console.log('📤 Disconnecting from databases...');
    
    if (this.postgres) {
      await this.postgres.end();
      this.postgres = null;
      console.log('✅ PostgreSQL disconnected');
    }

    if (this.redisClient) {
      await this.redisClient.disconnect();
      this.redisClient = null;
      console.log('✅ Redis disconnected');
    }
  }

  getConnectionStatus(): {
    postgres: boolean;
    redis: boolean;
  } {
    return {
      postgres: !!this.postgres,
      redis: !!this.redisClient && this.redisClient.status === 'ready',
    };
  }

  async healthCheck(): Promise<{
    postgres: string;
    redis: string;
  }> {
    const health = {
      postgres: 'disconnected',
      redis: 'disconnected',
    };

    // Check PostgreSQL
    try {
      if (this.postgres) {
        const client = await this.postgres.connect();
        await client.query('SELECT 1');
        client.release();
        health.postgres = 'connected';
      }
    } catch (error) {
      health.postgres = 'error';
    }

    // Check Redis
    try {
      if (this.redisClient && this.redisClient.status === 'ready') {
        await this.redisClient.ping();
        health.redis = 'connected';
      }
    } catch (error) {
      health.redis = 'error';
    }

    return health;
  }
}

// Singleton instance
export const databaseManager = new DatabaseManager(); 