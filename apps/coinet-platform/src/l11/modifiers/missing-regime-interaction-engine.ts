/**
 * L11.5 — Missing-Data × Regime Interaction Engine (§11.5.13.3)
 *
 * Combines a missing-data profile with the active regime modifiers
 * and emits zero-or-more `L11MissingRegimeInteraction` objects so
 * L11.4 attribution can surface the combined effect.
 */

import {
  L11ScoreFamily,
  L11ScoreOutput,
  L11ScoreFormulaDefinition,
  L11ScoreMissingDataProfile,
  L11ScoreRegimeModifier,
  L11ScoreVisibilityClass,
  L11MissingDataReadinessEffect,
  L11MissingRegimeInteraction,
  L11MissingRegimeInteractionClass,
  L11_MISSING_REGIME_INTERACTION_POLICY_VERSION,
  L11RegimePostureCode,
  L11RegimeModifierType,
  L11RuntimeMissingDataBehaviorClass,
  isL11CriticalMissingCondition,
  mostSevereL11InteractionClass,
} from '../contracts';

export interface RunL11MissingRegimeInteractionEngineArgs {
  readonly score: L11ScoreOutput;
  readonly formula: L11ScoreFormulaDefinition;
  readonly missing_profile: L11ScoreMissingDataProfile;
  readonly regime_modifiers: readonly L11ScoreRegimeModifier[];
}

export interface L11MissingRegimeInteractionEngineResult {
  readonly ok: boolean;
  readonly interactions: readonly L11MissingRegimeInteraction[];
  readonly errors: readonly { code: string; reason: string }[];
}

export function runL11MissingRegimeInteractionEngine(
  args: RunL11MissingRegimeInteractionEngineArgs,
): L11MissingRegimeInteractionEngineResult {
  const interactions: L11MissingRegimeInteraction[] = [];
  const errors: { code: string; reason: string }[] = [];

  if (args.missing_profile.score_id !== args.score.score_id ||
      args.regime_modifiers.some(m => m.score_id !== args.score.score_id)) {
    errors.push({
      code: 'SCORE_REF_MISMATCH',
      reason: 'missing_profile / regime modifiers must reference same score',
    });
    return { ok: false, interactions: [], errors };
  }

  const profile = args.missing_profile;
  const modifiers = args.regime_modifiers;

  // §11.5.12.1 — combined-risk scenarios. We construct one interaction
  // per (regime_modifier × material missing-data condition) combo,
  // then collapse identical interaction classes into a single object.
  const collected: L11MissingRegimeInteraction[] = [];
  let counter = 0;

  const materialMissingInputs = listMaterialMissingInputs(profile);
  if (modifiers.length === 0 || materialMissingInputs.length === 0) {
    // Always emit a single NO_INTERACTION sentinel so audit records
    // can prove the engine ran. This makes invariants F + G easier
    // to check.
    counter += 1;
    collected.push({
      interaction_id: `l11m.intx.${args.score.score_id}.${counter}`,
      score_id: args.score.score_id,
      score_family: args.formula.score_family,
      formula_id: args.formula.formula_id,
      formula_version: args.formula.formula_version,
      missing_profile_ref: profile.missing_profile_id,
      regime_modifier_refs: modifiers.map(m => m.modifier_id),
      missing_input_ref_ids: materialMissingInputs.map(r => r),
      regime_postures: modifiers.flatMap(m =>
        m.secondary_regime ? [m.primary_regime as L11RegimePostureCode, m.secondary_regime as L11RegimePostureCode]
          : [m.primary_regime as L11RegimePostureCode]),
      interaction_class: L11MissingRegimeInteractionClass.NO_INTERACTION,
      score_effect: 0,
      confidence_effect: 0,
      cap_rule_refs: [],
      penalty_rule_refs: [],
      disclosure_required: false,
      reason_codes: ['L11M_INT_NO_MATERIAL_OVERLAP'],
      lineage_refs: profile.lineage_refs,
      evidence_refs: profile.evidence_refs,
      policy_version: L11_MISSING_REGIME_INTERACTION_POLICY_VERSION,
    });
    return { ok: true, interactions: collected, errors: [] };
  }

  for (const mod of modifiers) {
    for (const inp of materialMissingInputs) {
      const cls = classifyInteraction({
        family: args.formula.score_family,
        modifier: mod,
        profile,
      });
      counter += 1;
      collected.push({
        interaction_id: `l11m.intx.${args.score.score_id}.${counter}`,
        score_id: args.score.score_id,
        score_family: args.formula.score_family,
        formula_id: args.formula.formula_id,
        formula_version: args.formula.formula_version,
        missing_profile_ref: profile.missing_profile_id,
        regime_modifier_refs: [mod.modifier_id],
        missing_input_ref_ids: [inp],
        regime_postures: mod.secondary_regime
          ? [mod.primary_regime as L11RegimePostureCode, mod.secondary_regime as L11RegimePostureCode]
          : [mod.primary_regime as L11RegimePostureCode],
        interaction_class: cls.class_,
        score_effect: cls.score_effect,
        confidence_effect: cls.confidence_effect,
        cap_rule_refs: cls.cap_rule_refs,
        penalty_rule_refs: cls.penalty_rule_refs,
        disclosure_required: cls.disclosure_required,
        reason_codes: cls.reason_codes,
        lineage_refs: [...profile.lineage_refs, ...mod.lineage_refs],
        evidence_refs: [...profile.evidence_refs, ...mod.evidence_refs],
        policy_version: L11_MISSING_REGIME_INTERACTION_POLICY_VERSION,
      });
    }
  }

  // Collapse to most-severe class per (regime_modifier × score_family)
  const grouped = new Map<string, L11MissingRegimeInteraction[]>();
  for (const i of collected) {
    const key = i.regime_modifier_refs.join('|');
    const arr = grouped.get(key) ?? [];
    arr.push(i);
    grouped.set(key, arr);
  }
  const final: L11MissingRegimeInteraction[] = [];
  for (const [, arr] of grouped) {
    const worst = mostSevereL11InteractionClass(arr.map(a => a.interaction_class));
    const survivors = arr.filter(a => a.interaction_class === worst);
    // Merge survivors into a single interaction
    const merged = mergeInteractions(survivors);
    final.push(merged);
  }

  interactions.push(...final);

  return { ok: true, interactions, errors: [] };
}

