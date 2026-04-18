/**
 * L8.5 — Input Law Invariants
 *
 * §8.5.11.1 — INV-8.5-A through INV-8.5-G as executable functions.
 *
 *   INV-8.5-A : Every regime input must map to a registered lower-layer
 *               surface family and input domain.
 *   INV-8.5-B : Every dependency binding must declare a legal dependency
 *               class and maximum reliance class.
 *   INV-8.5-C : Evidence-only, optional, and historical inputs may not
 *               masquerade as required current support.
 *   INV-8.5-D : L7 restriction profiles and contradiction posture must
 *               be consumed wherever required by subject policy.
 *   INV-8.5-E : Stale or degraded lower-layer evidence may not appear as
 *               clean current regime support.
 *   INV-8.5-F : Layer 8 may not rebuild validation live from raw L6
 *               primitives when L7 consumption is required.
 *   INV-8.5-G : Later-layer scenario/judgment surfaces are illegal
 *               regime inputs.
 */

import {
  L8RegimeInputFamily,
  ALL_L8_REGIME_INPUT_FAMILIES,
  isL8RegisteredInputFamily,
} from '../contracts/regime-input-family';
import {
  L8RegimeInputDomain,
  ALL_L8_REGIME_INPUT_DOMAINS,
  isL8RegisteredInputDomain,
} from '../contracts/regime-input-domain';
import {
  L8RegimeDependencyClass,
  L8RegimeMaxRelianceClass,
  L8RegimeInputBinding,
  maxRelianceCeilingFor,
  relianceExceedsCeiling,
} from '../contracts/regime-input-binding';
import {
  L8RegimeInputAdmissibilityClass,
} from '../contracts/regime-admissibility';
import {
  L8RegimeConsumptionRight,
  L8RegimeInputViolationCode,
} from '../contracts/regime-consumption-rights';
import { validateRegimeInputBinding } from '../validation/regime-input-binding.validator';
import { resolveRegimeInputAdmissibility } from '../validation/regime-admissibility.validator';
import { validateRegimeConsumptionRight } from '../validation/regime-consumption-rights.validator';
import { validateLowerLayerConsumption } from '../validation/regime-lower-layer-consumption.validator';

export interface L8_5InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ──────────────────────────────────────────────────────────────────
// Helpers — construct a canonical green binding for invariant tests.
// ──────────────────────────────────────────────────────────────────

export function buildGreenL7ValidationBinding(): L8RegimeInputBinding {
  return {
    binding_id: 'bind:macro:l7_validation',
    regime_subject_id: 'rsub_macro_inv',
    ref: 'l7:validation_assessment/macro',
    input_family: L8RegimeInputFamily.VALIDATION_ASSESSMENT_FAMILY,
    input_domain: L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
    source_layer: 'L7',
    source_surface_class: 'L7_VALIDATION_ASSESSMENT',
    dependency_class: L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT,
    max_reliance_class: L8RegimeMaxRelianceClass.FULL_SUPPORT,
    scope_constraints: {
      scope_type: 'MARKET', scope_id: 'global',
      requires_exact_scope: true,
    },
    freshness_constraints: {
      max_age_seconds: 900,
      required_current: true,
      stale_tolerance: 'STRICT',
    },
    restriction_consumption_required: true,
    contradiction_consumption_required: true,
  };
}

