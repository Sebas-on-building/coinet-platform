/**
 * L10.7 — Reliance Certification Test Suite
 *
 * 5 Bands (§10.7.12):
 *   A — Confidence factors (§10.7.3) — required factor classes,
 *       boundedness, completeness, unregistered-factor rejection,
 *       blocking-factor / clean-band guard, replay stability.
 *   B — Cap chain + banding (§10.7.6 / §10.7.4.6) — bands derive from
 *       the capped score, cap precedence works, required caps apply,
 *       widening attempts reject, readiness-hint consistency.
 *   C — Spread + restriction law (§10.7.4 / §10.7.5) — narrow spread
 *       narrows rights, blocked rights surface, evidence-only and
 *       additional-confirmation requirements derive correctly,
 *       broader-than-state grants reject (INV-10.7-D).
 *   D — Readiness law (§10.7.7) — STRONG / NARROWED / DEGRADED /
 *       UNRESOLVED / BLOCKED classes; forged STRONG under narrow
 *       spread / active invalidation / missing confirmations reject.
 *   E — Audit + invariants (§10.7.10.1 / §10.7.11) — deterministic
 *       severity mapping, green pipeline emits zero records,
 *       INV-10.7-A..G green, crafted offenders fail precisely.
 */

import {
  L10HypothesisCapChain,
  L10HypothesisCapReadinessHint,
  L10HypothesisCapReason,
  L10_HYPOTHESIS_CAP_CEILING,
  L10_HYPOTHESIS_CAP_DOMINANCE_RANK,
  compareL10HypothesisCapDominance,
  tightestL10HypothesisCap,
} from '../l10/contracts/hypothesis-cap-chain';
import {
  ALL_L10_HYPOTHESIS_CONFIDENCE_FACTOR_CLASSES,
  L10HypothesisConfidenceFactorClass,
  L10HypothesisConfidenceFactorEffect,
  L10HypothesisRelianceConfidenceBand,
  L10_HYPOTHESIS_INVERTED_CONFIDENCE_CLASSES,
  classifyL10HypothesisRelianceConfidenceBand,
} from '../l10/contracts/hypothesis-confidence.policy';
import {
  ALL_L10_HYPOTHESIS_RELIANCE_READINESS_CLASSES,
  L10HypothesisRelianceReadinessClass,
  summarizeL10HypothesisRelianceReadiness,
} from '../l10/contracts/hypothesis-readiness';
import {
  ALL_L10_HYPOTHESIS_RESTRICTION_RIGHTS,
  L10HypothesisRestrictionRight,
  L10_HYPOTHESIS_DEFAULT_RIGHTS_BY_BAND,
  L10_HYPOTHESIS_SCORE_DRIVING_RIGHTS,
} from '../l10/contracts/hypothesis-restriction-rights';
import { L10SpreadClass } from '../l10/contracts/hypothesis-spread-profile';

import {
  buildL10HypothesisCapChain,
} from '../l10/reliance/hypothesis-cap-chain-engine';
import {
  buildL10HypothesisConfidenceProfile,
} from '../l10/reliance/hypothesis-confidence-engine';
import {
  buildL10HypothesisRelianceProfile,
} from '../l10/reliance/hypothesis-reliance-engine';
import {
  buildL10HypothesisRestrictionProfile,
} from '../l10/reliance/hypothesis-restriction-engine';

import {
  L10HypothesisRelianceViolationCode,
  L10HypothesisRelianceViolationTier,
  l10HypothesisRelianceViolationTier,
} from '../l10/validation/l10-reliance-violation-codes';
import {
  validateL10HypothesisCapChain,
} from '../l10/validation/hypothesis-cap-chain.validator';
import {
  validateL10HypothesisConfidenceProfile,
} from '../l10/validation/hypothesis-confidence-policy.validator';
import {
  validateL10HypothesisReadiness,
} from '../l10/validation/hypothesis-readiness.validator';
import {
  validateL10HypothesisRelianceProfile,
} from '../l10/validation/hypothesis-reliance-profile.validator';
import {
  validateL10HypothesisRestrictionRights,
} from '../l10/validation/hypothesis-restriction-rights.validator';

import {
  L10RelianceAuditSeverity,
  L10RelianceAuditSurface,
  buildL10RelianceAuditRecords,
  classifyL10RelianceAuditSeverity,
  l10RelianceAuditSurfaceForTier,
  summariseL10RelianceAudit,
} from '../l10/constitution/l10-reliance-audit';

import {
  buildBlockedL10_7RelianceFixture,
  buildGreenL10_7RelianceFixture,
  buildNarrowedL10_7RelianceFixture,
} from '../l10/invariants/l10_7-fixtures';
import {
  checkINV_107_A,
  checkINV_107_B,
  checkINV_107_C,
  checkINV_107_D,
  checkINV_107_E,
  checkINV_107_F,
  checkINV_107_G,
  runAllL10_7Invariants,
} from '../l10/invariants/l10_7-invariants';

const V = L10HypothesisRelianceViolationCode;

let passed = 0;
let failed = 0;
const failures: string[] = [];
function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.log(`  x ${label}`); }
}

const green = buildGreenL10_7RelianceFixture();
const narrowed = buildNarrowedL10_7RelianceFixture();
const blocked = buildBlockedL10_7RelianceFixture();

const gRes = buildL10HypothesisRelianceProfile(green.input);
const nRes = buildL10HypothesisRelianceProfile(narrowed.input);
const bRes = buildL10HypothesisRelianceProfile(blocked.input);

// ═══════════════════════════════════════════════════════════════
// BAND A — Confidence factors (§10.7.3)
// ═══════════════════════════════════════════════════════════════
console.log('\n=== BAND A: Confidence factors ===');

