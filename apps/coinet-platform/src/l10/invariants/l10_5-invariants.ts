/**
 * L10.5 — Evidence-Semantics Invariants
 *
 * §10.5.10 — INV-10.5-A through INV-10.5-G, all executable.
 *
 *   INV-10.5-A : Every hypothesis surfaces support explicitly, with
 *                strength and role classification.
 *   INV-10.5-B : Contradiction remains explicit and classified as
 *                narrowing, blocking, or decayed — never folded into
 *                net confidence.
 *   INV-10.5-C : Confirmations distinguish required / present /
 *                missing.
 *   INV-10.5-D : Invalidation surfaces active-vs-potential and
 *                collapse thresholds where required.
 *   INV-10.5-E : Shift conditions anchor on primary/secondary and
 *                cite governed drivers tied to evidence domains.
 *   INV-10.5-F : Evidence posture is explicit — stale/degraded/
 *                decayed/evidence-only surfaces may not masquerade
 *                as clean decisive evidence.
 *   INV-10.5-G : Support/contradiction/confirmation/invalidation/
 *                shift are not flattened into single-story certainty;
 *                interaction law and no-netting are machine-enforced.
 */

import {
  validateL10Support,
  validateL10Contradiction,
  validateL10Confirmation,
  validateL10Invalidation,
  validateL10ShiftCondition,
  validateL10EvidenceInteraction,
} from '../validation';
import {
  L10EvidenceSemanticViolationCode,
} from '../validation/l10-evidence-semantics-violation-codes';
import {
  L10SupportRoleClass,
  L10ContradictionClass,
  L10ContradictionEffectClass,
  L10ContradictionTemporalPosture,
  L10ContradictionDirectness,
  L10ConfirmationClass,
  L10ConfirmationPresence,
  L10InvalidationClass,
  L10EvidencePostureClass,
  L10CandidateStabilityClass,
  L10EvidenceSemanticStage,
} from '../contracts/hypothesis-evidence-semantics-types';
import { L10SupportDerivabilityFacet } from '../contracts/hypothesis-support-policy';
import { L10ContradictionDerivabilityFacet } from '../contracts/hypothesis-contradiction-policy';
import { L10CollapseThresholdBasis } from '../contracts/hypothesis-invalidation-policy';
import {
  buildGreenL10_5Fixture,
  GreenL10_5Fixture,
} from './l10_5-fixtures';

export interface L10_5InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

/**
 * Green-pipeline predicate: every validator must return ok on the
 * canonical green fixture. Each invariant reuses this to assert that
 * legal inputs *never* fail.
 */
