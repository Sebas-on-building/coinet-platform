/**
 * 🤖 Coinet AI Service - Grok (xAI) Integration
 * 
 * Real AI-powered market analysis using Grok
 * 
 * Features:
 * - Strict anti-hallucination prompting
 * - Post-response validation via AI Hallucination Guard
 * - Known hallucinated value detection
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';
import { validateAIResponse, quickHallucinationCheck } from './ai-hallucination-guard';
import {
  classifyVerbosity,
  generateResponseGuidance,
  COINET_LAWS,
  COINET_MENTOR_PERSONA,
  COINET_ANSWER_SHAPE,
  COINET_LANGUAGE_RULE,
  COINET_GLOSSARY,
  COINET_PLAYBOOK,
  COINET_GROUNDING_CONTRACT,
  COINET_JSON_RESPONSE_CONTRACT,
  COINET_ENFORCEMENT_REWRITE_PROMPT,
  COINET_STREAM_RENDERER_PROMPT
} from './conversation-rules';

export interface AIAnalysisRequest {
  content: string;
  type: 'ticker' | 'url' | 'thread' | 'question' | 'news';
  context?: {
    conversationId?: string;
    agentId?: string;
    analysisDepth?: 'quick' | 'standard' | 'deep';
    conversationHistory?: Array<{ role: string; content: string }>;
    liveMarketData?: string; // Formatted live market data
    // Data quality flags for uncertainty handling
    dataQuality?: {
      hasDataFreshnessConcern?: boolean;  // Data may be minutes behind
      hasPartialData?: boolean;            // Rate limit or incomplete feed
      hasConflictingData?: boolean;        // Multiple sources disagree
      hasEstimatedMetrics?: boolean;       // Inferred metrics, not confirmed
    };
  };
  // Enable strict JSON response contract (machine-checkable output)
  useJsonContract?: boolean;
}

export interface AIAnalysisResponse {
  success: boolean;
  data: {
    symbol?: string;
    thesis?: string;
    summary?: string;
    confidence: number;
    recommendation?: string;
    keyTopics?: string[];
    risks?: string[];
    catalysts?: string[];
  };
  metadata: {
    requestId: string;
    processingTime: number;
    version: string;
  };
  // JSON contract fields (when useJsonContract is enabled)
  jsonContract?: CoinetJsonResponse;
}

// ============================================================================
// JSON RESPONSE CONTRACT TYPES
// ============================================================================

export type OutputLanguage = 
  | 'en' | 'de' | 'es' | 'fr' | 'it' | 'pt' | 'nl' | 'tr' | 'pl' | 'sv' 
  | 'no' | 'da' | 'fi' | 'cs' | 'sk' | 'hu' | 'ro' | 'bg' | 'el' | 'ru' 
  | 'uk' | 'ar' | 'he' | 'hi' | 'bn' | 'id' | 'ms' | 'th' | 'vi' | 'zh' 
  | 'ja' | 'ko';

export type CoinetIntent = 
  | 'SOCIAL' 
  | 'MARKET_OVERVIEW' 
  | 'COIN_CHECK' 
  | 'TOKEN_ANALYSIS' 
  | 'EXPLAIN_MOVE' 
  | 'SOURCES' 
  | 'OMNISCORE' 
  | 'LEARNING' 
  | 'TROUBLESHOOT' 
  | 'OTHER';

export interface CoinetJsonResponse {
  output_language: OutputLanguage;
  intent: CoinetIntent;
  requires_data: boolean;
  facts_used: string[];
  numbers_used: string[];
  asked_question: boolean;
  final_answer: string;
}

// ============================================================================
// JSON RESPONSE PARSER
// ============================================================================

/**
 * Parse and validate a JSON response from the AI
 */
