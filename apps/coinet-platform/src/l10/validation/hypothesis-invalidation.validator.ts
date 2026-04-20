/**
 * L10.5 — Hypothesis Invalidation Validator §10.5.5
 *
 * Enforces invalidation semantics: class taxonomy, active-vs-potential
 * split, collapse-threshold declaration, confidence-cap interaction,
 * and primary-stability-under-active law.
 */

import {
  L10HypothesisInvalidationPolicy,
  L10InvalidationObservation,
  L10CollapseThresholdBasis,
} from '../contracts/hypothesis-invalidation-policy';
import {
  L10InvalidationClass,
  ALL_L10_INVALIDATION_CLASSES,
  L10_ACTIVE_INVALIDATION_CLASSES,
} from '../contracts/hypothesis-evidence-semantics-types';
import {
  L10EvidenceSemanticValidationIssue,
  L10EvidenceSemanticValidationReport,
  L10EvidenceSemanticViolationCode,
} from './l10-evidence-semantics-violation-codes';

export interface L10InvalidationValidationInput {
  readonly policy: L10HypothesisInvalidationPolicy;
  readonly observations: readonly L10InvalidationObservation[];
  /** Threshold bases actually declared across invalidation reporting. */
  readonly declared_threshold_bases:
    readonly L10CollapseThresholdBasis[];
  /**
   * The engine's claimed invalidation-risk score; if > 0 but no signal
   * observations exist, it is a violation.
   */
  readonly invalidation_risk_score: number;
  /** Whether downstream confidence is actually capped when active. */
  readonly confidence_cap_applied_when_active: boolean;
  /** Whether this candidate is marked as stable primary. */
  readonly is_primary_stable: boolean;
  /**
   * Whether the engine's output split active vs potential in separate
   * first-class collections (not just a single list).
   */
  readonly active_vs_potential_split: boolean;
}

export function validateL10Invalidation(
  input: L10InvalidationValidationInput,
): L10EvidenceSemanticValidationReport {
  const issues: L10EvidenceSemanticValidationIssue[] = [];
  const push = (
    code: L10EvidenceSemanticViolationCode,
    message: string,
    subject?: string,
  ) => issues.push({ code, message, subject });

  const { policy, observations } = input;
  const allowedClasses = new Set(policy.allowed_invalidation_classes);
  const knownClasses = new Set<L10InvalidationClass>(
    ALL_L10_INVALIDATION_CLASSES,
  );
  const numericRequired = new Set(
    policy.numeric_threshold_required_classes,
  );

  let hasActive = false;
  let hiddenActiveAsPotential = false;

  for (const obs of observations) {
    if (!knownClasses.has(obs.invalidation_class)) {
      push(
        L10EvidenceSemanticViolationCode.INVALIDATION_CLASS_UNREGISTERED,
        `invalidation_class '${obs.invalidation_class}' not in taxonomy`,
        obs.observation_id,
      );
    }
    if (!allowedClasses.has(obs.invalidation_class)) {
      push(
        L10EvidenceSemanticViolationCode.INVALIDATION_CLASS_DISALLOWED,
        `invalidation_class '${obs.invalidation_class}' disallowed`,
        obs.observation_id,
      );
    }

    // §10.5.5.4 — active hidden inside potential-only class.
    if (
      obs.is_currently_active &&
      !L10_ACTIVE_INVALIDATION_CLASSES.includes(obs.invalidation_class) &&
      obs.invalidation_class ===
        L10InvalidationClass.POTENTIAL_INVALIDATION
    ) {
      push(
        L10EvidenceSemanticViolationCode.INVALIDATION_ACTIVE_HIDDEN_IN_POTENTIAL,
        'active invalidation mislabeled as POTENTIAL',
        obs.observation_id,
      );
      hiddenActiveAsPotential = true;
    }
    if (obs.is_currently_active) hasActive = true;

    // §10.5.5.5 — numeric threshold required for certain classes.
    if (
      numericRequired.has(obs.invalidation_class) &&
      (obs.collapse_threshold === null ||
        !Number.isFinite(obs.collapse_threshold))
    ) {
      push(
        L10EvidenceSemanticViolationCode.INVALIDATION_COLLAPSE_THRESHOLD_MISSING,
        `class '${obs.invalidation_class}' requires numeric threshold`,
        obs.observation_id,
      );
    }
    if (
      obs.collapse_threshold !== null &&
      (!Number.isFinite(obs.collapse_threshold) ||
        obs.collapse_threshold < 0 ||
        obs.collapse_threshold > 1)
    ) {
      push(
        L10EvidenceSemanticViolationCode.INVALIDATION_THRESHOLD_OUT_OF_RANGE,
        `collapse_threshold=${obs.collapse_threshold} out of [0,1]`,
        obs.observation_id,
      );
    }
  }

  // §10.5.5.7 — risk claimed without signals.
  if (
    input.invalidation_risk_score > 0 &&
    observations.length === 0
  ) {
    push(
      L10EvidenceSemanticViolationCode.INVALIDATION_RISK_CLAIMED_WITHOUT_SIGNALS,
      `invalidation_risk_score=${input.invalidation_risk_score} without signals`,
    );
  }

  // §10.5.5.4 — active vs potential must be structurally split.
  if (!input.active_vs_potential_split) {
    push(
      L10EvidenceSemanticViolationCode.INVALIDATION_ACTIVE_VS_POTENTIAL_NOT_SPLIT,
      'active and potential invalidation must be first-class split',
    );
  }

  // §10.5.5.5 — required threshold bases declared.
  const declaredBases = new Set(input.declared_threshold_bases);
  for (const b of policy.required_collapse_threshold_bases) {
    if (!declaredBases.has(b)) {
      push(
        L10EvidenceSemanticViolationCode.INVALIDATION_THRESHOLD_BASIS_MISSING,
        `required collapse-threshold basis '${b}' not declared`,
      );
    }
  }

  // §10.5.5.6 — active must cap confidence when policy says so.
  if (
    hasActive &&
    policy.active_invalidation_caps_confidence &&
    !input.confidence_cap_applied_when_active
  ) {
    push(
      L10EvidenceSemanticViolationCode.INVALIDATION_ACTIVE_NOT_CAPPING_CONFIDENCE,
      'active invalidation posture did not cap candidate confidence',
    );
  }

  // §10.5.5.7 — primary-stable under active invalidation is illegal.
  if (hasActive && input.is_primary_stable) {
    push(
      L10EvidenceSemanticViolationCode.INVALIDATION_PRIMARY_STABLE_UNDER_ACTIVE,
      'candidate marked stable-primary while active invalidation exists',
    );
  }
  void hiddenActiveAsPotential;

  return { valid: issues.length === 0, issues };
}
