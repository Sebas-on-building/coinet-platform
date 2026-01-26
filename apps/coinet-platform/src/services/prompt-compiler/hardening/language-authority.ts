/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🌐 LANGUAGE AUTHORITY — SINGLE SOURCE OF TRUTH                           ║
 * ║                                                                               ║
 * ║   Solves: mixed inputs ("hola bro kannst du btc checken"), mid-chat switches,║
 * ║   and language blending in output.                                           ║
 * ║                                                                               ║
 * ║   RULES:                                                                      ║
 * ║   1. expected_output_language comes from ONE source in priority order        ║
 * ║   2. Mixed-language input → pick authority, don't blend                      ║
 * ║   3. Log language pipeline explicitly                                        ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Kills "Hallo! Keeping it short: todo bien…"              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export type SupportedLanguage = 'en' | 'de' | 'es' | 'fr' | 'it' | 'pt' | 'other';

export type LanguageSource = 
  | 'explicit_command'      // User said "antworte auf deutsch"
  | 'session_sticky'        // Conversation session language
  | 'message_detected'      // Detected from last user message
  | 'default';              // Fallback

export interface LanguageAuthority {
  /** The authoritative output language */
  language: SupportedLanguage;
  
  /** Where this authority came from */
  source: LanguageSource;
  
  /** Confidence in detection (if detected) */
  confidence: number;
  
  /** Was mixed input detected? */
  mixedInputDetected: boolean;
  
  /** Languages detected in input (if mixed) */
  inputLanguages: SupportedLanguage[];
}

export interface LanguagePipeline {
  /** Language detected in user message */
  detected: SupportedLanguage;
  
  /** Language selected as authority */
  selected: SupportedLanguage;
  
  /** Source of selection */
  source: LanguageSource;
  
  /** Was translation involved? */
  translated: boolean;
  
  /** Mixed input detected? */
  mixedInput: boolean;
  
  /** Languages in mixed input */
  mixedLanguages: SupportedLanguage[];
}

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================

/**
 * Language-specific word sets for detection
 */
const LANGUAGE_MARKERS: Record<SupportedLanguage, string[]> = {
  en: ['the', 'and', 'for', 'but', 'with', 'this', 'that', 'have', 'will', 'can', 'would', 'should', 'what', 'how', 'why', 'when', 'where', 'is', 'are'],
  de: ['und', 'der', 'die', 'das', 'ist', 'nicht', 'bei', 'wenn', 'aber', 'auch', 'noch', 'nur', 'oder', 'nach', 'wie', 'kann', 'dein', 'mein', 'sein', 'haben', 'werden', 'ich', 'du', 'wir'],
  es: ['que', 'con', 'por', 'para', 'una', 'pero', 'más', 'como', 'está', 'los', 'las', 'del', 'hay', 'sin', 'sobre', 'muy', 'bien', 'ser', 'todo', 'tiene', 'este', 'ese'],
  fr: ['que', 'les', 'des', 'une', 'pour', 'avec', 'dans', 'sur', 'pas', 'mais', 'sont', 'qui', 'plus', 'peut', 'cette', 'tout', 'fait', 'bien', 'aussi'],
  it: ['che', 'con', 'per', 'una', 'sono', 'della', 'nella', 'questo', 'anche', 'come', 'più', 'quando', 'solo', 'essere', 'tutto', 'fatto', 'bene'],
  pt: ['que', 'com', 'para', 'uma', 'mas', 'mais', 'como', 'está', 'não', 'por', 'dos', 'das', 'tem', 'são', 'muito', 'bem', 'ser', 'todo'],
  other: [],
};

/**
 * Explicit language command patterns
 */
const LANGUAGE_COMMANDS: Record<SupportedLanguage, RegExp[]> = {
  en: [
    /\b(answer|respond|reply|speak|write)\s+(in\s+)?english\b/i,
    /\bin\s+english\s+please\b/i,
  ],
  de: [
    /\b(antworte?|schreib|sprich)\s+(auf\s+)?deutsch\b/i,
    /\bauf\s+deutsch\s+bitte\b/i,
    /\bin\s+(german|deutsch)\b/i,
  ],
  es: [
    /\b(responde|escribe|habla)\s+(en\s+)?español\b/i,
    /\ben\s+español\s+por\s+favor\b/i,
    /\bin\s+spanish\b/i,
  ],
  fr: [
    /\b(réponds|écris|parle)\s+(en\s+)?français\b/i,
    /\ben\s+français\s+s'il\s+(te|vous)\s+pla[iî]t\b/i,
    /\bin\s+french\b/i,
  ],
  it: [
    /\b(rispondi|scrivi|parla)\s+(in\s+)?italiano\b/i,
    /\bin\s+italian(o)?\b/i,
  ],
  pt: [
    /\b(responda|escreva|fale)\s+(em\s+)?português\b/i,
    /\bem\s+português\b/i,
    /\bin\s+portuguese\b/i,
  ],
  other: [],
};

/**
 * Detect language of a text
 */
