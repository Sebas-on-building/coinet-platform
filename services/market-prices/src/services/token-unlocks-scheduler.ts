/**
 * Token Unlocks Intelligent Scheduler
 * Divine world-class scheduling for token unlock data fetching
 * 
 * Features:
 * - Daily polling for standard unlocks
 * - Frequent polling (hourly) for near-term unlocks (within 7 days)
 * - Adaptive polling based on data freshness
 * - Error handling with exponential backoff
 * - Performance metrics and monitoring
 */

import * as cron from 'node-cron';
import EventEmitter from 'eventemitter3';
import { logger } from '../utils/logger';
import { MessariRestClient } from '../providers/messari-rest';
import { TokenUnlocksCache } from '../storage/token-unlocks-cache';
import { TokenUnlocksStorage } from '../storage/token-unlocks-storage';
import { NormalizedTokenUnlock } from '../types/messari.types';

export interface SchedulerConfig {
  dailyPollingCron: string; // Default: '0 0 * * *' (daily at midnight)
  nearTermPollingCron: string; // Default: '0 * * * *' (hourly)
  nearTermThresholdDays: number; // Default: 7
  daysAheadToFetch: number; // Default: 90
  enableDailyPolling: boolean;
  enableNearTermPolling: boolean;
  retryAttempts: number;
  retryDelayMs: number;
}

export interface SchedulerStats {
  dailyPollCount: number;
  nearTermPollCount: number;
  lastDailyPoll?: Date;
  lastNearTermPoll?: Date;
  lastError?: {
    message: string;
    timestamp: Date;
  };
  unlocksTracked: number;
  nearTermUnlocksCount: number;
}

export class TokenUnlocksScheduler extends EventEmitter {
  private messariClient: MessariRestClient;
  private cache: TokenUnlocksCache;
  private storage: TokenUnlocksStorage;
  private config: SchedulerConfig;
  
  private dailyPollTask?: cron.ScheduledTask;
  private nearTermPollTask?: cron.ScheduledTask;
  
  private stats: SchedulerStats = {
    dailyPollCount: 0,
    nearTermPollCount: 0,
    unlocksTracked: 0,
    nearTermUnlocksCount: 0,
  };

  private isRunning: boolean = false;
  private isPaused: boolean = false;

  constructor(
    messariClient: MessariRestClient,
    cache: TokenUnlocksCache,
    storage: TokenUnlocksStorage,
    config: Partial<SchedulerConfig> = {}
  ) {
    super();

    this.messariClient = messariClient;
    this.cache = cache;
    this.storage = storage;

    // Merge with defaults
    this.config = {
      dailyPollingCron: config.dailyPollingCron || '0 0 * * *', // Daily at midnight
      nearTermPollingCron: config.nearTermPollingCron || '0 * * * *', // Hourly
      nearTermThresholdDays: config.nearTermThresholdDays ?? 7,
      daysAheadToFetch: config.daysAheadToFetch ?? 90,
      enableDailyPolling: config.enableDailyPolling ?? true,
      enableNearTermPolling: config.enableNearTermPolling ?? true,
      retryAttempts: config.retryAttempts ?? 3,
      retryDelayMs: config.retryDelayMs ?? 5000,
    };

    logger.info('Token unlocks scheduler initialized', {
      dailyPollingCron: this.config.dailyPollingCron,
      nearTermPollingCron: this.config.nearTermPollingCron,
      nearTermThresholdDays: this.config.nearTermThresholdDays,
    });
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Token unlocks scheduler already running');
      return;
    }

    logger.info('Starting token unlocks scheduler...');

    // Schedule daily polling
    if (this.config.enableDailyPolling) {
      this.dailyPollTask = cron.schedule(
        this.config.dailyPollingCron,
        async () => {
          try {
            await this.executeDailyPoll();
          } catch (error) {
            logger.error('Daily poll execution failed', { error });
            this.emit('daily_poll_failed', { error });
          }
        }
      );
      logger.info('Daily polling scheduled', {
        cron: this.config.dailyPollingCron,
      });
    }

