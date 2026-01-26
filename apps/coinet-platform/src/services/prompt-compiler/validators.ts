/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔒 CODE VALIDATORS - Rules Enforced Outside the Prompt                   ║
 * ║                                                                               ║
 * ║   These validators enforce rules that the model should NOT decide.           ║
 * ║   Anything the computer can verify must not rely on model "obedience".       ║
 * ║                                                                               ║
 * ║   ENFORCED IN CODE (not prompt):                                             ║
 * ║   - Language lock (detect mismatch → regenerate)                             ║
 * ║   - Facts gate (numbers/claims must exist in payload)                        ║
 * ║   - Question count (0 or 1 question mark)                                    ║
 * ║   - JSON-only output enforcement                                             ║
 * ║   - No extra keys in contract                                                ║
 * ║   - Forbidden phrases detection                                              ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production-ready, code-enforced                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  details?: Record<string, any>;
  autoFixable: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  autoFixedContent?: string;
  shouldRegenerate: boolean;
}

export interface CoinetJsonResponse {
  output_language: string;
  intent: string;
  requires_data: boolean;
  facts_used: string[];
  numbers_used: string[];
  asked_question: boolean;
  final_answer: string;
}

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================

const LANGUAGE_PATTERNS: Record<string, RegExp[]> = {
  de: [/\b(ich|du|er|sie|es|wir|ihr|und|oder|aber|dass|wenn|nicht|bin|bist|ist|sind|der|die|das|ein|eine)\b/gi],
  es: [/\b(yo|tú|él|ella|nosotros|y|o|pero|que|si|no|soy|eres|es|el|la|los|las|un|una)\b/gi],
  fr: [/\b(je|tu|il|elle|nous|vous|et|ou|mais|que|si|ne|pas|suis|est|le|la|les|un|une)\b/gi],
  it: [/\b(io|tu|lui|lei|noi|e|o|ma|che|se|non|sono|sei|è|il|lo|la|i|gli|le|un|una)\b/gi],
  pt: [/\b(eu|tu|ele|ela|nós|e|ou|mas|que|se|não|sou|és|é|o|a|os|as|um|uma)\b/gi],
  nl: [/\b(ik|jij|hij|zij|wij|en|of|maar|dat|als|niet|ben|bent|is|de|het|een)\b/gi],
  ru: [/[а-яА-ЯёЁ]+/g],
  zh: [/[\u4e00-\u9fa5]+/g],
  ja: [/[\u3040-\u309f\u30a0-\u30ff]+/g],
  ko: [/[\uac00-\ud7af]+/g],
  ar: [/[\u0600-\u06ff]+/g],
};

/**
 * Detect the language of text
 */
export function detectLanguage(text: string): string {
  // Check for non-Latin scripts first
  for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    if (['ru', 'zh', 'ja', 'ko', 'ar'].includes(lang)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return lang;
        }
      }
    }
  }
  
  // Score Latin-script languages
  const scores: Record<string, number> = {};
  
  for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    if (['ru', 'zh', 'ja', 'ko', 'ar'].includes(lang)) continue;
    
    let score = 0;
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      score += matches ? matches.length : 0;
    }
    scores[lang] = score;
  }
  
  // Find highest scoring language
  let maxLang = 'en';
  let maxScore = 0;
  
  for (const [lang, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxLang = lang;
    }
  }
  
  // Threshold: need at least 3 matches to override English default
  return maxScore >= 3 ? maxLang : 'en';
}

// ============================================================================
// VALIDATORS
// ============================================================================

/**
 * V1: Language Lock Validator
 * Ensures output language matches expected language
 */
export function validateLanguageLock(
  response: CoinetJsonResponse,
  expectedLanguage: string
): ValidationIssue | null {
  const detectedLang = detectLanguage(response.final_answer);
  
  // Check declared language matches expected
  if (response.output_language !== expectedLanguage) {
    return {
      code: 'LANGUAGE_DECLARED_MISMATCH',
      severity: 'error',
      message: `Declared language ${response.output_language} does not match expected ${expectedLanguage}`,
      details: { declared: response.output_language, expected: expectedLanguage },
      autoFixable: false,
    };
  }
  
  // Check actual content language (with tolerance)
  if (detectedLang !== expectedLanguage && detectedLang !== 'en' && expectedLanguage !== 'en') {
    return {
      code: 'LANGUAGE_CONTENT_MISMATCH',
      severity: 'warning',
      message: `Content appears to be in ${detectedLang}, expected ${expectedLanguage}`,
      details: { detected: detectedLang, expected: expectedLanguage },
      autoFixable: false,
    };
  }
  
  return null;
}

/**
 * V2: Facts Gate Validator
 * Ensures facts_used keys exist in payload
 */
