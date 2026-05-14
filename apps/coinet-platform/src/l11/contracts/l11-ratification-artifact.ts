/**
 * L11.9 — Ratification Artifact (§11.9.10)
 *
 * Canonical, deterministic Layer 11 ratification artifact emitted by
 * the master certification orchestrator. The artifact carries:
 *
 *   - certification level (per §11.9.10.2)
 *   - per-sublayer summaries
 *   - per-band results
 *   - aggregated invariant results
 *   - regression results
 *   - rollout recommendation + freeze status
 *   - critical-breach + warning counts
 *   - dependency / freeze / extension contract refs
 *   - deterministic fingerprint
 */

import { L11SublayerId } from './l11-layer-inventory';

export const L11_RATIFICATION_ARTIFACT_POLICY_VERSION =
  'l11.9.ratification.v1';

export enum L11CertificationLevel {
  NOT_CERTIFIED = 'NOT_CERTIFIED',
  CONSTITUTIONAL_GREEN = 'CONSTITUTIONAL_GREEN',
  RUNTIME_GREEN = 'RUNTIME_GREEN',
  PERSISTENCE_GREEN = 'PERSISTENCE_GREEN',
  PRODUCTION_GREEN = 'PRODUCTION_GREEN',
}

export const ALL_L11_CERTIFICATION_LEVELS:
  readonly L11CertificationLevel[] = Object.values(L11CertificationLevel);

export const L11_CERTIFICATION_LEVEL_RANK:
  Readonly<Record<L11CertificationLevel, number>> = {
  [L11CertificationLevel.NOT_CERTIFIED]: 0,
  [L11CertificationLevel.CONSTITUTIONAL_GREEN]: 1,
  [L11CertificationLevel.RUNTIME_GREEN]: 2,
  [L11CertificationLevel.PERSISTENCE_GREEN]: 3,
  [L11CertificationLevel.PRODUCTION_GREEN]: 4,
};

export interface L11SublayerCertificationSummary {
  readonly sublayer: L11SublayerId;
  readonly suite_id: string;
  readonly assertions_passed: number;
  readonly assertions_failed: number;
  readonly invariants_held: number;
  readonly invariants_failed: number;
  readonly evidence: string;
}

export interface L11CertificationBandResult {
  readonly band_id: string;
  readonly title: string;
  readonly passed: boolean;
  readonly reason: string;
  readonly source_sublayers: readonly L11SublayerId[];
}

export interface L11InvariantResult {
  readonly invariant_id: string;
  readonly held: boolean;
  readonly evidence: string;
}

export interface L11RegressionResult {
  readonly suite_id: string;
  readonly assertions_passed: number;
  readonly assertions_failed: number;
}

export interface L11LayerRatificationArtifact {
  readonly artifact_id: string;

  readonly layer_id: 'L11';
  readonly layer_name: 'Deterministic Scoring Engine';

  readonly certification_level: L11CertificationLevel;

  readonly sublayer_results:
    Readonly<Partial<Record<L11SublayerId, L11SublayerCertificationSummary>>>;

  readonly certification_band_results: readonly L11CertificationBandResult[];

  readonly invariant_results: readonly L11InvariantResult[];

  readonly regression_results: readonly L11RegressionResult[];

  readonly rollout_recommended: boolean;
  readonly freeze_activated: boolean;

  readonly critical_breach_count: number;
  readonly warning_count: number;

  readonly dependency_contract_ref: string;
  readonly freeze_policy_ref: string;
  readonly extension_policy_ref: string;

  readonly artifact_fingerprint: string;

  readonly generated_at: string;
  readonly policy_version: string;
}

/**
 * §11.9.20 — Compute the canonical fingerprint over a stable
 * subset of artifact material. Order-only changes in unordered
 * sets (sublayer_results, invariant_results, band_results) must not
 * alter the fingerprint, so we sort by id before serializing.
 */
export function computeL11ArtifactFingerprint(
  art: Omit<L11LayerRatificationArtifact, 'artifact_fingerprint'>,
): string {
  const subSorted = Object.entries(art.sublayer_results)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, s]) => ({
      id, suite_id: s?.suite_id, p: s?.assertions_passed, f: s?.assertions_failed,
      ih: s?.invariants_held, if_: s?.invariants_failed,
    }));
  const bandsSorted = [...art.certification_band_results]
    .sort((a, b) => a.band_id.localeCompare(b.band_id))
    .map(b => ({ id: b.band_id, t: b.title, p: b.passed }));
  const invsSorted = [...art.invariant_results]
    .sort((a, b) => a.invariant_id.localeCompare(b.invariant_id))
    .map(i => ({ id: i.invariant_id, h: i.held }));
  const regsSorted = [...art.regression_results]
    .sort((a, b) => a.suite_id.localeCompare(b.suite_id))
    .map(r => ({
      id: r.suite_id, p: r.assertions_passed, f: r.assertions_failed,
    }));

  const material = JSON.stringify({
    layer_id: art.layer_id,
    layer_name: art.layer_name,
    cert_level: art.certification_level,
    sublayers: subSorted,
    bands: bandsSorted,
    invariants: invsSorted,
    regressions: regsSorted,
    rollout: art.rollout_recommended,
    freeze: art.freeze_activated,
    critical: art.critical_breach_count,
    warnings: art.warning_count,
    dep: art.dependency_contract_ref,
    fp: art.freeze_policy_ref,
    ep: art.extension_policy_ref,
    pv: art.policy_version,
  });

  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) {
    h ^= material.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  // 64-bit fingerprint by FNV-1a folding two passes
  let h2 = 0xcbf29ce484222325n;
  const FNV_PRIME = 0x100000001b3n;
  const MASK = 0xffffffffffffffffn;
  for (let i = 0; i < material.length; i++) {
    h2 ^= BigInt(material.charCodeAt(i));
    h2 = (h2 * FNV_PRIME) & MASK;
  }
  const a = h.toString(16).padStart(8, '0');
  const b = h2.toString(16).padStart(16, '0');
  return `l11.fp.${a}.${b}`;
}
