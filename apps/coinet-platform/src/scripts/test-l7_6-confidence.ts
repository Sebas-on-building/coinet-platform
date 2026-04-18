/**
 * L7.6 — Reliance-Governance Certification Test Suite
 *
 * Bands per §7.6.9.2:
 *   A — Confidence factors
 *   B — Banding and cap chain
 *   C — Restriction profiles
 *   D — Regime compatibility and historical reliability
 *   E — Persistence (read surfaces), replay, audit, invariants
 */

import {
  // Factor model
  L7ConfidenceFactorGroup,
  ALL_L7_CONFIDENCE_FACTOR_GROUPS,
  L7_CONFIDENCE_FACTOR_DESCRIPTORS,
  L7_DEFAULT_FACTOR_WEIGHTS,
  L7_FACTOR_GROUP_MAX_LEGAL_WEIGHT,
  L7_BOUNDED_FACTOR_GROUPS,
  factorValuesToRuntimeComponents,
  isL7ConfidenceFactorGroup,
  // Bands
  L7ReliabilityBand,
  ALL_L7_RELIABILITY_BANDS,
  L7_RELIABILITY_BAND_THRESHOLDS,
  reliabilityBandForScore100,
  reliabilityBandForScore01,
  bandMatchesScore01,
  L7_RELIABILITY_BAND_TO_RUNTIME_BAND,
  L7_RUNTIME_BAND_TO_RELIABILITY_BAND,
  // Caps
  L7ConfidenceCapClass,
  ALL_L7_CONFIDENCE_CAP_CLASSES,
  L7_CONFIDENCE_CAP_DESCRIPTORS,
  L7_CONFIDENCE_CAP_CEILINGS,
  resolveCapCeiling,
  isL7ConfidenceCapClass,
  // Penalties
  L7ContradictionPenaltyClass,
  ALL_L7_CONTRADICTION_PENALTY_CLASSES,
  L7_CONTRADICTION_PENALTY_MAGNITUDE,
  penaltyClassForSeverity,
  resolvePenaltyMagnitude,
  // Restriction policy
  L7ReliabilityRight,
  ALL_L7_RELIABILITY_RIGHTS,
  L7_RELIABILITY_RIGHT_DESCRIPTORS,
  L7_RELIABILITY_RIGHT_TO_RUNTIME_RIGHT,
  isL7ReliabilityRight,
  // Local regime
  L7LocalRegimePosture,
  ALL_L7_LOCAL_REGIME_INPUT_CLASSES,
  L7_LOCAL_REGIME_MAX_CONFIDENCE_INFLUENCE,
  postureForCompatibilityScore,
  // Confidence policy
  L7ValidationConfidenceDecision,
  // Existing primitives we use to wire scenarios
  L7PrimaryValidationClass,
  L7ValidationModifierCode,
  L7ContradictionSeverity,
  L7RestrictionRight,
  L7RestrictionReasonCode,
} from '../l7/contracts';

import {
  getDefaultConfidenceFactorRegistry,
  getDefaultConfidenceCapRegistry,
  getDefaultReliabilityRightRegistry,
  getDefaultConfidencePolicyRegistry,
  L7_DEFAULT_CONFIDENCE_POLICY_ID,
  L7_DEFAULT_CONFIDENCE_POLICY_VERSION,
} from '../l7/registry';

import {
  L7ConfidencePolicyEngine,
  L7ClaimRestrictionEngine,
  L7HistoricalReliabilityEngine,
  L7DefaultHistoricalReliabilitySurface,
  L7LocalRegimeCompatibilityEngine,
} from '../l7/engine';

import {
  L7ValidationConfidenceScoringValidator,
  L7ConfidenceCapChainValidator,
  L7ClaimRestrictionValidator,
  L7LocalRegimeCompatibilityValidator,
  L7ConfidenceViolationCode,
} from '../l7/validation';

import {
  emitConfidenceAuditRecord,
  resetConfidenceAuditLog,
  getConfidenceAuditLog,
  getConfidenceViolationsBySurface,
  surfaceForConfidenceViolation,
  defaultSeverityForConfidenceViolation,
} from '../l7/constitution/l7-confidence-audit';

import {
  runAllL7_6Invariants,
  L7_6ValidationResultView,
  checkInvariantA_confidenceIsSeparateObject,
  checkInvariantB_completeStructure,
  checkInvariantC_doesNotOutrunLaw,
  checkInvariantD_localRegimeBounded,
  checkInvariantE_restrictionExplicitlyBoundsRights,
  checkInvariantF_noBroaderRights,
  checkInvariantG_replayLineagePreserved,
} from '../l7/invariants';

import { L7ValidationFamilyId } from '../l7/contracts/validation-family-definition';
import { L7ContradictionFamilyClass } from '../l7/contracts/contradiction-family';

import {
  L7InMemoryCurrentConfidenceReadService,
  L7InMemoryHistoricalConfidenceReadService,
  L7InMemoryCurrentRestrictionReadService,
  L7InMemoryHistoricalRestrictionReadService,
} from '../l7/read';

let passed = 0;
let failed = 0;
function assert(cond: boolean, label: string): void {
  if (cond) passed++;
  else {
    failed++;
    console.error(`  ✗ FAIL: ${label}`);
  }
}

const SUBJECT = 's:test:0001';
const RUN_ID = 'run-7.6-001';
const POLICY_ID = L7_DEFAULT_CONFIDENCE_POLICY_ID;
const POLICY_VERSION = L7_DEFAULT_CONFIDENCE_POLICY_VERSION;

function defaultFactorValues(): Record<L7ConfidenceFactorGroup, number> {
  return {
    [L7ConfidenceFactorGroup.SOURCE_TRUST]: 0.85,
    [L7ConfidenceFactorGroup.FRESHNESS]: 0.9,
    [L7ConfidenceFactorGroup.FEATURE_COMPLETENESS]: 0.8,
    [L7ConfidenceFactorGroup.CROSS_SOURCE_AGREEMENT]: 0.8,
    [L7ConfidenceFactorGroup.REGIME_COMPATIBILITY]: 0.8,
    [L7ConfidenceFactorGroup.HISTORICAL_RELIABILITY]: 0.7,
    [L7ConfidenceFactorGroup.CONTRADICTION_SEVERITY]: 0.0,
  };
}

