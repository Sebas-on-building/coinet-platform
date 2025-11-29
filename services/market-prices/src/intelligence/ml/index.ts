/**
 * ML Intelligence Module
 * 
 * Exports all ML-related components for token unlock prediction
 */

// TensorFlow.js Neural Network
import { TensorFlowModel, getTensorFlowModel, resetTensorFlowModel } from './tensorflow-model';
export {
  TensorFlowModel,
  getTensorFlowModel,
  resetTensorFlowModel,
  type ModelConfig,
  type TrainingExample,
  type TrainingMetrics,
  type PredictionResult,
  type ModelState,
} from './tensorflow-model';

// Training Pipeline
import { TrainingPipeline } from './training-pipeline';
export {
  TrainingPipeline,
  type HistoricalUnlock,
  type HistoricalPrice,
  type LabeledUnlock,
  type PipelineConfig,
  type PipelineResults,
} from './training-pipeline';

// Isolation Forest for Anomaly Detection
import { IsolationForest, createIsolationForest } from './isolation-forest';
export {
  IsolationForest,
  createIsolationForest,
  type DataPoint,
  type AnomalyResult,
  type IsolationForestConfig,
  type ForestStats,
} from './isolation-forest';

// Enhanced Consensus Engine with ML
import { EnhancedConsensusEngine, getEnhancedConsensusEngine, resetEnhancedConsensusEngine } from './enhanced-consensus-engine';
export {
  EnhancedConsensusEngine,
  getEnhancedConsensusEngine,
  resetEnhancedConsensusEngine,
  type UnlockDataSource,
  type SourceUnlock,
  type EnhancedConsensusResult,
  type AnomalyInfo,
  type EnhancedConsensusConfig,
} from './enhanced-consensus-engine';

export default {
  TensorFlowModel,
  TrainingPipeline,
  IsolationForest,
  EnhancedConsensusEngine,
};

