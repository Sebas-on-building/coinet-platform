/**
 * PostgreSQL Database Manager
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { ServiceConfig, NormalizedTransfer, WhaleProfile, EntityLabel } from '../types';
import { createLogger } from '../utils/logger';
import { QueryResultRow } from 'pg';

export class DatabaseManager {
  private pool: Pool;
  private logger: any;

  constructor(config: ServiceConfig['database']) {
    this.logger = createLogger({ component: 'DatabaseManager' });

    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      min: config.poolMin,
      max: config.poolMax,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Error handling
    this.pool.on('error', (err) => {
      this.logger.error('Unexpected database error', { error: err.message });
    });

    this.pool.on('connect', () => {
      this.logger.debug('New database connection established');
    });

    this.logger.info('Database pool initialized', {
      host: config.host,
      database: config.database,
      poolMin: config.poolMin,
      poolMax: config.poolMax,
    });
  }

  /**
   * Connect and verify database
   */
  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      
      this.logger.info('Database connected successfully', {
        timestamp: result.rows[0].now,
      });
    } catch (error: any) {
      this.logger.error('Database connection failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute query
   */
  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      
      this.logger.debug('Query executed', {
        duration: `${duration}ms`,
        rows: result.rowCount,
      });
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - start;
      this.logger.error('Query failed', {
        error: error.message,
        duration: `${duration}ms`,
        query: text,
      });
      throw error;
    }
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Insert transfer
   */
  async insertTransfer(transfer: NormalizedTransfer): Promise<string> {
    const query = `
      INSERT INTO transfers (
        id, chain, block_number, block_timestamp, transaction_hash,
        from_address, to_address, value, value_usd, category, direction,
        asset_address, asset_symbol, asset_decimals, asset_name,
        token_id, whale_tier, from_entity_id, to_entity_id, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      )
      ON CONFLICT (chain, transaction_hash, from_address, to_address, value)
      DO UPDATE SET
        value_usd = EXCLUDED.value_usd,
        whale_tier = EXCLUDED.whale_tier,
        updated_at = NOW()
      RETURNING id
    `;

    const result = await this.query<{ id: string }>(query, [
      transfer.id,
      transfer.chain,
      transfer.blockNumber,
      transfer.blockTimestamp,
      transfer.transactionHash,
      transfer.from,
      transfer.to,
      transfer.value,
      transfer.valueUsd,
      transfer.category,
      transfer.direction,
      transfer.asset.address,
      transfer.asset.symbol,
      transfer.asset.decimals,
      transfer.asset.name,
      transfer.tokenId,
      transfer.whaleTier,
      transfer.fromEntity?.address,
      transfer.toEntity?.address,
      JSON.stringify(transfer.metadata),
    ]);

    return result.rows[0].id;
  }

  /**
   * Bulk insert transfers
   */
  async bulkInsertTransfers(transfers: NormalizedTransfer[]): Promise<number> {
    if (transfers.length === 0) return 0;

    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      
      let inserted = 0;
      for (const transfer of transfers) {
        try {
          await this.insertTransfer(transfer);
          inserted++;
        } catch (error) {
          // Continue on conflict
          this.logger.debug('Transfer already exists, skipping', {
            hash: transfer.transactionHash,
          });
        }
      }
      
      await client.query('COMMIT');
      this.logger.info('Bulk insert completed', { inserted, total: transfers.length });
      return inserted;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get transfers by address
   */
  async getTransfersByAddress(
    address: string,
    chain?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<NormalizedTransfer[]> {
    const query = `
      SELECT * FROM transfers
      WHERE (from_address = $1 OR to_address = $1)
        AND ($2::chain_type IS NULL OR chain = $2::chain_type)
      ORDER BY block_timestamp DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await this.query(query, [address, chain, limit, offset]);
    return result.rows.map(this.mapRowToTransfer);
  }

  /**
   * Get recent whale transfers
   */
  async getRecentWhaleTransfers(
    limit: number = 100,
    minValueUsd?: number
  ): Promise<any[]> {
    const query = `
      SELECT * FROM recent_whale_activity
      WHERE ($1::numeric IS NULL OR value_usd >= $1)
      LIMIT $2
    `;

    const result = await this.query(query, [minValueUsd, limit]);
    return result.rows;
  }

  /**
   * Get whale profile
   */
  async getWhaleProfile(address: string, chain: string): Promise<WhaleProfile | null> {
    const query = `
      SELECT * FROM whale_profiles
      WHERE address = $1 AND chain = $2::chain_type
    `;

    const result = await this.query(query, [address, chain]);
    if (result.rows.length === 0) return null;
    
    return this.mapRowToWhaleProfile(result.rows[0]);
  }

  /**
   * Get top whales
   */
  async getTopWhales(chain?: string, limit: number = 100): Promise<any[]> {
    const query = `
      SELECT * FROM whale_leaderboard
      WHERE ($1::chain_type IS NULL OR chain = $1::chain_type)
      LIMIT $2
    `;

    const result = await this.query(query, [chain, limit]);
    return result.rows;
  }

  /**
   * Upsert entity label
   */
  async upsertEntityLabel(label: EntityLabel): Promise<void> {
    const query = `
      INSERT INTO entity_labels (
        address, chain, name, type, labels,
        source, confidence, is_contract, contract_name,
        is_exchange, exchange_name, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (address, chain)
      DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        labels = EXCLUDED.labels,
        source = EXCLUDED.source,
        confidence = EXCLUDED.confidence,
        is_contract = EXCLUDED.is_contract,
        contract_name = EXCLUDED.contract_name,
        is_exchange = EXCLUDED.is_exchange,
        exchange_name = EXCLUDED.exchange_name,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    `;

    await this.query(query, [
      label.address,
      'ethereum', // TODO: get from label
      label.name,
      label.type,
      label.labels,
      label.metadata.source,
      label.metadata.confidence,
      label.metadata.isContract,
      label.metadata.contractName,
      label.metadata.isExchange,
      label.metadata.exchangeName,
      JSON.stringify(label.metadata),
    ]);
  }

  /**
   * Get entity label
   */
  async getEntityLabel(address: string, chain: string): Promise<EntityLabel | null> {
    const query = `
      SELECT * FROM entity_labels
      WHERE address = $1 AND chain = $2::chain_type
    `;

    const result = await this.query(query, [address, chain]);
    if (result.rows.length === 0) return null;
    
    return this.mapRowToEntityLabel(result.rows[0]);
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    const queries = {
      totalTransfers: 'SELECT COUNT(*) as count FROM transfers',
      totalWhaleTransfers: 'SELECT COUNT(*) as count FROM transfers WHERE whale_tier IS NOT NULL',
      totalValueUsd: 'SELECT SUM(value_usd) as sum FROM transfers',
      uniqueWhales: 'SELECT COUNT(DISTINCT address) as count FROM whale_profiles',
      transfersByChain: `
        SELECT chain, COUNT(*) as count 
        FROM transfers 
        GROUP BY chain
      `,
      recentActivity: `
        SELECT 
          DATE_TRUNC('hour', block_timestamp) as hour,
          COUNT(*) as transfers,
          SUM(value_usd) as volume
        FROM transfers
        WHERE block_timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY hour
        ORDER BY hour DESC
      `,
    };

    const results = await Promise.all([
      this.query(queries.totalTransfers),
      this.query(queries.totalWhaleTransfers),
      this.query(queries.totalValueUsd),
      this.query(queries.uniqueWhales),
      this.query(queries.transfersByChain),
      this.query(queries.recentActivity),
    ]);

    return {
      totalTransfers: parseInt(results[0].rows[0].count),
      totalWhaleTransfers: parseInt(results[1].rows[0].count),
      totalValueUsd: parseFloat(results[2].rows[0].sum || 0),
      uniqueWhales: parseInt(results[3].rows[0].count),
      transfersByChain: results[4].rows,
      recentActivity: results[5].rows,
    };
  }

  /**
   * Map database row to NormalizedTransfer
   */
  private mapRowToTransfer(row: any): NormalizedTransfer {
    return {
      id: row.id,
      chain: row.chain,
      blockNumber: parseInt(row.block_number),
      blockTimestamp: new Date(row.block_timestamp),
      transactionHash: row.transaction_hash,
      from: row.from_address,
      to: row.to_address,
      value: row.value,
      valueUsd: parseFloat(row.value_usd),
      category: row.category,
      direction: row.direction,
      asset: {
        address: row.asset_address,
        symbol: row.asset_symbol,
        decimals: row.asset_decimals,
        name: row.asset_name,
      },
      tokenId: row.token_id,
      whaleTier: row.whale_tier,
      fromEntity: null, // TODO: join
      toEntity: null,   // TODO: join
      metadata: row.metadata,
    };
  }

  /**
   * Map database row to WhaleProfile
   */
  private mapRowToWhaleProfile(row: any): WhaleProfile {
    return {
      address: row.address,
      chain: row.chain,
      totalTransfers: parseInt(row.total_transfers),
      totalValueUsd: parseFloat(row.total_value_usd),
      largestTransferUsd: parseFloat(row.largest_transfer_usd),
      averageTransferUsd: parseFloat(row.average_transfer_usd),
      firstSeenAt: new Date(row.first_seen_at),
      lastSeenAt: new Date(row.last_seen_at),
      tier: row.tier,
      labels: null, // TODO: join
      behaviorScore: parseInt(row.behavior_score),
      riskScore: parseInt(row.risk_score),
    };
  }

  /**
   * Map database row to EntityLabel
   */
  private mapRowToEntityLabel(row: any): EntityLabel {
    return {
      address: row.address,
      name: row.name,
      type: row.type,
      labels: row.labels || [],
      metadata: {
        source: row.source,
        confidence: parseFloat(row.confidence),
        lastUpdated: new Date(row.updated_at),
        isContract: row.is_contract,
        contractName: row.contract_name,
        isExchange: row.is_exchange,
        exchangeName: row.exchange_name,
        ...(row.metadata || {}),
      },
    };
  }

  /**
   * Health check
   * Returns false if database is not available (no error logging for optional DB)
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Use pool directly to avoid error logging for optional database
      const client = await this.pool.connect();
      try {
        await client.query('SELECT 1');
        return true;
      } finally {
        client.release();
      }
    } catch (error: any) {
      // Don't log error - database is optional
      // Only return false to indicate DB is not available
      return false;
    }
  }

  /**
   * Close connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    this.logger.info('Database connection pool closed');
  }
}

export default DatabaseManager;

