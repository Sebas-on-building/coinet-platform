/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🗣️ DIALOGUE CONTRACT — HUMAN VOICE, MACHINE-ENFORCED                     ║
 * ║                                                                               ║
 * ║   Makes the AI sound like a real person across EN/DE/ES without phrase bans. ║
 * ║   Behavioral enforcement, not lexical blacklists.                            ║
 * ║                                                                               ║
 * ║   ENFORCES:                                                                   ║
 * ║   - No repetitive openers ("Got you —", "Alright —")                         ║
 * ║   - Register matches language norms (DE: no random English scaffolding)      ║
 * ║   - Slang mirroring only if user opts in                                     ║
 * ║   - Continuity with conversation context                                     ║
 * ║   - One question max, and only if necessary                                  ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Final human voice layer                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export type DialogueRegister = 'casual' | 'professional' | 'technical' | 'friendly_expert';
export type FormalityLevel = 'du' | 'Sie' | 'tu' | 'usted' | 'informal' | 'formal';
export type EmojiLevel = 'none' | 'minimal' | 'moderate';
export type QuestionType = 'clarifier' | 'confirmation' | 'next_step' | 'rhetorical' | 'none';

export interface DialogueStyle {
  /** Unique opener ID to prevent repetition */
  opener_id: string | null;
  
  /** Conversational register */
  register: DialogueRegister;
  
  /** Is casual slang allowed? */
  slang_allowed: boolean;
  
  /** Formality level (language-specific) */
  formality: FormalityLevel;
  
  /** Emoji usage level */
  emoji_level: EmojiLevel;
}

export interface DialogueContinuity {
  /** Does this response reference the user's last message? */
  references_last_user_message: boolean;
  
  /** Does this reference the token being discussed? */
  referenced_token: boolean;
  
  /** Explicit callback to something user said */
  user_phrase_echoed: string | null;
}

export interface DialogueQuestion {
  /** Number of questions (should be 0 or 1) */
  count: number;
  
  /** Is the question necessary or can it be removed? */
  is_necessary: boolean;
  
  /** Type of question */
  type: QuestionType;
  
  /** The actual question text */
  text: string | null;
}

export interface AntiTemplate {
  /** Phrases reused from last N responses (must be empty to pass) */
  reused_phrases_from_recent: string[];
  
  /** Known template openers detected */
  template_openers_detected: string[];
  
  /** Mixed-language scaffolding detected */
  mixed_language_scaffolding: string[];
}

export interface DialogueContract {
  style: DialogueStyle;
  continuity: DialogueContinuity;
  question: DialogueQuestion;
  anti_template: AntiTemplate;
}

// ============================================================================
// OPENER REGISTRY (PREVENT REPETITION)
// ============================================================================

/**
 * Known template openers that should be flagged
 */