function greenPipelineValid(fx: GreenL10_5Fixture): {
  ok: boolean;
  detail: string;
} {
  const s = validateL10Support({
    policy: fx.support_policy,
    observations: fx.support_observations,
    declared_derivability_facets:
      fx.support_policy.required_derivability_facets,
    observed_domains: Array.from(
      new Set(fx.support_observations.map(o => o.support_domain)),
    ),
    declared_missing_expected_domains: [],
  });
  if (!s.valid) return { ok: false, detail: `support: ${s.issues.map(i => i.code).join(',')}` };

  const c = validateL10Contradiction({
    policy: fx.contradiction_policy,
    observations: fx.contradiction_observations,
    declared_derivability_facets:
      fx.contradiction_policy.required_derivability_facets,
    observed_domains: Array.from(
      new Set(fx.contradiction_observations.map(o => o.contradiction_domain)),
    ),
    contradiction_netted_into_confidence: false,
  });
  if (!c.valid) return { ok: false, detail: `contradiction: ${c.issues.map(i => i.code).join(',')}` };

  const f = validateL10Confirmation({
    policy: fx.confirmation_policy,
    observations: fx.confirmation_observations,
    required_and_present_collapsed: false,
    observed_domains: Array.from(
      new Set(fx.confirmation_observations.map(o => o.confirmation_domain)),
    ),
    is_primary: true,
  });
  if (!f.valid) return { ok: false, detail: `confirmation: ${f.issues.map(i => i.code).join(',')}` };

  const v = validateL10Invalidation({
    policy: fx.invalidation_policy,
    observations: fx.invalidation_observations,
    declared_threshold_bases: [L10CollapseThresholdBasis.SCALE_CROSSING],
    invalidation_risk_score: 0.2,
    confidence_cap_applied_when_active: true,
    is_primary_stable: false,
    active_vs_potential_split: true,
  });
  if (!v.valid) return { ok: false, detail: `invalidation: ${v.issues.map(i => i.code).join(',')}` };

  const z = validateL10ShiftCondition({
    policy: fx.shift_condition_policy,
    observations: fx.shift_condition_observations,
    primary_candidate_ref: fx.primary_candidate_id,
    secondary_candidate_ref: fx.secondary_candidate_id,
    primary_has_active_invalidation: false,
    ranking_spread_is_narrow: true,
  });
  if (!z.valid) return { ok: false, detail: `shift: ${z.issues.map(i => i.code).join(',')}` };

  const x = validateL10EvidenceInteraction({
    hypothesis_candidate_id: fx.primary_candidate_id,
    support: fx.support_observations,
    contradiction: fx.contradiction_observations,
    confirmation: fx.confirmation_observations,
    invalidation: fx.invalidation_observations,
    shift_conditions: fx.shift_condition_observations,
    executed_stage_order: fx.executed_stage_order,
    stability_posture: fx.stability_posture,
    explicit_surfaces_preserved: true,
    confidence_capped_under_active_invalidation: true,
    ranking_spread_is_narrow: true,
    emitted_confidence: fx.emitted_confidence,
  });
  if (!x.valid) return { ok: false, detail: `interaction: ${x.issues.map(i => i.code).join(',')}` };

  return { ok: true, detail: 'green pipeline: all six surfaces pass' };
}

// ── INV-10.5-A ────────────────────────────────────────────────────
export function checkINV_105_A(): L10_5InvariantResult {
  const fx = buildGreenL10_5Fixture();
  const base = greenPipelineValid(fx);

  // An observation missing a role must be rejected.
  const broken = validateL10Support({
    policy: fx.support_policy,
    observations: [
      {
        ...fx.support_observations[0],
        support_role: undefined as unknown as L10SupportRoleClass,
      },
    ],
    declared_derivability_facets:
      fx.support_policy.required_derivability_facets,
    observed_domains: ['structural', 'validation'],
    declared_missing_expected_domains: [],
  });
  const rejectsMissingRole = broken.issues.some(
    i => i.code === L10EvidenceSemanticViolationCode.SUPPORT_MISSING_ROLE,
  );
  return {
    id: 'INV-10.5-A',
    name: 'Support surfaces with explicit role and strength.',
    holds: base.ok && rejectsMissingRole,
    evidence: base.ok
      ? `green ok; rejects missing role: ${rejectsMissingRole}`
      : base.detail,
  };
}

// ── INV-10.5-B ────────────────────────────────────────────────────
export function checkINV_105_B(): L10_5InvariantResult {
  const fx = buildGreenL10_5Fixture();
  const base = greenPipelineValid(fx);

  // Blocking direct contradiction mislabeled as NARROWING is rejected.
  const rep = validateL10Contradiction({
    policy: fx.contradiction_policy,
    observations: [
      {
        ...fx.contradiction_observations[0],
        contradiction_class: L10ContradictionClass.DIRECT_CONTRADICTION,
        contradiction_directness: L10ContradictionDirectness.DIRECT,
        contradiction_pressure: 0.9,
        contradiction_effect: L10ContradictionEffectClass.NARROWING,
      },
    ],
    declared_derivability_facets: [
      L10ContradictionDerivabilityFacet.CORE_CLAIM_ATTACK,
      L10ContradictionDerivabilityFacet.TEMPORAL_RECENCY,
    ],
    observed_domains: ['structural'],
    contradiction_netted_into_confidence: false,
  });
  const rejectsMislabel = rep.issues.some(
    i =>
      i.code ===
      L10EvidenceSemanticViolationCode.CONTRADICTION_BLOCKING_MISLABELED_AS_NARROWING,
  );

  // Netted contradiction is rejected.
  const netted = validateL10Contradiction({
    policy: fx.contradiction_policy,
    observations: fx.contradiction_observations,
    declared_derivability_facets:
      fx.contradiction_policy.required_derivability_facets,
    observed_domains: ['structural'],
    contradiction_netted_into_confidence: true,
  });
  const rejectsNetting = netted.issues.some(
    i =>
      i.code ===
      L10EvidenceSemanticViolationCode.CONTRADICTION_NETTED_INTO_CONFIDENCE,
  );

  return {
    id: 'INV-10.5-B',
    name: 'Contradiction explicit, classified, never netted.',
    holds: base.ok && rejectsMislabel && rejectsNetting,
    evidence: base.ok
      ? `green ok; rejects mislabel=${rejectsMislabel}, netting=${rejectsNetting}`
      : base.detail,
  };
}