function makeEngineInput(overrides: Partial<{
  subject: string;
  values: Record<L7ConfidenceFactorGroup, number>;
  contradictionSeverity: L7ContradictionSeverity;
  contradictionCount: number;
  staleness_material: boolean;
  staleness_blocking: boolean;
  incompleteness_material: boolean;
  incompleteness_blocking: boolean;
  ambiguity_material: boolean;
  degradation_material: boolean;
  unresolved_risk_overhang: boolean;
  unresolved_contradiction: boolean;
  repeated_contradiction: boolean;
  historical_reliability_weak: boolean;
  challenge_coverage_insufficient: boolean;
  family_id: string | null;
  restriction_profile_ref: string | null;
}> = {}) {
  return {
    subject_id: overrides.subject ?? SUBJECT,
    validation_result_id: 'vr:test:0001',
    compute_run_id: RUN_ID,
    trace_id: 'trace-7.6',
    manifest_id: 'manifest-7.6',
    policy_id: POLICY_ID,
    policy_version: POLICY_VERSION,
    family_id: overrides.family_id ?? null,
    factor_values: overrides.values ?? defaultFactorValues(),
    contradiction_severity:
      overrides.contradictionSeverity ?? L7ContradictionSeverity.INFO,
    contradiction_count: overrides.contradictionCount ?? 0,
    repeated_contradiction: overrides.repeated_contradiction ?? false,
    unresolved_contradiction: overrides.unresolved_contradiction ?? false,
    unresolved_risk_overhang: overrides.unresolved_risk_overhang ?? false,
    staleness_material: overrides.staleness_material ?? false,
    staleness_blocking: overrides.staleness_blocking ?? false,
    incompleteness_material: overrides.incompleteness_material ?? false,
    incompleteness_blocking: overrides.incompleteness_blocking ?? false,
    ambiguity_material: overrides.ambiguity_material ?? false,
    degradation_material: overrides.degradation_material ?? false,
    historical_reliability_weak: overrides.historical_reliability_weak ?? false,
    challenge_coverage_insufficient: overrides.challenge_coverage_insufficient ?? false,
    restriction_profile_ref: overrides.restriction_profile_ref ?? `rp:${overrides.subject ?? SUBJECT}:${RUN_ID}`,
  };
}

// ── Band A — Confidence factors ─────────────────────────────────────────
console.log('\n=== Band A — Confidence factors ===');

{
  assert(ALL_L7_CONFIDENCE_FACTOR_GROUPS.length === 7, 'exactly seven factor groups');
  assert(L7_CONFIDENCE_FACTOR_DESCRIPTORS.length === 7, 'seven factor descriptors');
  for (const d of L7_CONFIDENCE_FACTOR_DESCRIPTORS) {
    assert(d.maxLegalWeight === L7_FACTOR_GROUP_MAX_LEGAL_WEIGHT[d.group], `descriptor max weight matches table for ${d.group}`);
    assert(L7_DEFAULT_FACTOR_WEIGHTS[d.group] === d.defaultWeight, `default weight for ${d.group}`);
  }
  assert(L7_BOUNDED_FACTOR_GROUPS.includes(L7ConfidenceFactorGroup.REGIME_COMPATIBILITY), 'regime compat is bounded');
  assert(L7_BOUNDED_FACTOR_GROUPS.includes(L7ConfidenceFactorGroup.HISTORICAL_RELIABILITY), 'historical reliability is bounded');
  assert(!L7_BOUNDED_FACTOR_GROUPS.includes(L7ConfidenceFactorGroup.CONTRADICTION_SEVERITY), 'contradiction severity not bounded by truth-safety law');

  const reg = getDefaultConfidenceFactorRegistry();
  assert(reg.requiredGroups().length === 7, 'registry requires seven groups');
  for (const g of ALL_L7_CONFIDENCE_FACTOR_GROUPS) {
    assert(reg.isRegistered(g), `factor ${g} registered`);
    assert(reg.isValueLegal(g, 0.5), `value 0.5 legal for ${g}`);
    assert(!reg.isValueLegal(g, -0.1), `value -0.1 illegal for ${g}`);
    assert(!reg.isValueLegal(g, 1.1), `value 1.1 illegal for ${g}`);
    assert(reg.isWeightLegal(g, 0), `weight 0 legal for ${g}`);
    assert(reg.isWeightLegal(g, L7_FACTOR_GROUP_MAX_LEGAL_WEIGHT[g]), `max-legal weight legal for ${g}`);
    assert(!reg.isWeightLegal(g, L7_FACTOR_GROUP_MAX_LEGAL_WEIGHT[g] + 0.01), `weight above envelope illegal for ${g}`);
  }
  assert(!reg.isRegistered('NOT_A_FACTOR'), 'unknown factor rejected');
  assert(isL7ConfidenceFactorGroup('SOURCE_TRUST'), 'isL7ConfidenceFactorGroup positive case');
  assert(!isL7ConfidenceFactorGroup('SOMETHING'), 'isL7ConfidenceFactorGroup negative case');

  // Runtime mapping covers all factor keys.
  const runtime = factorValuesToRuntimeComponents(defaultFactorValues());
  assert(typeof runtime.source_trust_component === 'number', 'mapping yields source_trust_component');
  assert(runtime.contradiction_penalty_component === 0, 'mapping yields penalty component for default values');
}

// Engine: clean run produces HIGH band with no caps applied.
{
  const engine = new L7ConfidencePolicyEngine();
  const r = engine.evaluate(makeEngineInput());
  assert(r.ok, 'clean confidence engine run succeeds');
  if (r.ok) {
    const d = r.decision;
    assert(d.factor_breakdown.values[L7ConfidenceFactorGroup.SOURCE_TRUST] === 0.85, 'breakdown carries source trust value');
    assert(Math.abs(d.factor_breakdown.weights[L7ConfidenceFactorGroup.SOURCE_TRUST] - 0.18) < 1e-9, 'source trust weight is policy default');
    assert(d.cap_chain.applied_cap_classes.length === 0, 'no caps applied on clean state');
    assert(d.contradiction_penalty_chain.applied_magnitude === 0, 'no penalty applied on clean state');
    assert(d.reliability_band === L7ReliabilityBand.HIGH || d.reliability_band === L7ReliabilityBand.MEDIUM, 'clean state lands in HIGH/MEDIUM band');
  }
}

// Engine refuses unregistered policy.
{
  const engine = new L7ConfidencePolicyEngine();
  const r = engine.evaluate({
    ...makeEngineInput(),
    policy_id: 'l7.confidence.unknown',
    policy_version: '99.0.0',
  });
  assert(!r.ok, 'unregistered policy rejected');
  if (!r.ok) {
    const viols = (r as { violations: readonly { code: string }[] }).violations;
    assert(
      viols.some(v => v.code === L7ConfidenceViolationCode.CONFIDENCE_POLICY_VERSION_NOT_REGISTERED),
      'CONFIDENCE_POLICY_VERSION_NOT_REGISTERED emitted',
    );
  }
}

// Engine rejects out-of-range factor values.
{
  const bad = defaultFactorValues();
  bad[L7ConfidenceFactorGroup.SOURCE_TRUST] = 1.5;
  const engine = new L7ConfidencePolicyEngine();
  const r = engine.evaluate(makeEngineInput({ values: bad }));
  assert(!r.ok, 'out-of-range factor rejected');
  if (!r.ok) {
    const viols = (r as { violations: readonly { code: string }[] }).violations;
    assert(
      viols.some(v => v.code === L7ConfidenceViolationCode.FACTOR_COMPONENT_OUT_OF_RANGE),
      'FACTOR_COMPONENT_OUT_OF_RANGE emitted',
    );
  }
}

