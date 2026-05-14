/**
 * L11.5 — Missing-Data and Regime-Modifier Governance
 * Certification Test Suite (§11.5.19)
 *
 * 5 Bands:
 *   A — Missing-data taxonomy and profile (§11.5.19 Band A)
 *   B — Missing-data behaviour law (§11.5.19 Band B)
 *   C — Regime modifier law (§11.5.19 Band C)
 *   D — Family matrices and interactions (§11.5.19 Band D)
 *   E — Audit, attribution linkage, and invariants (§11.5.19 Band E)
 */

import {
  // L11.2 / L11.3 contracts
  L11ScoreFamily,
  L11ScoreBand,
  L11_REQUIRED_DIRECTION_BY_FAMILY,
  L11ScoreFormulaDefinition,
  L11ScoreOutput,
  L11FormulaEvaluationResult,
  L11FormulaReadinessClass,
  L11_FORMULA_POLICY_VERSION,
  canonicalFormulaEvaluationReplayHash,
  getL11ProductionFormulaForFamily,
  L11InputConditionClass,
  L11MissingDataBehaviorClass,
  L11DependencySurfaceClass,

  // L11.5 contracts
  L11MissingDataConditionClass,
  ALL_L11_MISSING_DATA_CONDITION_CLASSES,
  isL11CriticalMissingCondition,
  isL11OptionalMissingCondition,
  mapL11InputConditionToMissingDataCondition,

  L11RuntimeMissingDataBehaviorClass,
  ALL_L11_RUNTIME_MISSING_DATA_BEHAVIOR_CLASSES,
  L11_RUNTIME_BEHAVIOR_PRIORITY,
  resolveMostRestrictiveBehavior,
  mapL11FormulaBehaviorToRuntimeBehavior,
  isRuntimeBehaviorLegalForCondition,

  L11FormulaInputDependencyClass,
  L11MissingInputRef,
  isL11MissingInputRefStructurallyValid,

  L11ScoreVisibilityClass,
  ALL_L11_SCORE_VISIBILITY_CLASSES,
  L11MissingDataReadinessEffect,
  ALL_L11_MISSING_DATA_READINESS_EFFECTS,
  worstL11VisibilityClass,
  isL11ScoreVisibilityEmissible,
  mostRestrictiveL11ReadinessEffect,

  L11ScoreMissingDataProfile,
  L11_MISSING_DATA_POLICY_VERSION,
  extractL11MissingDataProfileReplayMaterial,
  canonicalMissingDataProfileReplayHash,

  L11ScoreRegimeModifier,
  L11RegimeModifierType,
  L11RegimeModifierReasonCode,
  L11_REGIME_MODIFIER_POLICY_VERSION,
  isL11RegimeModifierStructurallyValid,
  extractL11RegimeModifierReplayMaterial,
  canonicalRegimeModifierReplayHash,

  L11RegimePostureCode,
  ALL_L11_REGIME_POSTURE_CODES,
  L11_REGIME_MODIFIER_MATRIX,
  lookupL11RegimeModifierMatrixEntry,
  getL11RegimeHardCapBand,

  L11MissingRegimeInteraction,
  L11MissingRegimeInteractionClass,
  ALL_L11_MISSING_REGIME_INTERACTION_CLASSES,
  L11_MISSING_REGIME_INTERACTION_POLICY_VERSION,
  mostSevereL11InteractionClass,
} from '../l11/contracts';

import {
  runL11MissingDataProfileEngine,
  L11InputAvailabilityMetadata,
} from '../l11/missing-data';
import {
  runL11RegimeModifierEngine,
  runL11MissingRegimeInteractionEngine,
  L11L8RegimeRead,
} from '../l11/modifiers';

import {
  L11MissingRegimeViolationCode,
  ALL_L11_MISSING_REGIME_VIOLATION_CODES,
  severityForL11MissingRegimeCode,
  validateL11MissingInputRef,
  validateL11AppliedMissingDataBehavior,
  validateL11ScoreVisibility,
  validateL11MissingDataProfile,
  validateL11RegimeModifier,
  validateL11RegimeModifierMatrixIntegrity,
  validateL11ModifierAgainstMatrix,
  validateMatrixCoverageAcrossProductionFamilies,
  validateL11MissingRegimeInteraction,
  validateL11MissingRegimeInteractionCoverage,
  validateL11MissingDataRegimeReadiness,
} from '../l11/validation';

import {
  L11MissingRegimeAuditSubjectClass,
  ALL_L11_MISSING_REGIME_AUDIT_SUBJECT_CLASSES,
  emitL11MissingRegimeAuditBatch,
} from '../l11/constitution';

import {
  checkInvariantL11_5_A_MissingDataNeverNeutral,
  checkInvariantL11_5_B_BehaviorCompleteness,
  checkInvariantL11_5_C_VisibilityClass,
  checkInvariantL11_5_D_RegimeReference,
  checkInvariantL11_5_E_ModifierBoundary,
  checkInvariantL11_5_F_InteractionLaw,
  checkInvariantL11_5_G_AttributionLinkage,
  checkInvariantL11_5_H_ReplayDeterminism,
} from '../l11/invariants/l11_5-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; }
  else { failed++; failures.push(label); console.error(`  ✗ FAIL: ${label}`); }
}

// ─────────────────────────────────────────────────────────────────────
// Synthetic builders
// ─────────────────────────────────────────────────────────────────────

const oppFormula = getL11ProductionFormulaForFamily(L11ScoreFamily.OPPORTUNITY)!;
const riskFormula = getL11ProductionFormulaForFamily(L11ScoreFamily.RISK)!;
const unlockFormula = getL11ProductionFormulaForFamily(L11ScoreFamily.UNLOCK_RISK)!;

function bandFor(score: number): L11ScoreBand {
  if (score >= 80) return L11ScoreBand.VERY_HIGH;
  if (score >= 60) return L11ScoreBand.HIGH;
  if (score >= 40) return L11ScoreBand.MEDIUM;
  if (score >= 20) return L11ScoreBand.LOW;
  return L11ScoreBand.VERY_LOW;
}