function listMaterialMissingInputs(p: L11ScoreMissingDataProfile): readonly string[] {
  const out: string[] = [];
  for (const b of p.applied_behaviors) {
    if (
      isL11CriticalMissingCondition(b.condition_class) ||
      b.behavior === L11RuntimeMissingDataBehaviorClass.BLOCK_SCORE ||
      b.behavior === L11RuntimeMissingDataBehaviorClass.CAP_SCORE ||
      b.behavior === L11RuntimeMissingDataBehaviorClass.PENALIZE_SCORE
    ) {
      out.push(b.missing_input_ref_id);
    }
  }
  return out;
}

interface ClassifiedInteraction {
  readonly class_: L11MissingRegimeInteractionClass;
  readonly score_effect: number;
  readonly confidence_effect: number;
  readonly cap_rule_refs: readonly string[];
  readonly penalty_rule_refs: readonly string[];
  readonly disclosure_required: boolean;
  readonly reason_codes: readonly string[];
}

function classifyInteraction(args: {
  family: L11ScoreFamily;
  modifier: L11ScoreRegimeModifier;
  profile: L11ScoreMissingDataProfile;
}): ClassifiedInteraction {
  const { modifier, profile } = args;

  // BLOCKING_INTERACTION when missing-data already blocks AND a
  // hostile regime modifier is present (any negative-direction
  // modifier amplifies the block-class severity).
  if (profile.visibility_class === L11ScoreVisibilityClass.BLOCKED_VISIBILITY ||
      profile.readiness_effect === L11MissingDataReadinessEffect.SCORE_BLOCKED) {
    return {
      class_: L11MissingRegimeInteractionClass.BLOCKING_INTERACTION,
      score_effect: 25,
      confidence_effect: 15,
      cap_rule_refs: [],
      penalty_rule_refs: [],
      disclosure_required: true,
      reason_codes: ['L11M_INT_BLOCK_AND_REGIME'],
    };
  }

  // CAP_INTERACTION when (caps applied via missing-data) AND
  // (regime modifier is CAP_SCORE / DISCOUNT_COMPONENT)
  const missingHasCap = profile.applied_caps.length > 0;
  const regimeIsRestrictive =
    modifier.modifier_type === L11RegimeModifierType.CAP_SCORE ||
    modifier.modifier_type === L11RegimeModifierType.DISCOUNT_COMPONENT;
  if (missingHasCap && regimeIsRestrictive) {
    return {
      class_: L11MissingRegimeInteractionClass.CAP_INTERACTION,
      score_effect: 15,
      confidence_effect: 10,
      cap_rule_refs: [
        ...profile.applied_caps,
        ...(modifier.cap_effect_ref ? [modifier.cap_effect_ref] : []),
      ],
      penalty_rule_refs: [],
      disclosure_required: true,
      reason_codes: ['L11M_INT_MISSING_AND_REGIME_BOTH_CAP'],
    };
  }

  // PENALTY_INTERACTION when missing-data penalty + regime ADD_PENALTY/AMPLIFY
  const missingHasPenalty = profile.applied_penalties.length > 0;
  const regimePenalty =
    modifier.modifier_type === L11RegimeModifierType.ADD_PENALTY ||
    (modifier.modifier_type === L11RegimeModifierType.AMPLIFY_COMPONENT &&
      args.family === L11ScoreFamily.RISK);
  if (missingHasPenalty || regimePenalty) {
    return {
      class_: L11MissingRegimeInteractionClass.PENALTY_INTERACTION,
      score_effect: 10,
      confidence_effect: 5,
      cap_rule_refs: [],
      penalty_rule_refs: [
        ...profile.applied_penalties,
        ...(modifier.penalty_effect_ref ? [modifier.penalty_effect_ref] : []),
      ],
      disclosure_required: true,
      reason_codes: ['L11M_INT_MISSING_AND_REGIME_BOTH_PENALTY'],
    };
  }

  // Otherwise — DISCLOSURE_INTERACTION
  return {
    class_: L11MissingRegimeInteractionClass.DISCLOSURE_INTERACTION,
    score_effect: 0,
    confidence_effect: 3,
    cap_rule_refs: [],
    penalty_rule_refs: [],
    disclosure_required: true,
    reason_codes: ['L11M_INT_MATERIAL_OVERLAP_DISCLOSURE'],
  };
}

