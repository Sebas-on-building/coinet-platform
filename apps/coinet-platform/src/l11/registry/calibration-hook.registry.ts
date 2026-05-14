/**
 * L11.6 — Calibration Hook Registry (§11.6.13)
 *
 * Stateless diagnostic registry for hook batches. Engines emit
 * hooks; this registry checks the batch for duplicates, target
 * resolvability, family/version coverage, and replay-hash drift.
 */

import {
  L11ScoreCalibrationHook,
  isL11CalibrationHookStructurallyValid,
  extractL11CalibrationHookReplayMaterial,
  canonicalCalibrationHookReplayHash,
} from '../contracts/calibration-hook';
import {
  L11ScoreFamily,
} from '../contracts/score-family';
import {
  getL11CalibrationTarget,
} from './calibration-target.registry';

export interface L11CalibrationHookRegistryIssue {
  readonly hook_id: string | null;
  readonly score_id: string | null;
  readonly score_family: L11ScoreFamily | null;
  readonly reason: string;
}

export interface L11CalibrationHookRegistryReport {
  readonly ok: boolean;
  readonly count: number;
  readonly hooks_by_score_id: Readonly<Record<string, number>>;
  readonly issues: readonly L11CalibrationHookRegistryIssue[];
}

export function buildL11CalibrationHookRegistryReport(
  hooks: readonly L11ScoreCalibrationHook[],
): L11CalibrationHookRegistryReport {
  const issues: L11CalibrationHookRegistryIssue[] = [];
  const ids = new Set<string>();
  const byScore: Record<string, number> = {};

  for (const h of hooks) {
    if (ids.has(h.calibration_hook_id)) {
      issues.push({ hook_id: h.calibration_hook_id, score_id: h.score_id,
        score_family: h.score_family,
        reason: 'duplicate calibration_hook_id' });
      continue;
    }
    ids.add(h.calibration_hook_id);
    byScore[h.score_id] = (byScore[h.score_id] ?? 0) + 1;

    const sv = isL11CalibrationHookStructurallyValid(h);
    if (!sv.ok) {
      issues.push({ hook_id: h.calibration_hook_id, score_id: h.score_id,
        score_family: h.score_family, reason: sv.reason });
      continue;
    }

    const target = getL11CalibrationTarget(h.calibration_target_ref);
    if (!target) {
      issues.push({ hook_id: h.calibration_hook_id, score_id: h.score_id,
        score_family: h.score_family,
        reason: `calibration_target_ref ${h.calibration_target_ref} not in registry` });
      continue;
    }
    if (target.score_family !== h.score_family) {
      issues.push({ hook_id: h.calibration_hook_id, score_id: h.score_id,
        score_family: h.score_family,
        reason: `target family ${target.score_family} != hook family ${h.score_family}` });
    }
    if (target.outcome_metric !== h.outcome_metric) {
      issues.push({ hook_id: h.calibration_hook_id, score_id: h.score_id,
        score_family: h.score_family,
        reason: `target metric ${target.outcome_metric} != hook metric ${h.outcome_metric}` });
    }
    if (target.horizon !== h.horizon) {
      issues.push({ hook_id: h.calibration_hook_id, score_id: h.score_id,
        score_family: h.score_family,
        reason: `target horizon ${target.horizon} != hook horizon ${h.horizon}` });
    }
    if (target.expected_direction !== h.expected_direction) {
      issues.push({ hook_id: h.calibration_hook_id, score_id: h.score_id,
        score_family: h.score_family,
        reason: `target direction ${target.expected_direction} != hook direction ${h.expected_direction}` });
    }
    if (!target.allowed_score_versions.includes(h.score_version)) {
      issues.push({ hook_id: h.calibration_hook_id, score_id: h.score_id,
        score_family: h.score_family,
        reason: `score_version ${h.score_version} not in target.allowed_score_versions` });
    }
    if (!target.allowed_formula_versions.includes(h.formula_version)) {
      issues.push({ hook_id: h.calibration_hook_id, score_id: h.score_id,
        score_family: h.score_family,
        reason: `formula_version ${h.formula_version} not in target.allowed_formula_versions` });
    }
    if (target.cohort_definition.cohort_id !== h.cohort_definition_ref) {
      issues.push({ hook_id: h.calibration_hook_id, score_id: h.score_id,
        score_family: h.score_family,
        reason: `cohort_definition_ref ${h.cohort_definition_ref} != target cohort ${target.cohort_definition.cohort_id}` });
    }

    const expectedHash = canonicalCalibrationHookReplayHash(
      extractL11CalibrationHookReplayMaterial(h));
    if (expectedHash !== h.replay_hash) {
      issues.push({ hook_id: h.calibration_hook_id, score_id: h.score_id,
        score_family: h.score_family, reason: 'replay hash drift' });
    }
  }

  return {
    ok: issues.length === 0,
    count: hooks.length,
    hooks_by_score_id: byScore,
    issues,
  };
}
