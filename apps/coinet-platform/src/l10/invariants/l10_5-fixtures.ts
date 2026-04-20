/**
 * L10.5 — Evidence-Semantics Fixture Builders
 *
 * §10.5.11 — Deterministic "green pipeline" fixtures for L10.5
 * invariants and certification bands. Fixtures emit the *lawful*
 * state so invariants can assert that legal inputs never trigger
 * L10.5 violations.
 */

import {
  L10HypothesisSupportPolicy,
  L10SupportObservation,
  L10SupportDerivabilityFacet,
  buildL10SupportPolicyId,
  buildL10SupportObservationId,
} from '../contracts/hypothesis-support-policy';
import {
  L10HypothesisContradictionPolicy,
  L10ContradictionObservation,
  L10ContradictionDerivabilityFacet,
  buildL10ContradictionPolicyId,
  buildL10ContradictionObservationId,
} from '../contracts/hypothesis-contradiction-policy';
import {
  L10HypothesisConfirmationPolicy,
  L10ConfirmationObservation,
  buildL10ConfirmationPolicyId,
  buildL10ConfirmationObservationId,
} from '../contracts/hypothesis-confirmation-policy';
import {
  L10HypothesisInvalidationPolicy,
  L10InvalidationObservation,
  L10CollapseThresholdBasis,
  buildL10InvalidationPolicyId,
  buildL10InvalidationObservationId,
} from '../contracts/hypothesis-invalidation-policy';
import {
  L10HypothesisShiftConditionPolicy,
  L10ShiftConditionObservation,
  L10ShiftConditionDriver,
  buildL10ShiftConditionPolicyId,
  buildL10ShiftConditionObservationId,
} from '../contracts/hypothesis-shift-condition-policy';
import {
  L10SupportRoleClass,
  L10EvidencePostureClass,
  L10ContradictionClass,
  L10ContradictionEffectClass,
  L10ContradictionTemporalPosture,
  L10ContradictionDirectness,
  L10ConfirmationClass,
  L10ConfirmationPresence,
  L10InvalidationClass,
  L10ShiftConditionClass,
  L10CandidateStabilityClass,
  L10EvidenceSemanticStage,
  L10_EVIDENCE_SEMANTIC_STAGES,
} from '../contracts/hypothesis-evidence-semantics-types';

export const GREEN_CANDIDATE_PRIMARY = 'cand-primary';
export const GREEN_CANDIDATE_SECONDARY = 'cand-secondary';
export const GREEN_SUBJECT = 'subj-competition';
export const GREEN_RANKING = 'rank-competition-1';
export const GREEN_POLICY_VERSION = '1.0.0';

// ── Support ────────────────────────────────────────────────────────
export function buildGreenSupportPolicy(
  candidateId: string,
): L10HypothesisSupportPolicy {
  return {
    policy_id: buildL10SupportPolicyId(candidateId, GREEN_POLICY_VERSION),
    hypothesis_candidate_id: candidateId,
    policy_version: GREEN_POLICY_VERSION,
    allowed_support_roles: [
      L10SupportRoleClass.PRIMARY_SUPPORT,
      L10SupportRoleClass.SECONDARY_SUPPORT,
      L10SupportRoleClass.CORROBORATIVE_SUPPORT,
      L10SupportRoleClass.DEGRADED_SUPPORT,
      L10SupportRoleClass.STALE_SUPPORT,
    ],
    primary_anchor_roles: [
      L10SupportRoleClass.PRIMARY_SUPPORT,
      L10SupportRoleClass.SECONDARY_SUPPORT,
    ],
    required_derivability_facets: [
      L10SupportDerivabilityFacet.DOMAIN_FIT,
      L10SupportDerivabilityFacet.SOURCE_QUALITY,
      L10SupportDerivabilityFacet.FRESHNESS_POSTURE,
      L10SupportDerivabilityFacet.EXPECTED_COMPLETENESS,
    ],
    required_support_domains: ['structural', 'validation'],
    degrading_postures: [
      L10EvidencePostureClass.STALE,
      L10EvidencePostureClass.DEGRADED,
      L10EvidencePostureClass.DECAYED,
    ],
    permitted_lineage_domains: ['structural', 'validation', 'regime'],
    lineage_refs: ['l9:green-run-1'],
  };
}

