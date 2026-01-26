/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🛡️ RESPONSE GUARDRAILS — BLOCK, DON'T WARN                               ║
 * ║                                                                               ║
 * ║   Final validation layer before any response is shown to users.              ║
 * ║   Failures here BLOCK the response and trigger regeneration.                 ║
 * ║                                                                               ║
 * ║   VALIDATORS:                                                                 ║
 * ║   - Fact Gate: Every number must be in Evidence Pack                         ║
 * ║   - Language Lock: Response language matches request                         ║
 * ║   - One Question: Max 1 question allowed                                     ║
 * ║   - Forbidden Phrases: No bot-like language                                  ║
 * ║   - Streaming Safety: Never stream raw model output                          ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production-ready, zero tolerance                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';
import type { EvidencePack } from './research-engine';
import type { RendererEnvelope } from './pass2-renderer-openai';

// ============================================================================
// TYPES
// ============================================================================

export type GuardrailSeverity = 'critical' | 'warning' | 'info';

export interface GuardrailViolation {
  rule: string;
  severity: GuardrailSeverity;
  message: string;
  context?: string;
}

export interface GuardrailResult {
  passed: boolean;
  violations: GuardrailViolation[];
  shouldBlock: boolean;
  shouldRegenerate: boolean;
  autoFixSuggestions?: string[];
}

export interface GuardrailInput {
  envelope: RendererEnvelope;
  evidencePack: EvidencePack;
  expectedLanguage: string;
}

// ============================================================================
// FORBIDDEN PHRASES (COMPREHENSIVE)
// ============================================================================

const FORBIDDEN_PHRASES = [
  // AI disclaimers
  'as an ai',
  'as a language model',
  'as a large language model',
  'i am an ai',
  'i\'m an ai',
  'i am a bot',
  'i\'m a bot',
  'artificial intelligence',
  
  // Training/data disclaimers
  'based on my training',
  'my training data',
  'my knowledge cutoff',
  'i don\'t have real-time',
  'i cannot access real-time',
  'i don\'t have access to',
  'i cannot access',
  
  // Legal disclaimers
  'i cannot provide financial advice',
  'this is not financial advice',
  'not financial advice',
  'consult a professional',
  'do your own research',
  'dyor',
  
  // Bot phrases
  'please note that',
  'it\'s important to remember',
  'it\'s worth noting',
  'keep in mind that',
  'remember that',
  'here\'s what i found',
  'let me break this down',
  'let me explain',
  'to summarize',
  'in summary',
  'in conclusion',
  
  // Menu questions
  'would you like me to',
  'shall i',
  'do you want me to',
  'want me to',
  'should i',
  'would you like',
  'do you want',
  'want a deeper dive',
  'want more details',
  'want me to elaborate',
  'vibe check or',
  'vibe or numbers',
  'quick take or deep dive',
  
  // Template phrases
  'based on the information provided',
  'according to the data',
  'the data shows',
  'the evidence suggests',
  'analysis indicates',
];

// ============================================================================
// FACT GATE VALIDATOR
// ============================================================================

export function validateFactGate(
  finalAnswer: string,
  numbersUsed: string[],
  evidencePack: EvidencePack
): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];
  
  // Extract all numbers from evidence pack
  const evidenceNumbers = extractAllNumbers(evidencePack);
  
  // Extract numbers from final answer
  const answersNumbers = finalAnswer.match(/\$?[\d,]+\.?\d*[%MKB]?/g) || [];
  
  for (const num of answersNumbers) {
    const cleanNum = num.replace(/[$,%MKB,]/g, '');
    const numValue = parseFloat(cleanNum);
    
    // Skip very small numbers (likely just counts)
    if (!isNaN(numValue) && numValue <= 10 && Number.isInteger(numValue)) {
      continue;
    }
    
    // Skip if in numbersUsed
    if (numbersUsed.some(n => n.includes(cleanNum) || cleanNum.includes(n.replace(/[$,%MKB,]/g, '')))) {
      continue;
    }
    
    // Check if number exists in evidence
    const isInEvidence = evidenceNumbers.some(evNum => {
      const evClean = parseFloat(evNum);
      if (isNaN(evClean) || isNaN(numValue)) return false;
      
      const diff = Math.abs(numValue - evClean);
      return diff < 1 || diff / evClean < 0.05;
    });
    
    if (!isInEvidence) {
      violations.push({
        rule: 'FACT_GATE',
        severity: 'critical',
        message: `Number "${num}" not found in Evidence Pack`,
        context: `Found in: "${finalAnswer.substring(0, 100)}..."`,
      });
    }
  }
  
  return violations;
}

