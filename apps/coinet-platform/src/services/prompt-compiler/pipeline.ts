/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔄 COINET RESPONSE PIPELINE - End-to-End Processing                      ║
 * ║                                                                               ║
 * ║   Orchestrates the complete response flow:                                   ║
 * ║   1. Compile prompt (minimal, effective)                                     ║
 * ║   2. Generate response (AI call)                                             ║
 * ║   3. Parse and validate (code-enforced)                                      ║
 * ║   4. Retry with enforcement if needed                                        ║
 * ║   5. Render final output (stream-safe)                                       ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production-ready, verifiable-by-construction             ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';
import OpenAI from 'openai';

import {
  compilePrompt,
  compileSimplePrompt,
  CompilerInput,
  CompiledPrompt,
  SessionDirectives,
  PayloadSection,
  COMPILER_VERSION,
} from './index';

import {
  validateResponse,
  ValidateOptions,
  ValidationResult,
  CoinetJsonResponse,
  extractPayloadKeys,
  extractPayloadNumbers,
  detectLanguage,
} from './validators';

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineInput {
  /** User's message */
  userMessage: string;
  
  /** Detected or specified language */
  userLanguage: string;
  
  /** Conversation history (last N messages) */
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  
  /** Payload data to inject */
  payloads?: PayloadSection[];
  
  /** Resolved token info (if applicable) */
  resolvedToken?: {
    chain: string;
    address: string;
    symbol: string;
    confidence: 'high' | 'medium' | 'low';
  } | null;
  
  /** Response size cap */
  responseModeCap?: 'S' | 'M' | 'L';
  
  /** Max retries for validation failures */
  maxRetries?: number;
}

export interface PipelineOutput {
  /** Whether pipeline succeeded */
  success: boolean;
  
  /** Final answer text (for user) */
  finalAnswer: string;
  
  /** Full parsed contract (for logging/analytics) */
  contract: CoinetJsonResponse | null;
  
  /** Validation result */
  validation: ValidationResult | null;
  
  /** Metadata */
  metadata: {
    compilerVersion: string;
    promptCharCount: number;
    retryCount: number;
    totalLatencyMs: number;
    wasAutoFixed: boolean;
  };
  
  /** Error if failed */
  error?: string;
}

// ============================================================================
// ENFORCEMENT PROMPT (FOR RETRIES)
// ============================================================================

const ENFORCEMENT_PROMPT = `[ENFORCEMENT MODE]
Your previous response FAILED validation. Fix these issues:

{ISSUES}

Rules:
- Output language must be: {LANGUAGE}
- Remove or correct any facts not in payload.
- Remove numbers not grounded in payload.
- Maximum ONE question mark.
- No forbidden phrases (keeping it short, building on that, etc).
- Output JSON only.

Produce corrected JSON now.`;

// ============================================================================
// PIPELINE IMPLEMENTATION
// ============================================================================

/**
 * Execute the full response pipeline
 */
