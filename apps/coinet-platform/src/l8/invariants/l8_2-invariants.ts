/**
 * L8.2 — Object-Model Invariants
 *
 * §8.2.11.1 — INV-8.2-A through INV-8.2-G, all executable and
 * test-covered.
 *
 *   INV-8.2-A : Every regime state belongs to exactly one registered
 *               regime family.
 *   INV-8.2-B : Every primary and secondary regime is a legal member
 *               of that family.
 *   INV-8.2-C : Cross-family coexistence is legal only through explicit
 *               coexistence law.
 *   INV-8.2-D : Intra-family collisions may not masquerade as clean
 *               single-regime state.
 *   INV-8.2-E : Every regime state is scope-bound, time-bound, evidence-
 *               bearing, multiplier-linked, and lineage-linked.
 *   INV-8.2-F : A regime state may not omit contradiction or ambiguity
 *               posture when materially relevant.
 *   INV-8.2-G : Regime outputs remain governed environment objects, not
 *               scoring or judgment objects.
 */

import { L8RegimeFamily, ALL_L8_REGIME_FAMILIES } from '../contracts/regime-family';
import {
  L8MacroRegimeClass,
  L8CryptoStructureRegimeClass,
  L8TokenRegimeClass,
  L8EcosystemRegimeClass,
  ALL_L8_MACRO_REGIME_CLASSES,
  ALL_L8_CRYPTO_STRUCTURE_REGIME_CLASSES,
  ALL_L8_TOKEN_REGIME_CLASSES,
  ALL_L8_ECOSYSTEM_REGIME_CLASSES,
  L8_REGIME_CLASS_DESCRIPTORS,
} from '../contracts/regime-class';
import {
  L8RegimeState,
  L8RegimeCoexistenceClass,
  L8TransitionRiskClass,
  L8RegimeConfidenceBand,
} from '../contracts/regime-state';
import { L8RegimeOutputClass } from '../contracts/regime-output-class';
import {
  getDefaultL8RegimeFamilyRegistry,
} from '../registry/regime-family.registry';
import {
  getDefaultL8RegimeClassRegistry,
} from '../registry/regime-class.registry';
import {
  getDefaultL8CoexistenceRegistry,
} from '../registry/regime-coexistence.registry';
import {
  getDefaultL8RegimeOutputClassRegistry,
} from '../registry/regime-output-class.registry';
import { validateRegimeState } from '../validation/regime-state.validator';
import {
  validateCrossFamilyCoexistence,
  validateIntraFamilyCoexistence,
} from '../validation/regime-coexistence.validator';
import { validateRegimeOutputObject } from '../validation/regime-output.validator';

export interface L8_2InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

/**
 * Helper — construct a canonical green regime state for a given family
 * with a single primary regime (no secondary).
 */
export function buildL8GreenRegimeState(
  family: L8RegimeFamily,
  primary:
    | L8MacroRegimeClass
    | L8CryptoStructureRegimeClass
    | L8TokenRegimeClass
    | L8EcosystemRegimeClass,
  scopeType: 'MARKET' | 'CHAIN' | 'ECOSYSTEM' | 'ASSET' | 'TOKEN' = 'MARKET',
): L8RegimeState {
  return {
    regime_state_id: `rstate_${family}_${primary}`,
    regime_subject_id: `rsub_${family}_test`,
    regime_template_id: `rtpl_${family}_default_v1`,
    regime_version: '1.0.0',

    regime_family: family,
    primary_regime: primary,
    secondary_regime: null,

    scope_type: scopeType,
    scope_id: 'test-scope',
    as_of: '2026-04-17T12:00:00Z',

    regime_confidence_score: 0.7,
    regime_confidence_band: L8RegimeConfidenceBand.HIGH,
    secondary_regime_confidence: null,

    transition_risk_score: 0.1,
    transition_risk_class: L8TransitionRiskClass.STABLE,

    supporting_surface_refs: ['l6:current_feature_state', 'l6:feature_history'],
    contradicting_surface_refs: [],
    validation_refs: ['l7:validation_assessment'],
    evidence_pack_ref: 'l6:evidence_pack/test',
    input_snapshot_ref: 'l5:snapshot/test',

    multiplier_profile_ref: `l8:multiplier/${family}_${primary}`,

    coexistence_class: L8RegimeCoexistenceClass.CLEAN_SINGLE,
    ambiguity_score: 0.1,
    staleness_score: 0.05,
    degradation_score: 0.05,

    lineage_refs: {
      trace_id: 'trace-1',
      manifest_id: 'manifest-1',
      upstream_refs: ['l7:manifest/1'],
    },
    compute_run_id: 'run-1',
    replay_hash: 'rhash_testhash',

    materialization_mode: 'LIVE',
    policy_version: 'l8.2-policy-v1',

    created_by: 'regime-engine',
    created_at: '2026-04-17T12:00:01Z',
    description: 'governed macro regime environment classification',
  };
}

