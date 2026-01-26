/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     💎 UNBREAKABLE RENDERER ENVELOPE                                         ║
 * ║                                                                               ║
 * ║   The final, production-grade output schema that makes validation trivial.   ║
 * ║                                                                               ║
 * ║   INCLUDES:                                                                   ║
 * ║   - claims_used[] (explicit, not inferred)                                   ║
 * ║   - tone_flags (confidence-aligned phrasing)                                 ║
 * ║   - time_bounds_used (freshness disclosure)                                  ║
 * ║   - coverage_disclosure (what data we don't have)                            ║
 * ║   - invalidations[] (what would change the analysis)                         ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - The final form                                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../../utils/logger';
import type { StructuredClaim, ClaimType } from './structured-claims';
import type { ToneFlags, ToneLevel } from './presentation-contract';
import { validateAllClaims } from './structured-claims';
import { checkTimeCoherence, generateTimeBounds, type TimeBounds } from './time-coherence';
import { enforcePresentationContract, generatePresentationContract } from './presentation-contract';
import type { EvidencePack } from '../research-engine';

// ============================================================================
// THE UNBREAKABLE ENVELOPE
// ============================================================================

export interface UnbreakableEnvelope {
  // === REQUIRED FIELDS ===
  
  /** Must match the request language exactly */
  output_language: string;
  
  /** Explicit list of claims with evidence — NO regex inference */
  claims_used: StructuredClaim[];
  
  /** All numbers mentioned in final_answer, with their source */
  numbers_used: Array<{
    value: string;
    source_key: string;
    formatted: string;
  }>;
  
  /** Evidence keys actually referenced */
  facts_used: string[];
  
  /** Did we ask a question? (max 1 allowed) */
  asked_question: boolean;
  
  /** The actual chat message to show the user */
  final_answer: string;
  
  // === TONE CONTROL ===
  
  /** Tone flags that were active during generation */
  tone_applied: {
    max_certainty_level: ToneLevel;
    used_hedging: boolean;
    acknowledged_mixed_signals: boolean;
    included_time_disclosure: boolean;
  };
  
  // === TIME BOUNDS ===
  
  /** Freshness information */
  time_bounds: {
    oldest_data_age_seconds: number;
    newest_data_age_seconds: number;
    requires_disclosure: boolean;
    disclosure_text: string | null;
  };
  
  // === COVERAGE DISCLOSURE ===
  
  /** What we have and don't have */
  coverage: {
    available: string[];
    missing: string[];
    human_readable: string | null;
  };
  
  // === TRUST FEATURES ===
  
  /** What would change this analysis */
  invalidations: Array<{
    condition: string;
    consequence: string;
    evidence_key: string | null;
  }>;
  
  /** Token identity status */
  token_identity: {
    symbol: string | null;
    chain: string | null;
    is_confirmed: boolean;
    tentative_warning: string | null;
  };
  
  /** Disagreement status (if dual research) */
  disagreement: {
    meter: number;
    level: 'aligned' | 'mixed' | 'conflicting';
    acknowledgment_text: string | null;
  };
}

// ============================================================================
// ENVELOPE VALIDATION
// ============================================================================

export interface EnvelopeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  shouldRegenerate: boolean;
  autoFixable: boolean;
}

/**
 * Validate the complete envelope against all constraints
 */
