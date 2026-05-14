/**
 * L11.7 — Formula Change Classifier (§11.7.16)
 *
 * Compares two `L11ScoreFormulaDefinition` instances and produces
 * a deterministic `L11FormulaChangeAssessment` with classification,
 * migration / recalibration / replay-backfill flags, and changed
 * surface enumeration.
 */

import { L11ScoreFamily } from '../contracts/score-family';
import { L11ScoreFormulaDefinition } from '../contracts/score-formula';
import { L11FormulaInputSurface } from '../contracts/formula-input-surface';
import { L11ScoreComponentDefinition } from '../contracts/score-component';
import {
  L11FormulaChangeClassification,
  isL11FormulaChangeProhibited,
} from '../contracts/formula-change-classification';
import {
  L11FormulaChangeAssessment,
  L11FormulaChangeSurface,
  L11FormulaChangeReasonCode,
  L11_FORMULA_CHANGE_POLICY_VERSION,
  L11_PROHIBITED_SILENT_SURFACES,
  L11_MIGRATION_REQUIRED_SURFACES,
  L11_RECALIBRATION_REQUIRED_SURFACES,
  extractL11FormulaChangeReplayMaterial,
  canonicalFormulaChangeReplayHash,
} from '../contracts/formula-change-assessment';

// ── Helpers ──────────────────────────────────────────────────────

function setFromInputs(
  surfaces: readonly L11FormulaInputSurface[],
): Set<string> {
  return new Set(surfaces.map(s =>
    `${s.surface_class}::${s.required_posture ?? ''}::${s.evidence_only ? '1' : '0'}::${s.label ?? ''}`));
}

function componentMap(
  comps: readonly L11ScoreComponentDefinition[],
): Map<string, L11ScoreComponentDefinition> {
  const m = new Map<string, L11ScoreComponentDefinition>();
  for (const c of comps) m.set(c.component_id, c);
  return m;
}

function setEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

interface ChangeContext {
  readonly old_formula: L11ScoreFormulaDefinition;
  readonly new_formula: L11ScoreFormulaDefinition;
  readonly migration_ratification_ref?: string;
  readonly assessment_id_prefix?: string;
}

interface DiffCollector {
  readonly surfaces: Set<L11FormulaChangeSurface>;
  readonly reasons: Set<L11FormulaChangeReasonCode>;
}

function diffComponents(
  old_: L11ScoreFormulaDefinition,
  new_: L11ScoreFormulaDefinition,
  collect: DiffCollector,
): void {
  const oldMap = componentMap(old_.component_definitions);
  const newMap = componentMap(new_.component_definitions);
  for (const [id, c] of newMap) {
    if (!oldMap.has(id)) {
      collect.surfaces.add(L11FormulaChangeSurface.COMPONENT_ADDED);
      collect.reasons.add(L11FormulaChangeReasonCode.COMPONENT_GOVERNANCE);
      void c;
    }
  }
  for (const [id, c] of oldMap) {
    if (!newMap.has(id)) {
      collect.surfaces.add(L11FormulaChangeSurface.COMPONENT_REMOVED);
      collect.reasons.add(L11FormulaChangeReasonCode.COMPONENT_GOVERNANCE);
      void c;
    }
  }
  for (const [id, oldC] of oldMap) {
    const newC = newMap.get(id);
    if (!newC) continue;
    if (oldC.weight !== newC.weight) {
      collect.surfaces.add(L11FormulaChangeSurface.COMPONENT_WEIGHT_CHANGED);
      collect.reasons.add(L11FormulaChangeReasonCode.CALIBRATION_DRIFT);
    }
    if (oldC.component_direction !== newC.component_direction) {
      collect.surfaces.add(L11FormulaChangeSurface.COMPONENT_DIRECTION_CHANGED);
      collect.reasons.add(L11FormulaChangeReasonCode.COMPONENT_GOVERNANCE);
    }
  }
}

function diffInputs(
  old_: L11ScoreFormulaDefinition,
  new_: L11ScoreFormulaDefinition,
  collect: DiffCollector,
): void {
  if (!setEqual(setFromInputs(old_.required_input_surfaces),
    setFromInputs(new_.required_input_surfaces))) {
    collect.surfaces.add(L11FormulaChangeSurface.REQUIRED_INPUT_CHANGED);
    collect.reasons.add(L11FormulaChangeReasonCode.INPUT_DEPRECATION);
  }
  if (!setEqual(setFromInputs(old_.optional_input_surfaces),
    setFromInputs(new_.optional_input_surfaces))) {
    collect.surfaces.add(L11FormulaChangeSurface.OPTIONAL_INPUT_CHANGED);
    collect.reasons.add(L11FormulaChangeReasonCode.INPUT_DEPRECATION);
  }
}

