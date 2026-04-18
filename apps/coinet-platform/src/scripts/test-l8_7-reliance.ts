/**
 * L8.7 — Confidence, Transition Risk, Multipliers, and Reliance Governance
 * Certification Test Suite
 *
 * 5 Bands (§8.7.10.2):
 *   A — Confidence doctrine
 *   B — Transition risk
 *   C — Multiplier doctrine
 *   D — Cap chain and narrowing law
 *   E — Audit and invariants
 */

// ── Contracts (L8.7) ──
import {
  L8RegimeCapReason, ALL_L8_REGIME_CAP_REASONS,
  L8_CAP_REASON_PRECEDENCE, compareL8CapReasonPrecedence,
  dominantL8CapReason, deriveL8CapChainReadinessHint,
  L8RegimeCapChain,
} from '../l8/contracts/regime-cap-chain';
import {
  L8RegimeConfidenceFactorGroup,
  ALL_L8_REGIME_CONFIDENCE_FACTOR_GROUPS,
  L8_FACTOR_GROUP_TO_BREAKDOWN_KEY,
  L8_REGIME_CONFIDENCE_BAND_THRESHOLDS,
  resolveL8RegimeConfidenceBandFromScore,
  requiredL8RegimeCapReasons,
  L8_REGIME_CONFIDENCE_POLICY_VERSION,
} from '../l8/contracts/regime-confidence.policy';
import {
  L8RegimeInstabilityReasonCode,
  ALL_L8_REGIME_INSTABILITY_REASON_CODES,
  ALL_L8_REGIME_TRANSITION_RISK_CLASSES,
  resolveL8RegimeTransitionRiskClass,
  transitionRiskIsHigh,
  L8_REGIME_TRANSITION_RISK_POLICY_VERSION,
  L8RegimeTransitionRiskProfile,
} from '../l8/contracts/regime-transition-risk.policy';
import {
  L8RegimeMultiplierNarrowingReason,
  ALL_L8_REGIME_MULTIPLIER_NARROWING_REASONS,
  L8_REGIME_DEFAULT_MULTIPLIER_POSTURE,
  L8_REGIME_NEUTRAL_MULTIPLIER_POSTURE,
  resolveL8DefaultMultiplierPosture,
  multiplierIsUniformlyDirectional,
  multiplierProfileRespectsNarrowing,
  L8_REGIME_MULTIPLIER_POLICY_VERSION,
} from '../l8/contracts/regime-multiplier.policy';
import {
  L8RegimeRelianceReadinessClass,
  ALL_L8_REGIME_RELIANCE_READINESS_CLASSES,
  deriveL8RegimeRelianceReadinessClass,
  L8_REGIME_RELIANCE_CONTRACT_VERSION,
  L8_REGIME_RELIANCE_POLICY_VERSION,
  L8_RELIANCE_PROFILE_REQUIRED_FIELDS,
} from '../l8/contracts/regime-reliance-profile';
import { L8RegimeConfidenceBand, L8RegimeCoexistenceClass }
  from '../l8/contracts/regime-state';
import {
  L8MacroRegimeClass, L8CryptoStructureRegimeClass,
  L8TokenRegimeClass, L8EcosystemRegimeClass,
} from '../l8/contracts/regime-class';

// ── Validators ──
import {
  L8RegimeRelianceViolationCode,
  ALL_L8_REGIME_RELIANCE_VIOLATION_CODES,
} from '../l8/validation/l8-reliance-violation-codes';
import { validateRegimeCapChain, validateRegimeCapEntries }
  from '../l8/validation/regime-cap-chain.validator';
import { validateRegimeConfidencePolicy }
  from '../l8/validation/regime-confidence-policy.validator';
import { validateRegimeTransitionRisk }
  from '../l8/validation/regime-transition-risk.validator';
import {
  validateRegimeMultiplierPolicy,
  requiredMultiplierNarrowingReasons,
} from '../l8/validation/regime-multiplier-policy.validator';
import { validateRegimeRelianceProfile }
  from '../l8/validation/regime-reliance-profile.validator';

// ── Engine ──
import { computeL8TransitionRiskProfile }
  from '../l8/engine/regime-transition-risk-engine';

// ── Audit ──
import {
  resetL8RelianceAuditLog, emitL8RelianceAuditRecord,
  emitL8ConfidencePolicyViolation, emitL8TransitionRiskViolation,
  emitL8MultiplierPolicyViolation, emitL8CapChainViolation,
  emitL8RelianceProfileViolation, emitL8InvariantFailure,
  getL8RelianceAuditLog, getL8RelianceCriticalViolations,
  getL8RelianceViolationsByCode, getL8RelianceViolationsBySurface,
  hasAnyL8RelianceViolations, getL8RelianceViolationCount,
} from '../l8/constitution/l8-reliance-audit';

// ── Invariants ──
import {
  checkINV_87_A, checkINV_87_B, checkINV_87_C, checkINV_87_D,
  checkINV_87_E, checkINV_87_F, checkINV_87_G,
  runAllL8_7Invariants, buildGreenRelianceBundle,
} from '../l8/invariants/l8_7-invariants';

let passed = 0, failed = 0;
const failures: string[] = [];
function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.error(`  ✗ FAIL: ${label}`); }
}
function resetAll(): void { resetL8RelianceAuditLog(); }

// ═══════════════════════════════════════════════════════════════
// BAND A — Confidence doctrine
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Confidence doctrine ═══');
resetAll();

// A.01..A.04 — enum completeness
assert(ALL_L8_REGIME_CAP_REASONS.length === 7, 'A.01 7 cap reasons');
assert(ALL_L8_REGIME_CONFIDENCE_FACTOR_GROUPS.length === 7,
  'A.02 7 confidence factor groups');
assert(ALL_L8_REGIME_INSTABILITY_REASON_CODES.length === 9,
  'A.03 9 instability reason codes');
assert(ALL_L8_REGIME_MULTIPLIER_NARROWING_REASONS.length === 6,
  'A.04 6 multiplier narrowing reasons');
assert(ALL_L8_REGIME_TRANSITION_RISK_CLASSES.length === 4,
  'A.05 4 transition risk classes');
assert(ALL_L8_REGIME_RELIANCE_READINESS_CLASSES.length === 4,
  'A.06 4 reliance readiness classes');
assert(ALL_L8_REGIME_RELIANCE_VIOLATION_CODES.length >= 40,
  `A.07 ≥40 reliance violation codes (got ${ALL_L8_REGIME_RELIANCE_VIOLATION_CODES.length})`);

// A.08..A.14 — factor-group mapping completeness
for (const g of ALL_L8_REGIME_CONFIDENCE_FACTOR_GROUPS) {
  assert(!!L8_FACTOR_GROUP_TO_BREAKDOWN_KEY[g],
    `A.0x factor group ${g} has breakdown key`);
}
assert(L8_FACTOR_GROUP_TO_BREAKDOWN_KEY[
  L8RegimeConfidenceFactorGroup.BREADTH_CONSISTENCY] === 'support_breadth',
  'A.15 BREADTH → support_breadth');
assert(L8_FACTOR_GROUP_TO_BREAKDOWN_KEY[
  L8RegimeConfidenceFactorGroup.VALIDATION_CONFIDENCE]
    === 'validation_quality_posture',
  'A.16 VALIDATION → validation_quality_posture');