assert(ALL_L10_HYPOTHESIS_CONFIDENCE_FACTOR_CLASSES.length === 9,
  'A.01 nine canonical factor classes registered');

assert(gRes.confidence.factors.length === 9,
  'A.02 green confidence profile exposes nine factors');

const classesSeen = new Set(
  gRes.confidence.factors.map(f => f.factor_class),
);
assert(
  ALL_L10_HYPOTHESIS_CONFIDENCE_FACTOR_CLASSES.every(c => classesSeen.has(c)),
  'A.03 every required factor class emitted');

assert(
  gRes.confidence.factors.every(
    f => f.raw_score >= 0 && f.raw_score <= 1 &&
      f.normalized_score >= 0 && f.normalized_score <= 1,
  ),
  'A.04 factor raw / normalized scores bounded to [0,1]');

assert(
  gRes.confidence.factors.every(f => f.policy_version.length > 0),
  'A.05 every factor carries a policy_version');

const greenConfRep = validateL10HypothesisConfidenceProfile({
  profile: gRes.confidence,
});
assert(greenConfRep.ok,
  `A.06 green confidence profile passes validator (${
    greenConfRep.violations.map(v => v.code).join(',')})`);

// Missing factor class rejects.
const missingFactors = gRes.confidence.factors.filter(
  f => f.factor_class !== L10HypothesisConfidenceFactorClass.SUPPORT_STRENGTH,
);
const missingRep = validateL10HypothesisConfidenceProfile({
  profile: { ...gRes.confidence, factors: missingFactors },
});
assert(missingRep.violations.some(v => v.code === V.CONF_FACTOR_GROUP_MISSING),
  'A.07 missing required factor class rejected');

// Unregistered factor class rejects.
const unregFactor = {
  ...gRes.confidence.factors[0],
  factor_class: 'ALIEN_FACTOR' as L10HypothesisConfidenceFactorClass,
};
const unregRep = validateL10HypothesisConfidenceProfile({
  profile: {
    ...gRes.confidence,
    factors: [unregFactor, ...gRes.confidence.factors.slice(1)],
  },
});
assert(
  unregRep.violations.some(v => v.code === V.CONF_FACTOR_CLASS_UNREGISTERED),
  'A.08 unregistered factor class rejected');

// Out-of-range raw score rejects.
const outOfRange = {
  ...gRes.confidence.factors[0],
  raw_score: 2.5,
};
const outRep = validateL10HypothesisConfidenceProfile({
  profile: {
    ...gRes.confidence,
    factors: [outOfRange, ...gRes.confidence.factors.slice(1)],
  },
});
assert(
  outRep.violations.some(v => v.code === V.CONF_FACTOR_RAW_OUT_OF_RANGE),
  'A.09 out-of-range raw score rejected');

// Capped > raw rejects.
const overCapped = {
  ...gRes.confidence,
  capped_confidence_score: Math.min(
    1, gRes.confidence.raw_confidence_score + 0.05,
  ),
};
const overRep = validateL10HypothesisConfidenceProfile({ profile: overCapped });
assert(overRep.violations.some(v => v.code === V.CONF_CAPPED_GT_RAW),
  'A.10 capped_score > raw_score rejected');

// Band mismatch rejects.
const wrongBand = {
  ...gRes.confidence,
  confidence_band: L10HypothesisRelianceConfidenceBand.UNRESOLVED,
};
const wrongBandRep = validateL10HypothesisConfidenceProfile({
  profile: wrongBand,
});
assert(
  wrongBandRep.violations.some(
    v => v.code === V.CONF_BAND_INCONSISTENT_WITH_CAPPED,
  ),
  'A.11 band inconsistent with capped score rejected');

// Blocking factor under HIGH band rejects.
const blockingFactors = gRes.confidence.factors.map(f => ({
  ...f,
  reliance_effect: L10HypothesisConfidenceFactorEffect.BLOCKS,
}));
const blockingRep = validateL10HypothesisConfidenceProfile({
  profile: { ...gRes.confidence, factors: blockingFactors },
});
assert(
  blockingRep.violations.some(
    v => v.code === V.CONF_BLOCKING_FACTOR_UNDER_CLEAN_BAND,
  ),
  'A.12 blocking factor under HIGH band rejected');

// Replay stability: same input → identical replay hash.
const gRes2 = buildL10HypothesisRelianceProfile(green.input);
assert(gRes.confidence.replay_hash === gRes2.confidence.replay_hash,
  'A.13 confidence replay hash deterministic');

// Inverted classes list matches doctrine.
assert(
  L10_HYPOTHESIS_INVERTED_CONFIDENCE_CLASSES.length === 2 &&
  L10_HYPOTHESIS_INVERTED_CONFIDENCE_CLASSES.includes(
    L10HypothesisConfidenceFactorClass.CONTRADICTION_PRESSURE,
  ) &&
  L10_HYPOTHESIS_INVERTED_CONFIDENCE_CLASSES.includes(
    L10HypothesisConfidenceFactorClass.INVALIDATION_RISK,
  ),
  'A.14 inverted-reliance factor classes correctly registered');

// ═══════════════════════════════════════════════════════════════
// BAND B — Cap chain + banding (§10.7.6 / §10.7.4.6)
// ═══════════════════════════════════════════════════════════════
console.log('\n=== BAND B: Cap chain + banding ===');

// Bands derive from capped only (strict).
assert(
  classifyL10HypothesisRelianceConfidenceBand(0.90) ===
    L10HypothesisRelianceConfidenceBand.HIGH,
  'B.01 capped=0.90 → HIGH');
