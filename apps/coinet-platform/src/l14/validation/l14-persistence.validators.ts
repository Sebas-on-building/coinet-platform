/**
 * L14.8 — Persistence Validators
 *
 * §14.8.41 / §14.8.46 — Consolidated per-shape validators using L14P_* codes.
 */

import { L14ConstitutionalAuditSeverity } from '../contracts/l14-constitutional-types';
import {
  L14DurableSurfaceId,
  L14MaterializationMode,
  type L14PersistenceEnvelope,
} from '../contracts/l14-persistence-surfaces';
import {
  type L14HistoricalFactRecord,
} from '../contracts/l14-historical-facts';
import {
  type L14AlertPerformanceFact,
  type L14ChannelHealthFact,
  type L14DeliveryFailureRecord,
} from '../contracts/l14-performance-health-facts';
import {
  type L14GovernedReadResult,
  type L14ReadRequest,
} from '../contracts/l14-read-surfaces';
import {
  type L14ReplayResult,
} from '../contracts/l14-replay-contracts';
import {
  type L14RepairRequest,
  type L14RepairResult,
} from '../contracts/l14-repair-contracts';
import {
  admitL14ReadRequest,
  isL14ReadSurfaceRegistered,
} from '../read/l14-read-engines';
import {
  isHistoricalFamilySourceSurfaceLegal,
  isL14DurableSurfaceRegistered,
  isMaterializationModeLegalForSurface,
} from '../persistence/l14-persistence-engines';
import { L14PersistenceViolationCode as C } from './l14-persistence-violation-codes';

const SEV = L14ConstitutionalAuditSeverity;

export interface L14PersistenceIssue {
  readonly code: C;
  readonly severity: L14ConstitutionalAuditSeverity;
  readonly message: string;
}

export interface L14PersistenceValidationResult {
  readonly clean: boolean;
  readonly issues: readonly L14PersistenceIssue[];
}

function result(issues: readonly L14PersistenceIssue[]): L14PersistenceValidationResult {
  return { clean: issues.length === 0, issues };
}

function err(code: C, severity: L14ConstitutionalAuditSeverity, message: string): L14PersistenceIssue {
  return { code, severity, message };
}

// ── 1. Persistence envelope ──────────────────────────────────────

export function validateL14PersistenceEnvelope(
  e: L14PersistenceEnvelope,
): L14PersistenceValidationResult {
  const issues: L14PersistenceIssue[] = [];
  if (!e.l5_route_ref) issues.push(err(C.L14P_L5_ROUTE_MISSING, SEV.CRITICAL, 'l5_route_ref missing — direct write attempt'));
  if (!e.write_authority_ref) issues.push(err(C.L14P_DIRECT_WRITE_ATTEMPT, SEV.CRITICAL, 'write_authority_ref missing — direct write attempt'));
  if (!isL14DurableSurfaceRegistered(e.target_surface_id)) {
    issues.push(err(C.L14P_UNKNOWN_DURABLE_SURFACE, SEV.CRITICAL, `unknown surface: ${e.target_surface_id}`));
  } else if (!isMaterializationModeLegalForSurface(e.target_surface_id, e.materialization_mode)) {
    issues.push(err(C.L14P_ILLEGAL_MATERIALIZATION_MODE, SEV.CRITICAL,
      `mode ${e.materialization_mode} illegal for surface ${e.target_surface_id}`));
  }
  // Append-only mutation: CURRENT_REGISTRY_SUPERSESSION mode on append-only surface.
  if (e.materialization_mode === L14MaterializationMode.CURRENT_REGISTRY_SUPERSESSION) {
    // Only allowed on registries; durable surfaces are append-only.
    if (isL14DurableSurfaceRegistered(e.target_surface_id) &&
        e.target_surface_id !== L14DurableSurfaceId.ALERT_PERFORMANCE_FACTS &&
        e.target_surface_id !== L14DurableSurfaceId.CHANNEL_HEALTH_FACTS) {
      issues.push(err(C.L14P_APPEND_ONLY_SURFACE_MUTATION_ATTEMPT, SEV.CRITICAL,
        `supersession attempted on append-only surface ${e.target_surface_id}`));
    }
    if (!e.current_registry_supersession_ref) {
      issues.push(err(C.L14P_CURRENT_REGISTRY_WRITE_WITHOUT_SUPERSESSION, SEV.ERROR,
        'supersession mode requires current_registry_supersession_ref'));
    }
  }
  if (!e.lineage_refs || e.lineage_refs.length === 0) issues.push(err(C.L14P_LINEAGE_REFS_MISSING, SEV.ERROR, 'lineage empty'));
  if (!e.replay_hash) issues.push(err(C.L14P_REPLAY_HASH_MISSING, SEV.ERROR, 'replay hash missing'));
  return result(issues);
}

