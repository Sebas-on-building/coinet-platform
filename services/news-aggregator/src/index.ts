/**
 * =========================================
 * NEWS AGGREGATOR SERVICE
 * =========================================
 * Main entry point for the news aggregation and analysis system
 */

// Core service
export { NewsAggregator } from './NewsAggregator';

// Source clients
export { RSSClient } from './sources/rss/RSSClient';
export { APIClient } from './sources/api/APIClient';
export { WebSocketClient } from './sources/websocket/WebSocketClient';

// Classification and NLP
export { NewsClassifier } from './classification/NewsClassifier';
export { NLPAnalyzer } from './nlp/NLPAnalyzer';

// Tagging
export { TokenTagger } from './tagging/TokenTagger';

// Monitoring and utilities
export { Logger } from './utils/Logger';

// Types
export * from './types';