assert(
  classifyL10HypothesisRelianceConfidenceBand(0.70) ===
    L10HypothesisRelianceConfidenceBand.MEDIUM,
  'B.02 capped=0.70 → MEDIUM');
assert(
  classifyL10HypothesisRelianceConfidenceBand(0.40) ===
    L10HypothesisRelianceConfidenceBand.LOW,
  'B.03 capped=0.40 → LOW');
assert(
  classifyL10HypothesisRelianceConfidenceBand(0.20) ===
    L10HypothesisRelianceConfidenceBand.UNRESOLVED,
  'B.04 capped=0.20 → UNRESOLVED');

// Green cap chain: no caps applied.
assert(gRes.cap_chain.applied_cap_reasons.length === 0,
  'B.05 green cap chain applies no caps');
assert(
  gRes.cap_chain.readiness_hint === L10HypothesisCapReadinessHint.CLEAN,
  'B.06 green cap chain readiness hint CLEAN');

// Cap precedence: contradiction + narrow_spread → contradiction first.
const mixedChain = buildL10HypothesisCapChain({
  hypothesis_subject_id: 'sub_mixed',
  pre_cap_score: 0.85,
  applied_cap_reasons: [
    L10HypothesisCapReason.NARROW_SPREAD,
    L10HypothesisCapReason.CONTRADICTION_HIGH,
  ],
});
assert(
  mixedChain.applied_cap_reasons[0] ===
    L10HypothesisCapReason.CONTRADICTION_HIGH,
  'B.07 cap precedence sorts CONTRADICTION_HIGH ahead of NARROW_SPREAD');
assert(
  mixedChain.post_cap_score <=
    L10_HYPOTHESIS_CAP_CEILING[L10HypothesisCapReason.CONTRADICTION_HIGH] + 1e-9,
  'B.08 post_cap_score ≤ tightest ceiling');
assert(
  mixedChain.tightest_cap === L10HypothesisCapReason.CONTRADICTION_HIGH,
  'B.09 tightest_cap selected by lowest ceiling');

// Dominant cap is the lowest-rank one.
assert(
  mixedChain.dominant_cap_reason ===
    L10HypothesisCapReason.CONTRADICTION_HIGH,
  'B.10 dominant cap reason = best dominance rank');

// Narrowing-only: post_cap ≤ pre_cap.
assert(mixedChain.post_cap_score <= mixedChain.pre_cap_score + 1e-9,
  'B.11 caps narrow only (INV-10.7-C)');

// Cap-chain validator: widening attempt rejects.
const widened: L10HypothesisCapChain = {
  ...mixedChain,
  post_cap_score: Math.min(1, mixedChain.pre_cap_score + 0.01),
};
const widenRep = validateL10HypothesisCapChain({ chain: widened });
assert(
  widenRep.violations.some(
    v =>
      v.code === V.CAP_POST_CAP_EXCEEDS_CEILING ||
      v.code === V.CAP_POST_CAP_EXCEEDS_PRE_CAP,
  ),
  'B.12 widening attempt rejected');

// Cap-chain validator: flipped precedence rejects.
const flipped: L10HypothesisCapChain = {
  ...mixedChain,
  applied_cap_reasons: [
    L10HypothesisCapReason.NARROW_SPREAD,
    L10HypothesisCapReason.CONTRADICTION_HIGH,
  ],
};
const flipRep = validateL10HypothesisCapChain({ chain: flipped });
assert(
  flipRep.violations.some(v => v.code === V.CAP_PRECEDENCE_VIOLATED),
  'B.13 precedence violation rejected');

// Unregistered cap reason rejects.
const alien: L10HypothesisCapChain = {
  ...mixedChain,
  applied_cap_reasons: [
    'ALIEN_CAP' as L10HypothesisCapReason,
    ...mixedChain.applied_cap_reasons,
  ],
};
const alienRep = validateL10HypothesisCapChain({ chain: alien });
assert(
  alienRep.violations.some(v => v.code === V.CAP_REASON_UNREGISTERED),
  'B.14 unregistered cap reason rejected');

// Required cap missing rejects.
const reqRep = validateL10HypothesisCapChain({
  chain: gRes.cap_chain,
  required_caps: [L10HypothesisCapReason.INVALIDATION_RISK_HIGH],
});
assert(
  reqRep.violations.some(v => v.code === V.CAP_REQUIRED_CAP_MISSING),
  'B.15 required cap not applied rejected');

// Dominance table: every cap reason has a rank.
assert(
  Object.keys(L10_HYPOTHESIS_CAP_DOMINANCE_RANK).length ===
    Object.keys(L10_HYPOTHESIS_CAP_CEILING).length,
  'B.16 every cap reason has both rank and ceiling entries');

assert(
  compareL10HypothesisCapDominance(
    L10HypothesisCapReason.INVALIDATION_RISK_HIGH,
    L10HypothesisCapReason.CONTRADICTION_HIGH,
  ) < 0,
  'B.17 INVALIDATION_RISK_HIGH dominates CONTRADICTION_HIGH');

assert(
  tightestL10HypothesisCap([
    L10HypothesisCapReason.TEMPLATE_RELIABILITY_WEAK,
    L10HypothesisCapReason.INVALIDATION_RISK_HIGH,
  ]) === L10HypothesisCapReason.INVALIDATION_RISK_HIGH,
  'B.18 tightest cap selector picks lowest ceiling');

// Readiness-hint law: tampered hint rejects.
const badHint: L10HypothesisCapChain = {
  ...mixedChain,
  readiness_hint: L10HypothesisCapReadinessHint.CLEAN,
};
const hintRep = validateL10HypothesisCapChain({ chain: badHint });
assert(
  hintRep.violations.some(v => v.code === V.CAP_READINESS_HINT_INCONSISTENT),
  'B.19 readiness hint inconsistent with post_cap rejected');