// ── 2. Historical fact ──────────────────────────────────────────

export function validateL14HistoricalFactRecord(
  r: L14HistoricalFactRecord,
): L14PersistenceValidationResult {
  const issues: L14PersistenceIssue[] = [];
  if (!r.source_record_ref) issues.push(err(C.L14P_HISTORICAL_FACT_SOURCE_REF_MISSING, SEV.ERROR, 'source_record_ref missing'));
  if (!isHistoricalFamilySourceSurfaceLegal(r.fact_family, r.source_surface_id)) {
    issues.push(err(C.L14P_HISTORICAL_FACT_FAMILY_MISMATCH, SEV.ERROR,
      `family ${r.fact_family} does not legally derive from surface ${r.source_surface_id}`));
  }
  if (!r.lineage_refs || r.lineage_refs.length === 0) issues.push(err(C.L14P_LINEAGE_REFS_MISSING, SEV.ERROR, 'lineage empty'));
  if (!r.replay_hash) issues.push(err(C.L14P_REPLAY_HASH_MISSING, SEV.ERROR, 'replay hash missing'));
  return result(issues);
}

// ── 3. Alert performance fact ────────────────────────────────────

export function validateL14AlertPerformanceFact(
  f: L14AlertPerformanceFact,
  sourceExecutionRefCount: number,
  sourceInteractionRefCount: number,
  sourceOutcomeRefCount: number,
): L14PersistenceValidationResult {
  const issues: L14PersistenceIssue[] = [];
  if (sourceExecutionRefCount === 0) {
    issues.push(err(C.L14P_ALERT_PERFORMANCE_FACT_SOURCE_INCOMPLETE, SEV.ERROR,
      'no source execution refs supplied'));
  }
  if (f.aligned_outcome_count + f.misaligned_outcome_count + f.inconclusive_outcome_count > 0 &&
      sourceOutcomeRefCount === 0) {
    issues.push(err(C.L14P_ALERT_PERFORMANCE_FACT_SOURCE_INCOMPLETE, SEV.ERROR,
      'outcome counts present but no source outcome refs'));
  }
  if ((f.opened_count + f.clicked_count + f.ignored_count + f.dismissed_count) > 0 &&
      sourceInteractionRefCount === 0) {
    issues.push(err(C.L14P_ALERT_PERFORMANCE_FACT_SOURCE_INCOMPLETE, SEV.ERROR,
      'interaction counts present but no source interaction refs'));
  }
  if (!f.lineage_refs || f.lineage_refs.length === 0) issues.push(err(C.L14P_LINEAGE_REFS_MISSING, SEV.ERROR, 'lineage empty'));
  if (!f.replay_hash) issues.push(err(C.L14P_REPLAY_HASH_MISSING, SEV.ERROR, 'replay hash missing'));
  return result(issues);
}

// ── 4. Channel health fact ───────────────────────────────────────

export function validateL14ChannelHealthFact(
  f: L14ChannelHealthFact,
): L14PersistenceValidationResult {
  const issues: L14PersistenceIssue[] = [];
  if (f.attempted_delivery_count > 0 &&
      (f.successful_delivery_count + f.failed_delivery_count > f.attempted_delivery_count)) {
    issues.push(err(C.L14P_CHANNEL_HEALTH_FACT_SOURCE_INCOMPLETE, SEV.ERROR,
      'success+failed exceeds attempted — source incomplete'));
  }
  if (!f.lineage_refs || f.lineage_refs.length === 0) issues.push(err(C.L14P_LINEAGE_REFS_MISSING, SEV.ERROR, 'lineage empty'));
  if (!f.replay_hash) issues.push(err(C.L14P_REPLAY_HASH_MISSING, SEV.ERROR, 'replay hash missing'));
  return result(issues);
}