export function buildGreenSupportObservations(
  candidateId: string,
): readonly L10SupportObservation[] {
  const mk = (
    ref: string,
    domain: string,
    role: L10SupportRoleClass,
    posture: L10EvidencePostureClass,
    strength: number,
  ): L10SupportObservation => ({
    observation_id: buildL10SupportObservationId(candidateId, ref, domain),
    hypothesis_candidate_id: candidateId,
    supporting_ref: ref,
    support_domain: domain,
    support_role: role,
    support_posture: posture,
    support_strength: strength,
    lineage_refs: ['l9:green-run-1'],
  });
  return [
    mk(
      'l7:obs-structural-1',
      'structural',
      L10SupportRoleClass.PRIMARY_SUPPORT,
      L10EvidencePostureClass.CURRENT,
      0.82,
    ),
    mk(
      'l7:obs-validation-1',
      'validation',
      L10SupportRoleClass.SECONDARY_SUPPORT,
      L10EvidencePostureClass.CURRENT,
      0.7,
    ),
    mk(
      'l8:obs-regime-1',
      'regime',
      L10SupportRoleClass.CORROBORATIVE_SUPPORT,
      L10EvidencePostureClass.CURRENT,
      0.55,
    ),
  ];
}

// ── Contradiction ──────────────────────────────────────────────────
export function buildGreenContradictionPolicy(
  candidateId: string,
): L10HypothesisContradictionPolicy {
  return {
    policy_id: buildL10ContradictionPolicyId(candidateId, GREEN_POLICY_VERSION),
    hypothesis_candidate_id: candidateId,
    policy_version: GREEN_POLICY_VERSION,
    allowed_contradiction_classes: [
      L10ContradictionClass.DIRECT_CONTRADICTION,
      L10ContradictionClass.STRUCTURAL_CONTRADICTION,
      L10ContradictionClass.TEMPORAL_CONTRADICTION,
      L10ContradictionClass.DECAYED_CONTRADICTION,
    ],
    allowed_effect_classes: [
      L10ContradictionEffectClass.NARROWING,
      L10ContradictionEffectClass.BLOCKING,
      L10ContradictionEffectClass.DECAYED_HISTORICAL_CONTRADICTION,
    ],
    required_temporal_postures: [
      L10ContradictionTemporalPosture.ACTIVE,
      L10ContradictionTemporalPosture.PARTIALLY_DECAYED,
      L10ContradictionTemporalPosture.HISTORICAL_NON_DOMINANT,
    ],
    requires_directness_distinction: true,
    required_derivability_facets: [
      L10ContradictionDerivabilityFacet.CORE_CLAIM_ATTACK,
      L10ContradictionDerivabilityFacet.TEMPORAL_RECENCY,
    ],
    mandatory_contradiction_domains: ['structural'],
    lineage_refs: ['l9:green-run-1'],
  };
}

export function buildGreenContradictionObservations(
  candidateId: string,
): readonly L10ContradictionObservation[] {
  return [
    {
      observation_id: buildL10ContradictionObservationId(
        candidateId,
        'l7:ctr-structural-1',
        'structural',
      ),
      hypothesis_candidate_id: candidateId,
      contradicting_ref: 'l7:ctr-structural-1',
      contradiction_domain: 'structural',
      contradiction_class: L10ContradictionClass.STRUCTURAL_CONTRADICTION,
      contradiction_effect: L10ContradictionEffectClass.NARROWING,
      contradiction_directness: L10ContradictionDirectness.INDIRECT,
      contradiction_temporal_posture:
        L10ContradictionTemporalPosture.ACTIVE,
      evidence_posture: L10EvidencePostureClass.CURRENT,
      contradiction_pressure: 0.35,
      lineage_refs: ['l9:green-run-1'],
    },
  ];
}