export function validateFactsGate(
  response: CoinetJsonResponse,
  payloadKeys: Set<string>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  for (const fact of response.facts_used) {
    // Allow partial path matches (token_context.dexscreener matches token_context.dexscreener.price)
    const factBase = fact.split('.').slice(0, 2).join('.');
    let found = false;
    
    for (const key of payloadKeys) {
      if (key === fact || key.startsWith(fact + '.') || fact.startsWith(key + '.') || key === factBase) {
        found = true;
        break;
      }
    }
    
    if (!found && payloadKeys.size > 0) {
      issues.push({
        code: 'FACT_NOT_IN_PAYLOAD',
        severity: 'error',
        message: `Cited fact "${fact}" not found in payload`,
        details: { fact, availableKeys: Array.from(payloadKeys).slice(0, 10) },
        autoFixable: false,
      });
    }
  }
  
  return issues;
}

/**
 * V3: Numbers Grounding Validator
 * Ensures all numbers in final_answer are in numbers_used and payload
 */
export function validateNumbersGrounding(
  response: CoinetJsonResponse,
  payloadNumbers: Set<string>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Extract numbers from final_answer
  const numbersInAnswer = response.final_answer.match(/[\d,]+\.?\d*/g) || [];
  const cleanedNumbers = numbersInAnswer
    .map(n => n.replace(/,/g, ''))
    .filter(n => n.length > 0 && !isNaN(parseFloat(n)) && parseFloat(n) > 0);
  
  // Check each number is declared in numbers_used
  for (const num of cleanedNumbers) {
    const found = response.numbers_used.some(used => {
      const cleanUsed = used.replace(/,/g, '');
      return cleanUsed === num || 
             Math.abs(parseFloat(cleanUsed) - parseFloat(num)) < 1 ||
             Math.abs(parseFloat(cleanUsed) - parseFloat(num)) / parseFloat(num) < 0.01;
    });
    
    if (!found) {
      issues.push({
        code: 'NUMBER_NOT_DECLARED',
        severity: 'warning',
        message: `Number ${num} in answer not declared in numbers_used`,
        details: { number: num },
        autoFixable: true,
      });
    }
  }
  
  // Check numbers_used are grounded in payload (if we have payload data)
  if (response.requires_data && payloadNumbers.size > 0) {
    for (const num of response.numbers_used) {
      const cleanNum = num.replace(/[,$%]/g, '');
      const found = payloadNumbers.has(cleanNum) ||
                    [...payloadNumbers].some(pn => {
                      const diff = Math.abs(parseFloat(pn) - parseFloat(cleanNum));
                      return diff < 1 || diff / parseFloat(pn) < 0.02;
                    });
      
      if (!found) {
        issues.push({
          code: 'NUMBER_NOT_IN_PAYLOAD',
          severity: 'error',
          message: `Number ${num} not found in payload`,
          details: { number: num },
          autoFixable: false,
        });
      }
    }
  }
  
  return issues;
}

/**
 * V4: Question Count Validator
 * Ensures 0 or 1 question mark, and asked_question matches
 */
export function validateQuestionCount(response: CoinetJsonResponse): ValidationIssue | null {
  const questionCount = (response.final_answer.match(/\?/g) || []).length;
  
  if (questionCount > 1) {
    return {
      code: 'MULTIPLE_QUESTIONS',
      severity: 'error',
      message: `Found ${questionCount} question marks, maximum is 1`,
      details: { count: questionCount },
      autoFixable: true,
    };
  }
  
  if (response.asked_question && questionCount !== 1) {
    return {
      code: 'ASKED_QUESTION_MISMATCH',
      severity: 'warning',
      message: `asked_question=true but found ${questionCount} question marks`,
      details: { declared: true, actual: questionCount },
      autoFixable: true,
    };
  }
  
  if (!response.asked_question && questionCount > 0) {
    return {
      code: 'ASKED_QUESTION_MISMATCH',
      severity: 'warning',
      message: `asked_question=false but found ${questionCount} question marks`,
      details: { declared: false, actual: questionCount },
      autoFixable: true,
    };
  }
  
  return null;
}

/**
 * V5: JSON Structure Validator
 * Ensures only required keys, no extras
 */
export function validateJsonStructure(response: Record<string, any>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const requiredKeys = ['output_language', 'intent', 'requires_data', 'facts_used', 'numbers_used', 'asked_question', 'final_answer'];
  
  // Check for missing keys
  for (const key of requiredKeys) {
    if (!(key in response)) {
      issues.push({
        code: 'MISSING_KEY',
        severity: 'error',
        message: `Missing required key: ${key}`,
        details: { key },
        autoFixable: false,
      });
    }
  }
  
  // Check for extra keys
  for (const key of Object.keys(response)) {
    if (!requiredKeys.includes(key)) {
      issues.push({
        code: 'EXTRA_KEY',
        severity: 'warning',
        message: `Extra key not in contract: ${key}`,
        details: { key },
        autoFixable: true,
      });
    }
  }
  
  return issues;
}

/**
 * V6: Forbidden Phrases Validator
 * Detects bot-like or meta phrases that should be avoided
 */
const FORBIDDEN_PHRASES = [
  /keeping it short/i,
  /building on that/i,
  /quick pulse/i,
  /let me (quickly |briefly )?explain/i,
  /I'd be happy to/i,
  /I can help (you )?(with that|here)/i,
  /absolutely!/i,
  /great question/i,
  /that's a (great|good|excellent) (question|point)/i,
  /as an AI/i,
  /as a language model/i,
  /my training data/i,
  /I don't have (access to )?real-time/i,
];