// ── Band B — Banding and cap chain ──────────────────────────────────────
console.log('\n=== Band B — Banding and cap chain ===');

{
  assert(ALL_L7_RELIABILITY_BANDS.length === 4, 'exactly four reliability bands');
  assert(reliabilityBandForScore100(95) === L7ReliabilityBand.HIGH, 'score 95 → HIGH');
  assert(reliabilityBandForScore100(70) === L7ReliabilityBand.MEDIUM, 'score 70 → MEDIUM');
  assert(reliabilityBandForScore100(40) === L7ReliabilityBand.LOW, 'score 40 → LOW');
  assert(reliabilityBandForScore100(10) === L7ReliabilityBand.UNRESOLVED, 'score 10 → UNRESOLVED');
  assert(reliabilityBandForScore01(0.85) === L7ReliabilityBand.HIGH, 'score01 0.85 → HIGH');
  assert(bandMatchesScore01(L7ReliabilityBand.UNRESOLVED, 0.1), 'bandMatchesScore01 UNRESOLVED at 0.1');

  // Mapping completeness.
  for (const b of ALL_L7_RELIABILITY_BANDS) {
    const rt = L7_RELIABILITY_BAND_TO_RUNTIME_BAND[b];
    assert(typeof rt === 'string', `runtime mapping for band ${b}`);
    const back = L7_RUNTIME_BAND_TO_RELIABILITY_BAND[rt];
    assert(typeof back === 'string', `reverse mapping for runtime band of ${b}`);
  }
  assert(L7_RELIABILITY_BAND_THRESHOLDS[0].band === L7ReliabilityBand.HIGH, 'thresholds in descending order');
  assert(L7_RELIABILITY_BAND_THRESHOLDS[3].band === L7ReliabilityBand.UNRESOLVED, 'last threshold is UNRESOLVED');
}

// Cap registry + ceiling tests.
{
  assert(ALL_L7_CONFIDENCE_CAP_CLASSES.length === 8, 'eight cap classes');
  for (const c of ALL_L7_CONFIDENCE_CAP_CLASSES) {
    assert(typeof L7_CONFIDENCE_CAP_CEILINGS[c] === 'number', `ceiling defined for ${c}`);
    assert(isL7ConfidenceCapClass(c), `isL7ConfidenceCapClass(${c})`);
  }
  assert(!isL7ConfidenceCapClass('NOT_A_CAP'), 'isL7ConfidenceCapClass rejects unknown');
  const reg = getDefaultConfidenceCapRegistry();
  assert(reg.list().length === 8, 'cap registry has 8 entries');
  const triggered = reg.capsRequiredFor(['CRITICAL_CONTRADICTION_PRESENT']);
  assert(triggered.includes(L7ConfidenceCapClass.CRITICAL_CONTRADICTION_CAP), 'critical trigger requires critical cap');

  const evals = [
    { capClass: L7ConfidenceCapClass.STALE_SUPPORT_CAP, applied: true, ceilingScore100: 55, reason: '' },
    { capClass: L7ConfidenceCapClass.CRITICAL_CONTRADICTION_CAP, applied: true, ceilingScore100: 35, reason: '' },
    { capClass: L7ConfidenceCapClass.HIGH_AMBIGUITY_CAP, applied: false, ceilingScore100: 50, reason: '' },
  ];
  assert(resolveCapCeiling(evals) === 35, 'cap-precedence picks lowest applied');
  assert(resolveCapCeiling([{ capClass: L7ConfidenceCapClass.STALE_SUPPORT_CAP, applied: false, ceilingScore100: 55, reason: '' }]) === null, 'no applied cap → null ceiling');
}

// Penalty registry tests.
{
  assert(ALL_L7_CONTRADICTION_PENALTY_CLASSES.length === 7, 'seven contradiction penalty classes');
  for (const p of ALL_L7_CONTRADICTION_PENALTY_CLASSES) {
    const m = L7_CONTRADICTION_PENALTY_MAGNITUDE[p];
    assert(m > 0 && m <= 1, `magnitude in (0,1] for ${p}`);
  }
  assert(penaltyClassForSeverity(L7ContradictionSeverity.BLOCKING) === L7ContradictionPenaltyClass.BLOCKING_CONTRADICTION_PENALTY, 'severity→class mapping (BLOCKING)');
  assert(penaltyClassForSeverity(L7ContradictionSeverity.SEVERE) === L7ContradictionPenaltyClass.SEVERE_CONTRADICTION_PENALTY, 'severity→class mapping (SEVERE)');
  const m = resolvePenaltyMagnitude([
    { penaltyClass: L7ContradictionPenaltyClass.MATERIAL_CONTRADICTION_PENALTY, applied: true, magnitude: 0.3, reason: '' },
    { penaltyClass: L7ContradictionPenaltyClass.SEVERE_CONTRADICTION_PENALTY, applied: true, magnitude: 0.55, reason: '' },
  ]);
  assert(Math.abs(m - 0.55) < 1e-9, 'penalty precedence picks max applied');
}

// End-to-end: critical contradiction caps confidence to LOW or below.
let criticalDecision: L7ValidationConfidenceDecision | null = null;
{
  const engine = new L7ConfidencePolicyEngine();
  const values = defaultFactorValues();
  values[L7ConfidenceFactorGroup.CONTRADICTION_SEVERITY] = 0.55;
  const r = engine.evaluate(
    makeEngineInput({
      values,
      contradictionSeverity: L7ContradictionSeverity.SEVERE,
      contradictionCount: 3,
      unresolved_contradiction: true,
    }),
  );
  assert(r.ok, 'severe contradiction run succeeds (caps applied)');
  if (r.ok) {
    criticalDecision = r.decision;
    assert(r.decision.cap_chain.applied_cap_classes.includes(L7ConfidenceCapClass.CRITICAL_CONTRADICTION_CAP), 'critical contradiction cap applied');
    assert(r.decision.contradiction_penalty_chain.applied_magnitude > 0, 'contradiction penalty applied');
    assert(r.decision.capped_score_100 <= 35 + 1e-6, 'capped score ≤ 35 under critical contradiction');
    assert(r.decision.reliability_band === L7ReliabilityBand.LOW || r.decision.reliability_band === L7ReliabilityBand.UNRESOLVED, 'band is LOW or UNRESOLVED');
  }
}

