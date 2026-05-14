/**
 * L11.5 — Regime-Modifier Engine (§11.5.13.2)
 *
 * Deterministic engine that consumes a stable L8 regime read and a
 * Layer-11 score's family/formula context, and produces governed
 * `L11ScoreRegimeModifier` objects with replay hashes.
 *
 * Pipeline (§11.5.13.2):
 *   1. validate L8 regime ref (host supplies the read; engine
 *      enforces presence + freshness budget)
 *   2. classify regime-family relation via the §11.5.10 matrix
 *   3. resolve modifier rule
 *   4. bind affected components
 *   5. compute modifier strength
 *   6. apply cap/penalty/disclosure effect where required
 *   7. validate no contradiction or L10 restriction override
 *   8. build replay hash
 */

import {
  L11ScoreOutput,
  L11ScoreFormulaDefinition,
  L11ScoreRegimeModifier,
  L11RegimeModifierType,
  L11RegimeModifierReasonCode,
  L11_REGIME_MODIFIER_POLICY_VERSION,
  L11RegimePostureCode,
  L11_REGIME_MODIFIER_MATRIX,
  L11RegimeModifierMatrixEntry,
  lookupL11RegimeModifierMatrixEntry,
  isL11RegimeModifierStructurallyValid,
  extractL11RegimeModifierReplayMaterial,
  canonicalRegimeModifierReplayHash,
  ALL_L11_REGIME_POSTURE_CODES,
} from '../contracts';

/**
 * Stable L8 regime read consumed by the engine. The host supplies
 * this from L8 surfaces; the engine never derives regimes from raw
 * data (§11.5.8.2).
 */
export interface L11L8RegimeRead {
  readonly regime_ref: string;
  readonly primary_regime: L11RegimePostureCode;
  readonly secondary_regime?: L11RegimePostureCode;
  readonly regime_confidence_score: number;
  readonly transition_risk_class: string;
  readonly observed_at: string;
  readonly freshness_budget_ms?: number;
  readonly observed_age_ms?: number;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  /** Restriction posture refs from L10/L11.1 that limit how the
   * regime read may be applied to the score. */
  readonly applied_under_restriction_refs?: readonly string[];
  /** Set of contradiction refs that the engine must NOT erase. */
  readonly contradiction_refs?: readonly string[];
}

export interface RunL11RegimeModifierEngineArgs {
  readonly score: L11ScoreOutput;
  readonly formula: L11ScoreFormulaDefinition;
  readonly regime_read: L11L8RegimeRead;
  readonly active_l10_restriction_refs?: readonly string[];
  readonly contradiction_refs?: readonly string[];
}

export interface L11RegimeModifierEngineError {
  readonly code: string;
  readonly reason: string;
}

export interface L11RegimeModifierEngineResult {
  readonly ok: boolean;
  readonly modifiers: readonly L11ScoreRegimeModifier[];
  readonly errors: readonly L11RegimeModifierEngineError[];
}

