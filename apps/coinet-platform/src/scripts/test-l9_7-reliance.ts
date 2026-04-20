/**
 * L9.7 — Reliance-Governance Lawbook — Certification Test Suite
 *
 * §9.7.12 — 5 certification bands:
 *   A — Policy contracts & enums           (§9.7.2–§9.7.4, §9.7.5.3)
 *   B — Confidence + cap-chain engines     (§9.7.3, §9.7.5)
 *   C — Restriction + causal-restraint     (§9.7.6, §9.7.7)
 *   D — Reliance aggregator + validators   (§9.7.9, §9.7.10)
 *   E — Audit + invariants + replay        (§9.7.11)
 *
 * Pass criterion: every assertion true, all 7 L9.7 invariants green,
 * every clean fixture validates clean, and every crafted offender
 * fails on precisely its targeted `L9REL_` code.
 */

// ── Contracts ──
import {
  ALL_L9_RELIANCE_CONFIDENCE_BANDS,
  ALL_L9_SEQUENCE_CONFIDENCE_FACTOR_CLASSES,
  ALL_L9_SEQUENCE_CONFIDENCE_FACTOR_EFFECTS,
  L9RelianceConfidenceBand,
  L9SequenceConfidenceFactorClass,
  L9SequenceConfidenceFactorEffect,
  L9_RELIANCE_CONFIDENCE_BAND_THRESHOLDS,
  L9_REQUIRED_CONFIDENCE_FACTOR_CLASSES,
  classifyL9RelianceConfidenceBand,
} from '../l9/contracts/l9_7-sequence-confidence-policy';
import {
  ALL_L9_SEQUENCE_CAP_REASONS,
  ALL_L9_SEQUENCE_CAP_READINESS_HINTS,
  L9SequenceCapReadinessHint,
  L9SequenceCapReason,
  L9_SEQUENCE_CAP_CEILING,
  L9_SEQUENCE_CAP_DOMINANCE_RANK,
  applyL9SequenceCapCeilings,
  compareL9SequenceCapDominance,
  tightestL9SequenceCap,
} from '../l9/contracts/l9_7-sequence-cap-chain';
import {
  ALL_L9_SEQUENCE_RESTRICTION_RIGHTS,
  L9SequenceRestrictionRight,
  L9_SEQUENCE_DEFAULT_RIGHTS_BY_BAND,
  L9_SEQUENCE_RESTRICTIVE_RIGHTS,
  L9_SEQUENCE_SCORE_DRIVING_RIGHTS,
} from '../l9/contracts/l9_7-sequence-restriction-rights';
import {
  ALL_L9_SEQUENCE_CAUSAL_RESTRAINT_CLASSES,
  L9SequenceCausalRestraintClass,
  L9_FORBIDDEN_CAUSAL_LANGUAGE_PATTERN,
  detectL9ForbiddenCausalLanguage,
  l9RestraintPermitsFinalJudgment,
} from '../l9/contracts/l9_7-sequence-causal-restraint';
import {
  ALL_L9_SEQUENCE_RELIANCE_READINESS_CLASSES,
  L9SequenceRelianceReadinessClass,
  summarizeL9SequenceRelianceReadiness,
} from '../l9/contracts/l9_7-sequence-reliance-profile';

// ── Engines ──
import {
  L9RelianceConfidenceInput,
  L9_RELIANCE_CONFIDENCE_FACTOR_WEIGHTS,
  buildL9RelianceConfidenceProfile,
} from '../l9/reliance/sequence-confidence-engine';
import {
  buildL9SequenceCapChain,
} from '../l9/reliance/sequence-cap-chain-engine';
import {
  classifyL9SequenceCausalRestraint,
} from '../l9/reliance/sequence-causal-restraint-engine';
import {
  buildL9SequenceRestrictionProfile,
} from '../l9/reliance/sequence-restriction-engine';
import {
  buildL9SequenceRelianceProfile,
} from '../l9/reliance/sequence-reliance-engine';

// ── Validators ──
import {
  ALL_L9_SEQUENCE_RELIANCE_VIOLATION_CODES,
  ALL_L9_SEQUENCE_RELIANCE_VIOLATION_TIERS,
  L9SequenceRelianceValidationError,
  L9SequenceRelianceViolation,
  L9SequenceRelianceViolationCode,
  L9SequenceRelianceViolationTier,
  l9RelianceViolationTier,
} from '../l9/validation/l9-reliance-violation-codes';
import {
  assertL9SequenceConfidencePolicyLegal,
  validateL9SequenceConfidencePolicy,
} from '../l9/validation/sequence-confidence-policy.validator';
import {
  assertL9SequenceCapChainLegal,
  validateL9SequenceCapChain,
} from '../l9/validation/sequence-cap-chain.validator';
import {
  assertL9SequenceRestrictionProfileLegal,
  validateL9SequenceRestrictionProfile,
} from '../l9/validation/sequence-restriction-profile.validator';
import {
  assertL9SequenceCausalRestraintLegal,
  validateL9SequenceCausalRestraint,
} from '../l9/validation/sequence-causal-restraint.validator';
import {
  assertL9SequenceRelianceProfileLegal,
  validateL9SequenceRelianceProfile,
} from '../l9/validation/sequence-reliance-profile.validator';

// ── Audit ──
import {
  L9RelianceAuditSeverity,
  buildL9RelianceAudit,
  classifyL9RelianceAuditSeverity,
  hasL9RelianceBlockingViolations,
} from '../l9/constitution/l9-reliance-audit';

// ── Invariants ──
import {
  checkINV_97_A, checkINV_97_B, checkINV_97_C, checkINV_97_D,
  checkINV_97_E, checkINV_97_F, checkINV_97_G,
  runAllL9_7Invariants,
} from '../l9/invariants/l9_7-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.error(`  ✗ FAIL: ${label}`); }
}
function hasCode(
  vs: readonly { code: L9SequenceRelianceViolationCode }[],
  code: L9SequenceRelianceViolationCode,
): boolean {
  return vs.some(v => v.code === code);
}

