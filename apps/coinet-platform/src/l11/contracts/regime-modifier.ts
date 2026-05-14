/**
 * L11.5 — Score Regime Modifier (§11.5.9 / §11.5.15.2)
 *
 * Canonical runtime object describing how a stable L8 regime read
 * shaped a Layer-11 score. Modifiers may amplify, discount, cap,
 * floor, add penalty, reduce confidence, require disclosure, or
 * mark a score as evidence-only — but may NEVER override
 * contradiction law, L10 restriction law, score direction law, or
 * become final judgment (§11.5.11.1).
 */

import { L11ScoreFamily } from './score-family';

export const L11_REGIME_MODIFIER_POLICY_VERSION = 'l11.5.regime.v1';

export enum L11RegimeModifierType {
  AMPLIFY_COMPONENT = 'AMPLIFY_COMPONENT',
  DISCOUNT_COMPONENT = 'DISCOUNT_COMPONENT',
  CAP_SCORE = 'CAP_SCORE',
  FLOOR_SCORE = 'FLOOR_SCORE',
  ADD_PENALTY = 'ADD_PENALTY',
  REDUCE_CONFIDENCE = 'REDUCE_CONFIDENCE',
  REQUIRE_DISCLOSURE = 'REQUIRE_DISCLOSURE',
  EVIDENCE_ONLY = 'EVIDENCE_ONLY',
}

export const ALL_L11_REGIME_MODIFIER_TYPES:
  readonly L11RegimeModifierType[] =
  Object.values(L11RegimeModifierType);

export enum L11RegimeModifierReasonCode {
  REGIME_AMPLIFIES_VALIDATION = 'REGIME_AMPLIFIES_VALIDATION',
  REGIME_AMPLIFIES_STRUCTURE = 'REGIME_AMPLIFIES_STRUCTURE',
  REGIME_AMPLIFIES_SEQUENCE = 'REGIME_AMPLIFIES_SEQUENCE',
  REGIME_DISCOUNTS_LEVERAGE_DRIVEN_STRENGTH = 'REGIME_DISCOUNTS_LEVERAGE_DRIVEN_STRENGTH',
  REGIME_DISCOUNTS_THIN_LIQUIDITY_BREAKOUT = 'REGIME_DISCOUNTS_THIN_LIQUIDITY_BREAKOUT',
  REGIME_DISCOUNTS_NARRATIVE_IN_RISK_OFF = 'REGIME_DISCOUNTS_NARRATIVE_IN_RISK_OFF',
  REGIME_AMPLIFIES_LEVERAGE_RISK = 'REGIME_AMPLIFIES_LEVERAGE_RISK',
  REGIME_AMPLIFIES_LIQUIDITY_FRAGILITY = 'REGIME_AMPLIFIES_LIQUIDITY_FRAGILITY',
  REGIME_AMPLIFIES_DOWNSIDE_FRAGILITY = 'REGIME_AMPLIFIES_DOWNSIDE_FRAGILITY',
  REGIME_AMPLIFIES_UNLOCK_SUPPLY_RISK = 'REGIME_AMPLIFIES_UNLOCK_SUPPLY_RISK',
  REGIME_REQUIRES_POST_UNLOCK_DIGESTION_FRAME = 'REGIME_REQUIRES_POST_UNLOCK_DIGESTION_FRAME',
  REGIME_CAPS_SCORE_DUE_TO_THIN_LIQUIDITY = 'REGIME_CAPS_SCORE_DUE_TO_THIN_LIQUIDITY',
  REGIME_CAPS_SCORE_DUE_TO_HIGH_TRANSITION_RISK = 'REGIME_CAPS_SCORE_DUE_TO_HIGH_TRANSITION_RISK',
  REGIME_REDUCES_CONFIDENCE_STALE_OR_AMBIGUOUS = 'REGIME_REDUCES_CONFIDENCE_STALE_OR_AMBIGUOUS',
  REGIME_DISCLOSES_LATE_BREAKOUT_TIMING = 'REGIME_DISCLOSES_LATE_BREAKOUT_TIMING',
  REGIME_HIGH_IMPACT_MULTIPLIER = 'REGIME_HIGH_IMPACT_MULTIPLIER',
}