// Green cap-chain validator happy.
const greenCapRep = validateL10HypothesisCapChain({ chain: gRes.cap_chain });
assert(greenCapRep.ok,
  `B.20 green cap chain passes validator (${
    greenCapRep.violations.map(v => v.code).join(',')})`);

// ═══════════════════════════════════════════════════════════════
// BAND C — Spread + restriction law (§10.7.4 / §10.7.5)
// ═══════════════════════════════════════════════════════════════
console.log('\n=== BAND C: Spread + restriction law ===');

// Default rights per band registered.
assert(
  L10_HYPOTHESIS_DEFAULT_RIGHTS_BY_BAND[
    L10HypothesisRelianceConfidenceBand.HIGH
  ].includes(L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED),
  'C.01 HIGH band default rights include JUDGMENT_SUPPORT_ALLOWED');
assert(
  L10_HYPOTHESIS_DEFAULT_RIGHTS_BY_BAND[
    L10HypothesisRelianceConfidenceBand.UNRESOLVED
  ].includes(L10HypothesisRestrictionRight.EVIDENCE_ONLY),
  'C.02 UNRESOLVED band defaults to EVIDENCE_ONLY');

// Green restriction derivation grants score-driving rights.
const greenRights = new Set(gRes.restriction.rights);
assert(
  greenRights.has(L10HypothesisRestrictionRight.SCENARIO_WEIGHTING_ALLOWED),
  'C.03 green restriction grants SCENARIO_WEIGHTING_ALLOWED');
assert(
  greenRights.has(L10HypothesisRestrictionRight.DETERMINISTIC_SCORING_ALLOWED),
  'C.04 green restriction grants DETERMINISTIC_SCORING_ALLOWED');
assert(
  greenRights.has(L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED),
  'C.05 green restriction grants JUDGMENT_SUPPORT_ALLOWED');
assert(
  !greenRights.has(L10HypothesisRestrictionRight.EVIDENCE_ONLY),
  'C.06 green restriction does not impose EVIDENCE_ONLY');

// Narrow spread narrows rights: ADDITIONAL_CONFIRMATION_REQUIRED and
// JUDGMENT_SUPPORT_ALLOWED removed.
const narrowResult = buildL10HypothesisRelianceProfile({
  ...green.input,
  applied_caps: [L10HypothesisCapReason.NARROW_SPREAD],
  spread_class: L10SpreadClass.NARROW,
});
assert(
  narrowResult.restriction.rights.includes(
    L10HypothesisRestrictionRight.ADDITIONAL_CONFIRMATION_REQUIRED,
  ),
  'C.07 NARROW spread adds ADDITIONAL_CONFIRMATION_REQUIRED');
assert(
  !narrowResult.restriction.rights.includes(
    L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED,
  ),
  'C.08 NARROW spread blocks JUDGMENT_SUPPORT_ALLOWED');

// Active invalidation → evidence-only + final-judgment blocked.
const invResult = buildL10HypothesisRelianceProfile({
  ...green.input,
  applied_caps: [L10HypothesisCapReason.INVALIDATION_RISK_HIGH],
  active_invalidation: true,
});
assert(
  invResult.restriction.rights.includes(
    L10HypothesisRestrictionRight.EVIDENCE_ONLY,
  ),
  'C.09 active invalidation imposes EVIDENCE_ONLY');
assert(
  invResult.restriction.rights.includes(
    L10HypothesisRestrictionRight.FINAL_JUDGMENT_BLOCKED,
  ),
  'C.10 active invalidation imposes FINAL_JUDGMENT_BLOCKED');
assert(
  !invResult.restriction.rights.includes(
    L10HypothesisRestrictionRight.DETERMINISTIC_SCORING_ALLOWED,
  ),
  'C.11 active invalidation strips DETERMINISTIC_SCORING_ALLOWED');

// Blocked fixture surfaces evidence-only + final-judgment blocked.
const blockedRights = new Set(bRes.restriction.rights);
assert(blockedRights.has(L10HypothesisRestrictionRight.EVIDENCE_ONLY),
  'C.12 blocked fixture grants EVIDENCE_ONLY');
assert(blockedRights.has(L10HypothesisRestrictionRight.FINAL_JUDGMENT_BLOCKED),
  'C.13 blocked fixture grants FINAL_JUDGMENT_BLOCKED');

// Green restriction validator happy.
const greenRestRep = validateL10HypothesisRestrictionRights({
  profile: gRes.restriction,
  applied_cap_reasons: gRes.cap_chain.applied_cap_reasons,
  spread_class: green.input.spread_class,
  active_contradiction: green.input.active_contradiction,
  missing_required_confirmations: green.input.material_missing_confirmations,
});
assert(greenRestRep.ok,
  `C.14 green restriction passes validator (${
    greenRestRep.violations.map(v => v.code).join(',')})`);

// Broader-than-state: add JUDGMENT_SUPPORT to blocked fixture rejects.
const forged = {
  ...bRes.restriction,
  rights: [
    ...bRes.restriction.rights,
    L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED,
  ],
};
const forgedRep = validateL10HypothesisRestrictionRights({
  profile: forged,
  applied_cap_reasons: bRes.cap_chain.applied_cap_reasons,
  spread_class: blocked.input.spread_class,
  active_contradiction: blocked.input.active_contradiction,
  missing_required_confirmations: blocked.input.material_missing_confirmations,
});
assert(
  forgedRep.violations.some(v => v.code === V.RESTR_BROADER_THAN_STATE) ||
  forgedRep.violations.some(
    v => v.code === V.RESTR_FINAL_JUDGMENT_UNDER_UNRESOLVED,
  ) ||
  forgedRep.violations.some(
    v => v.code === V.RESTR_SCORE_DRIVING_WITH_EVIDENCE_ONLY,
  ) ||
  forgedRep.violations.some(v => v.code === V.RESTR_BLOCKED_RIGHT_STILL_GRANTED),
  'C.15 broader-than-state grant rejected');

