/**
 * L10.9 — Certification Report / Master Artifact
 *
 * §10.9.10 / §10.9.13 INV-10.9-A,F,G — Durable, machine-readable
 * `L10CertificationArtifact` summarizing a master L10 certification
 * run. Distinct from `L10LayerRatificationArtifact` (the closure /
 * ratification artifact); this record captures band + invariant
 * outcomes.
 */

import { L10CertificationBand } from './l10-certification-band';
import {
  L10CertificationLevel,
  deriveL10CertificationLevel,
} from './l10-certification-level';

export interface L10BandOutcome {
  readonly band: L10CertificationBand;
  readonly passed: number;
  readonly failed: number;
  readonly duration_ms: number;
  readonly ok: boolean;
  readonly blocking_violations: readonly string[];
}

export interface L10InvariantOutcome {
  readonly id: string;
  readonly holds: boolean;
  readonly evidence: string;
}

export interface L10CertificationArtifact {
  readonly certification_run_id: string;
  readonly emitted_at: string;
  readonly layer_version_set: Readonly<Record<string, string>>;
  readonly bands: readonly L10BandOutcome[];
  readonly invariants: readonly L10InvariantOutcome[];
  readonly ratification_artifact_hash: string;
  readonly completion_state: string;
  readonly level: L10CertificationLevel;
  readonly rollout_recommended: boolean;
  readonly critical_breach_count: number;
  readonly blocking_violations: readonly string[];
  readonly artifact_fingerprint: string;
}

export interface L10CertificationInputs {
  readonly certification_run_id: string;
  readonly layer_version_set: Readonly<Record<string, string>>;
  readonly bands: readonly L10BandOutcome[];
  readonly invariants: readonly L10InvariantOutcome[];
  readonly ratification_artifact_hash: string;
  readonly completion_state: string;
}

export function fingerprintL10(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('00000000' + h.toString(16)).slice(-8);
}

export function canonicalizeL10Artifact(
  a: L10CertificationArtifact,
): string {
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

export function buildL10CertificationArtifact(
  inputs: L10CertificationInputs,
): L10CertificationArtifact {
  const passing = new Set<L10CertificationBand>();
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
  if (inputs.completion_state !== 'L10_PRODUCTION_READY') {
    blocking.push(`completion:${inputs.completion_state}`);
  }

  const level = deriveL10CertificationLevel(passing);

  // Critical breaches: any invariant from L10.7/L10.8/L10.9 plus any
  // completion-level breach. L10.7/L10.8/L10.9 are the last safety
  // barriers (reliance, persistence/serving, closure).
  const criticalBreaches = blocking.filter(
    v =>
      v.startsWith('inv:INV-10.7') ||
      v.startsWith('inv:INV-10.8') ||
      v.startsWith('inv:INV-10.9') ||
      v.startsWith('completion:'),
  ).length;

  const rolloutRecommended =
    level === L10CertificationLevel.PRODUCTION_GREEN &&
    blocking.length === 0 &&
    criticalBreaches === 0;

  const partial: Omit<L10CertificationArtifact, 'artifact_fingerprint'> = {
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

  const hashInput = canonicalizeL10Artifact({
    ...partial,
    artifact_fingerprint: '',
  });
  return { ...partial, artifact_fingerprint: fingerprintL10(hashInput) };
}

const artifactLog: L10CertificationArtifact[] = [];

export function registerL10CertificationArtifact(
  a: L10CertificationArtifact,
): void {
  artifactLog.push(a);
}

export function getLatestL10CertificationArtifact():
  L10CertificationArtifact | null {
  return artifactLog.length === 0
    ? null
    : artifactLog[artifactLog.length - 1];
}

export function listL10CertificationArtifacts():
  readonly L10CertificationArtifact[] {
  return [...artifactLog];
}

export function clearL10CertificationArtifacts(): void {
  artifactLog.length = 0;
}
