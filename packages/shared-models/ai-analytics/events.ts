// Atomic event types for AI Analytics Context

export interface ModelTrained {
  type: 'ModelTrained';
  modelId: string;
  modelType: string;
  metrics: Record<string, any>;
  timestamp: string;
}

export interface FeatureEngineered {
  type: 'FeatureEngineered';
  featureName: string;
  featureType: string;
  details: any;
  timestamp: string;
}

export interface PredictionGenerated {
  type: 'PredictionGenerated';
  modelId: string;
  input: any;
  output: any;
  timestamp: string;
}

export interface LLMAnalysisCompleted {
  type: 'LLMAnalysisCompleted';
  analysisId: string;
  symbol: string;
  timeframe: string;
  result: string;
  timestamp: string;
}

export interface VisionPatternDetected {
  type: 'VisionPatternDetected';
  patternType: string;
  details: any;
  timestamp: string;
}

export interface RLStrategyOptimized {
  type: 'RLStrategyOptimized';
  strategyId: string;
  agentId: string;
  performance: any;
  timestamp: string;
} 