function diffRules(
  old_: L11ScoreFormulaDefinition,
  new_: L11ScoreFormulaDefinition,
  collect: DiffCollector,
): void {
  const capStr = (f: L11ScoreFormulaDefinition) =>
    [...f.cap_rules].map(c =>
      `${c.cap_rule_id}/${c.cap_type}/${c.cap_direction}/${c.cap_value}`).sort().join('|');
  const penStr = (f: L11ScoreFormulaDefinition) =>
    [...f.penalty_rules].map(p =>
      `${p.penalty_rule_id}/${p.application_mode}/${p.magnitude}/${p.triggers_cap}`).sort().join('|');
  const modStr = (f: L11ScoreFormulaDefinition) =>
    [...f.modifier_rules].map(m =>
      `${m.modifier_rule_id}/${m.source_layer}/${m.effect}/${m.magnitude}`).sort().join('|');
  const mdrStr = (f: L11ScoreFormulaDefinition) =>
    [...f.missing_data_rules].map(r =>
      `${r.missing_data_rule_id}/${r.input_condition}/${r.behavior}`).sort().join('|');
  if (capStr(old_) !== capStr(new_)) {
    collect.surfaces.add(L11FormulaChangeSurface.CAP_RULE_CHANGED);
    collect.reasons.add(L11FormulaChangeReasonCode.CALIBRATION_DRIFT);
  }
  if (penStr(old_) !== penStr(new_)) {
    collect.surfaces.add(L11FormulaChangeSurface.PENALTY_RULE_CHANGED);
    collect.reasons.add(L11FormulaChangeReasonCode.CALIBRATION_DRIFT);
  }
  if (modStr(old_) !== modStr(new_)) {
    collect.surfaces.add(L11FormulaChangeSurface.MODIFIER_RULE_CHANGED);
    collect.reasons.add(L11FormulaChangeReasonCode.REGIME_DRIFT);
  }
  if (mdrStr(old_) !== mdrStr(new_)) {
    collect.surfaces.add(L11FormulaChangeSurface.MISSING_DATA_RULE_CHANGED);
    collect.reasons.add(L11FormulaChangeReasonCode.POLICY_UPDATE);
  }
}

function diffSemantics(
  old_: L11ScoreFormulaDefinition,
  new_: L11ScoreFormulaDefinition,
  collect: DiffCollector,
): void {
  if (old_.score_direction !== new_.score_direction) {
    collect.surfaces.add(L11FormulaChangeSurface.SCORE_DIRECTION_CHANGED);
    collect.reasons.add(L11FormulaChangeReasonCode.GOVERNANCE_RATIFICATION);
  }
  if (old_.meaning_claim_ref !== new_.meaning_claim_ref) {
    collect.surfaces.add(L11FormulaChangeSurface.MEANING_CLAIM_CHANGED);
    collect.reasons.add(L11FormulaChangeReasonCode.MEANING_CLARIFICATION);
  }
  if (old_.calibration_target_ref !== new_.calibration_target_ref) {
    collect.surfaces.add(L11FormulaChangeSurface.CALIBRATION_TARGET_CHANGED);
    collect.reasons.add(L11FormulaChangeReasonCode.CALIBRATION_DRIFT);
  }
}

// ── Classifier entrypoint ────────────────────────────────────────

function classifyChangedSurfaces(
  surfaces: ReadonlySet<L11FormulaChangeSurface>,
  hasRatification: boolean,
  versionBumped: boolean,
): {
  classification: L11FormulaChangeClassification;
  migration: boolean;
  recalibration: boolean;
  replayBackfill: boolean;
} {
  if (!versionBumped && surfaces.size > 0) {
    return {
      classification: L11FormulaChangeClassification.PROHIBITED,
      migration: true, recalibration: true, replayBackfill: true,
    };
  }
  // Always-prohibited surfaces require explicit ratification or
  // become PROHIBITED.
  for (const s of L11_PROHIBITED_SILENT_SURFACES) {
    if (surfaces.has(s) && !hasRatification) {
      return {
        classification: L11FormulaChangeClassification.PROHIBITED,
        migration: true, recalibration: true, replayBackfill: true,
      };
    }
  }
  // Migration-required surfaces.
  for (const s of L11_MIGRATION_REQUIRED_SURFACES) {
    if (surfaces.has(s)) {
      const breaking =
        surfaces.has(L11FormulaChangeSurface.SCORE_DIRECTION_CHANGED) ||
        surfaces.has(L11FormulaChangeSurface.MEANING_CLAIM_CHANGED);
      return {
        classification: breaking
          ? L11FormulaChangeClassification.BREAKING_SEMANTIC
          : L11FormulaChangeClassification.MIGRATION_REQUIRED,
        migration: true,
        recalibration: true,
        replayBackfill: true,
      };
    }
  }
  // Recalibration-required surfaces.
  for (const s of L11_RECALIBRATION_REQUIRED_SURFACES) {
    if (surfaces.has(s)) {
      return {
        classification: L11FormulaChangeClassification.RECALIBRATION_REQUIRED,
        migration: false,
        recalibration: true,
        replayBackfill: false,
      };
    }
  }
  // Otherwise additive / backward-compatible.
  if (surfaces.has(L11FormulaChangeSurface.COMPONENT_ADDED) ||
      surfaces.has(L11FormulaChangeSurface.OPTIONAL_INPUT_CHANGED)) {
    return {
      classification: L11FormulaChangeClassification.ADDITIVE_SAFE,
      migration: false, recalibration: false, replayBackfill: false,
    };
  }
  return {
    classification: L11FormulaChangeClassification.BACKWARD_COMPATIBLE,
    migration: false, recalibration: false, replayBackfill: false,
  };
}

