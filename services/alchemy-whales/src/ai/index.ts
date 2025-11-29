/**
 * AI Module Index
 * 
 * Exports all AI/ML components for whale analysis
 */

// Existing components
export { AdvancedFeatureExtractor } from './AdvancedFeatureExtractor';
export { FraudMLModel } from './FraudMLModel';
export { UltimateFraudDetector } from './UltimateFraudDetector';

// Phase C: Predictive Tracking
export {
  WhalePredictor,
  getWhalePredictor,
  resetWhalePredictor,
  type WhaleProfile,
  type TradingPattern,
  type WhalePrediction,
  type PredictionFeatures,
  type ModelConfig,
  type TrainingData,
} from './WhalePredictor';

export {
  HistoricalDataCollector,
  getHistoricalDataCollector,
  resetHistoricalDataCollector,
  type CollectorConfig,
  type WhaleHistoricalData,
  type LabeledTransfer,
  type CollectionStats,
} from './HistoricalDataCollector';

export {
  WhaleShadowMode,
  getWhaleShadowMode,
  resetWhaleShadowMode,
  type ShadowConfig,
  type TrackedWhale,
  type ShadowAlert,
  type ShadowStats,
} from './WhaleShadowMode';

export {
  PredictionAlertService,
  getPredictionAlertService,
  resetPredictionAlertService,
  type AlertServiceConfig,
  type AlertDeliveryResult,
  type AlertStats,
} from './PredictionAlertService';

// Default export with all singletons
import { getWhalePredictor } from './WhalePredictor';
import { getHistoricalDataCollector } from './HistoricalDataCollector';
import { getWhaleShadowMode } from './WhaleShadowMode';
import { getPredictionAlertService } from './PredictionAlertService';

export default {
  getWhalePredictor,
  getHistoricalDataCollector,
  getWhaleShadowMode,
  getPredictionAlertService,
};

