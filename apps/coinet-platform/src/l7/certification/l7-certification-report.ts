/**
 * L7.8 — Certification Report / Master Artifact
 *
 * §7.8.2.4, §7.8.8.4 — Every full certification run emits a durable,
 * machine-readable `L7CertificationArtifact` capturing:
 *
 *   • certification id and emission timestamp
 *   • layer version set (L7.1–L7.7 + L7.8)
 *   • band outcomes (pass/fail, duration, blocking violations)
 *   • invariant outcomes across L7.1–L7.8
 *   • replay integrity, load/concurrency, migration, observability status
 *   • rollout recommendation and critical breach count
 *   • artifact fingerprint/hash
 *
 * This artifact is the official "Layer 7 ready" signal consumed by
 * `l7-rollout-gate.ts` and by later-layer dependency attestations.
 */

import {
  L7CertificationBand,
} from './l7-certification-band';
import {
  L7CertificationLevel,
  deriveL7CertificationLevel,
} from './l7-certification-level';

export interface L7BandOutcome {
  readonly band: L7CertificationBand;
  readonly passed: number;
  readonly failed: number;
  readonly duration_ms: number;
  readonly ok: boolean;
  readonly blocking_violations: readonly string[];
}

export interface L7InvariantOutcome {
  readonly id: string;
  readonly holds: boolean;
  readonly evidence: string;
}

export interface L7CertificationArtifact {
  readonly certification_run_id: string;
  readonly emitted_at: string;
  readonly layer_version_set: Readonly<Record<string, string>>;
  readonly bands: readonly L7BandOutcome[];
  readonly invariants: readonly L7InvariantOutcome[];
  readonly golden_corpus_hash: string;
  readonly replay_integrity_ok: boolean;
  readonly load_concurrency_ok: boolean;
  readonly migration_ok: boolean;
  readonly observability_ok: boolean;
  readonly rollout_ok: boolean;
  readonly level: L7CertificationLevel;
  readonly rollout_recommended: boolean;
  readonly critical_breach_count: number;
  readonly blocking_violations: readonly string[];
  readonly artifact_fingerprint: string;
}

export interface L7CertificationInputs {
  readonly certification_run_id: string;
  readonly layer_version_set: Readonly<Record<string, string>>;
  readonly bands: readonly L7BandOutcome[];
  readonly invariants: readonly L7InvariantOutcome[];
  readonly golden_corpus_hash: string;
  readonly replay_integrity_ok: boolean;
  readonly load_concurrency_ok: boolean;
  readonly migration_ok: boolean;
  readonly observability_ok: boolean;
  readonly rollout_ok: boolean;
}

/**
 * Non-cryptographic deterministic 32-bit FNV-1a hash used for corpus and
 * artifact fingerprints. Intentionally identical in shape to
 * `l6-certification-report.fingerprint` so audit tooling can diff
 * L6 and L7 artifact fingerprints uniformly.
 */
export function fingerprintL7(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('00000000' + h.toString(16)).slice(-8);
}

/**
 * §7.8.8.4 — Canonicalize the artifact into a stable string for
 * persistence and hashing. Keys are serialized in a fixed order; arrays
 * are sorted where ordering is not semantically meaningful (invariants,
 * blocking violation lists).
 */
export function canonicalizeL7Artifact(a: L7CertificationArtifact): string {
  const ordered = {
    certification_run_id: a.certification_run_id,
    layer_version_set: a.layer_version_set,
    bands: a.bands.map(b => ({
      band: b.band,
      passed: b.passed,
      failed: b.failed,
      duration_ms: b.duration_ms,
      ok: b.ok,
      blocking_violations: [...b.blocking_violations].sort(),
    })),
    invariants: [...a.invariants]
      .sort((x, y) => x.id.localeCompare(y.id))
      .map(i => ({ id: i.id, holds: i.holds, evidence: i.evidence })),
    golden_corpus_hash: a.golden_corpus_hash,
    replay_integrity_ok: a.replay_integrity_ok,
    load_concurrency_ok: a.load_concurrency_ok,
    migration_ok: a.migration_ok,
    observability_ok: a.observability_ok,
    rollout_ok: a.rollout_ok,
    level: a.level,
    rollout_recommended: a.rollout_recommended,
    critical_breach_count: a.critical_breach_count,
    blocking_violations: [...a.blocking_violations].sort(),
  };
  return JSON.stringify(ordered);
}

export function buildL7CertificationArtifact(
  inputs: L7CertificationInputs,
): L7CertificationArtifact {
  const passingBands = new Set<L7CertificationBand>();
  const blocking: string[] = [];

  for (const b of inputs.bands) {
    if (b.ok) passingBands.add(b.band);
    else blocking.push(`band:${b.band}:${b.blocking_violations.join('|') || 'failed'}`);
  }
  for (const inv of inputs.invariants) {
    if (!inv.holds) blocking.push(`inv:${inv.id}:${inv.evidence}`);
  }
  if (!inputs.replay_integrity_ok) blocking.push('replay_integrity_failed');
  if (!inputs.load_concurrency_ok) blocking.push('load_concurrency_failed');
  if (!inputs.migration_ok) blocking.push('migration_compatibility_failed');
  if (!inputs.observability_ok) blocking.push('observability_package_failed');
  if (!inputs.rollout_ok) blocking.push('rollout_governance_failed');

  const level = deriveL7CertificationLevel(passingBands);
  const criticalBreaches = blocking.filter(
    v => v.startsWith('replay_integrity_failed') ||
         v.startsWith('observability_package_failed') ||
         v.startsWith('inv:INV-7.8-C') ||
         v.startsWith('inv:INV-7.8-D'),
  ).length;

  const rolloutRecommended =
    level === L7CertificationLevel.PRODUCTION_GREEN &&
    blocking.length === 0 &&
    criticalBreaches === 0;

  const partial: Omit<L7CertificationArtifact, 'artifact_fingerprint'> = {
    certification_run_id: inputs.certification_run_id,
    emitted_at: new Date().toISOString(),
    layer_version_set: inputs.layer_version_set,
    bands: inputs.bands,
    invariants: inputs.invariants,
    golden_corpus_hash: inputs.golden_corpus_hash,
    replay_integrity_ok: inputs.replay_integrity_ok,
    load_concurrency_ok: inputs.load_concurrency_ok,
    migration_ok: inputs.migration_ok,
    observability_ok: inputs.observability_ok,
    rollout_ok: inputs.rollout_ok,
    level,
    rollout_recommended: rolloutRecommended,
    critical_breach_count: criticalBreaches,
    blocking_violations: blocking,
  };

  const fingerprint_input = canonicalizeL7Artifact({
    ...partial,
    artifact_fingerprint: '',
  });

  return {
    ...partial,
    artifact_fingerprint: fingerprintL7(fingerprint_input),
  };
}

// ───────────────────────────────────────────────────────────────────────
// In-memory artifact log — used by rollout gates and by tests to confirm
// the latest certification state. Production would persist this through
// L5.
// ───────────────────────────────────────────────────────────────────────

const artifactLog: L7CertificationArtifact[] = [];

export function registerL7CertificationArtifact(
  a: L7CertificationArtifact,
): void {
  artifactLog.push(a);
}

export function getLatestL7CertificationArtifact(): L7CertificationArtifact | null {
  return artifactLog.length === 0 ? null : artifactLog[artifactLog.length - 1];
}

export function listL7CertificationArtifacts(): readonly L7CertificationArtifact[] {
  return [...artifactLog];
}

export function clearL7CertificationArtifacts(): void {
  artifactLog.length = 0;
}
