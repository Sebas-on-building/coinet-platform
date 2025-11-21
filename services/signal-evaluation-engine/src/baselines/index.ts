/**
 * =========================================
 * ADAPTIVE BASELINES MODULE
 * =========================================
 * Exports for the adaptive baseline system
 */

export { AdaptiveBaselineEngine } from './AdaptiveBaselineEngine';
export { BaselineAPI } from './BaselineAPI';

// Re-export types for convenience
export type {
  MarketRegime,
  BaselineStats,
  SignalBaseline,
  AnomalyDetection,
  RegimeShift,
  BaselineConfig
} from '../alerts/types';
export type { BaselineAPIEndpoints } from './BaselineAPI';
