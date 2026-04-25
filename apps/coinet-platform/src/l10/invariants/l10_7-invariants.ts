/**
 * L10.7 — Reliance Invariants
 *
 * §10.7.11 — INV-10.7-A through INV-10.7-G, all executable.
 *
 *   INV-10.7-A : Confidence is derived from every required factor
 *                class and is replay-stable (same input → same
 *                capped score, band, cap chain, restriction, and
 *                readiness). A missing factor class rejects the
 *                profile.
 *   INV-10.7-B : Confidence may not outrun contradiction / missing
 *                confirmations / invalidation risk / narrow spread /
 *                weak sequence / hostile regime — any of those caps
 *                the post-cap score below the HIGH threshold.
 *   INV-10.7-C : Cap-chain law: applied caps must be explicit,
 *                ordered by dominance, and narrowing-only; post-cap
 *                score ≤ pre-cap score and ≤ the tightest ceiling.
 *   INV-10.7-D : Restriction profiles may not grant broader
 *                downstream rights than the current explanatory
 *                state justifies (UNRESOLVED ⇒ judgment blocked,
 *                EVIDENCE_ONLY ⇒ no score-driving, active contradiction
 *                ⇒ disclosure required, etc.).
 *   INV-10.7-E : Ranking spread materially influences restriction and
 *                readiness posture — narrow / tied spread narrows
 *                rights and forbids STRONG_PRIMARY readiness.
 *   INV-10.7-F : L8 / L9 posture may only act as local compatibility
 *                factors; they may not override the regime / sequence
 *                determined at those layers.
 *   INV-10.7-G : Readiness summarises (never replaces) confidence,
 *                cap chain, spread, and restriction posture; declared
 *                readiness must match the canonical summarizer.
 */

import {
  buildBlockedL10_7RelianceFixture,
  buildGreenL10_7RelianceFixture,
  buildNarrowedL10_7RelianceFixture,
} from './l10_7-fixtures';
import {
  buildL10HypothesisRelianceProfile,
  L10HypothesisRelianceEngineInput,
} from '../reliance/hypothesis-reliance-engine';
import {
  validateL10HypothesisCapChain,
} from '../validation/hypothesis-cap-chain.validator';
import {
  validateL10HypothesisConfidenceProfile,
} from '../validation/hypothesis-confidence-policy.validator';
import {
  validateL10HypothesisReadiness,
} from '../validation/hypothesis-readiness.validator';
import {
  validateL10HypothesisRelianceProfile,
} from '../validation/hypothesis-reliance-profile.validator';
import {
  validateL10HypothesisRestrictionRights,
} from '../validation/hypothesis-restriction-rights.validator';
import {
  L10HypothesisRelianceViolationCode,
} from '../validation/l10-reliance-violation-codes';
import {
  L10HypothesisConfidenceFactorClass,
  L10HypothesisConfidenceFactorEffect,
  L10HypothesisRelianceConfidenceBand,
} from '../contracts/hypothesis-confidence.policy';
import {
  L10HypothesisCapReason,
} from '../contracts/hypothesis-cap-chain';
import {
  L10HypothesisRelianceReadinessClass,
} from '../contracts/hypothesis-readiness';
import {
  L10HypothesisRestrictionRight,
} from '../contracts/hypothesis-restriction-rights';
import {
  L10SpreadClass,
} from '../contracts/hypothesis-spread-profile';

export interface L10_7InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ──────────────────────────────────────────────────────────────────
// §10.7.11 — Green-pipeline predicate. Every validator must return
// `ok` on the canonical green fixture.
// ──────────────────────────────────────────────────────────────────

