/**
 * =========================================
 * RULE INDEXING ENGINE
 * =========================================
 * Divine world-class in-memory indexing for millisecond-level rule evaluation
 * Optimized data structures for real-time alert condition matching
 */

import { Logger } from '@/utils/Logger';
import {
  AlertRule,
  RuleIndex,
  NormalizedMarketSignal,
  MetricType,
  AlertRuleStatus
} from '../types';

/**
 * High-performance rule indexing engine
 */
export class RuleIndexingEngine {
  private logger: Logger;
  private ruleIndex: RuleIndex;
  private indexUpdateInterval: number;
  private lastIndexUpdate: number = 0;

  constructor(indexUpdateInterval: number = 5000) {
    this.logger = new Logger('RuleIndexing');
    this.indexUpdateInterval = indexUpdateInterval;
    this.ruleIndex = this.createEmptyIndex();
  }

  /**
   * Update the rule index with new rules
   */
  updateIndex(rules: AlertRule[]): void {
    const startTime = Date.now();

    // Clear existing index
    this.ruleIndex = this.createEmptyIndex();

    // Index rules by various criteria
    for (const rule of rules) {
      if (rule.status !== AlertRuleStatus.ACTIVE) continue;

      this.indexRuleByExchange(rule);
      this.indexRuleBySymbol(rule);
      this.indexRuleByAssetType(rule);
      this.indexRuleBySignalType(rule);
      this.indexRuleByMetricType(rule);
      this.indexRuleByPriority(rule);
    }

    this.ruleIndex.totalRules = rules.filter(r => r.status === AlertRuleStatus.ACTIVE).length;
    this.ruleIndex.lastUpdated = Date.now();
    this.lastIndexUpdate = Date.now();

    const updateTime = Date.now() - startTime;
    this.logger.debug('Updated rule index', {
      totalRules: this.ruleIndex.totalRules,
      updateTime,
      exchanges: this.ruleIndex.byExchange.size,
      symbols: this.ruleIndex.bySymbol.size,
      metrics: this.ruleIndex.byMetricType.size,
    });
  }

  /**
   * Get rules relevant to a signal using optimized indexing
   */
  getRelevantRules(signal: NormalizedMarketSignal): AlertRule[] {
    const relevantRules = new Set<AlertRule>();

    // Get rules by exchange
    const exchangeRules = this.ruleIndex.byExchange.get(signal.exchange) || [];
    exchangeRules.forEach(rule => relevantRules.add(rule));

    // Get rules by symbol (pattern matching)
    const symbolRules = this.getSymbolMatchingRules(signal.symbol);
    symbolRules.forEach(rule => relevantRules.add(rule));

    // Get rules by asset type
    const assetTypeRules = this.ruleIndex.byAssetType.get(signal.assetType) || [];
    assetTypeRules.forEach(rule => relevantRules.add(rule));

    // Get rules by signal type
    const signalTypeRules = this.ruleIndex.bySignalType.get(signal.signalType) || [];
    signalTypeRules.forEach(rule => relevantRules.add(rule));

    // Get rules by metric types (from conditions)
    const metricTypeRules = this.getMetricTypeRules(signal);
    metricTypeRules.forEach(rule => relevantRules.add(rule));

    // Filter out rules that don't match all criteria
    const filteredRules = Array.from(relevantRules).filter(rule =>
      this.ruleMatchesSignal(rule, signal)
    );

    return filteredRules;
  }

  /**
   * Check if rule matches signal criteria
   */
  private ruleMatchesSignal(rule: AlertRule, signal: NormalizedMarketSignal): boolean {
    // Check exchange
    if (!rule.exchanges.includes(signal.exchange)) return false;

    // Check symbol pattern (simplified - would use regex in real implementation)
    if (!this.symbolMatchesPattern(signal.symbol, rule.symbols)) return false;

    // Check asset type
    if (!rule.assetTypes.includes(signal.assetType)) return false;

    // Check signal type
    if (!rule.signalTypes.includes(signal.signalType)) return false;

    return true;
  }

  /**
   * Get rules matching symbol patterns
   */
  private getSymbolMatchingRules(symbol: string): AlertRule[] {
    const matchingRules: AlertRule[] = [];

    for (const [pattern, rules] of this.ruleIndex.bySymbol.entries()) {
      if (this.symbolMatchesPattern(symbol, [pattern])) {
        rules.forEach(rule => matchingRules.push(rule));
      }
    }

    return matchingRules;
  }

