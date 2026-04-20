/**
 * L10.5 — Evidence-Semantics Certification Test Suite
 *
 * 5 Bands (§10.5.11):
 *   A — Support law: roles, primary-capable, stale/degraded, missing
 *       expected, derivability facets
 *   B — Contradiction law: classes, narrowing vs blocking, active vs
 *       decayed, directness, mandatory domains, no-netting
 *   C — Confirmation + Invalidation law: required/present/missing,
 *       active-vs-potential, collapse thresholds, confidence cap
 *   D — Shift-condition law: anchors, drivers, mandatory classes,
 *       collapse under active invalidation, spread narrowing, min-count
 *   E — Interaction, audit, INV-10.5-A..G
 */

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
  ALL_L10_SUPPORT_ROLE_CLASSES,
  ALL_L10_CONTRADICTION_CLASSES,
  ALL_L10_CONTRADICTION_EFFECT_CLASSES,
  ALL_L10_CONFIRMATION_CLASSES,
  ALL_L10_INVALIDATION_CLASSES,
  ALL_L10_SHIFT_CONDITION_CLASSES,
  ALL_L10_EVIDENCE_POSTURE_CLASSES,
  L10_EVIDENCE_SEMANTIC_STAGES,
} from '../l10/contracts/hypothesis-evidence-semantics-types';
import { L10SupportDerivabilityFacet } from '../l10/contracts/hypothesis-support-policy';
import { L10ContradictionDerivabilityFacet } from '../l10/contracts/hypothesis-contradiction-policy';
import {
  L10CollapseThresholdBasis,
  L10HypothesisInvalidationPolicy,
} from '../l10/contracts/hypothesis-invalidation-policy';
import {
  L10ShiftConditionDriver,
} from '../l10/contracts/hypothesis-shift-condition-policy';

import {
  validateL10Support,
  validateL10Contradiction,
  validateL10Confirmation,
  validateL10Invalidation,
  validateL10ShiftCondition,
  validateL10EvidenceInteraction,
  L10EvidenceSemanticViolationCode,
} from '../l10/validation';

import {
  L10HypothesisSupportPolicyRegistry,
  L10HypothesisContradictionPolicyRegistry,
  L10HypothesisConfirmationPolicyRegistry,
  L10HypothesisInvalidationPolicyRegistry,
  L10HypothesisShiftConditionPolicyRegistry,
} from '../l10/registry';

import {
  L10EvidenceSemanticAuditSeverity,
  L10EvidenceSemanticSurface,
  classifyL10EvidenceSemanticSeverity,
  emitL10EvidenceSemanticsAudit,
  clearL10EvidenceSemanticsAuditLog,
  hasL10EvidenceSemanticsBlockingViolations,
  getL10EvidenceSemanticsAuditLog,
} from '../l10/constitution/l10-evidence-semantics-audit';

import {
  buildGreenL10_5Fixture,
  buildGreenSupportObservations,
  buildGreenSupportPolicy,
  buildGreenContradictionObservations,
  buildGreenContradictionPolicy,
  buildGreenConfirmationObservations,
  buildGreenConfirmationPolicy,
  buildGreenInvalidationObservations,
  buildGreenInvalidationPolicy,
  buildGreenShiftConditionObservations,
  buildGreenShiftConditionPolicy,
} from '../l10/invariants/l10_5-fixtures';
import {
  checkINV_105_A,
  checkINV_105_B,
  checkINV_105_C,
  checkINV_105_D,
  checkINV_105_E,
  checkINV_105_F,
  checkINV_105_G,
} from '../l10/invariants/l10_5-invariants';

const V = L10EvidenceSemanticViolationCode;

let passed = 0;
let failed = 0;
const failures: string[] = [];
function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.log(`  ✗ ${label}`); }
}

const fx = buildGreenL10_5Fixture();
const primaryId = fx.primary_candidate_id;
const secondaryId = fx.secondary_candidate_id;
const subjectId = fx.subject_id;
const rankingRef = fx.ranking_ref;

// ═══════════════════════════════════════════════════════════════
// BAND A — Support law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Support law ═══');

assert(ALL_L10_SUPPORT_ROLE_CLASSES.length === 7,
  'A.01 support role taxonomy has 7 classes');
assert(ALL_L10_SUPPORT_ROLE_CLASSES.includes(L10SupportRoleClass.PRIMARY_SUPPORT)
  && ALL_L10_SUPPORT_ROLE_CLASSES.includes(L10SupportRoleClass.STALE_SUPPORT)
  && ALL_L10_SUPPORT_ROLE_CLASSES.includes(L10SupportRoleClass.MISSING_EXPECTED_SUPPORT),
  'A.02 taxonomy includes primary, stale, missing-expected');

// Green support passes
const greenSupport = validateL10Support({
  policy: fx.support_policy,
  observations: fx.support_observations,
  declared_derivability_facets: fx.support_policy.required_derivability_facets,
  observed_domains: ['structural', 'validation', 'regime'],
  declared_missing_expected_domains: [],
});
assert(greenSupport.valid, 'A.03 green support passes validator');