export function runL11RegimeModifierEngine(
  args: RunL11RegimeModifierEngineArgs,
): L11RegimeModifierEngineResult {
  const errors: L11RegimeModifierEngineError[] = [];
  const r = args.regime_read;

  // ── Stage 1: validate L8 regime ref
  if (!r || !r.regime_ref) {
    return {
      ok: false, modifiers: [],
      errors: [{ code: 'REGIME_REF_MISSING', reason: 'regime_read.regime_ref required' }],
    };
  }
  if (!ALL_L11_REGIME_POSTURE_CODES.includes(r.primary_regime)) {
    errors.push({ code: 'PRIMARY_REGIME_UNKNOWN', reason: `unknown primary_regime ${r.primary_regime}` });
  }
  if (r.secondary_regime && !ALL_L11_REGIME_POSTURE_CODES.includes(r.secondary_regime)) {
    errors.push({ code: 'SECONDARY_REGIME_UNKNOWN', reason: `unknown secondary_regime ${r.secondary_regime}` });
  }
  if (typeof r.freshness_budget_ms === 'number' &&
      typeof r.observed_age_ms === 'number' &&
      r.observed_age_ms > r.freshness_budget_ms) {
    errors.push({ code: 'REGIME_REF_STALE', reason: 'observed_age_ms exceeds freshness_budget_ms' });
  }

  if (errors.length > 0) {
    return { ok: false, modifiers: [], errors };
  }

  // ── Stage 2: classify regime-family relation via matrix
  const candidates: L11RegimeModifierMatrixEntry[] = [];
  const primary = lookupL11RegimeModifierMatrixEntry(args.formula.score_family, r.primary_regime);
  if (primary) candidates.push(primary);
  if (r.secondary_regime) {
    const secondary = lookupL11RegimeModifierMatrixEntry(args.formula.score_family, r.secondary_regime);
    if (secondary) candidates.push(secondary);
  }
  if (candidates.length === 0) {
    return { ok: true, modifiers: [], errors: [] };
  }

  // ── Stage 4–6: build modifiers
  const modifiers: L11ScoreRegimeModifier[] = [];
  let counter = 0;
  for (const entry of candidates) {
    counter += 1;
    const affectedComponents = bindAffectedComponents(entry, args.formula);
    if (affectedComponents.length === 0 && requiresAffectedComponents(entry.modifier_type)) {
      errors.push({
        code: 'MODIFIER_HAS_NO_AFFECTED_COMPONENTS',
        reason: `modifier ${entry.entry_id} requires affected components but none bound`,
      });
      continue;
    }
    const strength = computeBoundedStrength(entry, r);
    const reasonCodes = withHighImpactIfNeeded(entry.reason_codes, entry, strength);

    const draft: Omit<L11ScoreRegimeModifier, 'replay_hash'> = {
      modifier_id: `l11m.regmod.${args.score.score_id}.${counter}`,
      score_id: args.score.score_id,
      score_family: args.formula.score_family,
      formula_id: args.formula.formula_id,
      formula_version: args.formula.formula_version,
      scope_type: args.score.scope_type,
      scope_id: args.score.scope_id,
      as_of: args.score.as_of,
      regime_ref: r.regime_ref,
      primary_regime: r.primary_regime,
      secondary_regime: r.secondary_regime,
      regime_confidence_score: r.regime_confidence_score,
      transition_risk_class: r.transition_risk_class,
      modifier_type: entry.modifier_type,
      modifier_strength: strength,
      affected_component_refs: affectedComponents,
      multiplier_effect: deriveMultiplier(entry, strength),
      additive_effect: deriveAdditive(entry, strength),
      cap_effect_ref: entry.is_hard_cap
        ? `l11m.cap.${entry.entry_id}` : undefined,
      penalty_effect_ref: entry.modifier_type === L11RegimeModifierType.ADD_PENALTY
        ? `l11m.pen.${entry.entry_id}` : undefined,
      reason_codes: reasonCodes,
      applied_under_restriction_refs:
        args.regime_read.applied_under_restriction_refs ??
        args.active_l10_restriction_refs ?? [],
      lineage_refs: r.lineage_refs,
      evidence_refs: r.evidence_refs,
      policy_version: L11_REGIME_MODIFIER_POLICY_VERSION,
    };

    // ── Stage 7: legality (structural)
    const legal = isL11RegimeModifierStructurallyValid({
      ...draft, replay_hash: '',
    });
    if (!legal.ok) {
      errors.push({
        code: 'MODIFIER_STRUCTURALLY_INVALID',
        reason: `${entry.entry_id}: ${legal.reason}`,
      });
      continue;
    }

    const replay_hash = canonicalRegimeModifierReplayHash(
      extractL11RegimeModifierReplayMaterial(draft),
    );
    modifiers.push({ ...draft, replay_hash });
  }

  // §11.5.11 — Modifier may not erase contradiction or L10 restriction
  // (validation only — engine surfaces errors but still returns modifiers
  // so callers can audit them).
  if (args.contradiction_refs && args.contradiction_refs.length > 0) {
    for (const m of modifiers) {
      if (m.modifier_type === L11RegimeModifierType.AMPLIFY_COMPONENT &&
          m.modifier_strength > 0.5) {
        errors.push({
          code: 'MODIFIER_MAY_OVERRIDE_CONTRADICTION',
          reason: `modifier ${m.modifier_id} amplifies strongly while contradiction refs exist`,
        });
      }
    }
  }

  return { ok: errors.length === 0, modifiers, errors };
}