// ── Confirmation ──────────────────────────────────────────────────
export function buildGreenConfirmationPolicy(
  candidateId: string,
): L10HypothesisConfirmationPolicy {
  return {
    policy_id: buildL10ConfirmationPolicyId(
      candidateId,
      GREEN_POLICY_VERSION,
    ),
    hypothesis_candidate_id: candidateId,
    policy_version: GREEN_POLICY_VERSION,
    allowed_confirmation_classes: [
      L10ConfirmationClass.CORE_CONFIRMATION,
      L10ConfirmationClass.UPGRADE_CONFIRMATION,
      L10ConfirmationClass.STABILITY_CONFIRMATION,
      L10ConfirmationClass.MISSING_CONFIRMATION,
    ],
    required_presence_distinctions: [
      L10ConfirmationPresence.REQUIRED,
      L10ConfirmationPresence.PRESENT,
      L10ConfirmationPresence.MISSING,
    ],
    required_upgrade_capable_classes: [
      L10ConfirmationClass.CORE_CONFIRMATION,
    ],
    mandatory_confirmation_domains: ['validation'],
    allow_primary_with_missing_upgrades: false,
    lineage_refs: ['l9:green-run-1'],
  };
}

export function buildGreenConfirmationObservations(
  candidateId: string,
  opts: { includeMissing?: boolean } = {},
): readonly L10ConfirmationObservation[] {
  const obs: L10ConfirmationObservation[] = [
    {
      observation_id: buildL10ConfirmationObservationId(
        candidateId,
        'l7:cnf-core-1',
        'validation',
      ),
      hypothesis_candidate_id: candidateId,
      confirmation_ref: 'l7:cnf-core-1',
      confirmation_domain: 'validation',
      confirmation_class: L10ConfirmationClass.CORE_CONFIRMATION,
      confirmation_presence: L10ConfirmationPresence.PRESENT,
      evidence_posture: L10EvidencePostureClass.CURRENT,
      is_upgrade_critical: true,
      lineage_refs: ['l9:green-run-1'],
    },
    {
      observation_id: buildL10ConfirmationObservationId(
        candidateId,
        'l7:cnf-stability-1',
        'validation',
      ),
      hypothesis_candidate_id: candidateId,
      confirmation_ref: 'l7:cnf-stability-1',
      confirmation_domain: 'validation',
      confirmation_class: L10ConfirmationClass.STABILITY_CONFIRMATION,
      confirmation_presence: L10ConfirmationPresence.PRESENT,
      evidence_posture: L10EvidencePostureClass.CURRENT,
      is_upgrade_critical: false,
      lineage_refs: ['l9:green-run-1'],
    },
  ];
  if (opts.includeMissing) {
    obs.push({
      observation_id: buildL10ConfirmationObservationId(
        candidateId,
        'l7:cnf-upgrade-pending',
        'validation',
      ),
      hypothesis_candidate_id: candidateId,
      confirmation_ref: 'l7:cnf-upgrade-pending',
      confirmation_domain: 'validation',
      confirmation_class: L10ConfirmationClass.UPGRADE_CONFIRMATION,
      confirmation_presence: L10ConfirmationPresence.MISSING,
      evidence_posture: L10EvidencePostureClass.CURRENT,
      is_upgrade_critical: false,
      lineage_refs: ['l9:green-run-1'],
    });
  }
  return obs;
}