export function validateUnbreakableEnvelope(
  envelope: UnbreakableEnvelope,
  evidencePack: EvidencePack,
  expectedLanguage: string
): EnvelopeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // === V1: Language Lock ===
  if (envelope.output_language !== expectedLanguage) {
    errors.push(`Language mismatch: expected ${expectedLanguage}, got ${envelope.output_language}`);
  }
  
  // === V2: Claims Validation (the key check) ===
  const claimValidation = validateAllClaims(envelope.claims_used, evidencePack);
  if (!claimValidation.allValid) {
    for (const result of claimValidation.results) {
      if (!result.valid) {
        errors.push(`Invalid claim ${result.claim.type}: ${result.issues.join(', ')}`);
      }
    }
  }
  if (claimValidation.staleClaims.length > 0) {
    warnings.push(`Stale claims: ${claimValidation.staleClaims.map(c => c.type).join(', ')}`);
  }
  
  // === V3: Numbers Grounding ===
  for (const num of envelope.numbers_used) {
    if (!envelope.final_answer.includes(num.formatted) && !envelope.final_answer.includes(num.value)) {
      warnings.push(`Number "${num.formatted}" in numbers_used not found in final_answer`);
    }
    
    // Check if source_key is valid
    if (!envelope.facts_used.includes(num.source_key)) {
      errors.push(`Number "${num.value}" claims source "${num.source_key}" but it's not in facts_used`);
    }
  }
  
  // === V4: Question Count ===
  const questionMarks = (envelope.final_answer.match(/\?/g) || []).length;
  if (questionMarks > 1) {
    errors.push(`Multiple questions (${questionMarks}). Max 1 allowed.`);
  }
  if (envelope.asked_question !== (questionMarks > 0)) {
    warnings.push('asked_question field does not match actual question presence');
  }
  
  // === V5: Time Bounds Consistency ===
  const actualTimeBounds = generateTimeBounds(evidencePack);
  if (envelope.time_bounds.requires_disclosure && !envelope.time_bounds.disclosure_text) {
    errors.push('Time disclosure required but disclosure_text is null');
  }
  if (actualTimeBounds.requiresDisclosure && !envelope.tone_applied.included_time_disclosure) {
    warnings.push('Data is stale but time disclosure not acknowledged in tone_applied');
  }
  
  // === V6: Tone Consistency ===
  const presentationInput = {
    overallConfidence: 'medium' as const, // Would come from aggregator
    disagreementMeter: envelope.disagreement.meter,
    conflictLevel: envelope.disagreement.level === 'conflicting' ? 'HIGH' as const : 
                   envelope.disagreement.level === 'mixed' ? 'MEDIUM' as const : 'NONE' as const,
    hasStaleData: claimValidation.staleClaims.length > 0,
    tokenConfirmed: envelope.token_identity.is_confirmed,
    missingModules: envelope.coverage.missing,
  };
  
  const contract = generatePresentationContract(presentationInput, expectedLanguage);
  const presentationCheck = enforcePresentationContract(envelope.final_answer, contract, expectedLanguage);
  
  for (const violation of presentationCheck.violations) {
    if (violation.severity === 'error') {
      errors.push(`Presentation: ${violation.rule} - ${violation.context}`);
    } else {
      warnings.push(`Presentation: ${violation.rule} - ${violation.context}`);
    }
  }
  
  // === V7: Coverage Consistency ===
  if (envelope.coverage.missing.length > 0 && !envelope.coverage.human_readable) {
    warnings.push('Missing modules but no human_readable coverage text');
  }
  
  // === V8: Disagreement Consistency ===
  if (envelope.disagreement.level !== 'aligned' && !envelope.disagreement.acknowledgment_text) {
    warnings.push('Disagreement exists but no acknowledgment_text');
  }
  
  // === V9: Token Identity Consistency ===
  if (!envelope.token_identity.is_confirmed && !envelope.token_identity.tentative_warning) {
    warnings.push('Token not confirmed but no tentative_warning');
  }
  
  // === V10: Invalidations Check ===
  // At least one invalidation should be present for analysis responses
  if (envelope.claims_used.length > 0 && envelope.invalidations.length === 0) {
    warnings.push('Analysis has claims but no invalidations defined');
  }
  
  const valid = errors.length === 0;
  const shouldRegenerate = errors.length > 0;
  const autoFixable = errors.length === 0 && warnings.length > 0;
  
  if (!valid) {
    logger.error('💎 Envelope validation failed', {
      errorCount: errors.length,
      warningCount: warnings.length,
      errors: errors.slice(0, 5),
    });
  }
  
  return {
    valid,
    errors,
    warnings,
    shouldRegenerate,
    autoFixable,
  };
}

// ============================================================================
// ENVELOPE SCHEMA FOR PROMPTS
// ============================================================================