export function buildGreenL6FeatureBinding(): L8RegimeInputBinding {
  return {
    binding_id: 'bind:macro:l6_momentum',
    regime_subject_id: 'rsub_macro_inv',
    ref: 'l6:current_feature_state/macro_risk',
    input_family: L8RegimeInputFamily.MOMENTUM_PARTICIPATION_FAMILY,
    input_domain: L8RegimeInputDomain.BREADTH_DOMAIN,
    source_layer: 'L6',
    source_surface_class: 'L6_CURRENT_FEATURE_STATE',
    dependency_class: L8RegimeDependencyClass.REQUIRED_PRIMITIVE_INPUT,
    max_reliance_class: L8RegimeMaxRelianceClass.NARROWED_SUPPORT,
    scope_constraints: {
      scope_type: 'MARKET', scope_id: 'global',
      requires_exact_scope: true,
    },
    freshness_constraints: {
      max_age_seconds: 300,
      required_current: true,
      stale_tolerance: 'STRICT',
    },
    restriction_consumption_required: false,
    contradiction_consumption_required: false,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-8.5-A
// ──────────────────────────────────────────────────────────────────

export function checkINV_85_A(): L8_5InvariantResult {
  // Every descriptor maps to a registered family + domain
  const allFamiliesRegistered =
    ALL_L8_REGIME_INPUT_FAMILIES.every(f => isL8RegisteredInputFamily(f));
  const allDomainsRegistered =
    ALL_L8_REGIME_INPUT_DOMAINS.every(d => isL8RegisteredInputDomain(d));
  // Fabricated fake family blocked
  const fake = validateRegimeInputBinding({
    ...buildGreenL6FeatureBinding(),
    input_family: 'FAKE_FAMILY' as L8RegimeInputFamily,
  });
  const fakeBlocked = !fake.valid &&
    fake.issues.some(i =>
      i.code === L8RegimeInputViolationCode.UNREGISTERED_FAMILY);

  // Fabricated fake domain blocked
  const fakeDomain = validateRegimeInputBinding({
    ...buildGreenL6FeatureBinding(),
    input_domain: 'FAKE_DOMAIN' as L8RegimeInputDomain,
  });
  const fakeDomainBlocked = !fakeDomain.valid &&
    fakeDomain.issues.some(i =>
      i.code === L8RegimeInputViolationCode.UNREGISTERED_DOMAIN);

  // Domain/family mismatch blocked
  const mismatch = validateRegimeInputBinding({
    ...buildGreenL6FeatureBinding(),
    input_domain: L8RegimeInputDomain.DERIVATIVES_STRUCTURE_DOMAIN,
  });
  const mismatchBlocked = !mismatch.valid &&
    mismatch.issues.some(i =>
      i.code === L8RegimeInputViolationCode.DOMAIN_FAMILY_MISMATCH);

  return {
    id: 'INV-8.5-A',
    name: 'Every regime input maps to a registered family + domain',
    holds:
      allFamiliesRegistered && allDomainsRegistered && fakeBlocked &&
      fakeDomainBlocked && mismatchBlocked,
    evidence:
      `families_ok=${allFamiliesRegistered}, domains_ok=${allDomainsRegistered}, ` +
      `fake_family_blocked=${fakeBlocked}, fake_domain_blocked=${fakeDomainBlocked}, ` +
      `mismatch_blocked=${mismatchBlocked}`,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-8.5-B
// ──────────────────────────────────────────────────────────────────

export function checkINV_85_B(): L8_5InvariantResult {
  const green = validateRegimeInputBinding(buildGreenL7ValidationBinding());
  const greenOk = green.valid;

  // Reliance exceeding ceiling
  const over = validateRegimeInputBinding({
    ...buildGreenL6FeatureBinding(),
    max_reliance_class: L8RegimeMaxRelianceClass.FULL_SUPPORT,
  });
  const overBlocked = !over.valid &&
    over.issues.some(i =>
      i.code === L8RegimeInputViolationCode.BINDING_RELIANCE_EXCEEDS_CEILING);

  // Missing reliance
  const noReliance = validateRegimeInputBinding({
    ...buildGreenL6FeatureBinding(),
    max_reliance_class:
      '' as unknown as L8RegimeMaxRelianceClass,
  });
  const noRelianceBlocked = !noReliance.valid;

  // Ceiling semantics
  const ceilingForValidation =
    maxRelianceCeilingFor(
      L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT);
  const ceilingOk =
    ceilingForValidation === L8RegimeMaxRelianceClass.FULL_SUPPORT &&
    relianceExceedsCeiling(L8RegimeMaxRelianceClass.FULL_SUPPORT,
      L8RegimeMaxRelianceClass.NARROWED_SUPPORT);

  return {
    id: 'INV-8.5-B',
    name: 'Bindings declare legal dependency + max reliance classes',
    holds:
      greenOk && overBlocked && noRelianceBlocked && ceilingOk,
    evidence:
      `green=${greenOk}, over_blocked=${overBlocked}, ` +
      `no_reliance_blocked=${noRelianceBlocked}, ceiling_ok=${ceilingOk}`,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-8.5-C
// ──────────────────────────────────────────────────────────────────

export function checkINV_85_C(): L8_5InvariantResult {
  // Optional context bound as required
  const optAsRequired = validateRegimeInputBinding({
    ...buildGreenL6FeatureBinding(),
    dependency_class: L8RegimeDependencyClass.OPTIONAL_CONTEXT_INPUT,
    max_reliance_class: L8RegimeMaxRelianceClass.FULL_SUPPORT,
  });
  const optBlocked = !optAsRequired.valid;

  // Historical surface bound as required current input
  const histAsCurrent = validateRegimeInputBinding({
    ...buildGreenL6FeatureBinding(),
    source_surface_class: 'L6_FEATURE_HISTORY',
    dependency_class: L8RegimeDependencyClass.REQUIRED_PRIMITIVE_INPUT,
  });
  const histBlocked = !histAsCurrent.valid &&
    histAsCurrent.issues.some(i =>
      i.code === L8RegimeInputViolationCode.BINDING_HISTORICAL_AS_CURRENT);

  // Admissibility: evidence-only dep class can never resolve > evidence_only
  const admEvidence = resolveRegimeInputAdmissibility({
    ref: 'x',
    input_family: L8RegimeInputFamily.VALIDATION_HISTORY_FAMILY,
    input_domain: L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
    dependency_class: L8RegimeDependencyClass.EVIDENCE_ONLY_INPUT,
    declared_max_reliance: L8RegimeMaxRelianceClass.EVIDENCE_ONLY,
    freshness_ok: true, stale: false, degraded: false,
    scope_ok: true, evidence_complete: true, is_historical_only: false,
    consumed_restriction_posture: true,
    restriction_narrows_rights: false,
    consumed_contradiction_posture: true,
    contradiction_severe: false, contradiction_unresolved: false,
    lower_layer_confidence_score: 0.9,
    validation_supported: true, direct_to_regime_family: true,
    historical_reliability_score: 0.9,
  });
  const evOk =
    admEvidence.decision.admissibility ===
      L8RegimeInputAdmissibilityClass.ADMISSIBLE_EVIDENCE_ONLY;

  // Historical input for non-HISTORICAL dep class narrows + surfaces issue
  const admHist = resolveRegimeInputAdmissibility({
    ref: 'y',
    input_family: L8RegimeInputFamily.MOMENTUM_PARTICIPATION_FAMILY,
    input_domain: L8RegimeInputDomain.BREADTH_DOMAIN,
    dependency_class: L8RegimeDependencyClass.REQUIRED_PRIMITIVE_INPUT,
    declared_max_reliance: L8RegimeMaxRelianceClass.NARROWED_SUPPORT,
    freshness_ok: true, stale: false, degraded: false,
    scope_ok: true, evidence_complete: true,
    is_historical_only: true,
    consumed_restriction_posture: false,
    restriction_narrows_rights: false,
    consumed_contradiction_posture: false,
    contradiction_severe: false, contradiction_unresolved: false,
    lower_layer_confidence_score: 0.9,
    validation_supported: true, direct_to_regime_family: true,
    historical_reliability_score: 0.9,
  });
  const histAdmBlocked =
    admHist.decision.admissibility ===
      L8RegimeInputAdmissibilityClass.ADMISSIBLE_CONTEXT_ONLY &&
    admHist.issues.some(i =>
      i.code === L8RegimeInputViolationCode.ADMISSIBILITY_HISTORICAL_AS_CURRENT);

  return {
    id: 'INV-8.5-C',
    name: 'Evidence-only / optional / historical cannot masquerade as required',
    holds: optBlocked && histBlocked && evOk && histAdmBlocked,
    evidence:
      `opt_blocked=${optBlocked}, hist_blocked=${histBlocked}, ` +
      `evidence_only_capped=${evOk}, historical_capped=${histAdmBlocked}`,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-8.5-D
// ──────────────────────────────────────────────────────────────────

export function checkINV_85_D(): L8_5InvariantResult {
  // Binding missing restriction flag
  const noRestriction = validateRegimeInputBinding({
    ...buildGreenL7ValidationBinding(),
    restriction_consumption_required: false,
  });
  const restrictionBlocked = !noRestriction.valid &&
    noRestriction.issues.some(i =>
      i.code ===
        L8RegimeInputViolationCode.BINDING_FAMILY_REQUIRES_RESTRICTION);

  // Binding missing contradiction flag
  const noContra = validateRegimeInputBinding({
    ...buildGreenL7ValidationBinding(),
    contradiction_consumption_required: false,
  });
  const contraBlocked = !noContra.valid &&
    noContra.issues.some(i =>
      i.code ===
        L8RegimeInputViolationCode.BINDING_FAMILY_REQUIRES_CONTRADICTION);

  // Admissibility: L7 validation without consumed restriction → BLOCKED
  const admNoRestriction = resolveRegimeInputAdmissibility({
    ref: 'z',
    input_family: L8RegimeInputFamily.VALIDATION_ASSESSMENT_FAMILY,
    input_domain: L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
    dependency_class: L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT,
    declared_max_reliance: L8RegimeMaxRelianceClass.FULL_SUPPORT,
    freshness_ok: true, stale: false, degraded: false,
    scope_ok: true, evidence_complete: true, is_historical_only: false,
    consumed_restriction_posture: false,
    restriction_narrows_rights: false,
    consumed_contradiction_posture: true,
    contradiction_severe: false, contradiction_unresolved: false,
    lower_layer_confidence_score: 0.9,
    validation_supported: true, direct_to_regime_family: true,
    historical_reliability_score: 0.9,
  });
  const admRestBlocked =
    admNoRestriction.decision.admissibility ===
      L8RegimeInputAdmissibilityClass.BLOCKED &&
    admNoRestriction.issues.some(i =>
      i.code === L8RegimeInputViolationCode.ADMISSIBILITY_RESTRICTION_BYPASS);

  // Unresolved contradiction + not consumed → BLOCKED
  const admUnresolved = resolveRegimeInputAdmissibility({
    ref: 'u',
    input_family: L8RegimeInputFamily.VALIDATION_ASSESSMENT_FAMILY,
    input_domain: L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
    dependency_class: L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT,
    declared_max_reliance: L8RegimeMaxRelianceClass.FULL_SUPPORT,
    freshness_ok: true, stale: false, degraded: false,
    scope_ok: true, evidence_complete: true, is_historical_only: false,
    consumed_restriction_posture: true,
    restriction_narrows_rights: false,
    consumed_contradiction_posture: false,
    contradiction_severe: true, contradiction_unresolved: true,
    lower_layer_confidence_score: 0.9,
    validation_supported: true, direct_to_regime_family: true,
    historical_reliability_score: 0.9,
  });
  const contraAdmBlocked =
    admUnresolved.decision.admissibility ===
      L8RegimeInputAdmissibilityClass.BLOCKED &&
    admUnresolved.issues.some(i =>
      i.code === L8RegimeInputViolationCode.ADMISSIBILITY_CONTRADICTION_NEGLECT);

  return {
    id: 'INV-8.5-D',
    name: 'L7 restriction + contradiction posture must be consumed where required',
    holds:
      restrictionBlocked && contraBlocked && admRestBlocked &&
      contraAdmBlocked,
    evidence:
      `restriction_blocked=${restrictionBlocked}, contra_blocked=${contraBlocked}, ` +
      `adm_restriction=${admRestBlocked}, adm_contradiction=${contraAdmBlocked}`,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-8.5-E
// ──────────────────────────────────────────────────────────────────

export function checkINV_85_E(): L8_5InvariantResult {
  // Stale input → narrowed
  const adm = resolveRegimeInputAdmissibility({
    ref: 's',
    input_family: L8RegimeInputFamily.MOMENTUM_PARTICIPATION_FAMILY,
    input_domain: L8RegimeInputDomain.BREADTH_DOMAIN,
    dependency_class: L8RegimeDependencyClass.REQUIRED_PRIMITIVE_INPUT,
    declared_max_reliance: L8RegimeMaxRelianceClass.NARROWED_SUPPORT,
    freshness_ok: false, stale: true, degraded: false,
    scope_ok: true, evidence_complete: true, is_historical_only: false,
    consumed_restriction_posture: false,
    restriction_narrows_rights: false,
    consumed_contradiction_posture: false,
    contradiction_severe: false, contradiction_unresolved: false,
    lower_layer_confidence_score: 0.9,
    validation_supported: true, direct_to_regime_family: true,
    historical_reliability_score: 0.9,
  });
  const staleNarrowed =
    adm.decision.admissibility !==
      L8RegimeInputAdmissibilityClass.ADMISSIBLE_FULL;

  // Degraded input → BLOCKED
  const admDeg = resolveRegimeInputAdmissibility({
    ref: 'd',
    input_family: L8RegimeInputFamily.MOMENTUM_PARTICIPATION_FAMILY,
    input_domain: L8RegimeInputDomain.BREADTH_DOMAIN,
    dependency_class: L8RegimeDependencyClass.REQUIRED_PRIMITIVE_INPUT,
    declared_max_reliance: L8RegimeMaxRelianceClass.NARROWED_SUPPORT,
    freshness_ok: true, stale: false, degraded: true,
    scope_ok: true, evidence_complete: true, is_historical_only: false,
    consumed_restriction_posture: false,
    restriction_narrows_rights: false,
    consumed_contradiction_posture: false,
    contradiction_severe: false, contradiction_unresolved: false,
    lower_layer_confidence_score: 0.9,
    validation_supported: true, direct_to_regime_family: true,
    historical_reliability_score: 0.9,
  });
  const degBlocked =
    admDeg.decision.admissibility ===
      L8RegimeInputAdmissibilityClass.BLOCKED &&
    admDeg.issues.some(i =>
      i.code === L8RegimeInputViolationCode.ADMISSIBILITY_DEGRADED_AS_CLEAN);

  // Scope mismatch → BLOCKED
  const admScope = resolveRegimeInputAdmissibility({
    ref: 'sc',
    input_family: L8RegimeInputFamily.MOMENTUM_PARTICIPATION_FAMILY,
    input_domain: L8RegimeInputDomain.BREADTH_DOMAIN,
    dependency_class: L8RegimeDependencyClass.REQUIRED_PRIMITIVE_INPUT,
    declared_max_reliance: L8RegimeMaxRelianceClass.NARROWED_SUPPORT,
    freshness_ok: true, stale: false, degraded: false,
    scope_ok: false, evidence_complete: true, is_historical_only: false,
    consumed_restriction_posture: false,
    restriction_narrows_rights: false,
    consumed_contradiction_posture: false,
    contradiction_severe: false, contradiction_unresolved: false,
    lower_layer_confidence_score: 0.9,
    validation_supported: true, direct_to_regime_family: true,
    historical_reliability_score: 0.9,
  });
  const scopeBlocked =
    admScope.decision.admissibility ===
      L8RegimeInputAdmissibilityClass.BLOCKED;

  return {
    id: 'INV-8.5-E',
    name: 'Stale or degraded lower-layer evidence cannot appear as clean',
    holds: staleNarrowed && degBlocked && scopeBlocked,
    evidence:
      `stale_narrowed=${staleNarrowed}, deg_blocked=${degBlocked}, scope_blocked=${scopeBlocked}`,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-8.5-F
// ──────────────────────────────────────────────────────────────────

export function checkINV_85_F(): L8_5InvariantResult {
  const behaviours = validateLowerLayerConsumption({
    componentId: 'regime.classifier.rogue',
    claimedBehaviors: [
      'live from l6 raw primitives',
      'revalidate claim from l6',
      'ignore restriction posture',
      'widen l7 rights for multiplier',
      'downgrade contradiction when inconvenient',
      'consume blocked validation',
      'from raw feed compute regime',
    ],
  });

  const bypassed = !behaviours.valid &&
    behaviours.issues.some(i =>
      i.code === L8RegimeInputViolationCode.LOWER_LAYER_L6_REVALIDATION);
  const revalidated = behaviours.issues.some(i =>
    i.code === L8RegimeInputViolationCode.LOWER_LAYER_L7_BYPASS);
  const widened = behaviours.issues.some(i =>
    i.code === L8RegimeInputViolationCode.LOWER_LAYER_RIGHTS_WIDENED);
  const contraDowngraded = behaviours.issues.some(i =>
    i.code === L8RegimeInputViolationCode.LOWER_LAYER_CONTRADICTION_DOWNGRADED);
  const blockedConsumed = behaviours.issues.some(i =>
    i.code === L8RegimeInputViolationCode.LOWER_LAYER_BLOCKED_CONSUMED);
  const rawBypass = behaviours.issues.some(i =>
    i.code === L8RegimeInputViolationCode.ADMISSIBILITY_RAW_INPUT_BYPASS);

  // Clean behaviour passes
  const clean = validateLowerLayerConsumption({
    componentId: 'regime.classifier.ok',
    claimedBehaviors: [
      'consume l7 validation via stable handoff',
      'consume l7 restriction profile',
      'read l6 current feature state for momentum',
    ],
  });
  const cleanOk = clean.valid;

  return {
    id: 'INV-8.5-F',
    name: 'L8 may not rebuild validation live from raw L6 / widen rights / bypass L7',
    holds:
      bypassed && revalidated && widened && contraDowngraded &&
      blockedConsumed && rawBypass && cleanOk,
    evidence:
      `l6_reval=${bypassed}, l7_bypass=${revalidated}, widened=${widened}, ` +
      `contra_downgraded=${contraDowngraded}, blocked=${blockedConsumed}, ` +
      `raw=${rawBypass}, clean=${cleanOk}`,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-8.5-G
// ──────────────────────────────────────────────────────────────────

export function checkINV_85_G(): L8_5InvariantResult {
  const behaviours = validateLowerLayerConsumption({
    componentId: 'regime.classifier.judgment',
    claimedBehaviors: [
      'judgment as input',
      'scenario as input',
    ],
  });
  const blocked = !behaviours.valid &&
    behaviours.issues.filter(i =>
      i.code === L8RegimeInputViolationCode.JUDGMENT_SURFACE_LEAK).length >= 2;

  // Consumption rights — evidence-only input cannot influence primary
  const rights = validateRegimeConsumptionRight({
    ref: 'ev',
    dependency_class: L8RegimeDependencyClass.EVIDENCE_ONLY_INPUT,
    admissibility:
      L8RegimeInputAdmissibilityClass.ADMISSIBLE_EVIDENCE_ONLY,
    proposed_right:
      L8RegimeConsumptionRight.INFLUENCE_PRIMARY_CLASSIFICATION,
  });
  const evCannotPrimary = !rights.valid &&
    rights.issues.some(i =>
      i.code === L8RegimeInputViolationCode.RIGHT_PRIMARY_NOT_GRANTED);

  // Context-only cannot influence confidence
  const contextConfidence = validateRegimeConsumptionRight({
    ref: 'cx',
    dependency_class: L8RegimeDependencyClass.OPTIONAL_CONTEXT_INPUT,
    admissibility:
      L8RegimeInputAdmissibilityClass.ADMISSIBLE_FULL,
    proposed_right: L8RegimeConsumptionRight.INFLUENCE_CONFIDENCE,
  });
  const contextNoConf = !contextConfidence.valid;

  // Historical input CAN influence transition + confidence
  const histRight = validateRegimeConsumptionRight({
    ref: 'h',
    dependency_class: L8RegimeDependencyClass.HISTORICAL_INPUT,
    admissibility:
      L8RegimeInputAdmissibilityClass.ADMISSIBLE_FULL,
    proposed_right: L8RegimeConsumptionRight.INFLUENCE_CONFIDENCE,
  });
  const histOk = histRight.valid;

  return {
    id: 'INV-8.5-G',
    name: 'Later-layer surfaces are illegal regime inputs; consumption rights enforced',
    holds: blocked && evCannotPrimary && contextNoConf && histOk,
    evidence:
      `judgment_blocked=${blocked}, ev_cannot_primary=${evCannotPrimary}, ` +
      `context_no_conf=${contextNoConf}, hist_conf_ok=${histOk}`,
  };
}

export function checkAllL85Invariants(): readonly L8_5InvariantResult[] {
  return [
    checkINV_85_A(),
    checkINV_85_B(),
    checkINV_85_C(),
    checkINV_85_D(),
    checkINV_85_E(),
    checkINV_85_F(),
    checkINV_85_G(),
  ];
}
