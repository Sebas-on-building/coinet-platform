/**
 * L11.7 — Threshold Policy (§11.7.11 / §11.7.18.2)
 *
 * Versioned, governed score-band threshold policy with replay
 * hash, status lifecycle, and gap/overlap detection.
 */

import { L11ScoreFamily } from './score-family';
import { L11ScoreBand, ALL_L11_SCORE_BANDS } from './score-band-policy';

export const L11_THRESHOLD_POLICY_VERSION = 'l11.7.threshold.v1';

export enum L11ThresholdPolicyStatus {
  ACTIVE = 'ACTIVE',
  SHADOW = 'SHADOW',
  DEPRECATED = 'DEPRECATED',
  MIGRATION_REQUIRED = 'MIGRATION_REQUIRED',
  FROZEN = 'FROZEN',
  BLOCKED = 'BLOCKED',
}

export const ALL_L11_THRESHOLD_POLICY_STATUSES:
  readonly L11ThresholdPolicyStatus[] =
  Object.values(L11ThresholdPolicyStatus);

export interface L11ThresholdBandRule {
  readonly score_band: L11ScoreBand;
  readonly min_inclusive?: number;
  readonly min_exclusive?: number;
  readonly max_inclusive?: number;
  readonly max_exclusive?: number;
  readonly semantic_label: string;
  readonly expected_outcome_range?: string;
  readonly policy_version: string;
}

export interface L11ThresholdPolicy {
  readonly threshold_policy_id: string;

  readonly score_family: L11ScoreFamily;
  readonly formula_id: string;
  readonly formula_version: string;

  readonly score_version: string;
  readonly band_policy_ref: string;

  readonly thresholds: readonly L11ThresholdBandRule[];

  readonly threshold_version: string;
  readonly threshold_status: L11ThresholdPolicyStatus;

  readonly calibration_target_refs: readonly string[];
  readonly drift_report_refs: readonly string[];

  readonly effective_from: string;
  readonly effective_to?: string;

  readonly migration_required: boolean;

  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}

interface NormalizedRule {
  readonly band: L11ScoreBand;
  readonly lower: number;
  readonly upper: number;
  readonly lower_inclusive: boolean;
  readonly upper_inclusive: boolean;
}

function normalizeBandRule(r: L11ThresholdBandRule): NormalizedRule | null {
  let lower = -Infinity;
  let lowerInc = true;
  let upper = Infinity;
  let upperInc = true;
  if (r.min_inclusive !== undefined) {
    lower = r.min_inclusive;
    lowerInc = true;
  } else if (r.min_exclusive !== undefined) {
    lower = r.min_exclusive;
    lowerInc = false;
  } else {
    return null;
  }
  if (r.max_inclusive !== undefined) {
    upper = r.max_inclusive;
    upperInc = true;
  } else if (r.max_exclusive !== undefined) {
    upper = r.max_exclusive;
    upperInc = false;
  } else {
    return null;
  }
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) return null;
  return {
    band: r.score_band, lower, upper,
    lower_inclusive: lowerInc, upper_inclusive: upperInc,
  };
}

/**
 * §11.7.11.5 — Detect threshold-policy structural illegality.
 *
 *   - thresholds may not overlap
 *   - thresholds may not have gaps (must cover [0, 100] for active)
 *   - bands may not duplicate
 *   - boundary law: a single value belongs to exactly one band
 */
