/**
 * =========================================
 * PATTERN MINER SERVICE
 * =========================================
 * Discovers frequent patterns using Apriori algorithm
 * Mines sequential and temporal patterns for predictions
 */

import { EventEmitter } from 'eventemitter3';
import { logger } from '../utils/logger';
import {
  AccessPattern,
  FrequentPattern,
  SequentialPattern,
  TemporalPattern,
  PatternMiningConfig,
  PatternMiningStats,
  PatternMiningEvent,
  PatternDiscoveryEvent,
  MiningJobStatus,
} from './types/pattern.types';

export class PatternMinerService extends EventEmitter {
  private config: PatternMiningConfig;
  private frequentPatterns: Map<string, FrequentPattern> = new Map();
  private sequentialPatterns: Map<string, SequentialPattern> = new Map();
  private temporalPatterns: Map<string, TemporalPattern> = new Map();
  private miningTimer?: NodeJS.Timeout;
  private isMining: boolean = false;
  private stats: PatternMiningStats;

  constructor(config: Partial<PatternMiningConfig> = {}) {
    super();

    this.config = {
      minSupport: 0.05, // 5% minimum frequency
      minConfidence: 0.6, // 60% minimum confidence
      maxPatternLength: 5,
      miningInterval: 300000, // 5 minutes
      retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      enableSequentialMining: true,
      enableTemporalMining: true,
      enableCollaborativeFiltering: false, // Week 2
      ...config,
    };

    this.stats = {
      totalPatterns: 0,
      frequentPatterns: 0,
      sequentialPatterns: 0,
      temporalPatterns: 0,
      avgSupport: 0,
      avgConfidence: 0,
      totalSessions: 0,
      totalRequests: 0,
      uniqueUsers: 0,
      uniqueTokens: 0,
      lastMiningTime: new Date(),
      miningDuration: 0,
      cacheHitPrediction: 0,
    };

    logger.info('Pattern Miner Service initialized', {
      minSupport: this.config.minSupport,
      minConfidence: this.config.minConfidence,
      maxPatternLength: this.config.maxPatternLength,
    });
  }

  /**
   * Start automatic pattern mining
   */
  startAutoMining(): void {
    if (this.miningTimer) return;

    this.miningTimer = setInterval(() => {
      this.emit('auto_mining_triggered');
    }, this.config.miningInterval);

    logger.info('Auto-mining started', {
      interval: this.config.miningInterval,
    });
  }

  /**
   * Stop automatic pattern mining
   */
  stopAutoMining(): void {
    if (this.miningTimer) {
      clearInterval(this.miningTimer);
      this.miningTimer = undefined;
      logger.info('Auto-mining stopped');
    }
  }

