/**
 * L9.7 — Reliance-Governance Invariants
 *
 * §9.7.11 — Seven machine-enforced invariants covering the L9.7
 * lawbook. Every invariant returns a `L9_7InvariantResult` with a
 * boolean `holds` plus an evidence string that replays cleanly under
 * the certification suite.
 *
 *   INV-9.7-A : Reliance determinism — identical inputs produce
 *               identical profiles (same factors, caps, rights,
 *               readiness, replay_hash).
 *   INV-9.7-B : Confidence banding — the band is a pure function of
 *               the *capped* score; a BLOCKS factor cannot coexist
 *               with a HIGH or MEDIUM band.
 *   INV-9.7-C : Cap-chain narrowing — caps may only narrow; post-cap
 *               score never exceeds pre-cap or the tightest ceiling;
 *               widening edges reject.
 *   INV-9.7-D : Rights narrowing — an UNRESOLVED band may not grant
 *               score-driving rights; EVIDENCE_ONLY and score-driving
 *               rights are mutually exclusive.
 *   INV-9.7-E : Causal restraint — forbidden causal language is
 *               detected; STRICT / BLOCKED restraint classes are not
 *               permitted to surface final-judgment rights.
 *   INV-9.7-F : Regime locality — regime shows up only as a local
 *               compatibility factor on the confidence profile; no
 *               reliance output emits a regime classification surface
 *               or attempts to override L8's regime authority.
 *   INV-9.7-G : Anti-leakage + deterministic audit — reliance profiles
 *               carry no judgment/recommendation tokens, and the
 *               audit aggregator is deterministic (stable counts and
 *               order) across identical inputs.
 */

import {
  L9RelianceConfidenceBand,
  L9SequenceConfidenceFactorClass,
  L9SequenceConfidenceFactorEffect,
  L9_REQUIRED_CONFIDENCE_FACTOR_CLASSES,
} from '../contracts/l9_7-sequence-confidence-policy';
import {
  L9SequenceCapReason,
  L9_SEQUENCE_CAP_CEILING,
} from '../contracts/l9_7-sequence-cap-chain';
import {
  L9SequenceRestrictionRight,
  L9_SEQUENCE_SCORE_DRIVING_RIGHTS,
} from '../contracts/l9_7-sequence-restriction-rights';
import {
  L9SequenceCausalRestraintClass,
} from '../contracts/l9_7-sequence-causal-restraint';
import {
  L9SequenceRelianceReadinessClass,
} from '../contracts/l9_7-sequence-reliance-profile';

import {
  L9RelianceConfidenceInput,
  buildL9RelianceConfidenceProfile,
} from '../reliance/sequence-confidence-engine';
import {
  buildL9SequenceCapChain,
} from '../reliance/sequence-cap-chain-engine';
import {
  classifyL9SequenceCausalRestraint,
} from '../reliance/sequence-causal-restraint-engine';
import {
  buildL9SequenceRestrictionProfile,
} from '../reliance/sequence-restriction-engine';
import {
  L9SequenceRelianceEngineInput,
  buildL9SequenceRelianceProfile,
} from '../reliance/sequence-reliance-engine';

import {
  L9SequenceRelianceViolation,
  L9SequenceRelianceViolationCode,
  L9SequenceRelianceViolationTier,
} from '../validation/l9-reliance-violation-codes';
import {
  validateL9SequenceConfidencePolicy,
} from '../validation/sequence-confidence-policy.validator';
import {
  validateL9SequenceCapChain,
} from '../validation/sequence-cap-chain.validator';
import {
  validateL9SequenceRestrictionProfile,
} from '../validation/sequence-restriction-profile.validator';
import {
  validateL9SequenceCausalRestraint,
} from '../validation/sequence-causal-restraint.validator';
import {
  validateL9SequenceRelianceProfile,
} from '../validation/sequence-reliance-profile.validator';
import {
  buildL9RelianceAudit,
} from '../constitution/l9-reliance-audit';

export interface L9_7InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

const POLICY = 'l9.7@1.0.0';

// ────────────────────────────────────────────────────────────────
// Shared deterministic fixture
// ────────────────────────────────────────────────────────────────

/**
 * §9.7.11 — Canonical *clean* reliance input: all factors well above
 * thresholds, no contradiction pressure / decay / ambiguity, no caps.
 * Should land in HIGH band and STRONG readiness.
 */