function extractAllNumbers(pack: EvidencePack): string[] {
  const numbers: string[] = [];
  
  const extract = (obj: any) => {
    if (obj === null || obj === undefined) return;
    
    if (typeof obj === 'number') {
      numbers.push(String(obj));
      numbers.push(String(Math.round(obj)));
      if (obj < 1 && obj > 0) {
        numbers.push((obj * 100).toFixed(2)); // Percentages
      }
    } else if (typeof obj === 'string') {
      const foundNums = obj.match(/[\d,]+\.?\d*/g) || [];
      numbers.push(...foundNums);
    } else if (typeof obj === 'object') {
      for (const value of Object.values(obj)) {
        extract(value);
      }
    }
  };
  
  for (const moduleData of Object.values(pack.evidence)) {
    if (moduleData?.data) {
      extract(moduleData.data);
    }
  }
  
  return numbers;
}

// ============================================================================
// LANGUAGE LOCK VALIDATOR
// ============================================================================

const LANGUAGE_MARKERS: Record<string, { words: string[]; threshold: number }> = {
  en: {
    words: ['the', 'and', 'for', 'but', 'with', 'this', 'that', 'are', 'was', 'have', 'will', 'can', 'would', 'could', 'should'],
    threshold: 3,
  },
  de: {
    words: ['und', 'der', 'die', 'das', 'ist', 'nicht', 'bei', 'wenn', 'aber', 'auch', 'noch', 'nur', 'oder', 'nach', 'wie', 'kann'],
    threshold: 3,
  },
  es: {
    words: ['que', 'con', 'por', 'para', 'una', 'pero', 'más', 'como', 'está', 'los', 'las', 'del', 'hay', 'sin', 'sobre'],
    threshold: 3,
  },
  fr: {
    words: ['que', 'les', 'des', 'une', 'pour', 'avec', 'dans', 'sur', 'pas', 'mais', 'sont', 'qui', 'plus', 'peut', 'cette'],
    threshold: 3,
  },
  it: {
    words: ['che', 'con', 'per', 'una', 'sono', 'della', 'nella', 'questo', 'anche', 'come', 'più', 'quando', 'solo'],
    threshold: 3,
  },
  pt: {
    words: ['que', 'com', 'para', 'uma', 'mas', 'mais', 'como', 'está', 'não', 'por', 'dos', 'das', 'tem', 'são'],
    threshold: 3,
  },
};