  /**
   * Mine patterns from access log
   */
  async minePatterns(accessLog: AccessPattern[]): Promise<MiningJobStatus> {
    if (this.isMining) {
      logger.warn('Mining already in progress');
      return {
        jobId: 'already-running',
        status: 'running',
        recordsProcessed: 0,
        patternsDiscovered: 0,
      };
    }

    const jobId = `mining-${Date.now()}`;
    const startTime = Date.now();

    this.isMining = true;
    this.emit(PatternMiningEvent.MINING_STARTED, { jobId, startTime });

    logger.info('Starting pattern mining', {
      jobId,
      recordsToProcess: accessLog.length,
    });

    try {
      // Group by session
      const sessions = this.groupBySession(accessLog);

      // Update stats
      this.stats.totalSessions = sessions.size;
      this.stats.totalRequests = accessLog.length;
      this.stats.uniqueUsers = new Set(accessLog.map((a) => a.userId)).size;
      this.stats.uniqueTokens = new Set(
        accessLog.flatMap((a) => a.requestedTokens)
      ).size;

      let patternsDiscovered = 0;

      // 1. Mine frequent patterns (Apriori algorithm)
      const frequentPatterns = await this.mineFrequentPatterns(sessions);
      patternsDiscovered += frequentPatterns.length;

      // 2. Mine sequential patterns (order matters)
      if (this.config.enableSequentialMining) {
        const sequentialPatterns = await this.mineSequentialPatterns(accessLog);
        patternsDiscovered += sequentialPatterns.length;
      }

      // 3. Mine temporal patterns (time-based)
      if (this.config.enableTemporalMining) {
        const temporalPatterns = await this.mineTemporalPatterns(accessLog);
        patternsDiscovered += temporalPatterns.length;
      }

      // Clean up old patterns
      this.cleanupOldPatterns();

      // Update stats
      const endTime = Date.now();
      this.stats.lastMiningTime = new Date();
      this.stats.miningDuration = endTime - startTime;
      this.stats.totalPatterns = patternsDiscovered;
      this.stats.frequentPatterns = this.frequentPatterns.size;
      this.stats.sequentialPatterns = this.sequentialPatterns.size;
      this.stats.temporalPatterns = this.temporalPatterns.size;

      // Calculate averages
      const allPatterns = Array.from(this.frequentPatterns.values());
      if (allPatterns.length > 0) {
        this.stats.avgSupport =
          allPatterns.reduce((sum, p) => sum + p.support, 0) /
          allPatterns.length;
        this.stats.avgConfidence =
          allPatterns.reduce((sum, p) => sum + p.confidence, 0) /
          allPatterns.length;
      }

      const status: MiningJobStatus = {
        jobId,
        status: 'completed',
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration: endTime - startTime,
        recordsProcessed: accessLog.length,
        patternsDiscovered,
      };

      this.emit(PatternMiningEvent.MINING_COMPLETED, status);

      logger.info('Pattern mining completed', {
        jobId,
        duration: endTime - startTime,
        patternsDiscovered,
      });

      return status;
    } catch (error) {
      logger.error('Pattern mining failed', { error, jobId });

      return {
        jobId,
        status: 'failed',
        recordsProcessed: accessLog.length,
        patternsDiscovered: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      this.isMining = false;
    }
  }

  /**
   * Mine frequent patterns using Apriori algorithm
   */
  private async mineFrequentPatterns(
    sessions: Map<string, string[][]>
  ): Promise<FrequentPattern[]> {
    const discovered: FrequentPattern[] = [];

    // Find frequent 1-itemsets (single tokens)
    const tokenCounts = new Map<string, number>();
    const totalSessions = sessions.size;

    sessions.forEach((tokenSets) => {
      const uniqueTokens = new Set(tokenSets.flat());
      uniqueTokens.forEach((token) => {
        tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
      });
    });

    // Filter by minimum support
    const frequentTokens = Array.from(tokenCounts.entries())
      .filter(([, count]) => count / totalSessions >= this.config.minSupport)
      .map(([token]) => token);

    logger.debug('Found frequent 1-itemsets', {
      count: frequentTokens.length,
      minSupport: this.config.minSupport,
    });

    // Find frequent 2-itemsets (pairs)
    const pairs = await this.findFrequentKItemsets(
      sessions,
      frequentTokens,
      2
    );
    discovered.push(...pairs);

    // Find frequent 3-itemsets (triplets)
    if (this.config.maxPatternLength >= 3) {
      const triplets = await this.findFrequentKItemsets(
        sessions,
        frequentTokens,
        3
      );
      discovered.push(...triplets);
    }

    // Find frequent 4-itemsets
    if (this.config.maxPatternLength >= 4) {
      const quadruplets = await this.findFrequentKItemsets(
        sessions,
        frequentTokens,
        4
      );
      discovered.push(...quadruplets);
    }

    // Store patterns
    discovered.forEach((pattern) => {
      const key = pattern.tokens.sort().join('→');
      this.frequentPatterns.set(key, pattern);

      this.emit(PatternMiningEvent.PATTERN_DISCOVERED, {
        pattern,
        type: 'frequent',
        impact: this.calculateImpact(pattern.support, pattern.confidence),
        timestamp: new Date(),
      } as PatternDiscoveryEvent);
    });

    return discovered;
  }

  /**
   * Find frequent K-itemsets
   */
  private async findFrequentKItemsets(
    sessions: Map<string, string[][]>,
    candidateTokens: string[],
    k: number
  ): Promise<FrequentPattern[]> {
    const itemsetCounts = new Map<string, number>();
    const totalSessions = sessions.size;

    // Generate k-itemsets from candidate tokens
    const candidates = this.generateCombinations(candidateTokens, k);

    // Count occurrences
    sessions.forEach((tokenSets) => {
      const sessionTokens = new Set(tokenSets.flat());

      candidates.forEach((itemset) => {
        // Check if all tokens in itemset are present in session
        if (itemset.every((token) => sessionTokens.has(token))) {
          const key = itemset.sort().join(',');
          itemsetCounts.set(key, (itemsetCounts.get(key) || 0) + 1);
        }
      });
    });

    // Filter by minimum support and calculate confidence
    const patterns: FrequentPattern[] = [];

    itemsetCounts.forEach((count, itemsetKey) => {
      const support = count / totalSessions;
      if (support >= this.config.minSupport) {
        const tokens = itemsetKey.split(',');
        const confidence = this.calculateConfidence(tokens, sessions);
        const lift = this.calculateLift(tokens, sessions);
        const conviction = this.calculateConviction(tokens, sessions);

        if (confidence >= this.config.minConfidence) {
          patterns.push({
            tokens,
            support,
            confidence,
            lift,
            conviction,
            createdAt: new Date(),
            lastSeen: new Date(),
            occurrences: count,
          });
        }
      }
    });

    logger.debug(`Found frequent ${k}-itemsets`, { count: patterns.length });

    return patterns;
  }

  /**
   * Generate combinations of size k
   */
  private generateCombinations(tokens: string[], k: number): string[][] {
    const results: string[][] = [];

    const backtrack = (start: number, current: string[]) => {
      if (current.length === k) {
        results.push([...current]);
        return;
      }

      for (let i = start; i < tokens.length; i++) {
        current.push(tokens[i]);
        backtrack(i + 1, current);
        current.pop();
      }
    };

    backtrack(0, []);
    return results;
  }

  /**
   * Mine sequential patterns (order matters)
   */
  private async mineSequentialPatterns(
    accessLog: AccessPattern[]
  ): Promise<SequentialPattern[]> {
    const discovered: SequentialPattern[] = [];
    const sequenceCounts = new Map<
      string,
      { count: number; timeDiffs: number[] }
    >();

    // Group by session
    const sessionPatterns = new Map<string, AccessPattern[]>();
    accessLog.forEach((pattern) => {
      if (!sessionPatterns.has(pattern.sessionId)) {
        sessionPatterns.set(pattern.sessionId, []);
      }
      sessionPatterns.get(pattern.sessionId)!.push(pattern);
    });

    const totalSessions = sessionPatterns.size;

    // Find sequential patterns (A → B)
    sessionPatterns.forEach((patterns) => {
      const sorted = patterns.sort((a, b) => a.sequence - b.sequence);

      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];
        const timeDiff =
          next.timestamp.getTime() - current.timestamp.getTime();

        current.requestedTokens.forEach((token1) => {
          next.requestedTokens.forEach((token2) => {
            const sequenceKey = `${token1}→${token2}`;
            const existing = sequenceCounts.get(sequenceKey) || {
              count: 0,
              timeDiffs: [],
            };
            existing.count++;
            existing.timeDiffs.push(timeDiff);
            sequenceCounts.set(sequenceKey, existing);
          });
        });
      }
    });