// ── INV-8.2-A ──
// Every regime state belongs to exactly one registered regime family.
export function checkINV_82_A(): L8_2InvariantResult {
  const familyRegistry = getDefaultL8RegimeFamilyRegistry();
  const allRegistered = ALL_L8_REGIME_FAMILIES.every(f =>
    familyRegistry.isRegistered(f));
  const unregisteredBlocked = !familyRegistry.isRegistered('FAKE_FAMILY');

  // Build a state for each family and verify it is accepted.
  const g1 = buildL8GreenRegimeState(L8RegimeFamily.MACRO, L8MacroRegimeClass.RISK_ON);
  const g2 = buildL8GreenRegimeState(
    L8RegimeFamily.CRYPTO_STRUCTURE,
    L8CryptoStructureRegimeClass.SPOT_LED_EXPANSION,
  );
  const g3 = buildL8GreenRegimeState(
    L8RegimeFamily.TOKEN_SPECIFIC,
    L8TokenRegimeClass.EARLY_ACCUMULATION,
    'TOKEN',
  );
  const g4 = buildL8GreenRegimeState(
    L8RegimeFamily.ECOSYSTEM,
    L8EcosystemRegimeClass.CHAIN_EXPANSION,
    'CHAIN',
  );
  const allPass = [g1, g2, g3, g4].every(s => validateRegimeState(s).valid);

  // Fabricate a state with an unregistered family — must be blocked.
  const fakeFamily = validateRegimeState({
    ...g1,
    regime_family: 'FAKE_FAMILY' as L8RegimeFamily,
  });
  const fakeFamilyBlocked = !fakeFamily.valid;

  return {
    id: 'INV-8.2-A',
    name: 'Every regime state belongs to exactly one registered family',
    holds: allRegistered && unregisteredBlocked && allPass && fakeFamilyBlocked,
    evidence:
      `registered=${allRegistered}, unregistered_blocked=${unregisteredBlocked}, ` +
      `green_pass=${allPass}, fake_blocked=${fakeFamilyBlocked}`,
  };
}

// ── INV-8.2-B ──
// Every primary and secondary regime is a legal member of its declared family.
export function checkINV_82_B(): L8_2InvariantResult {
  const classRegistry = getDefaultL8RegimeClassRegistry();

  // Every descriptor maps to a registered class + family.
  const descriptorsOk = L8_REGIME_CLASS_DESCRIPTORS.every(d =>
    classRegistry.isRegistered(d.regimeClass) &&
    classRegistry.belongsToFamily(d.regimeClass, d.family));

  // Wrong-family primary — must be blocked.
  const g = buildL8GreenRegimeState(
    L8RegimeFamily.MACRO,
    L8MacroRegimeClass.RISK_ON,
  );
  const wrongPrimary = validateRegimeState({
    ...g,
    primary_regime: L8TokenRegimeClass.EARLY_ACCUMULATION,
  });
  const wrongPrimaryBlocked = !wrongPrimary.valid;

  // Wrong-family secondary — must be blocked.
  const wrongSecondary = validateRegimeState({
    ...g,
    primary_regime: L8MacroRegimeClass.RISK_ON,
    secondary_regime: L8TokenRegimeClass.EARLY_ACCUMULATION,
    secondary_regime_confidence: 0.3,
    coexistence_class: L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
  });
  const wrongSecondaryBlocked = !wrongSecondary.valid;

  // Family class counts
  const macroCount = classRegistry.listForFamily(L8RegimeFamily.MACRO).length;
  const cryptoCount =
    classRegistry.listForFamily(L8RegimeFamily.CRYPTO_STRUCTURE).length;
  const tokenCount =
    classRegistry.listForFamily(L8RegimeFamily.TOKEN_SPECIFIC).length;
  const ecoCount = classRegistry.listForFamily(L8RegimeFamily.ECOSYSTEM).length;
  const classCountsOk =
    macroCount === ALL_L8_MACRO_REGIME_CLASSES.length &&
    cryptoCount === ALL_L8_CRYPTO_STRUCTURE_REGIME_CLASSES.length &&
    tokenCount === ALL_L8_TOKEN_REGIME_CLASSES.length &&
    ecoCount === ALL_L8_ECOSYSTEM_REGIME_CLASSES.length;

  return {
    id: 'INV-8.2-B',
    name: 'Primary and secondary regimes must be legal members of their family',
    holds:
      descriptorsOk && wrongPrimaryBlocked && wrongSecondaryBlocked &&
      classCountsOk,
    evidence:
      `desc_ok=${descriptorsOk}, wrong_primary_blocked=${wrongPrimaryBlocked}, ` +
      `wrong_secondary_blocked=${wrongSecondaryBlocked}, counts_ok=${classCountsOk}`,
  };
}