function parseJsonResponse(rawResponse: string): { success: boolean; data: CoinetJsonResponse | null; error?: string } {
  try {
    // Try to extract JSON from the response (in case there's any wrapping)
    let jsonStr = rawResponse.trim();
    
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
    
    // Parse the JSON
    const parsed = JSON.parse(jsonStr) as CoinetJsonResponse;
    
    // Validate required fields
    const requiredFields = ['output_language', 'intent', 'requires_data', 'facts_used', 'numbers_used', 'asked_question', 'final_answer'];
    for (const field of requiredFields) {
      if (!(field in parsed)) {
        return { success: false, data: null, error: `Missing required field: ${field}` };
      }
    }
    
    // Validate field types
    if (typeof parsed.output_language !== 'string') {
      return { success: false, data: null, error: 'output_language must be a string' };
    }
    if (typeof parsed.intent !== 'string') {
      return { success: false, data: null, error: 'intent must be a string' };
    }
    if (typeof parsed.requires_data !== 'boolean') {
      return { success: false, data: null, error: 'requires_data must be a boolean' };
    }
    if (!Array.isArray(parsed.facts_used)) {
      return { success: false, data: null, error: 'facts_used must be an array' };
    }
    if (!Array.isArray(parsed.numbers_used)) {
      return { success: false, data: null, error: 'numbers_used must be an array' };
    }
    if (typeof parsed.asked_question !== 'boolean') {
      return { success: false, data: null, error: 'asked_question must be a boolean' };
    }
    if (typeof parsed.final_answer !== 'string') {
      return { success: false, data: null, error: 'final_answer must be a string' };
    }
    
    // Validate asked_question consistency
    const questionCount = (parsed.final_answer.match(/\?/g) || []).length;
    if (parsed.asked_question && questionCount !== 1) {
      logger.warn('⚠️ JSON contract violation: asked_question=true but question count is not 1', { questionCount });
    }
    if (!parsed.asked_question && questionCount > 0) {
      logger.warn('⚠️ JSON contract violation: asked_question=false but found question marks', { questionCount });
    }
    
    return { success: true, data: parsed };
  } catch (error: any) {
    return { success: false, data: null, error: `JSON parse error: ${error.message}` };
  }
}

/**
 * Validate numbers_used against final_answer
 */
function validateNumbersUsed(jsonResponse: CoinetJsonResponse): string[] {
  const warnings: string[] = [];
  
  // Extract all numbers from final_answer
  const numbersInAnswer = jsonResponse.final_answer.match(/[\d,]+\.?\d*/g) || [];
  const cleanedNumbers = numbersInAnswer
    .map(n => n.replace(/,/g, ''))
    .filter(n => n.length > 0 && !isNaN(parseFloat(n)));
  
  // Check if all numbers in answer are in numbers_used
  for (const num of cleanedNumbers) {
    const found = jsonResponse.numbers_used.some(used => {
      const cleanUsed = used.replace(/,/g, '');
      return cleanUsed === num || parseFloat(cleanUsed) === parseFloat(num);
    });
    if (!found) {
      warnings.push(`Number ${num} appears in final_answer but not in numbers_used`);
    }
  }
  
  return warnings;
}

// ============================================================================
// JSON RESPONSE VALIDATION + ENFORCEMENT TYPES
// ============================================================================

export type ValidationFailureType = 
  | 'LANGUAGE_MISMATCH'
  | 'UNSUPPORTED_METRIC'
  | 'NUMBER_NOT_GROUNDED'
  | 'MULTIPLE_QUESTIONS'
  | 'EXTRA_TEXT_OUTSIDE_JSON'
  | 'FACTS_NOT_IN_PAYLOAD'
  | 'ASKED_QUESTION_MISMATCH';

export interface ValidationFailure {
  type: ValidationFailureType;
  details: string;
}

export interface JsonContractValidationResult {
  isValid: boolean;
  failures: ValidationFailure[];
  expectedLanguage: OutputLanguage;
}

/**
 * Detect language from text (simple heuristic)
 */
function detectLanguage(text: string): OutputLanguage {
  // Common language indicators
  const patterns: { lang: OutputLanguage; patterns: RegExp[] }[] = [
    { lang: 'de', patterns: [/\b(ich|du|er|sie|es|wir|ihr|und|oder|aber|dass|wenn|nicht|bin|bist|ist|sind|hast|hat|haben|der|die|das|ein|eine|einer|eines|einem|einen|auf|bei|mit|nach|seit|von|zu|für|gegen|durch|um|ohne|bis|als|wie|während)\b/i] },
    { lang: 'es', patterns: [/\b(yo|tú|él|ella|nosotros|ellos|y|o|pero|que|si|no|soy|eres|es|somos|son|tengo|tienes|tiene|tienen|el|la|los|las|un|una|unos|unas|de|en|con|por|para|sin|sobre|entre|hasta|desde|según)\b/i] },
    { lang: 'fr', patterns: [/\b(je|tu|il|elle|nous|vous|ils|elles|et|ou|mais|que|si|ne|pas|suis|es|est|sommes|êtes|sont|ai|as|a|avons|avez|ont|le|la|les|un|une|des|de|du|en|à|avec|pour|sans|sur|dans|par|chez)\b/i] },
    { lang: 'it', patterns: [/\b(io|tu|lui|lei|noi|voi|loro|e|o|ma|che|se|non|sono|sei|è|siamo|siete|ho|hai|ha|abbiamo|avete|hanno|il|lo|la|i|gli|le|un|uno|una|di|da|in|con|su|per|tra|fra)\b/i] },
    { lang: 'pt', patterns: [/\b(eu|tu|ele|ela|nós|vocês|eles|elas|e|ou|mas|que|se|não|sou|és|é|somos|são|tenho|tens|tem|temos|têm|o|a|os|as|um|uma|uns|umas|de|em|com|por|para|sem|sobre|entre)\b/i] },
    { lang: 'nl', patterns: [/\b(ik|jij|hij|zij|wij|jullie|en|of|maar|dat|als|niet|ben|bent|is|zijn|heb|hebt|heeft|hebben|de|het|een|van|in|op|met|voor|aan|naar|bij|om|tot|uit|door)\b/i] },
    { lang: 'ru', patterns: [/[а-яА-ЯёЁ]/] },
    { lang: 'zh', patterns: [/[\u4e00-\u9fa5]/] },
    { lang: 'ja', patterns: [/[\u3040-\u309f\u30a0-\u30ff]/] },
    { lang: 'ko', patterns: [/[\uac00-\ud7af]/] },
    { lang: 'ar', patterns: [/[\u0600-\u06ff]/] },
    { lang: 'he', patterns: [/[\u0590-\u05ff]/] },
    { lang: 'th', patterns: [/[\u0e00-\u0e7f]/] },
    { lang: 'vi', patterns: [/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i] },
    { lang: 'tr', patterns: [/\b(ben|sen|o|biz|siz|onlar|ve|veya|ama|ki|eğer|değil|im|sin|dir|iz|siniz|ler|ım|ın|ı|ız|ınız|ları|bir|bu|şu|için|ile|den|dan|e|a|de|da)\b/i] },
    { lang: 'pl', patterns: [/\b(ja|ty|on|ona|my|wy|oni|i|lub|ale|że|jeśli|nie|jestem|jesteś|jest|jesteśmy|jesteście|są|mam|masz|ma|mamy|macie|mają|w|na|z|do|od|za|po|przez|dla|o|przy|przed)\b/i] },
  ];
  
  for (const { lang, patterns: langPatterns } of patterns) {
    for (const pattern of langPatterns) {
      if (pattern.test(text)) {
        return lang;
      }
    }
  }
  
  return 'en'; // Default to English
}

