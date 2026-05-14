/**
 * L11.5 — Regime Modifier Validator (§11.5.9.4 / INV-11.5-D / INV-11.5-E)
 */

import {
  L11ScoreRegimeModifier,
  L11RegimeModifierType,
  L11RegimeModifierReasonCode,
  ALL_L11_REGIME_POSTURE_CODES,
  L11_REGIME_MODIFIER_MATRIX,
  extractL11RegimeModifierReplayMaterial,
  canonicalRegimeModifierReplayHash,
} from '../contracts';
import {
  L11MissingRegimeIssue,
  L11MissingRegimeViolationCode,
  makeL11MissingRegimeIssue,
} from './l11-missing-regime-violation-codes';

export interface ValidateRegimeModifierArgs {
  readonly modifier: L11ScoreRegimeModifier;
  readonly active_l10_restriction_refs?: readonly string[];
  readonly contradiction_refs?: readonly string[];
}

export function validateL11RegimeModifier(
  args: ValidateRegimeModifierArgs,
): { ok: boolean; issues: readonly L11MissingRegimeIssue[] } {
  const issues: L11MissingRegimeIssue[] = [];
  const m = args.modifier;

  if (!m.modifier_id) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_ID_MISSING,
      'modifier_id missing'));
  }
  if (!m.score_id) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_SCORE_REF_MISSING,
      'score_id missing',
      { modifier_id: m.modifier_id }));
  }
  if (!m.regime_ref) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_WITHOUT_L8_REF,
      'regime_ref missing',
      { modifier_id: m.modifier_id }));
  }
  if (!ALL_L11_REGIME_POSTURE_CODES.includes(m.primary_regime as any)) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_PRIMARY_REGIME_UNKNOWN,
      `unknown primary_regime ${m.primary_regime}`,
      { modifier_id: m.modifier_id }));
  }
  if (!Number.isFinite(m.modifier_strength) ||
      m.modifier_strength < 0 || m.modifier_strength > 1) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_STRENGTH_OUT_OF_BOUNDS,
      `modifier_strength ${m.modifier_strength} out of [0,1]`,
      { modifier_id: m.modifier_id }));
  }
  if (m.multiplier_effect !== undefined) {
    if (!Number.isFinite(m.multiplier_effect) ||
        m.multiplier_effect < 0 || m.multiplier_effect > 3) {
      issues.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_MULTIPLIER_OUT_OF_BOUNDS,
        `multiplier_effect ${m.multiplier_effect} out of [0,3]`,
        { modifier_id: m.modifier_id }));
    }
    if (m.multiplier_effect > 1.5 &&
        !m.reason_codes.includes(L11RegimeModifierReasonCode.REGIME_HIGH_IMPACT_MULTIPLIER)) {
      issues.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_HIGH_IMPACT_REASON_MISSING,
        'multiplier_effect > 1.5 requires REGIME_HIGH_IMPACT_MULTIPLIER reason code',
        { modifier_id: m.modifier_id }));
    }
  }
  if (requiresAffectedComponents(m.modifier_type) && m.affected_component_refs.length === 0) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_AFFECTED_COMPONENTS_MISSING,
      `${m.modifier_type} requires affected_component_refs`,
      { modifier_id: m.modifier_id }));
  }
  if (m.reason_codes.length === 0) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_REASON_CODES_MISSING,
      'reason_codes missing',
      { modifier_id: m.modifier_id }));
  }
  if (m.lineage_refs.length === 0) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_LINEAGE_MISSING,
      'lineage_refs missing',
      { modifier_id: m.modifier_id }));
  }

  // Matrix membership
  const inMatrix = L11_REGIME_MODIFIER_MATRIX.some(
    e => e.score_family === m.score_family &&
      e.regime_posture === (m.primary_regime as any) &&
      e.modifier_type === m.modifier_type,
  );
  if (!inMatrix) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_OUTSIDE_MATRIX,
      `(${m.score_family}, ${m.primary_regime}, ${m.modifier_type}) not in matrix`,
      { modifier_id: m.modifier_id }));
  }

  // §11.5.11 — modifier may not erase contradiction or L10 restriction
  if (args.contradiction_refs && args.contradiction_refs.length > 0 &&
      m.modifier_type === L11RegimeModifierType.AMPLIFY_COMPONENT &&
      m.modifier_strength > 0.7) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_REGIME_OVERRIDES_CONTRADICTION,
      `strong amplify modifier active alongside contradiction refs`,
      { modifier_id: m.modifier_id }));
  }
  if (args.active_l10_restriction_refs && args.active_l10_restriction_refs.length > 0) {
    const acknowledged = m.applied_under_restriction_refs.some(
      r => args.active_l10_restriction_refs!.includes(r),
    );
    if (!acknowledged) {
      issues.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_REGIME_OVERRIDES_L10_RESTRICTION,
        'modifier applied without acknowledging active L10 restriction',
        { modifier_id: m.modifier_id }));
    }
  }

  // Replay hash
  if (!m.replay_hash) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_REPLAY_HASH_MISSING,
      'replay_hash missing',
      { modifier_id: m.modifier_id }));
  } else {
    const recomputed = canonicalRegimeModifierReplayHash(
      extractL11RegimeModifierReplayMaterial(m),
    );
    if (recomputed !== m.replay_hash) {
      issues.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_REPLAY_HASH_MISMATCH,
        `replay_hash mismatch stored=${m.replay_hash} recomputed=${recomputed}`,
        { modifier_id: m.modifier_id }));
    }
  }

  return { ok: issues.every(i => i.severity !== 'CRITICAL' && i.severity !== 'ERROR'), issues };
}

function requiresAffectedComponents(t: L11RegimeModifierType): boolean {
  return (
    t === L11RegimeModifierType.AMPLIFY_COMPONENT ||
    t === L11RegimeModifierType.DISCOUNT_COMPONENT ||
    t === L11RegimeModifierType.ADD_PENALTY ||
    t === L11RegimeModifierType.REDUCE_CONFIDENCE
  );
}