export const ENVELOPE_SCHEMA_PROMPT = `
[OUTPUT SCHEMA — UNBREAKABLE ENVELOPE]

You MUST output JSON matching this exact schema. Validators will reject non-compliant output.

{
  "output_language": "<MUST match request language exactly>",
  
  "claims_used": [
    {
      "type": "<ClaimType: TOKEN_AGE | HOLDER_CONCENTRATION | SECURITY_STATUS | LIQUIDITY_STATE | PRICE_CURRENT | PRICE_CHANGE | VOLUME_STATE | etc>",
      "evidence_keys": ["<exact path in Evidence Pack, e.g. evidence.dexscreener.data.priceUsd>"],
      "value_used": "<exact value from evidence>",
      "timestamp": <unix timestamp of the evidence>,
      "confidence": "high | medium | low"
    }
  ],
  
  "numbers_used": [
    {
      "value": "<raw number, e.g. 0.00234>",
      "source_key": "<evidence path>",
      "formatted": "<how it appears in text, e.g. $0.00234>"
    }
  ],
  
  "facts_used": ["<list of all evidence.x.y.z paths referenced>"],
  
  "asked_question": <boolean, true only if final_answer contains exactly ONE question>,
  
  "final_answer": "<the actual chat message to show the user>",
  
  "tone_applied": {
    "max_certainty_level": "confident | measured | cautious | uncertain",
    "used_hedging": <boolean>,
    "acknowledged_mixed_signals": <boolean>,
    "included_time_disclosure": <boolean>
  },
  
  "time_bounds": {
    "oldest_data_age_seconds": <number>,
    "newest_data_age_seconds": <number>,
    "requires_disclosure": <boolean>,
    "disclosure_text": "<string or null, e.g. 'as of 3 minutes ago'>"
  },
  
  "coverage": {
    "available": ["<modules we have>"],
    "missing": ["<modules we don't have>"],
    "human_readable": "<string or null, e.g. 'I can see price/liquidity but don't have holder data'>"
  },
  
  "invalidations": [
    {
      "condition": "<what would change this>",
      "consequence": "<what happens if condition is true>",
      "evidence_key": "<path to watch, or null>"
    }
  ],
  
  "token_identity": {
    "symbol": "<string or null>",
    "chain": "<string or null>",
    "is_confirmed": <boolean>,
    "tentative_warning": "<string or null, shown if not confirmed>"
  },
  
  "disagreement": {
    "meter": <0-100>,
    "level": "aligned | mixed | conflicting",
    "acknowledgment_text": "<string or null, e.g. 'signals are mixed'>"
  }
}

CRITICAL RULES:
1. claims_used MUST list every factual claim type you make. If you say "3 hours old", you MUST have TOKEN_AGE in claims_used.
2. numbers_used MUST list every number in final_answer. If a number isn't listed, the validator will reject.
3. If you don't have evidence for a claim type, DO NOT make that claim. Say "don't have that data" instead.
4. If disagreement.level is not "aligned", you MUST acknowledge it in final_answer.
5. If time_bounds.requires_disclosure is true, you MUST mention data age in final_answer.
`;

// ============================================================================
// ENVELOPE BUILDER
// ============================================================================

export interface EnvelopeBuilderInput {
  finalAnswer: string;
  claims: StructuredClaim[];
  evidencePack: EvidencePack;
  language: string;
  tokenSymbol: string | null;
  tokenChain: string | null;
  tokenConfirmed: boolean;
  disagreementMeter: number;
  disagreementLevel: 'aligned' | 'mixed' | 'conflicting';
  invalidations: UnbreakableEnvelope['invalidations'];
}

/**
 * Build a complete envelope from components
 */