// Cap-chain validator detects truth-restrictiveness violations.
{
  const v = new L7ConfidenceCapChainValidator();
  const inputDecision: L7ValidationConfidenceDecision = {
    ...(criticalDecision as L7ValidationConfidenceDecision),
    capped_score_100: 99, // illegal: above the cap-chain ceiling.
  };
  const r = v.validate(inputDecision, { active_triggers: ['CRITICAL_CONTRADICTION_PRESENT'] });
  assert(!r.ok, 'cap-chain validator catches non-truth-restrictive capped score');
  assert(
    r.violations.some(x => x.code === L7ConfidenceViolationCode.CAP_CHAIN_NOT_TRUTH_RESTRICTIVE),
    'CAP_CHAIN_NOT_TRUTH_RESTRICTIVE emitted',
  );
}

// Cap-chain validator catches missing-required cap (using a clean decision).
{
  const v = new L7ConfidenceCapChainValidator();
  const cleanResult = new L7ConfidencePolicyEngine().evaluate(makeEngineInput());
  assert(cleanResult.ok, 'sanity: clean engine result for missing-required-cap test');
  if (cleanResult.ok) {
    const r = v.validate(cleanResult.decision, {
      active_triggers: ['STALENESS_MATERIAL'],
    });
    assert(!r.ok, 'cap-chain validator rejects missing required cap');
    assert(
      r.violations.some(x => x.code === L7ConfidenceViolationCode.CAP_REQUIRED_BUT_NOT_APPLIED),
      'CAP_REQUIRED_BUT_NOT_APPLIED emitted',
    );
  }
}

// Clean confidence ban: scoring validator catches masquerade.
{
  const engine = new L7ConfidencePolicyEngine();
  const r = engine.evaluate(makeEngineInput()); // no caps, no penalty
  assert(r.ok, 'sanity: clean confidence run');
  if (r.ok) {
    const sv = new L7ValidationConfidenceScoringValidator();
    const verdict = sv.validate(r.decision, {
      contradiction_count: 0,
      contradiction_material: true, // pretend material contradiction in state
      staleness_material: false,
      incompleteness_material: false,
      ambiguity_material: false,
      degradation_material: false,
    });
    assert(!verdict.ok, 'scoring validator catches clean confidence masquerade');
    assert(
      verdict.violations.some(x => x.code === L7ConfidenceViolationCode.CLEAN_CONFIDENCE_MASQUERADE),
      'CLEAN_CONFIDENCE_MASQUERADE emitted',
    );
  }
}

// Contradiction present but no penalty → engine refuses.
{
  const engine = new L7ConfidencePolicyEngine();
  const values = defaultFactorValues();
  values[L7ConfidenceFactorGroup.CONTRADICTION_SEVERITY] = 0.0;
  const r = engine.evaluate(
    makeEngineInput({ values, contradictionCount: 2, contradictionSeverity: L7ContradictionSeverity.INFO }),
  );
  // INFO severity yields MINOR penalty class with non-zero magnitude (0.1)
  assert(r.ok, 'engine emits MINOR penalty for INFO severity with count > 0');
  if (r.ok) {
    assert(r.decision.contradiction_penalty_chain.applied_magnitude > 0, 'penalty applied when contradiction count > 0');
  }
}

// ── Band C — Restriction profiles ───────────────────────────────────────
console.log('\n=== Band C — Restriction profiles ===');

{
  assert(ALL_L7_RELIABILITY_RIGHTS.length === 8, 'eight reliability rights');
  for (const r of ALL_L7_RELIABILITY_RIGHTS) {
    assert(typeof L7_RELIABILITY_RIGHT_TO_RUNTIME_RIGHT[r] === 'string', `right ${r} maps to runtime right`);
    assert(isL7ReliabilityRight(r), `isL7ReliabilityRight(${r})`);
  }
  assert(!isL7ReliabilityRight('NOT_A_RIGHT'), 'isL7ReliabilityRight rejects unknown');
  assert(L7_RELIABILITY_RIGHT_DESCRIPTORS.length === 8, 'eight reliability right descriptors');

  const reg = getDefaultReliabilityRightRegistry();
  assert(reg.list().length === 8, 'registry has 8 entries');
  assert(reg.requiresMinBand(L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED) === L7ReliabilityBand.HIGH, 'final judgment requires HIGH band');
  assert(reg.requiresMinBand(L7ReliabilityRight.DETERMINISTIC_SCORING_ALLOWED) === L7ReliabilityBand.MEDIUM, 'deterministic scoring requires MEDIUM band');

  const conflicts = reg.conflictsWith(L7ReliabilityRight.EVIDENCE_ONLY);
  assert(conflicts.includes(L7ReliabilityRight.DETERMINISTIC_SCORING_ALLOWED), 'EVIDENCE_ONLY conflicts with scoring');
  assert(conflicts.includes(L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED), 'EVIDENCE_ONLY conflicts with judgment');
}

// CONFIRMED + HIGH → final judgment + scoring + scenario rights.
{
  const eng = new L7ClaimRestrictionEngine();
  const r = eng.derive({
    subject_id: SUBJECT,
    primary_class: L7PrimaryValidationClass.CONFIRMED,
    modifiers: [],
    contradiction_severity: L7ContradictionSeverity.INFO,
    contradiction_count: 0,
    unresolved_overhang: false,
    reliability_band: L7ReliabilityBand.HIGH,
    score_100: 92,
    staleness_material: false,
    incompleteness_material: false,
    ambiguity_material: false,
    degradation_material: false,
    materiality_class: 'MEDIUM',
  });
  assert(r.rights.includes(L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED), 'CONFIRMED+HIGH grants FINAL_JUDGMENT_ALLOWED');
  assert(r.rights.includes(L7ReliabilityRight.DETERMINISTIC_SCORING_ALLOWED), 'CONFIRMED+HIGH grants DETERMINISTIC_SCORING_ALLOWED');
  assert(!r.evidence_only_mode, 'CONFIRMED+HIGH not evidence-only');
  assert(!r.blocked_from_score_driving, 'CONFIRMED+HIGH not blocked');
  assert(r.reasons.includes(L7RestrictionReasonCode.CONFIRMED_NO_RISK), 'CONFIRMED reason emitted');

  const v = new L7ClaimRestrictionValidator();
  const verdict = v.validate({
    subject_id: SUBJECT,
    primary_class: L7PrimaryValidationClass.CONFIRMED,
    modifiers: [],
    contradiction_severity: L7ContradictionSeverity.INFO,
    contradiction_count: 0,
    unresolved_overhang: false,
    reliability_band: L7ReliabilityBand.HIGH,
    score_100: 92,
    staleness_material: false,
    incompleteness_material: false,
    ambiguity_material: false,
    degradation_material: false,
    materiality_class: 'MEDIUM',
  }, r);
  assert(verdict.ok, 'restriction validator accepts clean CONFIRMED+HIGH');
}