/**
 * Extract all dot-path keys from a nested object
 */
function extractPayloadKeys(obj: any, prefix = ''): Set<string> {
  const keys = new Set<string>();
  
  if (obj === null || obj === undefined) return keys;
  
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    for (const key of Object.keys(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.add(fullKey);
      
      const childKeys = extractPayloadKeys(obj[key], fullKey);
      childKeys.forEach(k => keys.add(k));
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const arrayKey = `${prefix}[${index}]`;
      keys.add(arrayKey);
      
      const childKeys = extractPayloadKeys(item, arrayKey);
      childKeys.forEach(k => keys.add(k));
    });
  }
  
  return keys;
}

/**
 * Extract all numbers from a payload object
 */
function extractPayloadNumbers(obj: any): Set<string> {
  const numbers = new Set<string>();
  
  if (obj === null || obj === undefined) return numbers;
  
  if (typeof obj === 'number') {
    numbers.add(String(obj));
    // Also add common formatted versions
    if (obj >= 1000) {
      numbers.add(String(Math.round(obj)));
    }
    return numbers;
  }
  
  if (typeof obj === 'object') {
    for (const value of Object.values(obj)) {
      const childNumbers = extractPayloadNumbers(value);
      childNumbers.forEach(n => numbers.add(n));
    }
  }
  
  return numbers;
}

/**
 * Comprehensive validation of JSON contract response against payloads
 */