// Missing role rejected
const noRoleRep = validateL10Support({
  policy: fx.support_policy,
  observations: [{
    ...fx.support_observations[0],
    support_role: undefined as unknown as L10SupportRoleClass,
  }],
  declared_derivability_facets: fx.support_policy.required_derivability_facets,
  observed_domains: ['structural', 'validation'],
  declared_missing_expected_domains: [],
});
assert(noRoleRep.issues.some(i => i.code === V.SUPPORT_MISSING_ROLE),
  'A.04 missing support role rejected');

// Stale posture presenting as non-stale role rejected
const staleMasquerade = validateL10Support({
  policy: fx.support_policy,
  observations: [{
    ...fx.support_observations[0],
    support_posture: L10EvidencePostureClass.STALE,
    support_role: L10SupportRoleClass.PRIMARY_SUPPORT,
  }],
  declared_derivability_facets: fx.support_policy.required_derivability_facets,
  observed_domains: ['structural', 'validation'],
  declared_missing_expected_domains: [],
});
assert(staleMasquerade.issues.some(
  i => i.code === V.SUPPORT_STALE_PRESENTED_AS_CLEAN),
  'A.05 stale posture masquerading as clean rejected');

// Evidence-only anchoring primary is rejected
const evOnlyPrimary = validateL10Support({
  policy: fx.support_policy,
  observations: [{
    ...fx.support_observations[0],
    support_posture: L10EvidencePostureClass.EVIDENCE_ONLY,
    support_role: L10SupportRoleClass.PRIMARY_SUPPORT,
  }],
  declared_derivability_facets: fx.support_policy.required_derivability_facets,
  observed_domains: ['structural', 'validation'],
  declared_missing_expected_domains: [],
});
assert(evOnlyPrimary.issues.some(
  i => i.code === V.SUPPORT_PRIMARY_FROM_EVIDENCE_ONLY),
  'A.06 evidence-only anchoring primary rejected');

// Missing expected domain hidden is rejected
const missingHidden = validateL10Support({
  policy: fx.support_policy,
  observations: fx.support_observations.filter(o => o.support_domain !== 'validation'),
  declared_derivability_facets: fx.support_policy.required_derivability_facets,
  observed_domains: ['structural'],
  declared_missing_expected_domains: [],
});
assert(missingHidden.issues.some(
  i => i.code === V.SUPPORT_MISSING_EXPECTED_HIDDEN),
  'A.07 silently-missing template domain rejected');

// Declared-missing is allowed
const declaredMissing = validateL10Support({
  policy: fx.support_policy,
  observations: fx.support_observations.filter(o => o.support_domain !== 'validation'),
  declared_derivability_facets: fx.support_policy.required_derivability_facets,
  observed_domains: ['structural'],
  declared_missing_expected_domains: ['validation'],
});
assert(!declaredMissing.issues.some(
  i => i.code === V.SUPPORT_MISSING_EXPECTED_HIDDEN),
  'A.08 declared-missing expected domain tolerated');

// Derivability facet missing rejected
const noFacet = validateL10Support({
  policy: fx.support_policy,
  observations: fx.support_observations,
  declared_derivability_facets: [
    L10SupportDerivabilityFacet.DOMAIN_FIT,
  ],
  observed_domains: ['structural', 'validation'],
  declared_missing_expected_domains: [],
});
assert(noFacet.issues.some(
  i => i.code === V.SUPPORT_DERIVABILITY_FACET_MISSING),
  'A.09 missing derivability facet rejected');

// Primary-capable role set is exactly {PRIMARY, SECONDARY}
assert(fx.support_policy.primary_anchor_roles.length === 2 &&
  fx.support_policy.primary_anchor_roles.includes(L10SupportRoleClass.PRIMARY_SUPPORT) &&
  fx.support_policy.primary_anchor_roles.includes(L10SupportRoleClass.SECONDARY_SUPPORT),
  'A.10 primary-capable roles limited to primary/secondary');

// ═══════════════════════════════════════════════════════════════
// BAND B — Contradiction law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Contradiction law ═══');

assert(ALL_L10_CONTRADICTION_CLASSES.length === 9,
  'B.01 contradiction taxonomy has 9 classes');
assert(ALL_L10_CONTRADICTION_EFFECT_CLASSES.length === 5,
  'B.02 contradiction effect taxonomy has 5 classes');

// Green contradiction passes
const greenContra = validateL10Contradiction({
  policy: fx.contradiction_policy,
  observations: fx.contradiction_observations,
  declared_derivability_facets: fx.contradiction_policy.required_derivability_facets,
  observed_domains: ['structural'],
  contradiction_netted_into_confidence: false,
});
assert(greenContra.valid, 'B.03 green contradiction passes');

// Blocking mislabeled as narrowing is rejected
const mislabel = validateL10Contradiction({
  policy: fx.contradiction_policy,
  observations: [{
    ...fx.contradiction_observations[0],
    contradiction_class: L10ContradictionClass.DIRECT_CONTRADICTION,
    contradiction_directness: L10ContradictionDirectness.DIRECT,
    contradiction_pressure: 0.9,
    contradiction_effect: L10ContradictionEffectClass.NARROWING,
  }],
  declared_derivability_facets: [
    L10ContradictionDerivabilityFacet.CORE_CLAIM_ATTACK,
    L10ContradictionDerivabilityFacet.TEMPORAL_RECENCY,
  ],
  observed_domains: ['structural'],
  contradiction_netted_into_confidence: false,
});
assert(mislabel.issues.some(
  i => i.code === V.CONTRADICTION_BLOCKING_MISLABELED_AS_NARROWING),
  'B.04 blocking mislabeled as narrowing rejected');

