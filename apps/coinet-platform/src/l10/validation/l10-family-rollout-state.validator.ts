/**
 * L10.6 — Family Rollout State Validator §10.6.11 / §10.6.15 / INV-10.6-F
 *
 * Enforces rollout doctrine across a full `L10HypothesisRolloutRegistry`
 * snapshot:
 *
 *   - every canonical family has a rollout entry   → ROLLOUT_ENABLE_WITHOUT_BACKING
 *   - entry's declared phase matches canonical map → ROLLOUT_PHASE_UNREGISTERED
 *   - gates must be green before ENABLED           → ROLLOUT_FAMILY_NOT_READY
 *   - phase ordering is preserved                  → ROLLOUT_ENABLE_OUT_OF_ORDER
 *
 * This validator assumes the registry has already rejected structural
 * failures (duplicate / unknown). Its job is to produce an auditable
 * list of issues for the rollout audit surface (Phase E) and the
 * L10.6 certification band (Phase F).
 */

import {
  L10HypothesisFamilyRolloutEntry,
  L10RolloutLifecycleStage,
  rolloutGatesReady,
} from '../contracts/hypothesis-family-rollout';
import {
  L10FamilyValidationIssue,
  L10FamilyValidationReport,
  L10FamilyViolationCode,
  L10HypothesisFamilyId,
  L10TemplateLegalityClass,
  L10_PRODUCTION_FAMILY_ROLLOUT_PHASE,
  ALL_L10_HYPOTHESIS_FAMILY_IDS,
  compareL10RolloutPhase,
  foldL10FamilyLegality,
  makeL10FamilyIssue,
} from '../contracts/hypothesis-template-policy';

export interface L10RolloutStateValidationInput {
  readonly entries: readonly L10HypothesisFamilyRolloutEntry[];
  /**
   * §10.6.11.4 — Families for which certification has been recorded
   * green. Required so the validator knows the family is ready even
   * when entry.gate_flags.certification_green is a cached projection.
   */
  readonly certified_families: ReadonlySet<L10HypothesisFamilyId>;
}

export function validateL10FamilyRolloutState(
  input: L10RolloutStateValidationInput,
): L10FamilyValidationReport {
  const issues: L10FamilyValidationIssue[] = [];
  const byFamily = new Map<L10HypothesisFamilyId, L10HypothesisFamilyRolloutEntry>();
  for (const e of input.entries) {
    if (byFamily.has(e.family_id)) {
      issues.push(
        makeL10FamilyIssue(
          L10FamilyViolationCode.ROLLOUT_DUPLICATE_ENTRY,
          `Duplicate rollout entry for '${e.family_id}'.`,
          { family_id: e.family_id },
        ),
      );
    }
    byFamily.set(e.family_id, e);
  }

  // §10.6.11 — every canonical family must have a rollout entry.
  for (const fid of ALL_L10_HYPOTHESIS_FAMILY_IDS) {
    if (!byFamily.has(fid)) {
      issues.push(
        makeL10FamilyIssue(
          L10FamilyViolationCode.ROLLOUT_ENABLE_WITHOUT_BACKING,
          `Family '${fid}' has no rollout entry.`,
          { family_id: fid },
        ),
      );
    }
  }

  // §10.6.11.1 — declared phase must match the canonical mapping.
  for (const e of input.entries) {
    const canonical = L10_PRODUCTION_FAMILY_ROLLOUT_PHASE[e.family_id];
    if (canonical && canonical !== e.rollout_phase) {
      issues.push(
        makeL10FamilyIssue(
          L10FamilyViolationCode.ROLLOUT_PHASE_UNREGISTERED,
          `Family '${e.family_id}' rollout phase '${e.rollout_phase}' ` +
            `disagrees with canonical '${canonical}'.`,
          { family_id: e.family_id },
        ),
      );
    }
  }

  // §10.6.11.4 — ENABLED requires green gates + green certification +
  // all predecessors ENABLED. Otherwise emit ROLLOUT_FAMILY_NOT_READY.
  for (const e of input.entries) {
    if (e.lifecycle_stage !== L10RolloutLifecycleStage.ENABLED) continue;
    if (!rolloutGatesReady(e.gate_flags)) {
      issues.push(
        makeL10FamilyIssue(
          L10FamilyViolationCode.ROLLOUT_FAMILY_NOT_READY,
          `Family '${e.family_id}' is ENABLED but gates are not ready.`,
          { family_id: e.family_id, context: { gate_flags: e.gate_flags } },
        ),
      );
    }
    if (!input.certified_families.has(e.family_id)) {
      issues.push(
        makeL10FamilyIssue(
          L10FamilyViolationCode.ROLLOUT_MISSING_CERTIFICATION,
          `Family '${e.family_id}' is ENABLED without recorded certification.`,
          { family_id: e.family_id },
        ),
      );
    }
    for (const pre of e.required_predecessors) {
      const p = byFamily.get(pre);
      if (!p || p.lifecycle_stage !== L10RolloutLifecycleStage.ENABLED) {
        issues.push(
          makeL10FamilyIssue(
            L10FamilyViolationCode.ROLLOUT_ENABLE_OUT_OF_ORDER,
            `Family '${e.family_id}' enabled before predecessor '${pre}'.`,
            { family_id: e.family_id, context: { predecessor: pre } },
          ),
        );
      }
    }
  }

  // §10.6.11.4 / INV-10.6-F — for every enabled family, no earlier-phase
  // family may remain un-enabled.
  const enabled = input.entries.filter(
    e => e.lifecycle_stage === L10RolloutLifecycleStage.ENABLED,
  );
  for (const e of enabled) {
    for (const other of input.entries) {
      if (other.family_id === e.family_id) continue;
      if (other.lifecycle_stage === L10RolloutLifecycleStage.ENABLED) continue;
      if (compareL10RolloutPhase(other.rollout_phase, e.rollout_phase) < 0) {
        issues.push(
          makeL10FamilyIssue(
            L10FamilyViolationCode.ROLLOUT_ENABLE_OUT_OF_ORDER,
            `Family '${e.family_id}' (${e.rollout_phase}) enabled while ` +
              `earlier-phase family '${other.family_id}' (${other.rollout_phase}) ` +
              `remains '${other.lifecycle_stage}'.`,
            { family_id: e.family_id, context: { other: other.family_id } },
          ),
        );
      }
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    legality: issues.length === 0
      ? L10TemplateLegalityClass.CLEAN
      : foldL10FamilyLegality(issues.map(i => i.code)),
  };
}