// WEAKLY_CONFIRMED + MEDIUM + risk-overhang → scenario weighting only, additional confirmation.
{
  const eng = new L7ClaimRestrictionEngine();
  const r = eng.derive({
    subject_id: SUBJECT,
    primary_class: L7PrimaryValidationClass.WEAKLY_CONFIRMED,
    modifiers: [L7ValidationModifierCode.CHALLENGED_BY_RISK_OVERHANG],
    contradiction_severity: L7ContradictionSeverity.MATERIAL,
    contradiction_count: 1,
    unresolved_overhang: true,
    reliability_band: L7ReliabilityBand.MEDIUM,
    score_100: 70,
    staleness_material: false,
    incompleteness_material: false,
    ambiguity_material: false,
    degradation_material: false,
    materiality_class: 'MEDIUM',
  });
  assert(r.rights.includes(L7ReliabilityRight.SCENARIO_WEIGHTING_ALLOWED), 'WEAKLY+MEDIUM grants scenario weighting');
  assert(!r.rights.includes(L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED), 'no final judgment');
  assert(r.requires_additional_confirmation, 'requires additional confirmation');
  assert(r.requires_contradiction_disclosure, 'requires contradiction disclosure');
  assert(r.rights.includes(L7ReliabilityRight.REQUIRES_ADDITIONAL_CONFIRMATION), 'right reflects additional confirmation flag');
}

// CONFLICTING + LOW → evidence only.
{
  const eng = new L7ClaimRestrictionEngine();
  const r = eng.derive({
    subject_id: SUBJECT,
    primary_class: L7PrimaryValidationClass.CONFLICTING,
    modifiers: [],
    contradiction_severity: L7ContradictionSeverity.MATERIAL,
    contradiction_count: 2,
    unresolved_overhang: false,
    reliability_band: L7ReliabilityBand.LOW,
    score_100: 40,
    staleness_material: false,
    incompleteness_material: false,
    ambiguity_material: false,
    degradation_material: false,
    materiality_class: null,
  });
  assert(r.evidence_only_mode, 'CONFLICTING+LOW evidence-only');
  assert(r.rights.includes(L7ReliabilityRight.EVIDENCE_ONLY), 'EVIDENCE_ONLY right emitted');
  assert(!r.rights.includes(L7ReliabilityRight.SCENARIO_WEIGHTING_ALLOWED), 'no scenario weighting in evidence-only mode');
  assert(!r.rights.includes(L7ReliabilityRight.DETERMINISTIC_SCORING_ALLOWED), 'no scoring in evidence-only mode');
}

// INSUFFICIENT_EVIDENCE + UNRESOLVED → blocked from score driving.
{
  const eng = new L7ClaimRestrictionEngine();
  const r = eng.derive({
    subject_id: SUBJECT,
    primary_class: L7PrimaryValidationClass.INSUFFICIENT_EVIDENCE,
    modifiers: [L7ValidationModifierCode.INCOMPLETE],
    contradiction_severity: L7ContradictionSeverity.INFO,
    contradiction_count: 0,
    unresolved_overhang: false,
    reliability_band: L7ReliabilityBand.UNRESOLVED,
    score_100: 12,
    staleness_material: false,
    incompleteness_material: true,
    ambiguity_material: false,
    degradation_material: false,
    materiality_class: 'MEDIUM',
  });
  assert(r.blocked_from_score_driving, 'INSUFFICIENT+UNRESOLVED blocked from score driving');
  assert(r.rights.includes(L7ReliabilityRight.BLOCKED_FROM_SCORE_DRIVING), 'BLOCKED_FROM_SCORE_DRIVING right emitted');
  assert(!r.rights.includes(L7ReliabilityRight.SCENARIO_WEIGHTING_ALLOWED), 'no scenario weighting');
  assert(!r.rights.includes(L7ReliabilityRight.DETERMINISTIC_SCORING_ALLOWED), 'no scoring');
}

// STALE → evidence-only.
{
  const eng = new L7ClaimRestrictionEngine();
  const r = eng.derive({
    subject_id: SUBJECT,
    primary_class: L7PrimaryValidationClass.STALE,
    modifiers: [L7ValidationModifierCode.STALE_SUPPORT],
    contradiction_severity: L7ContradictionSeverity.INFO,
    contradiction_count: 0,
    unresolved_overhang: false,
    reliability_band: L7ReliabilityBand.LOW,
    score_100: 38,
    staleness_material: true,
    incompleteness_material: false,
    ambiguity_material: false,
    degradation_material: false,
    materiality_class: null,
  });
  assert(r.evidence_only_mode, 'STALE class is evidence-only');
  assert(!r.rights.includes(L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED), 'STALE never grants FINAL_JUDGMENT_ALLOWED');
}

// Validator catches BLOCKING + DETERMINISTIC_SCORING_ALLOWED smuggling.
{
  const v = new L7ClaimRestrictionValidator();
  const inputBad = {
    subject_id: SUBJECT,
    primary_class: L7PrimaryValidationClass.CONFIRMED,
    modifiers: [],
    contradiction_severity: L7ContradictionSeverity.BLOCKING,
    contradiction_count: 4,
    unresolved_overhang: true,
    reliability_band: L7ReliabilityBand.HIGH,
    score_100: 90,
    staleness_material: false,
    incompleteness_material: false,
    ambiguity_material: false,
    degradation_material: false,
    materiality_class: 'MEDIUM' as const,
  };
  const badResult = {
    subject_id: SUBJECT,
    rights: [
      L7ReliabilityRight.DETERMINISTIC_SCORING_ALLOWED,
      L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED,
    ] as readonly L7ReliabilityRight[],
    reasons: [L7RestrictionReasonCode.UNRESOLVED_CONTRADICTION] as readonly L7RestrictionReasonCode[],
    requires_contradiction_disclosure: false,
    requires_additional_confirmation: false,
    evidence_only_mode: false,
    blocked_from_score_driving: false,
  };
  const verdict = v.validate(inputBad, badResult);
  assert(!verdict.ok, 'validator rejects BLOCKING + score/judgment rights');
  assert(
    verdict.violations.some(x => x.code === L7ConfidenceViolationCode.RIGHTS_BROADER_THAN_STATE_JUSTIFIES),
    'RIGHTS_BROADER_THAN_STATE_JUSTIFIES emitted',
  );
}

// Validator catches missing-disclosure flag.
{
  const v = new L7ClaimRestrictionValidator();
  const verdict = v.validate(
    {
      subject_id: SUBJECT,
      primary_class: L7PrimaryValidationClass.CONFLICTING,
      modifiers: [],
      contradiction_severity: L7ContradictionSeverity.MATERIAL,
      contradiction_count: 2,
      unresolved_overhang: false,
      reliability_band: L7ReliabilityBand.MEDIUM,
      score_100: 67,
      staleness_material: false,
      incompleteness_material: false,
      ambiguity_material: false,
      degradation_material: false,
      materiality_class: null,
    },
    {
      subject_id: SUBJECT,
      rights: [L7ReliabilityRight.SCENARIO_WEIGHTING_ALLOWED] as readonly L7ReliabilityRight[],
      reasons: [L7RestrictionReasonCode.UNRESOLVED_CONTRADICTION] as readonly L7RestrictionReasonCode[],
      requires_contradiction_disclosure: true,
      requires_additional_confirmation: false,
      evidence_only_mode: false,
      blocked_from_score_driving: false,
    },
  );
  assert(!verdict.ok, 'validator rejects missing disclosure right');
  assert(
    verdict.violations.some(x => x.code === L7ConfidenceViolationCode.REQUIRED_DISCLOSURE_MISSING),
    'REQUIRED_DISCLOSURE_MISSING emitted',
  );
}