// Active mislabeled as decayed rejected
const activeDecayed = validateL10Contradiction({
  policy: fx.contradiction_policy,
  observations: [{
    ...fx.contradiction_observations[0],
    contradiction_class: L10ContradictionClass.DECAYED_CONTRADICTION,
    contradiction_temporal_posture: L10ContradictionTemporalPosture.ACTIVE,
  }],
  declared_derivability_facets: fx.contradiction_policy.required_derivability_facets,
  observed_domains: ['structural'],
  contradiction_netted_into_confidence: false,
});
assert(activeDecayed.issues.some(
  i => i.code === V.CONTRADICTION_ACTIVE_MISLABELED_AS_DECAYED),
  'B.05 active posture mislabeled decayed rejected');

// Mandatory domain omitted rejected
const domainOmitted = validateL10Contradiction({
  policy: fx.contradiction_policy,
  observations: fx.contradiction_observations,
  declared_derivability_facets: fx.contradiction_policy.required_derivability_facets,
  observed_domains: [], // omitted
  contradiction_netted_into_confidence: false,
});
assert(domainOmitted.issues.some(
  i => i.code === V.CONTRADICTION_DOMAIN_OMITTED),
  'B.06 mandatory contradiction domain omitted rejected');

// No-netting rule
const netted = validateL10Contradiction({
  policy: fx.contradiction_policy,
  observations: fx.contradiction_observations,
  declared_derivability_facets: fx.contradiction_policy.required_derivability_facets,
  observed_domains: ['structural'],
  contradiction_netted_into_confidence: true,
});
assert(netted.issues.some(
  i => i.code === V.CONTRADICTION_NETTED_INTO_CONFIDENCE),
  'B.07 contradiction netting rejected');

// Disallowed class rejected
const disallowed = validateL10Contradiction({
  policy: fx.contradiction_policy,
  observations: [{
    ...fx.contradiction_observations[0],
    contradiction_class: L10ContradictionClass.OVERHANG_CONTRADICTION,
  }],
  declared_derivability_facets: fx.contradiction_policy.required_derivability_facets,
  observed_domains: ['structural'],
  contradiction_netted_into_confidence: false,
});
assert(disallowed.issues.some(
  i => i.code === V.CONTRADICTION_CLASS_DISALLOWED),
  'B.08 disallowed contradiction class rejected');

// Out-of-range pressure rejected
const badPressure = validateL10Contradiction({
  policy: fx.contradiction_policy,
  observations: [{
    ...fx.contradiction_observations[0],
    contradiction_pressure: 1.5,
  }],
  declared_derivability_facets: fx.contradiction_policy.required_derivability_facets,
  observed_domains: ['structural'],
  contradiction_netted_into_confidence: false,
});
assert(badPressure.issues.some(
  i => i.code === V.CONTRADICTION_PRESSURE_OUT_OF_RANGE),
  'B.09 out-of-range pressure rejected');

// ═══════════════════════════════════════════════════════════════
// BAND C — Confirmation and invalidation law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Confirmation and invalidation law ═══');

assert(ALL_L10_CONFIRMATION_CLASSES.length === 7,
  'C.01 confirmation taxonomy has 7 classes');
assert(ALL_L10_INVALIDATION_CLASSES.length === 8,
  'C.02 invalidation taxonomy has 8 classes');

// Green confirmation passes
const greenCnf = validateL10Confirmation({
  policy: fx.confirmation_policy,
  observations: fx.confirmation_observations,
  required_and_present_collapsed: false,
  observed_domains: ['validation'],
  is_primary: true,
});
assert(greenCnf.valid,
  `C.03 green confirmation passes (${greenCnf.issues.map(i=>i.code).join(',')})`);

// Required/present collapse rejected
const collapsed = validateL10Confirmation({
  policy: fx.confirmation_policy,
  observations: fx.confirmation_observations,
  required_and_present_collapsed: true,
  observed_domains: ['validation'],
  is_primary: true,
});
assert(collapsed.issues.some(
  i => i.code === V.CONFIRMATION_REQUIRED_AND_PRESENT_COLLAPSED),
  'C.04 collapsed required/present rejected');

// Primary with missing upgrade rejected
const primaryMissing = validateL10Confirmation({
  policy: fx.confirmation_policy,
  observations: [
    ...fx.confirmation_observations,
    {
      ...fx.confirmation_observations[0],
      observation_id: 'obs-miss-upg',
      confirmation_ref: 'l7:cnf-miss-upg',
      confirmation_class: L10ConfirmationClass.UPGRADE_CONFIRMATION,
      confirmation_presence: L10ConfirmationPresence.MISSING,
      is_upgrade_critical: true,
    },
  ],
  required_and_present_collapsed: false,
  observed_domains: ['validation'],
  is_primary: true,
});
assert(primaryMissing.issues.some(
  i => i.code === V.CONFIRMATION_PRIMARY_WITH_MISSING_UPGRADES),
  'C.05 primary with missing upgrade-critical rejected');