// A.17..A.22 — band resolution from score
assert(resolveL8RegimeConfidenceBandFromScore(0.1) === L8RegimeConfidenceBand.LOW,
  'A.17 low score → LOW');
assert(resolveL8RegimeConfidenceBandFromScore(0.4) === L8RegimeConfidenceBand.MODERATE,
  'A.18 mid score → MODERATE');
assert(resolveL8RegimeConfidenceBandFromScore(0.7) === L8RegimeConfidenceBand.HIGH,
  'A.19 high score → HIGH');
assert(resolveL8RegimeConfidenceBandFromScore(0.9) === L8RegimeConfidenceBand.FULL,
  'A.20 very high → FULL');
assert(resolveL8RegimeConfidenceBandFromScore(-0.1) === L8RegimeConfidenceBand.LOW,
  'A.21 negative score → LOW');
assert(resolveL8RegimeConfidenceBandFromScore(NaN) === L8RegimeConfidenceBand.LOW,
  'A.22 NaN score → LOW');

// A.23..A.27 — band threshold ranges are disjoint
for (const band of Object.keys(L8_REGIME_CONFIDENCE_BAND_THRESHOLDS) as
  L8RegimeConfidenceBand[]) {
  const [lo, hi] = L8_REGIME_CONFIDENCE_BAND_THRESHOLDS[band];
  assert(lo < hi, `A.xx band ${band} threshold ${lo}..${hi} valid`);
}

// A.28..A.34 — requiredL8RegimeCapReasons coverage
{
  const got = requiredL8RegimeCapReasons({
    transition_risk_score: 0.9, ambiguity_score: 0.9,
    staleness_score: 0.9, degradation_score: 0.9,
    restriction_narrowed: true, contradiction_unresolved: true,
    historical_reliability_weak: true,
  });
  for (const r of ALL_L8_REGIME_CAP_REASONS) {
    assert(got.includes(r), `A.xx every cap reason triggers: ${r}`);
  }
}

// A.35..A.38 — confidence policy validator on green bundle
{
  const b = buildGreenRelianceBundle();
  const res = validateRegimeConfidencePolicy({
    confidence: b.confidence,
    derivation_context: {
      transition_risk_score: 0.1, ambiguity_score: 0.1,
      staleness_score: 0.1, degradation_score: 0.1,
      restriction_narrowed: false, contradiction_unresolved: false,
      historical_reliability_weak: false,
    },
  });
  assert(res.ok, 'A.35 green confidence passes policy');
  assert(res.required_cap_reasons.length === 0,
    'A.36 green → no required caps');
}

// A.39 — missing factor group triggers CONFIDENCE_MISSING_FACTOR_GROUP
{
  const b = buildGreenRelianceBundle();
  const broken = {
    ...b.confidence,
    factor_breakdown: {
      ...b.confidence.factor_breakdown,
      historical_reliability: undefined as unknown as number,
    },
  };
  const res = validateRegimeConfidencePolicy({
    confidence: broken,
    derivation_context: {
      transition_risk_score: 0.1, ambiguity_score: 0.1,
      staleness_score: 0.1, degradation_score: 0.1,
      restriction_narrowed: false, contradiction_unresolved: false,
      historical_reliability_weak: false,
    },
  });
  assert(!res.ok, 'A.39a missing factor group fails');
  assert(res.violations.some(v =>
    v.code === L8RegimeRelianceViolationCode.CONFIDENCE_MISSING_FACTOR_GROUP),
    'A.39b CONFIDENCE_MISSING_FACTOR_GROUP emitted');
}

// A.40..A.42 — band mismatch, capped>raw, factor out-of-range
{
  const b = buildGreenRelianceBundle();
  const mis = { ...b.confidence,
    confidence_band: L8RegimeConfidenceBand.LOW }; // score 0.72 but band LOW
  const r = validateRegimeConfidencePolicy({
    confidence: mis,
    derivation_context: {
      transition_risk_score: 0.1, ambiguity_score: 0.1,
      staleness_score: 0.1, degradation_score: 0.1,
      restriction_narrowed: false, contradiction_unresolved: false,
      historical_reliability_weak: false,
    },
  });
  assert(!r.ok &&
    r.violations.some(v => v.code ===
      L8RegimeRelianceViolationCode.CONFIDENCE_SCORE_BAND_MISMATCH),
    'A.40 band mismatch detected');
}
{
  const b = buildGreenRelianceBundle();
  const above = { ...b.confidence,
    confidence_score_raw: 0.5, confidence_score_capped: 0.8 };
  const r = validateRegimeConfidencePolicy({
    confidence: above,
    derivation_context: {
      transition_risk_score: 0.1, ambiguity_score: 0.1,
      staleness_score: 0.1, degradation_score: 0.1,
      restriction_narrowed: false, contradiction_unresolved: false,
      historical_reliability_weak: false,
    },
  });
  assert(!r.ok &&
    r.violations.some(v => v.code ===
      L8RegimeRelianceViolationCode.CONFIDENCE_CAPPED_ABOVE_RAW),
    'A.41 capped > raw detected');
}
{
  const b = buildGreenRelianceBundle();
  const oor = { ...b.confidence,
    factor_breakdown: { ...b.confidence.factor_breakdown,
      support_breadth: 1.5 } };
  const r = validateRegimeConfidencePolicy({
    confidence: oor,
    derivation_context: {
      transition_risk_score: 0.1, ambiguity_score: 0.1,
      staleness_score: 0.1, degradation_score: 0.1,
      restriction_narrowed: false, contradiction_unresolved: false,
      historical_reliability_weak: false,
    },
  });
  assert(!r.ok &&
    r.violations.some(v => v.code ===
      L8RegimeRelianceViolationCode.CONFIDENCE_FACTOR_OUT_OF_RANGE),
    'A.42 factor OOR detected');
}

// A.43..A.46 — restriction / contradiction consumption requirements
{
  const b = buildGreenRelianceBundle();
  const r = validateRegimeConfidencePolicy({
    confidence: b.confidence,
    derivation_context: {
      transition_risk_score: 0.1, ambiguity_score: 0.1,
      staleness_score: 0.1, degradation_score: 0.1,
      restriction_narrowed: true, contradiction_unresolved: false,
      historical_reliability_weak: false,
    },
  });
  assert(!r.ok &&
    r.violations.some(v => v.code ===
      L8RegimeRelianceViolationCode.CONFIDENCE_RESTRICTION_NOT_CONSUMED),
    'A.43 restriction not consumed detected');
  assert(r.required_cap_reasons.includes(
    L8RegimeCapReason.CAP_RESTRICTION_NARROWED),
    'A.44 restriction → required cap');
}
{
  const b = buildGreenRelianceBundle();
  const r = validateRegimeConfidencePolicy({
    confidence: b.confidence,
    derivation_context: {
      transition_risk_score: 0.1, ambiguity_score: 0.1,
      staleness_score: 0.1, degradation_score: 0.1,
      restriction_narrowed: false, contradiction_unresolved: true,
      historical_reliability_weak: false,
    },
  });
  assert(!r.ok &&
    r.violations.some(v => v.code ===
      L8RegimeRelianceViolationCode.CONFIDENCE_CONTRADICTION_NOT_CONSUMED),
    'A.45 contradiction not consumed detected');
  assert(r.required_cap_reasons.includes(
    L8RegimeCapReason.CAP_CROSS_DOMAIN_CONTRADICTION),
    'A.46 contradiction → required cap');
}

