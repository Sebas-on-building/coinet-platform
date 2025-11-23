/**
 * Coinet User Service - Analytics Sinks
 * 
 * Real-time analytics data ingestion to ClickHouse and TimescaleDB
 */

import { CoinetEvent } from './kafka-events';

// ClickHouse configuration and client
class ClickHouseAnalyticsSink {
  private client: any = null;
  private isConnected = false;
  private config: any;

  constructor() {
    this.config = {
      url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
      database: process.env.CLICKHOUSE_DATABASE || 'coinet_analytics',
      username: process.env.CLICKHOUSE_USERNAME || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
      format: 'JSONEachRow'
    };
  }

  public async initialize(): Promise<boolean> {
    try {
      if (!process.env.CLICKHOUSE_ENABLED || process.env.CLICKHOUSE_ENABLED === 'false') {
        console.log('⚠️  ClickHouse disabled, analytics will be logged only');
        return false;
      }

      // Try to load ClickHouse client
      const { createClient } = await import('@clickhouse/client');
      
      this.client = createClient({
        host: this.config.url,
        username: this.config.username,
        password: this.config.password,
        database: this.config.database,
        clickhouse_settings: {
          async_insert: 1,
          wait_for_async_insert: 0
        }
      });

      // Test connection
      await this.client.ping();
      this.isConnected = true;

      console.log('✅ ClickHouse analytics sink initialized');
      console.log(`📊 Connected to: ${this.config.url}/${this.config.database}`);

      // Create tables if they don't exist
      await this.createTables();
      
      return true;
    } catch (error) {
      console.warn('⚠️  ClickHouse initialization failed:', error instanceof Error ? error.message : 'Unknown error');
      this.isConnected = false;
      return false;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.client) return;

    const tables = [
      // User events table
      `
      CREATE TABLE IF NOT EXISTS user_events (
        event_id String,
        event_type String,
        timestamp DateTime64(3),
        user_id String,
        session_id Nullable(String),
        request_id Nullable(String),
        email String,
        role String,
        tier String,
        is_verified UInt8,
        metadata String,
        created_at DateTime DEFAULT now()
      ) ENGINE = MergeTree()
      ORDER BY (timestamp, user_id, event_type)
      PARTITION BY toYYYYMM(timestamp)
      TTL timestamp + INTERVAL 2 YEAR
      `,
      
      // Authentication events table
      `
      CREATE TABLE IF NOT EXISTS auth_events (
        event_id String,
        event_type String,
        timestamp DateTime64(3),
        user_id Nullable(String),
        email Nullable(String),
        method String,
        ip_address Nullable(String),
        user_agent Nullable(String),
        success UInt8,
        reason Nullable(String),
        attempts Nullable(UInt32),
        metadata String,
        created_at DateTime DEFAULT now()
      ) ENGINE = MergeTree()
      ORDER BY (timestamp, event_type, user_id)
      PARTITION BY toYYYYMM(timestamp)
      TTL timestamp + INTERVAL 1 YEAR
      `,
      
      // Security events table
      `
      CREATE TABLE IF NOT EXISTS security_events (
        event_id String,
        event_type String,
        timestamp DateTime64(3),
        user_id Nullable(String),
        severity String,
        action String,
        resource Nullable(String),
        ip_address Nullable(String),
        details String,
        metadata String,
        created_at DateTime DEFAULT now()
      ) ENGINE = MergeTree()
      ORDER BY (timestamp, severity, event_type)
      PARTITION BY toYYYYMM(timestamp)
      TTL timestamp + INTERVAL 5 YEAR
      `,
      
      // Session events table
      `
      CREATE TABLE IF NOT EXISTS session_events (
        event_id String,
        event_type String,
        timestamp DateTime64(3),
        session_id String,
        user_id String,
        device_info Nullable(String),
        ip_address Nullable(String),
        duration Nullable(UInt32),
        metadata String,
        created_at DateTime DEFAULT now()
      ) ENGINE = MergeTree()
      ORDER BY (timestamp, user_id, session_id)
      PARTITION BY toYYYYMM(timestamp)
      TTL timestamp + INTERVAL 1 YEAR
      `,
      
      // API key events table
      `
      CREATE TABLE IF NOT EXISTS api_key_events (
        event_id String,
        event_type String,
        timestamp DateTime64(3),
        key_id String,
        user_id String,
        key_name String,
        permissions Array(String),
        scopes Array(String),
        usage_count Nullable(UInt32),
        last_used Nullable(DateTime),
        metadata String,
        created_at DateTime DEFAULT now()
      ) ENGINE = MergeTree()
      ORDER BY (timestamp, user_id, key_id)
      PARTITION BY toYYYYMM(timestamp)
      TTL timestamp + INTERVAL 2 YEAR
      `
    ];

    for (const tableSQL of tables) {
      try {
        await this.client.exec({ query: tableSQL });
      } catch (error) {
        console.error('Failed to create ClickHouse table:', error);
      }
    }

    console.log('✅ ClickHouse analytics tables created/verified');
  }