function buildScoreFor(
  formula: L11ScoreFormulaDefinition,
  finalScore: number,
  band: L11ScoreBand,
  overrides: Partial<L11ScoreOutput> = {},
): L11ScoreOutput {
  return {
    score_id: `l11.score.${formula.score_family.toLowerCase()}.001`,
    score_family: formula.score_family,
    score_name: `${formula.score_family} v1`,
    score_version: formula.formula_version,
    scope_type: 'ASSET',
    scope_id: 'asset:btc',
    as_of: '2026-05-07T00:00:00Z',
    raw_score: finalScore,
    modified_score: finalScore,
    final_score: finalScore,
    score_band: band,
    score_meaning_claim_ref: `l11.meaning.${formula.score_family.toLowerCase()}.v1`,
    direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[formula.score_family],
    component_score_refs: [],
    positive_attribution_refs: [],
    negative_attribution_refs: [],
    missing_data_profile_ref: `l11m.profile.l11.score.${formula.score_family.toLowerCase()}.001`,
    missing_data_penalty_refs: [],
    regime_modifier_refs: [],
    sequence_modifier_refs: [],
    hypothesis_modifier_refs: [],
    confidence_modifier_ref: null,
    restriction_profile_ref: `l11.restriction.${formula.score_family.toLowerCase()}`,
    calibration_target_ref: `l11.calibration.${formula.score_family.toLowerCase()}`,
    evidence_pack_ref: `l11.evidence.${formula.score_family.toLowerCase()}`,
    input_snapshot_ref: `l11.snapshot.${formula.score_family.toLowerCase()}`,
    compute_run_id: 'run.l11.001',
    replay_hash: 'l11.h.score.001',
    policy_version: 'l11.2.score.v1',
    ...overrides,
  };
}

interface BuildEvalOpts {
  readonly missing?: readonly {
    readonly missing_data_rule_id: string;
    readonly input_condition: L11InputConditionClass;
    readonly behavior: L11MissingDataBehaviorClass;
    readonly affected_component_id?: string;
    readonly disclosure_ref?: string;
  }[];
}

function buildEvaluation(formula: L11ScoreFormulaDefinition, opts: BuildEvalOpts = {}): L11FormulaEvaluationResult {
  const base: Omit<L11FormulaEvaluationResult, 'replay_hash'> = {
    formula_id: formula.formula_id,
    score_family: formula.score_family,
    formula_version: formula.formula_version,
    scope_type: 'ASSET',
    scope_id: 'asset:btc',
    as_of: '2026-05-07T00:00:00Z',
    component_results: formula.component_definitions.map(c => ({
      component_id: c.component_id,
      component_name: c.component_name,
      value: 60,
      weight: c.weight,
      weighted_contribution: 60 * c.weight,
      omitted: false,
      attribution_ref: `l11.attr.${c.component_id}`,
    })),
    raw_score: 60,
    applied_penalties: [],
    applied_caps: [],
    applied_modifiers: [],
    missing_data_effects: (opts.missing ?? []).map(m => ({
      missing_data_rule_id: m.missing_data_rule_id,
      input_condition: m.input_condition,
      behavior: m.behavior,
      affected_component_id: m.affected_component_id,
      disclosure_ref: m.disclosure_ref ?? `l11a.disclosure.${m.missing_data_rule_id}`,
    })),
    formula_readiness: L11FormulaReadinessClass.FORMULA_READY,
    policy_version: L11_FORMULA_POLICY_VERSION,
  };
  return { ...base, replay_hash: canonicalFormulaEvaluationReplayHash(base) };
}

function makeAvailability(
  formula: L11ScoreFormulaDefinition,
  overrides: Partial<L11InputAvailabilityMetadata>[] = [],
): readonly L11InputAvailabilityMetadata[] {
  // Build availability for the formula's first required component +
  // first required surface, then merge per-call overrides on
  // input_surface_ref equality.
  const out: L11InputAvailabilityMetadata[] = [];
  for (const comp of formula.component_definitions) {
    for (const s of comp.required_input_surfaces) {
      out.push({
        input_surface_ref: s.surface_class,
        source_layer: 'L7',
        dependency_class: L11FormulaInputDependencyClass.REQUIRED,
        required_for_component_refs: [comp.component_id],
        surface_class: s.surface_class,
        lineage_refs: [`l11m.lineage.${comp.component_id}`],
      });
    }
    for (const s of comp.optional_input_surfaces) {
      out.push({
        input_surface_ref: s.surface_class,
        source_layer: 'L7',
        dependency_class: L11FormulaInputDependencyClass.OPTIONAL,
        required_for_component_refs: [comp.component_id],
        surface_class: s.surface_class,
        lineage_refs: [`l11m.lineage.${comp.component_id}`],
      });
    }
  }
  for (const ov of overrides) {
    const idx = out.findIndex(a => a.input_surface_ref === ov.input_surface_ref);
    if (idx >= 0) out[idx] = { ...out[idx], ...ov };
    else out.push(ov as L11InputAvailabilityMetadata);
  }
  return out;
}