// A.47..A.50 — clean-confidence masquerade detection
{
  const b = buildGreenRelianceBundle();
  const clean = { ...b.confidence,
    confidence_score_raw: 0.95, confidence_score_capped: 0.95,
    confidence_band: L8RegimeConfidenceBand.FULL };
  const r = validateRegimeConfidencePolicy({
    confidence: clean,
    derivation_context: {
      transition_risk_score: 0.9, ambiguity_score: 0.1,
      staleness_score: 0.1, degradation_score: 0.1,
      restriction_narrowed: false, contradiction_unresolved: false,
      historical_reliability_weak: false,
    },
  });
  assert(!r.ok, 'A.47 clean high-confidence with required caps fails');
  assert(r.violations.some(v =>
    v.code === L8RegimeRelianceViolationCode.CONFIDENCE_MASQUERADE_CLEAN ||
    v.code === L8RegimeRelianceViolationCode.CONFIDENCE_CAP_REQUIRED_BUT_MISSING),
    'A.48 masquerade or missing-cap emitted');
}
assert(L8_REGIME_CONFIDENCE_POLICY_VERSION === 'l8.7-confidence-policy-v1',
  'A.49 confidence policy version frozen');
{
  const b = buildGreenRelianceBundle();
  const exceed = { ...b.confidence,
    confidence_score_capped: 0.8,
    cap_chain: [{ cap_id: 'x', cap_reason: 'TRANSITION_HIGH' as const,
      max_after_cap: 0.5, applied: true }] };
  const r = validateRegimeConfidencePolicy({
    confidence: exceed,
    derivation_context: {
      transition_risk_score: 0.8, ambiguity_score: 0.1,
      staleness_score: 0.1, degradation_score: 0.1,
      restriction_narrowed: false, contradiction_unresolved: false,
      historical_reliability_weak: false,
    },
  });
  assert(!r.ok &&
    r.violations.some(v => v.code ===
      L8RegimeRelianceViolationCode.CONFIDENCE_CAPPED_EXCEEDS_MAX),
    'A.50 capped > tightest cap detected');
}

console.log(`  Band A: passed=${passed} failed=${failed}`);
let bandATotal = passed + failed; const bandAPassed = passed, bandAFailed = failed;

// ═══════════════════════════════════════════════════════════════
// BAND B — Transition risk
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Transition risk ═══');

// B.01..B.07 — class resolution
assert(resolveL8RegimeTransitionRiskClass(0.1) === 'LOW', 'B.01 low → LOW');
assert(resolveL8RegimeTransitionRiskClass(0.4) === 'MEDIUM', 'B.02 mid → MEDIUM');
assert(resolveL8RegimeTransitionRiskClass(0.8) === 'HIGH', 'B.03 high → HIGH');
assert(resolveL8RegimeTransitionRiskClass(NaN) === 'UNRESOLVED',
  'B.04 NaN → UNRESOLVED');
assert(resolveL8RegimeTransitionRiskClass(-1) === 'UNRESOLVED',
  'B.05 negative → UNRESOLVED');
assert(transitionRiskIsHigh('HIGH'), 'B.06 HIGH is high');
assert(!transitionRiskIsHigh('LOW'), 'B.07 LOW is not high');

// B.08..B.10 — green profile validates, policy version frozen
{
  const b = buildGreenRelianceBundle();
  const r = validateRegimeTransitionRisk({
    profile: b.transition,
    independence: {
      confidence_score_capped: 0.72,
      confidence_transition_instability_component: 0.15,
      ambiguity_score: 0.1,
    },
  });
  assert(r.ok, 'B.08 green transition profile passes');
}
assert(L8_REGIME_TRANSITION_RISK_POLICY_VERSION
  === 'l8.7-transition-policy-v1', 'B.09 transition policy version frozen');

// B.10..B.13 — score/class mismatch
{
  const b = buildGreenRelianceBundle();
  const mis: L8RegimeTransitionRiskProfile = {
    ...b.transition, transition_risk_score: 0.9,
    transition_risk_class: 'LOW' };
  const r = validateRegimeTransitionRisk({
    profile: mis,
    independence: {
      confidence_score_capped: 0.72,
      confidence_transition_instability_component: 0.15,
      ambiguity_score: 0.1,
    },
  });
  assert(!r.ok, 'B.10 class/score mismatch fails');
  assert(r.violations.some(v => v.code ===
    L8RegimeRelianceViolationCode.TRANSITION_CLASS_SCORE_MISMATCH),
    'B.11 TRANSITION_CLASS_SCORE_MISMATCH emitted');
}
{
  const b = buildGreenRelianceBundle();
  const oor: L8RegimeTransitionRiskProfile = {
    ...b.transition, transition_risk_score: 1.5,
    transition_risk_class: 'HIGH',
    instability_reason_codes: [
      L8RegimeInstabilityReasonCode.CANDIDATE_PROXIMITY],
    primary_secondary_flip_pressure: 0.6,
    family_transition_pressure: 0.5,
  };
  const r = validateRegimeTransitionRisk({
    profile: oor,
    independence: {
      confidence_score_capped: 0.7,
      confidence_transition_instability_component: 0.5,
      ambiguity_score: 0.3,
    },
  });
  assert(!r.ok &&
    r.violations.some(v => v.code ===
      L8RegimeRelianceViolationCode.TRANSITION_SCORE_OUT_OF_RANGE),
    'B.12 score out-of-range detected');
}

// B.14 — HIGH without reasons
{
  const b = buildGreenRelianceBundle();
  const nfr: L8RegimeTransitionRiskProfile = {
    ...b.transition, transition_risk_score: 0.8,
    transition_risk_class: 'HIGH',
    primary_secondary_flip_pressure: 0.7, family_transition_pressure: 0.5,
  };
  const r = validateRegimeTransitionRisk({
    profile: nfr,
    independence: {
      confidence_score_capped: 0.7,
      confidence_transition_instability_component: 0.5,
      ambiguity_score: 0.3,
    },
  });
  assert(!r.ok && r.violations.some(v => v.code ===
    L8RegimeRelianceViolationCode.TRANSITION_HIGH_WITHOUT_REASONS),
    'B.14 HIGH without reasons detected');
}

// B.15 — CLEAN_SINGLE with overlap
{
  const b = buildGreenRelianceBundle();
  const p: L8RegimeTransitionRiskProfile = { ...b.transition,
    transition_risk_score: 0.4, transition_risk_class: 'MEDIUM',
    primary_secondary_flip_pressure: 0.7,
    coexistence_class: L8RegimeCoexistenceClass.CLEAN_SINGLE };
  const r = validateRegimeTransitionRisk({
    profile: p,
    independence: {
      confidence_score_capped: 0.5,
      confidence_transition_instability_component: 0.4,
      ambiguity_score: 0.2,
    },
  });
  assert(!r.ok && r.violations.some(v => v.code ===
    L8RegimeRelianceViolationCode.TRANSITION_CLEAN_WITH_OVERLAP),
    'B.15 clean-single with overlap detected');
}