export function validateLanguageLock(
  finalAnswer: string,
  declaredLanguage: string,
  expectedLanguage: string
): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];
  
  // V1: Declared language must match expected
  if (declaredLanguage !== expectedLanguage) {
    violations.push({
      rule: 'LANGUAGE_LOCK',
      severity: 'critical',
      message: `Declared language "${declaredLanguage}" does not match expected "${expectedLanguage}"`,
    });
  }
  
  // V2: Detect actual language of text
  const text = ` ${finalAnswer.toLowerCase()} `;
  const languageScores: Record<string, number> = {};
  
  for (const [lang, config] of Object.entries(LANGUAGE_MARKERS)) {
    const score = config.words.filter(w => text.includes(` ${w} `)).length;
    languageScores[lang] = score;
  }
  
  // Find dominant language
  let dominantLang = 'unknown';
  let maxScore = 0;
  for (const [lang, score] of Object.entries(languageScores)) {
    if (score > maxScore) {
      maxScore = score;
      dominantLang = lang;
    }
  }
  
  // Check for mismatch
  if (maxScore >= LANGUAGE_MARKERS[dominantLang]?.threshold || 0) {
    if (dominantLang !== expectedLanguage && expectedLanguage !== 'other') {
      violations.push({
        rule: 'LANGUAGE_LOCK',
        severity: 'critical',
        message: `Text appears to be ${dominantLang} but expected ${expectedLanguage}`,
        context: `Scores: ${JSON.stringify(languageScores)}`,
      });
    }
  }
  
  return violations;
}

// ============================================================================
// ONE QUESTION VALIDATOR
// ============================================================================

export function validateOneQuestion(
  finalAnswer: string,
  askedQuestion: boolean
): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];
  
  const questionMarks = (finalAnswer.match(/\?/g) || []).length;
  
  if (questionMarks > 1) {
    violations.push({
      rule: 'ONE_QUESTION',
      severity: 'critical',
      message: `Multiple questions found (${questionMarks}). Max 1 allowed.`,
    });
  }
  
  if (askedQuestion && questionMarks === 0) {
    violations.push({
      rule: 'ONE_QUESTION',
      severity: 'warning',
      message: 'asked_question is true but no question mark found',
    });
  }
  
  if (!askedQuestion && questionMarks > 0) {
    violations.push({
      rule: 'ONE_QUESTION',
      severity: 'warning',
      message: 'Question mark found but asked_question is false',
    });
  }
  
  return violations;
}

// ============================================================================
// FORBIDDEN PHRASES VALIDATOR
// ============================================================================

export function validateForbiddenPhrases(finalAnswer: string): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];
  const text = finalAnswer.toLowerCase();
  
  for (const phrase of FORBIDDEN_PHRASES) {
    if (text.includes(phrase)) {
      violations.push({
        rule: 'FORBIDDEN_PHRASES',
        severity: 'critical',
        message: `Contains forbidden phrase: "${phrase}"`,
        context: findContext(finalAnswer, phrase),
      });
    }
  }
  
  return violations;
}

function findContext(text: string, phrase: string): string {
  const lowerText = text.toLowerCase();
  const index = lowerText.indexOf(phrase);
  if (index === -1) return '';
  
  const start = Math.max(0, index - 20);
  const end = Math.min(text.length, index + phrase.length + 20);
  return `...${text.substring(start, end)}...`;
}

// ============================================================================
// STREAMING SAFETY VALIDATOR
// ============================================================================

export function validateStreamingSafety(content: string): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];
  
  // Check for JSON structure leaks
  if (content.includes('"output_language"') || content.includes('"final_answer"')) {
    violations.push({
      rule: 'STREAMING_SAFETY',
      severity: 'critical',
      message: 'Raw JSON structure detected in output',
    });
  }
  
  // Check for thinking/reasoning leaks
  const thinkingPatterns = [
    /\[thinking\]/i,
    /\[reasoning\]/i,
    /\[analysis\]/i,
    /let me think/i,
    /i need to consider/i,
    /first, i'll/i,
    /step \d:/i,
  ];
  
  for (const pattern of thinkingPatterns) {
    if (pattern.test(content)) {
      violations.push({
        rule: 'STREAMING_SAFETY',
        severity: 'warning',
        message: `Thinking/reasoning pattern detected: ${pattern}`,
      });
    }
  }
  
  return violations;
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

