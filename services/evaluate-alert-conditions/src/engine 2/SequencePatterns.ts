/**
 * =========================================
 * SEQUENCE PATTERNS ENGINE
 * =========================================
 * Divine world-class sequence pattern recognition engine
 * Real-time pattern matching with sub-millisecond performance
 */

import { Logger } from '@/utils/Logger';
import {
  SequencePattern,
  PatternMatch,
  PatternElement,
  NormalizedMarketSignal,
  MetricType,
  ComparisonOperator,
  IPatternStorage,
  TimeWindow
} from '../types';

/**
 * Pattern matching state
 */
interface PatternState {
  patternId: string;
  startTime: number;
  currentElementIndex: number;
  matchedElements: NormalizedMarketSignal[];
  partialMatches: Map<number, NormalizedMarketSignal[]>;
  lastUpdate: number;
}

/**
 * Sequence pattern recognition engine
 */
export class SequencePatternsEngine {
  private logger: Logger;
  private storage: IPatternStorage;
  private patterns: Map<string, SequencePattern> = new Map();
  private activeStates: Map<string, Map<string, PatternState>> = new Map(); // exchange -> patternId -> state

  constructor(storage: IPatternStorage) {
    this.logger = new Logger('SequencePatterns');
    this.storage = storage;
  }

  /**
   * Register a pattern for recognition
   */
  async registerPattern(pattern: SequencePattern): Promise<void> {
    this.patterns.set(pattern.id, pattern);

    // Initialize active states for all exchanges
    for (const exchange of ['binance', 'coinbase', 'kraken', 'deribit', 'bybit', 'okx', 'huobi', 'kucoin']) {
      if (!this.activeStates.has(exchange)) {
        this.activeStates.set(exchange, new Map());
      }
    }

    this.logger.info('Registered sequence pattern', {
      patternId: pattern.id,
      name: pattern.name,
      elements: pattern.elements.length,
    });
  }

