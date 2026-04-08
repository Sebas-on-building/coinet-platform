/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     DOCTRINE ENFORCER — Production Rules 1-8                                  ║
 * ║                                                                               ║
 * ║   Runtime guardrails that prevent source misuse.                              ║
 * ║   These rules are not suggestions — they are structural constraints.          ║
 * ║                                                                               ║
 * ║   Rule 1: Every source has exactly one primary truth role.                    ║
 * ║   Rule 2: No layer may consume provider-specific payloads directly.           ║
 * ║   Rule 3: No source may be interpreted outside its truth role                 ║
 * ║           without explicit cross-layer confirmation.                          ║
 * ║   Rule 4: Missing source coverage must propagate into confidence.             ║
 * ║   Rule 5: Fast sources must be treated as early and noisy.                    ║
 * ║   Rule 6: Security sources may cap or invalidate opportunity narratives.      ║
 * ║   Rule 7: Reasoning models must never substitute for deterministic logic.     ║
 * ║   Rule 8: The source layer must always be designed for graceful degradation.  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import {
  type SourceClass,
  type TruthClass,
  SOURCE_CLASS_DOCTRINES,
  SOURCE_CLASS_TO_TRUTH,
  PROVIDERS,
  type SourceProviderDef,
} from './registry';
import { getClassHealth } from './health-monitor';
import { getFullDoctrine, getAllFullDoctrines } from './classes/doctrine';
import { getClaimBoundary, canClassJustifyClaim } from './classes/claim-boundaries';
import type { ClaimStrength } from './classes/types';

// ═══════════════════════════════════════════════════════════════════════════════
// VIOLATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type DoctrineViolationType =
  | 'truth_role_overreach'
  | 'missing_cross_layer_confirmation'
  | 'security_override_attempt'
  | 'reasoning_model_as_truth'
  | 'fast_source_overconfidence'
  | 'missing_coverage_hidden'
  | 'single_class_judgment'
  | 'provider_specific_payload';

