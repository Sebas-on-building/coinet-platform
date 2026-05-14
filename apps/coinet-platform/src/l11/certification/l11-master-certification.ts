/**
 * L11.9 — Master Certification Orchestrator (§11.9.19)
 *
 * Pure builder: given the already-computed sublayer summaries,
 * regression results, invariant results, governance flags, and
 * dependency / freeze / extension policy refs, this function
 * deterministically produces the canonical `L11LayerRatificationArtifact`.
 *
 * §11.9.2 Non-duplication law: this orchestrator does NOT re-run any
 * sublayer suite. The caller (the certification harness) is expected
 * to have run them and to pass in the summaries.
 */

import {
  L11LayerRatificationArtifact,
  L11SublayerCertificationSummary,
  L11CertificationBandResult,
  L11InvariantResult,
  L11RegressionResult,
  L11_RATIFICATION_ARTIFACT_POLICY_VERSION,
  computeL11ArtifactFingerprint,
} from '../contracts/l11-ratification-artifact';
import { L11SublayerId } from '../contracts/l11-layer-inventory';
import {
  deriveL11CertificationLevel,
  L11CertificationLevelInput,
} from './l11-certification-level';
import {
  buildL11SublayerGreenMap,
  buildL11BandGreenMap,
} from './l11-certification-report';
import { L11CertificationLevel } from '../contracts/l11-ratification-artifact';

export interface L11MasterCertificationInput {
  readonly sublayer_summaries: readonly L11SublayerCertificationSummary[];
  readonly band_results: readonly L11CertificationBandResult[];
  readonly invariant_results: readonly L11InvariantResult[];
  readonly regression_results: readonly L11RegressionResult[];

  readonly l10_master_green: boolean;
  readonly rollout_recommended: boolean;
  readonly freeze_activated: boolean;

  readonly dependency_contract_ref: string;
  readonly freeze_policy_ref: string;
  readonly extension_policy_ref: string;

  readonly critical_breach_count: number;
  readonly warning_count: number;

  readonly generated_at: string;
}

/** §11.9.19.2 — entry point. */
export function runL11MasterCertification(
  input: L11MasterCertificationInput,
): L11LayerRatificationArtifact {
  // 1) reduce summaries → green map
  const sublayerGreen = buildL11SublayerGreenMap(input.sublayer_summaries);
  const bandGreen = buildL11BandGreenMap(input.band_results);

  // 2) sublayer_results record (keyed by sublayer)
  const sublayer_results: Partial<Record<L11SublayerId,
    L11SublayerCertificationSummary>> = {};
  for (const s of input.sublayer_summaries) {
    sublayer_results[s.sublayer] = s;
  }

  // 3) derive certification level
  const levelDecision = deriveL11CertificationLevel({
    sublayer_green: sublayerGreen,
    band_green: bandGreen,
    critical_breach_count: input.critical_breach_count,
    freeze_policy_active: input.freeze_activated,
    rollout_recommended: input.rollout_recommended,
    artifact_fingerprint_present: true,
  });

  // 4) build artifact (without fingerprint)
  const artifactBase: Omit<L11LayerRatificationArtifact, 'artifact_fingerprint'> = {
    artifact_id: 'l11.ratification.v1',
    layer_id: 'L11',
    layer_name: 'Deterministic Scoring Engine',
    certification_level: levelDecision.level,
    sublayer_results,
    certification_band_results: input.band_results,
    invariant_results: input.invariant_results,
    regression_results: input.regression_results,
    rollout_recommended: input.rollout_recommended,
    freeze_activated: input.freeze_activated,
    critical_breach_count: input.critical_breach_count,
    warning_count: input.warning_count,
    dependency_contract_ref: input.dependency_contract_ref,
    freeze_policy_ref: input.freeze_policy_ref,
    extension_policy_ref: input.extension_policy_ref,
    generated_at: input.generated_at,
    policy_version: L11_RATIFICATION_ARTIFACT_POLICY_VERSION,
  };

  const fingerprint = computeL11ArtifactFingerprint(artifactBase);
  return { ...artifactBase, artifact_fingerprint: fingerprint };
}

export function l11ArtifactIsProductionGreen(
  art: L11LayerRatificationArtifact,
): boolean {
  return art.certification_level === L11CertificationLevel.PRODUCTION_GREEN
    && art.critical_breach_count === 0;
}

/** Re-export the level input type so callers can build manual scenarios. */
export type { L11CertificationLevelInput };