    // Filter by minimum support
    sequenceCounts.forEach(({ count, timeDiffs }, sequenceKey) => {
      const support = count / totalSessions;

      if (support >= this.config.minSupport && timeDiffs.length > 0) {
        const sequence = sequenceKey.split('→');
        const avgTimeBetween =
          timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
        const stdDevTimeBetween = this.calculateStdDev(timeDiffs);

        // Calculate confidence (P(B|A))
        const tokenA = sequence[0];
        const sessionsWithA = Array.from(sessionPatterns.values()).filter(
          (patterns) =>
            patterns.some((p) => p.requestedTokens.includes(tokenA))
        ).length;
        const confidence = sessionsWithA > 0 ? count / sessionsWithA : 0;

        if (confidence >= this.config.minConfidence) {
          const pattern: SequentialPattern = {
            sequence,
            support,
            avgTimeBetween,
            stdDevTimeBetween,
            confidence,
            createdAt: new Date(),
            lastSeen: new Date(),
            occurrences: count,
          };

          discovered.push(pattern);
          this.sequentialPatterns.set(sequenceKey, pattern);

          this.emit(PatternMiningEvent.PATTERN_DISCOVERED, {
            pattern,
            type: 'sequential',
            impact: this.calculateImpact(support, confidence),
            timestamp: new Date(),
          } as PatternDiscoveryEvent);
        }
      }
    });