// B.16 — LOW while ambiguity unresolved
{
  const b = buildGreenRelianceBundle();
  const p: L8RegimeTransitionRiskProfile = { ...b.transition,
    transition_risk_score: 0.1, transition_risk_class: 'LOW' };
  const r = validateRegimeTransitionRisk({
    profile: p,
    independence: {
      confidence_score_capped: 0.6,
      confidence_transition_instability_component: 0.1,
      ambiguity_score: 0.8,
    },
  });
  assert(!r.ok && r.violations.some(v => v.code ===
    L8RegimeRelianceViolationCode.TRANSITION_LOW_WITH_AMBIGUITY_UNRESOLVED),
    'B.16 LOW with ambiguity unresolved detected');
}

// B.17..B.18 — flip-pressure coherence
{
  const b = buildGreenRelianceBundle();
  const p: L8RegimeTransitionRiskProfile = { ...b.transition,
    primary_secondary_flip_pressure: 1.2 };
  const r = validateRegimeTransitionRisk({
    profile: p,
    independence: {
      confidence_score_capped: 0.5,
      confidence_transition_instability_component: 0.15,
      ambiguity_score: 0.1,
    },
  });
  assert(!r.ok && r.violations.some(v => v.code ===
    L8RegimeRelianceViolationCode.TRANSITION_FLIP_PRESSURE_INCOHERENT),
    'B.17 flip pressure > 1 detected');
}
{
  const b = buildGreenRelianceBundle();
  const p: L8RegimeTransitionRiskProfile = { ...b.transition,
    transition_risk_score: 0.8, transition_risk_class: 'HIGH',
    primary_secondary_flip_pressure: 0.05, family_transition_pressure: 0.05,
    instability_reason_codes: [
      L8RegimeInstabilityReasonCode.CANDIDATE_PROXIMITY] };
  const r = validateRegimeTransitionRisk({
    profile: p,
    independence: {
      confidence_score_capped: 0.5,
      confidence_transition_instability_component: 0.5,
      ambiguity_score: 0.2,
    },
  });
  assert(!r.ok && r.violations.some(v => v.code ===
    L8RegimeRelianceViolationCode.TRANSITION_FLIP_PRESSURE_INCOHERENT),
    'B.18 HIGH with no pressure detected');
}

// B.19 — absorption into confidence
{
  const b = buildGreenRelianceBundle();
  const p: L8RegimeTransitionRiskProfile = { ...b.transition,
    transition_risk_score: 0.9, transition_risk_class: 'HIGH',
    primary_secondary_flip_pressure: 0.7, family_transition_pressure: 0.5,
    instability_reason_codes: [
      L8RegimeInstabilityReasonCode.CANDIDATE_PROXIMITY] };
  const r = validateRegimeTransitionRisk({
    profile: p,
    independence: {
      confidence_score_capped: 0.8,
      confidence_transition_instability_component: 0.05,
      ambiguity_score: 0.05,
    },
  });
  assert(!r.ok && r.violations.some(v => v.code ===
    L8RegimeRelianceViolationCode.TRANSITION_ABSORBED_INTO_CONFIDENCE),
    'B.19 transition absorbed into confidence detected');
}

// B.20..B.25 — transition risk engine
{
  const result = computeL8TransitionRiskProfile({
    regime_subject_id: 's.1', regime_result_id: 'r.1',
    candidates: [
      { regime_class: 'RISK_ON', candidate_strength_score: 0.6,
        evidence_refs: [] },
      { regime_class: 'RISK_OFF', candidate_strength_score: 0.55,
        evidence_refs: [] },
    ] as unknown as import('../l8/runtime/regime-execution-context').L8RegimeCandidate[],
    prior_primary_regime_class: 'RISK_OFF',
    fired_signature_refs: [
      'sig.transition.macro.risk_off_to_risk_on',
      'macro.family.transition.generic',
    ],
    ambiguity_score: 0.7, staleness_score: 0.1, degradation_score: 0.1,
    contradiction_unresolved: true, historical_instability_flag: false,
    compute_run_id: 'run.1', replay_hash: 'hash.1.aaaa',
    family_signature_prefix: 'macro.family.transition.',
  });
  assert(result.profile.transition_risk_class === 'HIGH',
    'B.20 engine yields HIGH on flip+close+ambiguity+contradiction');
  assert(result.profile.candidate_flip_refs.length >= 1,
    'B.21 engine emits candidate flip refs');
  assert(result.profile.instability_reason_codes.length >= 3,
    'B.22 engine produces multiple instability reasons');
  assert(result.profile.primary_secondary_flip_pressure >= 0.5,
    'B.23 flip pressure raised for narrow gap');
  assert(result.profile.family_transition_pressure > 0,
    'B.24 family transition pressure accumulated from prefix matches');
  assert(result.profile.coexistence_class
    === L8RegimeCoexistenceClass.TRANSITIONAL_OVERLAP,
    'B.25 coexistence set to TRANSITIONAL_OVERLAP on flip');
}

// B.26..B.28 — engine stable path
{
  const stable = computeL8TransitionRiskProfile({
    regime_subject_id: 's.2', regime_result_id: 'r.2',
    candidates: [
      { regime_class: 'RISK_ON', candidate_strength_score: 0.85,
        evidence_refs: [] },
      { regime_class: 'RISK_OFF', candidate_strength_score: 0.1,
        evidence_refs: [] },
    ] as unknown as import('../l8/runtime/regime-execution-context').L8RegimeCandidate[],
    prior_primary_regime_class: 'RISK_ON', fired_signature_refs: [],
    ambiguity_score: 0.05, staleness_score: 0.05, degradation_score: 0.05,
    contradiction_unresolved: false, historical_instability_flag: false,
    compute_run_id: 'run.2', replay_hash: 'hash.2.bbbb',
    family_signature_prefix: 'macro.family.transition.',
  });
  assert(stable.profile.transition_risk_class === 'LOW',
    'B.26 engine yields LOW on stable');
  assert(stable.profile.coexistence_class
    === L8RegimeCoexistenceClass.CLEAN_SINGLE, 'B.27 clean single');
  assert(stable.profile.instability_reason_codes.length === 0,
    'B.28 stable path has no instability reasons');
}

console.log(`  Band B cumulative: passed=${passed - bandAPassed} failed=${failed - bandAFailed}`);
const bandBStart = bandATotal;

// ═══════════════════════════════════════════════════════════════
// BAND C — Multiplier doctrine
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Multiplier doctrine ═══');

// C.01..C.04 — default-posture registry
assert(L8_REGIME_DEFAULT_MULTIPLIER_POSTURE[L8MacroRegimeClass.RISK_ON]
  !== undefined, 'C.01 RISK_ON default present');
assert(L8_REGIME_DEFAULT_MULTIPLIER_POSTURE[
  L8CryptoStructureRegimeClass.SPOT_LED_EXPANSION] !== undefined,
  'C.02 SPOT_LED_EXPANSION default present');
assert(L8_REGIME_DEFAULT_MULTIPLIER_POSTURE[
  L8CryptoStructureRegimeClass.THIN_LIQUIDITY_FRAGILITY] !== undefined,
  'C.03 THIN_LIQUIDITY default present');