  public async ingestEvent(event: CoinetEvent): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.log(`📝 ClickHouse not available, logging event: ${event.eventType}`);
      return;
    }

    try {
      const tableName = this.getTableName(event.eventType);
      const data = this.transformEventForClickHouse(event);

      await this.client.insert({
        table: tableName,
        values: [data],
        format: 'JSONEachRow'
      });

      console.log(`📊 Event ingested to ClickHouse: ${event.eventType} → ${tableName}`);
    } catch (error) {
      console.error('ClickHouse ingestion failed:', error);
    }
  }

  private getTableName(eventType: string): string {
    if (eventType.startsWith('user.')) return 'user_events';
    if (eventType.startsWith('auth.')) return 'auth_events';
    if (eventType.startsWith('security.')) return 'security_events';
    if (eventType.startsWith('session.')) return 'session_events';
    if (eventType.startsWith('api_key.')) return 'api_key_events';
    return 'general_events';
  }

  private transformEventForClickHouse(event: CoinetEvent): any {
    const base = {
      event_id: event.eventId,
      event_type: event.eventType,
      timestamp: event.timestamp,
      metadata: JSON.stringify(event.metadata || {})
    };

    // Transform based on event type
    if (event.eventType.startsWith('user.')) {
      const userEvent = event as any;
      return {
        ...base,
        user_id: userEvent.data.userId,
        email: userEvent.data.email,
        role: userEvent.data.role,
        tier: userEvent.data.tier,
        is_verified: userEvent.data.isVerified ? 1 : 0
      };
    }

    if (event.eventType.startsWith('auth.')) {
      const authEvent = event as any;
      return {
        ...base,
        user_id: authEvent.data.userId || '',
        email: authEvent.data.email || '',
        method: authEvent.data.method,
        ip_address: authEvent.data.ipAddress || '',
        user_agent: authEvent.data.userAgent || '',
        success: authEvent.eventType.includes('success') ? 1 : 0,
        reason: authEvent.data.reason || '',
        attempts: authEvent.data.attempts || 0
      };
    }

    if (event.eventType.startsWith('security.')) {
      const securityEvent = event as any;
      return {
        ...base,
        user_id: securityEvent.data.userId || '',
        severity: securityEvent.data.severity,
        action: securityEvent.data.action,
        resource: securityEvent.data.resource || '',
        ip_address: securityEvent.data.ipAddress || '',
        details: JSON.stringify(securityEvent.data.details)
      };
    }

    if (event.eventType.startsWith('session.')) {
      const sessionEvent = event as any;
      return {
        ...base,
        session_id: sessionEvent.data.sessionId,
        user_id: sessionEvent.data.userId,
        device_info: sessionEvent.data.deviceInfo || '',
        ip_address: sessionEvent.data.ipAddress || '',
        duration: sessionEvent.data.duration || 0
      };
    }

    if (event.eventType.startsWith('api_key.')) {
      const apiKeyEvent = event as any;
      return {
        ...base,
        key_id: apiKeyEvent.data.keyId,
        user_id: apiKeyEvent.data.userId,
        key_name: apiKeyEvent.data.name,
        permissions: apiKeyEvent.data.permissions,
        scopes: apiKeyEvent.data.scopes,
        usage_count: apiKeyEvent.data.usageCount || 0,
        last_used: apiKeyEvent.data.lastUsed || null
      };
    }

    return base;
  }

  public getStatus(): any {
    return {
      connected: this.isConnected,
      url: this.config.url,
      database: this.config.database
    };
  }
}

// TimescaleDB configuration for time-series analytics
class TimescaleDBAnalyticsSink {
  private client: any = null;
  private isConnected = false;
  private config: any;

  constructor() {
    this.config = {
      connectionString: process.env.TIMESCALEDB_URL || process.env.DATABASE_URL || 'postgresql://localhost:5432/coinet_analytics',
      ssl: process.env.TIMESCALEDB_SSL === 'true'
    };
  }