    logger.debug('Found sequential patterns', { count: discovered.length });

    return discovered;
  }

  /**
   * Mine temporal patterns (time-based)
   */
  private async mineTemporalPatterns(
    accessLog: AccessPattern[]
  ): Promise<TemporalPattern[]> {
    const discovered: TemporalPattern[] = [];
    const hourlyPatterns = new Map<
      string,
      { tokens: Set<string>; count: number; volumes: number[] }
    >();

    // Group by hour of day
    accessLog.forEach((pattern) => {
      const key = `${pattern.timeOfDay}`;
      if (!hourlyPatterns.has(key)) {
        hourlyPatterns.set(key, { tokens: new Set(), count: 0, volumes: [] });
      }

      const hourData = hourlyPatterns.get(key)!;
      pattern.requestedTokens.forEach((token) => hourData.tokens.add(token));
      hourData.count++;
      hourData.volumes.push(pattern.requestedTokens.length);
    });

    const totalRequests = accessLog.length;

    // Find frequent tokens at specific times
    hourlyPatterns.forEach(({ tokens, count, volumes }, hourKey) => {
      const hour = parseInt(hourKey);
      const support = count / totalRequests;

      if (support >= this.config.minSupport && volumes.length > 0) {
        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        const volatilityScore = avgVolume > 0 
          ? this.calculateStdDev(volumes) / avgVolume 
          : 0;

        const pattern: TemporalPattern = {
          tokens: Array.from(tokens),
          timeOfDay: hour,
          support,
          avgVolume,
          volatilityScore,
          createdAt: new Date(),
        };

        discovered.push(pattern);
        const patternKey = `hour-${hour}`;
        this.temporalPatterns.set(patternKey, pattern);

        this.emit(PatternMiningEvent.PATTERN_DISCOVERED, {
          pattern,
          type: 'temporal',
          impact: this.calculateImpact(support, 1),
          timestamp: new Date(),
        } as PatternDiscoveryEvent);
      }
    });

    logger.debug('Found temporal patterns', { count: discovered.length });

    return discovered;
  }

  /**
   * Calculate confidence for association rule
   */
  private calculateConfidence(
    tokens: string[],
    sessions: Map<string, string[][]>
  ): number {
    if (tokens.length < 2) return 1;

    const antecedent = tokens.slice(0, -1);
    const consequent = tokens[tokens.length - 1];

    let antecedentCount = 0;
    let ruleCount = 0;

    sessions.forEach((tokenSets) => {
      const flatTokens = tokenSets.flat();
      const hasAntecedent = antecedent.every((t) => flatTokens.includes(t));

      if (hasAntecedent) {
        antecedentCount++;
        if (flatTokens.includes(consequent)) {
          ruleCount++;
        }
      }
    });

    return antecedentCount > 0 ? ruleCount / antecedentCount : 0;
  }

  /**
   * Calculate lift for association rule
   */
  private calculateLift(
    tokens: string[],
    sessions: Map<string, string[][]>
  ): number {
    if (tokens.length < 2) return 1;

    const antecedent = tokens.slice(0, -1);
    const consequent = tokens[tokens.length - 1];

    let antecedentCount = 0;
    let consequentCount = 0;
    let ruleCount = 0;

    sessions.forEach((tokenSets) => {
      const flatTokens = tokenSets.flat();
      const hasAntecedent = antecedent.every((t) => flatTokens.includes(t));
      const hasConsequent = flatTokens.includes(consequent);

      if (hasAntecedent) antecedentCount++;
      if (hasConsequent) consequentCount++;
      if (hasAntecedent && hasConsequent) ruleCount++;
    });

    const totalSessions = sessions.size;
    const confidence =
      antecedentCount > 0 ? ruleCount / antecedentCount : 0;
    const supportConsequent = consequentCount / totalSessions;

    return supportConsequent > 0 ? confidence / supportConsequent : 0;
  }

  /**
   * Calculate conviction for association rule
   */
  private calculateConviction(
    tokens: string[],
    sessions: Map<string, string[][]>
  ): number {
    if (tokens.length < 2) return 1;

    const confidence = this.calculateConfidence(tokens, sessions);
    const consequent = tokens[tokens.length - 1];

    let consequentCount = 0;
    sessions.forEach((tokenSets) => {
      const flatTokens = tokenSets.flat();
      if (flatTokens.includes(consequent)) consequentCount++;
    });

    const supportConsequent = consequentCount / sessions.size;

    return confidence < 1
      ? (1 - supportConsequent) / (1 - confidence)
      : Infinity;
  }

  /**
   * Group access log by session
   */
  private groupBySession(accessLog: AccessPattern[]): Map<string, string[][]> {
    const sessions = new Map<string, string[][]>();

    accessLog.forEach((access) => {
      if (!sessions.has(access.sessionId)) {
        sessions.set(access.sessionId, []);
      }
      sessions.get(access.sessionId)!.push(access.requestedTokens);
    });

    return sessions;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const variance =
      squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate impact level
   */
  private calculateImpact(
    support: number,
    confidence: number
  ): 'low' | 'medium' | 'high' {
    const score = support * confidence;
    if (score > 0.5) return 'high';
    if (score > 0.2) return 'medium';
    return 'low';
  }

  /**
   * Clean up old patterns
   */
  private cleanupOldPatterns(): void {
    const now = Date.now();
    let cleanedCount = 0;

    this.frequentPatterns.forEach((pattern, key) => {
      if (now - pattern.lastSeen.getTime() > this.config.retentionPeriod) {
        this.frequentPatterns.delete(key);
        cleanedCount++;
        this.emit(PatternMiningEvent.PATTERN_EXPIRED, { key, pattern });
      }
    });

    this.sequentialPatterns.forEach((pattern, key) => {
      if (now - pattern.lastSeen.getTime() > this.config.retentionPeriod) {
        this.sequentialPatterns.delete(key);
        cleanedCount++;
        this.emit(PatternMiningEvent.PATTERN_EXPIRED, { key, pattern });
      }
    });

    if (cleanedCount > 0) {
      logger.debug('Cleaned up old patterns', { cleanedCount });
    }
  }

  /**
   * Get all frequent patterns
   */
  getFrequentPatterns(): FrequentPattern[] {
    return Array.from(this.frequentPatterns.values());
  }

  /**
   * Get all sequential patterns
   */
  getSequentialPatterns(): SequentialPattern[] {
    return Array.from(this.sequentialPatterns.values());
  }

  /**
   * Get all temporal patterns
   */
  getTemporalPatterns(): TemporalPattern[] {
    return Array.from(this.temporalPatterns.values());
  }

  /**
   * Get mining statistics
   */
  getStatistics(): PatternMiningStats {
    return { ...this.stats };
  }

  /**
   * Destroy service
   */
  async destroy(): Promise<void> {
    this.stopAutoMining();
    this.frequentPatterns.clear();
    this.sequentialPatterns.clear();
    this.temporalPatterns.clear();
    this.removeAllListeners();
    logger.info('Pattern Miner Service destroyed');
  }
}

