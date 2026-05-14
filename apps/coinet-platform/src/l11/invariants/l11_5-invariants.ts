/**
 * L11.5 — Missing-Data and Regime Modifier Invariants (§11.5.18)
 *
 * Eight machine-enforced invariants that prove the missing-data and
 * regime-modifier sublayer is production-ready. Each invariant
 * returns `{ ok, violations, evidence }`.
 *
 *   INV-11.5-A — missing data is never neutral
 *   INV-11.5-B — missing-data behaviour completeness
 *   INV-11.5-C — visibility class law
 *   INV-11.5-D — L8 regime reference law
 *   INV-11.5-E — modifier boundary law
 *   INV-11.5-F — missing-regime interaction law
 *   INV-11.5-G — attribution linkage law
 *   INV-11.5-H — replay determinism law
 */

import {
  L11ScoreOutput,
  L11FormulaEvaluationResult,
  L11ScoreMissingDataProfile,
  L11ScoreRegimeModifier,
  L11MissingRegimeInteraction,
  L11MissingDataConditionClass,
  L11RuntimeMissingDataBehaviorClass,
  L11ScoreVisibilityClass,
  L11MissingDataReadinessEffect,
  L11RegimeModifierType,
  L11ScoreAttribution,
  ALL_L11_REGIME_POSTURE_CODES,
  L11_REGIME_MODIFIER_MATRIX,
  isL11CriticalMissingCondition,
  extractL11MissingDataProfileReplayMaterial,
  canonicalMissingDataProfileReplayHash,
  extractL11RegimeModifierReplayMaterial,
  canonicalRegimeModifierReplayHash,
} from '../contracts';
import {
  L11MissingRegimeIssue,
  L11MissingRegimeViolationCode,
  makeL11MissingRegimeIssue,
} from '../validation/l11-missing-regime-violation-codes';

export interface L11_5InvariantResult {
  readonly ok: boolean;
  readonly violations: readonly L11MissingRegimeIssue[];
  readonly evidence: string;
}

