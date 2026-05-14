/**
 * L12.7 — Master Certification Orchestrator (§12.7.7)
 *
 * Pure builder: given the already-computed sublayer summaries, band
 * results, invariant results, governance flags, and surface refs,
 * deterministically produces the canonical
 * `L12MasterCertificationResult`.
 *
 * §12.7.0 Non-duplication law: this orchestrator does NOT re-run any
 * sublayer suite. The caller (the certification harness) is expected
 * to have run them and to pass in the summaries.
 */

import {
  L12LayerRatificationArtifact,
} from '../contracts/l12-ratification-artifact';
import {
  L12FrozenSurfaceRef,
} from '../contracts/l12-freeze-policy';
import { L12SublayerId } from '../contracts/l12-final-definition';

import {
  L12CertificationLevel,
  deriveL12CertificationLevel,
} from './l12-certification-level';
import {
  L12CertificationBand,
} from './l12-certification-band';
import {
  L12CertificationReport,
  L12CertificationBandResult,
  L12SublayerCertificationResult,
  L12InvariantCertificationResult,
  L12_CERTIFICATION_REPORT_POLICY_VERSION,
  buildL12SublayerGreenMap,
  buildL12BandGreenMap,
  isL12SublayerResultGreen,
} from './l12-certification-report';
import {
  buildL12RatificationArtifact,
} from './l12-ratification-builder';
import { fingerprintL12String } from '../contracts/l12-ratification-artifact';

/** §12.7.12 — rollout gate status (re-export for the master result). */
export enum L12RolloutGateStatus {
  BLOCKED = 'BLOCKED',
  ALLOWED_SHADOW_ONLY = 'ALLOWED_SHADOW_ONLY',
  ALLOWED_CANARY = 'ALLOWED_CANARY',
  ALLOWED_PARTIAL_LIVE = 'ALLOWED_PARTIAL_LIVE',
  ALLOWED_FULL_LIVE = 'ALLOWED_FULL_LIVE',
  FROZEN_LIVE = 'FROZEN_LIVE',
}

/** §12.7.7 — master certification result. */
export interface L12MasterCertificationResult {
  readonly master_result_id: string;

  readonly layer_id: 'L12_SCENARIO_ENGINE';

  readonly certification_report: L12CertificationReport;

  readonly ratification_artifact: L12LayerRatificationArtifact;

  readonly production_green: boolean;

  readonly rollout_gate_status: L12RolloutGateStatus;

  readonly frozen_surfaces: readonly L12FrozenSurfaceRef[];

  readonly l13_handoff_approved: boolean;

  readonly blocking_reasons: readonly string[];

  readonly replay_hash: string;

  readonly policy_version: string;
}

export interface L12MasterCertificationInput {
  readonly master_result_id: string;
  readonly layer_version: string;

  readonly sublayer_results:
    readonly L12SublayerCertificationResult[];
  readonly band_results: readonly L12CertificationBandResult[];
  readonly invariant_results:
    readonly L12InvariantCertificationResult[];

  readonly frozen_sublayers: readonly L12SublayerId[];
  readonly frozen_surfaces: readonly L12FrozenSurfaceRef[];

  readonly scenario_family_material: string;
  readonly scenario_template_material: string;
  readonly scenario_contract_material: string;
  readonly runtime_dag_material: string;
  readonly persistence_surface_material: string;
  readonly read_surface_material: string;

  readonly critical_breach_count: number;
  readonly error_count: number;
  readonly warning_count: number;

  readonly prediction_theater_breach_count: number;
  readonly recommendation_leak_count: number;
  readonly final_judgment_leak_count: number;
  readonly lower_layer_rebuild_breach_count: number;

  readonly rollout_recommended: boolean;
  readonly l13_handoff_approved: boolean;
  readonly freeze_activated: boolean;

  readonly generated_at: string;
}

function rolloutGateFromLevel(
  level: L12CertificationLevel,
  l13Approved: boolean,
  freezeActivated: boolean,
  criticalBreaches: number,
): L12RolloutGateStatus {
  if (criticalBreaches > 0) return L12RolloutGateStatus.BLOCKED;
  switch (level) {
    case L12CertificationLevel.NOT_CERTIFIED:
      return L12RolloutGateStatus.BLOCKED;
    case L12CertificationLevel.CONTRACT_ONLY:
      return L12RolloutGateStatus.ALLOWED_SHADOW_ONLY;
    case L12CertificationLevel.RUNTIME_GREEN:
      return L12RolloutGateStatus.ALLOWED_CANARY;
    case L12CertificationLevel.PERSISTENCE_GREEN:
      return L12RolloutGateStatus.ALLOWED_PARTIAL_LIVE;
    case L12CertificationLevel.PRODUCTION_GREEN:
      return l13Approved
        ? L12RolloutGateStatus.ALLOWED_FULL_LIVE
        : L12RolloutGateStatus.ALLOWED_PARTIAL_LIVE;
    case L12CertificationLevel.FROZEN_LIVE:
      return freezeActivated
        ? L12RolloutGateStatus.FROZEN_LIVE
        : L12RolloutGateStatus.ALLOWED_FULL_LIVE;
    default:
      return L12RolloutGateStatus.BLOCKED;
  }
}