export function classifyL11FormulaChange(
  ctx: ChangeContext,
): L11FormulaChangeAssessment {
  if (ctx.old_formula.score_family !== ctx.new_formula.score_family) {
    throw new Error(
      `L11.7 formula classifier: score_family mismatch ${ctx.old_formula.score_family} != ${ctx.new_formula.score_family}`);
  }
  const collect: DiffCollector = {
    surfaces: new Set<L11FormulaChangeSurface>(),
    reasons: new Set<L11FormulaChangeReasonCode>(),
  };
  diffSemantics(ctx.old_formula, ctx.new_formula, collect);
  diffComponents(ctx.old_formula, ctx.new_formula, collect);
  diffInputs(ctx.old_formula, ctx.new_formula, collect);
  diffRules(ctx.old_formula, ctx.new_formula, collect);

  const versionBumped =
    ctx.old_formula.formula_id !== ctx.new_formula.formula_id ||
    ctx.old_formula.formula_version !== ctx.new_formula.formula_version;

  if (collect.surfaces.size === 0 && versionBumped) {
    collect.reasons.add(L11FormulaChangeReasonCode.POLICY_UPDATE);
  }
  if (collect.reasons.size === 0) {
    collect.reasons.add(L11FormulaChangeReasonCode.POLICY_UPDATE);
  }

  const decision = classifyChangedSurfaces(
    collect.surfaces,
    !!ctx.migration_ratification_ref,
    versionBumped);

  const family: L11ScoreFamily = ctx.new_formula.score_family;
  const id =
    `${ctx.assessment_id_prefix ?? 'l11g.fchange'}::${ctx.old_formula.formula_id}@${ctx.old_formula.formula_version}->${ctx.new_formula.formula_id}@${ctx.new_formula.formula_version}`;
  const draft: Omit<L11FormulaChangeAssessment, 'replay_hash'> = {
    formula_change_assessment_id: id,
    old_formula_id: ctx.old_formula.formula_id,
    old_formula_version: ctx.old_formula.formula_version,
    new_formula_id: ctx.new_formula.formula_id,
    new_formula_version: ctx.new_formula.formula_version,
    score_family: family,
    changed_surfaces: [...collect.surfaces].sort(),
    classification: decision.classification,
    migration_required: decision.migration,
    recalibration_required: decision.recalibration,
    replay_backfill_required: decision.replayBackfill,
    reason_codes: [...collect.reasons].sort(),
    affected_threshold_policy_refs: [],
    affected_calibration_target_refs:
      ctx.old_formula.calibration_target_ref !== ctx.new_formula.calibration_target_ref
        ? [ctx.old_formula.calibration_target_ref, ctx.new_formula.calibration_target_ref]
        : [ctx.new_formula.calibration_target_ref],
    migration_ratification_ref: ctx.migration_ratification_ref,
    lineage_refs: [
      `formula:${ctx.old_formula.formula_id}@${ctx.old_formula.formula_version}`,
      `formula:${ctx.new_formula.formula_id}@${ctx.new_formula.formula_version}`,
    ],
    policy_version: L11_FORMULA_CHANGE_POLICY_VERSION,
  };
  const material = extractL11FormulaChangeReplayMaterial(draft);
  const replay = canonicalFormulaChangeReplayHash(material);
  return { ...draft, replay_hash: replay };
}

export function isL11FormulaAssessmentBlocked(
  a: L11FormulaChangeAssessment,
): boolean {
  return isL11FormulaChangeProhibited(a.classification);
}