// Upgrade-critical on non-upgrade-capable class rejected
const badUpgradeFlag = validateL10Confirmation({
  policy: fx.confirmation_policy,
  observations: [{
    ...fx.confirmation_observations[0],
    confirmation_class: L10ConfirmationClass.STABILITY_CONFIRMATION,
    is_upgrade_critical: true,
  }],
  required_and_present_collapsed: false,
  observed_domains: ['validation'],
  is_primary: true,
});
assert(badUpgradeFlag.issues.some(
  i => i.code === V.CONFIRMATION_UPGRADE_CRITICAL_OMITTED),
  'C.06 upgrade-critical on wrong class rejected');

// Degraded posture treated as PRESENT rejected
const degradedFull = validateL10Confirmation({
  policy: fx.confirmation_policy,
  observations: [{
    ...fx.confirmation_observations[0],
    evidence_posture: L10EvidencePostureClass.DEGRADED,
    confirmation_presence: L10ConfirmationPresence.PRESENT,
  }],
  required_and_present_collapsed: false,
  observed_domains: ['validation'],
  is_primary: true,
});
assert(degradedFull.issues.some(
  i => i.code === V.CONFIRMATION_DEGRADED_TREATED_AS_FULL),
  'C.07 degraded confirmation treated as full rejected');

// Green invalidation passes
const greenInv = validateL10Invalidation({
  policy: fx.invalidation_policy,
  observations: fx.invalidation_observations,
  declared_threshold_bases: [L10CollapseThresholdBasis.SCALE_CROSSING],
  invalidation_risk_score: 0.2,
  confidence_cap_applied_when_active: true,
  is_primary_stable: false,
  active_vs_potential_split: true,
});
assert(greenInv.valid, 'C.08 green invalidation passes');

// Risk without signals rejected
const riskNoSignals = validateL10Invalidation({
  policy: fx.invalidation_policy,
  observations: [],
  declared_threshold_bases: [L10CollapseThresholdBasis.SCALE_CROSSING],
  invalidation_risk_score: 0.4,
  confidence_cap_applied_when_active: true,
  is_primary_stable: false,
  active_vs_potential_split: true,
});
assert(riskNoSignals.issues.some(
  i => i.code === V.INVALIDATION_RISK_CLAIMED_WITHOUT_SIGNALS),
  'C.09 invalidation risk without signals rejected');

// Active hidden in potential rejected
const activePotential = validateL10Invalidation({
  policy: fx.invalidation_policy,
  observations: [{
    ...fx.invalidation_observations[0],
    invalidation_class: L10InvalidationClass.POTENTIAL_INVALIDATION,
    is_currently_active: true,
  }],
  declared_threshold_bases: [L10CollapseThresholdBasis.SCALE_CROSSING],
  invalidation_risk_score: 0.4,
  confidence_cap_applied_when_active: true,
  is_primary_stable: false,
  active_vs_potential_split: true,
});
assert(activePotential.issues.some(
  i => i.code === V.INVALIDATION_ACTIVE_HIDDEN_IN_POTENTIAL),
  'C.10 active hidden in potential rejected');

// Missing threshold for THRESHOLD_INVALIDATION rejected
const missingThreshold = validateL10Invalidation({
  policy: fx.invalidation_policy,
  observations: [{
    ...fx.invalidation_observations[0],
    invalidation_class: L10InvalidationClass.THRESHOLD_INVALIDATION,
    collapse_threshold: null,
  }],
  declared_threshold_bases: [L10CollapseThresholdBasis.SCALE_CROSSING],
  invalidation_risk_score: 0,
  confidence_cap_applied_when_active: true,
  is_primary_stable: false,
  active_vs_potential_split: true,
});
assert(missingThreshold.issues.some(
  i => i.code === V.INVALIDATION_COLLAPSE_THRESHOLD_MISSING),
  'C.11 missing numeric threshold rejected');

// Threshold basis missing rejected
const policyWithExtraBasis: L10HypothesisInvalidationPolicy = {
  ...fx.invalidation_policy,
  required_collapse_threshold_bases: [
    L10CollapseThresholdBasis.SCALE_CROSSING,
    L10CollapseThresholdBasis.SUPPORT_DROPOUT,
  ],
};
const basisMissing = validateL10Invalidation({
  policy: policyWithExtraBasis,
  observations: fx.invalidation_observations,
  declared_threshold_bases: [L10CollapseThresholdBasis.SCALE_CROSSING],
  invalidation_risk_score: 0.1,
  confidence_cap_applied_when_active: true,
  is_primary_stable: false,
  active_vs_potential_split: true,
});
assert(basisMissing.issues.some(
  i => i.code === V.INVALIDATION_THRESHOLD_BASIS_MISSING),
  'C.12 missing threshold basis rejected');

// Active not capping confidence rejected
const notCapping = validateL10Invalidation({
  policy: fx.invalidation_policy,
  observations: [{
    ...fx.invalidation_observations[0],
    invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
    is_currently_active: true,
  }],
  declared_threshold_bases: [L10CollapseThresholdBasis.SCALE_CROSSING],
  invalidation_risk_score: 0.4,
  confidence_cap_applied_when_active: false,
  is_primary_stable: false,
  active_vs_potential_split: true,
});
assert(notCapping.issues.some(
  i => i.code === V.INVALIDATION_ACTIVE_NOT_CAPPING_CONFIDENCE),
  'C.13 active not capping confidence rejected');