assert(L8_REGIME_DEFAULT_MULTIPLIER_POSTURE[
  L8TokenRegimeClass.POST_UNLOCK_DIGESTION] !== undefined,
  'C.04 POST_UNLOCK_DIGESTION default present');

// C.05..C.11 — posture shape correctness per §8.7.5.5
{
  const spot = resolveL8DefaultMultiplierPosture(
    L8CryptoStructureRegimeClass.SPOT_LED_EXPANSION);
  assert(spot.momentum_trust_multiplier > 1.1,
    'C.05 SPOT_LED: momentum up');
  assert(spot.breakout_skepticism_multiplier < 1.0,
    'C.06 SPOT_LED: breakout skepticism down');
  const lev = resolveL8DefaultMultiplierPosture(
    L8CryptoStructureRegimeClass.LEVERAGE_LED_EXPANSION);
  assert(lev.breakout_skepticism_multiplier > 1.1,
    'C.07 LEVERAGE_LED: breakout skepticism up');
  assert(lev.leverage_risk_multiplier > 1.2,
    'C.08 LEVERAGE_LED: leverage risk up');
  const thin = resolveL8DefaultMultiplierPosture(
    L8CryptoStructureRegimeClass.THIN_LIQUIDITY_FRAGILITY);
  assert(thin.liquidity_fragility_multiplier > 1.3,
    'C.09 THIN_LIQUIDITY: fragility up');
  assert(thin.momentum_trust_multiplier < 1.0,
    'C.10 THIN_LIQUIDITY: momentum trust down');
  const unl = resolveL8DefaultMultiplierPosture(
    L8TokenRegimeClass.POST_UNLOCK_DIGESTION);
  assert(unl.risk_overhang_sensitivity_multiplier > 1.2,
    'C.11 POST_UNLOCK: overhang up');
}

// C.12..C.13 — neutral fallback
{
  const chop = resolveL8DefaultMultiplierPosture(L8MacroRegimeClass.CHOP);
  assert(chop !== undefined, 'C.12 CHOP has default');
  const neutral = resolveL8DefaultMultiplierPosture(
    L8EcosystemRegimeClass.DEFI_RERATING);
  assert(neutral === L8_REGIME_NEUTRAL_MULTIPLIER_POSTURE
    || (neutral.trend_amplification === 1.0),
    'C.13 no-default class falls back to neutral');
}

// C.14..C.19 — uniform directional and score-shape detectors
{
  const dirUp = {
    trend_amplification: 1.2, momentum_trust_multiplier: 1.3,
    breakout_skepticism_multiplier: 1.2, leverage_risk_multiplier: 1.15,
    liquidity_fragility_multiplier: 1.2, narrative_sensitivity_multiplier: 1.25,
    risk_overhang_sensitivity_multiplier: 1.2,
  };
  assert(multiplierIsUniformlyDirectional(dirUp),
    'C.14 all-up detected as uniform');
  const dirDown = {
    trend_amplification: 0.7, momentum_trust_multiplier: 0.8,
    breakout_skepticism_multiplier: 0.85, leverage_risk_multiplier: 0.8,
    liquidity_fragility_multiplier: 0.8, narrative_sensitivity_multiplier: 0.75,
    risk_overhang_sensitivity_multiplier: 0.8,
  };
  assert(multiplierIsUniformlyDirectional(dirDown),
    'C.15 all-down detected as uniform');
  const mixed = resolveL8DefaultMultiplierPosture(L8MacroRegimeClass.RISK_ON);
  assert(!multiplierIsUniformlyDirectional(mixed),
    'C.16 RISK_ON default not uniform');
  const oor = { ...dirUp, trend_amplification: 5.0 };
  assert(multiplierIsUniformlyDirectional(oor),
    'C.17 OOR counts as score-shaped/uniform');
}

// C.18..C.22 — multiplier policy validator on green bundle
{
  const b = buildGreenRelianceBundle();
  const r = validateRegimeMultiplierPolicy({
    multiplier: b.multiplier,
    derivation_context: {
      restriction_narrowed: false, contradiction_unresolved: false,
      transition_high: false, ambiguity_high: false,
      staleness_material: false, degradation_material: false,
    },
    declared_narrowing_reasons: [],
  });
  assert(r.ok, 'C.18 green multiplier passes');
}

// C.23..C.26 — score-shaped + action-biased + uniform + oor detection
{
  const b = buildGreenRelianceBundle();
  const shaped = { ...b.multiplier,
    dimensions: { ...b.multiplier.dimensions,
      trend_amplification: 2.5, momentum_trust_multiplier: 2.5,
      breakout_skepticism_multiplier: 2.5, leverage_risk_multiplier: 2.5,
      liquidity_fragility_multiplier: 2.5, narrative_sensitivity_multiplier: 2.5,
      risk_overhang_sensitivity_multiplier: 2.5 },
    description: 'Final score composite for RISK_ON' };
  const r = validateRegimeMultiplierPolicy({
    multiplier: shaped,
    derivation_context: {
      restriction_narrowed: false, contradiction_unresolved: false,
      transition_high: false, ambiguity_high: false,
      staleness_material: false, degradation_material: false,
    },
    declared_narrowing_reasons: [],
  });
  assert(!r.ok, 'C.23 score-shaped fails');
  assert(r.violations.some(v => v.code ===
    L8RegimeRelianceViolationCode.MULTIPLIER_SCORE_SHAPED),
    'C.24 MULTIPLIER_SCORE_SHAPED emitted');
  assert(r.violations.some(v => v.code ===
    L8RegimeRelianceViolationCode.MULTIPLIER_UNIFORMLY_DIRECTIONAL),
    'C.25 MULTIPLIER_UNIFORMLY_DIRECTIONAL emitted');
}
{
  const b = buildGreenRelianceBundle();
  const biased = { ...b.multiplier,
    description: 'buy RISK_ON aggressively; recommendation to add risk' };
  const r = validateRegimeMultiplierPolicy({
    multiplier: biased,
    derivation_context: {
      restriction_narrowed: false, contradiction_unresolved: false,
      transition_high: false, ambiguity_high: false,
      staleness_material: false, degradation_material: false,
    },
    declared_narrowing_reasons: [],
  });
  assert(!r.ok && r.violations.some(v => v.code ===
    L8RegimeRelianceViolationCode.MULTIPLIER_ACTION_BIASED),
    'C.26 action-biased description detected');
}

// C.27..C.30 — required narrowing reasons
{
  const got = requiredMultiplierNarrowingReasons({
    restriction_narrowed: true, contradiction_unresolved: true,
    transition_high: true, ambiguity_high: true,
    staleness_material: true, degradation_material: true,
  });
  for (const r of ALL_L8_REGIME_MULTIPLIER_NARROWING_REASONS) {
    assert(got.includes(r), `C.xx all narrowing reasons covered: ${r}`);
  }
}