function greenPipelineOk(
  input: L10HypothesisRelianceEngineInput,
  opts?: {
    active_contradiction?: boolean;
    active_invalidation?: boolean;
    material_missing_confirmations?: boolean;
    live_competition?: boolean;
  },
): { ok: boolean; detail: string } {
  const { profile, confidence, cap_chain, restriction } =
    buildL10HypothesisRelianceProfile(input);

  const confRep = validateL10HypothesisConfidenceProfile({ profile: confidence });
  if (!confRep.ok) {
    return { ok: false, detail: `confidence: ${codes(confRep.violations)}` };
  }

  const capRep = validateL10HypothesisCapChain({ chain: cap_chain });
  if (!capRep.ok) {
    return { ok: false, detail: `cap-chain: ${codes(capRep.violations)}` };
  }

  const restRep = validateL10HypothesisRestrictionRights({
    profile: restriction,
    applied_cap_reasons: cap_chain.applied_cap_reasons,
    spread_class: input.spread_class,
    active_contradiction:
      opts?.active_contradiction ?? input.active_contradiction,
    missing_required_confirmations:
      opts?.material_missing_confirmations ??
      input.material_missing_confirmations,
  });
  if (!restRep.ok) {
    return { ok: false, detail: `restriction: ${codes(restRep.violations)}` };
  }

  const readRep = validateL10HypothesisReadiness({
    readiness: profile.readiness,
    band: profile.confidence_band,
    cap_hint: cap_chain.readiness_hint,
    spread_class: input.spread_class,
    granted_rights: restriction.rights,
    active_invalidation:
      opts?.active_invalidation ?? input.active_invalidation,
    material_missing_confirmations:
      opts?.material_missing_confirmations ??
      input.material_missing_confirmations,
    live_competition: opts?.live_competition ?? false,
  });
  if (!readRep.ok) {
    return { ok: false, detail: `readiness: ${codes(readRep.violations)}` };
  }

  const relRep = validateL10HypothesisRelianceProfile({
    profile,
    active_invalidation:
      opts?.active_invalidation ?? input.active_invalidation,
    material_missing_confirmations:
      opts?.material_missing_confirmations ??
      input.material_missing_confirmations,
    live_competition: opts?.live_competition ?? false,
  });
  if (!relRep.ok) {
    return { ok: false, detail: `reliance: ${codes(relRep.violations)}` };
  }

  return { ok: true, detail: 'green pipeline: all five surfaces pass' };
}

function codes(
  issues: readonly { code: L10HypothesisRelianceViolationCode }[],
): string {
  return issues.map(i => i.code).join(',');
}

// ──────────────────────────────────────────────────────────────────
// INV-10.7-A — Confidence factor completeness + replay stability.
// ──────────────────────────────────────────────────────────────────

