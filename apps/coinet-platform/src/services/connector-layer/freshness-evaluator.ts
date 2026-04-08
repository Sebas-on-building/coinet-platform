/**
 * L2.2 — Freshness Evaluator
 *
 * The runtime compiler. Its job is not just to compare age to a threshold.
 * It must:
 *   1. Select the correct policy
 *   2. Choose the dominant clock
 *   3. Compute all ages
 *   4. Evaluate freshness state
 *   5. Assign usage rights
 *   6. Attach penalties and disclosures
 *   7. Return a decision record
 */

import type {
  FreshnessDecisionRecord, FreshnessEvaluationInput,
  FreshnessState, ClaimUsage,
} from './freshness-ontology';
import { findPolicy } from './freshness-policy-map';
import type { FreshnessPolicy } from './freshness-policy-map';
import {
  resolveDominantClock,
  computeTimingAges,
  assignFreshnessState,
  applyTransportGapEscalation,
  applyClaimUsageOverride,
} from './freshness-state-machine';

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUATION LEDGER — for audit and anti-fake tests
// ═══════════════════════════════════════════════════════════════════════════════

const evaluationLedger: FreshnessDecisionRecord[] = [];

export function getEvaluationLedger(): readonly FreshnessDecisionRecord[] {
  return evaluationLedger;
}

export function clearEvaluationLedger(): void {
  evaluationLedger.length = 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMARY EVALUATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function evaluateFreshness(
  input: FreshnessEvaluationInput,
  now?: number,
): FreshnessDecisionRecord {
  const evalNow = now ?? Date.now();

  // Step 1 — policy selection
  const policy = findPolicy(input.sourceClass, input.fieldFamily, input.routeMode);

  // Step 2 — dominant clock
  const domClock = resolveDominantClock(input);

  // Step 3 — compute ages
  const ages = computeTimingAges(input, evalNow);

  // Step 4 — family-specific state
  let { state, reasons } = assignFreshnessState(input, ages, policy, domClock);

  // Step 4b — transport gap escalation
  ({ state, reasons } = applyTransportGapEscalation(state, ages, policy, reasons));

  // Step 5 — rights from policy
  const baseRights = policy.rightsByState[state] ?? ['NOT_ALLOWED'];

  // Step 6 — claim-usage override
  const { effectiveRights, reasons: finalReasons } = applyClaimUsageOverride(
    state, baseRights, input.claimUsage, reasons,
  );

  // Step 7 — penalties and disclosure
  const penalty = policy.confidencePenaltyByState[state] ?? 0;
  const disclosure = policy.disclosureByState[state];

  const record: FreshnessDecisionRecord = {
    envelopeId: input.envelopeId,
    fieldFamily: input.fieldFamily,
    sourceClass: input.sourceClass,
    freshnessFamily: policy.freshnessFamily,
    freshnessClass: policy.freshnessClass,
    freshnessState: state,
    ages,
    dominantClock: domClock,
    rights: effectiveRights,
    confidencePenalty: penalty,
    disclosureRequired: state !== 'F0_CURRENT',
    disclosureText: disclosure,
    reasonCodes: finalReasons,
    evaluatedAt: new Date(evalNow).toISOString(),
  };

  evaluationLedger.push(record);
  return record;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE: EVALUATE FOR SPECIFIC CLAIM USAGE
// ═══════════════════════════════════════════════════════════════════════════════

export function evaluateForUsage(
  input: FreshnessEvaluationInput,
  claimUsage: ClaimUsage,
  now?: number,
): FreshnessDecisionRecord {
  return evaluateFreshness({ ...input, claimUsage }, now);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE: MULTI-FIELD EVALUATION
// ═══════════════════════════════════════════════════════════════════════════════

export function evaluateMultipleFields(
  baseInput: Omit<FreshnessEvaluationInput, 'fieldFamily'>,
  fieldFamilies: string[],
  now?: number,
): FreshnessDecisionRecord[] {
  return fieldFamilies.map(ff =>
    evaluateFreshness({ ...baseInput, fieldFamily: ff }, now),
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RIGHTS-HONESTY CHECK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify that freshness state and rights are logically consistent.
 * Used by the anti-fake test suite.
 * Returns an array of violation descriptions (empty = honest).
 */
export function verifyRightsHonesty(record: FreshnessDecisionRecord): string[] {
  const violations: string[] = [];

  if (record.freshnessState === 'F4_UNUSABLE') {
    if (record.rights.includes('LIVE_SCORING_ALLOWED')) {
      violations.push('F4_UNUSABLE carries LIVE_SCORING_ALLOWED — rights must degrade');
    }
    if (record.rights.includes('SCENARIO_CONFIRMATION_ALLOWED')) {
      violations.push('F4_UNUSABLE carries SCENARIO_CONFIRMATION_ALLOWED — rights must degrade');
    }
    if (record.rights.includes('DISPLAY_ALLOWED')) {
      violations.push('F4_UNUSABLE carries DISPLAY_ALLOWED — rights must degrade');
    }
  }

  if (record.freshnessState === 'F3_STALE_AND_CONSTRAINED') {
    if (record.rights.includes('LIVE_SCORING_ALLOWED')) {
      violations.push('F3 carries LIVE_SCORING — should not for constrained');
    }
    if (record.rights.includes('SCENARIO_CONFIRMATION_ALLOWED')) {
      violations.push('F3 carries SCENARIO_CONFIRMATION — should not for constrained');
    }
  }

  if (record.freshnessState === 'F2_STALE_BUT_USABLE') {
    if (record.rights.includes('LIVE_SCORING_ALLOWED')) {
      violations.push('F2 carries LIVE_SCORING — stale data should not support active scoring');
    }
  }

  if (record.freshnessState === 'F0_CURRENT' && record.disclosureRequired) {
    violations.push('F0_CURRENT should not require disclosure');
  }

  if (record.freshnessState !== 'F0_CURRENT' && !record.disclosureRequired) {
    violations.push(`${record.freshnessState} should require disclosure`);
  }

  if (record.confidencePenalty < 0 || record.confidencePenalty > 1) {
    violations.push(`Confidence penalty ${record.confidencePenalty} out of [0, 1] range`);
  }

  return violations;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

export function summarizeDecision(r: FreshnessDecisionRecord): string {
  return `[${r.freshnessState}] ${r.freshnessFamily}/${r.freshnessClass} | ` +
    `clock=${r.dominantClock} age=${r.ages.observationAgeMs ?? r.ages.ingestionAgeMs}ms | ` +
    `rights=[${r.rights.join(',')}] penalty=${r.confidencePenalty}`;
}

export function isUsableForLive(r: FreshnessDecisionRecord): boolean {
  return r.rights.includes('LIVE_SCORING_ALLOWED');
}

export function isDisplayable(r: FreshnessDecisionRecord): boolean {
  return r.rights.includes('DISPLAY_ALLOWED');
}

export function worstState(records: FreshnessDecisionRecord[]): FreshnessState {
  if (records.length === 0) return 'F5_UNKNOWN';
  const ORDER: FreshnessState[] = ['F0_CURRENT', 'F1_SLIPPING', 'F2_STALE_BUT_USABLE', 'F3_STALE_AND_CONSTRAINED', 'F4_UNUSABLE', 'F5_UNKNOWN'];
  let worst = 0;
  for (const r of records) {
    const idx = ORDER.indexOf(r.freshnessState);
    if (idx > worst) worst = idx;
  }
  return ORDER[worst];
}