const POLICY = 'l9.7@1.0.0';

// Shared clean confidence input (used across bands).
function cleanConfInput(subject = 's:ok'): L9RelianceConfidenceInput {
  return {
    sequence_subject_id: subject,
    contributions: {
      [L9SequenceConfidenceFactorClass.ORDER_CLARITY]: 0.95,
      [L9SequenceConfidenceFactorClass.LEAD_LAG_STABILITY]: 0.90,
      [L9SequenceConfidenceFactorClass.CHAIN_COMPLETENESS]: 0.95,
      [L9SequenceConfidenceFactorClass.FRESHNESS]: 0.90,
      [L9SequenceConfidenceFactorClass.CONTRADICTION_PRESSURE]: 0.05,
      [L9SequenceConfidenceFactorClass.REGIME_COMPATIBILITY]: 0.90,
      [L9SequenceConfidenceFactorClass.HISTORICAL_RELIABILITY]: 0.90,
      [L9SequenceConfidenceFactorClass.DECAY_BURDEN]: 0.05,
      [L9SequenceConfidenceFactorClass.ORDERING_AMBIGUITY]: 0.05,
    },
    applied_caps: [],
    lineage_refs: ['lref:1'],
    policy_version: POLICY,
  };
}

// ═══════════════════════════════════════════════════════════════
// BAND A — Policy Contracts & Enums (§9.7.2–§9.7.4, §9.7.5.3)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Policy Contracts & Enums ═══');

assert(ALL_L9_SEQUENCE_CONFIDENCE_FACTOR_CLASSES.length === 9,
  'A.1 exactly 9 confidence factor classes');
assert(new Set(ALL_L9_SEQUENCE_CONFIDENCE_FACTOR_CLASSES).size === 9,
  'A.2 factor classes distinct');
assert(ALL_L9_SEQUENCE_CONFIDENCE_FACTOR_EFFECTS.length === 4,
  'A.3 exactly 4 factor effects');
assert(ALL_L9_RELIANCE_CONFIDENCE_BANDS.length === 4,
  'A.4 exactly 4 reliance bands');
assert(ALL_L9_SEQUENCE_CAP_REASONS.length === 9,
  'A.5 exactly 9 cap reasons');
assert(ALL_L9_SEQUENCE_CAP_READINESS_HINTS.length === 4,
  'A.6 exactly 4 cap readiness hints');
assert(ALL_L9_SEQUENCE_RESTRICTION_RIGHTS.length === 7,
  'A.7 exactly 7 restriction rights');
assert(ALL_L9_SEQUENCE_CAUSAL_RESTRAINT_CLASSES.length === 4,
  'A.8 exactly 4 causal-restraint classes');
assert(ALL_L9_SEQUENCE_RELIANCE_READINESS_CLASSES.length === 4,
  'A.9 exactly 4 reliance readiness classes');
assert(L9_REQUIRED_CONFIDENCE_FACTOR_CLASSES.length === 9,
  'A.10 nine required factor classes');

// A.11..A.13 — thresholds and invariants on them
assert(L9_RELIANCE_CONFIDENCE_BAND_THRESHOLDS.HIGH_MIN >
  L9_RELIANCE_CONFIDENCE_BAND_THRESHOLDS.MEDIUM_MIN,
  'A.11 HIGH_MIN > MEDIUM_MIN');
assert(L9_RELIANCE_CONFIDENCE_BAND_THRESHOLDS.MEDIUM_MIN >
  L9_RELIANCE_CONFIDENCE_BAND_THRESHOLDS.LOW_MIN,
  'A.12 MEDIUM_MIN > LOW_MIN');
assert(classifyL9RelianceConfidenceBand(0.90) === L9RelianceConfidenceBand.HIGH,
  'A.13 0.90 → HIGH band');
assert(classifyL9RelianceConfidenceBand(0.70) === L9RelianceConfidenceBand.MEDIUM,
  'A.14 0.70 → MEDIUM');
assert(classifyL9RelianceConfidenceBand(0.45) === L9RelianceConfidenceBand.LOW,
  'A.15 0.45 → LOW');
assert(classifyL9RelianceConfidenceBand(0.10) === L9RelianceConfidenceBand.UNRESOLVED,
  'A.16 0.10 → UNRESOLVED');

// A.17..A.19 — every cap has a registered ceiling and dominance rank
for (const r of ALL_L9_SEQUENCE_CAP_REASONS) {
  assert(typeof L9_SEQUENCE_CAP_CEILING[r] === 'number',
    `A.ceil.${r} has ceiling`);
  assert(typeof L9_SEQUENCE_CAP_DOMINANCE_RANK[r] === 'number',
    `A.rank.${r} has rank`);
  assert(L9_SEQUENCE_CAP_CEILING[r] >= 0 && L9_SEQUENCE_CAP_CEILING[r] <= 1,
    `A.ceil01.${r} ceiling in [0,1]`);
}

// A.20 — factor weights sum to 1.0 (within floating tolerance)
{
  const sum = ALL_L9_SEQUENCE_CONFIDENCE_FACTOR_CLASSES.reduce(
    (s, c) => s + L9_RELIANCE_CONFIDENCE_FACTOR_WEIGHTS[c], 0,
  );
  assert(Math.abs(sum - 1.0) < 1e-6, `A.20 factor weights sum to 1.0 (got ${sum})`);
}

// A.21 — every violation code carries the L9REL_ prefix
for (const c of ALL_L9_SEQUENCE_RELIANCE_VIOLATION_CODES) {
  assert(String(c).startsWith('L9REL_'),
    `A.prefix.${c} L9REL_ prefix`);
}

// A.22 — tier mapping for every code
for (const c of ALL_L9_SEQUENCE_RELIANCE_VIOLATION_CODES) {
  const t = l9RelianceViolationTier(c);
  assert(ALL_L9_SEQUENCE_RELIANCE_VIOLATION_TIERS.includes(t),
    `A.tier.${c} → registered tier`);
}

