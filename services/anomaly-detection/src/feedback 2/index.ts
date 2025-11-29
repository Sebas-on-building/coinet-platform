/**
 * Feedback Loop System - Main Export
 * REVOLUTIONARY: Complete automated feedback loop system for AI continuous improvement
 */

// Core feedback loop components
export { AutomatedFeedbackLoopSystem } from './AutomatedFeedbackLoopSystem';
export { FeedbackDataLogger } from './FeedbackDataLogger';
export { ContinuousModelUpdater } from './ContinuousModelUpdater';
export { SelfCorrectionEngine } from './SelfCorrectionEngine';
export { FeedbackDashboardSystem } from './FeedbackDashboardSystem';

// Integration system
export { FeedbackLoopIntegration } from './FeedbackLoopIntegration';

// Types
export type {
  PredictionOutcome,
  UserFeedback,
  MarketPerformance,
  ModelParameterUpdate,
  SelfCorrectionAction,
  FeedbackMetrics,
  FeedbackDashboard
} from './AutomatedFeedbackLoopSystem';

export type {
  FeedbackLoopConfig,
  IntegratedFeedbackResult,
  SystemIntegrationStatus
} from './FeedbackLoopIntegration';

export type {
  ModelParameter,
  ModelConfig,
  OptimizationTarget,
  ParameterOptimization,
  ModelUpdateStrategy,
  UpdateValidation
} from './ContinuousModelUpdater';

export type {
  ErrorPattern,
  SystematicError,
  CorrectionStrategy,
  ErrorDetectionRule,
  SelfCorrectionResult,
  AdaptiveThreshold
} from './SelfCorrectionEngine';

export type {
  DashboardWidget,
  DashboardLayout,
  PerformanceChart,
  AccuracyHeatmap,
  TrendAnalysis,
  ImprovementRecommendation,
  ComprehensiveDashboard
} from './FeedbackDashboardSystem';

export type {
  LogEntry,
  DataRetentionPolicy,
  LogAnalytics,
  RealTimeMetrics
} from './FeedbackDataLogger';
