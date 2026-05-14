/**
 * L11.7 — Threshold Governance Engine (§11.7.15)
 *
 * Stateless validation + threshold-change classification engine.
 * It does not mutate threshold policies; it only:
 *   - validates a candidate policy
 *   - classifies the diff between an old and a new policy
 *   - decides whether migration / recalibration is required
 */

import {
  L11ThresholdPolicy,
  L11ThresholdPolicyStatus,
  L11ThresholdBandRule,
  isL11ThresholdPolicyStructurallyValid,
  checkL11ThresholdPolicyIntegrity,
  isL11ThresholdPolicyCoveringFullRange,
  extractL11ThresholdPolicyReplayMaterial,
  canonicalThresholdPolicyReplayHash,
} from '../contracts/threshold-policy';
import {
  L11ThresholdChangeClassification,
} from '../contracts/threshold-change-classification';
import { L11ScoreBand } from '../contracts/score-band-policy';

// ── Engine result types ──────────────────────────────────────────

export interface L11ThresholdPolicyValidationResult {
  readonly ok: boolean;
  readonly issues: readonly string[];
  readonly expected_replay_hash?: string;
}

export interface L11ThresholdChangeAssessmentResult {
  readonly classification: L11ThresholdChangeClassification;
  readonly migration_required: boolean;
  readonly recalibration_required: boolean;
  readonly reasons: readonly string[];
  readonly bumped_threshold_version: boolean;
}

// ── Policy validator ─────────────────────────────────────────────

export function validateL11ThresholdPolicy(
  policy: L11ThresholdPolicy,
): L11ThresholdPolicyValidationResult {
  const issues: string[] = [];
  const structural = isL11ThresholdPolicyStructurallyValid(policy);
  if (!structural.ok) issues.push(structural.reason);
  const integrity = checkL11ThresholdPolicyIntegrity(policy.thresholds);
  if (!integrity.ok) issues.push(integrity.reason);
  if (policy.threshold_status === L11ThresholdPolicyStatus.ACTIVE) {
    const coverage = isL11ThresholdPolicyCoveringFullRange(policy.thresholds);
    if (!coverage.ok) issues.push(coverage.reason);
    if (policy.calibration_target_refs.length === 0) {
      issues.push('active threshold policy lacks calibration target ref');
    }
  }
  let expected: string | undefined;
  try {
    expected = canonicalThresholdPolicyReplayHash(
      extractL11ThresholdPolicyReplayMaterial(policy));
  } catch {
    expected = undefined;
  }
  if (expected && policy.replay_hash !== expected) {
    issues.push(`replay_hash mismatch (declared=${policy.replay_hash} expected=${expected})`);
  }
  return {
    ok: issues.length === 0,
    issues,
    expected_replay_hash: expected,
  };
}

// ── Threshold change classifier ──────────────────────────────────

interface NormalizedBand {
  readonly band: L11ScoreBand;
  readonly lower: number;
  readonly upper: number;
  readonly lower_inclusive: boolean;
  readonly upper_inclusive: boolean;
  readonly semantic_label: string;
}

function normalize(b: L11ThresholdBandRule): NormalizedBand | null {
  let lower = 0; let lowerInc = true;
  let upper = 100; let upperInc = true;
  if (b.min_inclusive !== undefined) { lower = b.min_inclusive; lowerInc = true; }
  else if (b.min_exclusive !== undefined) { lower = b.min_exclusive; lowerInc = false; }
  else return null;
  if (b.max_inclusive !== undefined) { upper = b.max_inclusive; upperInc = true; }
  else if (b.max_exclusive !== undefined) { upper = b.max_exclusive; upperInc = false; }
  else return null;
  return { band: b.score_band, lower, upper,
    lower_inclusive: lowerInc, upper_inclusive: upperInc,
    semantic_label: b.semantic_label };
}

function bandMap(rules: readonly L11ThresholdBandRule[]):
  Map<L11ScoreBand, NormalizedBand> {
  const m = new Map<L11ScoreBand, NormalizedBand>();
  for (const r of rules) {
    const n = normalize(r);
    if (n) m.set(n.band, n);
  }
  return m;
}

/**
 * Classify a transition between two threshold policies.
 *
 * §11.7.12 ladder:
 *   - PROHIBITED        → silent change without version bump,
 *                          or status change to ACTIVE without coverage
 *   - BREAKING_SEMANTIC → semantic_label changed for any band
 *   - MIGRATION_REQUIRED→ band bounds moved
 *   - RECALIBRATION_REQUIRED → bound shift inside calibration tolerance
 *   - BACKWARD_COMPATIBLE → metadata-only change
 *   - ADDITIVE_SAFE     → adding a SHADOW policy / extra evidence label
 */
