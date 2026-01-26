/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎭 PRESENTATION CONTRACT — TONE MUST MATCH UNCERTAINTY                   ║
 * ║                                                                               ║
 * ║   Hard conflicts force cautious language.                                    ║
 * ║   Disagreement meter constrains allowed endings and phrases.                 ║
 * ║                                                                               ║
 * ║   This keeps tone aligned with uncertainty.                                  ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Final hardening                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../../utils/logger';
import type { ConfidenceLevel } from '../research-engine';

// ============================================================================
// TYPES
// ============================================================================

export type ToneLevel = 'confident' | 'measured' | 'cautious' | 'uncertain';

export interface ToneFlags {
  allowConfidentPhrases: boolean;
  allowDefinitiveStatements: boolean;
  requireHedging: boolean;
  requireMixedSignalAck: boolean;
  requireTimeDisclosure: boolean;
  maxCertaintyLevel: ToneLevel;
}

export interface AllowedEndings {
  canEndWithRecommendation: boolean;
  canEndWithPrediction: boolean;
  mustEndWithCaveat: boolean;
  suggestedEndings: string[];
}

export interface PresentationContract {
  toneFlags: ToneFlags;
  allowedEndings: AllowedEndings;
  forbiddenPhrases: string[];
  requiredDisclosures: string[];
  templateSuggestions: Record<string, string>;
}

export interface PresentationInput {
  overallConfidence: ConfidenceLevel;
  disagreementMeter: number;  // 0-100
  conflictLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  hasStaleData: boolean;
  staleDataAge?: number;       // Seconds
  tokenConfirmed: boolean;
  missingModules: string[];
}

// ============================================================================
// FORBIDDEN PHRASES BY CONFIDENCE
// ============================================================================

const CONFIDENT_PHRASES = [
  'definitely',
  'certainly',
  'absolutely',
  'clearly',
  'obviously',
  'without a doubt',
  'for sure',
  'no question',
  'guaranteed',
  'must',
  'will',
  'always',
  'never',
];

const DEFINITIVE_PHRASES = [
  'this is going to',
  'this will',
  'expect it to',
  'it\'s going to',
  'you should definitely',
  'you must',
  'don\'t miss',
  'guaranteed to',
  'can\'t fail',
  'slam dunk',
  'no-brainer',
  'easy money',
];

const OVERPROMISE_PHRASES = [
  'moon',
  'to the moon',
  '100x',
  'gem',
  'next big thing',
  'don\'t miss out',
  'early',
  'alpha',
  'insider',
];

// ============================================================================
// HEDGING PHRASES BY LANGUAGE
// ============================================================================

const HEDGING_PHRASES: Record<string, string[]> = {
  en: [
    'based on current data',
    'from what I can see',
    'signals suggest',
    'appears to be',
    'looks like',
    'the data points to',
    'could be',
    'might',
    'seems',
  ],
  de: [
    'nach aktuellen Daten',
    'soweit ich sehen kann',
    'die Signale deuten auf',
    'scheint zu sein',
    'sieht aus wie',
    'könnte sein',
    'möglicherweise',
    'vermutlich',
  ],
  es: [
    'según los datos actuales',
    'por lo que puedo ver',
    'las señales sugieren',
    'parece ser',
    'podría ser',
    'posiblemente',
    'aparentemente',
  ],
};

// ============================================================================
// MIXED SIGNAL ACKNOWLEDGMENTS
// ============================================================================

const MIXED_SIGNAL_ACK: Record<string, string[]> = {
  en: [
    'signals are mixed here',
    'research shows conflicting views',
    'not a clear-cut picture',
    'seeing mixed signals',
    'data points in different directions',
  ],
  de: [
    'die Signale sind hier gemischt',
    'die Analyse zeigt widersprüchliche Ansichten',
    'kein klares Bild',
    'gemischte Signale',
  ],
  es: [
    'las señales están mezcladas',
    'el análisis muestra opiniones contradictorias',
    'no hay una imagen clara',
    'señales mixtas',
  ],
};

// ============================================================================
// SUGGESTED ENDINGS BY CONTEXT
// ============================================================================