export function checkL11ThresholdPolicyIntegrity(
  thresholds: readonly L11ThresholdBandRule[],
): { ok: boolean; reason: string } {
  if (thresholds.length === 0) {
    return { ok: false, reason: 'no thresholds declared' };
  }
  const normalized: NormalizedRule[] = [];
  for (const r of thresholds) {
    const n = normalizeBandRule(r);
    if (!n) {
      return { ok: false,
        reason: `threshold for band ${r.score_band} missing min/max bounds` };
    }
    if (!r.semantic_label) {
      return { ok: false,
        reason: `threshold for band ${r.score_band} missing semantic_label` };
    }
    normalized.push(n);
  }
  const bandSet = new Set(normalized.map(n => n.band));
  if (bandSet.size !== normalized.length) {
    return { ok: false, reason: 'duplicate band in thresholds' };
  }
  const sorted = [...normalized].sort((a, b) => a.lower - b.lower);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (curr.lower < prev.upper) {
      return { ok: false,
        reason: `threshold overlap between ${prev.band} and ${curr.band}` };
    }
    if (curr.lower > prev.upper) {
      return { ok: false,
        reason: `threshold gap between ${prev.band} (upper=${prev.upper}) and ${curr.band} (lower=${curr.lower})` };
    }
    // Shared boundary must belong to exactly one side.
    if (curr.lower === prev.upper) {
      const sharedOk =
        (prev.upper_inclusive && !curr.lower_inclusive) ||
        (!prev.upper_inclusive && curr.lower_inclusive);
      if (!sharedOk) {
        return {
          ok: false,
          reason: `boundary at ${prev.upper} between ${prev.band} and ${curr.band} is double-claimed or unclaimed`,
        };
      }
    }
  }
  return { ok: true, reason: 'ok' };
}

/**
 * Production active policies must additionally cover [0, 100].
 */
export function isL11ThresholdPolicyCoveringFullRange(
  thresholds: readonly L11ThresholdBandRule[],
): { ok: boolean; reason: string } {
  const normalized = thresholds.map(normalizeBandRule)
    .filter((n): n is NormalizedRule => n !== null);
  if (normalized.length === 0) return { ok: false, reason: 'no normalized rules' };
  const sorted = [...normalized].sort((a, b) => a.lower - b.lower);
  if (sorted[0].lower !== 0 || !sorted[0].lower_inclusive) {
    return { ok: false, reason: 'first band must include 0 inclusively' };
  }
  const last = sorted[sorted.length - 1];
  if (last.upper !== 100 || !last.upper_inclusive) {
    return { ok: false, reason: 'last band must include 100 inclusively' };
  }
  return { ok: true, reason: 'ok' };
}

export function isL11ThresholdPolicyStructurallyValid(
  p: L11ThresholdPolicy,
): { ok: boolean; reason: string } {
  if (!p.threshold_policy_id) return { ok: false, reason: 'threshold_policy_id missing' };
  if (!p.score_family) return { ok: false, reason: 'score_family missing' };
  if (!p.formula_id) return { ok: false, reason: 'formula_id missing' };
  if (!p.formula_version) return { ok: false, reason: 'formula_version missing' };
  if (!p.threshold_version) return { ok: false, reason: 'threshold_version missing' };
  if (!p.threshold_status) return { ok: false, reason: 'threshold_status missing' };
  if (!p.policy_version) return { ok: false, reason: 'policy_version missing' };
  if (!p.replay_hash) return { ok: false, reason: 'replay_hash missing' };
  if (!p.effective_from) return { ok: false, reason: 'effective_from missing' };
  if (!Array.isArray(p.lineage_refs) || p.lineage_refs.length === 0) {
    return { ok: false, reason: 'lineage_refs missing or empty' };
  }
  const integrity = checkL11ThresholdPolicyIntegrity(p.thresholds);
  if (!integrity.ok) return integrity;
  if (p.threshold_status === L11ThresholdPolicyStatus.ACTIVE) {
    const coverage = isL11ThresholdPolicyCoveringFullRange(p.thresholds);
    if (!coverage.ok) return coverage;
    if (p.calibration_target_refs.length === 0) {
      return { ok: false, reason: 'active threshold policy lacks calibration target ref' };
    }
  }
  return { ok: true, reason: 'ok' };
}

/**
 * Resolve a band for a numeric score under a threshold policy.
 * Returns null when the score does not match any band rule.
 */