  /**
   * Check if symbol matches any of the patterns
   */
  private symbolMatchesPattern(symbol: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      // Simplified pattern matching - in real implementation, use regex
      if (pattern === '*' || pattern === '') return true;
      return symbol.includes(pattern) || pattern.includes(symbol);
    });
  }

  /**
   * Get rules by metric types from signal
   */
  private getMetricTypeRules(signal: NormalizedMarketSignal): AlertRule[] {
    const metricTypes = new Set<MetricType>();
    const rules = new Set<AlertRule>();

    // Extract metric types from signal data
    if (signal.price) metricTypes.add(MetricType.PRICE);
    if (signal.volume) metricTypes.add(MetricType.VOLUME);
    if (signal.spread) metricTypes.add(MetricType.SPREAD);
    if (signal.liquidityScore) metricTypes.add(MetricType.LIQUIDITY);
    if (signal.volatility) metricTypes.add(MetricType.VOLATILITY);
    if (signal.momentumScore) metricTypes.add(MetricType.MOMENTUM);
    if (signal.orderBookImbalance) metricTypes.add(MetricType.ORDERBOOK_IMBALANCE);
    if (signal.fundingRate) metricTypes.add(MetricType.FUNDING_RATE);
    if (signal.openInterest) metricTypes.add(MetricType.OPEN_INTEREST);
    if (signal.marketDepth) metricTypes.add(MetricType.MARKET_DEPTH);

    // Get rules for each metric type
    for (const metricType of metricTypes) {
      const metricRules = this.ruleIndex.byMetricType.get(metricType) || [];
      metricRules.forEach(rule => rules.add(rule));
    }

    return Array.from(rules);
  }

  /**
   * Index rule by exchange
   */
  private indexRuleByExchange(rule: AlertRule): void {
    for (const exchange of rule.exchanges) {
      if (!this.ruleIndex.byExchange.has(exchange)) {
        this.ruleIndex.byExchange.set(exchange, []);
      }
      this.ruleIndex.byExchange.get(exchange)!.push(rule);
    }
  }

  /**
   * Index rule by symbol pattern
   */
  private indexRuleBySymbol(rule: AlertRule): void {
    for (const symbolPattern of rule.symbols) {
      if (!this.ruleIndex.bySymbol.has(symbolPattern)) {
        this.ruleIndex.bySymbol.set(symbolPattern, []);
      }
      this.ruleIndex.bySymbol.get(symbolPattern)!.push(rule);
    }
  }

  /**
   * Index rule by asset type
   */
  private indexRuleByAssetType(rule: AlertRule): void {
    for (const assetType of rule.assetTypes) {
      if (!this.ruleIndex.byAssetType.has(assetType)) {
        this.ruleIndex.byAssetType.set(assetType, []);
      }
      this.ruleIndex.byAssetType.get(assetType)!.push(rule);
    }
  }

  /**
   * Index rule by signal type
   */
  private indexRuleBySignalType(rule: AlertRule): void {
    for (const signalType of rule.signalTypes) {
      if (!this.ruleIndex.bySignalType.has(signalType)) {
        this.ruleIndex.bySignalType.set(signalType, []);
      }
      this.ruleIndex.bySignalType.get(signalType)!.push(rule);
    }
  }

  /**
   * Index rule by metric types from conditions
   */
  private indexRuleByMetricType(rule: AlertRule): void {
    for (const condition of rule.conditions) {
      if (!this.ruleIndex.byMetricType.has(condition.metricType)) {
        this.ruleIndex.byMetricType.set(condition.metricType, []);
      }
      this.ruleIndex.byMetricType.get(condition.metricType)!.push(rule);
    }
  }

  /**
   * Index rule by priority
   */
  private indexRuleByPriority(rule: AlertRule): void {
    if (!this.ruleIndex.byPriority.has(rule.priority)) {
      this.ruleIndex.byPriority.set(rule.priority, []);
    }
    this.ruleIndex.byPriority.get(rule.priority)!.push(rule);
  }

  /**
   * Create empty index structure
   */
  private createEmptyIndex(): RuleIndex {
    return {
      byExchange: new Map(),
      bySymbol: new Map(),
      byAssetType: new Map(),
      bySignalType: new Map(),
      byMetricType: new Map(),
      byPriority: new Map(),
      totalRules: 0,
      lastUpdated: 0,
    };
  }

  /**
   * Get index statistics
   */
  getIndexStats(): {
    totalRules: number;
    indexedByExchange: number;
    indexedBySymbol: number;
    indexedByAssetType: number;
    indexedBySignalType: number;
    indexedByMetricType: number;
    indexedByPriority: number;
    lastUpdated: number;
    needsUpdate: boolean;
  } {
    return {
      totalRules: this.ruleIndex.totalRules,
      indexedByExchange: this.ruleIndex.byExchange.size,
      indexedBySymbol: this.ruleIndex.bySymbol.size,
      indexedByAssetType: this.ruleIndex.byAssetType.size,
      indexedBySignalType: this.ruleIndex.bySignalType.size,
      indexedByMetricType: this.ruleIndex.byMetricType.size,
      indexedByPriority: this.ruleIndex.byPriority.size,
      lastUpdated: this.ruleIndex.lastUpdated,
      needsUpdate: Date.now() - this.lastIndexUpdate > this.indexUpdateInterval,
    };
  }

  /**
   * Force index rebuild (for testing)
   */
  rebuildIndex(rules: AlertRule[]): void {
    this.updateIndex(rules);
  }

  /**
   * Clear all indexes
   */
  clearIndex(): void {
    this.ruleIndex = this.createEmptyIndex();
    this.lastIndexUpdate = 0;
    this.logger.info('Cleared rule index');
  }

  /**
   * Get rules by priority (for ordered evaluation)
   */
  getRulesByPriority(): AlertRule[] {
    const allRules: AlertRule[] = [];

    // Sort priorities in descending order (highest priority first)
    const sortedPriorities = Array.from(this.ruleIndex.byPriority.keys()).sort((a, b) => b - a);

    for (const priority of sortedPriorities) {
      const priorityRules = this.ruleIndex.byPriority.get(priority) || [];
      allRules.push(...priorityRules);
    }

    return allRules;
  }
}