const CAUTIOUS_ENDINGS: Record<string, string[]> = {
  en: [
    'I\'d treat this as mixed until we get fresh data.',
    'Worth watching, but I wouldn\'t commit heavy here.',
    'Needs more confirmation before acting.',
    'Size accordingly — signals aren\'t aligned.',
    'Would wait for clearer setup.',
  ],
  de: [
    'Würde das als gemischt behandeln bis wir frische Daten haben.',
    'Wert zu beobachten, aber ich würde hier nicht groß einsteigen.',
    'Braucht mehr Bestätigung bevor man handelt.',
    'Positionsgröße entsprechend anpassen — Signale sind nicht eindeutig.',
  ],
  es: [
    'Trataría esto como mixto hasta tener datos frescos.',
    'Vale la pena observar, pero no entraría fuerte aquí.',
    'Necesita más confirmación antes de actuar.',
    'Ajusta el tamaño — las señales no están alineadas.',
  ],
};

const CONFIDENT_ENDINGS: Record<string, string[]> = {
  en: [
    'Setup looks solid. Key level to watch: [X].',
    'Thesis checks out. Main risk is [X].',
    'Looks actionable if you\'re comfortable with [X].',
  ],
  de: [
    'Setup sieht solide aus. Wichtiges Level: [X].',
    'These bestätigt sich. Hauptrisiko ist [X].',
  ],
  es: [
    'El setup se ve sólido. Nivel clave: [X].',
    'La tesis se confirma. Riesgo principal es [X].',
  ],
};

// ============================================================================
// CONTRACT GENERATOR
// ============================================================================

/**
 * Generate presentation contract based on analysis state
 */
export function generatePresentationContract(
  input: PresentationInput,
  language: string = 'en'
): PresentationContract {
  const {
    overallConfidence,
    disagreementMeter,
    conflictLevel,
    hasStaleData,
    staleDataAge,
    tokenConfirmed,
    missingModules,
  } = input;
  
  // Determine max tone level
  let maxCertaintyLevel: ToneLevel = 'confident';
  if (conflictLevel === 'HIGH' || disagreementMeter >= 50) {
    maxCertaintyLevel = 'uncertain';
  } else if (conflictLevel === 'MEDIUM' || disagreementMeter >= 30 || !tokenConfirmed) {
    maxCertaintyLevel = 'cautious';
  } else if (overallConfidence === 'low' || missingModules.length >= 2) {
    maxCertaintyLevel = 'measured';
  }
  
  // Build tone flags
  const toneFlags: ToneFlags = {
    allowConfidentPhrases: maxCertaintyLevel === 'confident',
    allowDefinitiveStatements: maxCertaintyLevel === 'confident' && overallConfidence === 'high',
    requireHedging: maxCertaintyLevel === 'cautious' || maxCertaintyLevel === 'uncertain',
    requireMixedSignalAck: conflictLevel === 'HIGH' || disagreementMeter >= 40,
    requireTimeDisclosure: hasStaleData && (staleDataAge || 0) > 120,
    maxCertaintyLevel,
  };
  
  // Build allowed endings
  const allowedEndings: AllowedEndings = {
    canEndWithRecommendation: maxCertaintyLevel !== 'uncertain',
    canEndWithPrediction: maxCertaintyLevel === 'confident',
    mustEndWithCaveat: maxCertaintyLevel === 'cautious' || maxCertaintyLevel === 'uncertain',
    suggestedEndings: maxCertaintyLevel === 'uncertain' || maxCertaintyLevel === 'cautious'
      ? CAUTIOUS_ENDINGS[language] || CAUTIOUS_ENDINGS.en
      : CONFIDENT_ENDINGS[language] || CONFIDENT_ENDINGS.en,
  };
  
  // Build forbidden phrases
  const forbiddenPhrases: string[] = [];
  if (!toneFlags.allowConfidentPhrases) {
    forbiddenPhrases.push(...CONFIDENT_PHRASES);
  }
  if (!toneFlags.allowDefinitiveStatements) {
    forbiddenPhrases.push(...DEFINITIVE_PHRASES);
  }
  // Always forbid overpromise phrases
  forbiddenPhrases.push(...OVERPROMISE_PHRASES);
  
  // Build required disclosures
  const requiredDisclosures: string[] = [];
  if (toneFlags.requireMixedSignalAck) {
    const acks = MIXED_SIGNAL_ACK[language] || MIXED_SIGNAL_ACK.en;
    requiredDisclosures.push(`MUST acknowledge mixed signals: "${acks[0]}"`);
  }
  if (toneFlags.requireTimeDisclosure && staleDataAge) {
    const minutes = Math.round(staleDataAge / 60);
    requiredDisclosures.push(`MUST mention data age: "as of ${minutes} minutes ago"`);
  }
  if (missingModules.length > 0) {
    requiredDisclosures.push(`MUST acknowledge missing: ${missingModules.join(', ')}`);
  }
  if (!tokenConfirmed) {
    requiredDisclosures.push('MUST indicate token identity is tentative');
  }
  
  // Template suggestions
  const templateSuggestions: Record<string, string> = {};
  if (toneFlags.requireHedging) {
    const hedges = HEDGING_PHRASES[language] || HEDGING_PHRASES.en;
    templateSuggestions.hedging = `Use hedging: "${hedges.slice(0, 3).join('", "')}"`;
  }
  if (toneFlags.requireMixedSignalAck) {
    const acks = MIXED_SIGNAL_ACK[language] || MIXED_SIGNAL_ACK.en;
    templateSuggestions.mixedSignal = `Acknowledge conflict: "${acks[0]}"`;
  }
  
  logger.info('🎭 Presentation contract generated', {
    maxTone: maxCertaintyLevel,
    requireHedging: toneFlags.requireHedging,
    forbiddenCount: forbiddenPhrases.length,
    disclosureCount: requiredDisclosures.length,
  });
  
  return {
    toneFlags,
    allowedEndings,
    forbiddenPhrases,
    requiredDisclosures,
    templateSuggestions,
  };
}