function validateJsonContract(
  jsonResponse: CoinetJsonResponse,
  userMessage: string,
  payloads: string | Record<string, any> | undefined
): JsonContractValidationResult {
  const failures: ValidationFailure[] = [];
  
  // Detect expected language from user message
  const expectedLanguage = detectLanguage(userMessage);
  
  // Parse payloads if string
  let payloadObj: Record<string, any> = {};
  if (payloads) {
    if (typeof payloads === 'string') {
      try {
        // Try to extract JSON from the payload string
        const jsonMatch = payloads.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          payloadObj = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Payload is not valid JSON, treat as empty
      }
    } else {
      payloadObj = payloads;
    }
  }
  
  // E1: Language check
  const detectedResponseLang = detectLanguage(jsonResponse.final_answer);
  if (detectedResponseLang !== expectedLanguage && jsonResponse.output_language !== expectedLanguage) {
    failures.push({
      type: 'LANGUAGE_MISMATCH',
      details: `Detected ${detectedResponseLang}, expected ${expectedLanguage}`,
    });
  }
  
  // E2 & E3: Facts and numbers grounding
  const payloadKeys = extractPayloadKeys(payloadObj);
  const payloadNumbers = extractPayloadNumbers(payloadObj);
  
  // Check facts_used against payload keys
  for (const fact of jsonResponse.facts_used) {
    // Allow partial matches (e.g., "token_context.dexscreener.price" should match if token_context.dexscreener exists)
    const factParts = fact.split('.');
    let found = false;
    for (const key of payloadKeys) {
      if (key === fact || fact.startsWith(key + '.') || key.startsWith(fact + '.')) {
        found = true;
        break;
      }
    }
    if (!found && payloadKeys.size > 0) {
      failures.push({
        type: 'FACTS_NOT_IN_PAYLOAD',
        details: `Claimed to use "${fact}" but not found in payload`,
      });
    }
  }
  
  // Check numbers_used are grounded in payload (if requires_data is true)
  if (jsonResponse.requires_data && jsonResponse.numbers_used.length > 0) {
    for (const num of jsonResponse.numbers_used) {
      const cleanNum = num.replace(/[,$%]/g, '');
      const found = payloadNumbers.has(cleanNum) || 
                    [...payloadNumbers].some(pn => {
                      const diff = Math.abs(parseFloat(pn) - parseFloat(cleanNum));
                      // Allow small rounding differences
                      return diff < 1 || diff / parseFloat(pn) < 0.01;
                    });
      
      if (!found && payloadNumbers.size > 0) {
        failures.push({
          type: 'NUMBER_NOT_GROUNDED',
          details: `Used ${num} but not found in payload`,
        });
      }
    }
  }
  
  // E4: Question count check
  const questionCount = (jsonResponse.final_answer.match(/\?/g) || []).length;
  if (questionCount > 1) {
    failures.push({
      type: 'MULTIPLE_QUESTIONS',
      details: `Found ${questionCount} question marks, max is 1`,
    });
  }
  
  // Check asked_question consistency
  if (jsonResponse.asked_question && questionCount !== 1) {
    failures.push({
      type: 'ASKED_QUESTION_MISMATCH',
      details: `asked_question=true but found ${questionCount} question marks`,
    });
  }
  if (!jsonResponse.asked_question && questionCount > 0) {
    failures.push({
      type: 'ASKED_QUESTION_MISMATCH',
      details: `asked_question=false but found ${questionCount} question marks`,
    });
  }
  
  return {
    isValid: failures.length === 0,
    failures,
    expectedLanguage,
  };
}

/**
 * Build enforcement rewrite prompt with validation failures
 */
function buildEnforcementPrompt(
  expectedLanguage: OutputLanguage,
  validationFailures: ValidationFailure[],
  payloads: string,
  userMessage: string,
  previousResponse: string
): string {
  return `${COINET_ENFORCEMENT_REWRITE_PROMPT}

============================================================
CURRENT CONTEXT
============================================================
expected_output_language: "${expectedLanguage}"

validation_failures:
${JSON.stringify(validationFailures, null, 2)}

payloads:
${payloads || '(none provided)'}

user_message: "${userMessage}"

previous_response (FAILED):
${previousResponse}

============================================================
YOUR TASK
============================================================
Fix ALL validation failures and return a corrected JSON object.
`;
}

// ============================================================================
// STREAM RENDERER (PASS 2)
// ============================================================================

/**
 * Render validated JSON envelope to final chat text without AI call.
 * This is a lightweight client-side renderer that enforces the rules locally.
 * Use this for fast rendering when no AI polish is needed.
 */
export function renderFinalAnswer(jsonContract: CoinetJsonResponse): string {
  let text = jsonContract.final_answer;
  
  // R3/R4: Handle question marks
  const questionCount = (text.match(/\?/g) || []).length;
  
  if (!jsonContract.asked_question && questionCount > 0) {
    // Remove all question marks if asked_question is false
    text = text.replace(/\?/g, '.');
    // Clean up double periods
    text = text.replace(/\.+/g, '.');
  } else if (jsonContract.asked_question && questionCount > 1) {
    // Keep only the last question mark
    const parts = text.split('?');
    const lastQuestion = parts.pop() || '';
    text = parts.join('.') + '?' + lastQuestion;
    text = text.replace(/\.+/g, '.').replace(/\.\?/g, '?');
  }
  
  // R6: Remove bot-like patterns (local cleanup)
  const botPatterns = [
    /keeping it short[,:]?\s*/gi,
    /building on that[,:]?\s*/gi,
    /quick pulse[,:]?\s*/gi,
    /here's a quick[,:]?\s*/gi,
    /let me (quickly |briefly )?/gi,
    /I'd be happy to\s*/gi,
    /I can help (you )?(with that|here)[.!]?\s*/gi,
  ];
  
  for (const pattern of botPatterns) {
    text = text.replace(pattern, '');
  }
  
  // Clean up extra whitespace
  text = text.replace(/\s+/g, ' ').trim();
  text = text.replace(/\n\s*\n+/g, '\n\n');
  
  return text;
}

/**
 * Build stream renderer prompt for AI polish pass (optional).
 * Only needed if you want the AI to further improve flow.
 */
