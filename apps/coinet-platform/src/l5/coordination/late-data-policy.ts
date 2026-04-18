/**
 * L5.5 Write Coordination — Late Data Policy
 *
 * §5.5.14 — Late data law
 */

import type { ResolvedStorageEnvelope } from '../envelope';

// ═══════════════════════════════════════════════════════════════════════════════
// LATE DATA CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export enum LateDataClass {
  HISTORICAL_ONLY = 'HISTORICAL_ONLY',
  AUTHORITY_AFFECTING = 'AUTHORITY_AFFECTING',
  EPHEMERAL_STALE = 'EPHEMERAL_STALE',
}

// ═══════════════════════════════════════════════════════════════════════════════
// LATE DATA ASSESSMENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface LateDataAssessment {
  readonly isLate: boolean;
  readonly lateDataClass: LateDataClass | null;
  readonly latenessMs: number;
  readonly rematerializationRequired: boolean;
  readonly currentTruthEligibleToChange: boolean;
  readonly allowedPaths: readonly LateDataAllowedPath[];
}

export type LateDataAllowedPath =
  | 'CLICKHOUSE_HISTORY_UPDATE'
  | 'ARCHIVE_BACKFILL'
  | 'ANALYTICAL_ROLLUP'
  | 'REMATERIALIZATION'
  | 'DISCARD';

// ═══════════════════════════════════════════════════════════════════════════════
// ASSESS LATE DATA
// ═══════════════════════════════════════════════════════════════════════════════

const LATE_THRESHOLD_MS = 30_000;

export function assessLateData(env: ResolvedStorageEnvelope): LateDataAssessment {
  const isLate = env.late_arrival_flag || !!env.late_arrival_detected_at;

  if (!isLate) {
    return {
      isLate: false,
      lateDataClass: null,
      latenessMs: 0,
      rematerializationRequired: false,
      currentTruthEligibleToChange: false,
      allowedPaths: [],
    };
  }

  const observedAt = new Date(env.source_observed_at).getTime();
  const ingestedAt = new Date(env.ingested_at).getTime();
  const latenessMs = Math.max(0, ingestedAt - observedAt);

  if (env.routing.primary_state_class === 'EPHEMERAL_HOT_STATE') {
    return {
      isLate: true,
      lateDataClass: LateDataClass.EPHEMERAL_STALE,
      latenessMs,
      rematerializationRequired: false,
      currentTruthEligibleToChange: false,
      allowedPaths: ['DISCARD'],
    };
  }

  const affectsAuthority = env.routing.primary_state_class === 'RELATIONAL_AUTHORITY' && latenessMs > LATE_THRESHOLD_MS;

  if (affectsAuthority) {
    return {
      isLate: true,
      lateDataClass: LateDataClass.AUTHORITY_AFFECTING,
      latenessMs,
      rematerializationRequired: true,
      currentTruthEligibleToChange: true,
      allowedPaths: ['REMATERIALIZATION'],
    };
  }

  return {
    isLate: true,
    lateDataClass: LateDataClass.HISTORICAL_ONLY,
    latenessMs,
    rematerializationRequired: false,
    currentTruthEligibleToChange: false,
    allowedPaths: ['CLICKHOUSE_HISTORY_UPDATE', 'ARCHIVE_BACKFILL', 'ANALYTICAL_ROLLUP'],
  };
}

export function isLateDataSilentOverwrite(assessment: LateDataAssessment, governedRematerializationExists: boolean): boolean {
  if (!assessment.isLate) return false;
  if (assessment.lateDataClass === LateDataClass.AUTHORITY_AFFECTING && !governedRematerializationExists) {
    return true;
  }
  return false;
}