function bindAffectedComponents(
  entry: L11RegimeModifierMatrixEntry,
  formula: L11ScoreFormulaDefinition,
): readonly string[] {
  // Heuristic: for AMPLIFY/DISCOUNT modifiers we bind primary positive
  // components (or primary risk for risk families); for CAP/FLOOR we
  // bind no components; for PENALTY/CONFIDENCE we bind every component.
  switch (entry.modifier_type) {
    case L11RegimeModifierType.AMPLIFY_COMPONENT:
    case L11RegimeModifierType.DISCOUNT_COMPONENT:
      return formula.component_definitions
        .filter(c =>
          c.component_role === 'PRIMARY_POSITIVE_COMPONENT' as any ||
          c.component_role === 'PRIMARY_RISK_COMPONENT' as any ||
          c.component_role === 'STRUCTURE_COMPONENT' as any ||
          c.component_role === 'TIMING_COMPONENT' as any)
        .map(c => c.component_id);
    case L11RegimeModifierType.ADD_PENALTY:
    case L11RegimeModifierType.REDUCE_CONFIDENCE:
      return formula.component_definitions.map(c => c.component_id);
    case L11RegimeModifierType.CAP_SCORE:
    case L11RegimeModifierType.FLOOR_SCORE:
    case L11RegimeModifierType.REQUIRE_DISCLOSURE:
    case L11RegimeModifierType.EVIDENCE_ONLY:
    default:
      return [];
  }
}

function requiresAffectedComponents(t: L11RegimeModifierType): boolean {
  return (
    t === L11RegimeModifierType.AMPLIFY_COMPONENT ||
    t === L11RegimeModifierType.DISCOUNT_COMPONENT ||
    t === L11RegimeModifierType.ADD_PENALTY ||
    t === L11RegimeModifierType.REDUCE_CONFIDENCE
  );
}

function computeBoundedStrength(
  entry: L11RegimeModifierMatrixEntry,
  r: L11L8RegimeRead,
): number {
  // §11.5.9.3 — strength must be bounded in [0, 1]; we discount the
  // matrix's recommended strength by regime_confidence_score so a
  // low-confidence regime read produces a softer modifier.
  const base = clamp(entry.recommended_strength, 0, 1);
  const conf = clamp(r.regime_confidence_score, 0, 1);
  return Number((base * conf).toFixed(4));
}

function deriveMultiplier(
  entry: L11RegimeModifierMatrixEntry,
  strength: number,
): number | undefined {
  switch (entry.modifier_type) {
    case L11RegimeModifierType.AMPLIFY_COMPONENT:
      return Number((1 + strength).toFixed(4));
    case L11RegimeModifierType.DISCOUNT_COMPONENT:
      return Number((1 - strength).toFixed(4));
    default:
      return undefined;
  }
}

function deriveAdditive(
  entry: L11RegimeModifierMatrixEntry,
  strength: number,
): number | undefined {
  switch (entry.modifier_type) {
    case L11RegimeModifierType.ADD_PENALTY:
      return Number((-strength * 100).toFixed(4));
    case L11RegimeModifierType.REDUCE_CONFIDENCE:
      return Number((-strength * 100).toFixed(4));
    case L11RegimeModifierType.FLOOR_SCORE:
      return Number((strength * 100).toFixed(4));
    default:
      return undefined;
  }
}

function withHighImpactIfNeeded(
  reasons: readonly L11RegimeModifierReasonCode[],
  entry: L11RegimeModifierMatrixEntry,
  strength: number,
): readonly L11RegimeModifierReasonCode[] {
  if (entry.modifier_type === L11RegimeModifierType.AMPLIFY_COMPONENT) {
    const multiplier = 1 + strength;
    if (multiplier > 1.5 &&
        !reasons.includes(L11RegimeModifierReasonCode.REGIME_HIGH_IMPACT_MULTIPLIER)) {
      return [...reasons, L11RegimeModifierReasonCode.REGIME_HIGH_IMPACT_MULTIPLIER];
    }
  }
  return reasons;
}

function clamp(x: number, lo: number, hi: number): number {
  if (!Number.isFinite(x)) return lo;
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Convenience: list every matrix entry for a family (useful in tests
 * and audit reports).
 */
export function listAllL11RegimeMatrixEntries():
  readonly L11RegimeModifierMatrixEntry[] {
  return L11_REGIME_MODIFIER_MATRIX;
}