// Primary stable under active rejected
const stableUnderActive = validateL10Invalidation({
  policy: fx.invalidation_policy,
  observations: [{
    ...fx.invalidation_observations[0],
    invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
    is_currently_active: true,
  }],
  declared_threshold_bases: [L10CollapseThresholdBasis.SCALE_CROSSING],
  invalidation_risk_score: 0.4,
  confidence_cap_applied_when_active: true,
  is_primary_stable: true,
  active_vs_potential_split: true,
});
assert(stableUnderActive.issues.some(
  i => i.code === V.INVALIDATION_PRIMARY_STABLE_UNDER_ACTIVE),
  'C.14 primary stable under active invalidation rejected');

// Not split rejected
const notSplit = validateL10Invalidation({
  policy: fx.invalidation_policy,
  observations: fx.invalidation_observations,
  declared_threshold_bases: [L10CollapseThresholdBasis.SCALE_CROSSING],
  invalidation_risk_score: 0.1,
  confidence_cap_applied_when_active: true,
  is_primary_stable: false,
  active_vs_potential_split: false,
});
assert(notSplit.issues.some(
  i => i.code === V.INVALIDATION_ACTIVE_VS_POTENTIAL_NOT_SPLIT),
  'C.15 active/potential not split rejected');

// ═══════════════════════════════════════════════════════════════
// BAND D — Shift-condition law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Shift-condition law ═══');

assert(ALL_L10_SHIFT_CONDITION_CLASSES.length === 7,
  'D.01 shift-condition taxonomy has 7 classes');

// Green shift condition passes
const greenShift = validateL10ShiftCondition({
  policy: fx.shift_condition_policy,
  observations: fx.shift_condition_observations,
  primary_candidate_ref: primaryId,
  secondary_candidate_ref: secondaryId,
  primary_has_active_invalidation: false,
  ranking_spread_is_narrow: true,
});
assert(greenShift.valid,
  `D.02 green shift passes (${greenShift.issues.map(i=>i.code).join(',')})`);

// Missing anchor rejected
const noAnchor = validateL10ShiftCondition({
  policy: fx.shift_condition_policy,
  observations: [
    { ...fx.shift_condition_observations[0], anchor_candidate_refs: [] },
    ...fx.shift_condition_observations.slice(1),
  ],
  primary_candidate_ref: primaryId,
  secondary_candidate_ref: secondaryId,
  primary_has_active_invalidation: false,
  ranking_spread_is_narrow: true,
});
assert(noAnchor.issues.some(
  i => i.code === V.SHIFT_CONDITION_MISSING_ANCHOR),
  'D.03 missing anchor rejected');

// Promotion anchored on primary (wrong) rejected
const wrongAnchor = validateL10ShiftCondition({
  policy: fx.shift_condition_policy,
  observations: [
    { ...fx.shift_condition_observations[0],
      anchor_candidate_refs: [primaryId] },
    ...fx.shift_condition_observations.slice(1),
  ],
  primary_candidate_ref: primaryId,
  secondary_candidate_ref: secondaryId,
  primary_has_active_invalidation: false,
  ranking_spread_is_narrow: true,
});
assert(wrongAnchor.issues.some(
  i => i.code === V.SHIFT_CONDITION_PROMOTION_DETACHED),
  'D.04 promotion anchored on primary rejected');

// Missing driver rejected
const noDriver = validateL10ShiftCondition({
  policy: fx.shift_condition_policy,
  observations: [
    { ...fx.shift_condition_observations[0], drivers: [] },
    ...fx.shift_condition_observations.slice(1),
  ],
  primary_candidate_ref: primaryId,
  secondary_candidate_ref: secondaryId,
  primary_has_active_invalidation: false,
  ranking_spread_is_narrow: true,
});
assert(noDriver.issues.some(
  i => i.code === V.SHIFT_CONDITION_MISSING_DRIVER),
  'D.05 missing governed driver rejected');

// Mandatory class missing when live rejected
const noPromo = validateL10ShiftCondition({
  policy: fx.shift_condition_policy,
  observations: fx.shift_condition_observations.filter(
    o => o.condition_class !== L10ShiftConditionClass.SECONDARY_PROMOTION_CONDITION,
  ),
  primary_candidate_ref: primaryId,
  secondary_candidate_ref: secondaryId,
  primary_has_active_invalidation: false,
  ranking_spread_is_narrow: true,
});
assert(noPromo.issues.some(
  i => i.code === V.SHIFT_CONDITION_MANDATORY_CLASS_MISSING),
  'D.06 mandatory class absent when live rejected');

// Below-min rejected
const belowMin = validateL10ShiftCondition({
  policy: fx.shift_condition_policy,
  observations: [fx.shift_condition_observations[0]],
  primary_candidate_ref: primaryId,
  secondary_candidate_ref: secondaryId,
  primary_has_active_invalidation: false,
  ranking_spread_is_narrow: true,
});
assert(belowMin.issues.some(
  i => i.code === V.SHIFT_CONDITION_BELOW_MIN_WHEN_LIVE),
  'D.07 below-minimum shift conditions rejected');