  public async initialize(): Promise<boolean> {
    try {
      if (!process.env.TIMESCALEDB_ENABLED || process.env.TIMESCALEDB_ENABLED === 'false') {
        console.log('⚠️  TimescaleDB disabled, time-series analytics will be logged only');
        return false;
      }

      // Try to load PostgreSQL client
      const { Client } = await import('pg');
      
      this.client = new Client({
        connectionString: this.config.connectionString,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false
      });

      await this.client.connect();
      this.isConnected = true;

      console.log('✅ TimescaleDB analytics sink initialized');
      console.log(`📈 Connected to: ${this.config.connectionString.split('@')[1]}`);

      // Create hypertables
      await this.createHypertables();
      
      return true;
    } catch (error) {
      console.warn('⚠️  TimescaleDB initialization failed:', error instanceof Error ? error.message : 'Unknown error');
      this.isConnected = false;
      return false;
    }
  }

  private async createHypertables(): Promise<void> {
    if (!this.client) return;

    const tables = [
      // User activity time series
      `
      CREATE TABLE IF NOT EXISTS user_activity_ts (
        time TIMESTAMPTZ NOT NULL,
        user_id TEXT,
        event_type TEXT,
        session_id TEXT,
        ip_address INET,
        user_agent TEXT,
        metadata JSONB
      );
      SELECT create_hypertable('user_activity_ts', 'time', if_not_exists => TRUE);
      CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_ts (user_id, time DESC);
      CREATE INDEX IF NOT EXISTS idx_user_activity_event_type ON user_activity_ts (event_type, time DESC);
      `,
      
      // Authentication metrics time series
      `
      CREATE TABLE IF NOT EXISTS auth_metrics_ts (
        time TIMESTAMPTZ NOT NULL,
        event_type TEXT,
        success BOOLEAN,
        method TEXT,
        ip_address INET,
        email_domain TEXT,
        user_tier TEXT,
        response_time_ms INTEGER,
        metadata JSONB
      );
      SELECT create_hypertable('auth_metrics_ts', 'time', if_not_exists => TRUE);
      CREATE INDEX IF NOT EXISTS idx_auth_metrics_success ON auth_metrics_ts (success, time DESC);
      CREATE INDEX IF NOT EXISTS idx_auth_metrics_method ON auth_metrics_ts (method, time DESC);
      `,
      
      // Security events time series
      `
      CREATE TABLE IF NOT EXISTS security_events_ts (
        time TIMESTAMPTZ NOT NULL,
        event_type TEXT,
        severity TEXT,
        user_id TEXT,
        action TEXT,
        resource TEXT,
        ip_address INET,
        details JSONB,
        metadata JSONB
      );
      SELECT create_hypertable('security_events_ts', 'time', if_not_exists => TRUE);
      CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events_ts (severity, time DESC);
      CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events_ts (user_id, time DESC);
      `,
      
      // Performance metrics time series
      `
      CREATE TABLE IF NOT EXISTS performance_metrics_ts (
        time TIMESTAMPTZ NOT NULL,
        service TEXT,
        endpoint TEXT,
        method TEXT,
        status_code INTEGER,
        response_time_ms INTEGER,
        request_size_bytes INTEGER,
        response_size_bytes INTEGER,
        user_id TEXT,
        metadata JSONB
      );
      SELECT create_hypertable('performance_metrics_ts', 'time', if_not_exists => TRUE);
      CREATE INDEX IF NOT EXISTS idx_performance_service ON performance_metrics_ts (service, time DESC);
      CREATE INDEX IF NOT EXISTS idx_performance_endpoint ON performance_metrics_ts (endpoint, time DESC);
      `
    ];

    for (const tableSQL of tables) {
      try {
        await this.client.query(tableSQL);
      } catch (error) {
        console.error('Failed to create TimescaleDB table:', error);
      }
    }

    console.log('✅ TimescaleDB analytics hypertables created/verified');
  }