function mergeInteractions(
  group: readonly L11MissingRegimeInteraction[],
): L11MissingRegimeInteraction {
  const head = group[0];
  let score_effect = 0;
  let confidence_effect = 0;
  const cap = new Set<string>();
  const pen = new Set<string>();
  const inputs = new Set<string>();
  const postures = new Set<string>();
  const reasons = new Set<string>();
  const lineage = new Set<string>();
  const evidence = new Set<string>();
  for (const g of group) {
    score_effect += g.score_effect;
    confidence_effect += g.confidence_effect;
    g.cap_rule_refs.forEach(r => cap.add(r));
    g.penalty_rule_refs.forEach(r => pen.add(r));
    g.missing_input_ref_ids.forEach(r => inputs.add(r));
    g.regime_postures.forEach(r => postures.add(r));
    g.reason_codes.forEach(r => reasons.add(r));
    g.lineage_refs.forEach(r => lineage.add(r));
    g.evidence_refs.forEach(r => evidence.add(r));
  }
  return {
    ...head,
    interaction_id: head.interaction_id,
    score_effect,
    confidence_effect,
    cap_rule_refs: Array.from(cap).sort(),
    penalty_rule_refs: Array.from(pen).sort(),
    missing_input_ref_ids: Array.from(inputs).sort(),
    regime_postures: Array.from(postures).sort() as readonly L11RegimePostureCode[],
    reason_codes: Array.from(reasons).sort(),
    lineage_refs: Array.from(lineage).sort(),
    evidence_refs: Array.from(evidence).sort(),
    disclosure_required: group.some(g => g.disclosure_required),
  };
}