function buildStreamRendererPrompt(jsonContract: CoinetJsonResponse): string {
  return `${COINET_STREAM_RENDERER_PROMPT}

============================================================
VALIDATED ENVELOPE
============================================================
${JSON.stringify(jsonContract, null, 2)}

============================================================
YOUR OUTPUT
============================================================
Render the final chat message now. Output ONLY the text.
`;
}

/**
 * Full stream render pipeline options
 */
export interface StreamRenderOptions {
  /** Use AI for polish pass (slower but higher quality) */
  useAIPolish?: boolean;
  /** Rendering hints for the AI */
  hints?: {
    useBullets?: boolean;
    maxBullets?: number;
    preferShort?: boolean;
  };
}

// The mentor system prompt — character layer only (HOW it speaks). The engine
// decides WHAT is true; this never adds, removes, or alters a claim. The eight
// Laws are the constitution and appear verbatim (asserted by a permanent test).
// Exported so the prompt-assembly assertion can verify the Laws are present.
export const SYSTEM_PROMPT = `
${COINET_MENTOR_PERSONA}

${COINET_LAWS}

${COINET_ANSWER_SHAPE}

${COINET_LANGUAGE_RULE}

${COINET_GLOSSARY}

${COINET_PLAYBOOK}

${COINET_GROUNDING_CONTRACT}
`;

// JSON-MODE SYSTEM PROMPT - the mentor constitution + grounding + JSON contract
export const SYSTEM_PROMPT_JSON = `
${COINET_MENTOR_PERSONA}

${COINET_LAWS}

${COINET_GROUNDING_CONTRACT}

${COINET_JSON_RESPONSE_CONTRACT}
`;

type AIProviderName = 'anthropic' | 'grok' | 'openai';

/**
 * A configured AI provider with its initialized client and model resolver.
 * The service holds one entry per available API key, in failover priority
 * order (Anthropic → Grok → OpenAI).
 */
interface ConfiguredProvider {
  name: AIProviderName;
  resolveModel: () => string;
  anthropic?: Anthropic;
  openai?: OpenAI;
}

export class AIService {
  // Configured providers in failover priority order: Anthropic → Grok → OpenAI.
  private providers: ConfiguredProvider[] = [];
  private isConfigured: boolean = false;
  // Primary (highest-priority configured) provider name; used for metadata/health.
  private provider: AIProviderName = 'anthropic';

  constructor() {
    // Provider chain: Anthropic (primary) → Grok (xAI) → OpenAI (fallback).
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    const grokApiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    // Log which keys are detected (without exposing the actual key)
    logger.info('🔑 AI Service key detection:', {
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasXaiKey: !!process.env.XAI_API_KEY,
      hasGrokKey: !!process.env.GROK_API_KEY,
      hasOpenaiKey: !!process.env.OPENAI_API_KEY,
      anthropicKeyLength: process.env.ANTHROPIC_API_KEY?.length || 0,
      xaiKeyLength: process.env.XAI_API_KEY?.length || 0,
      openaiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
    });

    // Initialize every provider whose key is present, in priority order, so a
    // failed call can fail over to the next at request time (createChatCompletion).
    if (anthropicApiKey) {
      this.providers.push({
        name: 'anthropic',
        anthropic: new Anthropic({ apiKey: anthropicApiKey }),
        resolveModel: () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      });
    }
    if (grokApiKey) {
      this.providers.push({
        name: 'grok',
        openai: new OpenAI({ apiKey: grokApiKey, baseURL: 'https://api.x.ai/v1' }),
        resolveModel: () => process.env.GROK_MODEL || 'grok-4-1-fast-non-reasoning',
      });
    }
    if (openaiApiKey) {
      this.providers.push({
        name: 'openai',
        openai: new OpenAI({ apiKey: openaiApiKey }),
        resolveModel: () => process.env.OPENAI_MODEL || 'gpt-4o-mini',
      });
    }

    this.isConfigured = this.providers.length > 0;
    this.provider = this.providers[0]?.name ?? 'anthropic';

    if (this.isConfigured) {
      logger.info('✅ AI Service initialized', {
        primary: this.provider,
        primaryModel: this.providers[0]?.resolveModel(),
        failoverChain: this.providers.map((p) => p.name),
      });
    } else {
      logger.error('❌ No AI API key configured! Add ANTHROPIC_API_KEY, XAI_API_KEY, or OPENAI_API_KEY to Railway environment variables');
    }
  }

