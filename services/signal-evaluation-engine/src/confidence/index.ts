/**
 * =========================================
 * CONFIDENCE SCORING SYSTEM
 * =========================================
 * Advanced signal confidence scoring with multiple factors,
 * normalization, time decay, and market regime awareness
 */

// Core classes
export { ConfidenceScorer } from './ConfidenceScorer';
export { ConfidenceAPI } from './ConfidenceAPI';

// Types
export type {
  ConfidenceScore,
  ConfidenceFactors,
  ConfidenceConfig,
  SignalTypeWeights,
  SourceReliability,
  MarketRegime,
  HistoricalAccuracy,
  ConsistencyMetrics,
  ConfidenceRequest,
  ConfidenceResponse,
  BacktestingResult
} from './types';

// API interfaces
export type { APIEndpoints } from './ConfidenceAPI';

// Default configuration factory
export { ConfidenceAPI as default } from './ConfidenceAPI';