// C.31..C.33 — missing narrowing reasons rejected
{
  const b = buildGreenRelianceBundle();
  const r = validateRegimeMultiplierPolicy({
    multiplier: b.multiplier,
    derivation_context: {
      restriction_narrowed: true, contradiction_unresolved: true,
      transition_high: true, ambiguity_high: false,
      staleness_material: false, degradation_material: false,
    },
    declared_narrowing_reasons: [],
  });
  assert(!r.ok &&
    r.violations.some(v => v.code ===
      L8RegimeRelianceViolationCode.MULTIPLIER_IGNORES_RESTRICTION),
    'C.31 IGNORES_RESTRICTION emitted');
  assert(r.violations.some(v => v.code ===
    L8RegimeRelianceViolationCode.MULTIPLIER_IGNORES_CONTRADICTION),
    'C.32 IGNORES_CONTRADICTION emitted');
  assert(r.violations.some(v => v.code ===
    L8RegimeRelianceViolationCode.MULTIPLIER_IGNORES_TRANSITION),
    'C.33 IGNORES_TRANSITION emitted');
}

// C.34..C.35 — narrowing respects rights-bound law
{
  const defaults = resolveL8DefaultMultiplierPosture(L8MacroRegimeClass.RISK_ON);
  const narrowed = {
    ...defaults, trend_amplification: 1.0, momentum_trust_multiplier: 1.0,
  };
  assert(multiplierProfileRespectsNarrowing(narrowed, defaults),
    'C.34 moving toward neutral is legal');
  const wider = {
    ...defaults, trend_amplification: 1.8, momentum_trust_multiplier: 1.8,
  };
  assert(!multiplierProfileRespectsNarrowing(wider, defaults),
    'C.35 widening beyond default is illegal');
}

// C.36 — missing dimension detection (runtime shape drift)
{
  const b = buildGreenRelianceBundle();
  const dim = { ...b.multiplier.dimensions,
    trend_amplification: NaN } as unknown as typeof b.multiplier.dimensions;
  const broken = { ...b.multiplier, dimensions: dim };
  const r = validateRegimeMultiplierPolicy({
    multiplier: broken,
    derivation_context: {
      restriction_narrowed: false, contradiction_unresolved: false,
      transition_high: false, ambiguity_high: false,
      staleness_material: false, degradation_material: false,
    },
    declared_narrowing_reasons: [],
  });
  assert(!r.ok &&
    r.violations.some(v => v.code ===
      L8RegimeRelianceViolationCode.MULTIPLIER_DIMENSION_OUT_OF_RANGE),
    'C.36 NaN dimension detected');
}

// C.37 — policy version frozen
assert(L8_REGIME_MULTIPLIER_POLICY_VERSION
  === 'l8.7-multiplier-policy-v1', 'C.37 multiplier policy version frozen');

// ═══════════════════════════════════════════════════════════════
// BAND D — Cap chain and narrowing law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Cap chain and narrowing law ═══');

// D.01..D.07 — precedence ordering monotonicity
{
  const entries = ALL_L8_REGIME_CAP_REASONS;
  for (let i = 0; i < entries.length - 1; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const pi = L8_CAP_REASON_PRECEDENCE[entries[i]];
      const pj = L8_CAP_REASON_PRECEDENCE[entries[j]];
      assert(pi !== pj,
        `D.xx precedence unique: ${entries[i]} vs ${entries[j]}`);
    }
  }
}
// contradictions dominate everything
assert(
  L8_CAP_REASON_PRECEDENCE[L8RegimeCapReason.CAP_CROSS_DOMAIN_CONTRADICTION]
  < L8_CAP_REASON_PRECEDENCE[L8RegimeCapReason.CAP_TRANSITION_HIGH],
  'D.xx cross-domain contradiction precedes transition');
assert(
  L8_CAP_REASON_PRECEDENCE[L8RegimeCapReason.CAP_DEGRADATION_MATERIAL]
  < L8_CAP_REASON_PRECEDENCE[L8RegimeCapReason.CAP_TRANSITION_HIGH],
  'D.xx degradation precedes transition');

// D.08..D.09 — comparator contract
assert(compareL8CapReasonPrecedence(
  L8RegimeCapReason.CAP_TRANSITION_HIGH,
  L8RegimeCapReason.CAP_FRESHNESS_WEAK) < 0,
  'D.08 comparator: transition < freshness');
assert(compareL8CapReasonPrecedence(
  L8RegimeCapReason.CAP_FRESHNESS_WEAK,
  L8RegimeCapReason.CAP_TRANSITION_HIGH) > 0,
  'D.09 comparator: freshness > transition');

// D.10..D.12 — dominant computation
{
  const caps = [
    { cap_id: 'a', cap_reason: L8RegimeCapReason.CAP_FRESHNESS_WEAK,
      max_after_cap: 0.6, applied: true },
    { cap_id: 'b', cap_reason: L8RegimeCapReason.CAP_CROSS_DOMAIN_CONTRADICTION,
      max_after_cap: 0.3, applied: true },
  ];
  assert(dominantL8CapReason(caps)
    === L8RegimeCapReason.CAP_CROSS_DOMAIN_CONTRADICTION,
    'D.10 dominant picks highest-precedence applied cap');
  assert(dominantL8CapReason([]) === null, 'D.11 empty → null');
  assert(dominantL8CapReason([{ ...caps[0], applied: false }]) === null,
    'D.12 no applied → null');
}

// D.13..D.16 — readiness-hint derivation
assert(deriveL8CapChainReadinessHint(0.7, 0.7, []) === 'CLEAN',
  'D.13 no caps → CLEAN');
assert(deriveL8CapChainReadinessHint(0.9, 0.4,
  [{ cap_id: 'x', cap_reason:
    L8RegimeCapReason.CAP_CROSS_DOMAIN_CONTRADICTION,
    max_after_cap: 0.4, applied: true }]) === 'DEGRADED',
  'D.14 critical cap → DEGRADED');
assert(deriveL8CapChainReadinessHint(0.9, 0.6,
  [{ cap_id: 'x', cap_reason: L8RegimeCapReason.CAP_TRANSITION_HIGH,
    max_after_cap: 0.6, applied: true }]) === 'MODIFIER_REQUIRED',
  'D.15 moderate cap with capped>=0.55 → MODIFIER_REQUIRED');
assert(deriveL8CapChainReadinessHint(0.9, 0.05,
  [{ cap_id: 'x', cap_reason: L8RegimeCapReason.CAP_DEGRADATION_MATERIAL,
    max_after_cap: 0.05, applied: true }]) === 'BLOCKED',
  'D.16 near-zero capped → BLOCKED');