export function validateForbiddenPhrases(response: CoinetJsonResponse): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  for (const pattern of FORBIDDEN_PHRASES) {
    if (pattern.test(response.final_answer)) {
      issues.push({
        code: 'FORBIDDEN_PHRASE',
        severity: 'warning',
        message: `Contains forbidden phrase matching: ${pattern.source}`,
        details: { pattern: pattern.source },
        autoFixable: true,
      });
    }
  }
  
  return issues;
}

/**
 * V7: Intent Validator
 * Ensures intent is one of the allowed values
 */
const VALID_INTENTS = [
  'SOCIAL', 'MARKET_OVERVIEW', 'COIN_CHECK', 'TOKEN_ANALYSIS',
  'EXPLAIN_MOVE', 'SOURCES', 'OMNISCORE', 'LEARNING', 'TROUBLESHOOT', 'OTHER'
];

export function validateIntent(response: CoinetJsonResponse): ValidationIssue | null {
  if (!VALID_INTENTS.includes(response.intent)) {
    return {
      code: 'INVALID_INTENT',
      severity: 'error',
      message: `Invalid intent: ${response.intent}`,
      details: { intent: response.intent, validIntents: VALID_INTENTS },
      autoFixable: false,
    };
  }
  return null;
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

export interface ValidateOptions {
  expectedLanguage: string;
  payloadKeys?: Set<string>;
  payloadNumbers?: Set<string>;
}

/**
 * Run all validators on a response
 */
export function validateResponse(
  response: CoinetJsonResponse,
  options: ValidateOptions
): ValidationResult {
  const issues: ValidationIssue[] = [];
  
  // V1: Language lock
  const langIssue = validateLanguageLock(response, options.expectedLanguage);
  if (langIssue) issues.push(langIssue);
  
  // V2: Facts gate
  if (options.payloadKeys) {
    issues.push(...validateFactsGate(response, options.payloadKeys));
  }
  
  // V3: Numbers grounding
  if (options.payloadNumbers) {
    issues.push(...validateNumbersGrounding(response, options.payloadNumbers));
  }
  
  // V4: Question count
  const questionIssue = validateQuestionCount(response);
  if (questionIssue) issues.push(questionIssue);
  
  // V5: JSON structure
  issues.push(...validateJsonStructure(response));
  
  // V6: Forbidden phrases
  issues.push(...validateForbiddenPhrases(response));
  
  // V7: Intent
  const intentIssue = validateIntent(response);
  if (intentIssue) issues.push(intentIssue);
  
  // Determine if valid and if should regenerate
  const hasErrors = issues.some(i => i.severity === 'error');
  const shouldRegenerate = issues.some(i => 
    i.severity === 'error' && !i.autoFixable
  );
  
  // Attempt auto-fixes
  let autoFixedContent: string | undefined;
  if (!shouldRegenerate && issues.some(i => i.autoFixable)) {
    autoFixedContent = applyAutoFixes(response, issues);
  }
  
  if (issues.length > 0) {
    logger.warn('🔒 Validation issues found', {
      errorCount: issues.filter(i => i.severity === 'error').length,
      warningCount: issues.filter(i => i.severity === 'warning').length,
      shouldRegenerate,
      codes: issues.map(i => i.code),
    });
  }
  
  return {
    isValid: !hasErrors,
    issues,
    autoFixedContent,
    shouldRegenerate,
  };
}

/**
 * Apply auto-fixes to response content
 */
function applyAutoFixes(response: CoinetJsonResponse, issues: ValidationIssue[]): string {
  let content = response.final_answer;
  
  for (const issue of issues) {
    if (!issue.autoFixable) continue;
    
    switch (issue.code) {
      case 'MULTIPLE_QUESTIONS':
        // Keep only the last question mark
        const parts = content.split('?');
        if (parts.length > 2) {
          const last = parts.pop();
          content = parts.join('.') + '?' + last;
          content = content.replace(/\.+/g, '.').replace(/\.\?/g, '?');
        }
        break;
        
      case 'ASKED_QUESTION_MISMATCH':
        // Fix asked_question boolean (handled in JSON reconstruction)
        break;
        
      case 'FORBIDDEN_PHRASE':
        // Remove forbidden phrases
        for (const pattern of FORBIDDEN_PHRASES) {
          content = content.replace(pattern, '').trim();
        }
        content = content.replace(/\s+/g, ' ').replace(/\.\s*\./g, '.');
        break;
        
      case 'EXTRA_KEY':
        // Handled in JSON reconstruction
        break;
    }
  }
  
  return content;
}

// ============================================================================
// UTILITY: EXTRACT PAYLOAD KEYS AND NUMBERS
// ============================================================================

/**
 * Extract all dot-path keys from a payload object
 */
export function extractPayloadKeys(obj: any, prefix = ''): Set<string> {
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
export function extractPayloadNumbers(obj: any): Set<string> {
  const numbers = new Set<string>();
  
  if (obj === null || obj === undefined) return numbers;
  
  if (typeof obj === 'number') {
    numbers.add(String(obj));
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