// ── Invalidation ──────────────────────────────────────────────────
export function buildGreenInvalidationPolicy(
  candidateId: string,
): L10HypothesisInvalidationPolicy {
  return {
    policy_id: buildL10InvalidationPolicyId(
      candidateId,
      GREEN_POLICY_VERSION,
    ),
    hypothesis_candidate_id: candidateId,
    policy_version: GREEN_POLICY_VERSION,
    allowed_invalidation_classes: [
      L10InvalidationClass.ACTIVE_INVALIDATION,
      L10InvalidationClass.POTENTIAL_INVALIDATION,
      L10InvalidationClass.THRESHOLD_INVALIDATION,
      L10InvalidationClass.SEQUENCE_BREAK_INVALIDATION,
    ],
    requires_active_vs_potential_split: true,
    required_collapse_threshold_bases: [
      L10CollapseThresholdBasis.SCALE_CROSSING,
    ],
    numeric_threshold_required_classes: [
      L10InvalidationClass.THRESHOLD_INVALIDATION,
    ],
    active_invalidation_caps_confidence: true,
    lineage_refs: ['l9:green-run-1'],
  };
}

export function buildGreenInvalidationObservations(
  candidateId: string,
): readonly L10InvalidationObservation[] {
  return [
    {
      observation_id: buildL10InvalidationObservationId(
        candidateId,
        'l7:inv-threshold-1',
        'validation',
      ),
      hypothesis_candidate_id: candidateId,
      invalidation_signal_ref: 'l7:inv-threshold-1',
      invalidation_domain: 'validation',
      invalidation_class: L10InvalidationClass.THRESHOLD_INVALIDATION,
      evidence_posture: L10EvidencePostureClass.CURRENT,
      is_currently_active: false,
      collapse_threshold: 0.6,
      lineage_refs: ['l9:green-run-1'],
    },
    {
      observation_id: buildL10InvalidationObservationId(
        candidateId,
        'l9:inv-potential-1',
        'sequence',
      ),
      hypothesis_candidate_id: candidateId,
      invalidation_signal_ref: 'l9:inv-potential-1',
      invalidation_domain: 'sequence',
      invalidation_class: L10InvalidationClass.POTENTIAL_INVALIDATION,
      evidence_posture: L10EvidencePostureClass.CURRENT,
      is_currently_active: false,
      collapse_threshold: null,
      lineage_refs: ['l9:green-run-1'],
    },
  ];
}

// ── Shift Conditions ──────────────────────────────────────────────
export function buildGreenShiftConditionPolicy(
  subjectId: string,
): L10HypothesisShiftConditionPolicy {
  return {
    policy_id: buildL10ShiftConditionPolicyId(
      subjectId,
      GREEN_POLICY_VERSION,
    ),
    hypothesis_subject_id: subjectId,
    policy_version: GREEN_POLICY_VERSION,
    allowed_condition_classes: [
      L10ShiftConditionClass.SECONDARY_PROMOTION_CONDITION,
      L10ShiftConditionClass.PRIMARY_REINFORCEMENT_CONDITION,
      L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION,
      L10ShiftConditionClass.SPREAD_NARROWING_CONDITION,
    ],
    requires_governed_driver: true,
    mandatory_when_competition_live: [
      L10ShiftConditionClass.SECONDARY_PROMOTION_CONDITION,
      L10ShiftConditionClass.PRIMARY_REINFORCEMENT_CONDITION,
    ],
    spread_narrowing_conditions_required: true,
    min_conditions_when_live: 3,
    lineage_refs: ['l9:green-run-1'],
  };
}

