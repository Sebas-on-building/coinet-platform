/**
 * =========================================
 * SHANNON ENTROPY CALCULATOR
 * =========================================
 * Information-theoretic predictability analysis
 * Measures randomness/predictability of request patterns
 */

import { logger } from '../../utils/logger';

/**
 * Entropy calculation result
 */
export interface EntropyResult {
  entropy: number; // Shannon entropy (bits)
  normalizedEntropy: number; // 0-1 scale
  predictability: number; // 1 - normalizedEntropy
  complexity: number; // Kolmogorov complexity estimate
  redundancy: number; // 1 - normalizedEntropy
}

/**
 * Request pattern for entropy analysis
 */
export interface RequestPattern {
  tokens: string[];
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

/**
 * Shannon Entropy Calculator
 * Analyzes randomness/predictability of request patterns
 */
export class ShannonEntropyCalculator {
  /**
   * Calculate Shannon entropy of token distribution
   */
  calculateTokenEntropy(patterns: RequestPattern[]): EntropyResult {
    if (patterns.length === 0) {
      return {
        entropy: 0,
        normalizedEntropy: 0,
        predictability: 1,
        complexity: 0,
        redundancy: 1,
      };
    }

    // Count token frequencies
    const tokenCounts = new Map<string, number>();
    let totalTokens = 0;

    patterns.forEach((pattern) => {
      pattern.tokens.forEach((token) => {
        tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
        totalTokens++;
      });
    });

    // Calculate probabilities
    const probabilities = Array.from(tokenCounts.values()).map(
      (count) => count / totalTokens
    );

    // Calculate Shannon entropy
    const entropy = this.calculateEntropy(probabilities);

    // Maximum possible entropy (all tokens equally likely)
    const maxEntropy = Math.log2(tokenCounts.size);

    // Normalized entropy (0-1)
    const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

    // Predictability (inverse of normalized entropy)
    const predictability = 1 - normalizedEntropy;

    // Estimate Kolmogorov complexity (based on unique tokens)
    const complexity = Math.log2(tokenCounts.size + 1);

    // Redundancy (how much information is repeated)
    const redundancy = 1 - normalizedEntropy;

    return {
      entropy,
      normalizedEntropy,
      predictability,
      complexity,
      redundancy,
    };
  }

  /**
   * Calculate temporal entropy (time-based randomness)
   */
  calculateTemporalEntropy(patterns: RequestPattern[]): EntropyResult {
    if (patterns.length < 2) {
      return {
        entropy: 0,
        normalizedEntropy: 0,
        predictability: 1,
        complexity: 0,
        redundancy: 1,
      };
    }

    // Calculate time gaps between requests
    const sorted = [...patterns].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const timeGaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime();
      timeGaps.push(gap);
    }

    // Bucket time gaps (0-1min, 1-5min, 5-15min, 15-60min, 60+min)
    const buckets = [60000, 300000, 900000, 3600000, Infinity];
    const bucketCounts = new Array(buckets.length).fill(0);

    timeGaps.forEach((gap) => {
      for (let i = 0; i < buckets.length; i++) {
        if (gap < buckets[i]) {
          bucketCounts[i]++;
          break;
        }
      }
    });

    // Calculate probabilities
    const probabilities = bucketCounts.map((count) => count / timeGaps.length);

    // Calculate entropy
    const entropy = this.calculateEntropy(probabilities);
    const maxEntropy = Math.log2(buckets.length);
    const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

    return {
      entropy,
      normalizedEntropy,
      predictability: 1 - normalizedEntropy,
      complexity: Math.log2(bucketCounts.filter((c) => c > 0).length + 1),
      redundancy: 1 - normalizedEntropy,
    };
  }