const TEMPLATE_OPENERS: Record<string, RegExp[]> = {
  en: [
    /^(got you|got it|alright|okay so|keeping it short|here'?s what|let me|building on)/i,
    /^(so basically|well|right so|to summarize|in short)/i,
    /^(looking at|based on|from what i can see|the data shows)/i,
  ],
  de: [
    /^(also|gut|okay|alles klar|hier ist|lass mich|zusammenfassend)/i,
    /^(schauen wir|basierend auf|nach den daten)/i,
    /^(kurz gesagt|im grunde|grundsätzlich)/i,
  ],
  es: [
    /^(bueno|vale|okay|mira|aquí está|déjame|resumiendo)/i,
    /^(básicamente|en resumen|según los datos)/i,
    /^(lo que veo es|mirando los datos)/i,
  ],
};

/**
 * Good, varied openers per language (examples)
 */
const NATURAL_OPENERS: Record<string, string[]> = {
  en: [
    '', // No opener, just start
    'Yeah,',
    'So,',
    'Quick take:',
    'Hmm,',
    'Interesting —',
    'Not gonna lie,',
  ],
  de: [
    '',
    'Ja,',
    'Also,',
    'Hmm,',
    'Interessant —',
    'Ehrlich gesagt,',
    'Kurz:',
  ],
  es: [
    '',
    'Sí,',
    'Bueno,',
    'Hmm,',
    'Interesante —',
    'La verdad,',
    'Rápido:',
  ],
};

// Store recent openers per conversation
const recentOpenersStore = new Map<string, string[]>();
const MAX_RECENT_OPENERS = 5;

export function recordOpener(conversationId: string, opener: string): void {
  const recent = recentOpenersStore.get(conversationId) || [];
  recent.push(opener.toLowerCase().trim());
  if (recent.length > MAX_RECENT_OPENERS) {
    recent.shift();
  }
  recentOpenersStore.set(conversationId, recent);
}

export function getRecentOpeners(conversationId: string): string[] {
  return recentOpenersStore.get(conversationId) || [];
}

export function isOpenerRepeated(conversationId: string, opener: string): boolean {
  const recent = getRecentOpeners(conversationId);
  const normalized = opener.toLowerCase().trim();
  return recent.includes(normalized);
}

// ============================================================================
// MIXED-LANGUAGE SCAFFOLDING DETECTION
// ============================================================================

/**
 * Detect English scaffolding in non-English text
 */
const ENGLISH_SCAFFOLDING = [
  /\b(keeping it short|here's the deal|bottom line|quick take|let me break|got you|alright so)\b/i,
  /\b(based on|looking at|from what i can see|the data shows)\b/i,
  /\b(first off|secondly|lastly|to wrap up|in conclusion)\b/i,
];

/**
 * Detect when non-English response has English glue phrases
 */
export function detectMixedLanguageScaffolding(
  text: string,
  expectedLanguage: string
): string[] {
  if (expectedLanguage === 'en') return [];
  
  const detected: string[] = [];
  
  for (const pattern of ENGLISH_SCAFFOLDING) {
    const match = text.match(pattern);
    if (match) {
      detected.push(match[0]);
    }
  }
  
  return detected;
}

// ============================================================================
// REGISTER ENFORCEMENT
// ============================================================================

/**
 * Language-specific register rules
 */
export interface RegisterRules {
  allowedFormalities: FormalityLevel[];
  forbiddenPatterns: RegExp[];
  requiredPatterns?: RegExp[];
}

const REGISTER_RULES: Record<string, Record<DialogueRegister, RegisterRules>> = {
  de: {
    casual: {
      allowedFormalities: ['du'],
      forbiddenPatterns: [/\bSie\b/, /\bIhnen\b/, /\bIhr\b/],
    },
    professional: {
      allowedFormalities: ['Sie'],
      forbiddenPatterns: [/\bdu\b/, /\bdich\b/, /\bdir\b/],
    },
    technical: {
      allowedFormalities: ['du', 'Sie'],
      forbiddenPatterns: [],
    },
    friendly_expert: {
      allowedFormalities: ['du'],
      forbiddenPatterns: [],
    },
  },
  es: {
    casual: {
      allowedFormalities: ['tu', 'informal'],
      forbiddenPatterns: [/\busted\b/i],
    },
    professional: {
      allowedFormalities: ['usted', 'formal'],
      forbiddenPatterns: [],
    },
    technical: {
      allowedFormalities: ['tu', 'usted', 'informal', 'formal'],
      forbiddenPatterns: [],
    },
    friendly_expert: {
      allowedFormalities: ['tu', 'informal'],
      forbiddenPatterns: [],
    },
  },
  en: {
    casual: {
      allowedFormalities: ['informal'],
      forbiddenPatterns: [],
    },
    professional: {
      allowedFormalities: ['formal'],
      forbiddenPatterns: [],
    },
    technical: {
      allowedFormalities: ['informal', 'formal'],
      forbiddenPatterns: [],
    },
    friendly_expert: {
      allowedFormalities: ['informal'],
      forbiddenPatterns: [],
    },
  },
};

export function checkRegisterCompliance(
  text: string,
  language: string,
  register: DialogueRegister,
  formality: FormalityLevel
): { compliant: boolean; violations: string[] } {
  const rules = REGISTER_RULES[language]?.[register];
  if (!rules) {
    return { compliant: true, violations: [] };
  }
  
  const violations: string[] = [];
  
  // Check formality is allowed
  if (!rules.allowedFormalities.includes(formality)) {
    violations.push(`Formality "${formality}" not allowed for register "${register}" in ${language}`);
  }
  
  // Check forbidden patterns
  for (const pattern of rules.forbiddenPatterns) {
    if (pattern.test(text)) {
      violations.push(`Register violation: found "${text.match(pattern)?.[0]}" which is forbidden in ${register} register`);
    }
  }
  
  return {
    compliant: violations.length === 0,
    violations,
  };
}

// ============================================================================
// SLANG DETECTION
// ============================================================================

const SLANG_PATTERNS: Record<string, RegExp[]> = {
  en: [
    /\b(dude|bro|bruh|homie|fam|lit|fire|sick|dope|legit|lowkey|highkey|ngl|tbh|imo|lmao|lol)\b/i,
    /\b(ape|degen|rekt|wagmi|ngmi|gm|ser|fren)\b/i, // Crypto slang
  ],
  de: [
    /\b(digga|alter|krass|geil|mega|hammer|nice|cool|chillen|abgehen)\b/i,
    /\b(brudi|moin|ey|jo|yolo)\b/i,
  ],
  es: [
    /\b(tío|papi|cabrón|mola|flipar|guay|currar|molar|flipa)\b/i,
    /\b(chaval|colega|crack|bestia|brutal)\b/i,
  ],
};

export function detectSlang(text: string, language: string): string[] {
  const patterns = SLANG_PATTERNS[language] || [];
  const detected: string[] = [];
  
  for (const pattern of patterns) {
    const matches = text.match(new RegExp(pattern, 'gi'));
    if (matches) {
      detected.push(...matches);
    }
  }
  
  return [...new Set(detected)];
}

// ============================================================================
// QUESTION ANALYSIS
// ============================================================================

export function analyzeQuestion(text: string): DialogueQuestion {
  const questionMarks = (text.match(/\?/g) || []).length;
  
  if (questionMarks === 0) {
    return { count: 0, is_necessary: true, type: 'none', text: null };
  }
  
  // Extract questions
  const sentences = text.split(/(?<=[.!?])\s+/);
  const questionSentences = sentences.filter(s => s.includes('?'));
  
  if (questionSentences.length === 0) {
    return { count: questionMarks, is_necessary: true, type: 'none', text: null };
  }
  
  const questionText = questionSentences[0];
  
  // Classify question type
  let type: QuestionType = 'next_step';
  
  // Clarifier: asking for missing info
  if (/\b(which|what|where|how)\s+(chain|address|token|one)\b/i.test(questionText)) {
    type = 'clarifier';
  }
  // Confirmation: checking understanding
  else if (/\b(right|correct|is that|did you mean|you mean)\b/i.test(questionText)) {
    type = 'confirmation';
  }
  // Rhetorical: not expecting answer
  else if (/\b(isn't it|right\?|no\?|yeah\?)\s*$/i.test(questionText)) {
    type = 'rhetorical';
  }
  // Next step: menu-like questions
  else if (/\b(want|should i|shall i|would you like|do you want)\b/i.test(questionText)) {
    type = 'next_step';
  }
  
  // Is it necessary?
  const isNecessary = type === 'clarifier' || type === 'confirmation';
  
  return {
    count: questionMarks,
    is_necessary: isNecessary,
    type,
    text: questionText,
  };
}

// ============================================================================
// CONTINUITY CHECK
// ============================================================================

export function checkContinuity(
  response: string,
  lastUserMessage: string,
  tokenSymbol: string | null
): DialogueContinuity {
  const responseLower = response.toLowerCase();
  const userLower = lastUserMessage.toLowerCase();
  
  // Check for token reference
  const referencedToken = tokenSymbol 
    ? responseLower.includes(tokenSymbol.toLowerCase()) || responseLower.includes('$' + tokenSymbol.toLowerCase())
    : false;
  
  // Check for echo of user's phrase (good for continuity)
  let userPhraseEchoed: string | null = null;
  
  // Extract potential echoes (2-4 word phrases from user that appear in response)
  const userWords = userLower.split(/\s+/).filter(w => w.length > 3);
  for (let i = 0; i < userWords.length - 1; i++) {
    const phrase = `${userWords[i]} ${userWords[i + 1]}`;
    if (responseLower.includes(phrase) && phrase.length > 8) {
      userPhraseEchoed = phrase;
      break;
    }
  }
  
  // Check if response addresses user's question/statement
  const referencesLastMessage = 
    userPhraseEchoed !== null ||
    (userLower.includes('?') && !response.includes('?')) || // User asked, we answered
    responseLower.includes('you') || // Direct address
    responseLower.includes('your');
  
  return {
    references_last_user_message: referencesLastMessage,
    referenced_token: referencedToken,
    user_phrase_echoed: userPhraseEchoed,
  };
}

// ============================================================================
// ANTI-TEMPLATE DETECTION
// ============================================================================

export function detectTemplateIssues(
  response: string,
  language: string,
  conversationId: string
): AntiTemplate {
  const reusedPhrases: string[] = [];
  const templateOpenersDetected: string[] = [];
  const mixedScaffolding: string[] = [];
  
  // Check template openers
  const openerPatterns = TEMPLATE_OPENERS[language] || TEMPLATE_OPENERS.en;
  for (const pattern of openerPatterns) {
    const match = response.match(pattern);
    if (match) {
      templateOpenersDetected.push(match[0]);
    }
  }
  
  // Check for reused openers from recent responses
  const recentOpeners = getRecentOpeners(conversationId);
  const firstLine = response.split(/[.!?\n]/)[0]?.toLowerCase().trim() || '';
  
  for (const recent of recentOpeners) {
    // Similarity check: if first 20 chars match closely
    if (recent.length > 5 && firstLine.startsWith(recent.substring(0, Math.min(20, recent.length)))) {
      reusedPhrases.push(recent);
    }
  }
  
  // Check mixed-language scaffolding
  mixedScaffolding.push(...detectMixedLanguageScaffolding(response, language));
  
  return {
    reused_phrases_from_recent: reusedPhrases,
    template_openers_detected: templateOpenersDetected,
    mixed_language_scaffolding: mixedScaffolding,
  };
}

// ============================================================================
// MAIN DIALOGUE CONTRACT GENERATION
// ============================================================================

export interface DialogueContractInput {
  language: string;
  userPreferences?: {
    formality?: FormalityLevel;
    slangAllowed?: boolean;
    emojiLevel?: EmojiLevel;
  };
  conversationContext?: {
    turnCount: number;
    lastUserMessage: string;
    tokenSymbol: string | null;
  };
}

/**
 * Generate the dialogue contract constraints for the renderer
 */
export function generateDialogueContract(input: DialogueContractInput): {
  style: Partial<DialogueStyle>;
  constraints: string[];
  naturalOpeners: string[];
} {
  const { language, userPreferences, conversationContext } = input;
  
  // Default style based on language
  const defaultFormality: FormalityLevel = language === 'de' ? 'du' : language === 'es' ? 'tu' : 'informal';
  
  const style: Partial<DialogueStyle> = {
    register: 'friendly_expert',
    slang_allowed: userPreferences?.slangAllowed ?? false,
    formality: userPreferences?.formality ?? defaultFormality,
    emoji_level: userPreferences?.emojiLevel ?? 'none',
  };
  
  const constraints: string[] = [];
  
  // Language-specific constraints
  if (language === 'de') {
    constraints.push('Use "du" form unless user uses "Sie"');
    constraints.push('NO English scaffolding phrases (keeping it short, here\'s the deal, etc.)');
    constraints.push('Sound like a German-speaking trader friend, not a translated American');
  } else if (language === 'es') {
    constraints.push('Use "tú" form unless user uses "usted"');
    constraints.push('NO English scaffolding phrases');
    constraints.push('Sound like a Spanish-speaking trader, not translated');
  }
  
  // Universal constraints
  constraints.push('NO template openers (Got you, Alright, Keeping it short)');
  constraints.push('If you start with a word, vary it from recent responses');
  constraints.push('At most ONE question, and only if truly necessary (clarifier or confirmation)');
  constraints.push('No menu questions (Want A or B? Should I elaborate?)');
  
  // Slang constraints
  if (!style.slang_allowed) {
    constraints.push('NO casual slang (bro, dude, papi, digga, etc.) unless user uses it first');
  }
  
  // Emoji constraints
  if (style.emoji_level === 'none') {
    constraints.push('NO emojis');
  } else if (style.emoji_level === 'minimal') {
    constraints.push('Max 1 emoji, only if adds meaning');
  }
  
  // Get natural openers (excluding recently used)
  const recentOpeners = conversationContext 
    ? getRecentOpeners(conversationContext.lastUserMessage.substring(0, 20)) // Use a proxy for conversation ID
    : [];
  
  const allOpeners = NATURAL_OPENERS[language] || NATURAL_OPENERS.en;
  const naturalOpeners = allOpeners.filter(o => !recentOpeners.includes(o.toLowerCase()));
  
  return { style, constraints, naturalOpeners };
}

// ============================================================================
// DIALOGUE CONTRACT VALIDATION
// ============================================================================

export interface DialogueValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  shouldRegenerate: boolean;
}

export function validateDialogueContract(
  response: string,
  contract: DialogueContract,
  expectedLanguage: string,
  conversationId: string
): DialogueValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check anti-template
  if (contract.anti_template.reused_phrases_from_recent.length > 0) {
    errors.push(`Reused opener from recent responses: "${contract.anti_template.reused_phrases_from_recent[0]}"`);
  }
  
  if (contract.anti_template.template_openers_detected.length > 0) {
    warnings.push(`Template opener detected: "${contract.anti_template.template_openers_detected[0]}"`);
  }
  
  if (contract.anti_template.mixed_language_scaffolding.length > 0) {
    errors.push(`English scaffolding in ${expectedLanguage} response: "${contract.anti_template.mixed_language_scaffolding[0]}"`);
  }
  
  // Check question
  if (contract.question.count > 1) {
    errors.push(`Multiple questions (${contract.question.count}). Max 1 allowed.`);
  }
  
  if (contract.question.count === 1 && !contract.question.is_necessary) {
    if (contract.question.type === 'next_step') {
      errors.push('Unnecessary menu-style question detected');
    } else {
      warnings.push('Question may not be necessary');
    }
  }
  
  // Check register compliance
  const registerCheck = checkRegisterCompliance(
    response,
    expectedLanguage,
    contract.style.register,
    contract.style.formality
  );
  
  for (const violation of registerCheck.violations) {
    warnings.push(violation);
  }
  
  // Check slang if not allowed
  if (!contract.style.slang_allowed) {
    const slang = detectSlang(response, expectedLanguage);
    if (slang.length > 0) {
      warnings.push(`Slang detected but not allowed: ${slang.join(', ')}`);
    }
  }
  
  // Check emoji level
  const emojiCount = (response.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  if (contract.style.emoji_level === 'none' && emojiCount > 0) {
    warnings.push(`Emojis used but emoji_level is "none"`);
  } else if (contract.style.emoji_level === 'minimal' && emojiCount > 1) {
    warnings.push(`Too many emojis (${emojiCount}) for "minimal" level`);
  }
  
  const valid = errors.length === 0;
  const shouldRegenerate = errors.some(e => 
    e.includes('Reused opener') || 
    e.includes('Multiple questions') ||
    e.includes('English scaffolding') ||
    e.includes('menu-style')
  );
  
  if (!valid) {
    logger.warn('🗣️ Dialogue contract violations', {
      errorCount: errors.length,
      warningCount: warnings.length,
      errors: errors.slice(0, 3),
    });
  }
  
  return { valid, errors, warnings, shouldRegenerate };
}

// ============================================================================
// BUILD DIALOGUE CONTRACT FROM RESPONSE
// ============================================================================

export function buildDialogueContract(
  response: string,
  language: string,
  conversationId: string,
  lastUserMessage: string,
  tokenSymbol: string | null,
  userPreferences?: {
    formality?: FormalityLevel;
    slangAllowed?: boolean;
    emojiLevel?: EmojiLevel;
  }
): DialogueContract {
  // Detect opener
  const firstLine = response.split(/[.!?\n]/)[0] || '';
  const opener = firstLine.split(/\s+/).slice(0, 3).join(' ');
  
  // Build style
  const style: DialogueStyle = {
    opener_id: opener.toLowerCase(),
    register: 'friendly_expert',
    slang_allowed: userPreferences?.slangAllowed ?? false,
    formality: userPreferences?.formality ?? (language === 'de' ? 'du' : language === 'es' ? 'tu' : 'informal'),
    emoji_level: userPreferences?.emojiLevel ?? 'none',
  };
  
  // Build continuity
  const continuity = checkContinuity(response, lastUserMessage, tokenSymbol);
  
  // Build question analysis
  const question = analyzeQuestion(response);
  
  // Build anti-template
  const antiTemplate = detectTemplateIssues(response, language, conversationId);
  
  return {
    style,
    continuity,
    question,
    anti_template: antiTemplate,
  };
}

// ============================================================================
// PROMPT SECTION FOR RENDERER
// ============================================================================

export function generateDialoguePromptSection(
  language: string,
  conversationId: string,
  lastUserMessage: string,
  tokenSymbol: string | null
): string {
  const contractInput: DialogueContractInput = {
    language,
    conversationContext: {
      turnCount: getRecentOpeners(conversationId).length,
      lastUserMessage,
      tokenSymbol,
    },
  };
  
  const { constraints, naturalOpeners } = generateDialogueContract(contractInput);
  
  const lines: string[] = [
    '[DIALOGUE CONTRACT — SOUND HUMAN]',
    '',
    'CONSTRAINTS:',
    ...constraints.map(c => `  • ${c}`),
    '',
    'GOOD OPENERS (vary these):',
    ...naturalOpeners.slice(0, 5).map(o => o ? `  "${o}"` : '  (no opener, just start)'),
    '',
    'BAD OPENERS (will cause rejection):',
    '  "Got you —"',
    '  "Alright —"',
    '  "Keeping it short:"',
    '  "Here\'s what I found:"',
    '',
  ];
  
  if (language !== 'en') {
    lines.push(`CRITICAL FOR ${language.toUpperCase()}:`);
    lines.push(`  Write like a native ${language === 'de' ? 'German' : 'Spanish'}-speaking trader.`);
    lines.push('  NO English glue phrases (keeping it short, here\'s the deal, based on, etc.)');
    lines.push('');
  }
  
  return lines.join('\n');
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  TEMPLATE_OPENERS,
  NATURAL_OPENERS,
  SLANG_PATTERNS,
  REGISTER_RULES,
  recordOpener as recordDialogueOpener,
  getRecentOpeners as getRecentDialogueOpeners,
};