/** §12.7.7 — entry point. */
export function runL12MasterCertification(
  input: L12MasterCertificationInput,
): L12MasterCertificationResult {
  const sublayerGreen = buildL12SublayerGreenMap(input.sublayer_results);
  const bandGreen = buildL12BandGreenMap(input.band_results);

  const totalsPassed = input.sublayer_results
    .reduce((a, r) => a + r.assertions_passed, 0);
  const totalsFailed = input.sublayer_results
    .reduce((a, r) => a + r.assertions_failed, 0);
  const total = totalsPassed + totalsFailed;

  // Material for the invariant fingerprint over invariant_results.
  const invMaterial = JSON.stringify(
    [...input.invariant_results]
      .map(i => ({ id: i.invariant_id, h: i.held }))
      .sort((a, b) => a.id.localeCompare(b.id))
  );
  const invariantMaterialFp = fingerprintL12String(invMaterial);

  // Build a placeholder artifact for level derivation (no fingerprint
  // collision matters here; the artifact below is the canonical one).
  const levelDecision = deriveL12CertificationLevel({
    sublayer_green: sublayerGreen,
    band_green: bandGreen,
    critical_breach_count: input.critical_breach_count,
    l13_handoff_approved: input.l13_handoff_approved,
    freeze_activated: input.freeze_activated,
    artifact_fingerprint_present: true,
    rollout_recommended: input.rollout_recommended,
  });

  const productionGreen =
    (levelDecision.level === L12CertificationLevel.PRODUCTION_GREEN ||
     levelDecision.level === L12CertificationLevel.FROZEN_LIVE) &&
    input.critical_breach_count === 0;

  const ratificationArtifact = buildL12RatificationArtifact({
    ratification_artifact_id: `${input.master_result_id}.artifact`,
    layer_version: input.layer_version,
    certification_level: levelDecision.level,
    frozen_sublayers: input.frozen_sublayers,
    frozen_surfaces: input.frozen_surfaces,
    scenario_family_material: input.scenario_family_material,
    scenario_template_material: input.scenario_template_material,
    scenario_contract_material: input.scenario_contract_material,
    runtime_dag_material: input.runtime_dag_material,
    persistence_surface_material: input.persistence_surface_material,
    read_surface_material: input.read_surface_material,
    invariant_material: invMaterial,
    critical_breach_count: input.critical_breach_count,
    rollout_recommended: input.rollout_recommended,
    l13_dependency_approved: input.l13_handoff_approved,
    created_at: input.generated_at,
  });

  const certificationReport: L12CertificationReport = {
    certification_report_id: `${input.master_result_id}.report`,
    layer_id: 'L12_SCENARIO_ENGINE',
    certification_level: levelDecision.level,
    band_results: input.band_results,
    sublayer_results: input.sublayer_results,
    invariant_results: input.invariant_results,
    total_assertions: total,
    passed_assertions: totalsPassed,
    failed_assertions: totalsFailed,
    critical_breach_count: input.critical_breach_count,
    error_count: input.error_count,
    warning_count: input.warning_count,
    prediction_theater_breach_count: input.prediction_theater_breach_count,
    recommendation_leak_count: input.recommendation_leak_count,
    final_judgment_leak_count: input.final_judgment_leak_count,
    lower_layer_rebuild_breach_count:
      input.lower_layer_rebuild_breach_count,
    rollout_recommended: input.rollout_recommended,
    freeze_recommended: productionGreen,
    artifact_fingerprint_ref:
      ratificationArtifact.combined_layer_fingerprint,
    generated_at: input.generated_at,
    policy_version: L12_CERTIFICATION_REPORT_POLICY_VERSION,
    replay_hash: ratificationArtifact.replay_hash,
  };

  const rolloutStatus = rolloutGateFromLevel(
    levelDecision.level,
    input.l13_handoff_approved,
    input.freeze_activated,
    input.critical_breach_count);

  const blocking: string[] = [];
  if (input.critical_breach_count > 0) {
    blocking.push(`${input.critical_breach_count} critical breach(es)`);
  }
  if (!input.l13_handoff_approved) {
    blocking.push('L13 handoff not approved');
  }
  if (!input.rollout_recommended) {
    blocking.push('rollout not recommended');
  }
  for (const r of input.sublayer_results) {
    if (!isL12SublayerResultGreen(r)) {
      blocking.push(`${r.sublayer} sublayer not green`);
    }
  }
  for (const b of input.band_results) {
    if (!b.passed) {
      blocking.push(`band ${b.band_id} failed: ${b.reason}`);
    }
  }

  // Touch invariantMaterialFp so it's part of the build (already
  // folded into ratification artifact via invariant_material).
  void invariantMaterialFp;
  void L12CertificationBand;

  return {
    master_result_id: input.master_result_id,
    layer_id: 'L12_SCENARIO_ENGINE',
    certification_report: certificationReport,
    ratification_artifact: ratificationArtifact,
    production_green: productionGreen,
    rollout_gate_status: rolloutStatus,
    frozen_surfaces: input.frozen_surfaces,
    l13_handoff_approved: input.l13_handoff_approved,
    blocking_reasons: blocking,
    replay_hash: ratificationArtifact.replay_hash,
    policy_version: 'l12.7.master-cert.v1',
  };
}
