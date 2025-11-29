/**
 * =========================================
 * INTELLIGENCE LAYER - EXPORTS
 * =========================================
 * Pattern Mining, Prediction & Liquidity Analysis
 */

export * from './types/pattern.types';
export * from './pattern-collector.service';
export * from './pattern-miner.service';
export * from './pattern-matcher.service';
export { IntelligenceOrchestrator } from './intelligence-orchestrator';
export type { IntelligenceOrchestratorConfig } from './intelligence-orchestrator';
export { HyperOptimizer } from './hyper-optimizer';
export type { HyperOptimizerConfig, OptimizationMetrics } from './hyper-optimizer';

// Liquidity Analysis (Phase 5)
export {
  LiquidityAnalyzer,
  getLiquidityAnalyzer,
  resetLiquidityAnalyzer,
  type TokenUnlock,
  type OrderBookDepth,
  type AggregatedOrderBook,
  type DEXPool,
  type DEXLiquidity,
  type MarketImpactSimulation,
  type AbsorptionAnalysis,
  type TradingRecommendation,
  type LiquidityConfig,
} from './liquidity-analyzer';