// ── INV-8.2-C ──
// Cross-family coexistence is legal only through explicit coexistence law.
export function checkINV_82_C(): L8_2InvariantResult {
  const familyRegistry = getDefaultL8RegimeFamilyRegistry();

  // Every canonical family can coexist with every other canonical family.
  const pairsOk = ALL_L8_REGIME_FAMILIES.every(a =>
    ALL_L8_REGIME_FAMILIES.every(b =>
      a === b || familyRegistry.coexistsWith(a, b)));

  // A duplicate family at the same scope/time must fail.
  const duplicate = validateCrossFamilyCoexistence({
    rows: [
      {
        family: L8RegimeFamily.MACRO,
        primary: L8MacroRegimeClass.RISK_ON,
        scope_id: 'global',
        as_of: '2026-04-17T12:00:00Z',
      },
      {
        family: L8RegimeFamily.MACRO,
        primary: L8MacroRegimeClass.RISK_OFF,
        scope_id: 'global',
        as_of: '2026-04-17T12:00:00Z',
      },
    ],
  });
  const duplicateBlocked = !duplicate.valid;

  // A legal multi-family snapshot passes.
  const legal = validateCrossFamilyCoexistence({
    rows: [
      {
        family: L8RegimeFamily.MACRO,
        primary: L8MacroRegimeClass.RISK_OFF,
        scope_id: 'ASSET:XYZ',
        as_of: '2026-04-17T12:00:00Z',
      },
      {
        family: L8RegimeFamily.CRYPTO_STRUCTURE,
        primary: L8CryptoStructureRegimeClass.THIN_LIQUIDITY_FRAGILITY,
        scope_id: 'ASSET:XYZ',
        as_of: '2026-04-17T12:00:00Z',
      },
      {
        family: L8RegimeFamily.TOKEN_SPECIFIC,
        primary: L8TokenRegimeClass.NARRATIVE_BREAKOUT,
        scope_id: 'ASSET:XYZ',
        as_of: '2026-04-17T12:00:00Z',
      },
      {
        family: L8RegimeFamily.ECOSYSTEM,
        primary: L8EcosystemRegimeClass.SECTOR_ROTATION,
        scope_id: 'ASSET:XYZ',
        as_of: '2026-04-17T12:00:00Z',
      },
    ],
  });
  const legalAllowed = legal.valid;

  return {
    id: 'INV-8.2-C',
    name: 'Cross-family coexistence is legal only through explicit coexistence law',
    holds: pairsOk && duplicateBlocked && legalAllowed,
    evidence:
      `pairs_ok=${pairsOk}, duplicate_blocked=${duplicateBlocked}, ` +
      `legal_allowed=${legalAllowed}`,
  };
}