// ============================================================================
// CONTRACT ENFORCEMENT
// ============================================================================

export interface PresentationViolation {
  rule: string;
  severity: 'error' | 'warning';
  context: string;
  suggestion: string;
}

/**
 * Check final output against presentation contract
 */
export function enforcePresentationContract(
  finalAnswer: string,
  contract: PresentationContract,
  language: string = 'en'
): {
  compliant: boolean;
  violations: PresentationViolation[];
  autoFixSuggestions: string[];
} {
  const violations: PresentationViolation[] = [];
  const autoFixSuggestions: string[] = [];
  const lowerAnswer = finalAnswer.toLowerCase();
  
  // Check forbidden phrases
  for (const phrase of contract.forbiddenPhrases) {
    if (lowerAnswer.includes(phrase.toLowerCase())) {
      violations.push({
        rule: 'FORBIDDEN_PHRASE',
        severity: 'error',
        context: `Contains "${phrase}"`,
        suggestion: `Remove or replace "${phrase}" with hedged language`,
      });
      autoFixSuggestions.push(`Replace "${phrase}" with hedged alternative`);
    }
  }
  
  // Check required disclosures
  for (const disclosure of contract.requiredDisclosures) {
    // Extract the key concept from disclosure
    if (disclosure.includes('mixed signals')) {
      const acks = MIXED_SIGNAL_ACK[language] || MIXED_SIGNAL_ACK.en;
      const hasAck = acks.some(ack => lowerAnswer.includes(ack.toLowerCase()));
      if (!hasAck) {
        violations.push({
          rule: 'MISSING_DISCLOSURE',
          severity: 'error',
          context: 'Missing mixed signal acknowledgment',
          suggestion: `Add: "${acks[0]}"`,
        });
      }
    }
    
    if (disclosure.includes('data age')) {
      const hasTimeRef = /\b(ago|minute|hour|old|stale|fresh)\b/i.test(finalAnswer);
      if (!hasTimeRef) {
        violations.push({
          rule: 'MISSING_DISCLOSURE',
          severity: 'warning',
          context: 'Missing data freshness disclosure',
          suggestion: 'Add time reference for data age',
        });
      }
    }
    
    if (disclosure.includes('missing')) {
      const hasMissingAck = /\b(don't have|missing|no data|unavailable|without)\b/i.test(lowerAnswer);
      if (!hasMissingAck) {
        violations.push({
          rule: 'MISSING_DISCLOSURE',
          severity: 'warning',
          context: 'Missing module acknowledgment not present',
          suggestion: 'Mention what data is missing',
        });
      }
    }
  }
  
  // Check hedging requirement
  if (contract.toneFlags.requireHedging) {
    const hedges = HEDGING_PHRASES[language] || HEDGING_PHRASES.en;
    const hasHedge = hedges.some(h => lowerAnswer.includes(h.toLowerCase()));
    
    if (!hasHedge) {
      violations.push({
        rule: 'HEDGING_REQUIRED',
        severity: 'warning',
        context: 'Statement requires hedging but none found',
        suggestion: `Add hedging like: "${hedges[0]}"`,
      });
    }
  }
  
  // Check ending caveat requirement
  if (contract.allowedEndings.mustEndWithCaveat) {
    const lastSentence = finalAnswer.split(/[.!?]/).filter(s => s.trim()).pop() || '';
    const hasCaveat = /\b(if|watch|until|risk|careful|caution|wait|confirm)\b/i.test(lastSentence);
    
    if (!hasCaveat) {
      violations.push({
        rule: 'ENDING_CAVEAT_REQUIRED',
        severity: 'warning',
        context: 'Ending should include a caveat',
        suggestion: contract.allowedEndings.suggestedEndings[0] || 'Add cautionary ending',
      });
    }
  }
  
  const compliant = violations.filter(v => v.severity === 'error').length === 0;
  
  if (!compliant) {
    logger.warn('🎭 Presentation contract violations', {
      errorCount: violations.filter(v => v.severity === 'error').length,
      warningCount: violations.filter(v => v.severity === 'warning').length,
    });
  }
  
  return {
    compliant,
    violations,
    autoFixSuggestions,
  };
}

// ============================================================================
// RENDERER PROMPT SECTION
// ============================================================================

/**
 * Generate the presentation rules section for the renderer prompt
 */
export function generatePresentationPromptSection(
  contract: PresentationContract,
  language: string
): string {
  const lines: string[] = [
    '[PRESENTATION RULES — TONE MUST MATCH UNCERTAINTY]',
    '',
  ];
  
  lines.push(`Max certainty level: ${contract.toneFlags.maxCertaintyLevel.toUpperCase()}`);
  
  if (contract.forbiddenPhrases.length > 0) {
    lines.push('');
    lines.push('FORBIDDEN (will cause rejection):');
    lines.push(contract.forbiddenPhrases.slice(0, 10).map(p => `  - "${p}"`).join('\n'));
    if (contract.forbiddenPhrases.length > 10) {
      lines.push(`  ... and ${contract.forbiddenPhrases.length - 10} more`);
    }
  }
  
  if (contract.requiredDisclosures.length > 0) {
    lines.push('');
    lines.push('REQUIRED DISCLOSURES:');
    contract.requiredDisclosures.forEach(d => lines.push(`  - ${d}`));
  }
  
  if (contract.toneFlags.requireHedging) {
    const hedges = HEDGING_PHRASES[language] || HEDGING_PHRASES.en;
    lines.push('');
    lines.push('HEDGING REQUIRED — Use phrases like:');
    lines.push(`  "${hedges.slice(0, 3).join('", "')}"`);
  }
  
  if (contract.allowedEndings.mustEndWithCaveat) {
    lines.push('');
    lines.push('ENDING MUST INCLUDE CAVEAT. Suggested:');
    lines.push(`  "${contract.allowedEndings.suggestedEndings[0]}"`);
  }
  
  lines.push('');
  
  return lines.join('\n');
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  CONFIDENT_PHRASES,
  DEFINITIVE_PHRASES,
  OVERPROMISE_PHRASES,
  HEDGING_PHRASES,
  MIXED_SIGNAL_ACK,
  CAUTIOUS_ENDINGS,
  CONFIDENT_ENDINGS,
};