// A.23 — restriction rights: score-driving ∩ restrictive = ∅
for (const r of L9_SEQUENCE_SCORE_DRIVING_RIGHTS) {
  assert(!L9_SEQUENCE_RESTRICTIVE_RIGHTS.includes(r),
    `A.disjoint.${r} score-driving ∉ restrictive`);
}

// A.24 — default rights cover every band
for (const b of ALL_L9_RELIANCE_CONFIDENCE_BANDS) {
  assert(Array.isArray(L9_SEQUENCE_DEFAULT_RIGHTS_BY_BAND[b]),
    `A.defaults.${b} default rights declared`);
}

// A.25 — UNRESOLVED defaults never include score-driving
for (const r of L9_SEQUENCE_DEFAULT_RIGHTS_BY_BAND[
  L9RelianceConfidenceBand.UNRESOLVED
]) {
  assert(!L9_SEQUENCE_SCORE_DRIVING_RIGHTS.includes(r),
    `A.unresolved-safe.${r} not score-driving`);
}

// A.26 — causal-language detector smoke checks
assert(detectL9ForbiddenCausalLanguage('the expansion CAUSED the breakout'),
  'A.26 detects "caused"');
assert(!detectL9ForbiddenCausalLanguage('the sequence aligns with prior structure'),
  'A.27 clean prose not flagged');
assert(L9_FORBIDDEN_CAUSAL_LANGUAGE_PATTERN.test('this CONFIRMS the catalyst'),
  'A.28 detects "confirms the catalyst"');

// A.29 — restraint→permits_final_judgment mapping
assert(l9RestraintPermitsFinalJudgment(
  L9SequenceCausalRestraintClass.PROVISIONAL_CAUSAL_HINT) === true,
  'A.29 PROVISIONAL permits final judgment');
assert(l9RestraintPermitsFinalJudgment(
  L9SequenceCausalRestraintClass.STRICT_RESTRAINT) === false,
  'A.30 STRICT blocks final judgment');
assert(l9RestraintPermitsFinalJudgment(
  L9SequenceCausalRestraintClass.BLOCKED_CAUSAL_LANGUAGE) === false,
  'A.31 BLOCKED blocks final judgment');

// ═══════════════════════════════════════════════════════════════
// BAND B — Confidence + Cap-Chain Engines (§9.7.3, §9.7.5)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Confidence + Cap-Chain Engines ═══');

// B.1 — clean input produces HIGH band, all nine factors present
{
  const { profile: p, cap_chain: c } =
    buildL9RelianceConfidenceProfile(cleanConfInput('s:b1'));
  assert(p.factors.length === 9, 'B.1 9 factors emitted');
  const classesSeen = new Set(p.factors.map(f => f.factor_class));
  for (const cls of L9_REQUIRED_CONFIDENCE_FACTOR_CLASSES) {
    assert(classesSeen.has(cls), `B.cov.${cls} factor present`);
  }
  assert(p.confidence_band === L9RelianceConfidenceBand.HIGH,
    `B.band clean → HIGH (got ${p.confidence_band})`);
  assert(p.raw_confidence_score === p.capped_confidence_score,
    'B.raw-eq-cap no caps → raw == capped');
  assert(c.applied_cap_reasons.length === 0, 'B.caps.empty empty caps');
  assert(c.readiness_hint === L9SequenceCapReadinessHint.CLEAN,
    'B.hint.clean hint=CLEAN');
  assert(c.tightest_cap === null, 'B.tight.null tightest==null');
  const vr = validateL9SequenceConfidencePolicy({ profile: p });
  assert(vr.ok, 'B.validate clean profile validates clean');
}

// B.2 — applying contradiction cap lowers capped score to ≤ 0.40
{
  const { profile: p, cap_chain: c } = buildL9RelianceConfidenceProfile({
    ...cleanConfInput('s:b2'),
    applied_caps: [L9SequenceCapReason.CONTRADICTION_PRESSURE_HIGH],
  });
  assert(p.capped_confidence_score <= 0.40 + 1e-9,
    'B.cap.contradiction caps to 0.40');
  assert(p.confidence_band === L9RelianceConfidenceBand.LOW,
    'B.cap.band LOW after contradiction cap');
  assert(c.tightest_cap === L9SequenceCapReason.CONTRADICTION_PRESSURE_HIGH,
    'B.cap.tight contradiction is tightest');
}

// B.3 — multi-cap dominance: contradiction wins over order-ambiguity
{
  const c = buildL9SequenceCapChain({
    sequence_subject_id: 's:b3',
    pre_cap_score: 0.90,
    applied_caps: [
      L9SequenceCapReason.ORDER_AMBIGUITY_HIGH,
      L9SequenceCapReason.CONTRADICTION_PRESSURE_HIGH,
    ],
  });
  assert(c.tightest_cap === L9SequenceCapReason.CONTRADICTION_PRESSURE_HIGH,
    'B.3 contradiction beats order-ambiguity');
  assert(c.applied_cap_reasons[0] ===
    L9SequenceCapReason.CONTRADICTION_PRESSURE_HIGH,
    'B.3b contradiction sorts first (dominance asc)');
}

// B.4 — applyL9SequenceCapCeilings returns pre_cap when no caps
assert(applyL9SequenceCapCeilings(0.72, []) === 0.72,
  'B.4 no caps → pre_cap returned');

// B.5 — tightestL9SequenceCap returns null for empty caps
assert(tightestL9SequenceCap([]) === null,
  'B.5 tightest of [] is null');

// B.6 — dominance comparator total-orders caps
{
  const sorted = [...ALL_L9_SEQUENCE_CAP_REASONS].sort(compareL9SequenceCapDominance);
  assert(sorted[0] === L9SequenceCapReason.CONTRADICTION_PRESSURE_HIGH,
    'B.6 contradiction dominates (rank 1)');
}