export function detectLanguage(text: string): { language: SupportedLanguage; confidence: number; scores: Record<SupportedLanguage, number> } {
  const words = text.toLowerCase().split(/\s+/);
  const scores: Record<SupportedLanguage, number> = {
    en: 0, de: 0, es: 0, fr: 0, it: 0, pt: 0, other: 0,
  };
  
  for (const word of words) {
    for (const [lang, markers] of Object.entries(LANGUAGE_MARKERS) as [SupportedLanguage, string[]][]) {
      if (markers.includes(word)) {
        scores[lang]++;
      }
    }
  }
  
  // Find max score
  let maxLang: SupportedLanguage = 'en';
  let maxScore = 0;
  let totalScore = 0;
  
  for (const [lang, score] of Object.entries(scores) as [SupportedLanguage, number][]) {
    totalScore += score;
    if (score > maxScore) {
      maxScore = score;
      maxLang = lang;
    }
  }
  
  // Calculate confidence
  const confidence = totalScore > 0 ? maxScore / totalScore : 0;
  
  // If very low confidence or no markers, default to 'en' with low confidence
  if (maxScore < 2) {
    return { language: 'en', confidence: 0.3, scores };
  }
  
  return { language: maxLang, confidence, scores };
}

/**
 * Check if text contains explicit language command
 */
export function detectExplicitLanguageCommand(text: string): SupportedLanguage | null {
  for (const [lang, patterns] of Object.entries(LANGUAGE_COMMANDS) as [SupportedLanguage, RegExp[]][]) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return lang;
      }
    }
  }
  return null;
}

/**
 * Detect mixed-language input
 */
export function detectMixedLanguage(text: string): { isMixed: boolean; languages: SupportedLanguage[]; dominant: SupportedLanguage } {
  const detection = detectLanguage(text);
  const { scores } = detection;
  
  // Find all languages with significant presence
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const threshold = totalScore * 0.2; // 20% threshold
  
  const significantLanguages: SupportedLanguage[] = [];
  for (const [lang, score] of Object.entries(scores) as [SupportedLanguage, number][]) {
    if (score >= threshold && score > 1) {
      significantLanguages.push(lang);
    }
  }
  
  return {
    isMixed: significantLanguages.length > 1,
    languages: significantLanguages,
    dominant: detection.language,
  };
}

// ============================================================================
// SESSION LANGUAGE STORAGE
// ============================================================================

interface SessionLanguage {
  language: SupportedLanguage;
  setAt: number;
  source: LanguageSource;
}

const sessionLanguageStore = new Map<string, SessionLanguage>();

export function getSessionLanguage(conversationId: string): SessionLanguage | null {
  return sessionLanguageStore.get(conversationId) || null;
}

export function setSessionLanguage(
  conversationId: string,
  language: SupportedLanguage,
  source: LanguageSource
): void {
  sessionLanguageStore.set(conversationId, {
    language,
    setAt: Date.now(),
    source,
  });
  
  logger.info('🌐 Session language set', { conversationId, language, source });
}

// ============================================================================
// LANGUAGE AUTHORITY RESOLUTION
// ============================================================================

/**
 * Resolve the authoritative output language
 * Priority: explicit command > session sticky > detected
 */
export function resolveLanguageAuthority(
  userMessage: string,
  conversationId: string,
  defaultLanguage: SupportedLanguage = 'en'
): LanguageAuthority {
  // Priority 1: Explicit command in current message
  const explicitCommand = detectExplicitLanguageCommand(userMessage);
  if (explicitCommand) {
    // Update session
    setSessionLanguage(conversationId, explicitCommand, 'explicit_command');
    
    return {
      language: explicitCommand,
      source: 'explicit_command',
      confidence: 1.0,
      mixedInputDetected: false,
      inputLanguages: [explicitCommand],
    };
  }
  
  // Priority 2: Session sticky language
  const sessionLang = getSessionLanguage(conversationId);
  if (sessionLang && Date.now() - sessionLang.setAt < 30 * 60 * 1000) { // 30 min TTL
    const mixedCheck = detectMixedLanguage(userMessage);
    
    return {
      language: sessionLang.language,
      source: 'session_sticky',
      confidence: 0.9,
      mixedInputDetected: mixedCheck.isMixed,
      inputLanguages: mixedCheck.languages,
    };
  }
  
  // Priority 3: Detected from message
  const detection = detectLanguage(userMessage);
  const mixedCheck = detectMixedLanguage(userMessage);
  
  // If mixed input, pick dominant and set as session language
  const selectedLanguage = mixedCheck.isMixed ? mixedCheck.dominant : detection.language;
  
  // Only set session if confidence is reasonable
  if (detection.confidence > 0.5) {
    setSessionLanguage(conversationId, selectedLanguage, 'message_detected');
  }
  
  return {
    language: selectedLanguage,
    source: 'message_detected',
    confidence: detection.confidence,
    mixedInputDetected: mixedCheck.isMixed,
    inputLanguages: mixedCheck.languages,
  };
}