// score-driving + evidence-only rejected precisely.
const sdOnEvidence = {
  ...gRes.restriction,
  rights: [
    L10HypothesisRestrictionRight.DETERMINISTIC_SCORING_ALLOWED,
    L10HypothesisRestrictionRight.EVIDENCE_ONLY,
  ],
  blocked_rights: [],
};
const sdRep = validateL10HypothesisRestrictionRights({
  profile: sdOnEvidence,
  applied_cap_reasons: [],
  spread_class: L10SpreadClass.WIDE,
  active_contradiction: false,
  missing_required_confirmations: false,
});
assert(
  sdRep.violations.some(v => v.code === V.RESTR_SCORE_DRIVING_WITH_EVIDENCE_ONLY),
  'C.16 score-driving + evidence-only rejected');

// Contradiction cap without disclosure rejects.
const noDisclose = {
  ...gRes.restriction,
  rights: [L10HypothesisRestrictionRight.SCENARIO_WEIGHTING_ALLOWED],
  blocked_rights: [],
};
const conRep = validateL10HypothesisRestrictionRights({
  profile: noDisclose,
  applied_cap_reasons: [L10HypothesisCapReason.CONTRADICTION_HIGH],
  spread_class: L10SpreadClass.WIDE,
  active_contradiction: true,
  missing_required_confirmations: false,
});
assert(
  conRep.violations.some(
    v => v.code === V.RESTR_IGNORES_CONTRADICTION_DISCLOSURE,
  ),
  'C.17 contradiction without disclosure rejected');

// Missing confirmation cap without ADDITIONAL_CONFIRMATION rejects.
const noConfirm = {
  ...gRes.restriction,
  rights: [L10HypothesisRestrictionRight.SCENARIO_WEIGHTING_ALLOWED],
  blocked_rights: [],
};
const confRep = validateL10HypothesisRestrictionRights({
  profile: noConfirm,
  applied_cap_reasons: [L10HypothesisCapReason.CONFIRMATION_INCOMPLETE],
  spread_class: L10SpreadClass.WIDE,
  active_contradiction: false,
  missing_required_confirmations: true,
});
assert(
  confRep.violations.some(
    v => v.code === V.RESTR_ADDITIONAL_CONFIRMATION_IGNORED,
  ),
  'C.18 missing confirmation without ADDITIONAL_CONFIRMATION rejected');

// Spread class table exposes every entry.
assert(
  [
    L10SpreadClass.WIDE,
    L10SpreadClass.MODERATE,
    L10SpreadClass.NARROW,
    L10SpreadClass.TIED,
  ].every(sc => typeof sc === 'string'),
  'C.19 spread class enum surface present');

// Registered right set complete.
assert(ALL_L10_HYPOTHESIS_RESTRICTION_RIGHTS.length === 7,
  'C.20 seven canonical restriction rights registered');

// Score-driving right set is exactly deterministic + judgment.
assert(
  L10_HYPOTHESIS_SCORE_DRIVING_RIGHTS.length === 2 &&
  L10_HYPOTHESIS_SCORE_DRIVING_RIGHTS.includes(
    L10HypothesisRestrictionRight.DETERMINISTIC_SCORING_ALLOWED,
  ) &&
  L10_HYPOTHESIS_SCORE_DRIVING_RIGHTS.includes(
    L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED,
  ),
  'C.21 score-driving right set is exactly deterministic + judgment');

// ═══════════════════════════════════════════════════════════════
// BAND D — Readiness law (§10.7.7)
// ═══════════════════════════════════════════════════════════════
console.log('\n=== BAND D: Readiness law ===');

assert(ALL_L10_HYPOTHESIS_RELIANCE_READINESS_CLASSES.length === 5,
  'D.01 five canonical reliance readiness classes registered');

// Green → STRONG_PRIMARY.
assert(
  gRes.profile.readiness ===
    L10HypothesisRelianceReadinessClass.STRONG_PRIMARY,
  'D.02 green fixture summarizes to STRONG_PRIMARY');

// Narrowed → not STRONG and not BLOCKED.
assert(
  nRes.profile.readiness !==
    L10HypothesisRelianceReadinessClass.STRONG_PRIMARY &&
  nRes.profile.readiness !==
    L10HypothesisRelianceReadinessClass.BLOCKED,
  'D.03 narrowed fixture summarizes to non-strong non-blocked');

// Blocked → BLOCKED.
assert(
  bRes.profile.readiness ===
    L10HypothesisRelianceReadinessClass.BLOCKED,
  'D.04 blocked fixture summarizes to BLOCKED');

// Summarizer law spot checks.
assert(
  summarizeL10HypothesisRelianceReadiness({
    band: L10HypothesisRelianceConfidenceBand.HIGH,
    cap_hint: L10HypothesisCapReadinessHint.CLEAN,
    spread_class: L10SpreadClass.WIDE,
    has_evidence_only_right: false,
    has_final_judgment_blocked_right: false,
    active_invalidation: false,
    material_missing_confirmations: false,
  }) === L10HypothesisRelianceReadinessClass.STRONG_PRIMARY,
  'D.05 summarizer: HIGH+CLEAN+WIDE → STRONG_PRIMARY');

