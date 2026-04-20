/**
 * L10.3 — Output Readiness Validator
 *
 * §10.3.9 — Orchestrates the structural output-contract validator and
 * then applies cleanliness law (§10.3.5.5 / §10.3.9.5) to decide the
 * final emission readiness class. Runtimes must not invent their own
 * readiness logic.
 *
 * Decision order (strongest signal first):
 *   1. BLOCKED_EMISSION — any structural contract issue, or any missing
 *      required lower-layer posture, or any `BREAKING_SEMANTIC`-level
 *      leak.
 *   2. DEGRADED_EMISSION — material degradation or material staleness.
 *   3. CAPPED_EMISSION — material contradiction, material confirmation
 *      gap, material invalidation risk.
 *   4. MODIFIER_REQUIRED — narrow spread without catastrophic posture;
 *      competition_live without shift conditions when close.
 *   5. CLEAN_EMISSION — none of the above; all postures clean.
 */

import type { L10HypothesisOutputContract } from '../contracts/hypothesis-output.contract';
import {
  L10HypothesisEmissionReadinessClass,
  L10HypothesisOutputCleanlinessThresholds,
  L10_HYPOTHESIS_OUTPUT_CLEANLINESS_THRESHOLDS,
} from '../contracts/hypothesis-materialization-policy';
import { validateL10OutputContract } from './l10-output-contract.validator';
import {
  L10ContractIssue,
  L10ContractReport,
  L10HypothesisContractViolationCode as V,
} from './l10-contract-violation-codes';

export interface L10OutputReadinessReport extends L10ContractReport {
  readonly readiness_class: L10HypothesisEmissionReadinessClass;
}

export interface L10OutputReadinessOpts {
  readonly thresholds?: L10HypothesisOutputCleanlinessThresholds;
  /** whether the subject's competition is currently live (> 1 plausible candidate). */
  readonly competition_live?: boolean;
  /** whether shift conditions are currently resolvable via `shift_condition_set_ref`. */
  readonly shift_conditions_resolvable?: boolean;
}

export function validateL10OutputReadiness(
  o: L10HypothesisOutputContract,
  opts: L10OutputReadinessOpts = {},
): L10OutputReadinessReport {
  const thresholds = opts.thresholds
    ?? L10_HYPOTHESIS_OUTPUT_CLEANLINESS_THRESHOLDS;
  const structural = validateL10OutputContract(o);
  const issues: L10ContractIssue[] = [...structural.issues];

  // Strongest signal: structural failure blocks emission entirely.
  if (!structural.valid) {
    return {
      valid: false,
      issues,
      readiness_class: L10HypothesisEmissionReadinessClass.BLOCKED_EMISSION,
    };
  }

  // Cleanliness postures (§10.3.5.5).
  const contradictionMaterial =
    o.contradiction_pressure_score > thresholds.contradictionMaterial;
  const confirmationGapMaterial =
    o.confirmation_gap_score > thresholds.confirmationGapMaterial;
  const invalidationMaterial =
    o.invalidation_risk_score > thresholds.invalidationRiskMaterial;
  const narrowSpread = o.rank_spread_to_next < thresholds.narrowSpread;
  const staleMaterial = o.staleness_score > thresholds.stalenessMaterial;
  const degradedMaterial = o.degradation_score > thresholds.degradationMaterial;

  // Clean-flag coherence checks (§10.3.5.5) — if the output claims
  // CLEAN_EMISSION posture but any material posture is true, flag it.
  if (o.emission_readiness_class
      === L10HypothesisEmissionReadinessClass.CLEAN_EMISSION) {
    if (contradictionMaterial) {
      issues.push({ code: V.CLEAN_WHILE_CONTRADICTION_MATERIAL,
        message: 'CLEAN_EMISSION claimed while contradiction is material' });
    }
    if (confirmationGapMaterial) {
      issues.push({ code: V.CLEAN_WHILE_CONFIRMATION_GAP_MATERIAL,
        message: 'CLEAN_EMISSION claimed while confirmation gap is material' });
    }
    if (invalidationMaterial) {
      issues.push({ code: V.CLEAN_WHILE_INVALIDATION_MATERIAL,
        message: 'CLEAN_EMISSION claimed while invalidation risk is material' });
    }
    if (narrowSpread) {
      issues.push({ code: V.CLEAN_WHILE_SPREAD_NARROW,
        message: 'CLEAN_EMISSION claimed while spread is narrow' });
    }
    if (staleMaterial) {
      issues.push({ code: V.CLEAN_WHILE_STALE,
        message: 'CLEAN_EMISSION claimed while staleness is material' });
    }
    if (degradedMaterial) {
      issues.push({ code: V.CLEAN_WHILE_DEGRADED,
        message: 'CLEAN_EMISSION claimed while degradation is material' });
    }
  }

  // Shift-conditions-when-close (§10.3.6.3).
  if (opts.competition_live === true && narrowSpread
    && opts.shift_conditions_resolvable === false) {
    issues.push({ code: V.SHIFT_CONDITIONS_REQUIRED_WHEN_CLOSE,
      message: 'shift conditions required when competition is live and spread is narrow' });
  }

  // Decide final readiness class (§10.3.9.2).
  let readiness: L10HypothesisEmissionReadinessClass;
  if (issues.length > structural.issues.length) {
    // We added cleanliness issues → emission is at best capped, more
    // likely blocked. Issues of `CLEAN_WHILE_*` plus missing shift
    // conditions degrade to BLOCKED_EMISSION.
    readiness = L10HypothesisEmissionReadinessClass.BLOCKED_EMISSION;
  } else if (degradedMaterial || staleMaterial) {
    readiness = L10HypothesisEmissionReadinessClass.DEGRADED_EMISSION;
  } else if (contradictionMaterial || confirmationGapMaterial
          || invalidationMaterial) {
    readiness = L10HypothesisEmissionReadinessClass.CAPPED_EMISSION;
  } else if (narrowSpread
      || (opts.competition_live === true
          && opts.shift_conditions_resolvable === false)) {
    readiness = L10HypothesisEmissionReadinessClass.MODIFIER_REQUIRED;
  } else {
    readiness = L10HypothesisEmissionReadinessClass.CLEAN_EMISSION;
  }

  return {
    valid: issues.length === 0,
    issues,
    readiness_class: readiness,
  };
}
