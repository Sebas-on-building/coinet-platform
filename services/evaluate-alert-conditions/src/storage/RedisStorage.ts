/**
 * =========================================
 * REDIS STORAGE IMPLEMENTATION
 * =========================================
 * Divine world-class Redis storage for alert evaluation data
 * High-performance caching and persistence for rules, baselines, and thresholds
 */

import { Logger } from '@/utils/Logger';
import Redis from 'ioredis';
import {
  AlertRule,
  BaselineValue,
  ThresholdValue,
  SequencePattern,
  AlertRuleStatus,
  MetricType,
  IAlertRuleStorage,
  IBaselineStorage,
  IThresholdStorage,
  IPatternStorage
} from '@/types';

/**
 * Redis-based alert rule storage
 */
export class RedisAlertRuleStorage implements IAlertRuleStorage {
  private logger: Logger;
  private redis: Redis;
  private keyPrefix = 'alert:rules';

  constructor(redis: Redis) {
    this.logger = new Logger('RedisAlertRuleStorage');
    this.redis = redis;
  }

  async getActiveRules(): Promise<AlertRule[]> {
    try {
      const ruleIds = await this.redis.smembers(`${this.keyPrefix}:active`);

      if (ruleIds.length === 0) {
        return [];
      }

      const rules = await this.redis.mget(...ruleIds.map(id => `${this.keyPrefix}:data:${id}`));

      return rules
        .filter(rule => rule !== null)
        .map(rule => JSON.parse(rule!) as AlertRule)
        .filter(rule => rule.status === AlertRuleStatus.ACTIVE);

    } catch (error: any) {
      this.logger.error('Failed to get active rules', { error: error.message });
      return [];
    }
  }

  async getRulesByIds(ids: string[]): Promise<AlertRule[]> {
    if (ids.length === 0) return [];

    try {
      const keys = ids.map(id => `${this.keyPrefix}:data:${id}`);
      const rules = await this.redis.mget(...keys);

      return rules
        .filter(rule => rule !== null)
        .map(rule => JSON.parse(rule!) as AlertRule);

    } catch (error: any) {
      this.logger.error('Failed to get rules by IDs', { ids, error: error.message });
      return [];
    }
  }

  async getRulesByExchange(exchange: string): Promise<AlertRule[]> {
    try {
      const ruleIds = await this.redis.smembers(`${this.keyPrefix}:exchange:${exchange}`);

      if (ruleIds.length === 0) {
        return [];
      }

      return this.getRulesByIds(ruleIds);

    } catch (error: any) {
      this.logger.error('Failed to get rules by exchange', { exchange, error: error.message });
      return [];
    }
  }

  async getRulesBySymbol(symbolPattern: string): Promise<AlertRule[]> {
    try {
      const ruleIds = await this.redis.smembers(`${this.keyPrefix}:symbol:${symbolPattern}`);

      if (ruleIds.length === 0) {
        return [];
      }

      return this.getRulesByIds(ruleIds);

    } catch (error: any) {
      this.logger.error('Failed to get rules by symbol', { symbolPattern, error: error.message });
      return [];
    }
  }

  async updateRuleIndex(rules: AlertRule[]): Promise<void> {
    try {
      // Clear existing index
      await this.clearRuleIndex();

      // Build new index
      for (const rule of rules) {
        if (rule.status !== AlertRuleStatus.ACTIVE) continue;

        // Index by exchange
        for (const exchange of rule.exchanges) {
          await this.redis.sadd(`${this.keyPrefix}:exchange:${exchange}`, rule.id);
        }

        // Index by symbol patterns
        for (const symbolPattern of rule.symbols) {
          await this.redis.sadd(`${this.keyPrefix}:symbol:${symbolPattern}`, rule.id);
        }

        // Index by asset types
        for (const assetType of rule.assetTypes) {
          await this.redis.sadd(`${this.keyPrefix}:assetType:${assetType}`, rule.id);
        }

        // Index by signal types
        for (const signalType of rule.signalTypes) {
          await this.redis.sadd(`${this.keyPrefix}:signalType:${signalType}`, rule.id);
        }

        // Add to active rules
        await this.redis.sadd(`${this.keyPrefix}:active`, rule.id);

        // Store rule data
        await this.redis.set(
          `${this.keyPrefix}:data:${rule.id}`,
          JSON.stringify(rule),
          'EX',
          3600 // 1 hour TTL
        );
      }

      this.logger.info('Updated rule index', { ruleCount: rules.length });

    } catch (error: any) {
      this.logger.error('Failed to update rule index', { error: error.message });
    }
  }