// ── Band D — Regime compatibility & historical reliability ───────────
console.log('\n=== Band D — Regime compatibility & historical reliability ===');

{
  assert(ALL_L7_LOCAL_REGIME_INPUT_CLASSES.length === 7, 'seven regime input classes');
  assert(L7_LOCAL_REGIME_MAX_CONFIDENCE_INFLUENCE === 0.15, 'regime max influence is 0.15');
  assert(postureForCompatibilityScore(0.95) === L7LocalRegimePosture.COMPATIBLE, 'high score → COMPATIBLE');
  assert(postureForCompatibilityScore(0.5) === L7LocalRegimePosture.NEUTRAL, 'mid score → NEUTRAL');
  assert(postureForCompatibilityScore(0.1) === L7LocalRegimePosture.INCOMPATIBLE, 'low score → INCOMPATIBLE');

  // Regime weight registered max stays at 0.15.
  assert(L7_FACTOR_GROUP_MAX_LEGAL_WEIGHT[L7ConfidenceFactorGroup.REGIME_COMPATIBILITY] === 0.15, 'regime weight envelope = 0.15');
}

// Regime engine: undeclared inputs produce used_without_declaration.
{
  const e = new L7LocalRegimeCompatibilityEngine();
  const r = e.evaluate({
    subject_id: SUBJECT,
    declared_input_classes: [],
    observations: { TREND: 0.9 },
  });
  assert(r.used_without_declaration, 'engine flags missing declaration');
  assert(r.compatibility_score === 0.5, 'no declared inputs → neutral 0.5');
  assert(r.posture === L7LocalRegimePosture.NEUTRAL, 'no inputs considered → NEUTRAL posture');
}

// Regime engine: declared inputs averaged.
{
  const e = new L7LocalRegimeCompatibilityEngine();
  const r = e.evaluate({
    subject_id: SUBJECT,
    declared_input_classes: ['TREND', 'BREADTH'],
    observations: { TREND: 0.9, BREADTH: 0.7 },
  });
  assert(Math.abs(r.compatibility_score - 0.8) < 1e-9, 'mean of 0.9 and 0.7 = 0.8');
  assert(r.posture === L7LocalRegimePosture.PARTIALLY_COMPATIBLE, 'score 0.8 → PARTIALLY_COMPATIBLE');
  assert(!r.used_without_declaration, 'declared classes set → no flag');
}

// Regime validator catches override attempts.
{
  const v = new L7LocalRegimeCompatibilityValidator();
  const verdict = v.validate(
    {
      subject_id: SUBJECT,
      compatibility_score: 0.9,
      posture: L7LocalRegimePosture.COMPATIBLE,
      used_without_declaration: false,
      inputs_considered: ['TREND'],
      rationale: '',
    },
    {
      subject_id: SUBJECT,
      applied_factor_weight: 0.1,
      contradiction_severity: L7ContradictionSeverity.SEVERE,
      staleness_material: false,
      degradation_material: false,
      used_as_final_regime: true,
      used_to_override_contradiction: true,
      used_to_override_state: false,
    },
  );
  assert(!verdict.ok, 'regime validator catches override misuse');
  const codes = verdict.violations.map(x => x.code);
  assert(codes.includes(L7ConfidenceViolationCode.REGIME_FACTOR_IMPERSONATES_FINAL_REGIME), 'IMPERSONATES_FINAL_REGIME emitted');
  assert(codes.includes(L7ConfidenceViolationCode.REGIME_FACTOR_OVERRIDES_CONTRADICTION), 'OVERRIDES_CONTRADICTION emitted');
}

// Regime validator: weight above envelope rejected.
{
  const v = new L7LocalRegimeCompatibilityValidator();
  const verdict = v.validate(
    {
      subject_id: SUBJECT,
      compatibility_score: 0.5,
      posture: L7LocalRegimePosture.NEUTRAL,
      used_without_declaration: false,
      inputs_considered: ['TREND'],
      rationale: '',
    },
    {
      subject_id: SUBJECT,
      applied_factor_weight: 0.5,
      contradiction_severity: L7ContradictionSeverity.INFO,
      staleness_material: false,
      degradation_material: false,
      used_as_final_regime: false,
      used_to_override_contradiction: false,
      used_to_override_state: false,
    },
  );
  assert(!verdict.ok, 'regime validator rejects weight above envelope');
  assert(
    verdict.violations.some(x => x.code === L7ConfidenceViolationCode.REGIME_FACTOR_OUT_OF_BOUNDS),
    'REGIME_FACTOR_OUT_OF_BOUNDS emitted',
  );
}

// Historical reliability engine: bounded output.
{
  const eng = new L7HistoricalReliabilityEngine(new L7DefaultHistoricalReliabilitySurface());
  const r = eng.evaluate({
    family: L7ValidationFamilyId.MARKET_STRENGTH_VALIDATION,
    dominantContradictionFamily: L7ContradictionFamilyClass.PRICE_FLOW_CONTRADICTION,
    contradictionCount: 0,
  });
  assert(r.reliability_score_01 >= 0 && r.reliability_score_01 <= 1, 'reliability score in [0,1]');
  assert(r.surface_lineage_ref.length > 0, 'surface lineage ref present');

  const rWithContra = eng.evaluate({
    family: L7ValidationFamilyId.MARKET_STRENGTH_VALIDATION,
    dominantContradictionFamily: L7ContradictionFamilyClass.PRICE_FLOW_CONTRADICTION,
    contradictionCount: 5,
  });
  assert(rWithContra.reliability_score_01 < r.reliability_score_01, 'contradictions weaken reliability');
  assert(rWithContra.reliability_score_01 >= 0, 'reliability stays non-negative');
}

// Custom historical surface bounded by [0.4, 1] multiplier even if surface returns extreme.
{
  const surface = {
    reliabilityFor: () => 1.5, // out of range
    contradictionMultiplierFor: () => 5.0, // out of range
    lineageRef: () => 'custom',
  };
  const eng = new L7HistoricalReliabilityEngine(surface as any);
  const r = eng.evaluate({
    family: L7ValidationFamilyId.MARKET_STRENGTH_VALIDATION,
    dominantContradictionFamily: null,
    contradictionCount: 0,
  });
  assert(r.reliability_score_01 <= 1.0, 'engine clamps surface output to ≤1');
  assert(r.reliability_score_01 > 0, 'engine clamps surface output to >0');
}

