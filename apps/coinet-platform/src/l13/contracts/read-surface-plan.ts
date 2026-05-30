/**
 * L13.6 — Read-Surface Plan Contract
 *
 * §13.6.7 — The read-surface selection engine emits a
 * `L13RuntimeReadPlan` listing the L13.1-registered dependency
 * surfaces required for the resolved intent + scope. Raw lower-
 * layer reads are illegal; only registered surface classes may be
 * requested.
 */

import type { L13DependencySurfaceClass } from './l13-constitutional-types';

/**
 * §13.6.7.3 — Read-plan status taxonomy.
 */
export enum L13ReadPlanStatus {
  READY = 'READY',
  READY_WITH_OPTIONAL_GAPS = 'READY_WITH_OPTIONAL_GAPS',
  BLOCKED_MISSING_REQUIRED_SURFACE = 'BLOCKED_MISSING_REQUIRED_SURFACE',
  BLOCKED_RAW_SURFACE_REQUEST = 'BLOCKED_RAW_SURFACE_REQUEST',
  BLOCKED_ILLEGAL_BUNDLE = 'BLOCKED_ILLEGAL_BUNDLE',
}

export const ALL_L13_READ_PLAN_STATUSES:
  readonly L13ReadPlanStatus[] =
  Object.values(L13ReadPlanStatus);

export function isL13BlockingReadPlanStatus(
  status: L13ReadPlanStatus,
): boolean {
  return (
    status ===
      L13ReadPlanStatus.BLOCKED_MISSING_REQUIRED_SURFACE ||
    status === L13ReadPlanStatus.BLOCKED_RAW_SURFACE_REQUEST ||
    status === L13ReadPlanStatus.BLOCKED_ILLEGAL_BUNDLE
  );
}

/**
 * §13.6.7.2 — Runtime Read Plan.
 */
export interface L13RuntimeReadPlan {
  readonly read_plan_id: string;
  readonly request_id: string;
  readonly intent_classification_ref: string;
  readonly scope_resolution_ref: string;

  readonly required_surface_classes:
    readonly L13DependencySurfaceClass[];
  readonly optional_surface_classes:
    readonly L13DependencySurfaceClass[];

  readonly required_bundle_refs: readonly string[];
  readonly optional_bundle_refs: readonly string[];

  readonly l11_score_context_required: boolean;
  readonly l12_scenario_context_required: boolean;

  readonly missing_required_surface_classes:
    readonly L13DependencySurfaceClass[];

  readonly read_plan_status: L13ReadPlanStatus;

  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}