// ── INV-8.2-D ──
// Intra-family collisions may not masquerade as clean single-regime.
export function checkINV_82_D(): L8_2InvariantResult {
  const registry = getDefaultL8CoexistenceRegistry();

  // Illegal pairs must remain illegal regardless of declared class.
  const riskOnRiskOff = registry.decide(
    L8RegimeFamily.MACRO,
    L8MacroRegimeClass.RISK_ON,
    L8MacroRegimeClass.RISK_OFF,
    L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
  );
  const launchMature = registry.decide(
    L8RegimeFamily.TOKEN_SPECIFIC,
    L8TokenRegimeClass.LAUNCH_DISCOVERY,
    L8TokenRegimeClass.MATURE_TREND,
    L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
  );
  const expCon = registry.decide(
    L8RegimeFamily.ECOSYSTEM,
    L8EcosystemRegimeClass.CHAIN_EXPANSION,
    L8EcosystemRegimeClass.CHAIN_CONTRACTION,
    L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
  );
  const illegalBlocked =
    !riskOnRiskOff.allowed && !launchMature.allowed && !expCon.allowed;

  // Fake CLEAN_SINGLE with secondary present — blocked.
  const fakeClean = registry.decide(
    L8RegimeFamily.TOKEN_SPECIFIC,
    L8TokenRegimeClass.EARLY_ACCUMULATION,
    L8TokenRegimeClass.NARRATIVE_BREAKOUT,
    L8RegimeCoexistenceClass.CLEAN_SINGLE,
  );
  const fakeCleanBlocked = !fakeClean.allowed;

  // Transition pair with PRIMARY_PLUS_SECONDARY — requires TRANSITION.
  const transitionDemanded = registry.decide(
    L8RegimeFamily.TOKEN_SPECIFIC,
    L8TokenRegimeClass.MATURE_TREND,
    L8TokenRegimeClass.DISTRIBUTION,
    L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
  );
  const transitionDemandedBlocked =
    !transitionDemanded.allowed &&
    transitionDemanded.requiredClass === L8RegimeCoexistenceClass.TRANSITIONAL_OVERLAP;

  // Ambiguity pair with PRIMARY_PLUS_SECONDARY — requires AMBIGUITY.
  const ambiguityDemanded = registry.decide(
    L8RegimeFamily.MACRO,
    L8MacroRegimeClass.RISK_ON,
    L8MacroRegimeClass.CHOP,
    L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
  );
  const ambiguityDemandedBlocked =
    !ambiguityDemanded.allowed &&
    ambiguityDemanded.requiredClass ===
      L8RegimeCoexistenceClass.AMBIGUOUS_MULTI_CANDIDATE;

  // Transition pair under TRANSITIONAL_OVERLAP — allowed.
  const transitionCorrect = registry.decide(
    L8RegimeFamily.TOKEN_SPECIFIC,
    L8TokenRegimeClass.MATURE_TREND,
    L8TokenRegimeClass.DISTRIBUTION,
    L8RegimeCoexistenceClass.TRANSITIONAL_OVERLAP,
  );
  // Ambiguity pair under AMBIGUOUS_MULTI_CANDIDATE — allowed.
  const ambiguityCorrect = registry.decide(
    L8RegimeFamily.MACRO,
    L8MacroRegimeClass.RISK_ON,
    L8MacroRegimeClass.CHOP,
    L8RegimeCoexistenceClass.AMBIGUOUS_MULTI_CANDIDATE,
  );
  const correctAllowed = transitionCorrect.allowed && ambiguityCorrect.allowed;

  // Lifecycle integrity — conflicting postures under PRIMARY_PLUS_SECONDARY
  // blocked.
  const lifecycleReport = validateIntraFamilyCoexistence({
    family: L8RegimeFamily.TOKEN_SPECIFIC,
    primary: L8TokenRegimeClass.EARLY_ACCUMULATION,
    secondary: L8TokenRegimeClass.BLOWOFF_REFLEXIVE_LATE_STAGE,
    coexistence_class: L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
  });
  const lifecycleBlocked = !lifecycleReport.valid;

  return {
    id: 'INV-8.2-D',
    name: 'Intra-family collisions cannot masquerade as clean single-regime',
    holds:
      illegalBlocked && fakeCleanBlocked && transitionDemandedBlocked &&
      ambiguityDemandedBlocked && correctAllowed && lifecycleBlocked,
    evidence:
      `illegal=${illegalBlocked}, fake_clean=${fakeCleanBlocked}, ` +
      `transition_required=${transitionDemandedBlocked}, ` +
      `ambiguity_required=${ambiguityDemandedBlocked}, ` +
      `correct_allowed=${correctAllowed}, lifecycle_blocked=${lifecycleBlocked}`,
  };
}