assert(
  summarizeL10HypothesisRelianceReadiness({
    band: L10HypothesisRelianceConfidenceBand.HIGH,
    cap_hint: L10HypothesisCapReadinessHint.CLEAN,
    spread_class: L10SpreadClass.TIED,
    has_evidence_only_right: false,
    has_final_judgment_blocked_right: false,
    active_invalidation: false,
    material_missing_confirmations: false,
  }) === L10HypothesisRelianceReadinessClass.UNRESOLVED_COMPETITION,
  'D.06 summarizer: TIED spread → UNRESOLVED_COMPETITION');

assert(
  summarizeL10HypothesisRelianceReadiness({
    band: L10HypothesisRelianceConfidenceBand.UNRESOLVED,
    cap_hint: L10HypothesisCapReadinessHint.BLOCKED,
    spread_class: L10SpreadClass.WIDE,
    has_evidence_only_right: false,
    has_final_judgment_blocked_right: false,
    active_invalidation: false,
    material_missing_confirmations: false,
  }) === L10HypothesisRelianceReadinessClass.BLOCKED,
  'D.07 summarizer: UNRESOLVED band → BLOCKED');

// Forged STRONG_PRIMARY under NARROW spread rejects.
const forgedStrongNarrow = validateL10HypothesisReadiness({
  readiness: L10HypothesisRelianceReadinessClass.STRONG_PRIMARY,
  band: L10HypothesisRelianceConfidenceBand.HIGH,
  cap_hint: L10HypothesisCapReadinessHint.CLEAN,
  spread_class: L10SpreadClass.NARROW,
  granted_rights: [L10HypothesisRestrictionRight.SCENARIO_WEIGHTING_ALLOWED],
  active_invalidation: false,
  material_missing_confirmations: false,
  live_competition: true,
});
assert(
  forgedStrongNarrow.violations.some(
    v => v.code === V.READ_STRONG_UNDER_NARROW_SPREAD,
  ),
  'D.08 STRONG_PRIMARY under NARROW spread rejected');

// Forged STRONG_PRIMARY with active invalidation rejects.
const forgedStrongInv = validateL10HypothesisReadiness({
  readiness: L10HypothesisRelianceReadinessClass.STRONG_PRIMARY,
  band: L10HypothesisRelianceConfidenceBand.HIGH,
  cap_hint: L10HypothesisCapReadinessHint.CLEAN,
  spread_class: L10SpreadClass.WIDE,
  granted_rights: [L10HypothesisRestrictionRight.SCENARIO_WEIGHTING_ALLOWED],
  active_invalidation: true,
  material_missing_confirmations: false,
  live_competition: false,
});
assert(
  forgedStrongInv.violations.some(
    v => v.code === V.READ_STRONG_UNDER_ACTIVE_INVALIDATION,
  ),
  'D.09 STRONG_PRIMARY under active invalidation rejected');

// Forged STRONG_PRIMARY with missing confirmations rejects.
const forgedStrongMiss = validateL10HypothesisReadiness({
  readiness: L10HypothesisRelianceReadinessClass.STRONG_PRIMARY,
  band: L10HypothesisRelianceConfidenceBand.HIGH,
  cap_hint: L10HypothesisCapReadinessHint.CLEAN,
  spread_class: L10SpreadClass.WIDE,
  granted_rights: [L10HypothesisRestrictionRight.SCENARIO_WEIGHTING_ALLOWED],
  active_invalidation: false,
  material_missing_confirmations: true,
  live_competition: false,
});
assert(
  forgedStrongMiss.violations.some(
    v => v.code === V.READ_STRONG_UNDER_MISSING_CONFIRMATIONS,
  ),
  'D.10 STRONG_PRIMARY with missing confirmations rejected');

// NARROWED_PRIMARY without cause rejects.
const forgedNarrow = validateL10HypothesisReadiness({
  readiness: L10HypothesisRelianceReadinessClass.NARROWED_PRIMARY,
  band: L10HypothesisRelianceConfidenceBand.HIGH,
  cap_hint: L10HypothesisCapReadinessHint.CLEAN,
  spread_class: L10SpreadClass.WIDE,
  granted_rights: [L10HypothesisRestrictionRight.SCENARIO_WEIGHTING_ALLOWED],
  active_invalidation: false,
  material_missing_confirmations: false,
  live_competition: false,
});
assert(
  forgedNarrow.violations.some(
    v => v.code === V.READ_NARROWED_WITHOUT_CAUSE,
  ),
  'D.11 NARROWED_PRIMARY without cause rejected');

// UNRESOLVED_COMPETITION without competition rejects (wide spread + no
// live competition flag).
const forgedUnresolved = validateL10HypothesisReadiness({
  readiness: L10HypothesisRelianceReadinessClass.UNRESOLVED_COMPETITION,
  band: L10HypothesisRelianceConfidenceBand.MEDIUM,
  cap_hint: L10HypothesisCapReadinessHint.NARROWED,
  spread_class: L10SpreadClass.WIDE,
  granted_rights: [L10HypothesisRestrictionRight.SCENARIO_WEIGHTING_ALLOWED],
  active_invalidation: false,
  material_missing_confirmations: false,
  live_competition: false,
});
assert(
  forgedUnresolved.violations.some(
    v => v.code === V.READ_UNRESOLVED_WITHOUT_COMPETITION,
  ),
  'D.12 UNRESOLVED_COMPETITION without competition rejected');

// BLOCKED while broad rights granted rejects.
const forgedBlocked = validateL10HypothesisReadiness({
  readiness: L10HypothesisRelianceReadinessClass.BLOCKED,
  band: L10HypothesisRelianceConfidenceBand.UNRESOLVED,
  cap_hint: L10HypothesisCapReadinessHint.BLOCKED,
  spread_class: L10SpreadClass.WIDE,
  granted_rights: [
    L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED,
    L10HypothesisRestrictionRight.FINAL_JUDGMENT_BLOCKED,
  ],
  active_invalidation: false,
  material_missing_confirmations: false,
  live_competition: false,
});
assert(
  forgedBlocked.violations.some(
    v => v.code === V.READ_BLOCKED_WHILE_BROAD_RIGHTS_GRANTED,
  ),
  'D.13 BLOCKED while score-driving right granted rejected');