// D.17..D.22 — cap-chain validator
{
  const c: L8RegimeCapChain = {
    pre_cap_score: 0.9, capped_score: 0.5,
    dominant_cap_reason: L8RegimeCapReason.CAP_TRANSITION_HIGH,
    applied_caps: [{ cap_id: 'x',
      cap_reason: L8RegimeCapReason.CAP_TRANSITION_HIGH,
      max_after_cap: 0.5, applied: true }],
    required_cap_reasons: [L8RegimeCapReason.CAP_TRANSITION_HIGH],
    readiness_hint: 'CAPPED',
  };
  const r = validateRegimeCapChain({ cap_chain: c,
    required_cap_reasons: c.required_cap_reasons });
  assert(r.ok, 'D.17 clean cap chain passes');
}
{
  const bad: L8RegimeCapChain = {
    pre_cap_score: 0.9, capped_score: 0.95,
    dominant_cap_reason: null, applied_caps: [],
    required_cap_reasons: [], readiness_hint: 'CLEAN' };
  const r = validateRegimeCapChain({ cap_chain: bad,
    required_cap_reasons: [] });
  assert(!r.ok && r.violations.some(v => v.code ===
    L8RegimeRelianceViolationCode.CAP_CHAIN_CAPPED_ABOVE_PRE_CAP),
    'D.18 capped > pre_cap detected');
}
{
  const bad: L8RegimeCapChain = {
    pre_cap_score: 0.9, capped_score: 0.4,
    dominant_cap_reason: L8RegimeCapReason.CAP_TRANSITION_HIGH,
    applied_caps: [
      { cap_id: 'a', cap_reason:
        L8RegimeCapReason.CAP_CROSS_DOMAIN_CONTRADICTION,
        max_after_cap: 0.4, applied: true },
      { cap_id: 'b', cap_reason: L8RegimeCapReason.CAP_TRANSITION_HIGH,
        max_after_cap: 0.7, applied: true },
    ],
    required_cap_reasons: [], readiness_hint: 'DEGRADED' };
  const r = validateRegimeCapChain({ cap_chain: bad,
    required_cap_reasons: [] });
  assert(!r.ok && r.violations.some(v => v.code ===
    L8RegimeRelianceViolationCode.CAP_CHAIN_DOMINANT_WRONG_PRECEDENCE),
    'D.19 wrong dominant detected');
}
{
  const bad: L8RegimeCapChain = {
    pre_cap_score: 0.9, capped_score: 0.8,
    dominant_cap_reason: L8RegimeCapReason.CAP_TRANSITION_HIGH,
    applied_caps: [{ cap_id: 'a',
      cap_reason: L8RegimeCapReason.CAP_TRANSITION_HIGH,
      max_after_cap: 0.8, applied: true }],
    required_cap_reasons: [],
    readiness_hint: 'CLEAN' };
  const r = validateRegimeCapChain({ cap_chain: bad,
    required_cap_reasons: [] });
  assert(!r.ok && r.violations.some(v => v.code ===
    L8RegimeRelianceViolationCode.CAP_CHAIN_READINESS_HINT_WRONG),
    'D.20 readiness-hint mismatch detected');
}
{
  const bad: L8RegimeCapChain = {
    pre_cap_score: 0.9, capped_score: 0.5,
    dominant_cap_reason: L8RegimeCapReason.CAP_TRANSITION_HIGH,
    applied_caps: [{ cap_id: 'a',
      cap_reason: L8RegimeCapReason.CAP_TRANSITION_HIGH,
      max_after_cap: 0.5, applied: true }],
    required_cap_reasons: [L8RegimeCapReason.CAP_CROSS_DOMAIN_CONTRADICTION],
    readiness_hint: 'CAPPED' };
  const r = validateRegimeCapChain({ cap_chain: bad,
    required_cap_reasons:
      [L8RegimeCapReason.CAP_CROSS_DOMAIN_CONTRADICTION] });
  assert(!r.ok && r.violations.some(v => v.code ===
    L8RegimeRelianceViolationCode.CAP_CHAIN_REQUIRED_CAP_MISSING),
    'D.21 required cap missing detected');
}
{
  const bad: L8RegimeCapChain = {
    pre_cap_score: 0.9, capped_score: 0.5,
    dominant_cap_reason: L8RegimeCapReason.CAP_TRANSITION_HIGH,
    applied_caps: [
      { cap_id: 'a', cap_reason: L8RegimeCapReason.CAP_TRANSITION_HIGH,
        max_after_cap: 0.5, applied: true },
      { cap_id: 'b', cap_reason: L8RegimeCapReason.CAP_TRANSITION_HIGH,
        max_after_cap: 0.7, applied: true },
    ],
    required_cap_reasons: [], readiness_hint: 'CAPPED' };
  const r = validateRegimeCapChain({ cap_chain: bad,
    required_cap_reasons: [] });
  assert(!r.ok && r.violations.some(v => v.code ===
    L8RegimeRelianceViolationCode.CAP_CHAIN_DUPLICATE_REASON),
    'D.22 duplicate reason detected');
}

// D.23 — cap value incoherence (capped > tightest)
{
  const bad: L8RegimeCapChain = {
    pre_cap_score: 0.9, capped_score: 0.8,
    dominant_cap_reason: L8RegimeCapReason.CAP_TRANSITION_HIGH,
    applied_caps: [{ cap_id: 'a',
      cap_reason: L8RegimeCapReason.CAP_TRANSITION_HIGH,
      max_after_cap: 0.5, applied: true }],
    required_cap_reasons: [], readiness_hint: 'MODIFIER_REQUIRED' };
  const r = validateRegimeCapChain({ cap_chain: bad,
    required_cap_reasons: [] });
  assert(!r.ok && r.violations.some(v => v.code ===
    L8RegimeRelianceViolationCode.CAP_CHAIN_CAP_VALUE_INCOHERENT),
    'D.23 capped > tightest cap detected');
}

// D.24..D.28 — reliance-profile validator (narrowing law)
{
  const b = buildGreenRelianceBundle();
  const r = validateRegimeRelianceProfile({ reliance: b.reliance });
  assert(r.ok, 'D.24 green reliance profile passes');
}
{
  const b = buildGreenRelianceBundle();
  const offender = { ...b.reliance,
    readiness_class: L8RegimeRelianceReadinessClass.BLOCKED,
    cap_chain: { ...b.reliance.cap_chain, readiness_hint: 'CLEAN' as const } };
  const r = validateRegimeRelianceProfile({ reliance: offender });
  assert(!r.ok &&
    r.violations.some(v => v.code ===
      L8RegimeRelianceViolationCode.RELIANCE_BLOCKED_WITH_CLEAN_HINT ||
      v.code === L8RegimeRelianceViolationCode.RELIANCE_READINESS_INCOHERENT),
    'D.25 BLOCKED with CLEAN hint detected');
}
{
  const b = buildGreenRelianceBundle();
  const offender = { ...b.reliance,
    transition_risk_class: 'HIGH' as const,
    readiness_class: L8RegimeRelianceReadinessClass.STRONG };
  const r = validateRegimeRelianceProfile({ reliance: offender });
  assert(!r.ok && r.violations.some(v => v.code ===
    L8RegimeRelianceViolationCode.RELIANCE_RISK_CLASS_MISMATCH ||
    v.code === L8RegimeRelianceViolationCode.RELIANCE_READINESS_INCOHERENT),
    'D.26 STRONG readiness with HIGH transition detected');
}
{
  const b = buildGreenRelianceBundle();
  const offender = { ...b.reliance, confidence_assessment_id: '' };
  const r = validateRegimeRelianceProfile({ reliance: offender });
  assert(!r.ok && r.violations.some(v => v.code ===
    L8RegimeRelianceViolationCode.RELIANCE_MISSING_CONFIDENCE_REF),
    'D.27 missing confidence ref detected');
}
{
  const b = buildGreenRelianceBundle();
  const offender = { ...b.reliance,
    confidence_assessment_id: 'X', transition_profile_id: 'X',
    multiplier_profile_id: 'X' };
  const r = validateRegimeRelianceProfile({ reliance: offender });
  assert(!r.ok && r.violations.some(v => v.code ===
    L8RegimeRelianceViolationCode.RELIANCE_SURFACES_COLLAPSED),
    'D.28 collapsed refs detected');
}