export const ALL_L11_REGIME_MODIFIER_REASON_CODES:
  readonly L11RegimeModifierReasonCode[] =
  Object.values(L11RegimeModifierReasonCode);

export interface L11ScoreRegimeModifier {
  readonly modifier_id: string;

  readonly score_id: string;
  readonly score_family: L11ScoreFamily;
  readonly formula_id: string;
  readonly formula_version: string;

  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;

  readonly regime_ref: string;
  readonly primary_regime: string;
  readonly secondary_regime?: string;

  readonly regime_confidence_score: number;
  readonly transition_risk_class: string;

  readonly modifier_type: L11RegimeModifierType;
  readonly modifier_strength: number;

  readonly affected_component_refs: readonly string[];

  readonly multiplier_effect?: number;
  readonly additive_effect?: number;
  readonly cap_effect_ref?: string;
  readonly penalty_effect_ref?: string;

  readonly reason_codes: readonly L11RegimeModifierReasonCode[];

  readonly applied_under_restriction_refs: readonly string[];

  readonly lineage_refs: readonly string[];
  readonly evidence_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}

/**
 * §11.5.9.3 — Bounds. `modifier_strength` lives in [0, 1].
 * `multiplier_effect`, when present, lives in [0, 3] and any value
 * above 1.5 must declare a high-impact reason code.
 */
export function isL11RegimeModifierStructurallyValid(
  m: L11ScoreRegimeModifier,
): { ok: boolean; reason: string } {
  if (!m.modifier_id) return { ok: false, reason: 'modifier_id missing' };
  if (!m.score_id) return { ok: false, reason: 'score_id missing' };
  if (!m.regime_ref) return { ok: false, reason: 'regime_ref missing' };
  if (!m.primary_regime) return { ok: false, reason: 'primary_regime missing' };
  if (!Number.isFinite(m.regime_confidence_score) ||
      m.regime_confidence_score < 0 || m.regime_confidence_score > 1) {
    return { ok: false, reason: 'regime_confidence_score must be in [0,1]' };
  }
  if (!Number.isFinite(m.modifier_strength) ||
      m.modifier_strength < 0 || m.modifier_strength > 1) {
    return { ok: false, reason: 'modifier_strength must be in [0,1]' };
  }
  if (m.multiplier_effect !== undefined) {
    if (!Number.isFinite(m.multiplier_effect) ||
        m.multiplier_effect < 0 || m.multiplier_effect > 3) {
      return { ok: false, reason: 'multiplier_effect must be in [0,3]' };
    }
    if (m.multiplier_effect > 1.5 &&
        !m.reason_codes.includes(L11RegimeModifierReasonCode.REGIME_HIGH_IMPACT_MULTIPLIER)) {
      return {
        ok: false,
        reason: 'multiplier_effect > 1.5 requires REGIME_HIGH_IMPACT_MULTIPLIER reason code',
      };
    }
  }
  if (m.affected_component_refs.length === 0 &&
      m.modifier_type !== L11RegimeModifierType.CAP_SCORE &&
      m.modifier_type !== L11RegimeModifierType.FLOOR_SCORE &&
      m.modifier_type !== L11RegimeModifierType.REQUIRE_DISCLOSURE &&
      m.modifier_type !== L11RegimeModifierType.EVIDENCE_ONLY) {
    return {
      ok: false,
      reason: 'AMPLIFY/DISCOUNT/PENALTY/CONFIDENCE modifiers require affected_component_refs',
    };
  }
  if (m.reason_codes.length === 0) {
    return { ok: false, reason: 'reason_codes missing' };
  }
  if (m.lineage_refs.length === 0) {
    return { ok: false, reason: 'lineage_refs missing' };
  }
  return { ok: true, reason: 'ok' };
}

// ─────────────────────────────────────────────────────────────────────
// Replay material (§11.5.15.2)
// ─────────────────────────────────────────────────────────────────────