export function classifyL11ThresholdChange(
  oldPolicy: L11ThresholdPolicy | null,
  newPolicy: L11ThresholdPolicy,
): L11ThresholdChangeAssessmentResult {
  const reasons: string[] = [];
  if (!oldPolicy) {
    return {
      classification: L11ThresholdChangeClassification.ADDITIVE_SAFE,
      migration_required: false,
      recalibration_required: false,
      reasons: ['no prior policy on file'],
      bumped_threshold_version: true,
    };
  }
  if (oldPolicy.score_family !== newPolicy.score_family) {
    return {
      classification: L11ThresholdChangeClassification.PROHIBITED,
      migration_required: true,
      recalibration_required: true,
      reasons: ['score_family changed across policies'],
      bumped_threshold_version: oldPolicy.threshold_version !== newPolicy.threshold_version,
    };
  }
  const bumpedVersion = oldPolicy.threshold_version !== newPolicy.threshold_version;

  const oldMap = bandMap(oldPolicy.thresholds);
  const newMap = bandMap(newPolicy.thresholds);

  let semanticBreak = false;
  let boundsChanged = false;
  let metadataChanged = false;

  // Compare common bands.
  for (const band of new Set<L11ScoreBand>([...oldMap.keys(), ...newMap.keys()])) {
    const o = oldMap.get(band);
    const n = newMap.get(band);
    if (!o && n) {
      reasons.push(`band ${band} added in new policy`);
      boundsChanged = true;
      continue;
    }
    if (o && !n) {
      reasons.push(`band ${band} removed in new policy`);
      boundsChanged = true;
      continue;
    }
    if (!o || !n) continue;
    if (o.semantic_label !== n.semantic_label) {
      reasons.push(`band ${band} semantic_label changed (${o.semantic_label} → ${n.semantic_label})`);
      semanticBreak = true;
    }
    if (o.lower !== n.lower || o.upper !== n.upper ||
        o.lower_inclusive !== n.lower_inclusive ||
        o.upper_inclusive !== n.upper_inclusive) {
      reasons.push(`band ${band} bounds changed`);
      boundsChanged = true;
    }
  }

  if (oldPolicy.formula_id !== newPolicy.formula_id ||
      oldPolicy.formula_version !== newPolicy.formula_version) {
    reasons.push('formula identity changed across policies');
    metadataChanged = true;
  }

  // §11.7.12.3 — silent (no version bump) production rewrite is
  // PROHIBITED.
  const prodInPlace =
    oldPolicy.threshold_status === L11ThresholdPolicyStatus.ACTIVE &&
    newPolicy.threshold_status === L11ThresholdPolicyStatus.ACTIVE &&
    !bumpedVersion &&
    (semanticBreak || boundsChanged);
  if (prodInPlace) {
    reasons.push('active threshold policy changed without threshold_version bump');
    return {
      classification: L11ThresholdChangeClassification.PROHIBITED,
      migration_required: true,
      recalibration_required: true,
      reasons,
      bumped_threshold_version: bumpedVersion,
    };
  }

  if (semanticBreak) {
    reasons.push('semantic_label changes always require migration');
    return {
      classification: L11ThresholdChangeClassification.BREAKING_SEMANTIC,
      migration_required: true,
      recalibration_required: true,
      reasons,
      bumped_threshold_version: bumpedVersion,
    };
  }
  if (boundsChanged) {
    return {
      classification: L11ThresholdChangeClassification.MIGRATION_REQUIRED,
      migration_required: true,
      recalibration_required: true,
      reasons,
      bumped_threshold_version: bumpedVersion,
    };
  }
  if (oldPolicy.threshold_status !== newPolicy.threshold_status) {
    return {
      classification: L11ThresholdChangeClassification.RECALIBRATION_REQUIRED,
      migration_required: false,
      recalibration_required: true,
      reasons: [...reasons,
        `status changed ${oldPolicy.threshold_status} → ${newPolicy.threshold_status}`],
      bumped_threshold_version: bumpedVersion,
    };
  }
  if (metadataChanged) {
    return {
      classification: L11ThresholdChangeClassification.BACKWARD_COMPATIBLE,
      migration_required: false,
      recalibration_required: false,
      reasons,
      bumped_threshold_version: bumpedVersion,
    };
  }
  return {
    classification: L11ThresholdChangeClassification.ADDITIVE_SAFE,
    migration_required: false,
    recalibration_required: false,
    reasons: ['no material differences detected'],
    bumped_threshold_version: bumpedVersion,
  };
}
