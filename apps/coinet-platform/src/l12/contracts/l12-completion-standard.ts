/**
 * L12.7 — Completion Standard (§12.7.3.4)
 *
 * Hard, mechanical contract that the master certification orchestrator
 * validates before declaring Layer 12 production-ready. The completion
 * standard does not reach into L12.1–L12.6 internals; it only declares
 * the certifications, bands, invariants, and tolerances required.
 */

import {
  L12CertificationBand,
  ALL_L12_CERTIFICATION_BANDS,
} from '../certification/l12-certification-band';
import {
  L12CertificationLevel,
} from '../certification/l12-certification-level';
import { L12SublayerId } from './l12-final-definition';

export const L12_COMPLETION_STANDARD_POLICY_VERSION =
  'l12.7.completion.v1';

/**
 * Per-sublayer certification requirement. The completion standard
 * declares which suite (test script id) is the canonical evidence that
 * the sublayer is green.
 */
export interface L12SublayerCertificationRequirement {
  readonly sublayer: L12SublayerId;
  readonly required_suite_id: string;
  readonly description: string;
}

/** §12.7.20 — canonical sublayer suite mapping. */
export const L12_REQUIRED_SUBLAYER_CERTIFICATIONS:
  readonly L12SublayerCertificationRequirement[] = [
  {
    sublayer: L12SublayerId.L12_1_CONSTITUTION,
    required_suite_id: 'test-l12_1-constitution',
    description: 'L12.1 — constitutional boundary frozen',
  },
  {
    sublayer: L12SublayerId.L12_2_OBJECTS,
    required_suite_id: 'test-l12_2-objects',
    description: 'L12.2 — scenario object model frozen',
  },
  {
    sublayer: L12SublayerId.L12_3_CONTRACTS,
    required_suite_id: 'test-l12_3-contracts',
    description: 'L12.3 — universal contracts and output law frozen',
  },
  {
    sublayer: L12SublayerId.L12_4_RUNTIME,
    required_suite_id: 'test-l12_4-runtime',
    description: 'L12.4 — deterministic scenario DAG runtime',
  },
  {
    sublayer: L12SublayerId.L12_5_TEMPLATES,
    required_suite_id: 'test-l12_5-templates',
    description:
      'L12.5 — scenario templates, trigger/invalidation/confidence law',
  },
  {
    sublayer: L12SublayerId.L12_6_PERSISTENCE,
    required_suite_id: 'test-l12_6-persistence',
    description:
      'L12.6 — persistence, read surfaces, replay, repair, downstream law',
  },
  {
    sublayer: L12SublayerId.L12_7_RATIFICATION,
    required_suite_id: 'test-l12_7-ratification',
    description: 'L12.7 — ratification, freeze, rollout, done definition',
  },
];

/** §12.7.18 — invariants that must be present for ratification. */
export const L12_REQUIRED_INVARIANT_IDS: readonly string[] = [
  'INV-12.7-A',
  'INV-12.7-B',
  'INV-12.7-C',
  'INV-12.7-D',
  'INV-12.7-E',
  'INV-12.7-F',
  'INV-12.7-G',
  'INV-12.7-H',
  'INV-12.7-I',
  'INV-12.7-J',
];

/** §12.7.3.4 — frozen completion standard. */
export interface L12CompletionStandard {
  readonly completion_standard_id: string;

  readonly required_sublayer_certifications:
    readonly L12SublayerCertificationRequirement[];

  readonly required_certification_bands: readonly L12CertificationBand[];

  readonly required_invariants: readonly string[];

  readonly minimum_certification_level: L12CertificationLevel;

  readonly critical_breach_tolerance: 0;

  readonly prediction_theater_tolerance: 0;
  readonly recommendation_leak_tolerance: 0;
  readonly final_judgment_leak_tolerance: 0;
  readonly lower_layer_rebuild_tolerance: 0;

  readonly requires_l5_persistence_green: true;
  readonly requires_replay_green: true;
  readonly requires_repair_green: true;
  readonly requires_downstream_no_rebuild_green: true;

  readonly policy_version: string;
}

/**
 * Canonical L12 completion standard. Tolerances are zero by contract
 * (see §12.7.3.4). The minimum certification level is
 * `PRODUCTION_GREEN`; any lower level signals the layer cannot ratify.
 */
export const L12_COMPLETION_STANDARD_V1: L12CompletionStandard = {
  completion_standard_id: 'l12.completion.v1',
  required_sublayer_certifications: L12_REQUIRED_SUBLAYER_CERTIFICATIONS,
  required_certification_bands: ALL_L12_CERTIFICATION_BANDS,
  required_invariants: L12_REQUIRED_INVARIANT_IDS,
  minimum_certification_level: L12CertificationLevel.PRODUCTION_GREEN,
  critical_breach_tolerance: 0,
  prediction_theater_tolerance: 0,
  recommendation_leak_tolerance: 0,
  final_judgment_leak_tolerance: 0,
  lower_layer_rebuild_tolerance: 0,
  requires_l5_persistence_green: true,
  requires_replay_green: true,
  requires_repair_green: true,
  requires_downstream_no_rebuild_green: true,
  policy_version: L12_COMPLETION_STANDARD_POLICY_VERSION,
};

/** Per-sublayer status (used by the audit / invariants). */
export interface L12SublayerCertificationStatus {
  readonly sublayer: L12SublayerId;
  readonly suite_id: string;
  readonly green: boolean;
  readonly assertions_passed: number;
  readonly assertions_failed: number;
  readonly evidence: string;
}

/** Aggregated completion standard report. */
export interface L12CompletionStandardReport {
  readonly completion_standard_id: string;
  readonly all_satisfied: boolean;
  readonly sublayer_statuses:
    readonly L12SublayerCertificationStatus[];
  readonly missing_invariants: readonly string[];
  readonly failing_bands: readonly L12CertificationBand[];
  readonly critical_breach_count: number;
  readonly policy_version: string;
}

export function makeL12SublayerCertificationStatus(
  sublayer: L12SublayerId,
  suite_id: string,
  assertions_passed: number,
  assertions_failed: number,
  evidence?: string,
): L12SublayerCertificationStatus {
  const green = assertions_failed === 0 && assertions_passed > 0;
  return {
    sublayer,
    suite_id,
    green,
    assertions_passed,
    assertions_failed,
    evidence: evidence ??
      `${suite_id}: ${assertions_passed} passed, ${assertions_failed} failed`,
  };
}