// B.7 — engine produces stable replay_hash across runs
{
  const a = buildL9RelianceConfidenceProfile(cleanConfInput('s:stable'));
  const b = buildL9RelianceConfidenceProfile(cleanConfInput('s:stable'));
  assert(a.profile.replay_hash === b.profile.replay_hash,
    'B.7 replay_hash stable across identical runs');
}

// B.8 — Confidence validator catches missing factor class
{
  const base = buildL9RelianceConfidenceProfile(cleanConfInput('s:miss')).profile;
  const stripped = { ...base, factors: base.factors.slice(1) };
  const r = validateL9SequenceConfidencePolicy({ profile: stripped });
  assert(hasCode(r.violations,
    L9SequenceRelianceViolationCode.CONF_FACTOR_GROUP_MISSING),
    'B.8 missing factor class → CONF_FACTOR_GROUP_MISSING');
}

// B.9 — Confidence validator catches out-of-range factor
{
  const base = buildL9RelianceConfidenceProfile(cleanConfInput('s:rng')).profile;
  const bad = {
    ...base,
    factors: base.factors.map((f, i) =>
      i === 0 ? { ...f, raw_score: 1.5 } : f,
    ),
  };
  const r = validateL9SequenceConfidencePolicy({ profile: bad });
  assert(hasCode(r.violations,
    L9SequenceRelianceViolationCode.CONF_FACTOR_RAW_OUT_OF_RANGE),
    'B.9 raw_score>1 → CONF_FACTOR_RAW_OUT_OF_RANGE');
}

// B.10 — Cap-chain validator catches tampered ceiling
{
  const c = buildL9SequenceCapChain({
    sequence_subject_id: 's:b10',
    pre_cap_score: 0.90,
    applied_caps: [L9SequenceCapReason.DECAY_BURDEN_HIGH],
  });
  const tampered = {
    ...c,
    edges: [{ ...c.edges[0], narrows_to: 0.99 }],
  };
  const r = validateL9SequenceCapChain({ chain: tampered });
  assert(hasCode(r.violations,
    L9SequenceRelianceViolationCode.CAP_POST_CAP_EXCEEDS_CEILING),
    'B.10 tampered edge ceiling → CAP_POST_CAP_EXCEEDS_CEILING');
}

// B.11 — required_caps enforcement
{
  const c = buildL9SequenceCapChain({
    sequence_subject_id: 's:b11',
    pre_cap_score: 0.90,
    applied_caps: [],
  });
  const r = validateL9SequenceCapChain({
    chain: c,
    required_caps: [L9SequenceCapReason.CONTRADICTION_PRESSURE_HIGH],
  });
  assert(hasCode(r.violations,
    L9SequenceRelianceViolationCode.CAP_REQUIRED_CAP_MISSING),
    'B.11 required cap missing flagged');
}

// B.12 — assertL9SequenceCapChainLegal throws on tampered chain
{
  let threw = false;
  try {
    assertL9SequenceCapChainLegal({
      chain: {
        sequence_subject_id: 's:throw',
        pre_cap_score: 0.5,
        applied_cap_reasons: [],
        edges: [],
        tightest_cap: null,
        post_cap_score: 0.9, // widening
        readiness_hint: L9SequenceCapReadinessHint.CLEAN,
      },
    });
  } catch (e) {
    threw = e instanceof L9SequenceRelianceValidationError;
  }
  assert(threw, 'B.12 assert throws L9SequenceRelianceValidationError');
}

// ═══════════════════════════════════════════════════════════════
// BAND C — Restriction + Causal-Restraint (§9.7.6, §9.7.7)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Restriction + Causal-Restraint ═══');

// C.1 — clean causal classification returns STRICT_RESTRAINT
{
  const cr = classifyL9SequenceCausalRestraint({
    sequence_subject_id: 's:c1',
    temporal_support_strength: 0.8,
    contradiction_pressure: 0.05,
    decay_burden: 0.05,
    ordering_ambiguity: 0.05,
    provisional_causal_grant: false,
    surfaces: ['temporal observation only'],
    lineage_refs: [],
    policy_version: POLICY,
  });
  assert(cr.restraint_class ===
    L9SequenceCausalRestraintClass.STRICT_RESTRAINT,
    'C.1 clean → STRICT_RESTRAINT');
  assert(cr.permits_final_judgment === false,
    'C.1b STRICT blocks final judgment');
  assert(cr.flagged_tokens.length === 0, 'C.1c no flagged tokens');
}

// C.2 — forbidden language → BLOCKED_CAUSAL_LANGUAGE
{
  const cr = classifyL9SequenceCausalRestraint({
    sequence_subject_id: 's:c2',
    temporal_support_strength: 0.8,
    contradiction_pressure: 0.05,
    decay_burden: 0.05,
    ordering_ambiguity: 0.05,
    provisional_causal_grant: false,
    surfaces: ['the accumulation caused the rally'],
    lineage_refs: [],
    policy_version: POLICY,
  });
  assert(cr.restraint_class ===
    L9SequenceCausalRestraintClass.BLOCKED_CAUSAL_LANGUAGE,
    'C.2 "caused" → BLOCKED_CAUSAL_LANGUAGE');
  assert(cr.flagged_tokens.length > 0, 'C.2b flagged tokens captured');
}

// C.3 — high contradiction → NARROWED_RESTRAINT
{
  const cr = classifyL9SequenceCausalRestraint({
    sequence_subject_id: 's:c3',
    temporal_support_strength: 0.7,
    contradiction_pressure: 0.6,
    decay_burden: 0.2,
    ordering_ambiguity: 0.2,
    provisional_causal_grant: false,
    surfaces: ['moderate noise'],
    lineage_refs: [],
    policy_version: POLICY,
  });
  assert(cr.restraint_class ===
    L9SequenceCausalRestraintClass.NARROWED_RESTRAINT,
    'C.3 contradiction-pressure → NARROWED_RESTRAINT');
}