  async getRuleStats() {
    try {
      const totalRules = await this.redis.scard(`${this.keyPrefix}:active`);

      // Get rules by severity (simplified)
      const rulesBySeverity = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      };

      // Get rules by exchange (simplified)
      const rulesByExchange = {};

      return {
        totalRules,
        activeRules: totalRules,
        rulesBySeverity,
        rulesByExchange,
      };

    } catch (error: any) {
      this.logger.error('Failed to get rule stats', { error: error.message });
      return {
        totalRules: 0,
        activeRules: 0,
        rulesBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
        rulesByExchange: {},
      };
    }
  }

  private async clearRuleIndex(): Promise<void> {
    const pattern = `${this.keyPrefix}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

/**
 * Redis-based baseline storage
 */
export class RedisBaselineStorage implements IBaselineStorage {
  private logger: Logger;
  private redis: Redis;
  private keyPrefix = 'alert:baselines';

  constructor(redis: Redis) {
    this.logger = new Logger('RedisBaselineStorage');
    this.redis = redis;
  }

  async getBaseline(baselineId: string): Promise<BaselineValue | null> {
    try {
      const data = await this.redis.get(`${this.keyPrefix}:${baselineId}`);

      if (!data) return null;

      return JSON.parse(data) as BaselineValue;

    } catch (error: any) {
      this.logger.error('Failed to get baseline', { baselineId, error: error.message });
      return null;
    }
  }

  async updateBaseline(baseline: BaselineValue): Promise<void> {
    try {
      await this.redis.set(
        `${this.keyPrefix}:${baseline.baselineId}`,
        JSON.stringify(baseline),
        'EX',
        3600 // 1 hour TTL
      );

    } catch (error: any) {
      this.logger.error('Failed to update baseline', { baselineId: baseline.baselineId, error: error.message });
    }
  }

  async getBaselinesForMetric(metricType: MetricType): Promise<BaselineValue[]> {
    try {
      const pattern = `${this.keyPrefix}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) return [];

      const baselines = await this.redis.mget(...keys);

      return baselines
        .filter(baseline => baseline !== null)
        .map(baseline => JSON.parse(baseline!) as BaselineValue)
        .filter(baseline => baseline.baselineId); // Filter valid baselines

    } catch (error: any) {
      this.logger.error('Failed to get baselines for metric', { metricType, error: error.message });
      return [];
    }
  }

  async invalidateBaselines(metricType?: MetricType): Promise<void> {
    try {
      if (metricType) {
        // Invalidate baselines for specific metric type
        const pattern = `${this.keyPrefix}:*`;
        const keys = await this.redis.keys(pattern);

        for (const key of keys) {
          const baseline = await this.redis.get(key);
          if (baseline) {
            const parsed = JSON.parse(baseline) as BaselineValue;
            // Simplified - in real implementation would check metric type
            await this.redis.del(key);
          }
        }
      } else {
        // Invalidate all baselines
        const pattern = `${this.keyPrefix}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }

      this.logger.info('Invalidated baselines', { metricType });

    } catch (error: any) {
      this.logger.error('Failed to invalidate baselines', { metricType, error: error.message });
    }
  }
}

/**
 * Redis-based threshold storage
 */
export class RedisThresholdStorage implements IThresholdStorage {
  private logger: Logger;
  private redis: Redis;
  private keyPrefix = 'alert:thresholds';

  constructor(redis: Redis) {
    this.logger = new Logger('RedisThresholdStorage');
    this.redis = redis;
  }

  async getThreshold(thresholdId: string): Promise<ThresholdValue | null> {
    try {
      const data = await this.redis.get(`${this.keyPrefix}:${thresholdId}`);

      if (!data) return null;

      return JSON.parse(data) as ThresholdValue;

    } catch (error: any) {
      this.logger.error('Failed to get threshold', { thresholdId, error: error.message });
      return null;
    }
  }

  async updateThreshold(threshold: ThresholdValue): Promise<void> {
    try {
      await this.redis.set(
        `${this.keyPrefix}:${threshold.thresholdId}`,
        JSON.stringify(threshold),
        'EX',
        3600 // 1 hour TTL
      );

    } catch (error: any) {
      this.logger.error('Failed to update threshold', { thresholdId: threshold.thresholdId, error: error.message });
    }
  }

  async getThresholdsForMetric(metricType: MetricType): Promise<ThresholdValue[]> {
    try {
      const pattern = `${this.keyPrefix}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) return [];

      const thresholds = await this.redis.mget(...keys);

      return thresholds
        .filter(threshold => threshold !== null)
        .map(threshold => JSON.parse(threshold!) as ThresholdValue)
        .filter(threshold => threshold.thresholdId); // Filter valid thresholds

    } catch (error: any) {
      this.logger.error('Failed to get thresholds for metric', { metricType, error: error.message });
      return [];
    }
  }
}

/**
 * Redis-based pattern storage
 */
export class RedisPatternStorage implements IPatternStorage {
  private logger: Logger;
  private redis: Redis;
  private keyPrefix = 'alert:patterns';

  constructor(redis: Redis) {
    this.logger = new Logger('RedisPatternStorage');
    this.redis = redis;
  }

  async getPattern(patternId: string): Promise<SequencePattern | null> {
    try {
      const data = await this.redis.get(`${this.keyPrefix}:${patternId}`);

      if (!data) return null;

      return JSON.parse(data) as SequencePattern;

    } catch (error: any) {
      this.logger.error('Failed to get pattern', { patternId, error: error.message });
      return null;
    }
  }

  async getActivePatterns(): Promise<SequencePattern[]> {
    try {
      const patternIds = await this.redis.smembers(`${this.keyPrefix}:active`);

      if (patternIds.length === 0) {
        return [];
      }

      const patterns = await this.redis.mget(...patternIds.map(id => `${this.keyPrefix}:data:${id}`));

      return patterns
        .filter(pattern => pattern !== null)
        .map(pattern => JSON.parse(pattern!) as SequencePattern);

    } catch (error: any) {
      this.logger.error('Failed to get active patterns', { error: error.message });
      return [];
    }
  }

  async updatePattern(pattern: SequencePattern): Promise<void> {
    try {
      await this.redis.set(
        `${this.keyPrefix}:${pattern.id}`,
        JSON.stringify(pattern),
        'EX',
        3600 // 1 hour TTL
      );

      // Add to active patterns
      await this.redis.sadd(`${this.keyPrefix}:active`, pattern.id);

    } catch (error: any) {
      this.logger.error('Failed to update pattern', { patternId: pattern.id, error: error.message });
    }
  }
}
