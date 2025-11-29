/**
 * =========================================
 * SIGNAL EVALUATION ENGINE
 * =========================================
 * Main entry point for the real-time signal evaluation system
 */

// Core service
export { SignalEvaluationEngine } from './SignalEvaluationEngine';

// Kafka Streams
export { KafkaStreams } from './kafka/KafkaStreams';

// Processing components
export { SignalNormalizer } from './normalization/SignalNormalizer';
export { FeatureExtractor } from './features/FeatureExtractor';
export { FusionEngine } from './fusion/FusionEngine';

// API components
export { ConditionEvaluator } from './api/ConditionEvaluator';

// Monitoring and utilities
export { Logger } from './utils/Logger';

// Types
export * from './types';