  /**
   * Provider-agnostic chat completion with runtime failover. Attempts each
   * configured provider in priority order (Anthropic → Grok → OpenAI); if a
   * call throws, it fails over to the next provider and retries the same
   * request. Returns the result of the first provider that succeeds, including
   * which provider actually served it. Throws the last error only if every
   * provider fails.
   */
  private async createChatCompletion(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    opts: { temperature?: number; maxTokens: number; jsonMode?: boolean },
  ): Promise<{ content: string; model: string; totalTokens?: number; provider: AIProviderName }> {
    if (this.providers.length === 0) throw new Error('AI client not configured');

    let lastError: unknown;
    for (let i = 0; i < this.providers.length; i++) {
      const entry = this.providers[i];
      try {
        const result = await this.callProvider(entry, messages, opts);
        if (i > 0) {
          logger.warn('⚠️ AI failover succeeded', {
            failedProviders: this.providers.slice(0, i).map((p) => p.name),
            servedBy: entry.name,
          });
        }
        return { ...result, provider: entry.name };
      } catch (error: any) {
        lastError = error;
        logger.error('❌ AI provider call failed', {
          provider: entry.name,
          attempt: i + 1,
          totalProviders: this.providers.length,
          willFailover: i < this.providers.length - 1,
          errorMessage: error?.message,
          errorStatus: error?.status,
          errorCode: error?.code,
        });
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('All AI providers failed');
  }

  /**
   * Execute a single chat completion against one provider (no failover —
   * createChatCompletion handles that). Dispatches to Anthropic's Messages API
   * or the OpenAI-compatible Chat Completions API (OpenAI and Grok via baseURL)
   * and returns a normalized result. Throws on any failure so the caller can
   * fail over.
   *
   * Anthropic has no native `response_format: json_object`; when jsonMode is
   * requested we rely on the prompt's JSON instruction + the existing
   * parseJsonResponse() fence stripping, same as the enforcement-retry path.
   */
  private async callProvider(
    entry: ConfiguredProvider,
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    opts: { temperature?: number; maxTokens: number; jsonMode?: boolean },
  ): Promise<{ content: string; model: string; totalTokens?: number }> {
    const model = entry.resolveModel();

    if (entry.name === 'anthropic') {
      if (!entry.anthropic) throw new Error('Anthropic client not configured');

      // Anthropic takes a top-level system string; user/assistant turns go in messages.
      const systemPrompt = messages
        .filter((m) => m.role === 'system')
        .map((m) => (typeof m.content === 'string' ? m.content : ''))
        .join('\n\n');
      const turns = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: typeof m.content === 'string' ? m.content : '',
        }));

      const response = await entry.anthropic.messages.create({
        model,
        max_tokens: opts.maxTokens,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
        messages: turns,
      });

      const content = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');
      const totalTokens =
        (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
      return { content, model: response.model, totalTokens };
    }

    if (!entry.openai) throw new Error('AI client not configured');

    // GPT-5.2 only supports default temperature (1) - omit for compatibility
    const isGpt52 = model?.includes('gpt-5.2');
    const response = await entry.openai.chat.completions.create({
      model,
      messages,
      ...(!isGpt52 && opts.temperature !== undefined && { temperature: opts.temperature }),
      max_completion_tokens: opts.maxTokens,
      ...(opts.jsonMode && { response_format: { type: 'json_object' } }),
    });
    return {
      content: response.choices[0]?.message?.content || '',
      model: response.model,
      totalTokens: response.usage?.total_tokens,
    };
  }

  /**
   * Analyze market/crypto query using OpenAI
   */
  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const startTime = Date.now();
    const requestId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const useJsonMode = request.useJsonContract ?? false;

    try {
      if (!this.isConfigured) {
        throw new Error('AI not configured');
      }

      // Select system prompt based on mode
      const systemPrompt = useJsonMode ? SYSTEM_PROMPT_JSON : SYSTEM_PROMPT;

      // Build conversation messages
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
      ];