// ── 5. Read request ──────────────────────────────────────────────

export function validateL14ReadRequest(
  r: L14ReadRequest,
): L14PersistenceValidationResult {
  const issues: L14PersistenceIssue[] = [];
  if (!isL14ReadSurfaceRegistered(r.read_surface_id)) {
    issues.push(err(C.L14P_READ_SURFACE_UNKNOWN, SEV.ERROR, `unknown read surface: ${r.read_surface_id}`));
    return result(issues);
  }
  const admission = admitL14ReadRequest(r);
  if (!admission.admitted) {
    if (admission.reason === 'mode_not_allowed') {
      issues.push(err(C.L14P_READ_MODE_NOT_ALLOWED, SEV.ERROR, `mode ${r.read_mode} not allowed for surface`));
    } else if (admission.reason === 'consumer_not_allowed') {
      issues.push(err(C.L14P_READ_CONSUMER_NOT_ALLOWED, SEV.ERROR, `consumer ${r.consumer_class} not allowed for surface`));
    } else {
      issues.push(err(C.L14P_READ_SURFACE_UNKNOWN, SEV.ERROR, `unknown surface admission reason: ${admission.reason}`));
    }
  }
  if (!r.lineage_refs || r.lineage_refs.length === 0) issues.push(err(C.L14P_LINEAGE_REFS_MISSING, SEV.ERROR, 'lineage empty'));
  if (!r.replay_hash) issues.push(err(C.L14P_REPLAY_HASH_MISSING, SEV.ERROR, 'replay hash missing'));
  return result(issues);
}

// ── 6. Read result ───────────────────────────────────────────────

export function validateL14GovernedReadResult<T>(
  res: L14GovernedReadResult<T>,
): L14PersistenceValidationResult {
  const issues: L14PersistenceIssue[] = [];
  if ((res.cache_authoritative as unknown) !== false) {
    issues.push(err(C.L14P_CACHE_CLAIMED_AUTHORITY, SEV.CRITICAL, 'cache must not claim authority'));
  }
  if (!res.lineage_refs || res.lineage_refs.length === 0) issues.push(err(C.L14P_LINEAGE_REFS_MISSING, SEV.ERROR, 'lineage empty'));
  if (!res.replay_hash) issues.push(err(C.L14P_REPLAY_HASH_MISSING, SEV.ERROR, 'replay hash missing'));
  return result(issues);
}

// ── 7. Replay result ─────────────────────────────────────────────

export function validateL14ReplayResult(
  r: L14ReplayResult,
): L14PersistenceValidationResult {
  const issues: L14PersistenceIssue[] = [];
  // Critical replay laws: missing original policy → blocking.
  if (!r.policy_ref_match && r.replay_status === 'BLOCKED_ILLEGAL_REPLAY') {
    // ok — blocking already, just ensure code map.
    issues.push(err(C.L14P_DELIVERY_REPLAY_POLICY_REF_MISSING, SEV.CRITICAL,
      'replay missing original policy ref'));
  }
  if (r.preference_snapshot_match === false &&
      r.replay_status === 'PREFERENCE_SNAPSHOT_MISMATCH') {
    issues.push(err(C.L14P_DELIVERY_REPLAY_PREFERENCE_SNAPSHOT_MISSING, SEV.CRITICAL,
      'replay preference snapshot mismatch'));
  }
  if (r.delivered_artifact_match === false &&
      r.replay_status === 'DELIVERY_ARTIFACT_MISMATCH') {
    issues.push(err(C.L14P_DELIVERY_REPLAY_ARTIFACT_MISMATCH, SEV.CRITICAL,
      'replay delivered artifact mismatch'));
  }
  if (r.suppression_reason_match === false &&
      r.replay_status === 'SUPPRESSION_REASON_MISMATCH') {
    issues.push(err(C.L14P_SUPPRESSION_REPLAY_REASON_MISMATCH, SEV.CRITICAL,
      'suppression reason mismatch'));
  }
  if (r.interaction_timeline_match === false &&
      r.replay_status === 'INTERACTION_TIMELINE_MISMATCH') {
    issues.push(err(C.L14P_INTERACTION_TIMELINE_REPLAY_MISMATCH, SEV.CRITICAL,
      'interaction timeline mismatch'));
  }
  if (!r.lineage_refs || r.lineage_refs.length === 0) issues.push(err(C.L14P_LINEAGE_REFS_MISSING, SEV.ERROR, 'lineage empty'));
  if (!r.replay_hash) issues.push(err(C.L14P_REPLAY_HASH_MISSING, SEV.ERROR, 'replay hash missing'));
  return result(issues);
}

