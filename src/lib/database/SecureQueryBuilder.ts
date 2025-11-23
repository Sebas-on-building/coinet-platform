import { Pool, PoolClient, QueryResult } from 'pg';
import { Logger } from '../logging/Logger';
import { MetricsCollector } from '../metrics/MetricsCollector';
import { ErrorManager } from '../errors/ErrorManager';

export interface QueryOptions {
  timeout?: number;
  transaction?: boolean;
  retries?: number;
}

export interface ConnectionConfig {
  connectionString: string;
  maxConnections?: number;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
  ssl?: boolean | object;
}

export class SecureQueryBuilder {
  private pool: Pool;
  private logger: Logger;
  private metrics: MetricsCollector;
  private errorManager: ErrorManager;

  constructor(config: ConnectionConfig) {
    this.logger = Logger.getInstance();
    this.metrics = MetricsCollector.getInstance();
    this.errorManager = ErrorManager.getInstance();

    this.pool = new Pool({
      connectionString: config.connectionString,
      max: config.maxConnections || 20,
      idleTimeoutMillis: config.idleTimeoutMs || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMs || 2000,
      ssl: process.env.NODE_ENV === 'production'
        ? (config.ssl || { rejectUnauthorized: false })
        : false
    });

    // Monitor pool events
    this.pool.on('connect', () => {
      this.metrics.incrementCounter('db_connections_created');
    });

    this.pool.on('error', (err) => {
      this.errorManager.handleError(err, {
        operation: 'pool_error',
        component: 'secure_query_builder'
      });
    });
  }

