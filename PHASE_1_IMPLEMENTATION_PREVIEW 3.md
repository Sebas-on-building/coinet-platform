# 🚀 PHASE 1: PREDICTIVE AI ENGINE - Implementation Preview

> **Objective**: Transform from reactive data fetching to proactive intelligence that predicts and prefetches data before users request it, achieving 10x API efficiency while staying on free tiers.

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Core Components](#core-components)
3. [Implementation Roadmap](#implementation-roadmap)
4. [Code Examples](#code-examples)
5. [Expected Outcomes](#expected-outcomes)

---

## 🎯 OVERVIEW

### What We're Building

```
┌─────────────────────────────────────────────────────────────────┐
│                   PREDICTIVE AI ENGINE                          │
│                                                                 │
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │  Pattern Mining │────▶│ User Behavior   │                   │
│  │  Engine         │     │ Analyzer        │                   │
│  └─────────────────┘     └─────────────────┘                   │
│          │                        │                             │
│          ▼                        ▼                             │
│  ┌─────────────────────────────────────────┐                   │
│  │    INTELLIGENT CACHE ORCHESTRATOR       │                   │
│  │  • Predicts next requests (30s ahead)   │                   │
│  │  • Learns user patterns                 │                   │
│  │  • Temporal prefetching (market hours)  │                   │
│  │  • Collaborative filtering              │                   │
│  └─────────────────────────────────────────┘                   │
│          │                                                      │
│          ▼                                                      │
│  ┌─────────────────────────────────────────┐                   │
│  │    ANOMALY DETECTION LAYER              │                   │
│  │  • Flash crash detection                │                   │
│  │  • Unusual volume spikes                │                   │
│  │  • Price manipulation alerts            │                   │
│  └─────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Metrics Targets

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Cache Hit Ratio | 75% | 95% | +20% |
| API Efficiency | 4.0x | 10.0x | +6.0x |
| Concurrent Users | 50 | 500 | 10x |
| Prediction Accuracy | N/A | 85% | NEW |
| Alert Speed | N/A | 5-60s before humans | NEW |

---

## 🧩 CORE COMPONENTS

### 1. Pattern Mining Engine

**Purpose**: Learn from historical requests to predict future needs

**Algorithm**: Apriori + Sequential Pattern Mining

**Data Collected**:
```typescript
interface AccessPattern {
  userId: string;
  requestedTokens: string[];
  timestamp: Date;
  sessionId: string;
  sequence: number;
  timeOfDay: number; // Hour (0-23)
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  marketCondition: 'bull' | 'bear' | 'neutral';
}
```

**Patterns Detected**:
- **Token Sequences**: "If user checks BTC → 80% check ETH next"
- **Time Patterns**: "9am Eastern → BTC volume spike → prefetch BTC"
- **Portfolio Patterns**: "DeFi traders check: ETH → UNI → AAVE → COMP"
- **Event Patterns**: "News about BTC → check BTC, ETH, altcoins"

---

### 2. Intelligent Cache Orchestrator

**Purpose**: Decide WHAT to cache, WHEN, and for HOW LONG

**Decision Matrix**:
```
┌─────────────────────────────────────────────────────────────┐
│  TOKEN    │  POPULARITY │  VOLATILITY │  TTL    │  PRIORITY │
├─────────────────────────────────────────────────────────────┤
│  BTC      │    HIGH     │    MEDIUM   │  10s    │    P0     │
│  ETH      │    HIGH     │    MEDIUM   │  10s    │    P0     │
│  SOL      │    MEDIUM   │    HIGH     │  5s     │    P1     │
│  PEPE     │    LOW      │    EXTREME  │  3s     │    P2     │
│  OBSCURE  │    NONE     │    LOW      │  5min   │    P3     │
└─────────────────────────────────────────────────────────────┘

Decision Logic:
  IF popularity = HIGH AND time = 9am-4pm EST
    → Prefetch every 10s
  IF volatility = EXTREME
    → Reduce TTL to 3s
  IF request_rate < 1/hour
    → Remove from cache
```

---

### 3. Temporal Prefetching System

**Purpose**: Predict market events and prefetch data proactively

**Time-Based Rules**:
```typescript
const MARKET_EVENTS = {
  'weekday_open': {
    time: '09:00:00 EST',
    action: 'prefetch_top_100',
    reason: 'Market open trading spike'
  },
  'futures_settlement': {
    time: '16:00:00 UTC',
    day: 'Friday',
    action: 'prefetch_btc_eth_derivatives',
    reason: 'Options expiry volatility'
  },
  'asia_open': {
    time: '00:00:00 UTC',
    action: 'prefetch_asian_pairs',
    reason: 'Asian market activity'
  }
};
```

---

### 4. Anomaly Detection Layer

**Purpose**: Detect unusual market behavior and alert users 5-60s before they notice

**Detection Methods**:

#### A. Statistical Anomaly Detection (Z-Score)
```typescript
// Detect flash crashes
function detectFlashCrash(prices: number[]): boolean {
  const mean = avg(prices);
  const stdDev = std(prices);
  const latest = prices[prices.length - 1];
  const zScore = (latest - mean) / stdDev;
  
  return zScore < -3; // 3 standard deviations below mean
}
```

#### B. Volume Anomaly Detection
```typescript
// Detect unusual trading volume
function detectVolumeSpike(volumes: number[]): boolean {
  const avgVolume = avg(volumes.slice(-24)); // 24h average
  const currentVolume = volumes[volumes.length - 1];
  
  return currentVolume > avgVolume * 5; // 5x normal volume
}
```

#### C. Price Manipulation Detection
```typescript
// Detect wash trading or pump-and-dump
function detectManipulation(trades: Trade[]): boolean {
  const buyVolume = sum(trades.filter(t => t.side === 'buy').map(t => t.volume));
  const sellVolume = sum(trades.filter(t => t.side === 'sell').map(t => t.volume));
  const volumeRatio = buyVolume / sellVolume;
  
  // Suspicious if buy/sell ratio is extreme
  return volumeRatio > 10 || volumeRatio < 0.1;
}
```

---

## 🗺️ IMPLEMENTATION ROADMAP

### Week 1: Pattern Mining Foundation

**Day 1-2: Data Collection Infrastructure**
- Create `PatternCollector` service
- Log all user requests to TimescaleDB
- Track: tokens, sequences, timestamps, user patterns

**Day 3-4: Pattern Mining Algorithm**
- Implement Apriori algorithm for frequent itemsets
- Build sequential pattern miner (GSP algorithm)
- Store patterns in Redis for fast lookup

**Day 5: Pattern Application**
- Build `PatternMatcher` to predict next requests
- Integrate with cache prefetching

**Files to Create**:
```
services/market-prices/src/intelligence/
├── pattern-collector.service.ts
├── pattern-miner.service.ts
├── pattern-matcher.service.ts
└── types/pattern.types.ts
```

---

### Week 2: Intelligent Cache Orchestrator

**Day 1-2: Cache Scoring System**
- Implement popularity scoring (request frequency)
- Add volatility scoring (price change rate)
- Build dynamic TTL calculator

**Day 3-4: Prefetching Engine**
- Create `PrefetchScheduler` service
- Build priority queue for prefetch jobs
- Implement batch prefetching (group requests)

**Day 5: Optimization**
- Add rate limit-aware scheduling
- Implement adaptive prefetching (learn from misses)

**Files to Create**:
```
services/market-prices/src/intelligence/
├── cache-orchestrator.service.ts
├── prefetch-scheduler.service.ts
├── popularity-tracker.service.ts
└── volatility-calculator.service.ts
```

---

### Week 3: Anomaly Detection & Integration

**Day 1-2: Anomaly Detectors**
- Build statistical anomaly detector (Z-score, IQR)
- Add volume anomaly detector
- Create price manipulation detector

**Day 3-4: Alert System**
- Build real-time alert broadcaster (WebSocket)
- Create alert priority system (P0-P3)
- Add user alert preferences

**Day 5: Testing & Deployment**
- Load testing with 1000 concurrent users
- Fine-tune thresholds
- Deploy to production

**Files to Create**:
```
services/market-prices/src/intelligence/
├── anomaly-detector.service.ts
├── alert-broadcaster.service.ts
└── types/alert.types.ts
```

---

## 💻 CODE EXAMPLES

### Example 1: Pattern Mining Service

```typescript
/**
 * Pattern Mining Service
 * Learns from user behavior to predict future requests
 */
import { EventEmitter } from 'eventemitter3';
import { logger } from '../utils/logger';

interface FrequentPattern {
  tokens: string[];
  support: number; // % of sessions containing this pattern
  confidence: number; // P(Y|X) for sequence X→Y
}

interface SequentialPattern {
  sequence: string[];
  support: number;
  avgTimeBetween: number; // Average time between requests (ms)
}

export class PatternMiningService extends EventEmitter {
  private patterns: Map<string, FrequentPattern> = new Map();
  private sequences: Map<string, SequentialPattern> = new Map();
  private accessLog: AccessPattern[] = [];
  private minSupport: number = 0.05; // 5% minimum frequency
  private minConfidence: number = 0.6; // 60% minimum confidence

  /**
   * Record user access for pattern mining
   */
  recordAccess(userId: string, tokens: string[], sessionId: string): void {
    const pattern: AccessPattern = {
      userId,
      requestedTokens: tokens,
      timestamp: new Date(),
      sessionId,
      sequence: this.getSessionSequenceNumber(sessionId),
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      marketCondition: this.getMarketCondition(),
    };

    this.accessLog.push(pattern);

    // Mine patterns every 1000 accesses
    if (this.accessLog.length % 1000 === 0) {
      this.minePatterns();
    }
  }

  /**
   * Mine frequent patterns using Apriori algorithm
   */
  private minePatterns(): void {
    logger.info('Mining patterns from access log', {
      logSize: this.accessLog.length,
    });

    // Group by session
    const sessions = this.groupBySession();

    // Find frequent 2-itemsets (token pairs)
    const pairs = this.findFrequentPairs(sessions);

    // Find frequent 3-itemsets (token triplets)
    const triplets = this.findFrequentTriplets(sessions, pairs);

    // Store patterns
    pairs.forEach((pattern) => {
      const key = pattern.tokens.join('→');
      this.patterns.set(key, pattern);
    });

    triplets.forEach((pattern) => {
      const key = pattern.tokens.join('→');
      this.patterns.set(key, pattern);
    });

    // Mine sequential patterns
    this.mineSequentialPatterns(sessions);

    logger.info('Pattern mining complete', {
      totalPatterns: this.patterns.size,
      totalSequences: this.sequences.size,
    });

    this.emit('patterns_updated', {
      patterns: Array.from(this.patterns.values()),
      sequences: Array.from(this.sequences.values()),
    });
  }

  /**
   * Predict next tokens user will request
   */
  predictNextTokens(currentTokens: string[], topK: number = 5): string[] {
    const predictions: Map<string, number> = new Map();

    // Check 1-token → next patterns
    for (const token of currentTokens) {
      this.patterns.forEach((pattern) => {
        if (pattern.tokens[0] === token && pattern.tokens.length === 2) {
          const nextToken = pattern.tokens[1];
          const score = pattern.confidence * pattern.support;
          predictions.set(
            nextToken,
            (predictions.get(nextToken) || 0) + score
          );
        }
      });
    }

    // Sort by prediction score
    const sorted = Array.from(predictions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([token]) => token);

    return sorted;
  }

  /**
   * Find frequent 2-itemsets (token pairs)
   */
  private findFrequentPairs(
    sessions: Map<string, string[][]>
  ): FrequentPattern[] {
    const pairCounts: Map<string, number> = new Map();
    const totalSessions = sessions.size;

    // Count occurrences of each pair
    sessions.forEach((tokenSets) => {
      const uniquePairs = new Set<string>();

      tokenSets.forEach((tokens) => {
        for (let i = 0; i < tokens.length; i++) {
          for (let j = i + 1; j < tokens.length; j++) {
            const pair = [tokens[i], tokens[j]].sort().join(',');
            uniquePairs.add(pair);
          }
        }
      });

      uniquePairs.forEach((pair) => {
        pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
      });
    });

    // Filter by minimum support
    const frequentPairs: FrequentPattern[] = [];
    pairCounts.forEach((count, pair) => {
      const support = count / totalSessions;
      if (support >= this.minSupport) {
        const tokens = pair.split(',');
        frequentPairs.push({
          tokens,
          support,
          confidence: this.calculateConfidence(tokens, sessions),
        });
      }
    });

    return frequentPairs;
  }

  /**
   * Find frequent 3-itemsets (token triplets)
   */
  private findFrequentTriplets(
    sessions: Map<string, string[][]>,
    frequentPairs: FrequentPattern[]
  ): FrequentPattern[] {
    const tripletCounts: Map<string, number> = new Map();
    const totalSessions = sessions.size;

    // Get unique tokens from frequent pairs
    const frequentTokens = new Set(
      frequentPairs.flatMap((p) => p.tokens)
    );

    sessions.forEach((tokenSets) => {
      const uniqueTriplets = new Set<string>();

      tokenSets.forEach((tokens) => {
        const filtered = tokens.filter((t) => frequentTokens.has(t));
        for (let i = 0; i < filtered.length; i++) {
          for (let j = i + 1; j < filtered.length; j++) {
            for (let k = j + 1; k < filtered.length; k++) {
              const triplet = [filtered[i], filtered[j], filtered[k]]
                .sort()
                .join(',');
              uniqueTriplets.add(triplet);
            }
          }
        }
      });

      uniqueTriplets.forEach((triplet) => {
        tripletCounts.set(triplet, (tripletCounts.get(triplet) || 0) + 1);
      });
    });

    const frequentTriplets: FrequentPattern[] = [];
    tripletCounts.forEach((count, triplet) => {
      const support = count / totalSessions;
      if (support >= this.minSupport) {
        const tokens = triplet.split(',');
        frequentTriplets.push({
          tokens,
          support,
          confidence: this.calculateConfidence(tokens, sessions),
        });
      }
    });

    return frequentTriplets;
  }

  /**
   * Mine sequential patterns (order matters)
   */
  private mineSequentialPatterns(sessions: Map<string, string[][]>): void {
    const sequenceCounts: Map<string, { count: number; timeDiffs: number[] }> = new Map();
    const totalSessions = sessions.size;

    sessions.forEach((tokenSets) => {
      // Find sequences within each session
      for (let i = 0; i < tokenSets.length - 1; i++) {
        const current = tokenSets[i];
        const next = tokenSets[i + 1];
        const timeDiff = this.accessLog[i + 1]?.timestamp.getTime() - this.accessLog[i]?.timestamp.getTime();

        current.forEach((token1) => {
          next.forEach((token2) => {
            const sequence = `${token1}→${token2}`;
            const existing = sequenceCounts.get(sequence) || { count: 0, timeDiffs: [] };
            existing.count++;
            if (timeDiff) existing.timeDiffs.push(timeDiff);
            sequenceCounts.set(sequence, existing);
          });
        });
      }
    });

    // Filter by minimum support
    sequenceCounts.forEach(({ count, timeDiffs }, sequence) => {
      const support = count / totalSessions;
      if (support >= this.minSupport) {
        const avgTimeBetween = timeDiffs.length > 0
          ? timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length
          : 0;

        this.sequences.set(sequence, {
          sequence: sequence.split('→'),
          support,
          avgTimeBetween,
        });
      }
    });
  }

  /**
   * Calculate confidence for association rule
   */
  private calculateConfidence(
    tokens: string[],
    sessions: Map<string, string[][]>
  ): number {
    let antecedentCount = 0;
    let ruleCount = 0;

    const antecedent = tokens.slice(0, -1);
    const consequent = tokens[tokens.length - 1];

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
   * Group access log by session
   */
  private groupBySession(): Map<string, string[][]> {
    const sessions = new Map<string, string[][]>();

    this.accessLog.forEach((access) => {
      if (!sessions.has(access.sessionId)) {
        sessions.set(access.sessionId, []);
      }
      sessions.get(access.sessionId)!.push(access.requestedTokens);
    });

    return sessions;
  }

  /**
   * Get session sequence number
   */
  private getSessionSequenceNumber(sessionId: string): number {
    const sessionAccesses = this.accessLog.filter(
      (a) => a.sessionId === sessionId
    );
    return sessionAccesses.length;
  }

  /**
   * Determine current market condition
   */
  private getMarketCondition(): 'bull' | 'bear' | 'neutral' {
    // Simplified - would integrate with market data
    return 'neutral';
  }

  /**
   * Get all learned patterns
   */
  getPatterns(): FrequentPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get all sequential patterns
   */
  getSequences(): SequentialPattern[] {
    return Array.from(this.sequences.values());
  }
}
```

---

### Example 2: Intelligent Cache Orchestrator

```typescript
/**
 * Intelligent Cache Orchestrator
 * Decides what to cache, when, and for how long based on ML predictions
 */
import { EventEmitter } from 'eventemitter3';
import { PatternMiningService } from './pattern-miner.service';
import { PopularityTracker } from './popularity-tracker.service';
import { VolatilityCalculator } from './volatility-calculator.service';
import { logger } from '../utils/logger';

interface CacheScore {
  token: string;
  popularity: number; // 0-1
  volatility: number; // 0-1
  predictedAccess: number; // 0-1
  overallScore: number; // 0-1
  ttl: number; // seconds
  priority: 'P0' | 'P1' | 'P2' | 'P3';
}

export class IntelligentCacheOrchestrator extends EventEmitter {
  private patternMiner: PatternMiningService;
  private popularityTracker: PopularityTracker;
  private volatilityCalc: VolatilityCalculator;
  private cacheScores: Map<string, CacheScore> = new Map();

  constructor(
    patternMiner: PatternMiningService,
    popularityTracker: PopularityTracker,
    volatilityCalc: VolatilityCalculator
  ) {
    super();
    this.patternMiner = patternMiner;
    this.popularityTracker = popularityTracker;
    this.volatilityCalc = volatilityCalc;

    // Recalculate scores every minute
    setInterval(() => this.recalculateScores(), 60 * 1000);
  }

  /**
   * Decide if token should be prefetched
   */
  shouldPrefetch(token: string, context?: PrefetchContext): boolean {
    const score = this.getCacheScore(token, context);
    return score.overallScore > 0.5;
  }

  /**
   * Get optimal TTL for token
   */
  getOptimalTTL(token: string, context?: PrefetchContext): number {
    const score = this.getCacheScore(token, context);
    return score.ttl;
  }

  /**
   * Get cache priority for token
   */
  getCachePriority(token: string, context?: PrefetchContext): string {
    const score = this.getCacheScore(token, context);
    return score.priority;
  }

  /**
   * Calculate comprehensive cache score
   */
  private getCacheScore(
    token: string,
    context?: PrefetchContext
  ): CacheScore {
    // Check if score is cached
    const cached = this.cacheScores.get(token);
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached;
    }

    // Calculate individual scores
    const popularity = this.popularityTracker.getPopularityScore(token);
    const volatility = this.volatilityCalc.getVolatilityScore(token);
    const predictedAccess = this.calculatePredictedAccessScore(
      token,
      context
    );

    // Weighted combination
    const overallScore =
      popularity * 0.4 + predictedAccess * 0.4 + (1 - volatility) * 0.2;

    // Determine TTL based on volatility
    let ttl: number;
    if (volatility > 0.8) {
      ttl = 3; // 3s for extreme volatility
    } else if (volatility > 0.5) {
      ttl = 5; // 5s for high volatility
    } else if (popularity > 0.7) {
      ttl = 10; // 10s for popular tokens
    } else {
      ttl = 30; // 30s default
    }

    // Determine priority
    let priority: 'P0' | 'P1' | 'P2' | 'P3';
    if (overallScore > 0.8) {
      priority = 'P0';
    } else if (overallScore > 0.6) {
      priority = 'P1';
    } else if (overallScore > 0.4) {
      priority = 'P2';
    } else {
      priority = 'P3';
    }

    const score: CacheScore = {
      token,
      popularity,
      volatility,
      predictedAccess,
      overallScore,
      ttl,
      priority,
    };

    this.cacheScores.set(token, score);
    return score;
  }

  /**
   * Calculate predicted access probability
   */
  private calculatePredictedAccessScore(
    token: string,
    context?: PrefetchContext
  ): number {
    let score = 0;

    // Check pattern-based predictions
    if (context?.recentTokens) {
      const predictions = this.patternMiner.predictNextTokens(
        context.recentTokens,
        10
      );
      const index = predictions.indexOf(token);
      if (index !== -1) {
        score += (10 - index) / 10; // Higher score for earlier predictions
      }
    }

    // Check time-based predictions
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 16) {
      // Market hours (EST)
      score += 0.2;
    }

    // Check day-based patterns
    const day = new Date().getDay();
    if (day >= 1 && day <= 5) {
      // Weekdays
      score += 0.1;
    }

    return Math.min(score, 1);
  }

  /**
   * Recalculate all scores
   */
  private recalculateScores(): void {
    this.cacheScores.clear();
    logger.debug('Cache scores recalculated');
  }

  /**
   * Get top tokens to prefetch
   */
  getTopPrefetchCandidates(limit: number = 100): string[] {
    const allTokens = this.popularityTracker.getAllTrackedTokens();
    const scored = allTokens.map((token) => ({
      token,
      score: this.getCacheScore(token).overallScore,
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.token);
  }
}

interface PrefetchContext {
  recentTokens?: string[];
  userId?: string;
  sessionId?: string;
}
```

---

### Example 3: Anomaly Detection Service

```typescript
/**
 * Anomaly Detection Service
 * Detects unusual market behavior and alerts users
 */
import { EventEmitter } from 'eventemitter3';
import { logger } from '../utils/logger';

interface AnomalyAlert {
  type: 'flash_crash' | 'volume_spike' | 'manipulation' | 'unusual_movement';
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  token: string;
  description: string;
  data: any;
  timestamp: Date;
}

export class AnomalyDetectorService extends EventEmitter {
  private priceHistory: Map<string, number[]> = new Map();
  private volumeHistory: Map<string, number[]> = new Map();
  private maxHistorySize: number = 1000;

  /**
   * Analyze price data for anomalies
   */
  analyzePriceData(token: string, price: number): AnomalyAlert[] {
    const alerts: AnomalyAlert[] = [];

    // Store price in history
    if (!this.priceHistory.has(token)) {
      this.priceHistory.set(token, []);
    }
    const history = this.priceHistory.get(token)!;
    history.push(price);
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    // Need at least 30 data points for statistical analysis
    if (history.length < 30) {
      return alerts;
    }

    // 1. Flash Crash Detection (Z-Score)
    const flashCrashAlert = this.detectFlashCrash(token, history);
    if (flashCrashAlert) alerts.push(flashCrashAlert);

    // 2. Unusual Movement Detection (IQR)
    const unusualMovementAlert = this.detectUnusualMovement(token, history);
    if (unusualMovementAlert) alerts.push(unusualMovementAlert);

    // Emit alerts
    alerts.forEach((alert) => {
      this.emit('anomaly_detected', alert);
      logger.warn('Anomaly detected', alert);
    });

    return alerts;
  }

  /**
   * Analyze volume data for anomalies
   */
  analyzeVolumeData(token: string, volume: number): AnomalyAlert[] {
    const alerts: AnomalyAlert[] = [];

    // Store volume in history
    if (!this.volumeHistory.has(token)) {
      this.volumeHistory.set(token, []);
    }
    const history = this.volumeHistory.get(token)!;
    history.push(volume);
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    if (history.length < 24) {
      return alerts;
    }

    // Volume Spike Detection
    const volumeSpikeAlert = this.detectVolumeSpike(token, history);
    if (volumeSpikeAlert) alerts.push(volumeSpikeAlert);

    alerts.forEach((alert) => {
      this.emit('anomaly_detected', alert);
      logger.warn('Anomaly detected', alert);
    });

    return alerts;
  }

  /**
   * Detect flash crash using Z-Score
   */
  private detectFlashCrash(
    token: string,
    prices: number[]
  ): AnomalyAlert | null {
    const mean = this.calculateMean(prices);
    const stdDev = this.calculateStdDev(prices, mean);
    const latest = prices[prices.length - 1];
    const zScore = (latest - mean) / stdDev;

    // Flash crash if price is 3+ standard deviations below mean
    if (zScore < -3) {
      const dropPercent = ((latest - mean) / mean) * 100;
      return {
        type: 'flash_crash',
        severity: 'P0',
        token,
        description: `Flash crash detected! ${token} dropped ${Math.abs(
          dropPercent
        ).toFixed(2)}% below mean`,
        data: {
          currentPrice: latest,
          meanPrice: mean,
          zScore,
          dropPercent,
        },
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * Detect unusual movement using IQR method
   */
  private detectUnusualMovement(
    token: string,
    prices: number[]
  ): AnomalyAlert | null {
    const sorted = [...prices].sort((a, b) => a - b);
    const q1 = this.calculatePercentile(sorted, 25);
    const q3 = this.calculatePercentile(sorted, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const latest = prices[prices.length - 1];

    if (latest < lowerBound || latest > upperBound) {
      const direction = latest < lowerBound ? 'dropped' : 'spiked';
      const percent =
        latest < lowerBound
          ? ((lowerBound - latest) / lowerBound) * 100
          : ((latest - upperBound) / upperBound) * 100;

      return {
        type: 'unusual_movement',
        severity: 'P1',
        token,
        description: `Unusual movement: ${token} ${direction} ${percent.toFixed(
          2
        )}% outside normal range`,
        data: {
          currentPrice: latest,
          lowerBound,
          upperBound,
          iqr,
        },
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * Detect volume spike
   */
  private detectVolumeSpike(
    token: string,
    volumes: number[]
  ): AnomalyAlert | null {
    const avgVolume = this.calculateMean(volumes.slice(-24)); // 24h average
    const currentVolume = volumes[volumes.length - 1];

    // Volume spike if current is 5x average
    if (currentVolume > avgVolume * 5) {
      const multiplier = (currentVolume / avgVolume).toFixed(1);
      return {
        type: 'volume_spike',
        severity: 'P1',
        token,
        description: `Volume spike detected! ${token} volume is ${multiplier}x normal`,
        data: {
          currentVolume,
          avgVolume,
          multiplier,
        },
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * Calculate mean
   */
  private calculateMean(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[], mean: number): number {
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const variance =
      squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(sorted: number[], percentile: number): number {
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
}
```

---

## 📊 EXPECTED OUTCOMES

### Performance Improvements

```
┌──────────────────────────────────────────────────────────┐
│  METRIC              │  BEFORE  │  AFTER   │  IMPROVEMENT │
├──────────────────────────────────────────────────────────┤
│  Cache Hit Ratio     │    75%   │   95%    │    +20%      │
│  API Calls Saved     │  2,250/h │  8,550/h │    +6,300/h  │
│  Response Time (p50) │   120ms  │   15ms   │    -105ms    │
│  Response Time (p99) │   850ms  │   80ms   │    -770ms    │
│  Concurrent Users    │    50    │   500    │    10x       │
│  Prediction Accuracy │    N/A   │   85%    │    NEW       │
│  Alert Latency       │    N/A   │   5-60s  │    NEW       │
└──────────────────────────────────────────────────────────┘
```

### Cost Savings

```
API Calls Before: 43,200/day (CoinGecko free tier limit)
API Calls After:   8,640/day (with 95% cache hit)
Savings:          34,560 calls/day = 80% reduction

Equivalent Paid Plan Value:
  CoinGecko Pro (500 calls/min): $129/month
  Your Cost: $0/month
  Savings: $129/month per service
```

### Competitive Advantage

```
┌────────────────────────────────────────────────────────────┐
│  FEATURE                 │  YOU   │  COMPETITORS            │
├────────────────────────────────────────────────────────────┤
│  Predictive Prefetching  │   ✅   │  ❌ (none have this)   │
│  Anomaly Alerts          │   ✅   │  💵 ($399/mo Nansen)   │
│  Pattern Learning        │   ✅   │  ❌ (none have this)   │
│  95% Cache Hit Ratio     │   ✅   │  ⚠️ (60% typical)      │
│  Multi-Provider Failover │   ✅   │  ❌ (most single src)  │
│  Cost                    │  $24   │  $500+ per month       │
└────────────────────────────────────────────────────────────┘
```

---

## 🎯 SUCCESS CRITERIA

### Phase 1 Complete When:

1. ✅ Cache hit ratio reaches **95%+**
2. ✅ Prediction accuracy reaches **85%+**
3. ✅ System supports **500+ concurrent users**
4. ✅ Anomaly detection triggers **5-60s before human notice**
5. ✅ API cost remains **$0/month** (free tiers only)
6. ✅ Response time p99 < **100ms**
7. ✅ All services deployed and tested under load

---

**Status**: 📋 Ready to Begin Implementation
**Timeline**: 3 weeks
**Resources Needed**: Developer time (no additional costs)
**Risk**: LOW (all changes are additive, no breaking changes)

---

🚀 **Let's build the superhuman AI!** 🚀