  public async ingestEvent(event: CoinetEvent): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.log(`📝 TimescaleDB not available, logging event: ${event.eventType}`);
      return;
    }

    try {
      // Insert into appropriate time series table
      if (event.eventType.startsWith('user.') || event.eventType.startsWith('session.')) {
        await this.insertUserActivity(event);
      }
      
      if (event.eventType.startsWith('auth.')) {
        await this.insertAuthMetrics(event);
      }
      
      if (event.eventType.startsWith('security.')) {
        await this.insertSecurityEvent(event);
      }

      console.log(`📈 Event ingested to TimescaleDB: ${event.eventType}`);
    } catch (error) {
      console.error('TimescaleDB ingestion failed:', error);
    }
  }

  private async insertUserActivity(event: CoinetEvent): Promise<void> {
    const query = `
      INSERT INTO user_activity_ts (time, user_id, event_type, session_id, ip_address, user_agent, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    const values = [
      new Date(event.timestamp),
      event.userId || null,
      event.eventType,
      event.sessionId || null,
      event.metadata?.ipAddress || null,
      event.metadata?.userAgent || null,
      JSON.stringify(event.metadata || {})
    ];

    await this.client.query(query, values);
  }

  private async insertAuthMetrics(event: CoinetEvent): Promise<void> {
    const authEvent = event as any;
    const query = `
      INSERT INTO auth_metrics_ts (time, event_type, success, method, ip_address, email_domain, user_tier, response_time_ms, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const emailDomain = authEvent.data.email ? authEvent.data.email.split('@')[1] : null;
    const values = [
      new Date(event.timestamp),
      event.eventType,
      event.eventType.includes('success'),
      authEvent.data.method || 'unknown',
      authEvent.data.ipAddress || null,
      emailDomain,
      authEvent.metadata?.userTier || 'unknown',
      authEvent.metadata?.responseTime || null,
      JSON.stringify(event.metadata || {})
    ];

    await this.client.query(query, values);
  }

  private async insertSecurityEvent(event: CoinetEvent): Promise<void> {
    const securityEvent = event as any;
    const query = `
      INSERT INTO security_events_ts (time, event_type, severity, user_id, action, resource, ip_address, details, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const values = [
      new Date(event.timestamp),
      event.eventType,
      securityEvent.data.severity,
      securityEvent.data.userId || null,
      securityEvent.data.action,
      securityEvent.data.resource || null,
      securityEvent.data.ipAddress || null,
      JSON.stringify(securityEvent.data.details || {}),
      JSON.stringify(event.metadata || {})
    ];

    await this.client.query(query, values);
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.end();
      }
      this.isConnected = false;
      console.log('📈 TimescaleDB analytics sink disconnected');
    } catch (error) {
      console.error('Error disconnecting TimescaleDB:', error);
    }
  }

  public getStatus(): any {
    return {
      connected: this.isConnected,
      url: this.config.connectionString.split('@')[1] || 'localhost',
      database: this.config.database
    };
  }
}

// Combined analytics manager
export class AnalyticsManager {
  private clickHouseSink: ClickHouseAnalyticsSink;
  private timescaleSink: TimescaleDBAnalyticsSink;
  private sinks: Array<{ name: string; sink: any; enabled: boolean }> = [];

  constructor() {
    this.clickHouseSink = new ClickHouseAnalyticsSink();
    this.timescaleSink = new TimescaleDBAnalyticsSink();
  }

  public async initialize(): Promise<void> {
    console.log('🔄 Initializing analytics sinks...');

    // Initialize ClickHouse
    const clickHouseEnabled = await this.clickHouseSink.initialize();
    this.sinks.push({
      name: 'ClickHouse',
      sink: this.clickHouseSink,
      enabled: clickHouseEnabled
    });

    // Initialize TimescaleDB
    const timescaleEnabled = await this.timescaleSink.initialize();
    this.sinks.push({
      name: 'TimescaleDB',
      sink: this.timescaleSink,
      enabled: timescaleEnabled
    });

    const enabledSinks = this.sinks.filter(s => s.enabled).map(s => s.name);
    console.log(`📊 Analytics sinks initialized: ${enabledSinks.join(', ') || 'None (logging only)'}`);
  }

  public async ingestEvent(event: CoinetEvent): Promise<void> {
    // Send to all enabled sinks
    const promises = this.sinks
      .filter(sink => sink.enabled)
      .map(sink => sink.sink.ingestEvent(event));

    await Promise.allSettled(promises);
  }

  public async disconnect(): Promise<void> {
    const promises = this.sinks
      .filter(sink => sink.enabled)
      .map(sink => sink.sink.disconnect());

    await Promise.allSettled(promises);
  }

  public getStatus(): any {
    return {
      sinks: this.sinks.map(sink => ({
        name: sink.name,
        enabled: sink.enabled,
        status: sink.enabled ? sink.sink.getStatus() : 'disabled'
      }))
    };
  }
}

// Singleton analytics manager
export const analyticsManager = new AnalyticsManager();

// Utility function to emit and ingest events
export const emitAndIngest = async (event: CoinetEvent): Promise<void> => {
  try {
    // Emit to Kafka for real-time processing
    const { kafkaEventEmitter } = await import('./kafka-events');
    await kafkaEventEmitter.emit(event);

    // Ingest to analytics sinks for historical analysis
    await analyticsManager.ingestEvent(event);
  } catch (error) {
    console.error('Failed to emit and ingest event:', error);
  }
};