export function buildGreenShiftConditionObservations(
  subjectId: string,
  rankingRef: string,
  primaryRef: string,
  secondaryRef: string,
): readonly L10ShiftConditionObservation[] {
  const mk = (
    cls: L10ShiftConditionClass,
    anchor: string[],
    domain: string,
    drivers: L10ShiftConditionDriver[],
  ): L10ShiftConditionObservation => ({
    observation_id: buildL10ShiftConditionObservationId(
      subjectId,
      rankingRef,
      cls,
      domain,
    ),
    hypothesis_subject_id: subjectId,
    hypothesis_ranking_ref: rankingRef,
    condition_class: cls,
    evidence_domain: domain,
    anchor_candidate_refs: anchor,
    drivers,
    lineage_refs: ['l9:green-run-1'],
  });
  return [
    mk(
      L10ShiftConditionClass.SECONDARY_PROMOTION_CONDITION,
      [secondaryRef],
      'validation',
      [L10ShiftConditionDriver.MISSING_CONFIRMATION_ARRIVAL],
    ),
    mk(
      L10ShiftConditionClass.PRIMARY_REINFORCEMENT_CONDITION,
      [primaryRef],
      'validation',
      [L10ShiftConditionDriver.SUPPORT_UPGRADE],
    ),
    mk(
      L10ShiftConditionClass.SPREAD_NARROWING_CONDITION,
      [primaryRef, secondaryRef],
      'regime',
      [L10ShiftConditionDriver.REGIME_POSTURE_SHIFT],
    ),
    mk(
      L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION,
      [primaryRef],
      'validation',
      [L10ShiftConditionDriver.INVALIDATION_CROSSING],
    ),
  ];
}

// ── Aggregate green fixture ───────────────────────────────────────
export interface GreenL10_5Fixture {
  readonly subject_id: string;
  readonly ranking_ref: string;
  readonly primary_candidate_id: string;
  readonly secondary_candidate_id: string;

  readonly support_policy: L10HypothesisSupportPolicy;
  readonly support_observations: readonly L10SupportObservation[];

  readonly contradiction_policy: L10HypothesisContradictionPolicy;
  readonly contradiction_observations: readonly L10ContradictionObservation[];

  readonly confirmation_policy: L10HypothesisConfirmationPolicy;
  readonly confirmation_observations: readonly L10ConfirmationObservation[];

  readonly invalidation_policy: L10HypothesisInvalidationPolicy;
  readonly invalidation_observations: readonly L10InvalidationObservation[];

  readonly shift_condition_policy: L10HypothesisShiftConditionPolicy;
  readonly shift_condition_observations:
    readonly L10ShiftConditionObservation[];

  readonly executed_stage_order: readonly L10EvidenceSemanticStage[];
  readonly stability_posture: L10CandidateStabilityClass;
  readonly emitted_confidence: number;
}

export function buildGreenL10_5Fixture(): GreenL10_5Fixture {
  return {
    subject_id: GREEN_SUBJECT,
    ranking_ref: GREEN_RANKING,
    primary_candidate_id: GREEN_CANDIDATE_PRIMARY,
    secondary_candidate_id: GREEN_CANDIDATE_SECONDARY,

    support_policy: buildGreenSupportPolicy(GREEN_CANDIDATE_PRIMARY),
    support_observations:
      buildGreenSupportObservations(GREEN_CANDIDATE_PRIMARY),

    contradiction_policy: buildGreenContradictionPolicy(
      GREEN_CANDIDATE_PRIMARY,
    ),
    contradiction_observations: buildGreenContradictionObservations(
      GREEN_CANDIDATE_PRIMARY,
    ),

    confirmation_policy: buildGreenConfirmationPolicy(
      GREEN_CANDIDATE_PRIMARY,
    ),
    confirmation_observations: buildGreenConfirmationObservations(
      GREEN_CANDIDATE_PRIMARY,
    ),

    invalidation_policy: buildGreenInvalidationPolicy(
      GREEN_CANDIDATE_PRIMARY,
    ),
    invalidation_observations: buildGreenInvalidationObservations(
      GREEN_CANDIDATE_PRIMARY,
    ),

    shift_condition_policy: buildGreenShiftConditionPolicy(GREEN_SUBJECT),
    shift_condition_observations: buildGreenShiftConditionObservations(
      GREEN_SUBJECT,
      GREEN_RANKING,
      GREEN_CANDIDATE_PRIMARY,
      GREEN_CANDIDATE_SECONDARY,
    ),

    executed_stage_order: [...L10_EVIDENCE_SEMANTIC_STAGES],
    stability_posture: L10CandidateStabilityClass.NARROWED,
    emitted_confidence: 0.55,
  };
}