// ── INV-10.5-C ────────────────────────────────────────────────────
export function checkINV_105_C(): L10_5InvariantResult {
  const fx = buildGreenL10_5Fixture();
  const base = greenPipelineValid(fx);

  // Collapsed required/present set is rejected.
  const collapsed = validateL10Confirmation({
    policy: fx.confirmation_policy,
    observations: fx.confirmation_observations,
    required_and_present_collapsed: true,
    observed_domains: ['validation'],
    is_primary: true,
  });
  const rejectsCollapse = collapsed.issues.some(
    i =>
      i.code ===
      L10EvidenceSemanticViolationCode.CONFIRMATION_REQUIRED_AND_PRESENT_COLLAPSED,
  );

  // Primary with missing upgrade-critical confirmation is rejected.
  const primaryMissing = validateL10Confirmation({
    policy: fx.confirmation_policy,
    observations: [
      ...fx.confirmation_observations,
      {
        ...fx.confirmation_observations[0],
        observation_id: 'obs-missing-upgrade',
        confirmation_ref: 'l7:cnf-upgrade-missing',
        confirmation_class: L10ConfirmationClass.UPGRADE_CONFIRMATION,
        confirmation_presence: L10ConfirmationPresence.MISSING,
        is_upgrade_critical: true,
      },
    ],
    required_and_present_collapsed: false,
    observed_domains: ['validation'],
    is_primary: true,
  });
  const rejectsPrimaryMissing = primaryMissing.issues.some(
    i =>
      i.code ===
      L10EvidenceSemanticViolationCode.CONFIRMATION_PRIMARY_WITH_MISSING_UPGRADES,
  );

  return {
    id: 'INV-10.5-C',
    name: 'Confirmations required/present/missing explicit.',
    holds: base.ok && rejectsCollapse && rejectsPrimaryMissing,
    evidence: base.ok
      ? `green ok; rejects collapse=${rejectsCollapse}, primary-missing=${rejectsPrimaryMissing}`
      : base.detail,
  };
}

// ── INV-10.5-D ────────────────────────────────────────────────────
export function checkINV_105_D(): L10_5InvariantResult {
  const fx = buildGreenL10_5Fixture();
  const base = greenPipelineValid(fx);

  // Active invalidation while candidate stable-primary must reject.
  const stableUnderActive = validateL10Invalidation({
    policy: fx.invalidation_policy,
    observations: [
      {
        ...fx.invalidation_observations[0],
        invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
        is_currently_active: true,
      },
    ],
    declared_threshold_bases: [L10CollapseThresholdBasis.SCALE_CROSSING],
    invalidation_risk_score: 0.4,
    confidence_cap_applied_when_active: true,
    is_primary_stable: true,
    active_vs_potential_split: true,
  });
  const rejectsStable = stableUnderActive.issues.some(
    i =>
      i.code ===
      L10EvidenceSemanticViolationCode.INVALIDATION_PRIMARY_STABLE_UNDER_ACTIVE,
  );

  // Missing collapse threshold on THRESHOLD_INVALIDATION rejects.
  const missingThreshold = validateL10Invalidation({
    policy: fx.invalidation_policy,
    observations: [
      {
        ...fx.invalidation_observations[0],
        invalidation_class: L10InvalidationClass.THRESHOLD_INVALIDATION,
        collapse_threshold: null,
      },
    ],
    declared_threshold_bases: [L10CollapseThresholdBasis.SCALE_CROSSING],
    invalidation_risk_score: 0,
    confidence_cap_applied_when_active: true,
    is_primary_stable: false,
    active_vs_potential_split: true,
  });
  const rejectsMissingThreshold = missingThreshold.issues.some(
    i =>
      i.code ===
      L10EvidenceSemanticViolationCode.INVALIDATION_COLLAPSE_THRESHOLD_MISSING,
  );

  return {
    id: 'INV-10.5-D',
    name: 'Invalidation active-vs-potential + thresholds explicit.',
    holds: base.ok && rejectsStable && rejectsMissingThreshold,
    evidence: base.ok
      ? `green ok; stable-under-active=${rejectsStable}, threshold-missing=${rejectsMissingThreshold}`
      : base.detail,
  };
}

