/**
 * =========================================
 * CROSS-SIGNAL CORRELATION ANALYSIS
 * =========================================
 * Advanced correlation analysis with statistical measures,
 * clustering, PCA, and adaptive weighting integration
 */

// Core classes
export { CorrelationAnalyzer } from './CorrelationAnalyzer';
export { SignalClustering } from './SignalClustering';
export { PCAAnalyzer } from './PCAAnalyzer';
export { CorrelationAPI } from './CorrelationAPI';

// Types
export type {
  CorrelationMatrix,
  CorrelationPair,
  GrangerCausalityResult,
  LeadLagRelationship,
  SignalCluster,
  ConvergencePattern,
  PCAResult,
  CorrelationConfig,
  CorrelationAnalysisRequest,
  CorrelationAnalysisResponse,
  AdaptiveWeightingUpdate,
  CorrelationInsights,
  CorrelationMetrics
} from './types';

// API interfaces
export type { CorrelationAPIEndpoints } from './CorrelationAPI';

// Default configuration factory
export { CorrelationAPI as default } from './CorrelationAPI';