export function buildUnbreakableEnvelope(input: EnvelopeBuilderInput): UnbreakableEnvelope {
  const {
    finalAnswer,
    claims,
    evidencePack,
    language,
    tokenSymbol,
    tokenChain,
    tokenConfirmed,
    disagreementMeter,
    disagreementLevel,
    invalidations,
  } = input;
  
  // Extract numbers from claims
  const numbersUsed: UnbreakableEnvelope['numbers_used'] = [];
  for (const claim of claims) {
    if (typeof claim.value_used === 'number' || !isNaN(Number(claim.value_used))) {
      numbersUsed.push({
        value: String(claim.value_used),
        source_key: claim.evidence_keys[0] || '',
        formatted: formatNumber(claim.value_used),
      });
    }
  }
  
  // Extract facts used
  const factsUsed = [...new Set(claims.flatMap(c => c.evidence_keys))];
  
  // Time bounds
  const timeBounds = generateTimeBounds(evidencePack);
  
  // Time coherence
  const coherence = checkTimeCoherence(evidencePack);
  
  // Coverage
  const coverageHumanReadable = generateCoverageText(
    evidencePack.coverage.available,
    evidencePack.coverage.missing,
    language
  );
  
  // Tone
  const presentationInput = {
    overallConfidence: 'medium' as const,
    disagreementMeter,
    conflictLevel: disagreementLevel === 'conflicting' ? 'HIGH' as const :
                   disagreementLevel === 'mixed' ? 'MEDIUM' as const : 'NONE' as const,
    hasStaleData: coherence.staleModules.length > 0,
    tokenConfirmed,
    missingModules: evidencePack.coverage.missing,
  };
  const contract = generatePresentationContract(presentationInput, language);
  
  // Disagreement acknowledgment
  const disagreementAck = disagreementLevel === 'conflicting' 
    ? getDisagreementAck(language, 'high')
    : disagreementLevel === 'mixed'
    ? getDisagreementAck(language, 'medium')
    : null;
  
  // Tentative warning
  const tentativeWarning = !tokenConfirmed && tokenSymbol
    ? getTentativeWarning(tokenSymbol, tokenChain, language)
    : null;
  
  return {
    output_language: language,
    claims_used: claims,
    numbers_used: numbersUsed,
    facts_used: factsUsed,
    asked_question: finalAnswer.includes('?'),
    final_answer: finalAnswer,
    tone_applied: {
      max_certainty_level: contract.toneFlags.maxCertaintyLevel,
      used_hedging: contract.toneFlags.requireHedging,
      acknowledged_mixed_signals: disagreementLevel !== 'aligned',
      included_time_disclosure: timeBounds.requiresDisclosure,
    },
    time_bounds: {
      oldest_data_age_seconds: timeBounds.oldestDataAge,
      newest_data_age_seconds: timeBounds.newestDataAge,
      requires_disclosure: timeBounds.requiresDisclosure,
      disclosure_text: timeBounds.disclosureText,
    },
    coverage: {
      available: evidencePack.coverage.available,
      missing: evidencePack.coverage.missing,
      human_readable: coverageHumanReadable,
    },
    invalidations,
    token_identity: {
      symbol: tokenSymbol,
      chain: tokenChain,
      is_confirmed: tokenConfirmed,
      tentative_warning: tentativeWarning,
    },
    disagreement: {
      meter: disagreementMeter,
      level: disagreementLevel,
      acknowledgment_text: disagreementAck,
    },
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function formatNumber(value: string | number): string {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return String(value);
  
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  if (num < 0.01) return `$${num.toFixed(6)}`;
  return `$${num.toFixed(2)}`;
}

function generateCoverageText(available: string[], missing: string[], language: string): string | null {
  if (missing.length === 0) return null;
  
  const templates: Record<string, (a: string, m: string) => string> = {
    en: (a, m) => `I can see ${a}. I don't have ${m} right now.`,
    de: (a, m) => `Ich sehe ${a}. ${m} hab ich gerade nicht.`,
    es: (a, m) => `Puedo ver ${a}. No tengo ${m} ahora mismo.`,
  };
  
  const availableText = available.slice(0, 3).join(', ') || 'limited data';
  const missingText = missing.slice(0, 2).join(', ');
  
  const template = templates[language] || templates.en;
  return template(availableText, missingText);
}

function getDisagreementAck(language: string, level: 'medium' | 'high'): string {
  const templates: Record<string, Record<'medium' | 'high', string>> = {
    en: {
      medium: 'Signals are mixed here.',
      high: 'Research is showing conflicting views.',
    },
    de: {
      medium: 'Die Signale sind hier gemischt.',
      high: 'Die Analyse zeigt widersprüchliche Ansichten.',
    },
    es: {
      medium: 'Las señales están mezcladas.',
      high: 'El análisis muestra opiniones contradictorias.',
    },
  };
  
  const langTemplates = templates[language] || templates.en;
  return langTemplates[level];
}

function getTentativeWarning(symbol: string, chain: string | null, language: string): string {
  const templates: Record<string, string> = {
    en: `Assuming ${symbol}${chain ? ` on ${chain}` : ''}. Let me know if that's wrong.`,
    de: `Ich gehe von ${symbol}${chain ? ` auf ${chain}` : ''} aus. Sag Bescheid wenn falsch.`,
    es: `Asumo ${symbol}${chain ? ` en ${chain}` : ''}. Avísame si es incorrecto.`,
  };
  
  return templates[language] || templates.en;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ENVELOPE_SCHEMA_PROMPT as UNBREAKABLE_ENVELOPE_SCHEMA,
  buildUnbreakableEnvelope as buildEnvelope,
  validateUnbreakableEnvelope as validateEnvelope,
};
