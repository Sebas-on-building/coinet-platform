/**
 * Token Unlocks Database Storage
 * TimescaleDB-optimized storage for token unlock and vesting data
 * 
 * Features:
 * - Hypertable optimization for time-series data
 * - Efficient querying with indexes
 * - Historical tracking and analytics
 * - Batch insert operations
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from '../utils/logger';
import {
  NormalizedTokenUnlock,
  MessariVestingSchedule,
  MessariTokenomicsData,
  TokenUnlockAlert,
} from '../types/messari.types';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export class TokenUnlocksStorage {
  private pool: Pool;
  private isInitialized: boolean = false;

  constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.max || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 10000,
    });

    this.pool.on('error', (error) => {
      logger.error('Unexpected database error', { error: error.message });
    });

    logger.info('Token unlocks storage initialized', {
      host: config.host,
      port: config.port,
      database: config.database,
    });
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    logger.info('Initializing token unlocks database schema...');

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Create token_unlocks table
      await client.query(`
        CREATE TABLE IF NOT EXISTS token_unlocks (
          id VARCHAR(255) PRIMARY KEY,
          source VARCHAR(50) NOT NULL,
          asset_id VARCHAR(255) NOT NULL,
          symbol VARCHAR(50) NOT NULL,
          name VARCHAR(255) NOT NULL,
          unlock_date TIMESTAMPTZ NOT NULL,
          unlock_amount NUMERIC NOT NULL,
          unlock_amount_usd NUMERIC NOT NULL,
          unlock_percentage NUMERIC NOT NULL,
          category VARCHAR(100) NOT NULL,
          label VARCHAR(255),
          description TEXT,
          circulating_supply_before NUMERIC,
          circulating_supply_after NUMERIC,
          market_cap_before_usd NUMERIC,
          market_cap_after_usd NUMERIC,
          price_at_unlock_usd NUMERIC,
          impact_score INTEGER,
          severity VARCHAR(20),
          is_processed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Convert to hypertable for time-series optimization
      // Wrap in try-catch in case TimescaleDB extension is not installed
      try {
        await client.query(`
          SELECT create_hypertable(
            'token_unlocks',
            'unlock_date',
            if_not_exists => TRUE,
            migrate_data => TRUE
          );
        `);
      } catch (error: any) {
        // If TimescaleDB is not installed, log warning and continue
        if (error.message?.includes('function create_hypertable') || 
            error.message?.includes('extension') ||
            error.code === '42883') {
          logger.warn('TimescaleDB extension not found. Continuing without hypertable optimization.', {
            error: error.message,
          });
        } else {
          throw error;
        }
      }

      // Create indexes for efficient querying
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_token_unlocks_symbol 
        ON token_unlocks (symbol);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_token_unlocks_date 
        ON token_unlocks (unlock_date DESC);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_token_unlocks_severity 
        ON token_unlocks (severity, unlock_date DESC);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_token_unlocks_category 
        ON token_unlocks (category, unlock_date DESC);
      `);

      // Create vesting_schedules table
      await client.query(`
        CREATE TABLE IF NOT EXISTS vesting_schedules (
          id VARCHAR(255) PRIMARY KEY,
          asset_id VARCHAR(255) NOT NULL,
          asset_symbol VARCHAR(50) NOT NULL,
          asset_name VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          label VARCHAR(255) NOT NULL,
          total_amount NUMERIC NOT NULL,
          total_amount_usd NUMERIC,
          total_percentage NUMERIC,
          cliff_months INTEGER,
          vesting_months INTEGER,
          start_date TIMESTAMPTZ,
          end_date TIMESTAMPTZ,
          is_active BOOLEAN DEFAULT TRUE,
          unlocked_amount NUMERIC,
          remaining_amount NUMERIC,
          next_unlock_date TIMESTAMPTZ,
          next_unlock_amount NUMERIC,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Create indexes for vesting_schedules
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_vesting_schedules_symbol 
        ON vesting_schedules (asset_symbol);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_vesting_schedules_active 
        ON vesting_schedules (is_active, next_unlock_date);
      `);

      // Create tokenomics_snapshots table
      await client.query(`
        CREATE TABLE IF NOT EXISTS tokenomics_snapshots (
          id SERIAL PRIMARY KEY,
          asset_id VARCHAR(255) NOT NULL,
          asset_symbol VARCHAR(50) NOT NULL,
          asset_name VARCHAR(255) NOT NULL,
          total_supply NUMERIC,
          max_supply NUMERIC,
          circulating_supply NUMERIC,
          liquid_supply NUMERIC,
          inflation_rate_annual NUMERIC,
          snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          data JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Convert tokenomics_snapshots to hypertable
      // Wrap in try-catch in case TimescaleDB extension is not installed
      try {
        await client.query(`
          SELECT create_hypertable(
            'tokenomics_snapshots',
            'snapshot_date',
            if_not_exists => TRUE,
            migrate_data => TRUE
          );
        `);
      } catch (error: any) {
        // If TimescaleDB is not installed, log warning and continue
        if (error.message?.includes('function create_hypertable') || 
            error.message?.includes('extension') ||
            error.code === '42883') {
          logger.warn('TimescaleDB extension not found. Continuing without hypertable optimization.', {
            error: error.message,
          });
        } else {
          throw error;
        }
      }

      // Create index for tokenomics_snapshots
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tokenomics_snapshots_symbol 
        ON tokenomics_snapshots (asset_symbol, snapshot_date DESC);
      `);

      // Create unlock_alerts table
      await client.query(`
        CREATE TABLE IF NOT EXISTS unlock_alerts (
          id SERIAL PRIMARY KEY,
          unlock_id VARCHAR(255) NOT NULL REFERENCES token_unlocks(id),
          asset_symbol VARCHAR(50) NOT NULL,
          days_until_unlock INTEGER NOT NULL,
          unlock_amount_usd NUMERIC NOT NULL,
          percent_of_market_cap NUMERIC NOT NULL,
          severity VARCHAR(20) NOT NULL,
          message TEXT NOT NULL,
          recommended_action TEXT,
          is_sent BOOLEAN DEFAULT FALSE,
          sent_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Create index for unlock_alerts
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_unlock_alerts_unsent 
        ON unlock_alerts (is_sent, severity, created_at DESC);
      `);

      await client.query('COMMIT');

      this.isInitialized = true;
      logger.info('Token unlocks database schema initialized successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to initialize token unlocks database schema', {
        error,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Store a single token unlock event
   */
  async storeUnlock(unlock: NormalizedTokenUnlock): Promise<void> {
    try {
      const query = `
        INSERT INTO token_unlocks (
          id, source, asset_id, symbol, name, unlock_date,
          unlock_amount, unlock_amount_usd, unlock_percentage,
          category, label, description,
          circulating_supply_before, circulating_supply_after,
          market_cap_before_usd, market_cap_after_usd,
          price_at_unlock_usd, impact_score, severity,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        )
        ON CONFLICT (id) DO UPDATE SET
          unlock_amount_usd = EXCLUDED.unlock_amount_usd,
          unlock_percentage = EXCLUDED.unlock_percentage,
          circulating_supply_before = EXCLUDED.circulating_supply_before,
          circulating_supply_after = EXCLUDED.circulating_supply_after,
          market_cap_before_usd = EXCLUDED.market_cap_before_usd,
          market_cap_after_usd = EXCLUDED.market_cap_after_usd,
          price_at_unlock_usd = EXCLUDED.price_at_unlock_usd,
          impact_score = EXCLUDED.impact_score,
          severity = EXCLUDED.severity,
          updated_at = EXCLUDED.updated_at
      `;

      const values = [
        unlock.id,
        unlock.source,
        unlock.assetId,
        unlock.symbol,
        unlock.name,
        unlock.unlockDate,
        unlock.unlockAmount,
        unlock.unlockAmountUsd,
        unlock.unlockPercentage,
        unlock.category,
        unlock.label,
        unlock.description,
        unlock.circulatingSupplyBefore,
        unlock.circulatingSupplyAfter,
        unlock.marketCapBeforeUsd,
        unlock.marketCapAfterUsd,
        unlock.priceAtUnlockUsd,
        unlock.impactScore,
        unlock.severity,
        unlock.createdAt,
        unlock.updatedAt,
      ];

      await this.pool.query(query, values);

      logger.debug('Stored token unlock', {
        id: unlock.id,
        symbol: unlock.symbol,
      });
    } catch (error) {
      logger.error('Failed to store token unlock', { error, unlock });
      throw error;
    }
  }

  /**
   * Store multiple token unlock events (batch operation)
   */
  async storeUnlocks(unlocks: NormalizedTokenUnlock[]): Promise<void> {
    if (unlocks.length === 0) return;

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const unlock of unlocks) {
        const query = `
          INSERT INTO token_unlocks (
            id, source, asset_id, symbol, name, unlock_date,
            unlock_amount, unlock_amount_usd, unlock_percentage,
            category, label, description,
            circulating_supply_before, circulating_supply_after,
            market_cap_before_usd, market_cap_after_usd,
            price_at_unlock_usd, impact_score, severity,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
          )
          ON CONFLICT (id) DO UPDATE SET
            unlock_amount_usd = EXCLUDED.unlock_amount_usd,
            unlock_percentage = EXCLUDED.unlock_percentage,
            circulating_supply_before = EXCLUDED.circulating_supply_before,
            circulating_supply_after = EXCLUDED.circulating_supply_after,
            market_cap_before_usd = EXCLUDED.market_cap_before_usd,
            market_cap_after_usd = EXCLUDED.market_cap_after_usd,
            price_at_unlock_usd = EXCLUDED.price_at_unlock_usd,
            impact_score = EXCLUDED.impact_score,
            severity = EXCLUDED.severity,
            updated_at = EXCLUDED.updated_at
        `;

        const values = [
          unlock.id,
          unlock.source,
          unlock.assetId,
          unlock.symbol,
          unlock.name,
          unlock.unlockDate,
          unlock.unlockAmount,
          unlock.unlockAmountUsd,
          unlock.unlockPercentage,
          unlock.category,
          unlock.label,
          unlock.description,
          unlock.circulatingSupplyBefore,
          unlock.circulatingSupplyAfter,
          unlock.marketCapBeforeUsd,
          unlock.marketCapAfterUsd,
          unlock.priceAtUnlockUsd,
          unlock.impactScore,
          unlock.severity,
          unlock.createdAt,
          unlock.updatedAt,
        ];

        await client.query(query, values);
      }

      await client.query('COMMIT');

      logger.info('Stored multiple token unlocks', { count: unlocks.length });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to store token unlocks', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get upcoming unlocks for a symbol
   */
  async getUpcomingUnlocksBySymbol(
    symbol: string,
    daysAhead: number = 30
  ): Promise<NormalizedTokenUnlock[]> {
    try {
      const query = `
        SELECT * FROM token_unlocks
        WHERE symbol = $1
          AND unlock_date >= NOW()
          AND unlock_date <= NOW() + INTERVAL '${daysAhead} days'
        ORDER BY unlock_date ASC
      `;

      const result = await this.pool.query(query, [symbol]);

      return result.rows.map(this.mapRowToUnlock);
    } catch (error) {
      logger.error('Failed to get upcoming unlocks by symbol', {
        error,
        symbol,
      });
      return [];
    }
  }

  /**
   * Get all upcoming unlocks
   */
  async getAllUpcomingUnlocks(daysAhead: number = 30): Promise<NormalizedTokenUnlock[]> {
    try {
      const query = `
        SELECT * FROM token_unlocks
        WHERE unlock_date >= NOW()
          AND unlock_date <= NOW() + INTERVAL '${daysAhead} days'
        ORDER BY unlock_date ASC, impact_score DESC
      `;

      const result = await this.pool.query(query);

      return result.rows.map(this.mapRowToUnlock);
    } catch (error) {
      logger.error('Failed to get all upcoming unlocks', { error });
      return [];
    }
  }

  /**
   * Get high-impact upcoming unlocks
   */
  async getHighImpactUnlocks(
    daysAhead: number = 7,
    minSeverity: string = 'medium'
  ): Promise<NormalizedTokenUnlock[]> {
    try {
      const severityOrder = ['low', 'medium', 'high', 'critical'];
      const severities = severityOrder.slice(severityOrder.indexOf(minSeverity));

      const query = `
        SELECT * FROM token_unlocks
        WHERE unlock_date >= NOW()
          AND unlock_date <= NOW() + INTERVAL '${daysAhead} days'
          AND severity = ANY($1)
        ORDER BY 
          CASE severity
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END,
          unlock_date ASC
      `;

      const result = await this.pool.query(query, [severities]);

      return result.rows.map(this.mapRowToUnlock);
    } catch (error) {
      logger.error('Failed to get high-impact unlocks', { error });
      return [];
    }
  }

  /**
   * Store vesting schedule
   */
  async storeVestingSchedule(schedule: MessariVestingSchedule): Promise<void> {
    try {
      const query = `
        INSERT INTO vesting_schedules (
          id, asset_id, asset_symbol, asset_name, category, label,
          total_amount, total_amount_usd, total_percentage,
          cliff_months, vesting_months, start_date, end_date,
          is_active, unlocked_amount, remaining_amount,
          next_unlock_date, next_unlock_amount,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          is_active = EXCLUDED.is_active,
          unlocked_amount = EXCLUDED.unlocked_amount,
          remaining_amount = EXCLUDED.remaining_amount,
          next_unlock_date = EXCLUDED.next_unlock_date,
          next_unlock_amount = EXCLUDED.next_unlock_amount,
          updated_at = NOW()
      `;

      const values = [
        schedule.id,
        schedule.asset_id,
        schedule.asset_symbol,
        schedule.asset_name,
        schedule.category,
        schedule.label,
        schedule.total_amount,
        schedule.total_amount_usd,
        schedule.total_percentage,
        schedule.cliff_months,
        schedule.vesting_months,
        schedule.start_date,
        schedule.end_date,
        schedule.is_active,
        schedule.unlocked_amount,
        schedule.remaining_amount,
        schedule.next_unlock_date,
        schedule.next_unlock_amount,
      ];

      await this.pool.query(query, values);
    } catch (error) {
      logger.error('Failed to store vesting schedule', { error, schedule });
      throw error;
    }
  }

  /**
   * Store tokenomics snapshot
   */
  async storeTokenomicsSnapshot(tokenomics: MessariTokenomicsData): Promise<void> {
    try {
      const query = `
        INSERT INTO tokenomics_snapshots (
          asset_id, asset_symbol, asset_name,
          total_supply, max_supply, circulating_supply,
          liquid_supply, inflation_rate_annual,
          snapshot_date, data
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9
        )
      `;

      const values = [
        tokenomics.asset_id,
        tokenomics.asset_symbol,
        tokenomics.asset_name,
        tokenomics.total_supply,
        tokenomics.max_supply,
        tokenomics.circulating_supply,
        tokenomics.liquid_supply,
        tokenomics.inflation_rate_annual,
        JSON.stringify(tokenomics),
      ];

      await this.pool.query(query, values);

      logger.debug('Stored tokenomics snapshot', {
        symbol: tokenomics.asset_symbol,
      });
    } catch (error) {
      logger.error('Failed to store tokenomics snapshot', { error, tokenomics });
      throw error;
    }
  }

  /**
   * Get latest tokenomics snapshot
   */
  async getLatestTokenomics(symbol: string): Promise<MessariTokenomicsData | null> {
    try {
      const query = `
        SELECT data FROM tokenomics_snapshots
        WHERE asset_symbol = $1
        ORDER BY snapshot_date DESC
        LIMIT 1
      `;

      const result = await this.pool.query(query, [symbol]);

      if (result.rows.length === 0) return null;

      return result.rows[0].data as MessariTokenomicsData;
    } catch (error) {
      logger.error('Failed to get latest tokenomics', { error, symbol });
      return null;
    }
  }

  /**
   * Store unlock alert
   */
  async storeAlert(alert: TokenUnlockAlert): Promise<void> {
    try {
      const query = `
        INSERT INTO unlock_alerts (
          unlock_id, asset_symbol, days_until_unlock,
          unlock_amount_usd, percent_of_market_cap,
          severity, message, recommended_action
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      const values = [
        alert.unlockId,
        alert.assetSymbol,
        alert.daysUntilUnlock,
        alert.unlockAmountUsd,
        alert.percentOfMarketCap,
        alert.severity,
        alert.message,
        alert.recommendedAction,
      ];

      await this.pool.query(query, values);
    } catch (error) {
      logger.error('Failed to store alert', { error, alert });
      throw error;
    }
  }

  /**
   * Get unsent alerts
   */
  async getUnsentAlerts(): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM unlock_alerts
        WHERE is_sent = FALSE
        ORDER BY 
          CASE severity
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END,
          created_at DESC
      `;

      const result = await this.pool.query(query);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get unsent alerts', { error });
      return [];
    }
  }

  /**
   * Mark alert as sent
   */
  async markAlertSent(alertId: number): Promise<void> {
    try {
      const query = `
        UPDATE unlock_alerts
        SET is_sent = TRUE, sent_at = NOW()
        WHERE id = $1
      `;

      await this.pool.query(query, [alertId]);
    } catch (error) {
      logger.error('Failed to mark alert as sent', { error, alertId });
      throw error;
    }
  }

  /**
   * Map database row to NormalizedTokenUnlock
   */
  private mapRowToUnlock(row: any): NormalizedTokenUnlock {
    return {
      id: row.id,
      source: row.source,
      assetId: row.asset_id,
      symbol: row.symbol,
      name: row.name,
      unlockDate: new Date(row.unlock_date),
      unlockAmount: parseFloat(row.unlock_amount),
      unlockAmountUsd: parseFloat(row.unlock_amount_usd),
      unlockPercentage: parseFloat(row.unlock_percentage),
      category: row.category,
      label: row.label,
      description: row.description,
      circulatingSupplyBefore: row.circulating_supply_before
        ? parseFloat(row.circulating_supply_before)
        : undefined,
      circulatingSupplyAfter: row.circulating_supply_after
        ? parseFloat(row.circulating_supply_after)
        : undefined,
      marketCapBeforeUsd: row.market_cap_before_usd
        ? parseFloat(row.market_cap_before_usd)
        : undefined,
      marketCapAfterUsd: row.market_cap_after_usd
        ? parseFloat(row.market_cap_after_usd)
        : undefined,
      priceAtUnlockUsd: row.price_at_unlock_usd
        ? parseFloat(row.price_at_unlock_usd)
        : undefined,
      impactScore: row.impact_score,
      severity: row.severity,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Token unlocks storage health check failed', { error });
      return false;
    }
  }

  /**
   * Close pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Token unlocks storage closed');
  }
}

export default TokenUnlocksStorage;