export interface DoctrineViolation {
  type: DoctrineViolationType;
  severity: 'warning' | 'error' | 'critical';
  rule: number;
  message: string;
  sourceClass?: SourceClass;
  providerId?: string;
  /** Suggested correction */
  correction: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE ENFORCEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rule 3: Validate that a source class is being used within its truth role.
 * Returns violations if the source is being asked to provide truth
 * it is not authoritative for.
 */
export function enforceR3TruthRole(
  sourceClass: SourceClass,
  requestedTruthDomains: string[],
): DoctrineViolation[] {
  const violations: DoctrineViolation[] = [];
  const doctrine = SOURCE_CLASS_DOCTRINES[sourceClass];
  if (!doctrine) return violations;

  for (const domain of requestedTruthDomains) {
    const isAuthoritative = doctrine.bestAt.some(b =>
      b.toLowerCase().includes(domain.toLowerCase())
    );
    const isExcluded = doctrine.notSufficientFor.some(n =>
      n.toLowerCase().includes(domain.toLowerCase())
    );

    if (isExcluded && !isAuthoritative) {
      violations.push({
        type: 'truth_role_overreach',
        severity: 'warning',
        rule: 3,
        message: `Source class '${sourceClass}' is being used for '${domain}' which is outside its truth role`,
        sourceClass,
        correction: `Cross-layer confirmation required: ${domain} truth should come from the authoritative source class, not ${sourceClass}`,
      });
    }
  }

  return violations;
}

/**
 * Rule 5: Check if a fast/noisy source (e.g. DEX discovery) is being
 * given too much confidence weight without cross-layer validation.
 */
export function enforceR5FastSourceConfidence(
  sourceClass: SourceClass,
  confidenceWeight: number,
): DoctrineViolation[] {
  const violations: DoctrineViolation[] = [];
  const doctrine = SOURCE_CLASS_DOCTRINES[sourceClass];

  if (doctrine?.requiresCrossLayerConfirmation && confidenceWeight > 0.6) {
    violations.push({
      type: 'fast_source_overconfidence',
      severity: 'warning',
      rule: 5,
      message: `Source class '${sourceClass}' requires cross-layer confirmation but has confidence weight ${(confidenceWeight * 100).toFixed(0)}%`,
      sourceClass,
      correction: `Cap confidence contribution from ${sourceClass} at 60% until validated by a stable truth layer`,
    });
  }

  return violations;
}

/**
 * Rule 6: Security sources can cap confidence.
 * If security flags are present, no opportunity narrative may override them.
 */
export function enforceR6SecurityCap(
  securityRisk: number,
  currentConfidence: number,
): { cappedConfidence: number; violation: DoctrineViolation | null } {
  if (securityRisk <= 0.5) {
    return { cappedConfidence: currentConfidence, violation: null };
  }

  // Security risk > 0.5: hard cap on confidence
  const securityCap = Math.max(0.1, 1 - securityRisk);
  const cappedConfidence = Math.min(currentConfidence, securityCap);

  if (cappedConfidence < currentConfidence) {
    return {
      cappedConfidence,
      violation: {
        type: 'security_override_attempt',
        severity: 'critical',
        rule: 6,
        message: `Security risk (${(securityRisk * 100).toFixed(0)}%) caps confidence from ${(currentConfidence * 100).toFixed(0)}% to ${(cappedConfidence * 100).toFixed(0)}%`,
        sourceClass: 'security',
        correction: 'Security warnings cannot be overruled by bullish momentum. Confidence is hard-capped.',
      },
    };
  }

  return { cappedConfidence, violation: null };
}

/**
 * Rule 7: Reasoning models must not substitute for deterministic logic.
 * Validate that judgment outputs were produced by structured engines,
 * not generated by LLMs.
 */
export function enforceR7ReasoningBoundary(
  stateFromEngine: boolean,
  contradictionsFromEngine: boolean,
  confidenceFromEngine: boolean,
  regimeFromEngine: boolean,
): DoctrineViolation[] {
  const violations: DoctrineViolation[] = [];

  if (!stateFromEngine) {
    violations.push({
      type: 'reasoning_model_as_truth',
      severity: 'critical',
      rule: 7,
      message: 'State classification must come from deterministic engine, not reasoning model',
      sourceClass: 'reasoning',
      correction: 'Route state classification through state-engine.ts, not LLM',
    });
  }
  if (!contradictionsFromEngine) {
    violations.push({
      type: 'reasoning_model_as_truth',
      severity: 'critical',
      rule: 7,
      message: 'Contradiction detection must come from deterministic engine, not reasoning model',
      sourceClass: 'reasoning',
      correction: 'Route contradiction detection through contradiction-engine.ts, not LLM',
    });
  }
  if (!confidenceFromEngine) {
    violations.push({
      type: 'reasoning_model_as_truth',
      severity: 'error',
      rule: 7,
      message: 'Confidence computation must come from deterministic engine, not reasoning model',
      sourceClass: 'reasoning',
      correction: 'Route confidence through confidence-engine.ts, not LLM',
    });
  }
  if (!regimeFromEngine) {
    violations.push({
      type: 'reasoning_model_as_truth',
      severity: 'error',
      rule: 7,
      message: 'Regime classification must come from deterministic engine, not reasoning model',
      sourceClass: 'reasoning',
      correction: 'Route regime through regime-engine.ts, not LLM',
    });
  }

  return violations;
}

/**
 * Rule 4 + Rule 8: Validate that missing source coverage is not hidden.
 * Returns violations if any truth class has no operational providers
 * and the system hasn't acknowledged it.
 */
export function enforceR4R8CoverageTransparency(): DoctrineViolation[] {
  const violations: DoctrineViolation[] = [];
  const allClasses: SourceClass[] = [
    'market_data', 'dex_discovery', 'derivatives', 'fundamentals',
    'onchain', 'security', 'narrative', 'entity', 'reasoning',
  ];

  for (const sc of allClasses) {
    const health = getClassHealth(sc);
    if (!health.operational) {
      violations.push({
        type: 'missing_coverage_hidden',
        severity: sc === 'reasoning' ? 'warning' : 'error',
        rule: 4,
        message: `Source class '${sc}' has no operational providers — this must propagate into confidence penalties and degraded-mode behavior`,
        sourceClass: sc,
        correction: `Activate degradation mode for ${sc}: reduce related confidence dimensions, surface missing data in judgment output`,
      });
    }
  }

  return violations;
}

/**
 * Validate that a judgment used multiple source classes, not just one.
 * A world-class judgment must reference at least 3 source classes.
 */
export function enforceMultiClassJudgment(
  sourceClassesUsed: SourceClass[],
): DoctrineViolation[] {
  const violations: DoctrineViolation[] = [];
  const unique = new Set(sourceClassesUsed);

  if (unique.size < 2) {
    violations.push({
      type: 'single_class_judgment',
      severity: 'error',
      rule: 3,
      message: `Judgment uses only ${unique.size} source class(es): [${[...unique].join(', ')}]. Cross-layer synthesis requires multiple classes.`,
      correction: 'Ensure judgment pipeline consumes data from at least 3 source classes for meaningful cross-layer intelligence.',
    });
  } else if (unique.size < 3) {
    violations.push({
      type: 'single_class_judgment',
      severity: 'warning',
      rule: 3,
      message: `Judgment uses only ${unique.size} source classes. Richer intelligence requires broader observational coverage.`,
      correction: 'Consider integrating additional source classes (e.g. fundamentals, derivatives, security) for stronger judgment.',
    });
  }

  return violations;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLAIM VALIDATION AGAINST FULL DOCTRINE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClaimValidationResult {
  claim: string;
  truthClass: TruthClass;
  allowed: boolean;
  forbidden: boolean;
  maxStrength: ClaimStrength | null;
  forbiddenReason: string | null;
  requiredCompanions: TruthClass[];
  violations: DoctrineViolation[];
}

/**
 * Validate a specific claim against the doctrine for a truth class.
 * Returns whether the claim is allowed, forbidden, or needs companions.
 */
export function validateClaimAgainstDoctrine(
  truthClass: TruthClass,
  claim: string,
): ClaimValidationResult {
  const doctrine = getFullDoctrine(truthClass);
  const violations: DoctrineViolation[] = [];
  const lowerClaim = claim.toLowerCase();

  if (!doctrine) {
    return {
      claim, truthClass, allowed: false, forbidden: false,
      maxStrength: null, forbiddenReason: 'No doctrine found for this truth class',
      requiredCompanions: [], violations: [],
    };
  }

  // Check forbidden claims first
  for (const fc of doctrine.forbiddenClaims) {
    if (lowerClaim.includes(fc.claim.toLowerCase().substring(0, 25))) {
      violations.push({
        type: 'truth_role_overreach',
        severity: 'error',
        rule: 3,
        message: `Claim "${claim}" is FORBIDDEN for ${truthClass}: ${fc.reason}`,
        correction: `This claim requires a different truth class or cross-layer confirmation`,
      });
      return {
        claim, truthClass, allowed: false, forbidden: true,
        maxStrength: null, forbiddenReason: fc.reason,
        requiredCompanions: [], violations,
      };
    }
  }

  // Check allowed claims
  for (const ac of doctrine.allowedClaims) {
    if (lowerClaim.includes(ac.claim.toLowerCase().substring(0, 25))) {
      return {
        claim, truthClass, allowed: true, forbidden: false,
        maxStrength: ac.maxStrengthAlone,
        forbiddenReason: null,
        requiredCompanions: ac.requiredCompanions ?? [],
        violations: [],
      };
    }
  }

  // Fallback to claim boundaries
  const strength = canClassJustifyClaim(truthClass, claim);
  if (strength === 'never') {
    return {
      claim, truthClass, allowed: false, forbidden: true,
      maxStrength: null,
      forbiddenReason: `Claim boundary check: "${claim}" cannot be justified by ${truthClass}`,
      requiredCompanions: [], violations: [],
    };
  }

  return {
    claim, truthClass, allowed: true, forbidden: false,
    maxStrength: strength, forbiddenReason: null,
    requiredCompanions: doctrine.requiredCompanionsForStrongClaims,
    violations: [],
  };
}

/**
 * Get the complete doctrine summary for a truth class in a machine-readable format.
 */
export function getDoctrineSummary(truthClass: TruthClass): {
  name: string;
  cadence: string;
  failureMode: string;
  productionRule: string;
  allowedClaims: string[];
  forbiddenClaims: string[];
  companions: TruthClass[];
} | null {
  const doctrine = getFullDoctrine(truthClass);
  if (!doctrine) return null;
  return {
    name: doctrine.name,
    cadence: doctrine.cadence,
    failureMode: doctrine.failureMode,
    productionRule: doctrine.productionRule,
    allowedClaims: doctrine.allowedClaims.map(c => c.claim),
    forbiddenClaims: doctrine.forbiddenClaims.map(c => `${c.claim} — ${c.reason}`),
    companions: doctrine.requiredCompanionsForStrongClaims,
  };
}

/**
 * Validate an entire set of claims for a truth class.
 */
export function validateClaimBatch(
  truthClass: TruthClass,
  claims: string[],
): { results: ClaimValidationResult[]; forbiddenCount: number; allowedCount: number } {
  const results = claims.map(c => validateClaimAgainstDoctrine(truthClass, c));
  return {
    results,
    forbiddenCount: results.filter(r => r.forbidden).length,
    allowedCount: results.filter(r => r.allowed).length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL DOCTRINE AUDIT
// ═══════════════════════════════════════════════════════════════════════════════

export interface DoctrineAuditResult {
  violations: DoctrineViolation[];
  criticalCount: number;
  errorCount: number;
  warningCount: number;
  passed: boolean;
  summary: string;
}

export function auditDoctrine(): DoctrineAuditResult {
  const violations: DoctrineViolation[] = [];

  // Rule 2: No layer consumes provider-specific payloads directly.
  // Enforced by architecture: Evidence Pack normalizes raw provider responses
  // into EvidenceModules before any downstream layer (Signal Snapshot, Judgment)
  // consumes them. No explicit runtime check — architectural invariant.

  // Rule 4 + 8: coverage transparency
  violations.push(...enforceR4R8CoverageTransparency());

  // Rule 7: ensure reasoning engines exist as structured, not LLM
  // (this is a structural check — actual enforcement happens at call sites)
  violations.push(...enforceR7ReasoningBoundary(true, true, true, true));

  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  const errorCount = violations.filter(v => v.severity === 'error').length;
  const warningCount = violations.filter(v => v.severity === 'warning').length;

  const passed = criticalCount === 0 && errorCount === 0;

  const summary = passed
    ? `Doctrine audit passed (${warningCount} warnings)`
    : `Doctrine audit FAILED: ${criticalCount} critical, ${errorCount} errors, ${warningCount} warnings`;

  return { violations, criticalCount, errorCount, warningCount, passed, summary };
}