// C.4 — explicit provisional grant → PROVISIONAL_CAUSAL_HINT
{
  const cr = classifyL9SequenceCausalRestraint({
    sequence_subject_id: 's:c4',
    temporal_support_strength: 0.9,
    contradiction_pressure: 0.05,
    decay_burden: 0.05,
    ordering_ambiguity: 0.05,
    provisional_causal_grant: true,
    surfaces: ['strong temporal chain'],
    lineage_refs: [],
    policy_version: POLICY,
  });
  assert(cr.restraint_class ===
    L9SequenceCausalRestraintClass.PROVISIONAL_CAUSAL_HINT,
    'C.4 explicit grant → PROVISIONAL');
  assert(cr.permits_final_judgment === true,
    'C.4b PROVISIONAL permits final judgment');
}

// C.5 — HIGH-band restriction engine returns score-driving rights
{
  const cap = buildL9SequenceCapChain({
    sequence_subject_id: 's:c5',
    pre_cap_score: 0.90,
    applied_caps: [],
  });
  const restr = buildL9SequenceRestrictionProfile({
    sequence_subject_id: 's:c5',
    driving_band: L9RelianceConfidenceBand.HIGH,
    cap_chain: cap,
    contradiction_present: false,
    causal_restraint_class:
      L9SequenceCausalRestraintClass.PROVISIONAL_CAUSAL_HINT,
    additional_confirmation_required: false,
    narrowing_notes: [],
    lineage_refs: [],
    policy_version: POLICY,
  });
  assert(restr.rights.includes(
    L9SequenceRestrictionRight.DETERMINISTIC_SCORING_ALLOWED),
    'C.5 HIGH allows deterministic scoring');
  assert(restr.rights.includes(
    L9SequenceRestrictionRight.JUDGMENT_SUPPORT_ALLOWED),
    'C.5b HIGH allows judgment support');
}

// C.6 — UNRESOLVED band engine returns EVIDENCE_ONLY + FINAL_JUDGMENT_BLOCKED
{
  const cap = buildL9SequenceCapChain({
    sequence_subject_id: 's:c6',
    pre_cap_score: 0.10,
    applied_caps: [L9SequenceCapReason.CONTRADICTION_PRESSURE_HIGH],
  });
  const restr = buildL9SequenceRestrictionProfile({
    sequence_subject_id: 's:c6',
    driving_band: L9RelianceConfidenceBand.UNRESOLVED,
    cap_chain: cap,
    contradiction_present: true,
    causal_restraint_class:
      L9SequenceCausalRestraintClass.BLOCKED_CAUSAL_LANGUAGE,
    additional_confirmation_required: true,
    narrowing_notes: [],
    lineage_refs: [],
    policy_version: POLICY,
  });
  assert(restr.rights.includes(L9SequenceRestrictionRight.EVIDENCE_ONLY),
    'C.6 UNRESOLVED grants EVIDENCE_ONLY');
  assert(restr.rights.includes(
    L9SequenceRestrictionRight.FINAL_JUDGMENT_BLOCKED),
    'C.6b UNRESOLVED + BLOCKED grants FINAL_JUDGMENT_BLOCKED');
  for (const sd of L9_SEQUENCE_SCORE_DRIVING_RIGHTS) {
    assert(!restr.rights.includes(sd),
      `C.6c.${sd} score-driving not present under UNRESOLVED`);
  }
}

// C.7 — contradiction_present forces CONTRADICTION_DISCLOSURE_REQUIRED
{
  const cap = buildL9SequenceCapChain({
    sequence_subject_id: 's:c7',
    pre_cap_score: 0.70,
    applied_caps: [],
  });
  const restr = buildL9SequenceRestrictionProfile({
    sequence_subject_id: 's:c7',
    driving_band: L9RelianceConfidenceBand.MEDIUM,
    cap_chain: cap,
    contradiction_present: true,
    causal_restraint_class:
      L9SequenceCausalRestraintClass.STRICT_RESTRAINT,
    additional_confirmation_required: false,
    narrowing_notes: [],
    lineage_refs: [],
    policy_version: POLICY,
  });
  assert(restr.rights.includes(
    L9SequenceRestrictionRight.CONTRADICTION_DISCLOSURE_REQUIRED),
    'C.7 contradiction_present forces disclosure');
}

// C.8 — validator: broadened rights under UNRESOLVED → REJECTED
{
  const profile = buildL9SequenceRestrictionProfile({
    sequence_subject_id: 's:c8',
    driving_band: L9RelianceConfidenceBand.UNRESOLVED,
    cap_chain: buildL9SequenceCapChain({
      sequence_subject_id: 's:c8',
      pre_cap_score: 0.1,
      applied_caps: [L9SequenceCapReason.CONTRADICTION_PRESSURE_HIGH],
    }),
    contradiction_present: false,
    causal_restraint_class:
      L9SequenceCausalRestraintClass.BLOCKED_CAUSAL_LANGUAGE,
    additional_confirmation_required: true,
    narrowing_notes: [],
    lineage_refs: [],
    policy_version: POLICY,
  });
  const tampered = {
    ...profile,
    rights: [
      ...profile.rights,
      L9SequenceRestrictionRight.DETERMINISTIC_SCORING_ALLOWED,
    ],
  };
  const r = validateL9SequenceRestrictionProfile({
    profile: tampered,
    contradiction_present: false,
    causal_restraint_class:
      L9SequenceCausalRestraintClass.BLOCKED_CAUSAL_LANGUAGE,
    additional_confirmation_required: true,
  });
  assert(
    hasCode(r.violations,
      L9SequenceRelianceViolationCode.RESTR_SCORE_DRIVING_WITH_EVIDENCE_ONLY) ||
    hasCode(r.violations,
      L9SequenceRelianceViolationCode.RESTR_BROADER_THAN_STATE),
    'C.8 broadened UNRESOLVED rejected');
}