function makeRegimeRead(
  posture: L11RegimePostureCode,
  overrides: Partial<L11L8RegimeRead> = {},
): L11L8RegimeRead {
  return {
    regime_ref: 'l8.regime.btc.001',
    primary_regime: posture,
    regime_confidence_score: 0.8,
    transition_risk_class: 'LOW',
    observed_at: '2026-05-07T00:00:00Z',
    freshness_budget_ms: 60_000,
    observed_age_ms: 1_000,
    evidence_refs: ['l8.evidence.regime.btc'],
    lineage_refs: ['l8.lineage.regime.btc'],
    applied_under_restriction_refs: [],
    contradiction_refs: [],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// BAND A — Missing-data taxonomy and profile (§11.5.19 Band A)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Missing-Data Taxonomy and Profile ═══');

assert(ALL_L11_MISSING_DATA_CONDITION_CLASSES.length === 11,
  'A.01 11 condition classes registered');
assert(ALL_L11_MISSING_DATA_CONDITION_CLASSES.includes(L11MissingDataConditionClass.ABSENT_REQUIRED_INPUT),
  'A.02 ABSENT_REQUIRED_INPUT registered');
assert(ALL_L11_MISSING_DATA_CONDITION_CLASSES.includes(L11MissingDataConditionClass.UNKNOWN_VISIBILITY_STATE),
  'A.03 UNKNOWN_VISIBILITY_STATE registered');
assert(isL11CriticalMissingCondition(L11MissingDataConditionClass.ABSENT_REQUIRED_INPUT),
  'A.04 ABSENT_REQUIRED_INPUT is critical');
assert(!isL11CriticalMissingCondition(L11MissingDataConditionClass.ABSENT_OPTIONAL_INPUT),
  'A.05 ABSENT_OPTIONAL_INPUT is non-critical');
assert(isL11OptionalMissingCondition(L11MissingDataConditionClass.STALE_OPTIONAL_INPUT),
  'A.06 STALE_OPTIONAL_INPUT is optional');

assert(mapL11InputConditionToMissingDataCondition(
  L11InputConditionClass.STALE, true) === L11MissingDataConditionClass.STALE_REQUIRED_INPUT,
  'A.07 STALE+required maps to STALE_REQUIRED_INPUT');
assert(mapL11InputConditionToMissingDataCondition(
  L11InputConditionClass.STALE, false) === L11MissingDataConditionClass.STALE_OPTIONAL_INPUT,
  'A.08 STALE+optional maps to STALE_OPTIONAL_INPUT');
assert(mapL11InputConditionToMissingDataCondition(
  L11InputConditionClass.RESTRICTED, true) === L11MissingDataConditionClass.RESTRICTED_INPUT,
  'A.09 RESTRICTED maps to RESTRICTED_INPUT regardless of required flag');
assert(mapL11InputConditionToMissingDataCondition(
  L11InputConditionClass.EVIDENCE_ONLY, false) === L11MissingDataConditionClass.EVIDENCE_ONLY_INPUT,
  'A.10 EVIDENCE_ONLY maps to EVIDENCE_ONLY_INPUT');

// Visibility classes
assert(ALL_L11_SCORE_VISIBILITY_CLASSES.length === 8, 'A.11 8 visibility classes');
assert(!isL11ScoreVisibilityEmissible(L11ScoreVisibilityClass.BLOCKED_VISIBILITY),
  'A.12 BLOCKED_VISIBILITY not emissible');
assert(isL11ScoreVisibilityEmissible(L11ScoreVisibilityClass.PARTIAL_VISIBILITY),
  'A.13 PARTIAL_VISIBILITY emissible');
assert(worstL11VisibilityClass([
  L11ScoreVisibilityClass.PARTIAL_VISIBILITY,
  L11ScoreVisibilityClass.BLOCKED_VISIBILITY,
]) === L11ScoreVisibilityClass.BLOCKED_VISIBILITY,
  'A.14 worstL11VisibilityClass picks BLOCKED');

// Readiness effects
assert(ALL_L11_MISSING_DATA_READINESS_EFFECTS.length === 7, 'A.15 7 readiness effects');
assert(mostRestrictiveL11ReadinessEffect([
  L11MissingDataReadinessEffect.DISCLOSURE_REQUIRED,
  L11MissingDataReadinessEffect.SCORE_BLOCKED,
  L11MissingDataReadinessEffect.SCORE_CAPPED,
]) === L11MissingDataReadinessEffect.SCORE_BLOCKED,
  'A.16 mostRestrictiveL11ReadinessEffect picks SCORE_BLOCKED');

// Build a minimal profile via engine — STALE required input
const evalStale = buildEvaluation(oppFormula, {
  missing: [{
    missing_data_rule_id: oppFormula.missing_data_rules[0]?.missing_data_rule_id ?? 'rule.fake.stale',
    input_condition: L11InputConditionClass.STALE,
    behavior: L11MissingDataBehaviorClass.CAP_SCORE,
    affected_component_id: oppFormula.component_definitions[0].component_id,
  }],
});
const oppScore = buildScoreFor(oppFormula, 65, L11ScoreBand.HIGH);
const availStale = makeAvailability(oppFormula, [{
  input_surface_ref: oppFormula.missing_data_rules[0]?.applies_to_input?.surface_class
    ?? oppFormula.component_definitions[0].required_input_surfaces[0].surface_class,
  source_layer: 'L7' as const,
  dependency_class: L11FormulaInputDependencyClass.REQUIRED,
  required_for_component_refs: [oppFormula.component_definitions[0].component_id],
  freshness_budget_ms: 60_000,
  observed_age_ms: 120_000,
  lineage_refs: ['l11m.lineage.test'],
}]);
const profileResult = runL11MissingDataProfileEngine({
  score: oppScore,
  evaluation: evalStale,
  formula: oppFormula,
  availability: availStale,
  lineage_refs: ['l11m.lineage.test'],
  evidence_refs: ['l11m.evidence.test'],
});
assert(profileResult.ok, 'A.17 profile engine builds STALE profile');
const staleProfile = profileResult.profile!;
assert(staleProfile.policy_version === L11_MISSING_DATA_POLICY_VERSION,
  'A.18 profile carries L11.5 policy version');
assert(!!staleProfile.replay_hash, 'A.19 profile carries replay_hash');
assert(staleProfile.applied_behaviors.length >= 1,
  'A.20 STALE produces ≥1 applied behaviour');
assert(staleProfile.stale_inputs.length >= 1, 'A.21 STALE input bucketed correctly');
assert(staleProfile.visibility_class !== L11ScoreVisibilityClass.FULL_VISIBILITY,
  'A.22 STALE downgrades visibility from FULL');

// Replay determinism — re-run engine ⇒ identical hash
const profileResult2 = runL11MissingDataProfileEngine({
  score: oppScore, evaluation: evalStale, formula: oppFormula,
  availability: availStale,
  lineage_refs: ['l11m.lineage.test'],
  evidence_refs: ['l11m.evidence.test'],
});
assert(profileResult2.ok && profileResult2.profile!.replay_hash === staleProfile.replay_hash,
  'A.23 profile replay_hash is deterministic across runs');

// Structural input ref check
const refCheck = isL11MissingInputRefStructurallyValid(staleProfile.stale_inputs[0]);
assert(refCheck.ok, 'A.24 stale input ref is structurally valid');

// Missing required field rejects
const profileMissingId: L11ScoreMissingDataProfile = { ...staleProfile, missing_profile_id: '' };
const masterValBad = validateL11MissingDataProfile({ profile: profileMissingId });
assert(!masterValBad.ok, 'A.25 profile validator rejects missing missing_profile_id');
assert(masterValBad.issues.some(i =>
  i.code === L11MissingRegimeViolationCode.L11M_MISSING_PROFILE_ID_MISSING),
  'A.26 L11M_MISSING_PROFILE_ID_MISSING emitted');

// ═══════════════════════════════════════════════════════════════
// BAND B — Missing-data behaviour law (§11.5.19 Band B)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Missing-Data Behaviour Law ═══');

assert(ALL_L11_RUNTIME_MISSING_DATA_BEHAVIOR_CLASSES.length === 8,
  'B.01 8 runtime behaviour classes');
assert(L11_RUNTIME_BEHAVIOR_PRIORITY[0] === L11RuntimeMissingDataBehaviorClass.BLOCK_SCORE,
  'B.02 BLOCK_SCORE has highest priority');
assert(L11_RUNTIME_BEHAVIOR_PRIORITY[L11_RUNTIME_BEHAVIOR_PRIORITY.length - 1] ===
  L11RuntimeMissingDataBehaviorClass.NO_EFFECT_WITH_DISCLOSURE,
  'B.03 NO_EFFECT_WITH_DISCLOSURE has lowest priority');

// Most-restrictive resolution
assert(resolveMostRestrictiveBehavior([
  L11RuntimeMissingDataBehaviorClass.REQUIRE_ATTRIBUTION_WARNING,
  L11RuntimeMissingDataBehaviorClass.CAP_SCORE,
  L11RuntimeMissingDataBehaviorClass.REDUCE_CONFIDENCE,
]) === L11RuntimeMissingDataBehaviorClass.CAP_SCORE,
  'B.04 most-restrictive resolution picks CAP_SCORE over REDUCE_CONFIDENCE');

// Mapping
assert(mapL11FormulaBehaviorToRuntimeBehavior(L11MissingDataBehaviorClass.LOWER_CONFIDENCE) ===
  L11RuntimeMissingDataBehaviorClass.REDUCE_CONFIDENCE,
  'B.05 LOWER_CONFIDENCE → REDUCE_CONFIDENCE');
assert(mapL11FormulaBehaviorToRuntimeBehavior(L11MissingDataBehaviorClass.EVIDENCE_ONLY) ===
  L11RuntimeMissingDataBehaviorClass.EVIDENCE_ONLY_CLASSIFICATION,
  'B.06 EVIDENCE_ONLY → EVIDENCE_ONLY_CLASSIFICATION');
assert(mapL11FormulaBehaviorToRuntimeBehavior(L11MissingDataBehaviorClass.REQUIRE_DISCLOSURE) ===
  L11RuntimeMissingDataBehaviorClass.REQUIRE_ATTRIBUTION_WARNING,
  'B.07 REQUIRE_DISCLOSURE → REQUIRE_ATTRIBUTION_WARNING');

// Behaviour vs condition legality
assert(!isRuntimeBehaviorLegalForCondition(
  L11MissingDataConditionClass.ABSENT_REQUIRED_INPUT,
  L11RuntimeMissingDataBehaviorClass.NO_EFFECT_WITH_DISCLOSURE).ok,
  'B.08 ABSENT_REQUIRED_INPUT cannot resolve to NO_EFFECT_WITH_DISCLOSURE');
assert(isRuntimeBehaviorLegalForCondition(
  L11MissingDataConditionClass.ABSENT_REQUIRED_INPUT,
  L11RuntimeMissingDataBehaviorClass.BLOCK_SCORE).ok,
  'B.09 ABSENT_REQUIRED_INPUT may BLOCK_SCORE');
assert(!isRuntimeBehaviorLegalForCondition(
  L11MissingDataConditionClass.EVIDENCE_ONLY_INPUT,
  L11RuntimeMissingDataBehaviorClass.BLOCK_SCORE).ok,
  'B.10 EVIDENCE_ONLY_INPUT cannot BLOCK_SCORE');
assert(!isRuntimeBehaviorLegalForCondition(
  L11MissingDataConditionClass.RESTRICTED_INPUT,
  L11RuntimeMissingDataBehaviorClass.OMIT_OPTIONAL_COMPONENT).ok,
  'B.11 RESTRICTED_INPUT cannot OMIT_OPTIONAL_COMPONENT');

// Behaviour validator catches: required missing → NO_EFFECT_WITH_DISCLOSURE
const offendingProfile: L11ScoreMissingDataProfile = {
  ...staleProfile,
  applied_behaviors: [{
    applied_behavior_id: 'l11m.applied.bad.001',
    missing_input_ref_id: 'l11m.input.bad.001',
    condition_class: L11MissingDataConditionClass.ABSENT_REQUIRED_INPUT,
    behavior: L11RuntimeMissingDataBehaviorClass.NO_EFFECT_WITH_DISCLOSURE,
    score_effect: 0,
    confidence_effect: 0,
    disclosure_required: true,
    reason_codes: ['REQUIRED_INPUT_BUT_NEUTRAL'],
    lineage_refs: ['l11m.lineage.test'],
    policy_version: L11_MISSING_DATA_POLICY_VERSION,
  }],
};
const offendingResult = validateL11AppliedMissingDataBehavior({
  applied_behaviors: offendingProfile.applied_behaviors,
});
assert(!offendingResult.ok, 'B.12 behaviour validator rejects required+neutral');
assert(offendingResult.issues.some(i =>
  i.code === L11MissingRegimeViolationCode.L11M_REQUIRED_INPUT_MISSING_BUT_NEUTRAL),
  'B.13 L11M_REQUIRED_INPUT_MISSING_BUT_NEUTRAL emitted');

// Build BLOCK_SCORE profile via engine
const evalBlock = buildEvaluation(oppFormula, {
  missing: [{
    missing_data_rule_id: oppFormula.missing_data_rules[0]?.missing_data_rule_id ?? 'rule.block.001',
    input_condition: L11InputConditionClass.REQUIRED_MISSING,
    behavior: L11MissingDataBehaviorClass.BLOCK_SCORE,
    affected_component_id: oppFormula.component_definitions[0].component_id,
  }],
});
const blockResult = runL11MissingDataProfileEngine({
  score: oppScore, evaluation: evalBlock, formula: oppFormula,
  availability: makeAvailability(oppFormula),
});
assert(blockResult.ok, 'B.14 BLOCK_SCORE profile builds');
const blockProfile = blockResult.profile!;
assert(blockProfile.applied_behaviors[0].behavior === L11RuntimeMissingDataBehaviorClass.BLOCK_SCORE,
  'B.15 BLOCK_SCORE behaviour applied');
assert(blockProfile.visibility_class === L11ScoreVisibilityClass.BLOCKED_VISIBILITY,
  'B.16 BLOCK_SCORE → BLOCKED_VISIBILITY');
assert(blockProfile.readiness_effect === L11MissingDataReadinessEffect.SCORE_BLOCKED,
  'B.17 BLOCK_SCORE → readiness SCORE_BLOCKED');

// Visibility validator rejects emitted BLOCKED
const blockVis = validateL11ScoreVisibility({ profile: blockProfile, is_emitted: true });
assert(!blockVis.ok, 'B.18 visibility validator rejects emitted BLOCKED');
assert(blockVis.issues.some(i =>
  i.code === L11MissingRegimeViolationCode.L11M_BLOCKED_VISIBILITY_EMITTED),
  'B.19 L11M_BLOCKED_VISIBILITY_EMITTED emitted');

// Replay-hash mismatch detection
const tampered: L11ScoreMissingDataProfile = { ...staleProfile, score_effect: 999 };
const tamperedHash = canonicalMissingDataProfileReplayHash(
  extractL11MissingDataProfileReplayMaterial(tampered),
);
assert(tamperedHash !== staleProfile.replay_hash,
  'B.20 material change flips replay_hash');

// ═══════════════════════════════════════════════════════════════
// BAND C — Regime modifier law (§11.5.19 Band C)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Regime Modifier Law ═══');

assert(ALL_L11_REGIME_POSTURE_CODES.length === 8, 'C.01 8 regime posture codes');
assert(ALL_L11_REGIME_POSTURE_CODES.includes(L11RegimePostureCode.SPOT_LED_EXPANSION),
  'C.02 SPOT_LED_EXPANSION registered');
assert(ALL_L11_REGIME_POSTURE_CODES.includes(L11RegimePostureCode.STALE_OR_AMBIGUOUS_REGIME),
  'C.03 STALE_OR_AMBIGUOUS_REGIME registered');

// Run regime engine — SPOT_LED_EXPANSION + OPPORTUNITY → AMPLIFY
const oppRegimeResult = runL11RegimeModifierEngine({
  score: oppScore, formula: oppFormula,
  regime_read: makeRegimeRead(L11RegimePostureCode.SPOT_LED_EXPANSION),
});
assert(oppRegimeResult.ok, 'C.04 regime engine runs');
assert(oppRegimeResult.modifiers.length === 1, 'C.05 1 modifier produced');
const oppMod = oppRegimeResult.modifiers[0];
assert(oppMod.modifier_type === L11RegimeModifierType.AMPLIFY_COMPONENT,
  'C.06 SPOT_LED_EXPANSION + OPPORTUNITY → AMPLIFY_COMPONENT');
assert(oppMod.modifier_strength > 0 && oppMod.modifier_strength <= 1,
  'C.07 modifier_strength in [0,1]');
assert(!!oppMod.replay_hash, 'C.08 modifier carries replay_hash');
assert(oppMod.policy_version === L11_REGIME_MODIFIER_POLICY_VERSION,
  'C.09 modifier carries L11.5 policy version');

// Missing regime_ref → engine error
const noRefResult = runL11RegimeModifierEngine({
  score: oppScore, formula: oppFormula,
  regime_read: makeRegimeRead(L11RegimePostureCode.SPOT_LED_EXPANSION, { regime_ref: '' }),
});
assert(!noRefResult.ok, 'C.10 regime engine rejects missing regime_ref');
assert(noRefResult.errors.some(e => e.code === 'REGIME_REF_MISSING'),
  'C.11 REGIME_REF_MISSING surfaced');

// Stale regime_ref → engine error
const staleRefResult = runL11RegimeModifierEngine({
  score: oppScore, formula: oppFormula,
  regime_read: makeRegimeRead(L11RegimePostureCode.SPOT_LED_EXPANSION, {
    freshness_budget_ms: 1_000, observed_age_ms: 60_000,
  }),
});
assert(!staleRefResult.ok, 'C.12 regime engine rejects stale ref');
assert(staleRefResult.errors.some(e => e.code === 'REGIME_REF_STALE'),
  'C.13 REGIME_REF_STALE surfaced');

// Regime modifier validator
const oppModVal = validateL11RegimeModifier({ modifier: oppMod });
assert(oppModVal.ok, 'C.14 valid modifier passes validator');

// Strength out of bounds
const badStrengthMod: L11ScoreRegimeModifier = {
  ...oppMod, modifier_strength: 5,
  replay_hash: canonicalRegimeModifierReplayHash(
    extractL11RegimeModifierReplayMaterial({ ...oppMod, modifier_strength: 5 }),
  ),
};
const badStrengthVal = validateL11RegimeModifier({ modifier: badStrengthMod });
assert(!badStrengthVal.ok, 'C.15 strength > 1 rejected');
assert(badStrengthVal.issues.some(i =>
  i.code === L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_STRENGTH_OUT_OF_BOUNDS),
  'C.16 L11M_REGIME_MODIFIER_STRENGTH_OUT_OF_BOUNDS emitted');

// Multiplier > 1.5 without REGIME_HIGH_IMPACT_MULTIPLIER
const highMultDraft = {
  ...oppMod, multiplier_effect: 2.0,
  reason_codes: oppMod.reason_codes.filter(
    r => r !== L11RegimeModifierReasonCode.REGIME_HIGH_IMPACT_MULTIPLIER),
};
const highMultMod: L11ScoreRegimeModifier = {
  ...highMultDraft,
  replay_hash: canonicalRegimeModifierReplayHash(
    extractL11RegimeModifierReplayMaterial(highMultDraft)),
};
const highMultVal = validateL11RegimeModifier({ modifier: highMultMod });
assert(!highMultVal.ok, 'C.17 multiplier_effect > 1.5 without high-impact reason rejected');
assert(highMultVal.issues.some(i =>
  i.code === L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_HIGH_IMPACT_REASON_MISSING),
  'C.18 L11M_REGIME_MODIFIER_HIGH_IMPACT_REASON_MISSING emitted');

// L10 restriction not acknowledged
const restrictionVal = validateL11RegimeModifier({
  modifier: oppMod,
  active_l10_restriction_refs: ['l10.restriction.bear-001'],
});
assert(!restrictionVal.ok, 'C.19 modifier without acknowledging L10 restriction rejected');
assert(restrictionVal.issues.some(i =>
  i.code === L11MissingRegimeViolationCode.L11M_REGIME_OVERRIDES_L10_RESTRICTION),
  'C.20 L11M_REGIME_OVERRIDES_L10_RESTRICTION emitted');

// Contradiction override
const overrideVal = validateL11RegimeModifier({
  modifier: oppMod, contradiction_refs: ['l7.contradiction.001'],
});
// Only fires if strength > 0.7. Our 0.4 * 0.8 = 0.32 → no fail; build a strong one.
const strongDraft = { ...oppMod, modifier_strength: 0.9 };
const strongMod: L11ScoreRegimeModifier = {
  ...strongDraft,
  replay_hash: canonicalRegimeModifierReplayHash(
    extractL11RegimeModifierReplayMaterial(strongDraft)),
};
const strongOverrideVal = validateL11RegimeModifier({
  modifier: strongMod, contradiction_refs: ['l7.contradiction.001'],
});
assert(!strongOverrideVal.ok, 'C.21 strong amplify + contradiction rejects');
assert(strongOverrideVal.issues.some(i =>
  i.code === L11MissingRegimeViolationCode.L11M_REGIME_OVERRIDES_CONTRADICTION),
  'C.22 L11M_REGIME_OVERRIDES_CONTRADICTION emitted');
// Suppress unused-var lint for overrideVal (we tested the strong path)
void overrideVal;

// Structural validity helper
const structVal = isL11RegimeModifierStructurallyValid({ ...oppMod, modifier_strength: -0.1 });
assert(!structVal.ok, 'C.23 negative strength fails structural check');

// ═══════════════════════════════════════════════════════════════
// BAND D — Family matrices and interactions (§11.5.19 Band D)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Family Matrices and Interactions ═══');

// Matrix integrity
const matrixIntegrity = validateL11RegimeModifierMatrixIntegrity();
assert(matrixIntegrity.ok, 'D.01 §11.5.10 matrix passes integrity check');

// Matrix coverage across the eight production families
const productionFamilies = [
  L11ScoreFamily.OPPORTUNITY, L11ScoreFamily.RISK, L11ScoreFamily.TIMING,
  L11ScoreFamily.THESIS_COHERENCE, L11ScoreFamily.SIGNAL_CONFIDENCE,
  L11ScoreFamily.MARKET_STRUCTURE, L11ScoreFamily.WHALE_CONVICTION,
  L11ScoreFamily.UNLOCK_RISK,
];
const coverage = validateMatrixCoverageAcrossProductionFamilies(productionFamilies);
assert(coverage.ok, 'D.02 every production family has ≥1 matrix entry');

// Specific family coverage
assert(lookupL11RegimeModifierMatrixEntry(L11ScoreFamily.RISK,
  L11RegimePostureCode.LEVERAGE_LED_EXPANSION) !== null,
  'D.03 RISK × LEVERAGE_LED_EXPANSION present');
assert(lookupL11RegimeModifierMatrixEntry(L11ScoreFamily.UNLOCK_RISK,
  L11RegimePostureCode.THIN_LIQUIDITY_FRAGILITY) !== null,
  'D.04 UNLOCK_RISK × THIN_LIQUIDITY_FRAGILITY present');
assert(lookupL11RegimeModifierMatrixEntry(L11ScoreFamily.SIGNAL_CONFIDENCE,
  L11RegimePostureCode.STALE_OR_AMBIGUOUS_REGIME) !== null,
  'D.05 SIGNAL_CONFIDENCE × STALE_OR_AMBIGUOUS_REGIME present');

// Risk family — leverage-led expansion AMPLIFIES
const riskScore = buildScoreFor(riskFormula, 70, L11ScoreBand.HIGH);
const riskRegimeResult = runL11RegimeModifierEngine({
  score: riskScore, formula: riskFormula,
  regime_read: makeRegimeRead(L11RegimePostureCode.LEVERAGE_LED_EXPANSION),
});
assert(riskRegimeResult.ok, 'D.06 RISK regime engine runs');
assert(riskRegimeResult.modifiers[0].modifier_type === L11RegimeModifierType.AMPLIFY_COMPONENT,
  'D.07 RISK + LEVERAGE_LED_EXPANSION → AMPLIFY (risk goes up)');

// UNLOCK_RISK + THIN_LIQUIDITY_FRAGILITY
const unlockScore = buildScoreFor(unlockFormula, 60, L11ScoreBand.HIGH);
const unlockRegimeResult = runL11RegimeModifierEngine({
  score: unlockScore, formula: unlockFormula,
  regime_read: makeRegimeRead(L11RegimePostureCode.THIN_LIQUIDITY_FRAGILITY),
});
assert(unlockRegimeResult.ok && unlockRegimeResult.modifiers[0].modifier_type ===
  L11RegimeModifierType.AMPLIFY_COMPONENT,
  'D.08 UNLOCK_RISK + THIN_LIQUIDITY_FRAGILITY → AMPLIFY');

// Hard cap — OPPORTUNITY + THIN_LIQUIDITY_FRAGILITY
const cap = getL11RegimeHardCapBand(L11ScoreFamily.OPPORTUNITY,
  L11RegimePostureCode.THIN_LIQUIDITY_FRAGILITY);
assert(cap === L11ScoreBand.HIGH,
  'D.09 OPPORTUNITY + THIN_LIQUIDITY_FRAGILITY hard-caps at HIGH');

// Hard-cap violation detector — VERY_HIGH score under thin liquidity
const veryHighOpp = buildScoreFor(oppFormula, 90, L11ScoreBand.VERY_HIGH);
const thinLiqResult = runL11RegimeModifierEngine({
  score: veryHighOpp, formula: oppFormula,
  regime_read: makeRegimeRead(L11RegimePostureCode.THIN_LIQUIDITY_FRAGILITY),
});
assert(thinLiqResult.ok, 'D.10 thin-liquidity regime engine runs');
const matrixCheck = validateL11ModifierAgainstMatrix({
  score: veryHighOpp, modifier: thinLiqResult.modifiers[0],
});
assert(!matrixCheck.ok, 'D.11 VERY_HIGH score under THIN_LIQUIDITY_FRAGILITY rejects');
assert(matrixCheck.issues.some(i =>
  i.code === L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_HARD_CAP_VIOLATED),
  'D.12 L11M_REGIME_MODIFIER_HARD_CAP_VIOLATED emitted');

// Interaction engine — material missing-data + active modifier
assert(ALL_L11_MISSING_REGIME_INTERACTION_CLASSES.length === 5,
  'D.13 5 interaction classes');
assert(mostSevereL11InteractionClass([
  L11MissingRegimeInteractionClass.DISCLOSURE_INTERACTION,
  L11MissingRegimeInteractionClass.BLOCKING_INTERACTION,
]) === L11MissingRegimeInteractionClass.BLOCKING_INTERACTION,
  'D.14 mostSevereL11InteractionClass picks BLOCKING');

const interactionResult = runL11MissingRegimeInteractionEngine({
  score: oppScore, formula: oppFormula,
  missing_profile: blockProfile,
  regime_modifiers: [oppMod],
});
assert(interactionResult.ok, 'D.15 interaction engine runs');
assert(interactionResult.interactions.length >= 1,
  'D.16 ≥1 interaction emitted');
assert(interactionResult.interactions[0].interaction_class ===
  L11MissingRegimeInteractionClass.BLOCKING_INTERACTION,
  'D.17 BLOCK profile + modifier → BLOCKING_INTERACTION');
assert(interactionResult.interactions[0].policy_version ===
  L11_MISSING_REGIME_INTERACTION_POLICY_VERSION,
  'D.18 interaction carries L11.5 interaction policy version');

// Interaction validator
const intxVal = validateL11MissingRegimeInteraction({
  interaction: interactionResult.interactions[0],
  profile: blockProfile, modifiers: [oppMod],
});
assert(intxVal.ok, 'D.19 interaction validator passes');

// Interaction omitted when material — coverage validator
const coverageVal = validateL11MissingRegimeInteractionCoverage({
  profile: blockProfile, modifiers: [oppMod], interactions: [],
});
assert(!coverageVal.ok, 'D.20 coverage validator rejects empty interactions w/ material data');
assert(coverageVal.issues.some(i =>
  i.code === L11MissingRegimeViolationCode.L11M_MISSING_REGIME_INTERACTION_OMITTED),
  'D.21 L11M_MISSING_REGIME_INTERACTION_OMITTED emitted');

// Out-of-matrix modifier rejects via validator
const outOfMatrixDraft: Omit<L11ScoreRegimeModifier, 'replay_hash'> = {
  ...oppMod, modifier_type: L11RegimeModifierType.FLOOR_SCORE,
};
const outOfMatrixMod: L11ScoreRegimeModifier = {
  ...outOfMatrixDraft,
  replay_hash: canonicalRegimeModifierReplayHash(
    extractL11RegimeModifierReplayMaterial(outOfMatrixDraft)),
};
const outOfMatrixVal = validateL11RegimeModifier({ modifier: outOfMatrixMod });
assert(!outOfMatrixVal.ok, 'D.22 (family, regime, FLOOR_SCORE) out-of-matrix rejects');
assert(outOfMatrixVal.issues.some(i =>
  i.code === L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_OUTSIDE_MATRIX),
  'D.23 L11M_REGIME_MODIFIER_OUTSIDE_MATRIX emitted');

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit, attribution linkage, and invariants (§11.5.19 Band E)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Audit, Attribution Linkage, and Invariants ═══');

// Audit subject classes registered
assert(ALL_L11_MISSING_REGIME_AUDIT_SUBJECT_CLASSES.length === 9,
  'E.01 9 audit subject classes');
assert(ALL_L11_MISSING_REGIME_AUDIT_SUBJECT_CLASSES.includes(
  L11MissingRegimeAuditSubjectClass.MISSING_DATA_PROFILE),
  'E.02 MISSING_DATA_PROFILE subject class registered');
assert(ALL_L11_MISSING_REGIME_AUDIT_SUBJECT_CLASSES.includes(
  L11MissingRegimeAuditSubjectClass.REGIME_MODIFIER),
  'E.03 REGIME_MODIFIER subject class registered');

// Severity map covers all codes
for (const code of ALL_L11_MISSING_REGIME_VIOLATION_CODES) {
  const sev = severityForL11MissingRegimeCode(code);
  assert(['INFO', 'WARNING', 'ERROR', 'CRITICAL'].includes(sev),
    `E.04.${code} severity defined`);
}

// Audit batch emission (deterministic ids)
const auditIssues = masterValBad.issues;
const auditTime = '2026-05-07T00:00:00Z';
const auditBatch1 = emitL11MissingRegimeAuditBatch(
  L11MissingRegimeAuditSubjectClass.MISSING_DATA_PROFILE,
  'l11m.profile.test', auditIssues, auditTime,
);
const auditBatch2 = emitL11MissingRegimeAuditBatch(
  L11MissingRegimeAuditSubjectClass.MISSING_DATA_PROFILE,
  'l11m.profile.test', auditIssues, auditTime,
);
assert(auditBatch1.length === auditIssues.length,
  'E.05 audit batch size matches issues');
assert(auditBatch1.every((r, i) => r.audit_id === auditBatch2[i].audit_id),
  'E.06 audit ids deterministic across runs');

// ── Invariants
const invA = checkInvariantL11_5_A_MissingDataNeverNeutral({ profile: staleProfile });
assert(invA.ok, 'E.07 INV-11.5-A green for STALE profile');
const invA_offending = checkInvariantL11_5_A_MissingDataNeverNeutral({ profile: offendingProfile });
assert(!invA_offending.ok, 'E.08 INV-11.5-A red for required+neutral profile');

const invB = checkInvariantL11_5_B_BehaviorCompleteness({
  evaluation: evalStale, profile: staleProfile,
});
assert(invB.ok, 'E.09 INV-11.5-B green');

const invC = checkInvariantL11_5_C_VisibilityClass({ profile: staleProfile });
assert(invC.ok, 'E.10 INV-11.5-C green for STALE profile');
const invC_blocked = checkInvariantL11_5_C_VisibilityClass({
  profile: blockProfile, is_emitted: true,
});
assert(!invC_blocked.ok, 'E.11 INV-11.5-C red when emitting BLOCKED_VISIBILITY');

const invD = checkInvariantL11_5_D_RegimeReference({ modifiers: [oppMod] });
assert(invD.ok, 'E.12 INV-11.5-D green for valid modifier');
const invD_bad = checkInvariantL11_5_D_RegimeReference({
  modifiers: [{ ...oppMod, regime_ref: '' }],
});
assert(!invD_bad.ok, 'E.13 INV-11.5-D red for empty regime_ref');

const invE = checkInvariantL11_5_E_ModifierBoundary({ modifiers: [oppMod] });
assert(invE.ok, 'E.14 INV-11.5-E green for in-matrix modifier');
const invE_bad = checkInvariantL11_5_E_ModifierBoundary({
  modifiers: [outOfMatrixMod],
});
assert(!invE_bad.ok, 'E.15 INV-11.5-E red for out-of-matrix modifier');

const invF = checkInvariantL11_5_F_InteractionLaw({
  profile: blockProfile, modifiers: [oppMod],
  interactions: interactionResult.interactions,
});
assert(invF.ok, 'E.16 INV-11.5-F green when interactions present');
const invF_omitted = checkInvariantL11_5_F_InteractionLaw({
  profile: blockProfile, modifiers: [oppMod], interactions: [],
});
assert(!invF_omitted.ok, 'E.17 INV-11.5-F red when interactions omitted');

// INV-11.5-G — score must reference profile + modifiers
const linkedScore = buildScoreFor(oppFormula, 65, L11ScoreBand.HIGH, {
  missing_data_profile_ref: staleProfile.missing_profile_id,
  regime_modifier_refs: [oppMod.modifier_id],
});
const invG = checkInvariantL11_5_G_AttributionLinkage({
  score: linkedScore, profile: staleProfile, modifiers: [oppMod],
});
assert(invG.ok, 'E.18 INV-11.5-G green when score references profile + modifiers');
const invG_bad = checkInvariantL11_5_G_AttributionLinkage({
  score: oppScore, profile: staleProfile, modifiers: [oppMod],
});
// oppScore.regime_modifier_refs is [], so must fail
assert(!invG_bad.ok, 'E.19 INV-11.5-G red when modifier not referenced');

const invH = checkInvariantL11_5_H_ReplayDeterminism({
  profile: staleProfile, modifiers: [oppMod],
});
assert(invH.ok, 'E.20 INV-11.5-H green for clean replay material');
const tamperedHashProfile: L11ScoreMissingDataProfile = {
  ...staleProfile, replay_hash: 'l11m.h.tampered',
};
const invH_bad = checkInvariantL11_5_H_ReplayDeterminism({
  profile: tamperedHashProfile, modifiers: [oppMod],
});
assert(!invH_bad.ok, 'E.21 INV-11.5-H red on tampered replay_hash');

// Readiness master validator
const readinessVal = validateL11MissingDataRegimeReadiness({
  score: linkedScore, profile: staleProfile, modifiers: [oppMod],
  interactions: interactionResult.interactions,
});
assert(readinessVal.ok, 'E.22 master readiness validator green for linked score');
const readinessBad = validateL11MissingDataRegimeReadiness({
  score: oppScore, profile: staleProfile, modifiers: [oppMod], interactions: [],
});
assert(!readinessBad.ok, 'E.23 master readiness validator red for unlinked score');

// Master profile validator green path
const masterValGood = validateL11MissingDataProfile({ profile: staleProfile });
assert(masterValGood.issues.length === 0, 'E.24 master profile validator green path');

// Per-input-ref validator on rich condition
const restrictedRef: L11MissingInputRef = {
  input_ref_id: 'l11m.input.restricted.001',
  input_surface_ref: L11DependencySurfaceClass.L7_RESTRICTION_PROFILE,
  source_layer: 'L7',
  dependency_class: L11FormulaInputDependencyClass.REQUIRED,
  condition_class: L11MissingDataConditionClass.RESTRICTED_INPUT,
  required_for_component_refs: ['component-restricted-001'],
  restriction_refs: ['l7.restriction.001'],
  lineage_refs: ['l11m.lineage.test'],
};
const restrictedVal = validateL11MissingInputRef({ ref: restrictedRef });
assert(restrictedVal.ok, 'E.25 RESTRICTED_INPUT with restriction_refs passes');
const restrictedBadRef: L11MissingInputRef = { ...restrictedRef, restriction_refs: undefined };
const restrictedBadVal = validateL11MissingInputRef({ ref: restrictedBadRef });
assert(!restrictedBadVal.ok, 'E.26 RESTRICTED_INPUT without restriction_refs fails');
assert(restrictedBadVal.issues.some(i =>
  i.code === L11MissingRegimeViolationCode.L11M_RESTRICTED_INPUT_LACKS_RESTRICTION_REFS),
  'E.27 L11M_RESTRICTED_INPUT_LACKS_RESTRICTION_REFS emitted');

// Final summary
console.log('\n══════════════════════════════════════════');
console.log('L11.5 Missing-Data + Regime Modifier Test Suite');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  - ${f}`));
  console.log('\n✗ L11.5 ASSERTIONS FAILED');
  process.exit(1);
} else {
  console.log('\n✓ ALL L11.5 ASSERTIONS PASSED');
}
