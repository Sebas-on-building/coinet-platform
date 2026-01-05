/**
 * 🎯 Intent Handlers - Layer A Handler Registry
 * 
 * Routes classified intents to appropriate handler logic.
 * Each handler determines what context to fetch and how to shape responses.
 * 
 * @version 1.0.0
 */

import { IntentType, DataDepth, ResponseShape, IntentClassification } from '../intent-classifier';
import { quickAnswerHandler, QuickAnswerContext } from './quick-answer';
import { decisionHelpHandler, DecisionHelpContext } from './decision-help';
import { deepAnalysisHandler, DeepAnalysisContext } from './deep-analysis';
import { troubleshootHandler, TroubleshootContext } from './troubleshoot';
import { learningHandler, LearningContext } from './learning';
import { logger } from '../../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Data sources that can be fetched for context
 */
export interface DataSourceConfig {
  fetchMarketData: boolean;
  fetchEnterpriseData: boolean;
  fetchWhaleData: boolean;
  fetchNews: boolean;
  fetchSentiment: boolean;
  fetchSocial: boolean;
  fetchDerivatives: boolean;
  fetchInfluencer: boolean;
  fetchOmniScore: boolean;
  fetchBehavioral: boolean;
  fetchNeuroeconomic: boolean;
  fetchInvestigation: boolean;
}

/**
 * Handler result with context configuration and AI hints
 */
export interface HandlerResult {
  dataSources: DataSourceConfig;
  aiFormatHint: string;
  contextPriority: string[];  // Order of context importance
  maxContextTokens: number;   // Limit context size
  responseGuidance: string;   // Additional AI guidance
}

/**
 * Handler function signature
 */
export type IntentHandler = (
  message: string,
  classification: IntentClassification,
  detectedCoins: string[]
) => Promise<HandlerResult>;

// ============================================================================
// HANDLER REGISTRY
// ============================================================================

const handlers: Record<IntentType, IntentHandler> = {
  quick_answer: quickAnswerHandler,
  decision_help: decisionHelpHandler,
  deep_analysis: deepAnalysisHandler,
  troubleshoot: troubleshootHandler,
  learning: learningHandler,
};

/**
 * Get the appropriate handler for an intent
 */
export function getHandler(intent: IntentType): IntentHandler {
  const handler = handlers[intent];
  if (!handler) {
    logger.warn('🎯 Unknown intent, falling back to deep_analysis', { intent });
    return handlers.deep_analysis;
  }
  return handler;
}

/**
 * Execute the handler for a classified intent
 */
export async function executeHandler(
  message: string,
  classification: IntentClassification,
  detectedCoins: string[]
): Promise<HandlerResult> {
  const handler = getHandler(classification.intent);
  
  try {
    const result = await handler(message, classification, detectedCoins);
    
    logger.debug('🎯 Handler executed', {
      intent: classification.intent,
      enabledSources: Object.entries(result.dataSources)
        .filter(([_, enabled]) => enabled)
        .map(([source]) => source),
      maxTokens: result.maxContextTokens,
    });
    
    return result;
  } catch (error) {
    logger.error('🎯 Handler execution failed, using default', {
      intent: classification.intent,
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Fail-safe: return full analysis config
    return getDefaultHandlerResult();
  }
}

/**
 * Default handler result for fallback scenarios
 */
export function getDefaultHandlerResult(): HandlerResult {
  return {
    dataSources: {
      fetchMarketData: true,
      fetchEnterpriseData: true,
      fetchWhaleData: true,
      fetchNews: true,
      fetchSentiment: true,
      fetchSocial: true,
      fetchDerivatives: true,
      fetchInfluencer: false,
      fetchOmniScore: true,
      fetchBehavioral: false,
      fetchNeuroeconomic: false,
      fetchInvestigation: true,
    },
    aiFormatHint: 'Provide a comprehensive, well-structured response.',
    contextPriority: ['omniScore', 'marketData', 'sentiment', 'derivatives'],
    maxContextTokens: 4000,
    responseGuidance: '',
  };
}

/**
 * Create a minimal data source config (all disabled)
 */
export function createMinimalDataSources(): DataSourceConfig {
  return {
    fetchMarketData: false,
    fetchEnterpriseData: false,
    fetchWhaleData: false,
    fetchNews: false,
    fetchSentiment: false,
    fetchSocial: false,
    fetchDerivatives: false,
    fetchInfluencer: false,
    fetchOmniScore: false,
    fetchBehavioral: false,
    fetchNeuroeconomic: false,
    fetchInvestigation: false,
  };
}

/**
 * Create a full data source config (all enabled)
 */
export function createFullDataSources(): DataSourceConfig {
  return {
    fetchMarketData: true,
    fetchEnterpriseData: true,
    fetchWhaleData: true,
    fetchNews: true,
    fetchSentiment: true,
    fetchSocial: true,
    fetchDerivatives: true,
    fetchInfluencer: true,
    fetchOmniScore: true,
    fetchBehavioral: true,
    fetchNeuroeconomic: true,
    fetchInvestigation: true,
  };
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { IntentType, DataDepth, ResponseShape, IntentClassification } from '../intent-classifier';
export { quickAnswerHandler, QuickAnswerContext } from './quick-answer';
export { decisionHelpHandler, DecisionHelpContext } from './decision-help';
export { deepAnalysisHandler, DeepAnalysisContext } from './deep-analysis';
export { troubleshootHandler, TroubleshootContext } from './troubleshoot';
export { learningHandler, LearningContext } from './learning';