function ok(evidence: string): L11_5InvariantResult {
  return { ok: true, violations: [], evidence };
}
function fail(
  violations: readonly L11MissingRegimeIssue[],
  evidence: string,
): L11_5InvariantResult {
  return { ok: false, violations, evidence };
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.5-A — missing data is never neutral
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_5_A_MissingDataNeverNeutral(args: {
  readonly profile: L11ScoreMissingDataProfile;
}): L11_5InvariantResult {
  const violations: L11MissingRegimeIssue[] = [];
  for (const b of args.profile.applied_behaviors) {
    if (isL11CriticalMissingCondition(b.condition_class) &&
        b.behavior === L11RuntimeMissingDataBehaviorClass.NO_EFFECT_WITH_DISCLOSURE) {
      violations.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_REQUIRED_INPUT_MISSING_BUT_NEUTRAL,
        `critical condition ${b.condition_class} treated as NO_EFFECT_WITH_DISCLOSURE`,
        { input_ref_id: b.missing_input_ref_id }));
    }
    if (b.condition_class === L11MissingDataConditionClass.STALE_REQUIRED_INPUT &&
        b.score_effect === 0 && b.confidence_effect === 0) {
      violations.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_STALE_INPUT_USED_AS_CURRENT,
        `STALE_REQUIRED_INPUT carried zero score & confidence effects`,
        { input_ref_id: b.missing_input_ref_id }));
    }
    if (b.condition_class === L11MissingDataConditionClass.DEGRADED_REQUIRED_INPUT &&
        b.score_effect === 0 && b.confidence_effect === 0) {
      violations.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_DEGRADED_INPUT_USED_AS_FULL_SUPPORT,
        `DEGRADED_REQUIRED_INPUT carried zero score & confidence effects`,
        { input_ref_id: b.missing_input_ref_id }));
    }
    if (b.condition_class === L11MissingDataConditionClass.EVIDENCE_ONLY_INPUT &&
        (b.behavior === L11RuntimeMissingDataBehaviorClass.BLOCK_SCORE ||
          b.behavior === L11RuntimeMissingDataBehaviorClass.PENALIZE_SCORE ||
          b.behavior === L11RuntimeMissingDataBehaviorClass.CAP_SCORE)) {
      violations.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_EVIDENCE_ONLY_INPUT_USED_DECISIVELY,
        `EVIDENCE_ONLY_INPUT acted decisively via ${b.behavior}`,
        { input_ref_id: b.missing_input_ref_id }));
    }
    if (b.condition_class === L11MissingDataConditionClass.CONFLICTING_INPUT &&
        b.confidence_effect < 0) {
      violations.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_CONFLICTING_INPUT_INCREASES_CONFIDENCE,
        `CONFLICTING_INPUT raised confidence`,
        { input_ref_id: b.missing_input_ref_id }));
    }
  }
  return violations.length === 0
    ? ok(`profile=${args.profile.missing_profile_id} treats missing data non-neutrally`)
    : fail(violations, `missing data treated as neutral`);
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.5-B — missing-data behaviour completeness
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_5_B_BehaviorCompleteness(args: {
  readonly evaluation: L11FormulaEvaluationResult;
  readonly profile: L11ScoreMissingDataProfile;
}): L11_5InvariantResult {
  const violations: L11MissingRegimeIssue[] = [];
  // Every formula missing-data effect must produce at least one
  // applied behaviour OR be explained by an insufficient_input_set.
  const totalEffects = args.evaluation.missing_data_effects.length;
  if (totalEffects > 0 &&
      args.profile.applied_behaviors.length === 0 &&
      args.profile.insufficient_input_sets.length === 0) {
    violations.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_BEHAVIOR_ABSENT_FOR_INPUT_CONDITION,
      `formula reported ${totalEffects} missing-data effects but profile has no applied behaviours`,
      { missing_profile_id: args.profile.missing_profile_id }));
  }
  return violations.length === 0
    ? ok(`behaviour completeness ok for profile=${args.profile.missing_profile_id}`)
    : fail(violations, `behaviour completeness violation`);
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.5-C — visibility class law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_5_C_VisibilityClass(args: {
  readonly profile: L11ScoreMissingDataProfile;
  readonly is_emitted?: boolean;
}): L11_5InvariantResult {
  const violations: L11MissingRegimeIssue[] = [];
  const p = args.profile;
  if (!p.visibility_class) {
    violations.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_VISIBILITY_CLASS_MISSING,
      'visibility_class missing',
      { missing_profile_id: p.missing_profile_id }));
  }
  // BLOCKED_VISIBILITY may not be emitted
  if (args.is_emitted &&
      p.visibility_class === L11ScoreVisibilityClass.BLOCKED_VISIBILITY) {
    violations.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_BLOCKED_VISIBILITY_EMITTED,
      'BLOCKED_VISIBILITY profile emitted',
      { missing_profile_id: p.missing_profile_id }));
  }
  // Visibility consistency with applied behaviours
  const hasBlock = p.applied_behaviors.some(
    b => b.behavior === L11RuntimeMissingDataBehaviorClass.BLOCK_SCORE,
  );
  if (hasBlock && p.visibility_class !== L11ScoreVisibilityClass.BLOCKED_VISIBILITY) {
    violations.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_VISIBILITY_CLASS_INCONSISTENT,
      `BLOCK_SCORE behaviour applied but visibility=${p.visibility_class}`,
      { missing_profile_id: p.missing_profile_id }));
  }
  // Readiness ↔ visibility
  if (p.visibility_class === L11ScoreVisibilityClass.BLOCKED_VISIBILITY &&
      p.readiness_effect !== L11MissingDataReadinessEffect.SCORE_BLOCKED) {
    violations.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_READINESS_EFFECT_INCONSISTENT,
      `BLOCKED_VISIBILITY requires SCORE_BLOCKED readiness, got ${p.readiness_effect}`,
      { missing_profile_id: p.missing_profile_id }));
  }
  return violations.length === 0
    ? ok(`visibility=${p.visibility_class} for profile=${p.missing_profile_id}`)
    : fail(violations, `visibility class violation`);
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.5-D — L8 regime reference law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_5_D_RegimeReference(args: {
  readonly modifiers: readonly L11ScoreRegimeModifier[];
}): L11_5InvariantResult {
  const violations: L11MissingRegimeIssue[] = [];
  for (const m of args.modifiers) {
    if (!m.regime_ref) {
      violations.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_WITHOUT_L8_REF,
        `regime_ref missing on modifier ${m.modifier_id}`,
        { modifier_id: m.modifier_id }));
    }
    if (!ALL_L11_REGIME_POSTURE_CODES.includes(m.primary_regime as any)) {
      violations.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_PRIMARY_REGIME_UNKNOWN,
        `unknown primary_regime ${m.primary_regime}`,
        { modifier_id: m.modifier_id }));
    }
  }
  return violations.length === 0
    ? ok(`all ${args.modifiers.length} modifiers carry valid L8 regime refs`)
    : fail(violations, `regime reference violation`);
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.5-E — modifier boundary law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_5_E_ModifierBoundary(args: {
  readonly modifiers: readonly L11ScoreRegimeModifier[];
  readonly active_l10_restriction_refs?: readonly string[];
  readonly contradiction_refs?: readonly string[];
}): L11_5InvariantResult {
  const violations: L11MissingRegimeIssue[] = [];
  for (const m of args.modifiers) {
    // Matrix membership
    const inMatrix = L11_REGIME_MODIFIER_MATRIX.some(
      e => e.score_family === m.score_family &&
        e.regime_posture === (m.primary_regime as any) &&
        e.modifier_type === m.modifier_type,
    );
    if (!inMatrix) {
      violations.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_OUTSIDE_MATRIX,
        `(${m.score_family}, ${m.primary_regime}, ${m.modifier_type}) not in matrix`,
        { modifier_id: m.modifier_id }));
    }
    // Direction-flip detection: amplify on a risk family that LOWERS
    // score is a direction flip (and vice versa). Encoded indirectly
    // via type (engine guards this; we re-assert).
    if (m.modifier_type === L11RegimeModifierType.ADD_PENALTY &&
        Number.isFinite(m.additive_effect ?? Number.NaN) &&
        (m.additive_effect ?? 0) > 0) {
      violations.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_DIRECTION_FLIP,
        `ADD_PENALTY modifier produced positive additive_effect ${m.additive_effect}`,
        { modifier_id: m.modifier_id }));
    }
    // Contradiction override
    if (args.contradiction_refs && args.contradiction_refs.length > 0 &&
        m.modifier_type === L11RegimeModifierType.AMPLIFY_COMPONENT &&
        m.modifier_strength > 0.7) {
      violations.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_REGIME_OVERRIDES_CONTRADICTION,
        `strong amplify modifier ${m.modifier_id} active alongside contradiction`,
        { modifier_id: m.modifier_id }));
    }
    // L10 restriction
    if (args.active_l10_restriction_refs && args.active_l10_restriction_refs.length > 0) {
      const acknowledged = m.applied_under_restriction_refs.some(
        r => args.active_l10_restriction_refs!.includes(r),
      );
      if (!acknowledged) {
        violations.push(makeL11MissingRegimeIssue(
          L11MissingRegimeViolationCode.L11M_REGIME_OVERRIDES_L10_RESTRICTION,
          `modifier ${m.modifier_id} did not acknowledge active L10 restriction`,
          { modifier_id: m.modifier_id }));
      }
    }
  }
  return violations.length === 0
    ? ok(`modifier boundaries respected (${args.modifiers.length} modifiers)`)
    : fail(violations, `modifier boundary violation`);
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.5-F — missing-regime interaction law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_5_F_InteractionLaw(args: {
  readonly profile: L11ScoreMissingDataProfile;
  readonly modifiers: readonly L11ScoreRegimeModifier[];
  readonly interactions: readonly L11MissingRegimeInteraction[];
}): L11_5InvariantResult {
  const violations: L11MissingRegimeIssue[] = [];
  const hasMaterialMissing =
    args.profile.applied_behaviors.length > 0 ||
    args.profile.applied_caps.length > 0 ||
    args.profile.applied_penalties.length > 0;
  if (hasMaterialMissing && args.modifiers.length > 0 && args.interactions.length === 0) {
    violations.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_MISSING_REGIME_INTERACTION_OMITTED,
      'material missing-data + active modifiers but no interaction objects',
      { missing_profile_id: args.profile.missing_profile_id }));
  }
  for (const i of args.interactions) {
    if (!i.interaction_class) {
      violations.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_INTERACTION_CLASS_MISSING,
        'interaction_class missing',
        { interaction_id: i.interaction_id }));
    }
  }
  return violations.length === 0
    ? ok(`interactions=${args.interactions.length} for profile=${args.profile.missing_profile_id}`)
    : fail(violations, `interaction law violation`);
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.5-G — attribution linkage law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_5_G_AttributionLinkage(args: {
  readonly score: L11ScoreOutput;
  readonly profile: L11ScoreMissingDataProfile;
  readonly modifiers: readonly L11ScoreRegimeModifier[];
  readonly attribution?: L11ScoreAttribution;
}): L11_5InvariantResult {
  const violations: L11MissingRegimeIssue[] = [];
  // Score must reference profile and modifiers
  if (!args.score.missing_data_profile_ref) {
    violations.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_MATERIAL_MISSING_NOT_ATTRIBUTED,
      'score has no missing_data_profile_ref',
      { score_id: args.score.score_id }));
  }
  for (const m of args.modifiers) {
    const referenced = args.score.regime_modifier_refs.some(
      r => r === m.modifier_id || r.includes(m.modifier_id),
    );
    if (!referenced) {
      violations.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_MATERIAL_REGIME_MOD_NOT_ATTRIBUTED,
        `score does not reference modifier ${m.modifier_id}`,
        { modifier_id: m.modifier_id }));
    }
  }
  // If attribution was supplied, every material missing-data effect
  // must produce an attribution missing-data contribution
  if (args.attribution) {
    const seenInputRefs = new Set(
      args.attribution.missing_data_contributions.map(c => c.missing_input_ref),
    );
    for (const b of args.profile.applied_behaviors) {
      if (b.behavior === L11RuntimeMissingDataBehaviorClass.BLOCK_SCORE ||
          b.behavior === L11RuntimeMissingDataBehaviorClass.CAP_SCORE ||
          b.behavior === L11RuntimeMissingDataBehaviorClass.PENALIZE_SCORE) {
        if (!seenInputRefs.has(b.missing_input_ref_id) &&
            !Array.from(seenInputRefs).some(r => r.includes(b.missing_input_ref_id))) {
          violations.push(makeL11MissingRegimeIssue(
            L11MissingRegimeViolationCode.L11M_MATERIAL_MISSING_NOT_ATTRIBUTED,
            `material missing-data ${b.missing_input_ref_id} not in attribution`,
            { input_ref_id: b.missing_input_ref_id }));
        }
      }
    }
  }
  return violations.length === 0
    ? ok(`attribution linkage ok for score=${args.score.score_id}`)
    : fail(violations, `attribution linkage violation`);
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.5-H — replay determinism law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_5_H_ReplayDeterminism(args: {
  readonly profile: L11ScoreMissingDataProfile;
  readonly modifiers: readonly L11ScoreRegimeModifier[];
}): L11_5InvariantResult {
  const violations: L11MissingRegimeIssue[] = [];
  if (!args.profile.replay_hash) {
    violations.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_REPLAY_HASH_MISSING,
      'profile replay_hash missing',
      { missing_profile_id: args.profile.missing_profile_id }));
  } else {
    const recomputed = canonicalMissingDataProfileReplayHash(
      extractL11MissingDataProfileReplayMaterial(args.profile),
    );
    if (recomputed !== args.profile.replay_hash) {
      violations.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_REPLAY_HASH_MISMATCH,
        `profile replay_hash mismatch stored=${args.profile.replay_hash} recomputed=${recomputed}`,
        { missing_profile_id: args.profile.missing_profile_id }));
    }
  }
  for (const m of args.modifiers) {
    if (!m.replay_hash) {
      violations.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_REPLAY_HASH_MISSING,
        `modifier ${m.modifier_id} replay_hash missing`,
        { modifier_id: m.modifier_id }));
    } else {
      const recomputed = canonicalRegimeModifierReplayHash(
        extractL11RegimeModifierReplayMaterial(m),
      );
      if (recomputed !== m.replay_hash) {
        violations.push(makeL11MissingRegimeIssue(
          L11MissingRegimeViolationCode.L11M_REPLAY_HASH_MISMATCH,
          `modifier ${m.modifier_id} replay_hash mismatch`,
          { modifier_id: m.modifier_id }));
      }
    }
  }
  return violations.length === 0
    ? ok(`replay determinism ok (1 profile + ${args.modifiers.length} modifiers)`)
    : fail(violations, `replay determinism violation`);
}