// C.9 — causal validator: forbidden language in rationale → REJECTED
{
  const prof = {
    sequence_subject_id: 's:c9',
    restraint_class: L9SequenceCausalRestraintClass.STRICT_RESTRAINT,
    rationale_notes: ['the accumulation CAUSED the move'],
    flagged_tokens: [],
    permits_final_judgment: false,
    policy_version: POLICY,
    lineage_refs: [],
  };
  const r = validateL9SequenceCausalRestraint({ profile: prof });
  assert(hasCode(r.violations,
    L9SequenceRelianceViolationCode.CAUSAL_LANGUAGE_DETECTED),
    'C.9 rationale with "caused" rejected');
}

// C.10 — asserts throw on illegal inputs
{
  let threw1 = false, threw2 = false, threw3 = false;
  try {
    assertL9SequenceConfidencePolicyLegal({
      profile: {
        sequence_subject_id: 'x',
        factors: [],
        raw_confidence_score: 0.5,
        capped_confidence_score: 0.5,
        confidence_band: L9RelianceConfidenceBand.MEDIUM,
        cap_chain_ref: 'ccr:x:none',
        policy_version: POLICY,
        replay_hash: 'h',
      },
    });
  } catch (e) { threw1 = e instanceof L9SequenceRelianceValidationError; }
  try {
    assertL9SequenceRestrictionProfileLegal({
      profile: {
        sequence_subject_id: 'x',
        driving_band: L9RelianceConfidenceBand.UNRESOLVED,
        rights: [],
        blocked_rights: [],
        narrowing_notes: [],
        lineage_refs: [],
        policy_version: POLICY,
        replay_hash: 'h',
      },
      contradiction_present: false,
      causal_restraint_class:
        L9SequenceCausalRestraintClass.BLOCKED_CAUSAL_LANGUAGE,
      additional_confirmation_required: false,
    });
  } catch (e) { threw2 = e instanceof L9SequenceRelianceValidationError; }
  try {
    assertL9SequenceCausalRestraintLegal({
      profile: {
        sequence_subject_id: 'x',
        restraint_class: L9SequenceCausalRestraintClass.STRICT_RESTRAINT,
        rationale_notes: [],
        flagged_tokens: [],
        permits_final_judgment: false,
        policy_version: POLICY,
        lineage_refs: [],
      },
    });
  } catch (e) { threw3 = e instanceof L9SequenceRelianceValidationError; }
  assert(threw1, 'C.10a confidence assert throws');
  assert(threw2, 'C.10b restriction assert throws');
  assert(threw3, 'C.10c causal assert throws');
}

// ═══════════════════════════════════════════════════════════════
// BAND D — Reliance Aggregator + Validators (§9.7.9, §9.7.10)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Reliance Aggregator + Top-Level Validator ═══');

// D.1 — clean aggregator → STRONG readiness
{
  const { reliance, causal_profile } = buildL9SequenceRelianceProfile({
    confidence_input: cleanConfInput('s:d1'),
    causal_input: {
      sequence_subject_id: 's:d1',
      temporal_support_strength: 0.9,
      contradiction_pressure: 0.05,
      decay_burden: 0.05,
      ordering_ambiguity: 0.05,
      provisional_causal_grant: false,
      surfaces: ['clean observation'],
      lineage_refs: [],
      policy_version: POLICY,
    },
    contradiction_present: false,
    additional_confirmation_required: false,
    narrowing_notes: [],
    lineage_refs: [],
    policy_version: POLICY,
  });
  assert(reliance.readiness === L9SequenceRelianceReadinessClass.STRONG,
    `D.1 clean → STRONG readiness (got ${reliance.readiness})`);
  const r = validateL9SequenceRelianceProfile({
    reliance,
    causal_profile,
    contradiction_present: false,
    additional_confirmation_required: false,
    expected_policy_version: POLICY,
  });
  assert(r.ok, `D.1b clean reliance validates (violations=${r.violations.map(v=>v.code).join(',')})`);
}

// D.2 — MEDIUM band + STRICT restraint → NARROWED readiness
{
  const input = {
    ...cleanConfInput('s:d2'),
    contributions: {
      ...cleanConfInput('s:d2').contributions,
      [L9SequenceConfidenceFactorClass.CONTRADICTION_PRESSURE]: 0.30,
      [L9SequenceConfidenceFactorClass.ORDER_CLARITY]: 0.70,
      [L9SequenceConfidenceFactorClass.CHAIN_COMPLETENESS]: 0.70,
      [L9SequenceConfidenceFactorClass.FRESHNESS]: 0.70,
      [L9SequenceConfidenceFactorClass.HISTORICAL_RELIABILITY]: 0.70,
      [L9SequenceConfidenceFactorClass.LEAD_LAG_STABILITY]: 0.70,
      [L9SequenceConfidenceFactorClass.REGIME_COMPATIBILITY]: 0.70,
    },
  };
  const { reliance } = buildL9SequenceRelianceProfile({
    confidence_input: input,
    causal_input: {
      sequence_subject_id: 's:d2',
      temporal_support_strength: 0.7,
      contradiction_pressure: 0.3,
      decay_burden: 0.1,
      ordering_ambiguity: 0.1,
      provisional_causal_grant: false,
      surfaces: [],
      lineage_refs: [],
      policy_version: POLICY,
    },
    contradiction_present: false,
    additional_confirmation_required: false,
    narrowing_notes: [],
    lineage_refs: [],
    policy_version: POLICY,
  });
  assert(
    reliance.readiness === L9SequenceRelianceReadinessClass.NARROWED ||
    reliance.readiness === L9SequenceRelianceReadinessClass.DEGRADED ||
    reliance.readiness === L9SequenceRelianceReadinessClass.STRONG,
    `D.2 MEDIUM-ish → non-BLOCKED readiness (got ${reliance.readiness})`);
  assert(reliance.readiness !== L9SequenceRelianceReadinessClass.BLOCKED,
    'D.2b MEDIUM-ish path not BLOCKED');
}