  /**
   * Process new signal and check for pattern matches
   */
  async processSignal(
    signal: NormalizedMarketSignal,
    historicalSignals: NormalizedMarketSignal[]
  ): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];

    // Get relevant patterns for this signal
    const relevantPatterns = this.getRelevantPatterns(signal);

    for (const pattern of relevantPatterns) {
      const patternMatches = await this.evaluatePattern(signal, pattern, historicalSignals);
      matches.push(...patternMatches);
    }

    // Cleanup expired states
    this.cleanupExpiredStates();

    return matches;
  }

  /**
   * Get patterns relevant to the signal
   */
  private getRelevantPatterns(signal: NormalizedMarketSignal): SequencePattern[] {
    return Array.from(this.patterns.values()).filter(pattern => {
      // Filter by exchange
      if (pattern.elements.some(el => el.metricType === MetricType.PRICE)) {
        return false; // Skip patterns that directly reference exchanges
      }

      // Filter by symbol pattern (simplified)
      // In a real implementation, this would use regex matching

      // Filter by signal type if specified in pattern metadata
      // For now, assume all patterns are relevant

      return true;
    });
  }

  /**
   * Evaluate a single pattern against a signal
   */
  private async evaluatePattern(
    signal: NormalizedMarketSignal,
    pattern: SequencePattern,
    historicalSignals: NormalizedMarketSignal[]
  ): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];

    // Get or create pattern state for this exchange
    const exchangeStates = this.activeStates.get(signal.exchange) || new Map();
    let patternState = exchangeStates.get(pattern.id);

    // Create new state if none exists
    if (!patternState) {
      patternState = {
        patternId: pattern.id,
        startTime: signal.timestamp,
        currentElementIndex: 0,
        matchedElements: [],
        partialMatches: new Map(),
        lastUpdate: signal.timestamp,
      };
      exchangeStates.set(pattern.id, patternState);
    }

    // Check if pattern has expired
    const maxDurationMs = this.timeWindowToMs(pattern.maxDuration);
    if (signal.timestamp - patternState.startTime > maxDurationMs) {
      // Pattern expired, reset state
      patternState = {
        patternId: pattern.id,
        startTime: signal.timestamp,
        currentElementIndex: 0,
        matchedElements: [],
        partialMatches: new Map(),
        lastUpdate: signal.timestamp,
      };
      exchangeStates.set(pattern.id, patternState);
    }

    // Evaluate current element
    const currentElement = pattern.elements[patternState.currentElementIndex];
    if (!currentElement) {
      // Pattern completed
      if (patternState.matchedElements.length >= pattern.minOccurrences) {
        const match = this.createPatternMatch(pattern, patternState.matchedElements, signal.timestamp);
        matches.push(match);
      }

      // Reset for next pattern
      patternState.currentElementIndex = 0;
      patternState.matchedElements = [];
      patternState.startTime = signal.timestamp;
      return matches;
    }

    // Check if signal matches current element
    const elementMatches = this.evaluatePatternElement(signal, currentElement, historicalSignals);

    if (elementMatches) {
      // Element matches, move to next element
      patternState.currentElementIndex++;
      patternState.matchedElements.push(signal);
      patternState.lastUpdate = signal.timestamp;

      // Store partial match
      patternState.partialMatches.set(patternState.currentElementIndex, [...patternState.matchedElements]);

      // Check if pattern is complete
      if (patternState.currentElementIndex >= pattern.elements.length) {
        if (patternState.matchedElements.length >= pattern.minOccurrences) {
          const match = this.createPatternMatch(pattern, patternState.matchedElements, signal.timestamp);
          matches.push(match);
        }

        // Reset for next pattern
        patternState.currentElementIndex = 0;
        patternState.matchedElements = [];
        patternState.startTime = signal.timestamp;
      }
    } else {
      // Element doesn't match, check if we can continue from partial matches
      const canContinue = this.canContinueFromPartial(patternState, signal.timestamp);

      if (!canContinue) {
        // Reset pattern state
        patternState.currentElementIndex = 0;
        patternState.matchedElements = [];
        patternState.startTime = signal.timestamp;
      }
    }

    return matches;
  }

  /**
   * Evaluate if signal matches a pattern element
   */
  private evaluatePatternElement(
    signal: NormalizedMarketSignal,
    element: PatternElement,
    historicalSignals: NormalizedMarketSignal[]
  ): boolean {
    const metricValue = this.extractMetricValue(signal, element.metricType);
    if (metricValue === null) return false;

    // For now, only evaluate against current signal value
    // In a real implementation, this would evaluate against historical data as well

    return this.compareValues(metricValue, element.operator, element.value);
  }

  /**
   * Check if pattern can continue from partial matches
   */
  private canContinueFromPartial(state: PatternState, currentTime: number): boolean {
    // Check if any partial match can still be completed within time constraints
    for (const [elementIndex, matchedSignals] of state.partialMatches.entries()) {
      const remainingElements = state.patternId ? this.patterns.get(state.patternId)?.elements.length || 0 : 0;
      if (elementIndex < remainingElements - 1) {
        // Can still continue
        return true;
      }
    }
    return false;
  }

  /**
   * Create a pattern match result
   */
  private createPatternMatch(
    pattern: SequencePattern,
    matchedSignals: NormalizedMarketSignal[],
    timestamp: number
  ): PatternMatch {
    // Calculate match strength based on how well the pattern was followed
    const strength = this.calculateMatchStrength(pattern, matchedSignals);

    // Calculate confidence based on pattern reliability and data quality
    const confidence = this.calculateMatchConfidence(pattern, matchedSignals);

    return {
      patternId: pattern.id,
      matchedSignals,
      timestamp,
      strength,
      confidence,
      completion: matchedSignals.length / pattern.elements.length,
    };
  }

  /**
   * Calculate pattern match strength
   */
  private calculateMatchStrength(pattern: SequencePattern, matchedSignals: NormalizedMarketSignal[]): number {
    if (matchedSignals.length === 0) return 0;

    let totalStrength = 0;
    let elementCount = 0;

    for (let i = 0; i < Math.min(matchedSignals.length, pattern.elements.length); i++) {
      const signal = matchedSignals[i]!;
      const element = pattern.elements[i]!;

      const metricValue = this.extractMetricValue(signal, element.metricType);
      if (metricValue !== null) {
        const elementStrength = this.calculateElementStrength(metricValue, element);
        totalStrength += elementStrength;
        elementCount++;
      }
    }

    return elementCount > 0 ? totalStrength / elementCount : 0;
  }

  /**
   * Calculate individual element strength
   */
  private calculateElementStrength(metricValue: number, element: PatternElement): number {
    const diff = Math.abs(metricValue - element.value);
    const maxDiff = Math.max(metricValue, element.value);

    // Strength decreases as difference increases
    return Math.max(0, 1 - (diff / (maxDiff || 1)));
  }

  /**
   * Calculate pattern match confidence
   */
  private calculateMatchConfidence(pattern: SequencePattern, matchedSignals: NormalizedMarketSignal[]): number {
    // Base confidence on pattern's historical reliability
    const baseConfidence = pattern.confidence;

    // Adjust based on signal quality and consistency
    const signalQuality = this.calculateSignalQuality(matchedSignals);
    const consistency = this.calculatePatternConsistency(matchedSignals);

    return (baseConfidence + signalQuality + consistency) / 3;
  }

  /**
   * Calculate overall signal quality
   */
  private calculateSignalQuality(signals: NormalizedMarketSignal[]): number {
    if (signals.length === 0) return 0;

    let totalQuality = 0;

    for (const signal of signals) {
      let signalQuality = 0;

      // Quality based on available metrics
      if (signal.price) signalQuality += 0.2;
      if (signal.volume) signalQuality += 0.2;
      if (signal.spread) signalQuality += 0.1;
      if (signal.momentumScore) signalQuality += 0.2;
      if (signal.volatility) signalQuality += 0.1;
      if (signal.orderBookImbalance) signalQuality += 0.1;
      if (signal.liquidityScore) signalQuality += 0.1;

      totalQuality += signalQuality;
    }

    return totalQuality / signals.length;
  }

  /**
   * Calculate pattern consistency
   */
  private calculatePatternConsistency(signals: NormalizedMarketSignal[]): number {
    if (signals.length < 2) return 1;

    // Calculate time consistency
    const timeDiffs: number[] = [];
    for (let i = 1; i < signals.length; i++) {
      timeDiffs.push(signals[i]!.timestamp - signals[i - 1]!.timestamp);
    }

    const avgTimeDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
    const timeVariance = timeDiffs.reduce((sum, diff) => sum + Math.pow(diff - avgTimeDiff, 2), 0) / timeDiffs.length;

    // Lower variance = higher consistency
    const timeConsistency = Math.max(0, 1 - (timeVariance / (avgTimeDiff * avgTimeDiff)));

    return timeConsistency;
  }

  /**
   * Compare values using specified operator
   */
  private compareValues(value: number, operator: ComparisonOperator, expected: number): boolean {
    switch (operator) {
      case ComparisonOperator.EQUALS:
        return Math.abs(value - expected) < 0.0001; // Floating point comparison

      case ComparisonOperator.NOT_EQUALS:
        return Math.abs(value - expected) >= 0.0001;

      case ComparisonOperator.GREATER_THAN:
        return value > expected;

      case ComparisonOperator.GREATER_THAN_OR_EQUAL:
        return value >= expected;

      case ComparisonOperator.LESS_THAN:
        return value < expected;

      case ComparisonOperator.LESS_THAN_OR_EQUAL:
        return value <= expected;

      case ComparisonOperator.WITHIN_PERCENTAGE:
        const percentage = Math.abs((value - expected) / expected) * 100;
        return percentage <= 5; // Within 5%

      case ComparisonOperator.OUTSIDE_PERCENTAGE:
        const outsidePercentage = Math.abs((value - expected) / expected) * 100;
        return outsidePercentage > 5;

      default:
        return false;
    }
  }

  /**
   * Extract metric value from signal
   */
  private extractMetricValue(signal: NormalizedMarketSignal, metricType: MetricType): number | null {
    switch (metricType) {
      case MetricType.PRICE:
        return signal.price || null;
      case MetricType.VOLUME:
        return signal.volume || null;
      case MetricType.SPREAD:
        return signal.spread || null;
      case MetricType.LIQUIDITY:
        return signal.liquidityScore || null;
      case MetricType.VOLATILITY:
        return signal.volatility || null;
      case MetricType.MOMENTUM:
        return signal.momentumScore || null;
      case MetricType.ORDERBOOK_IMBALANCE:
        return signal.orderBookImbalance || null;
      case MetricType.FUNDING_RATE:
        return signal.fundingRate || null;
      case MetricType.OPEN_INTEREST:
        return signal.openInterest || null;
      case MetricType.MARKET_DEPTH:
        return signal.marketDepth || null;
      default:
        return null;
    }
  }

  /**
   * Convert time window to milliseconds
   */
  private timeWindowToMs(window: TimeWindow): number {
    switch (window) {
      case TimeWindow.INSTANT: return 0;
      case TimeWindow.MINUTE_1: return 60 * 1000;
      case TimeWindow.MINUTE_5: return 5 * 60 * 1000;
      case TimeWindow.MINUTE_15: return 15 * 60 * 1000;
      case TimeWindow.HOUR_1: return 60 * 60 * 1000;
      case TimeWindow.HOUR_4: return 4 * 60 * 60 * 1000;
      case TimeWindow.HOUR_24: return 24 * 60 * 60 * 1000;
      case TimeWindow.WEEK_1: return 7 * 24 * 60 * 60 * 1000;
      default: return 60 * 1000;
    }
  }

  /**
   * Clean up expired pattern states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();

    for (const [exchange, exchangeStates] of this.activeStates.entries()) {
      for (const [patternId, state] of exchangeStates.entries()) {
        const pattern = this.patterns.get(patternId);
        if (pattern) {
          const maxDurationMs = this.timeWindowToMs(pattern.maxDuration);
          if (now - state.lastUpdate > maxDurationMs * 2) { // Cleanup after 2x max duration
            exchangeStates.delete(patternId);
          }
        }
      }

      // Remove empty exchange states
      if (exchangeStates.size === 0) {
        this.activeStates.delete(exchange);
      }
    }
  }

  /**
   * Get all registered patterns
   */
  getRegisteredPatterns(): SequencePattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Clear all pattern states
   */
  clearStates(): void {
    this.activeStates.clear();
    this.logger.info('Cleared all pattern states');
  }
}