// ── INV-10.5-E ────────────────────────────────────────────────────
export function checkINV_105_E(): L10_5InvariantResult {
  const fx = buildGreenL10_5Fixture();
  const base = greenPipelineValid(fx);

  // A promotion condition anchored on the wrong candidate rejects.
  const detached = validateL10ShiftCondition({
    policy: fx.shift_condition_policy,
    observations: [
      {
        ...fx.shift_condition_observations[0],
        anchor_candidate_refs: [fx.primary_candidate_id],
      },
      ...fx.shift_condition_observations.slice(1),
    ],
    primary_candidate_ref: fx.primary_candidate_id,
    secondary_candidate_ref: fx.secondary_candidate_id,
    primary_has_active_invalidation: false,
    ranking_spread_is_narrow: true,
  });
  const rejectsDetached = detached.issues.some(
    i =>
      i.code ===
      L10EvidenceSemanticViolationCode.SHIFT_CONDITION_PROMOTION_DETACHED,
  );

  // A driver-less condition rejects.
  const noDriver = validateL10ShiftCondition({
    policy: fx.shift_condition_policy,
    observations: [
      { ...fx.shift_condition_observations[0], drivers: [] },
      ...fx.shift_condition_observations.slice(1),
    ],
    primary_candidate_ref: fx.primary_candidate_id,
    secondary_candidate_ref: fx.secondary_candidate_id,
    primary_has_active_invalidation: false,
    ranking_spread_is_narrow: true,
  });
  const rejectsNoDriver = noDriver.issues.some(
    i =>
      i.code ===
      L10EvidenceSemanticViolationCode.SHIFT_CONDITION_MISSING_DRIVER,
  );

  return {
    id: 'INV-10.5-E',
    name: 'Shift conditions anchored, driver-cited, competition-aware.',
    holds: base.ok && rejectsDetached && rejectsNoDriver,
    evidence: base.ok
      ? `green ok; detached=${rejectsDetached}, no-driver=${rejectsNoDriver}`
      : base.detail,
  };
}

// ── INV-10.5-F ────────────────────────────────────────────────────
export function checkINV_105_F(): L10_5InvariantResult {
  const fx = buildGreenL10_5Fixture();
  const base = greenPipelineValid(fx);

  // Stale posture with non-STALE role rejects.
  const stale = validateL10Support({
    policy: fx.support_policy,
    observations: [
      {
        ...fx.support_observations[0],
        support_posture: L10EvidencePostureClass.STALE,
        support_role: L10SupportRoleClass.PRIMARY_SUPPORT,
      },
    ],
    declared_derivability_facets:
      fx.support_policy.required_derivability_facets,
    observed_domains: ['structural', 'validation'],
    declared_missing_expected_domains: [],
  });
  const rejectsStale = stale.issues.some(
    i =>
      i.code ===
      L10EvidenceSemanticViolationCode.SUPPORT_STALE_PRESENTED_AS_CLEAN,
  );

  // Evidence-only posture anchoring primary-capable support rejects.
  const evidenceOnly = validateL10Support({
    policy: fx.support_policy,
    observations: [
      {
        ...fx.support_observations[0],
        support_posture: L10EvidencePostureClass.EVIDENCE_ONLY,
        support_role: L10SupportRoleClass.PRIMARY_SUPPORT,
      },
    ],
    declared_derivability_facets:
      fx.support_policy.required_derivability_facets,
    observed_domains: ['structural', 'validation'],
    declared_missing_expected_domains: [],
  });
  const rejectsEvidenceOnly = evidenceOnly.issues.some(
    i =>
      i.code ===
      L10EvidenceSemanticViolationCode.SUPPORT_PRIMARY_FROM_EVIDENCE_ONLY,
  );

  return {
    id: 'INV-10.5-F',
    name: 'Evidence posture explicit; no masquerade as clean.',
    holds: base.ok && rejectsStale && rejectsEvidenceOnly,
    evidence: base.ok
      ? `green ok; stale=${rejectsStale}, evidence-only=${rejectsEvidenceOnly}`
      : base.detail,
  };
}