  async query<T = any>(
    text: string,
    params: any[] = [],
    options: QueryOptions = {}
  ): Promise<{ rows: T[]; rowCount: number }> {
    const startTime = Date.now();
    let client: PoolClient | null = null;

    try {
      // Validate query parameters
      this.validateQuery(text, params);

      client = await this.pool.connect();

      // Set query timeout if specified
      if (options.timeout) {
        await client.query(`SET statement_timeout = ${options.timeout}`);
      }

      this.logger.debug('Executing query', {
        query: this.sanitizeQueryForLogging(text),
        paramCount: params.length
      });

      const result = await client.query(text, params);

      const duration = Date.now() - startTime;
      this.metrics.recordHistogram('db_query_duration', duration);
      this.metrics.incrementCounter('db_queries_executed', { status: 'success' });

      return {
        rows: result.rows,
        rowCount: result.rowCount || 0
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics.recordHistogram('db_query_duration', duration);
      this.metrics.incrementCounter('db_queries_executed', { status: 'error' });

      this.errorManager.handleError(error as Error, {
        operation: 'database_query',
        component: 'secure_query_builder',
        metadata: {
          query: this.sanitizeQueryForLogging(text),
          paramCount: params.length,
          duration
        }
      });

      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  // Safe query builder for common operations
  async findById<T>(table: string, id: string): Promise<T | null> {
    this.validateIdentifier(table);

    const result = await this.query(
      `SELECT * FROM ${this.escapeIdentifier(table)} WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findMany<T>(
    table: string,
    where: Record<string, any> = {},
    options: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderDirection?: 'ASC' | 'DESC';
    } = {}
  ): Promise<T[]> {
    this.validateIdentifier(table);

    const whereKeys = Object.keys(where);
    const whereClause = whereKeys.length > 0
      ? 'WHERE ' + whereKeys.map((key, i) =>
        `${this.escapeIdentifier(key)} = $${i + 1}`).join(' AND ')
      : '';

    let orderClause = '';
    if (options.orderBy) {
      this.validateIdentifier(options.orderBy);
      const direction = options.orderDirection === 'DESC' ? 'DESC' : 'ASC';
      orderClause = `ORDER BY ${this.escapeIdentifier(options.orderBy)} ${direction}`;
    }

    const limitClause = options.limit
      ? `LIMIT $${whereKeys.length + 1}`
      : '';

    const offsetClause = options.offset
      ? `OFFSET $${whereKeys.length + (options.limit ? 2 : 1)}`
      : '';

    const params = [
      ...Object.values(where),
      ...(options.limit ? [options.limit] : []),
      ...(options.offset ? [options.offset] : [])
    ];

    const result = await this.query(
      `SELECT * FROM ${this.escapeIdentifier(table)} ${whereClause} ${orderClause} ${limitClause} ${offsetClause}`,
      params
    );

    return result.rows;
  }

  async insert<T>(
    table: string,
    data: Record<string, any>
  ): Promise<T> {
    this.validateIdentifier(table);

    const keys = Object.keys(data);
    const values = Object.values(data);

    const columnsClause = keys.map(k => this.escapeIdentifier(k)).join(', ');
    const valuesClause = keys.map((_, i) => `$${i + 1}`).join(', ');

    const result = await this.query(
      `INSERT INTO ${this.escapeIdentifier(table)} (${columnsClause}) VALUES (${valuesClause}) RETURNING *`,
      values
    );

    return result.rows[0];
  }

  async update<T>(
    table: string,
    data: Record<string, any>,
    where: Record<string, any>
  ): Promise<T[]> {
    this.validateIdentifier(table);

    const dataKeys = Object.keys(data);
    const whereKeys = Object.keys(where);

    const setClause = dataKeys.map((key, i) =>
      `${this.escapeIdentifier(key)} = $${i + 1}`).join(', ');

    const whereClause = whereKeys.map((key, i) =>
      `${this.escapeIdentifier(key)} = $${dataKeys.length + i + 1}`).join(' AND ');

    const params = [...Object.values(data), ...Object.values(where)];

    const result = await this.query(
      `UPDATE ${this.escapeIdentifier(table)} SET ${setClause} WHERE ${whereClause} RETURNING *`,
      params
    );

    return result.rows;
  }

  async delete(
    table: string,
    where: Record<string, any>
  ): Promise<number> {
    this.validateIdentifier(table);

    const whereKeys = Object.keys(where);
    const whereClause = whereKeys.map((key, i) =>
      `${this.escapeIdentifier(key)} = $${i + 1}`).join(' AND ');

    const result = await this.query(
      `DELETE FROM ${this.escapeIdentifier(table)} WHERE ${whereClause}`,
      Object.values(where)
    );

    return result.rowCount;
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');

      this.metrics.incrementCounter('db_transactions', { status: 'committed' });
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.metrics.incrementCounter('db_transactions', { status: 'rolled_back' });
      throw error;
    } finally {
      client.release();
    }
  }

  private validateQuery(query: string, params: any[]): void {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }

    if (query.length > 10000) {
      throw new Error('Query too long');
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /;\s*(drop|delete|truncate|alter)\s+/i,
      /union\s+select/i,
      /exec\s*\(/i,
      /sp_/i,
      /xp_/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        throw new Error('Query contains potentially dangerous patterns');
      }
    }

    // Validate parameter count matches placeholders
    const placeholderCount = (query.match(/\$\d+/g) || []).length;
    if (placeholderCount !== params.length) {
      throw new Error('Parameter count mismatch');
    }
  }

  private validateIdentifier(identifier: string): void {
    if (!identifier || typeof identifier !== 'string') {
      throw new Error('Identifier must be a non-empty string');
    }

    // Only allow alphanumeric characters and underscores
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
      throw new Error('Invalid identifier format');
    }

    if (identifier.length > 63) {
      throw new Error('Identifier too long');
    }
  }

  private escapeIdentifier(identifier: string): string {
    // PostgreSQL identifier escaping
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  private sanitizeQueryForLogging(query: string): string {
    // Remove potentially sensitive data for logging
    return query
      .replace(/\$\d+/g, '?')
      .substring(0, 200) + (query.length > 200 ? '...' : '');
  }

  async close(): Promise<void> {
    await this.pool.end();
    this.logger.info('Database pool closed');
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows[0]?.health === 1;
    } catch {
      return false;
    }
  }

  // Get pool status
  getPoolStatus(): {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }
} 