// ── INV-8.2-E ──
// Every regime state is scope-bound, time-bound, evidence-bearing,
// multiplier-linked, and lineage-linked.
export function checkINV_82_E(): L8_2InvariantResult {
  const g = buildL8GreenRegimeState(
    L8RegimeFamily.MACRO,
    L8MacroRegimeClass.RISK_ON,
  );
  const cleanPass = validateRegimeState(g).valid;

  // Each missing-field variant must trip its specific code.
  const missingScope = validateRegimeState({ ...g, scope_id: '' });
  const missingTime = validateRegimeState({ ...g, as_of: '' });
  const missingEvidence = validateRegimeState({
    ...g,
    supporting_surface_refs: [],
  });
  const missingValidation = validateRegimeState({ ...g, validation_refs: [] });
  const missingEvidencePack = validateRegimeState({
    ...g,
    evidence_pack_ref: '',
  });
  const missingMultiplier = validateRegimeState({
    ...g,
    multiplier_profile_ref: '',
  });
  const missingLineage = validateRegimeState({
    ...g,
    lineage_refs: { trace_id: '', manifest_id: '', upstream_refs: [] },
  });
  const missingReplayHash = validateRegimeState({ ...g, replay_hash: '' });
  const missingRun = validateRegimeState({ ...g, compute_run_id: '' });
  const missingPolicy = validateRegimeState({ ...g, policy_version: '' });
  const missingTemplate = validateRegimeState({ ...g, regime_template_id: '' });

  const allBlocked =
    !missingScope.valid && !missingTime.valid && !missingEvidence.valid &&
    !missingValidation.valid && !missingEvidencePack.valid &&
    !missingMultiplier.valid && !missingLineage.valid &&
    !missingReplayHash.valid && !missingRun.valid && !missingPolicy.valid &&
    !missingTemplate.valid;

  return {
    id: 'INV-8.2-E',
    name: 'Every regime state is scope/time/evidence/multiplier/lineage bound',
    holds: cleanPass && allBlocked,
    evidence:
      `clean_pass=${cleanPass}, all_required_fields_enforced=${allBlocked}`,
  };
}

// ── INV-8.2-F ──
// Regime state must not omit contradiction or ambiguity posture when
// materially relevant.
export function checkINV_82_F(): L8_2InvariantResult {
  const g = buildL8GreenRegimeState(
    L8RegimeFamily.MACRO,
    L8MacroRegimeClass.RISK_ON,
  );

  // High ambiguity + CLEAN_SINGLE → blocked.
  const launderAmbiguity = validateRegimeState({
    ...g,
    ambiguity_score: 0.7,
    coexistence_class: L8RegimeCoexistenceClass.CLEAN_SINGLE,
  });
  const ambiguityLaunderBlocked = !launderAmbiguity.valid;

  // Output validator must require contradiction posture where the
  // registry says so.
  const reg = getDefaultL8RegimeOutputClassRegistry();
  const requiresCContra =
    reg.requiresContradictionPosture(L8RegimeOutputClass.REGIME_STATE) &&
    reg.requiresContradictionPosture(L8RegimeOutputClass.REGIME_MULTIPLIER_PROFILE);
  const requiresAmb =
    reg.requiresAmbiguityPosture(L8RegimeOutputClass.REGIME_STATE) &&
    reg.requiresAmbiguityPosture(
      L8RegimeOutputClass.REGIME_TRANSITION_PROFILE);

  const missingContradiction = validateRegimeOutputObject({
    output_class: L8RegimeOutputClass.REGIME_STATE,
    regime_state_id: 'rstate_x',
    description: 'regime state with governed evidence',
    supporting_surface_refs: ['l6:current_feature_state'],
    contradiction_bundle_ref: null,
    restriction_profile_ref: 'l7:restriction_profile/x',
    preserves_ambiguity_posture: true,
    is_final_score_shape: false,
  });
  const missingRestriction = validateRegimeOutputObject({
    output_class: L8RegimeOutputClass.REGIME_MULTIPLIER_PROFILE,
    regime_state_id: 'rstate_x',
    description: 'regime multiplier profile anchored to regime state',
    supporting_surface_refs: ['l6:current_feature_state'],
    contradiction_bundle_ref: 'l7:contradiction_bundle/x',
    restriction_profile_ref: null,
    preserves_ambiguity_posture: true,
    is_final_score_shape: false,
  });
  const missingAmbiguity = validateRegimeOutputObject({
    output_class: L8RegimeOutputClass.REGIME_TRANSITION_PROFILE,
    regime_state_id: 'rstate_x',
    description: 'regime transition posture',
    supporting_surface_refs: ['l6:current_feature_state'],
    contradiction_bundle_ref: null,
    restriction_profile_ref: 'l7:restriction_profile/x',
    preserves_ambiguity_posture: false,
    is_final_score_shape: false,
  });
  const outputsBlocked =
    !missingContradiction.valid && !missingRestriction.valid &&
    !missingAmbiguity.valid;

  return {
    id: 'INV-8.2-F',
    name: 'Regime state/outputs cannot omit contradiction or ambiguity posture',
    holds:
      ambiguityLaunderBlocked && requiresCContra && requiresAmb && outputsBlocked,
    evidence:
      `ambiguity_launder_blocked=${ambiguityLaunderBlocked}, ` +
      `requires_contradiction=${requiresCContra}, requires_ambiguity=${requiresAmb}, ` +
      `outputs_blocked=${outputsBlocked}`,
  };
}