      // Add conversation history if available
      if (request.context?.conversationHistory) {
        for (const msg of request.context.conversationHistory.slice(-8)) {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          });
        }
      }

      let userContent = request.content;
      
      // ═══════════════════════════════════════════════════════════════════════
      // 🎛️ MODE-SPECIFIC PROCESSING
      // ═══════════════════════════════════════════════════════════════════════
      
      if (useJsonMode) {
        // JSON MODE: Minimal processing, let the AI handle everything via contract
        logger.debug('📋 JSON Contract mode enabled', { requestId });
        
        // Build user message with context
        userContent = `USER MESSAGE: ${request.content}`;
        
        if (request.context?.liveMarketData) {
          userContent = `${userContent}\n\nDATA PAYLOADS:\n${request.context.liveMarketData}`;
        }
      } else {
        // LEGACY MODE: Full verbosity classification and guidance
        const verbosityClass = classifyVerbosity(request.content);
        const responseGuidance = generateResponseGuidance(verbosityClass);
        
        logger.debug('🎛️ Response policy applied', {
          verbosity: verbosityClass,
        });
        
        // Inject conversation rules guidance BEFORE market data
        userContent = `${responseGuidance}\n\nUSER MESSAGE: ${request.content}`;
        
        if (request.context?.liveMarketData) {
          userContent = `${userContent}\n\n${request.context.liveMarketData}`;
        }
      }

      // Add current message with market data and conversation rules
      messages.push({ role: 'user', content: userContent });

      // Call AI with response format for JSON mode. The provider and model are
      // resolved per-attempt inside createChatCompletion, with runtime failover.
      const response = await this.createChatCompletion(messages, {
        temperature: useJsonMode ? 0.5 : 0.7,
        maxTokens: 1500,
        jsonMode: useJsonMode, // Force JSON output (OpenAI/Grok); prompt-driven for Anthropic
      });

      let content = response.content || 'I apologize, but I could not generate a response.';
      const processingTime = Date.now() - startTime;
      
      // ═══════════════════════════════════════════════════════════════════════
      // 📋 JSON CONTRACT PARSING (if enabled)
      // ═══════════════════════════════════════════════════════════════════════
      let jsonContract: CoinetJsonResponse | undefined;
      let enforcementRetryCount = 0;
      const maxEnforcementRetries = 1; // Only retry once with enforcement prompt
      
      if (useJsonMode) {
        let parseResult = parseJsonResponse(content);
        
        if (parseResult.success && parseResult.data) {
          jsonContract = parseResult.data;
          
          // ═══════════════════════════════════════════════════════════════════════
          // 🔒 JSON CONTRACT VALIDATION (ENFORCEMENT CHECK)
          // ═══════════════════════════════════════════════════════════════════════
          const validationResult = validateJsonContract(
            jsonContract,
            request.content,
            request.context?.liveMarketData
          );
          
          // If validation fails and we haven't retried yet, use enforcement prompt
          if (!validationResult.isValid && enforcementRetryCount < maxEnforcementRetries) {
            enforcementRetryCount++;
            
            logger.warn('⚠️ JSON Contract validation failed, attempting enforcement rewrite', {
              requestId,
              failures: validationResult.failures,
              expectedLanguage: validationResult.expectedLanguage,
            });
            
            // Build enforcement prompt
            const enforcementPrompt = buildEnforcementPrompt(
              validationResult.expectedLanguage,
              validationResult.failures,
              request.context?.liveMarketData || '',
              request.content,
              content
            );
            
            // Call AI again with enforcement prompt
            const enforcementResponse = await this.createChatCompletion(
              [{ role: 'system', content: enforcementPrompt }],
              { temperature: 0.3, maxTokens: 1500, jsonMode: true },
            );

            const enforcementContent = enforcementResponse.content || '';
            const enforcementParseResult = parseJsonResponse(enforcementContent);
            
            if (enforcementParseResult.success && enforcementParseResult.data) {
              jsonContract = enforcementParseResult.data;
              content = jsonContract.final_answer;
              
              // Re-validate the enforcement response
              const revalidation = validateJsonContract(
                jsonContract,
                request.content,
                request.context?.liveMarketData
              );
              
              logger.info('🔧 Enforcement rewrite result', {
                requestId,
                success: revalidation.isValid,
                remainingFailures: revalidation.failures.length,
              });
            } else {
              logger.error('❌ Enforcement rewrite parse failed', {
                requestId,
                error: enforcementParseResult.error,
              });
              // Keep original content
              content = jsonContract.final_answer;
            }
          } else {
            // Validation passed or no retry needed
            content = jsonContract.final_answer;
            
            if (validationResult.isValid) {
              logger.info('✅ JSON Contract validation passed', { requestId });
            }
          }
          
          // Validate numbers_used consistency
          const numberWarnings = validateNumbersUsed(jsonContract);
          if (numberWarnings.length > 0) {
            logger.warn('⚠️ JSON Contract number validation warnings', { 
              requestId, 
              warnings: numberWarnings 
            });
          }
          
          logger.info('✅ JSON Contract response parsed', {
            requestId,
            intent: jsonContract.intent,
            language: jsonContract.output_language,
            requiresData: jsonContract.requires_data,
            factsUsed: jsonContract.facts_used.length,
            numbersUsed: jsonContract.numbers_used.length,
            askedQuestion: jsonContract.asked_question,
            enforcementRetries: enforcementRetryCount,
          });
        } else {
          logger.error('❌ JSON Contract parse failed', { 
            requestId, 
            error: parseResult.error,
            rawResponse: content.substring(0, 200),
          });
          // Fall back to using raw content as final_answer
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 🛡️ HALLUCINATION GUARD - Validate AI response against known issues
      // ═══════════════════════════════════════════════════════════════════════
      let hallucinationWarnings: string[] = [];
      if (request.context?.liveMarketData) {
        // Quick check first (fast)
        if (quickHallucinationCheck(content)) {
          // Full validation if quick check flags potential issues
          const validation = validateAIResponse(content, request.context.liveMarketData);
          
          if (!validation.isValid) {
            hallucinationWarnings = validation.warnings;
            logger.warn('🚨 AI HALLUCINATION DETECTED', {
              requestId,
              hallucinationsDetected: validation.hallucinationsDetected,
              warnings: validation.warnings,
            });
            
            // Add a disclaimer to the response if hallucinations detected
            content += '\n\n⚠️ *Note: Some market data in this response may be from cached sources. Always verify ATH and price data from live sources.*';
          }
        }
      }

      // Extract symbol if mentioned
      const symbolMatch = content.match(/\b(BTC|ETH|SOL|ADA|AVAX|DOGE|XRP|DOT|MATIC|LINK)\b/i);
      const symbol = symbolMatch ? symbolMatch[1].toUpperCase() : undefined;

      // Extract key topics
      const keyTopics = this.extractKeyTopics(content);

      logger.info('🧠 AI Analysis Complete', {
        requestId,
        type: request.type,
        processingTime,
        provider: response.provider,
        model: response.model,
        tokens: response.totalTokens,
        hallucinationWarnings: hallucinationWarnings.length > 0 ? hallucinationWarnings : undefined,
        jsonMode: useJsonMode,
        jsonIntent: jsonContract?.intent,
      });

      return {
        success: true,
        data: {
          symbol,
          thesis: content,
          summary: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
          confidence: jsonContract?.requires_data && jsonContract.facts_used.length > 0 ? 0.9 : 0.85,
          keyTopics,
        },
        metadata: {
          requestId,
          processingTime,
          version: response.model,
        },
        jsonContract, // Include the full parsed JSON contract
      };
    } catch (error: any) {
      logger.error('❌ AI Analysis Failed', {
        provider: this.provider,
        errorMessage: error?.message || 'Unknown error',
        errorCode: error?.code,
        errorStatus: error?.status,
        errorType: error?.type,
      });
      throw error;
    }
  }

  /**
   * Extract key topics from response
   */
  private extractKeyTopics(content: string): string[] {
    const topics: string[] = [];
    
    const cryptoKeywords = ['bitcoin', 'ethereum', 'solana', 'defi', 'nft', 'trading', 'market', 'bull', 'bear', 'whale', 'analysis'];
    
    for (const keyword of cryptoKeywords) {
      if (content.toLowerCase().includes(keyword)) {
        topics.push(keyword);
      }
    }
    
    return topics.slice(0, 5);
  }

  /**
   * Stream render a validated JSON contract to final chat text.
   * Pass 2 of the response pipeline - polishes the final_answer.
   * 
   * @param jsonContract - The validated JSON contract from analyze()
   * @param options - Rendering options (useAIPolish for higher quality)
   */
  async streamRender(
    jsonContract: CoinetJsonResponse,
    options: StreamRenderOptions = {}
  ): Promise<string> {
    // Fast path: use local rendering (no AI call)
    if (!options.useAIPolish || !this.isConfigured) {
      return renderFinalAnswer(jsonContract);
    }

    // Slow path: use AI for polish pass
    try {
      const prompt = buildStreamRendererPrompt(jsonContract);

      const response = await this.createChatCompletion(
        [{ role: 'system', content: prompt }],
        { temperature: 0.3, maxTokens: 800 },
      );

      let rendered = response.content || '';
      
      // Strip any JSON or markdown that might have leaked through
      rendered = rendered.trim();
      if (rendered.startsWith('{') || rendered.startsWith('```')) {
        // AI returned JSON/markdown instead of plain text - fall back to local render
        logger.warn('⚠️ Stream renderer returned structured content, falling back to local render');
        return renderFinalAnswer(jsonContract);
      }
      
      // Final safety check: ensure question mark rules are enforced
      const questionCount = (rendered.match(/\?/g) || []).length;
      if (!jsonContract.asked_question && questionCount > 0) {
        rendered = rendered.replace(/\?/g, '.');
        rendered = rendered.replace(/\.+/g, '.');
      }
      
      logger.debug('✅ AI stream render complete', {
        originalLength: jsonContract.final_answer.length,
        renderedLength: rendered.length,
      });
      
      return rendered;
    } catch (error: any) {
      logger.warn('⚠️ AI stream render failed, using local render', { error: error.message });
      return renderFinalAnswer(jsonContract);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; provider?: string }> {
    const primary = this.providers[0];
    if (!primary) {
      return { healthy: false };
    }

    try {
      const start = Date.now();
      if (primary.name === 'anthropic') {
        // Anthropic SDK has no models.list; a minimal messages call confirms reachability.
        await primary.anthropic?.messages.create({
          model: primary.resolveModel(),
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        });
      } else {
        await primary.openai?.models.list();
      }
      const latency = Date.now() - start;
      return { healthy: true, latency, provider: primary.name };
    } catch (error) {
      return { healthy: false, provider: primary.name };
    }
  }

  /**
   * Check if service is configured
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }
}

// Export singleton instance
export const aiService = new AIService();