// ── INV-10.5-G ────────────────────────────────────────────────────
export function checkINV_105_G(): L10_5InvariantResult {
  const fx = buildGreenL10_5Fixture();
  const base = greenPipelineValid(fx);

  // Netting / single-story flattening rejects.
  const flattened = validateL10EvidenceInteraction({
    hypothesis_candidate_id: fx.primary_candidate_id,
    support: fx.support_observations,
    contradiction: fx.contradiction_observations,
    confirmation: fx.confirmation_observations,
    invalidation: fx.invalidation_observations,
    shift_conditions: fx.shift_condition_observations,
    executed_stage_order: fx.executed_stage_order,
    stability_posture: fx.stability_posture,
    explicit_surfaces_preserved: false,
    confidence_capped_under_active_invalidation: true,
    ranking_spread_is_narrow: true,
    emitted_confidence: fx.emitted_confidence,
  });
  const rejectsFlatten = flattened.issues.some(
    i =>
      i.code ===
      L10EvidenceSemanticViolationCode.INTERACTION_FLATTENED_INTO_SINGLE_STORY,
  );

  // Stage-order violation rejects.
  const wrongOrder = validateL10EvidenceInteraction({
    hypothesis_candidate_id: fx.primary_candidate_id,
    support: fx.support_observations,
    contradiction: fx.contradiction_observations,
    confirmation: fx.confirmation_observations,
    invalidation: fx.invalidation_observations,
    shift_conditions: fx.shift_condition_observations,
    executed_stage_order: [
      L10EvidenceSemanticStage.S2_CONTRADICTION,
      L10EvidenceSemanticStage.S1_SUPPORT,
    ],
    stability_posture: fx.stability_posture,
    explicit_surfaces_preserved: true,
    confidence_capped_under_active_invalidation: true,
    ranking_spread_is_narrow: true,
    emitted_confidence: fx.emitted_confidence,
  });
  const rejectsOrder = wrongOrder.issues.some(
    i =>
      i.code ===
      L10EvidenceSemanticViolationCode.INTERACTION_SEMANTIC_ORDER_VIOLATED,
  );

  // Fragile-but-stable rejects.
  const fragileStable = validateL10EvidenceInteraction({
    hypothesis_candidate_id: fx.primary_candidate_id,
    support: fx.support_observations,
    contradiction: [
      {
        ...fx.contradiction_observations[0],
        contradiction_temporal_posture:
          L10ContradictionTemporalPosture.ACTIVE,
        contradiction_effect: L10ContradictionEffectClass.BLOCKING,
      },
    ],
    confirmation: fx.confirmation_observations,
    invalidation: fx.invalidation_observations,
    shift_conditions: fx.shift_condition_observations,
    executed_stage_order: fx.executed_stage_order,
    stability_posture: L10CandidateStabilityClass.STABLE,
    explicit_surfaces_preserved: true,
    confidence_capped_under_active_invalidation: true,
    ranking_spread_is_narrow: true,
    emitted_confidence: fx.emitted_confidence,
  });
  const rejectsFragileStable = fragileStable.issues.some(
    i =>
      i.code ===
      L10EvidenceSemanticViolationCode.INTERACTION_FRAGILE_CANDIDATE_MARKED_STABLE,
  );

  return {
    id: 'INV-10.5-G',
    name: 'No flattening; semantic order preserved; fragility honoured.',
    holds: base.ok && rejectsFlatten && rejectsOrder && rejectsFragileStable,
    evidence: base.ok
      ? `green ok; flatten=${rejectsFlatten}, order=${rejectsOrder}, fragile-stable=${rejectsFragileStable}`
      : base.detail,
  };
}

void L10SupportDerivabilityFacet;