// ============================================================================
// LANGUAGE PIPELINE LOGGING
// ============================================================================

export function buildLanguagePipeline(
  userMessage: string,
  conversationId: string,
  outputLanguage: SupportedLanguage
): LanguagePipeline {
  const detection = detectLanguage(userMessage);
  const authority = resolveLanguageAuthority(userMessage, conversationId);
  const mixedCheck = detectMixedLanguage(userMessage);
  
  return {
    detected: detection.language,
    selected: authority.language,
    source: authority.source,
    translated: authority.language !== detection.language && detection.confidence > 0.6,
    mixedInput: mixedCheck.isMixed,
    mixedLanguages: mixedCheck.languages,
  };
}

// ============================================================================
// LANGUAGE VALIDATION
// ============================================================================

export interface LanguageValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  actualLanguage: SupportedLanguage;
  expectedLanguage: SupportedLanguage;
}

/**
 * Validate that response is in the correct language
 */
export function validateLanguage(
  response: string,
  expectedLanguage: SupportedLanguage
): LanguageValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const detection = detectLanguage(response);
  const mixedCheck = detectMixedLanguage(response);
  
  // Check if detected language matches expected
  if (detection.language !== expectedLanguage && detection.confidence > 0.6) {
    errors.push(`Language mismatch: expected ${expectedLanguage}, detected ${detection.language} (confidence: ${detection.confidence.toFixed(2)})`);
  }
  
  // Check for mixed-language output (bad)
  if (mixedCheck.isMixed) {
    const nonExpected = mixedCheck.languages.filter(l => l !== expectedLanguage);
    if (nonExpected.length > 0) {
      errors.push(`Mixed-language output detected: contains ${nonExpected.join(', ')} in ${expectedLanguage} response`);
    }
  }
  
  // Check for English scaffolding in non-English responses
  if (expectedLanguage !== 'en') {
    const englishScaffolding = detectEnglishScaffolding(response);
    if (englishScaffolding.length > 0) {
      warnings.push(`English scaffolding in ${expectedLanguage} response: ${englishScaffolding.slice(0, 3).join(', ')}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    actualLanguage: detection.language,
    expectedLanguage,
  };
}

function detectEnglishScaffolding(text: string): string[] {
  const scaffoldingPatterns = [
    /\b(keeping it short|here's the deal|bottom line|quick take|let me break|got you|alright so|based on|looking at)\b/gi,
    /\b(first off|secondly|lastly|to wrap up|in conclusion|to summarize)\b/gi,
  ];
  
  const found: string[] = [];
  for (const pattern of scaffoldingPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      found.push(...matches);
    }
  }
  
  return found;
}

// ============================================================================
// PROMPT SECTION FOR LANGUAGE
// ============================================================================

export function generateLanguagePromptSection(authority: LanguageAuthority): string {
  const lines: string[] = [
    '[LANGUAGE AUTHORITY — NON-NEGOTIABLE]',
    '',
    `Output language: ${authority.language.toUpperCase()}`,
    `Source: ${authority.source}`,
    '',
    'RULES:',
    `  • Every word must be in ${authority.language}`,
    '  • NO mixing languages in the same sentence',
    '  • NO English scaffolding (keeping it short, here\'s the deal, based on, etc.)',
  ];
  
  if (authority.mixedInputDetected) {
    lines.push('');
    lines.push(`NOTE: User sent mixed-language input (${authority.inputLanguages.join('+')}).`);
    lines.push(`You MUST respond in ${authority.language} only. Do not blend.`);
  }
  
  // Language-specific notes
  if (authority.language === 'de') {
    lines.push('');
    lines.push('GERMAN SPECIFICS:');
    lines.push('  • Use natural German, not translated English');
    lines.push('  • Default to "du" unless user uses "Sie"');
    lines.push('  • No English filler words (basically, actually, etc.)');
  } else if (authority.language === 'es') {
    lines.push('');
    lines.push('SPANISH SPECIFICS:');
    lines.push('  • Use natural Spanish, not translated English');
    lines.push('  • Default to "tú" unless user uses "usted"');
    lines.push('  • No English filler words');
  }
  
  lines.push('');
  
  return lines.join('\n');
}

// ============================================================================
// CLEANUP
// ============================================================================

export function cleanupExpiredSessions(): number {
  const now = Date.now();
  const ttl = 60 * 60 * 1000; // 1 hour
  let cleaned = 0;
  
  for (const [id, session] of sessionLanguageStore) {
    if (now - session.setAt > ttl) {
      sessionLanguageStore.delete(id);
      cleaned++;
    }
  }
  
  return cleaned;
}

setInterval(cleanupExpiredSessions, 15 * 60 * 1000); // Every 15 minutes

// ============================================================================
// EXPORTS
// ============================================================================

export {
  LANGUAGE_MARKERS,
  LANGUAGE_COMMANDS,
  detectLanguage as detectMessageLanguage,
  detectMixedLanguage as detectMixedInput,
  resolveLanguageAuthority as resolveLanguage,
  validateLanguage as validateOutputLanguage,
};