export async function executePipeline(
  client: OpenAI,
  model: string,
  input: PipelineInput
): Promise<PipelineOutput> {
  const startTime = Date.now();
  let retryCount = 0;
  const maxRetries = input.maxRetries ?? 1;
  
  try {
    // 1. Build session directives
    const sessionDirectives: SessionDirectives = {
      outputLanguage: input.userLanguage,
      responseModeCap: input.responseModeCap || 'M',
      resolvedToken: input.resolvedToken || null,
      toolAccess: {
        canFetchMarketData: true,
        canFetchTokenData: true,
        canFetchNews: true,
      },
    };
    
    // 2. Compile prompt
    const compiledPrompt = compilePrompt({
      sessionDirectives,
      payloads: input.payloads || [],
    });
    
    logger.debug('📝 Prompt compiled', {
      charCount: compiledPrompt.metadata.characterCount,
      payloadsAvailable: compiledPrompt.metadata.payloadCoverage.available,
    });
    
    // 3. Build messages
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: compiledPrompt.systemPrompt },
    ];
    
    // Add conversation history
    if (input.conversationHistory) {
      for (const msg of input.conversationHistory.slice(-6)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    
    // Add user message
    messages.push({ role: 'user', content: input.userMessage });
    
    // 4. Generate response
    let response = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.5,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    });
    
    let rawContent = response.choices[0]?.message?.content || '';
    
    // 5. Parse JSON
    let contract = parseJsonResponse(rawContent);
    
    if (!contract) {
      return {
        success: false,
        finalAnswer: 'I encountered an error processing the response.',
        contract: null,
        validation: null,
        metadata: buildMetadata(compiledPrompt, retryCount, startTime, false),
        error: 'Failed to parse JSON response',
      };
    }
    
    // 6. Validate
    const validationOptions: ValidateOptions = {
      expectedLanguage: input.userLanguage,
      payloadKeys: buildPayloadKeysSet(input.payloads),
      payloadNumbers: buildPayloadNumbersSet(input.payloads),
    };
    
    let validation = validateResponse(contract, validationOptions);
    
    // 7. Retry with enforcement if needed
    while (validation.shouldRegenerate && retryCount < maxRetries) {
      retryCount++;
      
      logger.warn('🔄 Retrying with enforcement prompt', {
        retry: retryCount,
        issues: validation.issues.map(i => i.code),
      });
      
      // Build enforcement prompt
      const issuesList = validation.issues
        .filter(i => i.severity === 'error')
        .map(i => `- ${i.code}: ${i.message}`)
        .join('\n');
      
      const enforcementPrompt = ENFORCEMENT_PROMPT
        .replace('{ISSUES}', issuesList)
        .replace('{LANGUAGE}', input.userLanguage);
      
      // Retry with enforcement
      const retryMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: enforcementPrompt },
        { role: 'user', content: `Original request: ${input.userMessage}\n\nPrevious (failed) response:\n${rawContent}` },
      ];
      
      response = await client.chat.completions.create({
        model,
        messages: retryMessages,
        temperature: 0.3,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      });
      
      rawContent = response.choices[0]?.message?.content || '';
      contract = parseJsonResponse(rawContent);
      
      if (contract) {
        validation = validateResponse(contract, validationOptions);
      }
    }
    
    // 8. Apply auto-fixes if needed
    let wasAutoFixed = false;
    let finalAnswer = contract?.final_answer || rawContent;
    
    if (validation.autoFixedContent) {
      finalAnswer = validation.autoFixedContent;
      wasAutoFixed = true;
    }
    
    // 9. Return result
    return {
      success: validation.isValid || !validation.shouldRegenerate,
      finalAnswer,
      contract,
      validation,
      metadata: buildMetadata(compiledPrompt, retryCount, startTime, wasAutoFixed),
    };
    
  } catch (error: any) {
    logger.error('❌ Pipeline failed', { error: error.message });
    
    return {
      success: false,
      finalAnswer: 'I encountered an error. Please try again.',
      contract: null,
      validation: null,
      metadata: {
        compilerVersion: COMPILER_VERSION.compiler,
        promptCharCount: 0,
        retryCount,
        totalLatencyMs: Date.now() - startTime,
        wasAutoFixed: false,
      },
      error: error.message,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse JSON response with error handling
 */
function parseJsonResponse(raw: string): CoinetJsonResponse | null {
  try {
    let jsonStr = raw.trim();
    
    // Remove markdown code fences if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();
    
    const parsed = JSON.parse(jsonStr);
    
    // Basic type checks
    if (typeof parsed.final_answer !== 'string') {
      return null;
    }
    
    return {
      output_language: parsed.output_language || 'en',
      intent: parsed.intent || 'OTHER',
      requires_data: Boolean(parsed.requires_data),
      facts_used: Array.isArray(parsed.facts_used) ? parsed.facts_used : [],
      numbers_used: Array.isArray(parsed.numbers_used) ? parsed.numbers_used : [],
      asked_question: Boolean(parsed.asked_question),
      final_answer: parsed.final_answer,
    };
  } catch (error) {
    logger.error('❌ JSON parse failed', { raw: raw.slice(0, 100) });
    return null;
  }
}

/**
 * Build payload keys set for validation
 */
function buildPayloadKeysSet(payloads?: PayloadSection[]): Set<string> {
  const keys = new Set<string>();
  
  if (!payloads) return keys;
  
  for (const payload of payloads) {
    if (payload.status === 'available' || payload.status === 'partial') {
      if (payload.data && typeof payload.data === 'object') {
        const childKeys = extractPayloadKeys(payload.data, payload.name);
        childKeys.forEach(k => keys.add(k));
      }
    }
  }
  
  return keys;
}

/**
 * Build payload numbers set for validation
 */
function buildPayloadNumbersSet(payloads?: PayloadSection[]): Set<string> {
  const numbers = new Set<string>();
  
  if (!payloads) return numbers;
  
  for (const payload of payloads) {
    if (payload.status === 'available' || payload.status === 'partial') {
      if (payload.data) {
        const childNumbers = extractPayloadNumbers(payload.data);
        childNumbers.forEach(n => numbers.add(n));
      }
    }
  }
  
  return numbers;
}

/**
 * Build metadata object
 */
function buildMetadata(
  compiled: CompiledPrompt,
  retryCount: number,
  startTime: number,
  wasAutoFixed: boolean
): PipelineOutput['metadata'] {
  return {
    compilerVersion: compiled.metadata.compilerVersion,
    promptCharCount: compiled.metadata.characterCount,
    retryCount,
    totalLatencyMs: Date.now() - startTime,
    wasAutoFixed,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { compilePrompt, compileSimplePrompt } from './index';
export { validateResponse, detectLanguage } from './validators';

// Style Realizer (Two-Layer Output)
export {
  executeTwoPassPipeline,
  executeSinglePassPipeline,
  validateAnalysisObject,
  parseAnalysisObject,
  ANALYSIS_GENERATOR_PROMPT,
  STYLE_REALIZER_PROMPT,
  type AnalysisObject,
  type StyleRealizerInput,
  type StyleRealizerOutput,
} from './style-realizer';

// Research Engine (Pass-1 Grok)
export {
  executeResearchEngine,
  detectResearchMode,
  validateInsightPack,
  parseInsightPack,
  PASS1_RESEARCH_ENGINE_PROMPT,
  type EvidencePack,
  type EvidenceModule,
  type InsightPack,
  type InsightPackMeta,
  type InsightPackContent,
  type InsightDriver,
  type InsightRisk,
  type InsightCatalyst,
  type ResearchMode,
  type ResearchEngineInput,
  type ResearchEngineOutput,
} from './research-engine';

// Gemini Pass-1B (Complementary Research)
export {
  executeGeminiPass1B,
  GEMINI_PASS1B_PROMPT,
  ENABLE_GEMINI_PASS1B,
  type GeminiClient,
  type GeminiEngineInput,
  type GeminiEngineOutput,
} from './pass1-gemini';

// Insight Aggregator (Merge Grok + Gemini)
export {
  aggregateInsights,
  interpretDisagreement,
  summarizeCoverage,
  normalizeTopic,
  topicsSimilar,
  type FinalInsightObject,
  type FinalInsightMeta,
  type AggregatedDriver,
  type AggregatedRisk,
  type AggregatedCatalyst,
  type AggregatedScenarios,
  type CoverageMap,
  type AggregatorInput,
  type EngineAgreement,
} from './insight-aggregator';

// Pass-2 OpenAI Renderer (Style Realizer)
export {
  executeRenderer,
  PASS2_RENDERER_PROMPT,
  ENABLE_RENDERER_OPENAI,
  type RendererInput,
  type RendererEnvelope,
  type RendererOutput,
  type ResponseModeCap,
} from './pass2-renderer-openai';

// Response Guardrails (Block, Don't Warn)
export {
  validateOrRegenerate,
  validateFactGate,
  validateLanguageLock,
  validateOneQuestion,
  validateForbiddenPhrases,
  validateStreamingSafety,
  autoFixMultipleQuestions,
  autoFixForbiddenPhrases,
  buildGuardrailEnforcementPrompt,
  FORBIDDEN_PHRASES,
  type GuardrailInput,
  type GuardrailResult,
  type GuardrailViolation,
  type GuardrailSeverity,
} from './response-guardrails';

// Research Budget & Trigger Policy
export {
  detectResearchTrigger,
  getUserBudget,
  consumeResearchCredit,
  getBudgetStatus,
  estimateCost,
  TIER_CONFIGS,
  ENABLE_DUAL_RESEARCH,
  ENABLE_DISAGREEMENT_METER,
  type ResearchTrigger,
  type ResearchDecision,
  type UserTier,
  type TierConfig,
  type UserBudget,
  type CostEstimate,
} from './research-budget';
