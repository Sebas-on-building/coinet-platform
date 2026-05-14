/**
 * L12.6 — Read surface / request / result validator (§12.6.13 – §12.6.16).
 */

import { isL12BlockedCurrentReadiness } from '../contracts/l12-current-authority';
import {
  L12ConsumerClass,
  L12GovernedReadResult,
  L12ReadFreshnessClass,
  L12ReadMode,
  L12ReadRequest,
  L12ReadSurfaceDescriptor,
} from '../contracts/l12-read-surface';
import { L12ScenarioOutputReadinessClass } from '../contracts/scenario-output-readiness.contract';
import { getL12ReadSurfaceDescriptor } from '../registry/l12-read-surface.registry';
import {
  L12PersistenceValidationResult,
  L12PersistenceViolationCode,
  L12PersistenceViolationIssue,
  l12PersistenceIssueOf,
} from '../persistence/l12-persistence-violation-codes';

const BLOCKED_READINESS_ALLOWED_CONSUMERS: ReadonlySet<L12ConsumerClass> = new Set([
  L12ConsumerClass.AUDIT_SYSTEM,
  L12ConsumerClass.REPAIR_SYSTEM,
  L12ConsumerClass.INTERNAL_MONITORING,
  L12ConsumerClass.CALIBRATION_SYSTEM,
]);

export function validateL12ReadRequest(
  req: L12ReadRequest,
): L12PersistenceValidationResult {
  const issues: L12PersistenceViolationIssue[] = [];

  const desc = getL12ReadSurfaceDescriptor(req.read_surface_id);
  if (!desc) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_READ_SURFACE_UNREGISTERED,
        `read surface ${req.read_surface_id} is not registered`,
        req.read_request_id,
      ),
    );
    return { ok: false, issues };
  }

  if (!desc.allowed_read_modes.includes(req.read_mode)) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_READ_MODE_ILLEGAL,
        `mode ${req.read_mode} not allowed on read surface ${req.read_surface_id}`,
        req.read_request_id,
      ),
    );
  }
  if (!desc.allowed_consumers.includes(req.consumer_class)) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_CONSUMER_NOT_ALLOWED,
        `consumer ${req.consumer_class} not allowed on read surface ${req.read_surface_id}`,
        req.read_request_id,
      ),
    );
  }

  if (desc.requires_scope && (!req.scope_type || !req.scope_id)) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_READ_SCOPE_REQUIRED_BUT_MISSING,
        `read surface ${req.read_surface_id} requires scope`,
        req.read_request_id,
      ),
    );
  }
  if (desc.requires_scenario_id && !req.scenario_id) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_READ_SCENARIO_ID_REQUIRED_BUT_MISSING,
        `read surface ${req.read_surface_id} requires scenario_id`,
        req.read_request_id,
      ),
    );
  }
  if (desc.requires_scenario_set_id && !req.scenario_set_id) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_READ_SCENARIO_SET_ID_REQUIRED_BUT_MISSING,
        `read surface ${req.read_surface_id} requires scenario_set_id`,
        req.read_request_id,
      ),
    );
  }
  if (desc.requires_run_id && !req.compute_run_id) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_READ_RUN_ID_REQUIRED_BUT_MISSING,
        `read surface ${req.read_surface_id} requires compute_run_id`,
        req.read_request_id,
      ),
    );
  }

  if (desc.requires_evidence && !req.require_evidence) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_READ_EVIDENCE_REQUIRED_BUT_MISSING,
        `read surface ${req.read_surface_id} requires evidence`,
        req.read_request_id,
      ),
    );
  }
  if (desc.requires_lineage && !req.require_lineage) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_READ_LINEAGE_REQUIRED_BUT_MISSING,
        `read surface ${req.read_surface_id} requires lineage`,
        req.read_request_id,
      ),
    );
  }
  if (desc.requires_replay_hash && !req.require_replay_hash) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_READ_REPLAY_HASH_REQUIRED_BUT_MISSING,
        `read surface ${req.read_surface_id} requires replay hash`,
        req.read_request_id,
      ),
    );
  }
  if (desc.requires_restriction_profile && !req.require_restriction_profile) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_READ_RESTRICTION_PROFILE_REQUIRED_BUT_MISSING,
        `read surface ${req.read_surface_id} requires restriction profile`,
        req.read_request_id,
      ),
    );
  }

  if (req.allow_blocked_readiness && !BLOCKED_READINESS_ALLOWED_CONSUMERS.has(req.consumer_class)) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_BLOCKED_READINESS_READ_BY_UNALLOWED_CONSUMER,
        `consumer ${req.consumer_class} cannot read blocked-readiness rows`,
        req.read_request_id,
      ),
    );
  }

  return { ok: issues.length === 0, issues };
}