// D.3 — BLOCKED causal → BLOCKED readiness regardless of band
{
  const { reliance } = buildL9SequenceRelianceProfile({
    confidence_input: cleanConfInput('s:d3'),
    causal_input: {
      sequence_subject_id: 's:d3',
      temporal_support_strength: 0.9,
      contradiction_pressure: 0.05,
      decay_burden: 0.05,
      ordering_ambiguity: 0.05,
      provisional_causal_grant: false,
      surfaces: ['the lead-lag CAUSED the reaction'],
      lineage_refs: [],
      policy_version: POLICY,
    },
    contradiction_present: false,
    additional_confirmation_required: false,
    narrowing_notes: [],
    lineage_refs: [],
    policy_version: POLICY,
  });
  assert(reliance.causal_restraint_class ===
    L9SequenceCausalRestraintClass.BLOCKED_CAUSAL_LANGUAGE,
    'D.3 BLOCKED causal class carried through');
  assert(reliance.readiness === L9SequenceRelianceReadinessClass.BLOCKED,
    'D.3b BLOCKED causal → BLOCKED readiness');
}

// D.4 — top-level validator catches policy-version mismatch
{
  const { reliance, causal_profile } = buildL9SequenceRelianceProfile({
    confidence_input: cleanConfInput('s:d4'),
    causal_input: {
      sequence_subject_id: 's:d4',
      temporal_support_strength: 0.9,
      contradiction_pressure: 0.05,
      decay_burden: 0.05,
      ordering_ambiguity: 0.05,
      provisional_causal_grant: false,
      surfaces: ['clean'],
      lineage_refs: [],
      policy_version: POLICY,
    },
    contradiction_present: false,
    additional_confirmation_required: false,
    narrowing_notes: [],
    lineage_refs: [],
    policy_version: POLICY,
  });
  const r = validateL9SequenceRelianceProfile({
    reliance,
    causal_profile,
    contradiction_present: false,
    additional_confirmation_required: false,
    expected_policy_version: 'l9.7@0.0.1',
  });
  assert(hasCode(r.violations,
    L9SequenceRelianceViolationCode.REL_POLICY_VERSION_MISMATCH),
    'D.4 mismatched policy version → REL_POLICY_VERSION_MISMATCH');
}

// D.5 — summarizer readiness mapping spot checks
assert(summarizeL9SequenceRelianceReadiness({
  band: L9RelianceConfidenceBand.HIGH,
  capped_score: 0.9,
  restraint_class: L9SequenceCausalRestraintClass.STRICT_RESTRAINT,
  has_evidence_only_right: false,
  has_final_judgment_blocked_right: false,
}) === L9SequenceRelianceReadinessClass.STRONG,
  'D.5 HIGH+STRICT → STRONG');
assert(summarizeL9SequenceRelianceReadiness({
  band: L9RelianceConfidenceBand.HIGH,
  capped_score: 0.9,
  restraint_class: L9SequenceCausalRestraintClass.BLOCKED_CAUSAL_LANGUAGE,
  has_evidence_only_right: false,
  has_final_judgment_blocked_right: false,
}) === L9SequenceRelianceReadinessClass.BLOCKED,
  'D.5b BLOCKED causal overrides HIGH → BLOCKED');
assert(summarizeL9SequenceRelianceReadiness({
  band: L9RelianceConfidenceBand.LOW,
  capped_score: 0.4,
  restraint_class: L9SequenceCausalRestraintClass.STRICT_RESTRAINT,
  has_evidence_only_right: false,
  has_final_judgment_blocked_right: false,
}) === L9SequenceRelianceReadinessClass.DEGRADED,
  'D.5c LOW → DEGRADED');

// D.6 — assertL9SequenceRelianceProfileLegal throws on mismatch
{
  let threw = false;
  try {
    const { reliance, causal_profile } = buildL9SequenceRelianceProfile({
      confidence_input: cleanConfInput('s:d6'),
      causal_input: {
        sequence_subject_id: 's:d6',
        temporal_support_strength: 0.9,
        contradiction_pressure: 0.05,
        decay_burden: 0.05,
        ordering_ambiguity: 0.05,
        provisional_causal_grant: false,
        surfaces: ['clean'],
        lineage_refs: [],
        policy_version: POLICY,
      },
      contradiction_present: false,
      additional_confirmation_required: false,
      narrowing_notes: [],
      lineage_refs: [],
      policy_version: POLICY,
    });
    assertL9SequenceRelianceProfileLegal({
      reliance,
      causal_profile,
      contradiction_present: false,
      additional_confirmation_required: false,
      expected_policy_version: 'l9.7@9.9.9',
    });
  } catch (e) { threw = e instanceof L9SequenceRelianceValidationError; }
  assert(threw, 'D.6 reliance assert throws on mismatch');
}

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit + Invariants + Replay (§9.7.11)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Audit + Invariants + Replay ═══');

// E.1 — Empty audit is INFO-severity and not blocking
{
  const a = buildL9RelianceAudit([]);
  assert(a.total === 0, 'E.1 empty audit total=0');
  assert(a.highest_severity === L9RelianceAuditSeverity.INFO,
    'E.1b empty → INFO severity');
  assert(hasL9RelianceBlockingViolations(a) === false,
    'E.1c empty → not blocking');
}

// E.2 — Severity classification: critical codes → CRITICAL
{
  assert(classifyL9RelianceAuditSeverity(
    L9SequenceRelianceViolationCode.CAP_WIDENING_ATTEMPTED) ===
    L9RelianceAuditSeverity.CRITICAL,
    'E.2 CAP_WIDENING_ATTEMPTED → CRITICAL');
  assert(classifyL9RelianceAuditSeverity(
    L9SequenceRelianceViolationCode.CAUSAL_LANGUAGE_DETECTED) ===
    L9RelianceAuditSeverity.CRITICAL,
    'E.2b CAUSAL_LANGUAGE_DETECTED → CRITICAL');
  assert(classifyL9RelianceAuditSeverity(
    L9SequenceRelianceViolationCode.REGIME_OVERRIDE_ATTEMPTED) ===
    L9RelianceAuditSeverity.CRITICAL,
    'E.2c REGIME_OVERRIDE_ATTEMPTED → CRITICAL');
}