// Green readiness validator happy.
const gRights = gRes.restriction.rights;
const greenReadRep = validateL10HypothesisReadiness({
  readiness: gRes.profile.readiness,
  band: gRes.profile.confidence_band,
  cap_hint: gRes.cap_chain.readiness_hint,
  spread_class: gRes.profile.spread_class,
  granted_rights: gRights,
  active_invalidation: green.input.active_invalidation,
  material_missing_confirmations: green.input.material_missing_confirmations,
  live_competition: false,
});
assert(greenReadRep.ok,
  `D.14 green readiness passes validator (${
    greenReadRep.violations.map(v => v.code).join(',')})`);

// Reliance-profile validator happy on green fixture.
const greenRelRep = validateL10HypothesisRelianceProfile({
  profile: gRes.profile,
  active_invalidation: green.input.active_invalidation,
  material_missing_confirmations: green.input.material_missing_confirmations,
  live_competition: false,
});
assert(greenRelRep.ok,
  `D.15 green reliance profile passes validator (${
    greenRelRep.violations.map(v => v.code).join(',')})`);

// Reliance-profile: forged declared band mismatch rejects.
const forgedRel = {
  ...gRes.profile,
  confidence_band: L10HypothesisRelianceConfidenceBand.UNRESOLVED,
};
const forgedRelRep = validateL10HypothesisRelianceProfile({
  profile: forgedRel,
  active_invalidation: false,
  material_missing_confirmations: false,
  live_competition: false,
});
assert(
  forgedRelRep.violations.some(v => v.code === V.REL_BAND_MISMATCH),
  'D.16 reliance-profile band mismatch rejected');

// Reliance-profile: forged readiness rejects.
const forgedReadinessRel = {
  ...nRes.profile,
  readiness: L10HypothesisRelianceReadinessClass.STRONG_PRIMARY,
};
const forgedReadRelRep = validateL10HypothesisRelianceProfile({
  profile: forgedReadinessRel,
  active_invalidation: false,
  material_missing_confirmations: true,
  live_competition: false,
});
assert(
  forgedReadRelRep.violations.some(v => v.code === V.REL_READINESS_INCONSISTENT),
  'D.17 reliance-profile forged readiness rejected');

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit + invariants (§10.7.10.1 / §10.7.11)
// ═══════════════════════════════════════════════════════════════
console.log('\n=== BAND E: Audit + invariants ===');

// Severity classification deterministic.
assert(
  classifyL10RelianceAuditSeverity(V.CAP_POST_CAP_EXCEEDS_CEILING) ===
    L10RelianceAuditSeverity.CRITICAL,
  'E.01 CAP_POST_CAP_EXCEEDS_CEILING classified CRITICAL');
assert(
  classifyL10RelianceAuditSeverity(V.CONF_FACTOR_GROUP_MISSING) ===
    L10RelianceAuditSeverity.HIGH,
  'E.02 CONF_FACTOR_GROUP_MISSING classified HIGH');
assert(
  classifyL10RelianceAuditSeverity(V.CAP_REASON_UNREGISTERED) ===
    L10RelianceAuditSeverity.WARNING,
  'E.03 CAP_REASON_UNREGISTERED classified WARNING');
assert(
  classifyL10RelianceAuditSeverity(
    V.CONF_SECONDARY_IMPLIED_WITHOUT_REF,
  ) === L10RelianceAuditSeverity.WARNING,
  'E.04 CONF_SECONDARY_IMPLIED_WITHOUT_REF classified WARNING');

// Tier → surface mapping correctness.
assert(
  l10RelianceAuditSurfaceForTier(
    L10HypothesisRelianceViolationTier.CONFIDENCE,
  ) === L10RelianceAuditSurface.CONFIDENCE,
  'E.05 CONFIDENCE tier maps to CONFIDENCE surface');
assert(
  l10RelianceAuditSurfaceForTier(
    L10HypothesisRelianceViolationTier.REGIME,
  ) === L10RelianceAuditSurface.REGIME_INTERACTION,
  'E.06 REGIME tier maps to REGIME_INTERACTION surface');
assert(
  l10RelianceAuditSurfaceForTier(
    L10HypothesisRelianceViolationTier.SEQUENCE,
  ) === L10RelianceAuditSurface.SEQUENCE_INTERACTION,
  'E.07 SEQUENCE tier maps to SEQUENCE_INTERACTION surface');

// Violation tier mapping law.
assert(
  l10HypothesisRelianceViolationTier(V.CAP_POST_CAP_EXCEEDS_CEILING) ===
    L10HypothesisRelianceViolationTier.CAP_CHAIN,
  'E.08 CAP_* code → CAP_CHAIN tier');
assert(
  l10HypothesisRelianceViolationTier(V.REL_READINESS_INCONSISTENT) ===
    L10HypothesisRelianceViolationTier.RELIANCE,
  'E.09 REL_* code → RELIANCE tier');
assert(
  l10HypothesisRelianceViolationTier(V.REGIME_OVERRIDE_ATTEMPTED) ===
    L10HypothesisRelianceViolationTier.REGIME,
  'E.10 REGIME_* code → REGIME tier');

// Audit emission: green pipeline emits zero records.
const greenAudit = buildL10RelianceAuditRecords({ violations: [] });
assert(greenAudit.length === 0,
  'E.11 empty violation set produces zero audit records');