/* ────────────────────────────────────────────────────────────── */
/*  Result validator                                              */
/* ────────────────────────────────────────────────────────────── */

const FRESHNESS_FOR_MODE: Readonly<Record<L12ReadMode, L12ReadFreshnessClass>> = {
  [L12ReadMode.LIVE_CURRENT]: L12ReadFreshnessClass.LIVE,
  [L12ReadMode.LIVE_HISTORICAL]: L12ReadFreshnessClass.HISTORICAL,
  [L12ReadMode.REPLAY_VIEW]: L12ReadFreshnessClass.REPLAY,
  [L12ReadMode.REPAIR_VIEW]: L12ReadFreshnessClass.REPAIR,
  [L12ReadMode.EVIDENCE_VIEW]: L12ReadFreshnessClass.EVIDENCE,
  [L12ReadMode.LINEAGE_VIEW]: L12ReadFreshnessClass.LINEAGE,
};

export function validateL12GovernedReadResult<T>(
  result: L12GovernedReadResult<T>,
  ctx?: {
    readonly require_evidence?: boolean;
    readonly require_lineage?: boolean;
    readonly require_replay_hash?: boolean;
    readonly readiness_class?: L12ScenarioOutputReadinessClass;
    readonly allow_blocked_readiness?: boolean;
    readonly consumer_class?: L12ConsumerClass;
  },
): L12PersistenceValidationResult {
  const issues: L12PersistenceViolationIssue[] = [];

  if ((result as { cache_authoritative?: unknown }).cache_authoritative === true) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_CACHE_USED_AS_AUTHORITY,
        'governed read result claims cache as authoritative',
        result.read_result_id,
      ),
    );
  }

  if (result.payload === undefined || result.payload === null) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_READ_RESULT_PAYLOAD_MISSING,
        'governed read result payload missing',
        result.read_result_id,
      ),
    );
  }

  if (ctx?.require_evidence && result.evidence_refs.length === 0) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_READ_EVIDENCE_REQUIRED_BUT_MISSING,
        'governed read result missing evidence refs',
        result.read_result_id,
      ),
    );
  }
  if (ctx?.require_lineage && result.lineage_refs.length === 0) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_READ_LINEAGE_REQUIRED_BUT_MISSING,
        'governed read result missing lineage refs',
        result.read_result_id,
      ),
    );
  }
  if (ctx?.require_replay_hash && result.replay_hash_refs.length === 0) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_READ_REPLAY_HASH_REQUIRED_BUT_MISSING,
        'governed read result missing replay hash refs',
        result.read_result_id,
      ),
    );
  }

  if (
    ctx?.readiness_class &&
    isL12BlockedCurrentReadiness(ctx.readiness_class) &&
    !ctx.allow_blocked_readiness
  ) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_BLOCKED_READINESS_READ_BY_UNALLOWED_CONSUMER,
        `governed read result exposes blocked-readiness payload to consumer ${ctx.consumer_class ?? 'UNKNOWN'}`,
        result.read_result_id,
      ),
    );
  }

  const expectedFreshness = FRESHNESS_FOR_MODE[result.read_mode];
  if (expectedFreshness && result.freshness_class !== expectedFreshness) {
    // Allow LIVE/RECENT for LIVE_CURRENT
    if (
      !(
        result.read_mode === L12ReadMode.LIVE_CURRENT &&
        result.freshness_class === L12ReadFreshnessClass.RECENT
      )
    ) {
      issues.push(
        l12PersistenceIssueOf(
          L12PersistenceViolationCode.L12P_READ_FRESHNESS_MISMATCH,
          `freshness ${result.freshness_class} mismatched with mode ${result.read_mode}`,
          result.read_result_id,
        ),
      );
    }
  }

  return { ok: issues.length === 0, issues };
}

/** Helper: derive freshness from mode. */
export function l12FreshnessForMode(mode: L12ReadMode): L12ReadFreshnessClass {
  return FRESHNESS_FOR_MODE[mode];
}

/** Returns the registry-backed descriptor (or undefined) for tests/services. */
export function getL12ReadSurfaceDescriptorOrUndef(
  read_surface_id: L12ReadSurfaceDescriptor['read_surface_id'],
): L12ReadSurfaceDescriptor | undefined {
  return getL12ReadSurfaceDescriptor(read_surface_id);
}