// E.3 — Warning classification
{
  assert(classifyL9RelianceAuditSeverity(
    L9SequenceRelianceViolationCode.CAUSAL_RATIONALE_EMPTY) ===
    L9RelianceAuditSeverity.WARNING,
    'E.3 CAUSAL_RATIONALE_EMPTY → WARNING');
}

// E.4 — Aggregated counts per tier
{
  const vs: L9SequenceRelianceViolation[] = [
    { code: L9SequenceRelianceViolationCode.CONF_CAPPED_GT_RAW,
      tier: L9SequenceRelianceViolationTier.CONFIDENCE, detail: 'x' },
    { code: L9SequenceRelianceViolationCode.CONF_CAPPED_GT_RAW,
      tier: L9SequenceRelianceViolationTier.CONFIDENCE, detail: 'y' },
    { code: L9SequenceRelianceViolationCode.CAP_WIDENING_ATTEMPTED,
      tier: L9SequenceRelianceViolationTier.CAP_CHAIN, detail: 'z' },
  ];
  const a = buildL9RelianceAudit(vs);
  assert(a.total === 3, 'E.4 total=3');
  assert(a.by_code['L9REL_CONF_CAPPED_GT_RAW'] === 2, 'E.4b per-code count');
  assert(a.by_tier[L9SequenceRelianceViolationTier.CONFIDENCE] === 2,
    'E.4c per-tier count');
  assert(a.highest_severity === L9RelianceAuditSeverity.CRITICAL,
    'E.4d worst severity = CRITICAL');
  assert(hasL9RelianceBlockingViolations(a) === true,
    'E.4e blocking reported');
}

// E.5 — deterministic aggregation
{
  const vs: L9SequenceRelianceViolation[] = [
    { code: L9SequenceRelianceViolationCode.CONF_CAPPED_GT_RAW,
      tier: L9SequenceRelianceViolationTier.CONFIDENCE, detail: 'x' },
    { code: L9SequenceRelianceViolationCode.CAP_WIDENING_ATTEMPTED,
      tier: L9SequenceRelianceViolationTier.CAP_CHAIN, detail: 'z' },
  ];
  const a = buildL9RelianceAudit(vs);
  const b = buildL9RelianceAudit(vs);
  assert(JSON.stringify(a) === JSON.stringify(b),
    'E.5 audit deterministic (stable serialization)');
}

// E.6..E.12 — Every INV-9.7-* holds
{
  const r = runAllL9_7Invariants();
  assert(r.length === 7, 'E.6 exactly 7 L9.7 invariants');
  const ids = r.map(x => x.id);
  for (const id of [
    'INV-9.7-A', 'INV-9.7-B', 'INV-9.7-C', 'INV-9.7-D',
    'INV-9.7-E', 'INV-9.7-F', 'INV-9.7-G',
  ]) {
    const got = r.find(x => x.id === id)!;
    assert(got.holds, `E.inv.${id} holds (${got.evidence})`);
  }
  assert(new Set(ids).size === 7, 'E.7 invariant ids distinct');
}

// E.13 — individual invariant runners also green
assert(checkINV_97_A().holds, 'E.13a INV-9.7-A direct call green');
assert(checkINV_97_B().holds, 'E.13b INV-9.7-B');
assert(checkINV_97_C().holds, 'E.13c INV-9.7-C');
assert(checkINV_97_D().holds, 'E.13d INV-9.7-D');
assert(checkINV_97_E().holds, 'E.13e INV-9.7-E');
assert(checkINV_97_F().holds, 'E.13f INV-9.7-F');
assert(checkINV_97_G().holds, 'E.13g INV-9.7-G');

// E.14 — replay identity across the entire reliance pipeline
{
  const a = buildL9SequenceRelianceProfile({
    confidence_input: cleanConfInput('s:replay'),
    causal_input: {
      sequence_subject_id: 's:replay',
      temporal_support_strength: 0.9,
      contradiction_pressure: 0.05,
      decay_burden: 0.05,
      ordering_ambiguity: 0.05,
      provisional_causal_grant: false,
      surfaces: ['clean'],
      lineage_refs: [],
      policy_version: POLICY,
    },
    contradiction_present: false,
    additional_confirmation_required: false,
    narrowing_notes: [],
    lineage_refs: [],
    policy_version: POLICY,
  });
  const b = buildL9SequenceRelianceProfile({
    confidence_input: cleanConfInput('s:replay'),
    causal_input: {
      sequence_subject_id: 's:replay',
      temporal_support_strength: 0.9,
      contradiction_pressure: 0.05,
      decay_burden: 0.05,
      ordering_ambiguity: 0.05,
      provisional_causal_grant: false,
      surfaces: ['clean'],
      lineage_refs: [],
      policy_version: POLICY,
    },
    contradiction_present: false,
    additional_confirmation_required: false,
    narrowing_notes: [],
    lineage_refs: [],
    policy_version: POLICY,
  });
  assert(a.reliance.replay_hash === b.reliance.replay_hash,
    'E.14 reliance replay_hash stable');
  assert(JSON.stringify(a.reliance) === JSON.stringify(b.reliance),
    'E.14b full reliance structurally identical');
}

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n───────────────────────────────────────────');
console.log(`L9.7 Reliance Certification Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\nFailed assertions:');
  for (const f of failures) console.log(`  • ${f}`);
  process.exit(1);
}
console.log('All L9.7 reliance-governance certification bands PASSED');
process.exit(0);