export interface L11RegimeModifierReplayMaterial {
  readonly modifier_id: string;
  readonly score_id: string;
  readonly score_family: L11ScoreFamily;
  readonly formula_id: string;
  readonly formula_version: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly regime_ref: string;
  readonly primary_regime: string;
  readonly secondary_regime: string;
  readonly regime_confidence_score: number;
  readonly transition_risk_class: string;
  readonly modifier_type: L11RegimeModifierType;
  readonly modifier_strength: number;
  readonly affected_component_refs: readonly string[];
  readonly multiplier_effect: number;
  readonly additive_effect: number;
  readonly cap_effect_ref: string;
  readonly penalty_effect_ref: string;
  readonly reason_codes: readonly L11RegimeModifierReasonCode[];
  readonly applied_under_restriction_refs: readonly string[];
  readonly policy_version: string;
}

export function extractL11RegimeModifierReplayMaterial(
  m: Omit<L11ScoreRegimeModifier, 'replay_hash'> | L11ScoreRegimeModifier,
): L11RegimeModifierReplayMaterial {
  return {
    modifier_id: m.modifier_id,
    score_id: m.score_id,
    score_family: m.score_family,
    formula_id: m.formula_id,
    formula_version: m.formula_version,
    scope_type: m.scope_type,
    scope_id: m.scope_id,
    as_of: m.as_of,
    regime_ref: m.regime_ref,
    primary_regime: m.primary_regime,
    secondary_regime: m.secondary_regime ?? '',
    regime_confidence_score: m.regime_confidence_score,
    transition_risk_class: m.transition_risk_class,
    modifier_type: m.modifier_type,
    modifier_strength: m.modifier_strength,
    affected_component_refs: m.affected_component_refs,
    multiplier_effect: m.multiplier_effect ?? Number.NaN,
    additive_effect: m.additive_effect ?? Number.NaN,
    cap_effect_ref: m.cap_effect_ref ?? '',
    penalty_effect_ref: m.penalty_effect_ref ?? '',
    reason_codes: m.reason_codes,
    applied_under_restriction_refs: m.applied_under_restriction_refs,
    policy_version: m.policy_version,
  };
}

export function canonicalRegimeModifierReplayHash(
  m: L11RegimeModifierReplayMaterial,
): string {
  const parts: string[] = [];
  parts.push(`mid:${m.modifier_id}`);
  parts.push(`sid:${m.score_id}`);
  parts.push(`fam:${m.score_family}`);
  parts.push(`fid:${m.formula_id}`);
  parts.push(`fv:${m.formula_version}`);
  parts.push(`stp:${m.scope_type}`);
  parts.push(`sco:${m.scope_id}`);
  parts.push(`as:${m.as_of}`);
  parts.push(`rr:${m.regime_ref}`);
  parts.push(`pr:${m.primary_regime}`);
  parts.push(`sr:${m.secondary_regime}`);
  parts.push(`rcs:${normalizeNum(m.regime_confidence_score)}`);
  parts.push(`trc:${m.transition_risk_class}`);
  parts.push(`mt:${m.modifier_type}`);
  parts.push(`ms:${normalizeNum(m.modifier_strength)}`);
  parts.push(`acr:${[...m.affected_component_refs].sort().join('|')}`);
  parts.push(`me:${normalizeNum(m.multiplier_effect)}`);
  parts.push(`ae:${normalizeNum(m.additive_effect)}`);
  parts.push(`cer:${m.cap_effect_ref}`);
  parts.push(`per:${m.penalty_effect_ref}`);
  parts.push(`rc:${[...m.reason_codes].sort().join('|')}`);
  parts.push(`aur:${[...m.applied_under_restriction_refs].sort().join('|')}`);
  parts.push(`pv:${m.policy_version}`);
  return fnv1a32('l11m.regime::' + parts.join('::'));
}

function normalizeNum(n: number): string {
  if (!Number.isFinite(n)) return 'NaN';
  if (Number.isInteger(n)) return `${n}.000000`;
  return n.toFixed(6);
}

function fnv1a32(s: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return `l11m.h.${hash.toString(16).padStart(8, '0')}`;
}