// Empty observations while live rejected
const emptyLive = validateL10ShiftCondition({
  policy: fx.shift_condition_policy,
  observations: [],
  primary_candidate_ref: primaryId,
  secondary_candidate_ref: secondaryId,
  primary_has_active_invalidation: false,
  ranking_spread_is_narrow: true,
});
assert(emptyLive.issues.some(
  i => i.code === V.SHIFT_CONDITION_STATIC_RANKING_WITH_LIVE_COMPETITION),
  'D.08 static ranking with live competition rejected');

// Collapse absent under active invalidation rejected
const noCollapse = validateL10ShiftCondition({
  policy: fx.shift_condition_policy,
  observations: fx.shift_condition_observations.filter(
    o => o.condition_class !== L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION,
  ),
  primary_candidate_ref: primaryId,
  secondary_candidate_ref: secondaryId,
  primary_has_active_invalidation: true,
  ranking_spread_is_narrow: true,
});
assert(noCollapse.issues.some(
  i => i.code === V.SHIFT_CONDITION_COLLAPSE_ABSENT_WITH_ACTIVE_INVALIDATION),
  'D.09 missing collapse condition under active invalidation rejected');

// Spread narrowing absent when narrow rejected
const noNarrow = validateL10ShiftCondition({
  policy: fx.shift_condition_policy,
  observations: fx.shift_condition_observations.filter(
    o => o.condition_class !== L10ShiftConditionClass.SPREAD_NARROWING_CONDITION,
  ),
  primary_candidate_ref: primaryId,
  secondary_candidate_ref: secondaryId,
  primary_has_active_invalidation: false,
  ranking_spread_is_narrow: true,
});
assert(noNarrow.issues.some(
  i => i.code === V.SHIFT_CONDITION_SPREAD_NARROWING_MISSING),
  'D.10 missing spread-narrowing condition rejected');

// Unregistered driver rejected
const badDriver = validateL10ShiftCondition({
  policy: fx.shift_condition_policy,
  observations: [
    { ...fx.shift_condition_observations[0],
      drivers: ['INVALID_DRIVER' as unknown as L10ShiftConditionDriver] },
    ...fx.shift_condition_observations.slice(1),
  ],
  primary_candidate_ref: primaryId,
  secondary_candidate_ref: secondaryId,
  primary_has_active_invalidation: false,
  ranking_spread_is_narrow: true,
});
assert(badDriver.issues.some(
  i => i.code === V.SHIFT_CONDITION_DRIVER_UNREGISTERED),
  'D.11 unregistered driver rejected');

// Evidence domain missing rejected
const noDomain = validateL10ShiftCondition({
  policy: fx.shift_condition_policy,
  observations: [
    { ...fx.shift_condition_observations[0], evidence_domain: '' },
    ...fx.shift_condition_observations.slice(1),
  ],
  primary_candidate_ref: primaryId,
  secondary_candidate_ref: secondaryId,
  primary_has_active_invalidation: false,
  ranking_spread_is_narrow: true,
});
assert(noDomain.issues.some(
  i => i.code === V.SHIFT_CONDITION_EVIDENCE_DOMAIN_MISSING),
  'D.12 evidence-domain-less shift condition rejected');

// ═══════════════════════════════════════════════════════════════
// BAND E — Interaction, audit, INV-10.5-A..G
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Interaction + audit + invariants ═══');