// ── Band E — Persistence (read surfaces), replay, audit, invariants ──
console.log('\n=== Band E — Persistence, replay, audit, invariants ===');

// Read services round-trip.
{
  const cur = new L7InMemoryCurrentConfidenceReadService();
  const hist = new L7InMemoryHistoricalConfidenceReadService();
  const eng = new L7ConfidencePolicyEngine();
  const r = eng.evaluate(makeEngineInput());
  assert(r.ok, 'sanity: engine ok for read-service test');
  if (r.ok) {
    cur.upsert(r.decision, { scope_type: 'asset', scope_id: 'BTC' });
    hist.append(r.decision, { scope_type: 'asset', scope_id: 'BTC' });
    (async () => {
      const got = await cur.getCurrentConfidence({ subject_id: r.decision.validation_subject_id, scope_type: 'asset', scope_id: 'BTC' });
      assert(got !== null && got.confidence_assessment_id === r.decision.confidence_assessment_id, 'current confidence read returns stored decision');
      const series = await hist.getConfidenceHistory({ subject_id: r.decision.validation_subject_id, scope_type: 'asset', scope_id: 'BTC', from_iso: '2025-01-01', to_iso: '2099-12-31' });
      assert(series.length === 1, 'history has exactly one transition');
    })();
  }
  const curRes = new L7InMemoryCurrentRestrictionReadService();
  const histRes = new L7InMemoryHistoricalRestrictionReadService();
  const restrictionEng = new L7ClaimRestrictionEngine();
  const profile = restrictionEng.derive({
    subject_id: SUBJECT,
    primary_class: L7PrimaryValidationClass.CONFIRMED,
    modifiers: [],
    contradiction_severity: L7ContradictionSeverity.INFO,
    contradiction_count: 0,
    unresolved_overhang: false,
    reliability_band: L7ReliabilityBand.HIGH,
    score_100: 90,
    staleness_material: false,
    incompleteness_material: false,
    ambiguity_material: false,
    degradation_material: false,
    materiality_class: 'MEDIUM',
  });
  curRes.upsert(profile, { scope_type: 'asset', scope_id: 'BTC' });
  histRes.append(profile, { scope_type: 'asset', scope_id: 'BTC' });
  assert(profile.rights.length > 0, 'restriction read services accept profile with rights');
}

// Replay: same engine input → same replay hash.
{
  const eng = new L7ConfidencePolicyEngine();
  const a = eng.evaluate(makeEngineInput());
  const b = eng.evaluate(makeEngineInput());
  if (a.ok && b.ok) {
    assert(a.decision.replay_hash === b.decision.replay_hash, 'replay hash stable for identical inputs');
    assert(a.decision.capped_score_100 === b.decision.capped_score_100, 'capped score stable for identical inputs');
  } else {
    assert(false, 'replay test inputs failed engine');
  }
}

// Audit log: surface mapping + emission.
{
  resetConfidenceAuditLog();
  emitConfidenceAuditRecord({
    violationCode: L7ConfidenceViolationCode.CAP_REQUIRED_BUT_NOT_APPLIED,
    source: 'test',
    relianceSurface: surfaceForConfidenceViolation(L7ConfidenceViolationCode.CAP_REQUIRED_BUT_NOT_APPLIED),
    subjectId: SUBJECT,
    factorGroup: null,
    capClass: 'STALE_SUPPORT_CAP',
    right: null,
    detail: 'test',
    context: {},
    severity: defaultSeverityForConfidenceViolation(L7ConfidenceViolationCode.CAP_REQUIRED_BUT_NOT_APPLIED),
  });
  emitConfidenceAuditRecord({
    violationCode: L7ConfidenceViolationCode.RIGHTS_BROADER_THAN_STATE_JUSTIFIES,
    source: 'test',
    relianceSurface: surfaceForConfidenceViolation(L7ConfidenceViolationCode.RIGHTS_BROADER_THAN_STATE_JUSTIFIES),
    subjectId: SUBJECT,
    factorGroup: null,
    capClass: null,
    right: 'FINAL_JUDGMENT_ALLOWED',
    detail: 'test',
    context: {},
    severity: defaultSeverityForConfidenceViolation(L7ConfidenceViolationCode.RIGHTS_BROADER_THAN_STATE_JUSTIFIES),
  });
  const log = getConfidenceAuditLog();
  assert(log.length === 2, 'audit log has 2 entries');
  assert(getConfidenceViolationsBySurface('CAP_CHAIN').length === 1, 'cap surface filter works');
  assert(getConfidenceViolationsBySurface('RESTRICTION').length === 1, 'restriction surface filter works');
  assert(log.every(r => r.severity === 'CRITICAL'), 'both violations are CRITICAL severity');
}

// Build invariant views from real engine + restriction-engine output.
function buildView(opts: {
  primary: L7PrimaryValidationClass;
  band: L7ReliabilityBand;
  values: Record<L7ConfidenceFactorGroup, number>;
  contradictionSeverity: L7ContradictionSeverity;
  contradictionCount: number;
  staleness_material?: boolean;
  incompleteness_material?: boolean;
  ambiguity_material?: boolean;
  degradation_material?: boolean;
  unresolved_overhang?: boolean;
  modifiers?: readonly L7ValidationModifierCode[];
  cap_triggers?: readonly any[];
  subject?: string;
}): L7_6ValidationResultView {
  const subject = opts.subject ?? SUBJECT;
  const eng = new L7ConfidencePolicyEngine();
  const r = eng.evaluate(makeEngineInput({
    subject,
    values: opts.values,
    contradictionSeverity: opts.contradictionSeverity,
    contradictionCount: opts.contradictionCount,
    staleness_material: opts.staleness_material ?? false,
    incompleteness_material: opts.incompleteness_material ?? false,
    ambiguity_material: opts.ambiguity_material ?? false,
    degradation_material: opts.degradation_material ?? false,
    unresolved_risk_overhang: opts.unresolved_overhang ?? false,
  }));
  if (!r.ok) {
    const viols = (r as { violations: readonly { code: string }[] }).violations;
    throw new Error('engine failed: ' + viols.map(v => v.code).join(','));
  }
  const restrictionEng = new L7ClaimRestrictionEngine();
  // Always derive restriction profile against the ENGINE-produced band, not
  // the caller's expected band — invariants require both to agree.
  const actualBand = r.decision.reliability_band;
  const restrictionInput = {
    subject_id: subject,
    primary_class: opts.primary,
    modifiers: opts.modifiers ?? [],
    contradiction_severity: opts.contradictionSeverity,
    contradiction_count: opts.contradictionCount,
    unresolved_overhang: opts.unresolved_overhang ?? false,
    reliability_band: actualBand,
    score_100: r.decision.capped_score_100,
    staleness_material: opts.staleness_material ?? false,
    incompleteness_material: opts.incompleteness_material ?? false,
    ambiguity_material: opts.ambiguity_material ?? false,
    degradation_material: opts.degradation_material ?? false,
    materiality_class: 'MEDIUM' as const,
  };
  const restriction = restrictionEng.derive(restrictionInput);
  return {
    subject_id: subject,
    classification_object_id: `cls:${subject}`,
    contradiction_bundle_id: `cb:${subject}`,
    confidence: r.decision,
    restriction,
    restriction_input: restrictionInput,
    material_state: {
      contradiction_count: opts.contradictionCount,
      contradiction_material: opts.contradictionCount > 0,
      staleness_material: opts.staleness_material ?? false,
      incompleteness_material: opts.incompleteness_material ?? false,
      ambiguity_material: opts.ambiguity_material ?? false,
      degradation_material: opts.degradation_material ?? false,
    },
    cap_triggers: opts.cap_triggers ?? [],
  };
}

