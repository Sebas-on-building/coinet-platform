/**
 * L8.9 — Certification Report / Master Artifact
 *
 * §8.9.6 / §8.9.9.1 INV-8.9-A,G — Durable, machine-readable
 * `L8CertificationArtifact` summarizing a master L8 certification run.
 * Distinct from `L8LayerRatificationArtifact` (the closure/ratification
 * artifact); this record captures band + invariant outcomes.
 */

import { L8CertificationBand } from './l8-certification-band';
import {
  L8CertificationLevel,
  deriveL8CertificationLevel,
} from './l8-certification-level';

export interface L8BandOutcome {
  readonly band: L8CertificationBand;
  readonly passed: number;
  readonly failed: number;
  readonly duration_ms: number;
  readonly ok: boolean;
  readonly blocking_violations: readonly string[];
}

export interface L8InvariantOutcome {
  readonly id: string;
  readonly holds: boolean;
  readonly evidence: string;
}

export interface L8CertificationArtifact {
  readonly certification_run_id: string;
  readonly emitted_at: string;
  readonly layer_version_set: Readonly<Record<string, string>>;
  readonly bands: readonly L8BandOutcome[];
  readonly invariants: readonly L8InvariantOutcome[];
  readonly ratification_artifact_hash: string;
  readonly completion_state: string;
  readonly level: L8CertificationLevel;
  readonly rollout_recommended: boolean;
  readonly critical_breach_count: number;
  readonly blocking_violations: readonly string[];
  readonly artifact_fingerprint: string;
}

export interface L8CertificationInputs {
  readonly certification_run_id: string;
  readonly layer_version_set: Readonly<Record<string, string>>;
  readonly bands: readonly L8BandOutcome[];
  readonly invariants: readonly L8InvariantOutcome[];
  readonly ratification_artifact_hash: string;
  readonly completion_state: string;
}

export function fingerprintL8(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('00000000' + h.toString(16)).slice(-8);
}

export function canonicalizeL8Artifact(a: L8CertificationArtifact): string {
  const ordered = {
    certification_run_id: a.certification_run_id,
    layer_version_set: Object.fromEntries(
      Object.entries(a.layer_version_set).sort(([x], [y]) =>
        x.localeCompare(y),
      ),
    ),
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
    ratification_artifact_hash: a.ratification_artifact_hash,
    completion_state: a.completion_state,
    level: a.level,
    rollout_recommended: a.rollout_recommended,
    critical_breach_count: a.critical_breach_count,
    blocking_violations: [...a.blocking_violations].sort(),
  };
  return JSON.stringify(ordered);
}

export function buildL8CertificationArtifact(
  inputs: L8CertificationInputs,
): L8CertificationArtifact {
  const passing = new Set<L8CertificationBand>();
  const blocking: string[] = [];
  for (const b of inputs.bands) {
    if (b.ok) passing.add(b.band);
    else blocking.push(
      `band:${b.band}:${b.blocking_violations.join('|') || 'failed'}`,
    );
  }
  for (const inv of inputs.invariants) {
    if (!inv.holds) blocking.push(`inv:${inv.id}:${inv.evidence}`);
  }
  if (inputs.completion_state !== 'L8_PRODUCTION_READY') {
    blocking.push(`completion:${inputs.completion_state}`);
  }

  const level = deriveL8CertificationLevel(passing);
  const criticalBreaches = blocking.filter(
    v =>
      v.startsWith('inv:INV-8.8') ||
      v.startsWith('inv:INV-8.9') ||
      v.startsWith('completion:'),
  ).length;

  const rolloutRecommended =
    level === L8CertificationLevel.PRODUCTION_GREEN &&
    blocking.length === 0 &&
    criticalBreaches === 0;

  const partial: Omit<L8CertificationArtifact, 'artifact_fingerprint'> = {
    certification_run_id: inputs.certification_run_id,
    emitted_at: new Date().toISOString(),
    layer_version_set: inputs.layer_version_set,
    bands: inputs.bands,
    invariants: inputs.invariants,
    ratification_artifact_hash: inputs.ratification_artifact_hash,
    completion_state: inputs.completion_state,
    level,
    rollout_recommended: rolloutRecommended,
    critical_breach_count: criticalBreaches,
    blocking_violations: blocking,
  };

  const hashInput = canonicalizeL8Artifact({
    ...partial,
    artifact_fingerprint: '',
  });
  return { ...partial, artifact_fingerprint: fingerprintL8(hashInput) };
}

const artifactLog: L8CertificationArtifact[] = [];

export function registerL8CertificationArtifact(
  a: L8CertificationArtifact,
): void {
  artifactLog.push(a);
}

export function getLatestL8CertificationArtifact():
  L8CertificationArtifact | null {
  return artifactLog.length === 0
    ? null
    : artifactLog[artifactLog.length - 1];
}

export function listL8CertificationArtifacts():
  readonly L8CertificationArtifact[] {
  return [...artifactLog];
}

export function clearL8CertificationArtifacts(): void {
  artifactLog.length = 0;
}