export function validateOrRegenerate(input: GuardrailInput): GuardrailResult {
  const { envelope, evidencePack, expectedLanguage } = input;
  const violations: GuardrailViolation[] = [];
  
  // Run all validators
  violations.push(...validateFactGate(
    envelope.final_answer,
    envelope.numbers_used,
    evidencePack
  ));
  
  violations.push(...validateLanguageLock(
    envelope.final_answer,
    envelope.output_language,
    expectedLanguage
  ));
  
  violations.push(...validateOneQuestion(
    envelope.final_answer,
    envelope.asked_question
  ));
  
  violations.push(...validateForbiddenPhrases(envelope.final_answer));
  
  violations.push(...validateStreamingSafety(envelope.final_answer));
  
  // Determine outcome
  const criticalViolations = violations.filter(v => v.severity === 'critical');
  const shouldBlock = criticalViolations.length > 0;
  const shouldRegenerate = shouldBlock;
  
  // Generate auto-fix suggestions
  const autoFixSuggestions: string[] = [];
  
  for (const violation of criticalViolations) {
    switch (violation.rule) {
      case 'FACT_GATE':
        autoFixSuggestions.push(`Remove ungrounded number: ${violation.message}`);
        break;
      case 'LANGUAGE_LOCK':
        autoFixSuggestions.push(`Rewrite in ${expectedLanguage}`);
        break;
      case 'ONE_QUESTION':
        autoFixSuggestions.push('Remove extra questions, keep only the most important one');
        break;
      case 'FORBIDDEN_PHRASES':
        autoFixSuggestions.push(`Remove phrase: ${violation.context || violation.message}`);
        break;
      case 'STREAMING_SAFETY':
        autoFixSuggestions.push('Strip JSON structure from output');
        break;
    }
  }
  
  if (violations.length > 0) {
    logger.warn('🛡️ Guardrail violations detected', {
      total: violations.length,
      critical: criticalViolations.length,
      shouldBlock,
    });
  }
  
  return {
    passed: violations.length === 0,
    violations,
    shouldBlock,
    shouldRegenerate,
    autoFixSuggestions: autoFixSuggestions.length > 0 ? autoFixSuggestions : undefined,
  };
}

// ============================================================================
// AUTO-FIX HELPERS
// ============================================================================

export function autoFixMultipleQuestions(text: string): string {
  // Keep only the last question
  const sentences = text.split(/(?<=[.!?])\s+/);
  const questionSentences = sentences.filter(s => s.includes('?'));
  
  if (questionSentences.length <= 1) return text;
  
  // Remove all but last question
  const lastQuestion = questionSentences[questionSentences.length - 1];
  let fixed = text;
  
  for (let i = 0; i < questionSentences.length - 1; i++) {
    // Convert question to statement
    const q = questionSentences[i];
    const statement = q.replace('?', '.');
    fixed = fixed.replace(q, statement);
  }
  
  return fixed;
}

export function autoFixForbiddenPhrases(text: string): string {
  let fixed = text;
  
  for (const phrase of FORBIDDEN_PHRASES) {
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    fixed = fixed.replace(regex, '');
  }
  
  // Clean up double spaces
  fixed = fixed.replace(/\s+/g, ' ').trim();
  
  return fixed;
}

// ============================================================================
// ENFORCEMENT PROMPT BUILDER
// ============================================================================

export function buildGuardrailEnforcementPrompt(
  violations: GuardrailViolation[],
  expectedLanguage: string
): string {
  const violationList = violations
    .filter(v => v.severity === 'critical')
    .map(v => `- ${v.rule}: ${v.message}`)
    .join('\n');
  
  return `[ENFORCEMENT MODE — GUARDRAIL FAILURES]

Your previous response was BLOCKED due to these violations:
${violationList}

Fix these issues NOW:
- Language MUST be ${expectedLanguage} (every word)
- NO forbidden phrases (AI disclaimers, menu questions, bot language)
- MAX 1 question
- Every number MUST come from the Evidence Pack

Produce a clean, compliant response.`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  FORBIDDEN_PHRASES,
  LANGUAGE_MARKERS,
};