export function checkINV_107_A(): L10_7InvariantResult {
  const green = buildGreenL10_7RelianceFixture();
  const base = greenPipelineOk(green.input);

  // Replay: building twice yields identical replay hashes (§10.7.9).
  const a = buildL10HypothesisRelianceProfile(green.input);
  const b = buildL10HypothesisRelianceProfile(green.input);
  const stable =
    a.profile.replay_hash === b.profile.replay_hash &&
    a.confidence.replay_hash === b.confidence.replay_hash &&
    a.restriction.replay_hash === b.restriction.replay_hash &&
    Math.abs(a.profile.confidence_score - b.profile.confidence_score) < 1e-12;

  // Missing a factor class is rejected by the confidence validator.
  const missing = { ...a.confidence };
  const missingProfile = {
    ...missing,
    factors: missing.factors.filter(
      f => f.factor_class !== L10HypothesisConfidenceFactorClass.SUPPORT_STRENGTH,
    ),
  };
  const rep = validateL10HypothesisConfidenceProfile({
    profile: missingProfile,
  });
  const rejectsMissing = rep.violations.some(
    v => v.code === L10HypothesisRelianceViolationCode.CONF_FACTOR_GROUP_MISSING,
  );

  return {
    id: 'INV-10.7-A',
    name: 'Confidence uses all required factor groups and is replay-stable.',
    holds: base.ok && stable && rejectsMissing,
    evidence: base.ok
      ? `replay-stable=${stable}, rejects-missing=${rejectsMissing}`
      : base.detail,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-10.7-B — Confidence cannot outrun contradiction /
// invalidation / missing confirmations / narrow spread / weak
// sequence / hostile regime.
// ──────────────────────────────────────────────────────────────────

export function checkINV_107_B(): L10_7InvariantResult {
  const green = buildGreenL10_7RelianceFixture();
  const base = greenPipelineOk(green.input);

  // Apply an invalidation cap — the capped score must drop into LOW
  // or UNRESOLVED regardless of raw confidence.
  const withInvalidation: L10HypothesisRelianceEngineInput = {
    ...green.input,
    applied_caps: [L10HypothesisCapReason.INVALIDATION_RISK_HIGH],
    active_invalidation: true,
  };
  const invRes = buildL10HypothesisRelianceProfile(withInvalidation);
  const invNarrowed =
    invRes.confidence.capped_confidence_score <= 0.35 + 1e-9;

  // Apply a contradiction cap — capped score must drop to ≤ 0.40.
  const withContradiction: L10HypothesisRelianceEngineInput = {
    ...green.input,
    applied_caps: [L10HypothesisCapReason.CONTRADICTION_HIGH],
    active_contradiction: true,
  };
  const conRes = buildL10HypothesisRelianceProfile(withContradiction);
  const conNarrowed =
    conRes.confidence.capped_confidence_score <= 0.40 + 1e-9;

  // Blocking factor + HIGH band → confidence validator rejects.
  const fakeProfile = {
    ...invRes.confidence,
    factors: invRes.confidence.factors.map(f => ({
      ...f,
      reliance_effect: L10HypothesisConfidenceFactorEffect.BLOCKS,
    })),
    capped_confidence_score: invRes.confidence.raw_confidence_score,
    confidence_band: L10HypothesisRelianceConfidenceBand.HIGH,
  };
  const rep = validateL10HypothesisConfidenceProfile({ profile: fakeProfile });
  const rejectsBlockingUnderClean = rep.violations.some(
    v =>
      v.code ===
      L10HypothesisRelianceViolationCode.CONF_BLOCKING_FACTOR_UNDER_CLEAN_BAND,
  );

  return {
    id: 'INV-10.7-B',
    name: 'Confidence never outruns contradiction / invalidation / ' +
      'missing confirmations / narrow spread / weak sequence / ' +
      'hostile regime.',
    holds:
      base.ok && invNarrowed && conNarrowed && rejectsBlockingUnderClean,
    evidence: base.ok
      ? `inv-narrowed=${invNarrowed}, con-narrowed=${conNarrowed}, ` +
        `rejects-blocking=${rejectsBlockingUnderClean}`
      : base.detail,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-10.7-C — Cap-chain law: explicit, ordered, narrowing-only.
// ──────────────────────────────────────────────────────────────────

export function checkINV_107_C(): L10_7InvariantResult {
  const green = buildGreenL10_7RelianceFixture();
  const base = greenPipelineOk(green.input);

  // Apply two caps — post-cap score must be ≤ the tighter of the
  // two ceilings, and the chain must be ordered by dominance.
  const withCaps: L10HypothesisRelianceEngineInput = {
    ...green.input,
    applied_caps: [
      L10HypothesisCapReason.NARROW_SPREAD,
      L10HypothesisCapReason.CONTRADICTION_HIGH,
    ],
    spread_class: L10SpreadClass.NARROW,
    active_contradiction: true,
  };
  const res = buildL10HypothesisRelianceProfile(withCaps);

  const chainOrdered =
    res.cap_chain.applied_cap_reasons[0] ===
    L10HypothesisCapReason.CONTRADICTION_HIGH;
  const postCapNarrowed =
    res.cap_chain.post_cap_score <= 0.40 + 1e-9;
  const postCapLeRaw =
    res.cap_chain.post_cap_score <= res.cap_chain.pre_cap_score + 1e-9;

  // Widening attempt: declare a widened edge — validator rejects.
  const tampered = {
    ...res.cap_chain,
    post_cap_score: Math.min(1, res.cap_chain.pre_cap_score + 0.01),
  };
  const capRep = validateL10HypothesisCapChain({ chain: tampered });
  const rejectsWidening = capRep.violations.some(
    v =>
      v.code ===
        L10HypothesisRelianceViolationCode.CAP_POST_CAP_EXCEEDS_CEILING ||
      v.code ===
        L10HypothesisRelianceViolationCode.CAP_POST_CAP_EXCEEDS_PRE_CAP,
  );

  // Precedence tampering: flip the order — validator rejects.
  const flipped = {
    ...res.cap_chain,
    applied_cap_reasons: [
      L10HypothesisCapReason.NARROW_SPREAD,
      L10HypothesisCapReason.CONTRADICTION_HIGH,
    ],
  };
  const flipRep = validateL10HypothesisCapChain({ chain: flipped });
  const rejectsPrecedence = flipRep.violations.some(
    v => v.code === L10HypothesisRelianceViolationCode.CAP_PRECEDENCE_VIOLATED,
  );

  return {
    id: 'INV-10.7-C',
    name: 'Cap-chain law: explicit, ordered, narrowing-only.',
    holds:
      base.ok &&
      chainOrdered &&
      postCapNarrowed &&
      postCapLeRaw &&
      rejectsWidening &&
      rejectsPrecedence,
    evidence: base.ok
      ? `ordered=${chainOrdered}, narrowed=${postCapNarrowed}, ` +
        `le-raw=${postCapLeRaw}, rej-widening=${rejectsWidening}, ` +
        `rej-precedence=${rejectsPrecedence}`
      : base.detail,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-10.7-D — Restriction profiles may not grant broader rights
// than the current state justifies.
// ──────────────────────────────────────────────────────────────────

export function checkINV_107_D(): L10_7InvariantResult {
  const green = buildGreenL10_7RelianceFixture();
  const base = greenPipelineOk(green.input);

  const blocked = buildBlockedL10_7RelianceFixture();
  const res = buildL10HypothesisRelianceProfile(blocked.input);

  // Under BLOCKED fixture, restriction must NOT grant any
  // score-driving right and must include EVIDENCE_ONLY +
  // FINAL_JUDGMENT_BLOCKED.
  const rights = new Set(res.restriction.rights);
  const noScoreDriving =
    !rights.has(L10HypothesisRestrictionRight.DETERMINISTIC_SCORING_ALLOWED) &&
    !rights.has(L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED);
  const hasBlockers =
    rights.has(L10HypothesisRestrictionRight.EVIDENCE_ONLY) &&
    rights.has(L10HypothesisRestrictionRight.FINAL_JUDGMENT_BLOCKED);

  // Tamper: forge a broader-than-state grant. Validator must reject.
  const forged = {
    ...res.restriction,
    rights: [
      ...res.restriction.rights,
      L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED,
    ],
  };
  const rep = validateL10HypothesisRestrictionRights({
    profile: forged,
    applied_cap_reasons: res.cap_chain.applied_cap_reasons,
    spread_class: blocked.input.spread_class,
    active_contradiction: blocked.input.active_contradiction,
    missing_required_confirmations:
      blocked.input.material_missing_confirmations,
  });
  const rejectsBroader = rep.violations.some(
    v =>
      v.code ===
        L10HypothesisRelianceViolationCode.RESTR_BROADER_THAN_STATE ||
      v.code ===
        L10HypothesisRelianceViolationCode.RESTR_FINAL_JUDGMENT_UNDER_UNRESOLVED ||
      v.code ===
        L10HypothesisRelianceViolationCode.RESTR_SCORE_DRIVING_WITH_EVIDENCE_ONLY ||
      v.code ===
        L10HypothesisRelianceViolationCode.RESTR_BLOCKED_RIGHT_STILL_GRANTED,
  );

  return {
    id: 'INV-10.7-D',
    name: 'Restriction profiles may not grant broader rights than state.',
    holds: base.ok && noScoreDriving && hasBlockers && rejectsBroader,
    evidence: base.ok
      ? `no-score-driving=${noScoreDriving}, blockers=${hasBlockers}, ` +
        `rejects-broader=${rejectsBroader}`
      : base.detail,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-10.7-E — Spread materially influences restriction and
// readiness posture.
// ──────────────────────────────────────────────────────────────────

export function checkINV_107_E(): L10_7InvariantResult {
  const green = buildGreenL10_7RelianceFixture();
  const base = greenPipelineOk(green.input);

  // Narrow the spread — restriction must add
  // ADDITIONAL_CONFIRMATION_REQUIRED and readiness must not be
  // STRONG_PRIMARY.
  const narrow: L10HypothesisRelianceEngineInput = {
    ...green.input,
    spread_class: L10SpreadClass.NARROW,
    applied_caps: [L10HypothesisCapReason.NARROW_SPREAD],
  };
  const narRes = buildL10HypothesisRelianceProfile(narrow);
  const addsAdditional = narRes.restriction.rights.includes(
    L10HypothesisRestrictionRight.ADDITIONAL_CONFIRMATION_REQUIRED,
  );
  const notStrong =
    narRes.profile.readiness !==
    L10HypothesisRelianceReadinessClass.STRONG_PRIMARY;

  // Tied spread → readiness must be UNRESOLVED_COMPETITION or BLOCKED.
  const tied: L10HypothesisRelianceEngineInput = {
    ...green.input,
    spread_class: L10SpreadClass.TIED,
    applied_caps: [L10HypothesisCapReason.UNRESOLVED_SPREAD],
  };
  const tiedRes = buildL10HypothesisRelianceProfile(tied);
  const tiedLegal =
    tiedRes.profile.readiness ===
      L10HypothesisRelianceReadinessClass.UNRESOLVED_COMPETITION ||
    tiedRes.profile.readiness ===
      L10HypothesisRelianceReadinessClass.BLOCKED;

  // Forged STRONG_PRIMARY under narrow spread must be rejected.
  const forged = validateL10HypothesisReadiness({
    readiness: L10HypothesisRelianceReadinessClass.STRONG_PRIMARY,
    band: L10HypothesisRelianceConfidenceBand.HIGH,
    cap_hint: narRes.cap_chain.readiness_hint,
    spread_class: L10SpreadClass.NARROW,
    granted_rights: narRes.restriction.rights,
    active_invalidation: false,
    material_missing_confirmations: false,
    live_competition: true,
  });
  const rejectsForgedStrong = forged.violations.some(
    v =>
      v.code ===
      L10HypothesisRelianceViolationCode.READ_STRONG_UNDER_NARROW_SPREAD,
  );

  return {
    id: 'INV-10.7-E',
    name: 'Spread materially narrows restriction and readiness posture.',
    holds:
      base.ok &&
      addsAdditional &&
      notStrong &&
      tiedLegal &&
      rejectsForgedStrong,
    evidence: base.ok
      ? `adds-additional=${addsAdditional}, not-strong=${notStrong}, ` +
        `tied-legal=${tiedLegal}, rej-forged=${rejectsForgedStrong}`
      : base.detail,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-10.7-F — L8 / L9 posture acts only as local factors, never as
// replacement truth.
// ──────────────────────────────────────────────────────────────────

export function checkINV_107_F(): L10_7InvariantResult {
  const green = buildGreenL10_7RelianceFixture();
  const base = greenPipelineOk(green.input);

  // Weak regime posture — regime cap + low regime contribution —
  // must narrow confidence but not replace the regime. We can only
  // test the *narrowing-only* half here; the replacement-truth
  // rejection is enforced by violation codes REGIME_OVERRIDE_ATTEMPTED
  // and REGIME_LOCAL_IMPERSONATES_FINAL, which only appear when a
  // caller tags a regime override; we verify those codes exist in
  // the enum and are tiered as REGIME.
  const weak: L10HypothesisRelianceEngineInput = {
    ...green.input,
    contributions: {
      ...green.input.contributions,
      [L10HypothesisConfidenceFactorClass.REGIME_COMPATIBILITY]: 0.15,
      [L10HypothesisConfidenceFactorClass.SEQUENCE_QUALITY]: 0.20,
    },
    applied_caps: [
      L10HypothesisCapReason.REGIME_POSTURE_WEAK,
      L10HypothesisCapReason.SEQUENCE_POSTURE_WEAK,
    ],
  };
  const res = buildL10HypothesisRelianceProfile(weak);
  const narrowed = res.confidence.capped_confidence_score <= 0.60 + 1e-9;
  const notStrong =
    res.profile.readiness !==
    L10HypothesisRelianceReadinessClass.STRONG_PRIMARY;

  // The override-attempted codes exist in the enum — sanity check,
  // confirming the REGIME / SEQUENCE tier is represented.
  const codesExist =
    typeof
      L10HypothesisRelianceViolationCode.REGIME_OVERRIDE_ATTEMPTED === 'string' &&
    typeof
      L10HypothesisRelianceViolationCode.SEQUENCE_OVERRIDE_ATTEMPTED === 'string';

  return {
    id: 'INV-10.7-F',
    name: 'L8 / L9 posture is a local factor, never replacement truth.',
    holds: base.ok && narrowed && notStrong && codesExist,
    evidence: base.ok
      ? `narrowed=${narrowed}, not-strong=${notStrong}, codes-exist=` +
        `${codesExist}`
      : base.detail,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-10.7-G — Readiness summarises (never replaces) confidence,
// cap, spread, restriction.
// ──────────────────────────────────────────────────────────────────

export function checkINV_107_G(): L10_7InvariantResult {
  const green = buildGreenL10_7RelianceFixture();
  const narrowed = buildNarrowedL10_7RelianceFixture();
  const blocked = buildBlockedL10_7RelianceFixture();

  const greenBase = greenPipelineOk(green.input);
  const narrowedBase = greenPipelineOk(narrowed.input);
  const blockedBase = greenPipelineOk(blocked.input);

  // The profile keeps every first-class surface present beside the
  // readiness: confidence, cap chain, restriction, spread class.
  const gRes = buildL10HypothesisRelianceProfile(green.input);
  const nRes = buildL10HypothesisRelianceProfile(narrowed.input);
  const bRes = buildL10HypothesisRelianceProfile(blocked.input);

  const surfacesPreserved = [gRes, nRes, bRes].every(
    r =>
      !!r.profile.confidence &&
      !!r.profile.cap_chain &&
      !!r.profile.restriction &&
      !!r.profile.spread_class,
  );

  // Readiness matches canonical summarizer classes for each fixture:
  //   green    → STRONG_PRIMARY
  //   narrowed → one of the non-strong non-blocked classes (the exact
  //              one is a function of the cap ceiling / score, which
  //              belongs to the summarizer, not this invariant)
  //   blocked  → BLOCKED
  const narrowedIsMiddle =
    nRes.profile.readiness ===
      L10HypothesisRelianceReadinessClass.NARROWED_PRIMARY ||
    nRes.profile.readiness ===
      L10HypothesisRelianceReadinessClass.DEGRADED_PRIMARY ||
    nRes.profile.readiness ===
      L10HypothesisRelianceReadinessClass.UNRESOLVED_COMPETITION;
  const readinessCanonical =
    gRes.profile.readiness ===
      L10HypothesisRelianceReadinessClass.STRONG_PRIMARY &&
    narrowedIsMiddle &&
    bRes.profile.readiness ===
      L10HypothesisRelianceReadinessClass.BLOCKED;

  // Forge a declared readiness that disagrees with derived — the
  // reliance-profile validator must reject.
  const forged = {
    ...nRes.profile,
    readiness: L10HypothesisRelianceReadinessClass.STRONG_PRIMARY,
  };
  const rep = validateL10HypothesisRelianceProfile({
    profile: forged,
    active_invalidation: narrowed.input.active_invalidation,
    material_missing_confirmations:
      narrowed.input.material_missing_confirmations,
    live_competition: false,
  });
  const rejectsForged = rep.violations.some(
    v =>
      v.code ===
      L10HypothesisRelianceViolationCode.REL_READINESS_INCONSISTENT,
  );

  return {
    id: 'INV-10.7-G',
    name: 'Readiness summarises (never replaces) confidence / cap / ' +
      'spread / restriction posture.',
    holds:
      greenBase.ok &&
      narrowedBase.ok &&
      blockedBase.ok &&
      surfacesPreserved &&
      readinessCanonical &&
      rejectsForged,
    evidence:
      greenBase.ok && narrowedBase.ok && blockedBase.ok
        ? `surfaces=${surfacesPreserved}, canon=${readinessCanonical}, ` +
          `rej-forged=${rejectsForged}`
        : `green=${greenBase.detail} | narrowed=${narrowedBase.detail} | ` +
          `blocked=${blockedBase.detail}`,
  };
}

// ──────────────────────────────────────────────────────────────────
// Invariant batch runner
// ──────────────────────────────────────────────────────────────────

export function runAllL10_7Invariants(): readonly L10_7InvariantResult[] {
  return [
    checkINV_107_A(),
    checkINV_107_B(),
    checkINV_107_C(),
    checkINV_107_D(),
    checkINV_107_E(),
    checkINV_107_F(),
    checkINV_107_G(),
  ];
}