// ── 8. Repair request ────────────────────────────────────────────

export function validateL14RepairRequest(
  r: L14RepairRequest,
): L14PersistenceValidationResult {
  const issues: L14PersistenceIssue[] = [];
  if (!r.source_history_refs || r.source_history_refs.length === 0) {
    issues.push(err(C.L14P_REPAIR_SOURCE_HISTORY_MISSING, SEV.ERROR, 'source_history_refs empty'));
  }
  if (r.intent_invent_user_interaction === true) {
    issues.push(err(C.L14P_REPAIR_ATTEMPTED_INTERACTION_INVENTION, SEV.CRITICAL,
      'repair intent to invent user interaction'));
  }
  if (r.intent_rewrite_feedback === true) {
    issues.push(err(C.L14P_REPAIR_ATTEMPTED_FEEDBACK_REWRITE, SEV.CRITICAL,
      'repair intent to rewrite feedback'));
  }
  if (r.intent_fabricate_outcome === true) {
    issues.push(err(C.L14P_REPAIR_ATTEMPTED_OUTCOME_FABRICATION, SEV.CRITICAL,
      'repair intent to fabricate outcome'));
  }
  if (r.intent_mutate_historical_fact === true) {
    issues.push(err(C.L14P_REPAIR_ATTEMPTED_HISTORICAL_MUTATION, SEV.CRITICAL,
      'repair intent to mutate historical fact'));
  }
  return result(issues);
}

// ── 9. Repair result ─────────────────────────────────────────────

export function validateL14RepairResult(
  r: L14RepairResult,
): L14PersistenceValidationResult {
  const issues: L14PersistenceIssue[] = [];
  if ((r.historical_records_mutated as unknown) !== false) {
    issues.push(err(C.L14P_REPAIR_ATTEMPTED_HISTORICAL_MUTATION, SEV.CRITICAL, 'historical_records_mutated must be false'));
  }
  if ((r.user_interactions_invented as unknown) !== false) {
    issues.push(err(C.L14P_REPAIR_ATTEMPTED_INTERACTION_INVENTION, SEV.CRITICAL, 'user_interactions_invented must be false'));
  }
  if ((r.outcomes_fabricated as unknown) !== false) {
    issues.push(err(C.L14P_REPAIR_ATTEMPTED_OUTCOME_FABRICATION, SEV.CRITICAL, 'outcomes_fabricated must be false'));
  }
  if (!r.lineage_refs || r.lineage_refs.length === 0) issues.push(err(C.L14P_LINEAGE_REFS_MISSING, SEV.ERROR, 'lineage empty'));
  if (!r.replay_hash) issues.push(err(C.L14P_REPLAY_HASH_MISSING, SEV.ERROR, 'replay hash missing'));
  return result(issues);
}

// ── 10. Delivery failure record ──────────────────────────────────

export function validateL14DeliveryFailureRecord(
  r: L14DeliveryFailureRecord,
): L14PersistenceValidationResult {
  const issues: L14PersistenceIssue[] = [];
  if (!r.source_delivery_execution_ref && !r.source_delivery_payload_ref) {
    issues.push(err(C.L14P_HISTORICAL_FACT_SOURCE_REF_MISSING, SEV.ERROR,
      'delivery failure requires source execution or payload ref'));
  }
  if (!r.lineage_refs || r.lineage_refs.length === 0) issues.push(err(C.L14P_LINEAGE_REFS_MISSING, SEV.ERROR, 'lineage empty'));
  if (!r.replay_hash) issues.push(err(C.L14P_REPLAY_HASH_MISSING, SEV.ERROR, 'replay hash missing'));
  return result(issues);
}
