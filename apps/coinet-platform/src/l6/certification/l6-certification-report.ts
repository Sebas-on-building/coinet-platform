/**
 * L6.8 — Certification Report / Artifact
 *
 * §6.8.4.6, §6.8.8.4 — Every full certification run emits a durable,
 * machine-readable artifact capturing version set, band outcomes, invariant
 * outcomes, golden corpus hash, load/concurrency and replay/repair results,
 * rollout recommendation, and blocking violations.
 */

import {
  L6CertificationBand,
  L6CertificationLevel,
  deriveCertificationLevel,
} from './l6-certification-level';

export interface L6BandOutcome {
  readonly band: L6CertificationBand;
  readonly passed: number;
  readonly failed: number;
  readonly duration_ms: number;
  readonly ok: boolean;
  readonly blocking_violations: readonly string[];
}

export interface L6InvariantOutcome {
  readonly id: string;
  readonly holds: boolean;
  readonly evidence: string;
}

export interface L6CertificationArtifact {
  readonly certification_run_id: string;
  readonly emitted_at: string;
  readonly layer_version_set: Readonly<Record<string, string>>;
  readonly bands: readonly L6BandOutcome[];
  readonly invariants: readonly L6InvariantOutcome[];
  readonly golden_corpus_hash: string;
  readonly replay_integrity_ok: boolean;
  readonly load_concurrency_ok: boolean;
  readonly migration_ok: boolean;
  readonly observability_ok: boolean;
  readonly level: L6CertificationLevel;
  readonly rollout_recommended: boolean;
  readonly blocking_violations: readonly string[];
}

export interface L6CertificationInputs {
  readonly certification_run_id: string;
  readonly layer_version_set: Readonly<Record<string, string>>;
  readonly bands: readonly L6BandOutcome[];
  readonly invariants: readonly L6InvariantOutcome[];
  readonly golden_corpus_hash: string;
  readonly replay_integrity_ok: boolean;
  readonly load_concurrency_ok: boolean;
  readonly migration_ok: boolean;
  readonly observability_ok: boolean;
}

export function buildCertificationArtifact(
  inputs: L6CertificationInputs,
): L6CertificationArtifact {
  const passingBands = new Set<L6CertificationBand>();
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

  const level = deriveCertificationLevel(passingBands);
  const rolloutRecommended =
    level === L6CertificationLevel.PRODUCTION_GREEN &&
    blocking.length === 0;

  return {
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
    level,
    rollout_recommended: rolloutRecommended,
    blocking_violations: blocking,
  };
}

/**
 * §6.8.8.4 — Canonicalize the artifact into a stable string for persistence
 * and hashing. Keys are serialized in a fixed order.
 */
export function canonicalizeArtifact(a: L6CertificationArtifact): string {
  const ordered = {
    certification_run_id: a.certification_run_id,
    layer_version_set: a.layer_version_set,
    bands: a.bands.map(b => ({
      band: b.band, passed: b.passed, failed: b.failed,
      duration_ms: b.duration_ms, ok: b.ok,
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
    level: a.level,
    rollout_recommended: a.rollout_recommended,
    blocking_violations: [...a.blocking_violations].sort(),
  };
  return JSON.stringify(ordered);
}

/**
 * Non-cryptographic deterministic hash used for corpus fingerprints in
 * test harnesses (FNV-1a 32-bit).
 */
export function fingerprint(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('00000000' + h.toString(16)).slice(-8);
}

const artifactLog: L6CertificationArtifact[] = [];

export function registerCertificationArtifact(a: L6CertificationArtifact): void {
  artifactLog.push(a);
}

export function getLatestCertificationArtifact(): L6CertificationArtifact | null {
  return artifactLog.length === 0 ? null : artifactLog[artifactLog.length - 1];
}

export function listCertificationArtifacts(): readonly L6CertificationArtifact[] {
  return [...artifactLog];
}

export function clearCertificationArtifacts(): void {
  artifactLog.length = 0;
}