function cleanConfInput(subject = 's:clean'): L9RelianceConfidenceInput {
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
    lineage_refs: ['lref:clean:1', 'lref:clean:2'],
    policy_version: POLICY,
  };
}

function cleanRelianceInput(subject = 's:clean'): L9SequenceRelianceEngineInput {
  return {
    confidence_input: cleanConfInput(subject),
    causal_input: {
      sequence_subject_id: subject,
      temporal_support_strength: 0.9,
      contradiction_pressure: 0.05,
      decay_burden: 0.05,
      ordering_ambiguity: 0.05,
      provisional_causal_grant: false,
      surfaces: ['clean sequence assessment; no causal claim made'],
      lineage_refs: ['lref:clean:1'],
      policy_version: POLICY,
    },
    contradiction_present: false,
    additional_confirmation_required: false,
    narrowing_notes: [],
    lineage_refs: ['lref:clean:1'],
    policy_version: POLICY,
  };
}

function codeSet(
  vs: readonly { code: L9SequenceRelianceViolationCode }[],
): ReadonlySet<L9SequenceRelianceViolationCode> {
  return new Set(vs.map(v => v.code));
}

// ────────────────────────────────────────────────────────────────
// INV-9.7-A — Reliance determinism
// ────────────────────────────────────────────────────────────────
export function checkINV_97_A(): L9_7InvariantResult {
  const input = cleanRelianceInput('s:det');
  const a = buildL9SequenceRelianceProfile(input);
  const b = buildL9SequenceRelianceProfile(input);

  const equalReplay = a.reliance.replay_hash === b.reliance.replay_hash;
  const equalBand =
    a.reliance.confidence.confidence_band ===
    b.reliance.confidence.confidence_band;
  const equalReadiness = a.reliance.readiness === b.reliance.readiness;
  const equalRights =
    a.reliance.restriction.rights.join(',') ===
    b.reliance.restriction.rights.join(',');
  const equalCaps =
    a.reliance.cap_chain.applied_cap_reasons.join(',') ===
    b.reliance.cap_chain.applied_cap_reasons.join(',');

  const holds =
    equalReplay && equalBand && equalReadiness && equalRights && equalCaps;

  return {
    id: 'INV-9.7-A',
    name: 'Reliance determinism (replay identity)',
    holds,
    evidence:
      `equalReplay=${equalReplay} equalBand=${equalBand}` +
      ` equalReadiness=${equalReadiness} equalRights=${equalRights}` +
      ` equalCaps=${equalCaps}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.7-B — Confidence banding derives from capped, not raw.
//             BLOCKS factor is illegal under HIGH / MEDIUM band.
// ────────────────────────────────────────────────────────────────
export function checkINV_97_B(): L9_7InvariantResult {
  // Start clean, then force a heavy cap. Raw score stays HIGH-ish,
  // capped score falls to the ceiling of CONTRADICTION_PRESSURE_HIGH
  // (0.40) → band must be LOW (>= 0.35, < 0.60).
  const capped = buildL9RelianceConfidenceProfile({
    ...cleanConfInput('s:band'),
    applied_caps: [L9SequenceCapReason.CONTRADICTION_PRESSURE_HIGH],
  });
  const cappedBelowRaw =
    capped.profile.capped_confidence_score <
    capped.profile.raw_confidence_score - 1e-9;
  const bandFromCapped =
    capped.profile.confidence_band === L9RelianceConfidenceBand.LOW;

  // Crafted profile: HIGH band surfaced with a BLOCKS factor → reject
  const base = buildL9RelianceConfidenceProfile(cleanConfInput('s:blk'));
  const tampered = {
    ...base.profile,
    factors: base.profile.factors.map((f, i) =>
      i === 0
        ? { ...f, reliance_effect: L9SequenceConfidenceFactorEffect.BLOCKS }
        : f,
    ),
  };
  const rBlk = validateL9SequenceConfidencePolicy({ profile: tampered });
  const blockingRejected = codeSet(rBlk.violations).has(
    L9SequenceRelianceViolationCode.CONF_BLOCKING_FACTOR_UNDER_CLEAN_BAND,
  );

  // Tampered band: capped score clearly LOW but profile claims HIGH.
  const misbanded = {
    ...base.profile,
    capped_confidence_score: 0.30,
    raw_confidence_score: 0.30,
    confidence_band: L9RelianceConfidenceBand.HIGH,
  };
  const rMisband = validateL9SequenceConfidencePolicy({ profile: misbanded });
  const misbandRejected = codeSet(rMisband.violations).has(
    L9SequenceRelianceViolationCode.CONF_BAND_INCONSISTENT_WITH_CAPPED,
  );

  const holds = cappedBelowRaw && bandFromCapped && blockingRejected && misbandRejected;
  return {
    id: 'INV-9.7-B',
    name: 'Banding on capped score + BLOCKS-under-clean rejection',
    holds,
    evidence:
      `cappedBelowRaw=${cappedBelowRaw} bandFromCapped=${bandFromCapped}` +
      ` blockingRejected=${blockingRejected} misbandRejected=${misbandRejected}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.7-C — Caps may only narrow.
// ────────────────────────────────────────────────────────────────
export function checkINV_97_C(): L9_7InvariantResult {
  const chain = buildL9SequenceCapChain({
    sequence_subject_id: 's:cap',
    pre_cap_score: 0.92,
    applied_caps: [
      L9SequenceCapReason.ORDER_AMBIGUITY_HIGH,
      L9SequenceCapReason.CONTRADICTION_PRESSURE_HIGH,
      L9SequenceCapReason.DECAY_BURDEN_HIGH,
    ],
  });
  const postLEpre = chain.post_cap_score <= chain.pre_cap_score + 1e-9;
  const tightestIsContradiction =
    chain.tightest_cap === L9SequenceCapReason.CONTRADICTION_PRESSURE_HIGH;
  const postAtTightestCeiling =
    Math.abs(
      chain.post_cap_score -
        L9_SEQUENCE_CAP_CEILING[
          L9SequenceCapReason.CONTRADICTION_PRESSURE_HIGH
        ],
    ) < 1e-9;

  // Tampered chain: post_cap_score exceeds pre_cap_score → reject
  const widened = {
    ...chain,
    post_cap_score: chain.pre_cap_score + 0.05,
  };
  const rWid = validateL9SequenceCapChain({ chain: widened });
  const wideningRejected = codeSet(rWid.violations).has(
    L9SequenceRelianceViolationCode.CAP_POST_CAP_EXCEEDS_PRE_CAP,
  );

  // Tampered edge with narrows_to above pre_cap (inert cap posing as
  // a real one) — widening attempt must be flagged.
  const inertEdgeChain = {
    ...chain,
    pre_cap_score: 0.30,
    edges: [
      {
        cap_reason: L9SequenceCapReason.CONTRADICTION_PRESSURE_HIGH,
        dominance_rank: 1,
        narrows_to: 0.40, // above pre_cap=0.30
        note: 'inert',
      },
    ],
    applied_cap_reasons: [L9SequenceCapReason.CONTRADICTION_PRESSURE_HIGH],
    tightest_cap: L9SequenceCapReason.CONTRADICTION_PRESSURE_HIGH,
    post_cap_score: 0.30,
  };
  const rInert = validateL9SequenceCapChain({ chain: inertEdgeChain });
  const inertFlagged = codeSet(rInert.violations).has(
    L9SequenceRelianceViolationCode.CAP_WIDENING_ATTEMPTED,
  );

  const holds =
    postLEpre && tightestIsContradiction && postAtTightestCeiling &&
    wideningRejected && inertFlagged;
  return {
    id: 'INV-9.7-C',
    name: 'Cap-chain narrowing (no widening, tightest rules post-cap)',
    holds,
    evidence:
      `postLEpre=${postLEpre} tightestIsContradiction=${tightestIsContradiction}` +
      ` postAtTightestCeiling=${postAtTightestCeiling}` +
      ` wideningRejected=${wideningRejected} inertFlagged=${inertFlagged}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.7-D — Rights narrowing under UNRESOLVED / EVIDENCE_ONLY.
// ────────────────────────────────────────────────────────────────
export function checkINV_97_D(): L9_7InvariantResult {
  // Drive band to UNRESOLVED via a punishing contribution profile and
  // a heavy cap → band should land UNRESOLVED. Restriction profile
  // derived from that must be EVIDENCE_ONLY + FINAL_JUDGMENT_BLOCKED.
  const unrInput: L9RelianceConfidenceInput = {
    ...cleanConfInput('s:unr'),
    contributions: {
      [L9SequenceConfidenceFactorClass.ORDER_CLARITY]: 0.10,
      [L9SequenceConfidenceFactorClass.LEAD_LAG_STABILITY]: 0.10,
      [L9SequenceConfidenceFactorClass.CHAIN_COMPLETENESS]: 0.10,
      [L9SequenceConfidenceFactorClass.FRESHNESS]: 0.10,
      [L9SequenceConfidenceFactorClass.CONTRADICTION_PRESSURE]: 0.95,
      [L9SequenceConfidenceFactorClass.REGIME_COMPATIBILITY]: 0.10,
      [L9SequenceConfidenceFactorClass.HISTORICAL_RELIABILITY]: 0.10,
      [L9SequenceConfidenceFactorClass.DECAY_BURDEN]: 0.95,
      [L9SequenceConfidenceFactorClass.ORDERING_AMBIGUITY]: 0.95,
    },
    applied_caps: [L9SequenceCapReason.CONTRADICTION_PRESSURE_HIGH],
  };
  const conf = buildL9RelianceConfidenceProfile(unrInput);
  const bandUnresolved =
    conf.profile.confidence_band === L9RelianceConfidenceBand.UNRESOLVED;

  const causal = classifyL9SequenceCausalRestraint({
    sequence_subject_id: 's:unr',
    temporal_support_strength: 0.1,
    contradiction_pressure: 0.95,
    decay_burden: 0.95,
    ordering_ambiguity: 0.95,
    provisional_causal_grant: false,
    surfaces: ['narrowed sequence; no causal claim'],
    lineage_refs: [],
    policy_version: POLICY,
  });

  const restr = buildL9SequenceRestrictionProfile({
    sequence_subject_id: 's:unr',
    driving_band: conf.profile.confidence_band,
    cap_chain: conf.cap_chain,
    contradiction_present: true,
    causal_restraint_class: causal.restraint_class,
    additional_confirmation_required: true,
    narrowing_notes: ['heavy contradiction+decay'],
    lineage_refs: [],
    policy_version: POLICY,
  });
  const evidenceOnly = restr.rights.includes(
    L9SequenceRestrictionRight.EVIDENCE_ONLY,
  );
  const finalBlocked = restr.rights.includes(
    L9SequenceRestrictionRight.FINAL_JUDGMENT_BLOCKED,
  );
  const noScoreDriving = L9_SEQUENCE_SCORE_DRIVING_RIGHTS.every(
    sd => !restr.rights.includes(sd),
  );

  // Crafted broadening: UNRESOLVED band declaring JUDGMENT_SUPPORT_ALLOWED
  const broadened = {
    ...restr,
    rights: [
      ...restr.rights,
      L9SequenceRestrictionRight.JUDGMENT_SUPPORT_ALLOWED,
    ],
  };
  const rBroad = validateL9SequenceRestrictionProfile({
    profile: broadened,
    contradiction_present: true,
    causal_restraint_class: causal.restraint_class,
    additional_confirmation_required: true,
  });
  const broadenedRejected =
    codeSet(rBroad.violations).has(
      L9SequenceRelianceViolationCode.RESTR_BROADER_THAN_STATE,
    ) ||
    codeSet(rBroad.violations).has(
      L9SequenceRelianceViolationCode.RESTR_SCORE_DRIVING_WITH_EVIDENCE_ONLY,
    );

  const holds =
    bandUnresolved && evidenceOnly && finalBlocked && noScoreDriving &&
    broadenedRejected;
  return {
    id: 'INV-9.7-D',
    name: 'Rights narrowing under UNRESOLVED + EVIDENCE_ONLY exclusivity',
    holds,
    evidence:
      `bandUnresolved=${bandUnresolved} evidenceOnly=${evidenceOnly}` +
      ` finalBlocked=${finalBlocked} noScoreDriving=${noScoreDriving}` +
      ` broadenedRejected=${broadenedRejected}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.7-E — Causal restraint.
// ────────────────────────────────────────────────────────────────
export function checkINV_97_E(): L9_7InvariantResult {
  // Clean surfaces → STRICT_RESTRAINT (default)
  const clean = classifyL9SequenceCausalRestraint({
    sequence_subject_id: 's:causal-clean',
    temporal_support_strength: 0.8,
    contradiction_pressure: 0.05,
    decay_burden: 0.05,
    ordering_ambiguity: 0.05,
    provisional_causal_grant: false,
    surfaces: ['temporal sequence observed; causal claim withheld'],
    lineage_refs: [],
    policy_version: POLICY,
  });
  const strictOk =
    clean.restraint_class === L9SequenceCausalRestraintClass.STRICT_RESTRAINT &&
    clean.permits_final_judgment === false;

  // Forbidden causal language in surfaces → BLOCKED_CAUSAL_LANGUAGE
  const blocked = classifyL9SequenceCausalRestraint({
    sequence_subject_id: 's:causal-leak',
    temporal_support_strength: 0.8,
    contradiction_pressure: 0.05,
    decay_burden: 0.05,
    ordering_ambiguity: 0.05,
    provisional_causal_grant: false,
    surfaces: ['the prior accumulation CAUSED the expansion'],
    lineage_refs: [],
    policy_version: POLICY,
  });
  const blockedClass =
    blocked.restraint_class ===
      L9SequenceCausalRestraintClass.BLOCKED_CAUSAL_LANGUAGE &&
    blocked.permits_final_judgment === false &&
    blocked.flagged_tokens.length > 0;

  // Validator must catch an operator who manually sets
  // `permits_final_judgment=true` under BLOCKED_CAUSAL_LANGUAGE.
  const tampered = { ...blocked, permits_final_judgment: true };
  const rBlocked = validateL9SequenceCausalRestraint({ profile: tampered });
  const blockedRejected = codeSet(rBlocked.violations).has(
    L9SequenceRelianceViolationCode.CAUSAL_FINAL_JUDGMENT_UNDER_BLOCKED,
  );

  // Validator must catch STRICT_RESTRAINT + permits_final_judgment=true.
  const strictLeak = { ...clean, permits_final_judgment: true };
  const rStrict = validateL9SequenceCausalRestraint({ profile: strictLeak });
  const strictLeakRejected = codeSet(rStrict.violations).has(
    L9SequenceRelianceViolationCode.CAUSAL_FINAL_JUDGMENT_UNDER_STRICT,
  );

  const holds = strictOk && blockedClass && blockedRejected && strictLeakRejected;
  return {
    id: 'INV-9.7-E',
    name: 'Causal restraint (language detection + final-judgment gating)',
    holds,
    evidence:
      `strictOk=${strictOk} blockedClass=${blockedClass}` +
      ` blockedRejected=${blockedRejected} strictLeakRejected=${strictLeakRejected}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.7-F — Regime locality.
// ────────────────────────────────────────────────────────────────
export function checkINV_97_F(): L9_7InvariantResult {
  // Build a profile with hostile regime compatibility → the engine
  // must record REGIME_COMPATIBILITY as a factor, never as a
  // dedicated regime-classification surface, and the reliance output
  // must carry no regime field at all.
  const hostile: L9RelianceConfidenceInput = {
    ...cleanConfInput('s:regime'),
    contributions: {
      ...cleanConfInput('s:regime').contributions,
      [L9SequenceConfidenceFactorClass.REGIME_COMPATIBILITY]: 0.10,
    },
    applied_caps: [L9SequenceCapReason.REGIME_INCOMPATIBLE],
  };
  const out = buildL9RelianceConfidenceProfile(hostile);
  const regimeFactor = out.profile.factors.find(
    f => f.factor_class === L9SequenceConfidenceFactorClass.REGIME_COMPATIBILITY,
  );
  const regimeIsFactor = regimeFactor !== undefined;

  // Ensure no top-level field on the profile or cap-chain pretends to
  // emit regime authority. We check using runtime reflection.
  const profileKeys = Object.keys(out.profile);
  const capKeys = Object.keys(out.cap_chain);
  const forbiddenRegimeFields = new Set([
    'regime',
    'regime_classification',
    'regime_state',
    'regime_surface',
    'regime_override',
  ]);
  const noRegimeAuthorityFields =
    !profileKeys.some(k => forbiddenRegimeFields.has(k)) &&
    !capKeys.some(k => forbiddenRegimeFields.has(k));

  // Ensure cap chain records REGIME_INCOMPATIBLE as a local cap but
  // does not impersonate a regime classification.
  const capApplied = out.cap_chain.applied_cap_reasons.includes(
    L9SequenceCapReason.REGIME_INCOMPATIBLE,
  );

  // Full reliance output must also not leak.
  const rel = buildL9SequenceRelianceProfile({
    confidence_input: hostile,
    causal_input: {
      sequence_subject_id: 's:regime',
      temporal_support_strength: 0.8,
      contradiction_pressure: 0.05,
      decay_burden: 0.05,
      ordering_ambiguity: 0.05,
      provisional_causal_grant: false,
      surfaces: ['hostile regime; sequence usable only with narrowing'],
      lineage_refs: [],
      policy_version: POLICY,
    },
    contradiction_present: false,
    additional_confirmation_required: true,
    narrowing_notes: ['regime hostile'],
    lineage_refs: [],
    policy_version: POLICY,
  });
  const relKeys = Object.keys(rel.reliance);
  const relNoRegime = !relKeys.some(k => forbiddenRegimeFields.has(k));

  const holds =
    regimeIsFactor && noRegimeAuthorityFields && capApplied && relNoRegime;
  return {
    id: 'INV-9.7-F',
    name: 'Regime locality (factor-only, never authoritative)',
    holds,
    evidence:
      `regimeIsFactor=${regimeIsFactor}` +
      ` noRegimeAuthorityFields=${noRegimeAuthorityFields}` +
      ` capApplied=${capApplied} relNoRegime=${relNoRegime}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.7-G — Anti-leakage + deterministic audit.
// ────────────────────────────────────────────────────────────────
export function checkINV_97_G(): L9_7InvariantResult {
  const input = cleanRelianceInput('s:audit');
  const { reliance, causal_profile } = buildL9SequenceRelianceProfile(input);

  // §9.7.9 / §9.7.11 — reliance surfaces must not carry judgment/
  // recommendation *prose* tokens. Enum labels like
  // `FINAL_JUDGMENT_BLOCKED` are structural grammar, not leakage, so
  // we scan only the free-form text surfaces (narrowing notes,
  // rationale notes, lineage refs) — the same contract L9.6 enforces
  // on family descriptions.
  const leaky =
    /\b(should (?:buy|sell)|recommend|bullish posture|target|entry|exit|trade)\b/i;
  const freeFormSurfaces: string[] = [
    ...reliance.restriction.narrowing_notes,
    ...reliance.restriction.lineage_refs,
    ...causal_profile.rationale_notes,
    ...causal_profile.flagged_tokens,
  ];
  const antiLeakClean = !freeFormSurfaces.some(s => leaky.test(s));

  // Clean input → clean reliance result, causal profile valid, and no
  // violations from the top-level validator.
  const res = validateL9SequenceRelianceProfile({
    reliance,
    causal_profile,
    contradiction_present: false,
    additional_confirmation_required: false,
    expected_policy_version: POLICY,
  });
  const cleanResultOk = res.ok;

  // Deterministic audit: identical violation lists → identical report.
  const fake: L9SequenceRelianceViolation[] = [
    {
      code: L9SequenceRelianceViolationCode.CONF_CAPPED_GT_RAW,
      tier: L9SequenceRelianceViolationTier.CONFIDENCE,
      detail: 'synthetic',
    },
    {
      code: L9SequenceRelianceViolationCode.CAP_WIDENING_ATTEMPTED,
      tier: L9SequenceRelianceViolationTier.CAP_CHAIN,
      detail: 'synthetic',
    },
    {
      code: L9SequenceRelianceViolationCode.RESTR_BROADER_THAN_STATE,
      tier: L9SequenceRelianceViolationTier.RESTRICTION,
      detail: 'synthetic',
    },
  ];
  const a = buildL9RelianceAudit(fake);
  const b = buildL9RelianceAudit(fake);
  const deterministic =
    a.total === b.total &&
    a.highest_severity === b.highest_severity &&
    JSON.stringify(a.by_code) === JSON.stringify(b.by_code) &&
    JSON.stringify(a.by_tier) === JSON.stringify(b.by_tier);

  // Severity for a critical code must be CRITICAL.
  const criticalSev = a.highest_severity === 'CRITICAL';

  const holds = antiLeakClean && cleanResultOk && deterministic && criticalSev;
  return {
    id: 'INV-9.7-G',
    name: 'Anti-leakage + deterministic audit',
    holds,
    evidence:
      `antiLeakClean=${antiLeakClean} cleanResultOk=${cleanResultOk}` +
      ` deterministic=${deterministic} criticalSev=${criticalSev}`,
  };
}

/** §9.7.11 — Aggregated invariant runner. */
export function runAllL9_7Invariants(): readonly L9_7InvariantResult[] {
  return [
    checkINV_97_A(),
    checkINV_97_B(),
    checkINV_97_C(),
    checkINV_97_D(),
    checkINV_97_E(),
    checkINV_97_F(),
    checkINV_97_G(),
  ];
}

/** §9.7.11 — expose canonical readiness-class type so downstream
 *  tree-shaking retains it even if no other imports survive. */
export type _L9_7ReadinessBinding = L9SequenceRelianceReadinessClass;