{
  // Clean CONFIRMED+HIGH view — boost factor values so engine lands in HIGH band.
  const highFactorValues: Record<L7ConfidenceFactorGroup, number> = {
    [L7ConfidenceFactorGroup.SOURCE_TRUST]: 0.98,
    [L7ConfidenceFactorGroup.FRESHNESS]: 0.98,
    [L7ConfidenceFactorGroup.FEATURE_COMPLETENESS]: 0.95,
    [L7ConfidenceFactorGroup.CROSS_SOURCE_AGREEMENT]: 0.95,
    [L7ConfidenceFactorGroup.REGIME_COMPATIBILITY]: 0.9,
    [L7ConfidenceFactorGroup.HISTORICAL_RELIABILITY]: 0.9,
    [L7ConfidenceFactorGroup.CONTRADICTION_SEVERITY]: 0.0,
  };
  const cleanView = buildView({
    primary: L7PrimaryValidationClass.CONFIRMED,
    band: L7ReliabilityBand.HIGH,
    values: highFactorValues,
    contradictionSeverity: L7ContradictionSeverity.INFO,
    contradictionCount: 0,
  });
  // Force reliability band to engine-derived band so INV-7.6-B holds.
  const adjustedBand = cleanView.confidence.reliability_band;
  const cleanViewAdj = { ...cleanView, restriction_input: { ...cleanView.restriction_input, reliability_band: adjustedBand } };

  // Critical contradiction view (caps applied, low band).
  const critValues = defaultFactorValues();
  critValues[L7ConfidenceFactorGroup.CONTRADICTION_SEVERITY] = 0.7;
  const critView = buildView({
    primary: L7PrimaryValidationClass.CONFLICTING,
    band: L7ReliabilityBand.LOW,
    values: critValues,
    contradictionSeverity: L7ContradictionSeverity.SEVERE,
    contradictionCount: 3,
    cap_triggers: ['CRITICAL_CONTRADICTION_PRESENT'],
  });
  const critViewAdj = { ...critView, restriction_input: { ...critView.restriction_input, reliability_band: critView.confidence.reliability_band } };

  // Stale view.
  const staleView = buildView({
    primary: L7PrimaryValidationClass.STALE,
    band: L7ReliabilityBand.LOW,
    values: defaultFactorValues(),
    contradictionSeverity: L7ContradictionSeverity.INFO,
    contradictionCount: 0,
    staleness_material: true,
    cap_triggers: ['STALENESS_MATERIAL'],
    modifiers: [L7ValidationModifierCode.STALE_SUPPORT],
  });
  const staleViewAdj = { ...staleView, restriction_input: { ...staleView.restriction_input, reliability_band: staleView.confidence.reliability_band } };

  const views = [cleanViewAdj, critViewAdj, staleViewAdj];

  const A = checkInvariantA_confidenceIsSeparateObject(views);
  assert(A.satisfied, `INV-7.6-A satisfied (${A.evidence.join(' | ')})`);

  const B = checkInvariantB_completeStructure(views);
  assert(B.satisfied, `INV-7.6-B satisfied (${B.evidence.join(' | ')})`);

  const C = checkInvariantC_doesNotOutrunLaw(views);
  assert(C.satisfied, `INV-7.6-C satisfied (${C.evidence.join(' | ')})`);

  const D = checkInvariantD_localRegimeBounded(views);
  assert(D.satisfied, `INV-7.6-D satisfied (${D.evidence.join(' | ')})`);

  const E = checkInvariantE_restrictionExplicitlyBoundsRights(views);
  assert(E.satisfied, `INV-7.6-E satisfied (${E.evidence.join(' | ')})`);

  const F = checkInvariantF_noBroaderRights(views);
  assert(F.satisfied, `INV-7.6-F satisfied (${F.evidence.join(' | ')})`);

  const G = checkInvariantG_replayLineagePreserved(views);
  assert(G.satisfied, `INV-7.6-G satisfied (${G.evidence.join(' | ')})`);

  const all = runAllL7_6Invariants(views);
  assert(all.length === 7, 'runAllL7_6Invariants returns 7 results');
  assert(all.every(r => r.satisfied), 'all invariants pass on legal scenarios');
}

// Negative invariant: simulate INV-7.6-F violation by manually granting a forbidden right.
{
  const view = buildView({
    primary: L7PrimaryValidationClass.STALE,
    band: L7ReliabilityBand.LOW,
    values: defaultFactorValues(),
    contradictionSeverity: L7ContradictionSeverity.INFO,
    contradictionCount: 0,
    staleness_material: true,
    cap_triggers: ['STALENESS_MATERIAL'],
  });
  const tampered: L7_6ValidationResultView = {
    ...view,
    restriction_input: {
      ...view.restriction_input,
      reliability_band: view.confidence.reliability_band,
    },
    restriction: {
      ...view.restriction,
      rights: [...view.restriction.rights, L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED] as readonly L7ReliabilityRight[],
    },
  };
  const F = checkInvariantF_noBroaderRights([tampered]);
  assert(!F.satisfied, 'INV-7.6-F catches STALE + FINAL_JUDGMENT_ALLOWED');
}

// L7.6 rights map 1:1 into L7.2 runtime right values. The mapping may be
// identity for a few semantically-stable rights (e.g. EVIDENCE_ONLY); what
// matters is that every 7.6 right has a registered runtime counterpart.
{
  for (const r of ALL_L7_RELIABILITY_RIGHTS) {
    const rt = L7_RELIABILITY_RIGHT_TO_RUNTIME_RIGHT[r];
    assert(Object.values(L7RestrictionRight).includes(rt),
      `7.6 right ${r} maps to a registered runtime L7RestrictionRight`);
  }
}

// ── Summary ─────────────────────────────────────────────────────────────
const total = passed + failed;
console.log(`\n=== L7.6 Reliance-Governance Tests Summary ===`);
console.log(`Passed: ${passed}/${total}`);
if (failed > 0) {
  console.log(`Failed: ${failed}/${total}`);
  process.exitCode = 1;
} else {
  console.log('All L7.6 certification bands GREEN ✔');
}