// ── INV-8.2-G ──
// Regime outputs remain governed environment objects, not scoring or
// judgment objects.
export function checkINV_82_G(): L8_2InvariantResult {
  // Multiplier with final-score shape → blocked.
  const scoreShape = validateRegimeOutputObject({
    output_class: L8RegimeOutputClass.REGIME_MULTIPLIER_PROFILE,
    regime_state_id: 'rstate_x',
    description: 'regime multiplier profile anchored to regime state',
    supporting_surface_refs: ['l6:current_feature_state'],
    contradiction_bundle_ref: 'l7:contradiction_bundle/x',
    restriction_profile_ref: 'l7:restriction_profile/x',
    preserves_ambiguity_posture: true,
    is_final_score_shape: true,
  });
  const scoreBlocked = !scoreShape.valid;

  // Description with forbidden judgment semantics → blocked.
  const judgmentLeak = validateRegimeOutputObject({
    output_class: L8RegimeOutputClass.REGIME_STATE,
    regime_state_id: 'rstate_x',
    description: 'best regime setup with buy signal',
    supporting_surface_refs: ['l6:current_feature_state'],
    contradiction_bundle_ref: 'l7:contradiction_bundle/x',
    restriction_profile_ref: 'l7:restriction_profile/x',
    preserves_ambiguity_posture: true,
    is_final_score_shape: false,
  });
  const judgmentBlocked = !judgmentLeak.valid;

  // Missing regime anchor → blocked.
  const noAnchor = validateRegimeOutputObject({
    output_class: L8RegimeOutputClass.REGIME_STATE,
    regime_state_id: '',
    description: 'regime state with governed evidence',
    supporting_surface_refs: ['l6:current_feature_state'],
    contradiction_bundle_ref: 'l7:contradiction_bundle/x',
    restriction_profile_ref: 'l7:restriction_profile/x',
    preserves_ambiguity_posture: true,
    is_final_score_shape: false,
  });
  const noAnchorBlocked = !noAnchor.valid;

  // State with judgment wording in description → blocked.
  const g = buildL8GreenRegimeState(
    L8RegimeFamily.MACRO,
    L8MacroRegimeClass.RISK_ON,
  );
  const stateJudgment = validateRegimeState({
    ...g,
    description: 'this is the best regime with buy signal',
  });
  const stateJudgmentBlocked = !stateJudgment.valid;

  return {
    id: 'INV-8.2-G',
    name: 'Regime outputs remain environment objects — not scores or judgments',
    holds: scoreBlocked && judgmentBlocked && noAnchorBlocked &&
      stateJudgmentBlocked,
    evidence:
      `score_blocked=${scoreBlocked}, judgment_blocked=${judgmentBlocked}, ` +
      `no_anchor_blocked=${noAnchorBlocked}, state_judgment_blocked=${stateJudgmentBlocked}`,
  };
}

export function checkAllL82Invariants(): readonly L8_2InvariantResult[] {
  return [
    checkINV_82_A(),
    checkINV_82_B(),
    checkINV_82_C(),
    checkINV_82_D(),
    checkINV_82_E(),
    checkINV_82_F(),
    checkINV_82_G(),
  ];
}