// Green interaction passes
const greenInt = validateL10EvidenceInteraction({
  hypothesis_candidate_id: primaryId,
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
assert(greenInt.valid,
  `E.01 green interaction passes (${greenInt.issues.map(i=>i.code).join(',')})`);

// No netting law: folded net score rejected
const flattened = validateL10EvidenceInteraction({
  hypothesis_candidate_id: primaryId,
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
assert(flattened.issues.some(
  i => i.code === V.INTERACTION_NETTED_SUPPORT_MINUS_CONTRADICTION) &&
  flattened.issues.some(
    i => i.code === V.INTERACTION_FLATTENED_INTO_SINGLE_STORY),
  'E.02 flattened / netted interaction rejected');

// Semantic order violation rejected
const badOrder = validateL10EvidenceInteraction({
  hypothesis_candidate_id: primaryId,
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
assert(badOrder.issues.some(
  i => i.code === V.INTERACTION_SEMANTIC_ORDER_VIOLATED),
  'E.03 semantic-order violation rejected');

// Fragile stable rejected (active contradiction)
const fragileStable = validateL10EvidenceInteraction({
  hypothesis_candidate_id: primaryId,
  support: fx.support_observations,
  contradiction: [{
    ...fx.contradiction_observations[0],
    contradiction_temporal_posture: L10ContradictionTemporalPosture.ACTIVE,
    contradiction_effect: L10ContradictionEffectClass.BLOCKING,
  }],
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
assert(fragileStable.issues.some(
  i => i.code === V.INTERACTION_FRAGILE_CANDIDATE_MARKED_STABLE),
  'E.04 fragile-as-stable rejected');

// Confidence uncapped under active invalidation rejected
const uncapped = validateL10EvidenceInteraction({
  hypothesis_candidate_id: primaryId,
  support: fx.support_observations,
  contradiction: fx.contradiction_observations,
  confirmation: fx.confirmation_observations,
  invalidation: [{
    ...fx.invalidation_observations[0],
    invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
    is_currently_active: true,
  }],
  shift_conditions: fx.shift_condition_observations,
  executed_stage_order: fx.executed_stage_order,
  stability_posture: L10CandidateStabilityClass.FRAGILE,
  explicit_surfaces_preserved: true,
  confidence_capped_under_active_invalidation: false,
  ranking_spread_is_narrow: true,
  emitted_confidence: 0.85,
});
assert(uncapped.issues.some(
  i => i.code === V.INTERACTION_CONFIDENCE_UNCAPPED_UNDER_ACTIVE_INVALIDATION),
  'E.05 uncapped confidence under active invalidation rejected');

// Narrow spread without shift conditions rejected
const narrowNoShift = validateL10EvidenceInteraction({
  hypothesis_candidate_id: primaryId,
  support: fx.support_observations,
  contradiction: fx.contradiction_observations,
  confirmation: fx.confirmation_observations,
  invalidation: fx.invalidation_observations,
  shift_conditions: [
    fx.shift_condition_observations.find(
      o => o.condition_class === L10ShiftConditionClass.PRIMARY_REINFORCEMENT_CONDITION)!,
  ],
  executed_stage_order: fx.executed_stage_order,
  stability_posture: fx.stability_posture,
  explicit_surfaces_preserved: true,
  confidence_capped_under_active_invalidation: true,
  ranking_spread_is_narrow: true,
  emitted_confidence: fx.emitted_confidence,
});
assert(narrowNoShift.issues.some(
  i => i.code === V.INTERACTION_SPREAD_NARROW_WITHOUT_SHIFT_CONDITIONS),
  'E.06 narrow spread w/o narrowing/promotion conditions rejected');

// Missing confirmation not fragile rejected
const missingCnfStable = validateL10EvidenceInteraction({
  hypothesis_candidate_id: primaryId,
  support: fx.support_observations,
  contradiction: fx.contradiction_observations,
  confirmation: [
    ...fx.confirmation_observations,
    {
      ...fx.confirmation_observations[0],
      observation_id: 'obs-miss',
      confirmation_ref: 'l7:cnf-missing-1',
      confirmation_class: L10ConfirmationClass.MISSING_CONFIRMATION,
      confirmation_presence: L10ConfirmationPresence.MISSING,
      is_upgrade_critical: false,
    },
  ],
  invalidation: fx.invalidation_observations,
  shift_conditions: fx.shift_condition_observations,
  executed_stage_order: fx.executed_stage_order,
  stability_posture: L10CandidateStabilityClass.STABLE,
  explicit_surfaces_preserved: true,
  confidence_capped_under_active_invalidation: true,
  ranking_spread_is_narrow: true,
  emitted_confidence: fx.emitted_confidence,
});
assert(missingCnfStable.issues.some(
  i => i.code === V.INTERACTION_MISSING_CONFIRMATION_NOT_FRAGILE),
  'E.07 missing confirmations reported STABLE rejected');

// Audit severity classification
assert(
  classifyL10EvidenceSemanticSeverity(V.CONTRADICTION_NETTED_INTO_CONFIDENCE)
    === L10EvidenceSemanticAuditSeverity.CRITICAL,
  'E.08 netting classified CRITICAL');
assert(
  classifyL10EvidenceSemanticSeverity(V.SUPPORT_MISSING_ROLE)
    === L10EvidenceSemanticAuditSeverity.HIGH,
  'E.09 missing-role classified HIGH');
assert(
  classifyL10EvidenceSemanticSeverity(V.SUPPORT_STRENGTH_OUT_OF_RANGE)
    === L10EvidenceSemanticAuditSeverity.WARNING,
  'E.10 out-of-range classified WARNING');

// Audit emission
clearL10EvidenceSemanticsAuditLog();
emitL10EvidenceSemanticsAudit(
  L10EvidenceSemanticSurface.CONTRADICTION,
  'cand-x',
  netted,
);
const auditRecords = getL10EvidenceSemanticsAuditLog();
assert(auditRecords.length >= 1 &&
  auditRecords.some(r => r.code === V.CONTRADICTION_NETTED_INTO_CONFIDENCE),
  'E.11 audit records emitted deterministically');
assert(hasL10EvidenceSemanticsBlockingViolations(auditRecords),
  'E.12 audit flags blocking severity');

// Registries reject duplicates
const supReg = new L10HypothesisSupportPolicyRegistry();
supReg.register(fx.support_policy);
let dupThrown = false;
try { supReg.register(fx.support_policy); }
catch { dupThrown = true; }
assert(dupThrown, 'E.13 support registry rejects duplicates');

const shiftReg = new L10HypothesisShiftConditionPolicyRegistry();
shiftReg.register(fx.shift_condition_policy);
assert(shiftReg.getForSubject(subjectId) === fx.shift_condition_policy,
  'E.14 shift-condition registry indexed by subject');

// Registries per-type hold their policies independently
const ctrReg = new L10HypothesisContradictionPolicyRegistry();
const cnfReg = new L10HypothesisConfirmationPolicyRegistry();
const invReg = new L10HypothesisInvalidationPolicyRegistry();
ctrReg.register(fx.contradiction_policy);
cnfReg.register(fx.confirmation_policy);
invReg.register(fx.invalidation_policy);
assert(ctrReg.size() === 1 && cnfReg.size() === 1 && invReg.size() === 1,
  'E.15 contradiction/confirmation/invalidation registries operate independently');

// Canonical stage order
assert(L10_EVIDENCE_SEMANTIC_STAGES.length === 6,
  'E.16 canonical evidence-semantic stage order has 6 stages');
assert(L10_EVIDENCE_SEMANTIC_STAGES[0] === L10EvidenceSemanticStage.S1_SUPPORT &&
  L10_EVIDENCE_SEMANTIC_STAGES[5] === L10EvidenceSemanticStage.S6_SHIFT_CONDITIONS,
  'E.17 stage order starts at SUPPORT ends at SHIFT_CONDITIONS');

// Posture taxonomy complete
assert(ALL_L10_EVIDENCE_POSTURE_CLASSES.length === 6,
  'E.18 evidence-posture taxonomy has 6 classes');

// Invariants
const invariants = [
  checkINV_105_A(),
  checkINV_105_B(),
  checkINV_105_C(),
  checkINV_105_D(),
  checkINV_105_E(),
  checkINV_105_F(),
  checkINV_105_G(),
];
for (const r of invariants) {
  assert(r.holds, `E.${19 + invariants.indexOf(r)} ${r.id} — ${r.evidence}`);
}

// Cross-check: the green pipeline does not trip ANY evidence-semantics
// validator, and therefore produces ZERO audit records.
clearL10EvidenceSemanticsAuditLog();
emitL10EvidenceSemanticsAudit(
  L10EvidenceSemanticSurface.SUPPORT,
  primaryId,
  greenSupport,
);
emitL10EvidenceSemanticsAudit(
  L10EvidenceSemanticSurface.CONTRADICTION,
  primaryId,
  greenContra,
);
emitL10EvidenceSemanticsAudit(
  L10EvidenceSemanticSurface.CONFIRMATION,
  primaryId,
  greenCnf,
);
emitL10EvidenceSemanticsAudit(
  L10EvidenceSemanticSurface.INVALIDATION,
  primaryId,
  greenInv,
);
emitL10EvidenceSemanticsAudit(
  L10EvidenceSemanticSurface.SHIFT_CONDITION,
  subjectId,
  greenShift,
);
emitL10EvidenceSemanticsAudit(
  L10EvidenceSemanticSurface.INTERACTION,
  primaryId,
  greenInt,
);
assert(getL10EvidenceSemanticsAuditLog().length === 0,
  'E.26 green pipeline emits zero audit records');

// Fixture helpers remain deterministic
const a1 = buildGreenSupportPolicy(primaryId).policy_id;
const a2 = buildGreenSupportPolicy(primaryId).policy_id;
assert(a1 === a2, 'E.27 support policy id deterministic');

const b1 = buildGreenContradictionPolicy(primaryId).policy_id;
const b2 = buildGreenContradictionPolicy(primaryId).policy_id;
assert(b1 === b2, 'E.28 contradiction policy id deterministic');

const c1 = buildGreenConfirmationPolicy(primaryId).policy_id;
const c2 = buildGreenConfirmationPolicy(primaryId).policy_id;
assert(c1 === c2, 'E.29 confirmation policy id deterministic');

const d1 = buildGreenInvalidationPolicy(primaryId).policy_id;
const d2 = buildGreenInvalidationPolicy(primaryId).policy_id;
assert(d1 === d2, 'E.30 invalidation policy id deterministic');

const e1 = buildGreenShiftConditionPolicy(subjectId).policy_id;
const e2 = buildGreenShiftConditionPolicy(subjectId).policy_id;
assert(e1 === e2, 'E.31 shift-condition policy id deterministic');

const o1 = buildGreenSupportObservations(primaryId)[0].observation_id;
const o2 = buildGreenSupportObservations(primaryId)[0].observation_id;
assert(o1 === o2, 'E.32 support observation id deterministic');

const o3 = buildGreenContradictionObservations(primaryId)[0].observation_id;
const o4 = buildGreenContradictionObservations(primaryId)[0].observation_id;
assert(o3 === o4, 'E.33 contradiction observation id deterministic');

const o5 = buildGreenConfirmationObservations(primaryId)[0].observation_id;
const o6 = buildGreenConfirmationObservations(primaryId)[0].observation_id;
assert(o5 === o6, 'E.34 confirmation observation id deterministic');

const o7 = buildGreenInvalidationObservations(primaryId)[0].observation_id;
const o8 = buildGreenInvalidationObservations(primaryId)[0].observation_id;
assert(o7 === o8, 'E.35 invalidation observation id deterministic');

const o9 = buildGreenShiftConditionObservations(subjectId, rankingRef, primaryId, secondaryId)[0].observation_id;
const o10 = buildGreenShiftConditionObservations(subjectId, rankingRef, primaryId, secondaryId)[0].observation_id;
assert(o9 === o10, 'E.36 shift-condition observation id deterministic');

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`L10.5 certification: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════════════════════════');
if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