    // Schedule near-term polling
    if (this.config.enableNearTermPolling) {
      this.nearTermPollTask = cron.schedule(
        this.config.nearTermPollingCron,
        async () => {
          try {
            await this.executeNearTermPoll();
          } catch (error) {
            logger.error('Near-term poll execution failed', { error });
            this.emit('near_term_poll_failed', { error });
          }
        }
      );
      logger.info('Near-term polling scheduled', {
        cron: this.config.nearTermPollingCron,
      });
    }

    // Run initial poll
    this.executeInitialPoll().catch((error) => {
      logger.error('Initial poll failed', { error: error.message });
    });

    this.isRunning = true;
    this.emit('started');

    logger.info('Token unlocks scheduler started');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Token unlocks scheduler not running');
      return;
    }

    logger.info('Stopping token unlocks scheduler...');

    if (this.dailyPollTask) {
      this.dailyPollTask.stop();
    }

    if (this.nearTermPollTask) {
      this.nearTermPollTask.stop();
    }

    this.isRunning = false;
    this.emit('stopped');

    logger.info('Token unlocks scheduler stopped');
  }

  /**
   * Pause the scheduler (stop polling without destroying tasks)
   */
  pause(): void {
    if (this.isPaused) return;

    this.isPaused = true;
    this.emit('paused');
    logger.info('Token unlocks scheduler paused');
  }

  /**
   * Resume the scheduler
   */
  resume(): void {
    if (!this.isPaused) return;

    this.isPaused = false;
    this.emit('resumed');
    logger.info('Token unlocks scheduler resumed');
  }

  /**
   * Execute initial poll on startup
   */
  private async executeInitialPoll(): Promise<void> {
    logger.info('Executing initial poll...');

    try {
      // Check cache first
      const cachedUnlocks = await this.cache.getAllUpcomingUnlocks();

      if (cachedUnlocks && cachedUnlocks.length > 0) {
        logger.info('Found cached unlocks on startup', {
          count: cachedUnlocks.length,
        });
        this.stats.unlocksTracked = cachedUnlocks.length;
        this.stats.nearTermUnlocksCount = this.countNearTermUnlocks(cachedUnlocks);
        return;
      }

      // If no cache, fetch from API
      await this.executeDailyPoll();
    } catch (error) {
      logger.error('Initial poll failed', { error });
      this.recordError(error as Error);
    }
  }

  /**
   * Execute daily polling for all unlocks
   */
  private async executeDailyPoll(): Promise<void> {
    if (this.isPaused) {
      logger.debug('Skipping daily poll (paused)');
      return;
    }

    logger.info('Executing daily poll for token unlocks...');

    try {
      const unlocks = await this.fetchUnlocksWithRetry(
        this.config.daysAheadToFetch
      );

      if (unlocks.length > 0) {
        // Store in database
        await this.storage.storeUnlocks(unlocks);

        // Update cache
        await this.cache.cacheAllUpcomingUnlocks(unlocks);
        await this.cache.cacheUnlocks(unlocks);

        // Update stats
        this.stats.dailyPollCount++;
        this.stats.lastDailyPoll = new Date();
        this.stats.unlocksTracked = unlocks.length;
        this.stats.nearTermUnlocksCount = this.countNearTermUnlocks(unlocks);

        logger.info('Daily poll completed', {
          unlocksFound: unlocks.length,
          nearTerm: this.stats.nearTermUnlocksCount,
        });

        this.emit('daily_poll_completed', {
          unlocks,
          count: unlocks.length,
        });
      } else {
        logger.warn('Daily poll returned no unlocks');
      }
    } catch (error) {
      logger.error('Daily poll failed', { error });
      this.recordError(error as Error);
      this.emit('daily_poll_failed', { error });
    }
  }

  /**
   * Execute near-term polling for unlocks within threshold
   */
  private async executeNearTermPoll(): Promise<void> {
    if (this.isPaused) {
      logger.debug('Skipping near-term poll (paused)');
      return;
    }

    logger.info('Executing near-term poll for token unlocks...');

    try {
      const unlocks = await this.fetchUnlocksWithRetry(
        this.config.nearTermThresholdDays
      );

      if (unlocks.length > 0) {
        // Filter to only near-term unlocks
        const nearTermUnlocks = unlocks.filter((unlock) => {
          const daysUntil = Math.ceil(
            (unlock.unlockDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          return daysUntil <= this.config.nearTermThresholdDays;
        });

        if (nearTermUnlocks.length > 0) {
          // Store in database (upsert to update any changes)
          await this.storage.storeUnlocks(nearTermUnlocks);

          // Update cache with shorter TTL
          await this.cache.cacheUnlocks(nearTermUnlocks);

          // Update cache for each symbol
          const symbolMap = new Map<string, NormalizedTokenUnlock[]>();
          nearTermUnlocks.forEach((unlock) => {
            if (!symbolMap.has(unlock.symbol)) {
              symbolMap.set(unlock.symbol, []);
            }
            symbolMap.get(unlock.symbol)!.push(unlock);
          });

          const symbolEntries = Array.from(symbolMap.entries());
          for (const [symbol, symbolUnlocks] of symbolEntries) {
            await this.cache.cacheUpcomingUnlocksBySymbol(symbol, symbolUnlocks);
          }

          // Update stats
          this.stats.nearTermPollCount++;
          this.stats.lastNearTermPoll = new Date();
          this.stats.nearTermUnlocksCount = nearTermUnlocks.length;

          logger.info('Near-term poll completed', {
            unlocksFound: nearTermUnlocks.length,
          });

          this.emit('near_term_poll_completed', {
            unlocks: nearTermUnlocks,
            count: nearTermUnlocks.length,
          });
        } else {
          logger.info('No near-term unlocks found');
        }
      } else {
        logger.warn('Near-term poll returned no unlocks');
      }
    } catch (error) {
      logger.error('Near-term poll failed', { error });
      this.recordError(error as Error);
      this.emit('near_term_poll_failed', { error });
    }
  }

  /**
   * Fetch unlocks with retry logic
   */
  private async fetchUnlocksWithRetry(
    daysAhead: number
  ): Promise<NormalizedTokenUnlock[]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        if (attempt > 0) {
          logger.info(`Retry attempt ${attempt + 1}/${this.config.retryAttempts}`);
          await this.delay(this.config.retryDelayMs * Math.pow(2, attempt));
        }

        const unlocks = await this.messariClient.getUpcomingUnlocksNormalized(
          daysAhead,
          0 // minImpactScore
        );

        logger.info('Fetched unlocks from Messari', {
          count: unlocks.length,
          daysAhead,
        });

        return unlocks;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Fetch attempt ${attempt + 1} failed`, {
          error: (error as Error).message,
        });
      }
    }

    throw new Error(
      `Failed to fetch unlocks after ${this.config.retryAttempts} attempts: ${lastError?.message}`
    );
  }

  /**
   * Count near-term unlocks
   */
  private countNearTermUnlocks(unlocks: NormalizedTokenUnlock[]): number {
    return unlocks.filter((unlock) => {
      const daysUntil = Math.ceil(
        (unlock.unlockDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil <= this.config.nearTermThresholdDays;
    }).length;
  }

  /**
   * Record error in stats
   */
  private recordError(error: Error): void {
    this.stats.lastError = {
      message: error.message,
      timestamp: new Date(),
    };
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Trigger manual daily poll
   */
  async triggerDailyPoll(): Promise<void> {
    logger.info('Manual daily poll triggered');
    await this.executeDailyPoll();
  }

  /**
   * Trigger manual near-term poll
   */
  async triggerNearTermPoll(): Promise<void> {
    logger.info('Manual near-term poll triggered');
    await this.executeNearTermPoll();
  }

  /**
   * Get scheduler statistics
   */
  getStats(): SchedulerStats {
    return { ...this.stats };
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    isPaused: boolean;
    dailyPollingEnabled: boolean;
    nearTermPollingEnabled: boolean;
    config: SchedulerConfig;
  } {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      dailyPollingEnabled: this.config.enableDailyPolling,
      nearTermPollingEnabled: this.config.enableNearTermPolling,
      config: this.config,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SchedulerConfig>): void {
    const wasRunning = this.isRunning;

    if (wasRunning) {
      this.stop();
    }

    this.config = {
      ...this.config,
      ...newConfig,
    };

    logger.info('Scheduler configuration updated', { newConfig });

    if (wasRunning) {
      this.start();
    }
  }
}

export default TokenUnlocksScheduler;