// D.29..D.31 — readiness derivation
assert(deriveL8RegimeRelianceReadinessClass(
  L8RegimeConfidenceBand.HIGH, 'LOW',
  { pre_cap_score: 0.7, capped_score: 0.7, dominant_cap_reason: null,
    applied_caps: [], required_cap_reasons: [], readiness_hint: 'CLEAN' })
  === L8RegimeRelianceReadinessClass.STRONG,
  'D.29 HIGH + LOW + CLEAN → STRONG');
assert(deriveL8RegimeRelianceReadinessClass(
  L8RegimeConfidenceBand.MODERATE, 'MEDIUM',
  { pre_cap_score: 0.4, capped_score: 0.4, dominant_cap_reason: null,
    applied_caps: [], required_cap_reasons: [],
    readiness_hint: 'MODIFIER_REQUIRED' })
  === L8RegimeRelianceReadinessClass.NARROWED,
  'D.30 MODERATE + MEDIUM + MODIFIER → NARROWED');
assert(deriveL8RegimeRelianceReadinessClass(
  L8RegimeConfidenceBand.HIGH, 'HIGH',
  { pre_cap_score: 0.6, capped_score: 0.4,
    dominant_cap_reason: L8RegimeCapReason.CAP_DEGRADATION_MATERIAL,
    applied_caps: [{ cap_id: 'x', cap_reason:
      L8RegimeCapReason.CAP_DEGRADATION_MATERIAL,
      max_after_cap: 0.4, applied: true }],
    required_cap_reasons: [], readiness_hint: 'DEGRADED' })
  === L8RegimeRelianceReadinessClass.DEGRADED,
  'D.31 DEGRADED hint → DEGRADED readiness');

// D.32 — validate cap entries helper
{
  const r = validateRegimeCapEntries([
    { cap_id: 'x', cap_reason: L8RegimeCapReason.CAP_TRANSITION_HIGH,
      max_after_cap: 1.2, applied: true },
  ]);
  assert(!r.ok && r.violations.some(v => v.code ===
    L8RegimeRelianceViolationCode.CAP_CHAIN_CAP_VALUE_INCOHERENT),
    'D.32 cap entry max > 1 detected');
}

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit and invariants
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Audit and invariants ═══');
resetL8RelianceAuditLog();

// E.01..E.05 — reliance audit emitters
const a1 = emitL8RelianceAuditRecord({
  surface: 'CONFIDENCE',
  violationCode: L8RegimeRelianceViolationCode.CONFIDENCE_MASQUERADE_CLEAN,
  source: 'test.E.01',
  subjectRef: 's.1', regimeResultId: 'r.1', detail: 'manual emit',
  context: {}, severity: 'CRITICAL',
});
assert(a1.surface === 'CONFIDENCE' && a1.severity === 'CRITICAL',
  'E.01 generic emit persists');
emitL8ConfidencePolicyViolation('test.E.02',
  L8RegimeRelianceViolationCode.CONFIDENCE_CAP_REQUIRED_BUT_MISSING,
  's.1', 'r.1', 'missing cap');
emitL8TransitionRiskViolation('test.E.03',
  L8RegimeRelianceViolationCode.TRANSITION_CLASS_SCORE_MISMATCH,
  's.1', 'r.1', 'class mismatch');
emitL8MultiplierPolicyViolation('test.E.04',
  L8RegimeRelianceViolationCode.MULTIPLIER_SCORE_SHAPED,
  's.1', 'r.1', 'score shaped');
emitL8CapChainViolation('test.E.05',
  L8RegimeRelianceViolationCode.CAP_CHAIN_DOMINANT_WRONG_PRECEDENCE,
  's.1', 'r.1', 'wrong dom');
emitL8RelianceProfileViolation('test.E.06',
  L8RegimeRelianceViolationCode.RELIANCE_READINESS_INCOHERENT,
  's.1', 'r.1', 'incoherent');
emitL8InvariantFailure('test.E.07',
  'INV-8.7-Z', 'synthetic failure', { extra: true });
assert(getL8RelianceViolationCount() === 7,
  `E.02 count=7 (got ${getL8RelianceViolationCount()})`);
assert(hasAnyL8RelianceViolations(), 'E.03 hasAny=true');
assert(getL8RelianceCriticalViolations().length >= 2,
  'E.04 ≥2 critical (CONFIDENCE + RELIANCE_PROFILE + INVARIANT)');
assert(getL8RelianceViolationsByCode(
  L8RegimeRelianceViolationCode.CONFIDENCE_MASQUERADE_CLEAN).length === 1,
  'E.05 lookup by code');
assert(getL8RelianceViolationsBySurface('INVARIANT').length === 1,
  'E.06 lookup by surface');

// E.07 — log reset
resetL8RelianceAuditLog();
assert(getL8RelianceViolationCount() === 0, 'E.07 reset works');
assert(getL8RelianceAuditLog().length === 0, 'E.08 log empty');

// E.09..E.22 — Invariants INV-8.7-A..G individually + aggregate
const invA = checkINV_87_A();
assert(invA.holds, `E.09 ${invA.id} holds: ${invA.evidence}`);
const invB = checkINV_87_B();
assert(invB.holds, `E.10 ${invB.id} holds: ${invB.evidence}`);
const invC = checkINV_87_C();
assert(invC.holds, `E.11 ${invC.id} holds: ${invC.evidence}`);
const invD = checkINV_87_D();
assert(invD.holds, `E.12 ${invD.id} holds: ${invD.evidence}`);
const invE = checkINV_87_E();
assert(invE.holds, `E.13 ${invE.id} holds: ${invE.evidence}`);
const invF = checkINV_87_F();
assert(invF.holds, `E.14 ${invF.id} holds: ${invF.evidence}`);
const invG = checkINV_87_G();
assert(invG.holds, `E.15 ${invG.id} holds: ${invG.evidence}`);
const all = runAllL8_7Invariants();
assert(all.length === 7, `E.16 7 invariants (got ${all.length})`);
assert(all.every(i => i.holds),
  `E.17 all invariants hold: ${all.filter(i => !i.holds).map(i => i.id).join(', ')}`);

// E.18..E.22 — reliance contract + versioning frozen
assert(L8_REGIME_RELIANCE_CONTRACT_VERSION === 'v1.0.0',
  'E.18 reliance contract version frozen');
assert(L8_REGIME_RELIANCE_POLICY_VERSION === 'l8.7-reliance-policy-v1',
  'E.19 reliance policy version frozen');
assert(L8_RELIANCE_PROFILE_REQUIRED_FIELDS.length >= 18,
  `E.20 ≥18 required fields (got ${L8_RELIANCE_PROFILE_REQUIRED_FIELDS.length})`);
assert(L8_RELIANCE_PROFILE_REQUIRED_FIELDS
  .includes('confidence_assessment_id'),
  'E.21 required fields include confidence_assessment_id');
assert(L8_RELIANCE_PROFILE_REQUIRED_FIELDS.includes('cap_chain'),
  'E.22 required fields include cap_chain');

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ Summary ═══');
console.log(`passed=${passed} failed=${failed}`);
if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
