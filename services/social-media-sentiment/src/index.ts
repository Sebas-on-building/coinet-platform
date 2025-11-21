/**
 * =========================================
 * SOCIAL MEDIA SENTIMENT ANALYSIS SERVICE
 * =========================================
 * Main entry point for the social media sentiment analysis system
 */

// Core service
export { SocialMediaMonitor } from './SocialMediaMonitor';

// Platform clients
export { TwitterClient } from './platforms/twitter/TwitterClient';
export { RedditClient } from './platforms/reddit/RedditClient';
export { TelegramClient } from './platforms/telegram/TelegramClient';
export { DiscordClient } from './platforms/discord/DiscordClient';

// NLP processing
export { NLPProcessor } from './nlp/NLPProcessor';

// Aggregation
export { AggregationEngine } from './aggregation/AggregationEngine';

// Monitoring and utilities
export { Logger } from './utils/Logger';

// Types
export * from './types';