export function resolveL11ThresholdBand(
  policy: L11ThresholdPolicy,
  score: number,
): L11ScoreBand | null {
  if (!Number.isFinite(score)) return null;
  for (const r of policy.thresholds) {
    const n = normalizeBandRule(r);
    if (!n) continue;
    const lowerOk = n.lower_inclusive ? score >= n.lower : score > n.lower;
    const upperOk = n.upper_inclusive ? score <= n.upper : score < n.upper;
    if (lowerOk && upperOk) return n.band;
  }
  return null;
}

// ── Replay material (§11.7.18.2) ─────────────────────────────────

export interface L11ThresholdPolicyReplayMaterial {
  readonly threshold_policy_id: string;
  readonly score_family: L11ScoreFamily;
  readonly formula_id: string;
  readonly formula_version: string;
  readonly score_version: string;
  readonly threshold_version: string;
  readonly threshold_status: L11ThresholdPolicyStatus;
  readonly band_keys: readonly string[];
  readonly calibration_target_refs: readonly string[];
  readonly drift_report_refs: readonly string[];
  readonly effective_from: string;
  readonly effective_to?: string;
  readonly migration_required: boolean;
  readonly policy_version: string;
}

function bandKey(r: L11ThresholdBandRule): string {
  const lower = r.min_inclusive !== undefined
    ? `[${r.min_inclusive}`
    : r.min_exclusive !== undefined
      ? `(${r.min_exclusive}`
      : '?';
  const upper = r.max_inclusive !== undefined
    ? `${r.max_inclusive}]`
    : r.max_exclusive !== undefined
      ? `${r.max_exclusive})`
      : '?';
  return `${r.score_band}=${lower}..${upper}::${r.semantic_label}::${r.expected_outcome_range ?? ''}`;
}

export function extractL11ThresholdPolicyReplayMaterial(
  p: Omit<L11ThresholdPolicy, 'replay_hash'> | L11ThresholdPolicy,
): L11ThresholdPolicyReplayMaterial {
  return {
    threshold_policy_id: p.threshold_policy_id,
    score_family: p.score_family,
    formula_id: p.formula_id,
    formula_version: p.formula_version,
    score_version: p.score_version,
    threshold_version: p.threshold_version,
    threshold_status: p.threshold_status,
    band_keys: p.thresholds.map(bandKey),
    calibration_target_refs: [...p.calibration_target_refs],
    drift_report_refs: [...p.drift_report_refs],
    effective_from: p.effective_from,
    effective_to: p.effective_to,
    migration_required: p.migration_required,
    policy_version: p.policy_version,
  };
}

export function canonicalThresholdPolicyReplayHash(
  m: L11ThresholdPolicyReplayMaterial,
): string {
  const parts: string[] = [];
  parts.push(`tpid:${m.threshold_policy_id}`);
  parts.push(`fam:${m.score_family}`);
  parts.push(`fid:${m.formula_id}`);
  parts.push(`fv:${m.formula_version}`);
  parts.push(`sv:${m.score_version}`);
  parts.push(`tv:${m.threshold_version}`);
  parts.push(`st:${m.threshold_status}`);
  parts.push(`bk:${[...m.band_keys].sort().join('||')}`);
  parts.push(`ct:${[...m.calibration_target_refs].sort().join('|')}`);
  parts.push(`dr:${[...m.drift_report_refs].sort().join('|')}`);
  parts.push(`ef:${m.effective_from}`);
  parts.push(`et:${m.effective_to ?? ''}`);
  parts.push(`mr:${m.migration_required ? '1' : '0'}`);
  parts.push(`pv:${m.policy_version}`);
  return fnv1a32('l11g.threshold::' + parts.join('::'));
}

function fnv1a32(s: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return `l11g.h.${hash.toString(16).padStart(8, '0')}`;
}

void ALL_L11_SCORE_BANDS;