const greenSummary = summariseL10RelianceAudit(greenAudit);
assert(greenSummary.all_clean,
  'E.12 empty audit reports all_clean');

// Perturbed surface produces audit records.
const perturbed = buildL10RelianceAuditRecords({
  violations: [
    {
      code: V.CAP_POST_CAP_EXCEEDS_CEILING,
      tier: L10HypothesisRelianceViolationTier.CAP_CHAIN,
      detail: 'forged widening',
    },
    {
      code: V.RESTR_BROADER_THAN_STATE,
      tier: L10HypothesisRelianceViolationTier.RESTRICTION,
      detail: 'forged broader rights',
    },
    {
      code: V.CAP_REASON_UNREGISTERED,
      tier: L10HypothesisRelianceViolationTier.CAP_CHAIN,
      detail: 'alien cap',
    },
  ],
  clock: () => '2026-01-01T00:00:00.000Z',
  id_prefix: 'l10rel-test',
});
const perturbedSummary = summariseL10RelianceAudit(perturbed);
assert(perturbed.length === 3,
  'E.13 three violations → three audit records');
assert(perturbedSummary.total === 3,
  'E.14 audit summary total = 3');
assert(perturbedSummary.by_severity[L10RelianceAuditSeverity.CRITICAL] === 2,
  'E.15 two CRITICAL records counted');
assert(perturbedSummary.by_severity[L10RelianceAuditSeverity.WARNING] === 1,
  'E.16 one WARNING record counted');
assert(perturbedSummary.by_surface[L10RelianceAuditSurface.CAP_CHAIN] === 2,
  'E.17 two CAP_CHAIN surface records counted');
assert(!perturbedSummary.all_clean,
  'E.18 perturbed audit is not all_clean');

// Deterministic clock/id: re-run same input → identical records.
const perturbed2 = buildL10RelianceAuditRecords({
  violations: [
    {
      code: V.CAP_POST_CAP_EXCEEDS_CEILING,
      tier: L10HypothesisRelianceViolationTier.CAP_CHAIN,
      detail: 'forged widening',
    },
  ],
  clock: () => '2026-01-01T00:00:00.000Z',
  id_prefix: 'l10rel-test',
});
assert(
  perturbed2[0].id === 'l10rel-test-0000' &&
  perturbed2[0].timestamp === '2026-01-01T00:00:00.000Z' &&
  perturbed2[0].severity === L10RelianceAuditSeverity.CRITICAL,
  'E.19 audit record emission is deterministic');

// Invariants INV-10.7-A..G all hold.
const invs = runAllL10_7Invariants();
assert(invs.length === 7, 'E.20 seven invariants run');
for (let i = 0; i < invs.length; i++) {
  const r = invs[i];
  const letter = String.fromCharCode('A'.charCodeAt(0) + i);
  assert(r.holds, `E.${21 + i} ${r.id} (INV-10.7-${letter}) — ${r.evidence}`);
}

// Cross-check individual invariant getters.
assert(checkINV_107_A().holds, 'E.28 checkINV_107_A() holds');
assert(checkINV_107_B().holds, 'E.29 checkINV_107_B() holds');
assert(checkINV_107_C().holds, 'E.30 checkINV_107_C() holds');
assert(checkINV_107_D().holds, 'E.31 checkINV_107_D() holds');
assert(checkINV_107_E().holds, 'E.32 checkINV_107_E() holds');
assert(checkINV_107_F().holds, 'E.33 checkINV_107_F() holds');
assert(checkINV_107_G().holds, 'E.34 checkINV_107_G() holds');

// Replay identity on the whole pipeline.
const gResReplay = buildL10HypothesisRelianceProfile(green.input);
assert(
  gResReplay.profile.replay_hash === gRes.profile.replay_hash,
  'E.35 reliance profile replay hash deterministic');
assert(
  gResReplay.cap_chain.post_cap_score === gRes.cap_chain.post_cap_score,
  'E.36 cap chain post_cap_score deterministic');
assert(
  gResReplay.restriction.replay_hash === gRes.restriction.replay_hash,
  'E.37 restriction replay hash deterministic');

// Extra sanity: standalone engines compose the same restriction on
// green inputs.
const rebuiltRestriction = buildL10HypothesisRestrictionProfile({
  hypothesis_subject_id: green.input.hypothesis_subject_id,
  band: gRes.profile.confidence_band,
  cap_chain: gRes.cap_chain,
  spread_class: green.input.spread_class,
  active_contradiction: green.input.active_contradiction,
  active_invalidation: green.input.active_invalidation,
  material_missing_confirmations: green.input.material_missing_confirmations,
  lineage_refs: green.input.lineage_refs,
  policy_version: green.input.policy_version,
});
assert(
  rebuiltRestriction.replay_hash === gRes.restriction.replay_hash,
  'E.38 standalone restriction engine matches composite engine');

// Extra sanity: standalone confidence engine replay-stable.
const rebuiltConf = buildL10HypothesisConfidenceProfile({
  hypothesis_subject_id: green.input.hypothesis_subject_id,
  primary_hypothesis_ref: green.input.primary_hypothesis_ref,
  secondary_hypothesis_ref: green.input.secondary_hypothesis_ref,
  contributions: green.input.contributions,
  applied_caps: green.input.applied_caps,
  lineage_refs: green.input.lineage_refs,
  policy_version: green.input.policy_version,
});
assert(
  rebuiltConf.profile.replay_hash === gRes.confidence.replay_hash,
  'E.39 standalone confidence engine matches composite engine');

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n=====================================================');
console.log(`L10.7 certification: ${passed} passed, ${failed} failed`);
console.log('=====================================================');
if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
