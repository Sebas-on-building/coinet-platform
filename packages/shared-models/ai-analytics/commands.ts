// Atomic CQRS command types for AI Analytics Context

export interface TrainModel {
  type: 'TrainModel';
  modelType: string;
  parameters: any;
}

export interface EngineerFeature {
  type: 'EngineerFeature';
  featureName: string;
  featureType: string;
  details: any;
}

export interface GeneratePrediction {
  type: 'GeneratePrediction';
  modelId: string;
  input: any;
}

export interface RunLLMAnalysis {
  type: 'RunLLMAnalysis';
  analysisId: string;
  symbol: string;
  timeframe: string;
  prompt: string;
}

export interface DetectVisionPattern {
  type: 'DetectVisionPattern';
  patternType: string;
  data: any;
}

export interface OptimizeRLStrategy {
  type: 'OptimizeRLStrategy';
  strategyId: string;
  agentId: string;
  parameters: any;
} 