  /**
   * Calculate sequence entropy (pattern randomness)
   */
  calculateSequenceEntropy(patterns: RequestPattern[]): EntropyResult {
    if (patterns.length < 2) {
      return {
        entropy: 0,
        normalizedEntropy: 0,
        predictability: 1,
        complexity: 0,
        redundancy: 1,
      };
    }

    // Build bigram sequences (consecutive token pairs)
    const bigramCounts = new Map<string, number>();
    let totalBigrams = 0;

    for (let i = 0; i < patterns.length - 1; i++) {
      const current = patterns[i].tokens;
      const next = patterns[i + 1].tokens;

      current.forEach((token1) => {
        next.forEach((token2) => {
          const bigram = `${token1}→${token2}`;
          bigramCounts.set(bigram, (bigramCounts.get(bigram) || 0) + 1);
          totalBigrams++;
        });
      });
    }

    // Calculate probabilities
    const probabilities = Array.from(bigramCounts.values()).map(
      (count) => count / totalBigrams
    );

    // Calculate entropy
    const entropy = this.calculateEntropy(probabilities);
    const maxEntropy = Math.log2(bigramCounts.size);
    const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

    return {
      entropy,
      normalizedEntropy,
      predictability: 1 - normalizedEntropy,
      complexity: Math.log2(bigramCounts.size + 1),
      redundancy: 1 - normalizedEntropy,
    };
  }

  /**
   * Calculate Shannon entropy from probabilities
   */
  private calculateEntropy(probabilities: number[]): number {
    const filtered = probabilities.filter((p) => p > 0);
    if (filtered.length === 0) return 0;

    return -filtered.reduce((sum, p) => sum + p * Math.log2(p), 0);
  }

  /**
   * Calculate combined entropy score
   */
  calculateCombinedEntropy(patterns: RequestPattern[]): EntropyResult {
    const tokenEntropy = this.calculateTokenEntropy(patterns);
    const temporalEntropy = this.calculateTemporalEntropy(patterns);
    const sequenceEntropy = this.calculateSequenceEntropy(patterns);

    // Weighted combination
    const entropy =
      tokenEntropy.entropy * 0.4 +
      temporalEntropy.entropy * 0.3 +
      sequenceEntropy.entropy * 0.3;

    const normalizedEntropy =
      tokenEntropy.normalizedEntropy * 0.4 +
      temporalEntropy.normalizedEntropy * 0.3 +
      sequenceEntropy.normalizedEntropy * 0.3;

    return {
      entropy,
      normalizedEntropy,
      predictability: 1 - normalizedEntropy,
      complexity:
        tokenEntropy.complexity * 0.4 +
        temporalEntropy.complexity * 0.3 +
        sequenceEntropy.complexity * 0.3,
      redundancy: 1 - normalizedEntropy,
    };
  }

  /**
   * Recommend rate limit parameters based on entropy
   */
  recommendRateLimitParams(
    baseLimit: number,
    entropy: EntropyResult
  ): {
    reservoir: number;
    reservoirRefreshAmount: number;
    reservoirRefreshInterval: number;
    batchSize: number;
    prefetchSize: number;
  } {
    // Low entropy (predictable) = aggressive batching + prefetching
    // High entropy (random) = conservative batching

    const predictability = entropy.predictability;

    // Reservoir scales with predictability
    const reservoir = Math.floor(baseLimit * (0.5 + predictability * 0.5));

    // Refresh amount scales inversely with predictability
    const reservoirRefreshAmount = Math.ceil(
      baseLimit * (0.5 + (1 - predictability) * 0.5)
    );

    // Refresh interval slows for unpredictable patterns
    const reservoirRefreshInterval = Math.floor(
      60000 * (1 + entropy.normalizedEntropy)
    );

    // Batch size based on predictability
    const batchSize = Math.floor(1 + predictability * 19); // 1-20

    // Prefetch size based on redundancy
    const prefetchSize = Math.floor(entropy.redundancy * 50); // 0-50

    return {
      reservoir,
      reservoirRefreshAmount,
      reservoirRefreshInterval,
      batchSize,
      prefetchSize,
    };
  }
}

