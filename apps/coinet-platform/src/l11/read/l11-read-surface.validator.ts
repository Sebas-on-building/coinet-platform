/**
 * L11.8 — Read Surface Validator (§11.8.11.6 / §11.8.12)
 *
 * Validates an `L11ReadRequest` against the static read-surface
 * registry: surface registration, read mode, consumer class,
 * lineage / evidence / replay-hash flags, and current-authority
 * constraints.
 */

import {
  L11ReadRequest,
  L11ReadMode,
  L11ConsumerClass,
} from '../contracts/l11-read-surface';
import {
  getL11ReadSurfaceDescriptor,
} from '../registry/l11-read-surface.registry';
import {
  L11PersistenceViolationCode,
  L11PersistenceIssue,
  makeL11PersistenceIssue,
} from '../persistence/l11-persistence-violation-codes';

export function validateL11ReadRequest(
  r: L11ReadRequest,
): L11PersistenceIssue[] {
  const issues: L11PersistenceIssue[] = [];
  const ctx = { read_request_id: r?.read_request_id };

  if (!r) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_READ_REQUEST_INCOMPLETE,
      'read request is null/undefined'));
    return issues;
  }
  if (!r.read_request_id || !r.read_surface_id || !r.read_mode ||
      !r.consumer_class || !r.policy_version) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_READ_REQUEST_INCOMPLETE,
      'one or more required fields missing on read request', ctx));
  }
  if (!r.read_surface_id) return issues;

  const desc = getL11ReadSurfaceDescriptor(r.read_surface_id);
  if (!desc) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_READ_SURFACE_UNREGISTERED,
      `read surface ${r.read_surface_id} not registered`, ctx));
    return issues;
  }
  if (r.read_mode && !desc.read_modes_allowed.includes(r.read_mode)) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_READ_MODE_NOT_ALLOWED,
      `read_mode ${r.read_mode} not allowed for surface ${r.read_surface_id}`,
      ctx));
  }
  if (r.consumer_class && !desc.consumer_classes_allowed.includes(r.consumer_class)) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_CONSUMER_NOT_ALLOWED,
      `consumer_class ${r.consumer_class} not allowed for surface ${r.read_surface_id}`,
      ctx));
  }
  if (desc.current_authority_required && r.read_mode !== L11ReadMode.LIVE_CURRENT) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_CURRENT_READ_BYPASSES_CURRENT_REGISTRY,
      `surface ${r.read_surface_id} requires LIVE_CURRENT read mode`, ctx));
  }
  if (desc.current_authority_required && !r.require_current_authority) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_CURRENT_READ_BYPASSES_CURRENT_REGISTRY,
      `surface ${r.read_surface_id} requires require_current_authority=true`,
      ctx));
  }
  if (desc.requires_lineage && !r.require_lineage) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_LINEAGE_REQUIRED_BUT_ABSENT,
      `surface ${r.read_surface_id} requires lineage`, ctx));
  }
  if (desc.requires_evidence && !r.require_evidence) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_EVIDENCE_REQUIRED_BUT_ABSENT,
      `surface ${r.read_surface_id} requires evidence`, ctx));
  }
  if (desc.requires_replay_hash && !r.require_replay_hash) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPLAY_HASH_REQUIRED_BUT_ABSENT,
      `surface ${r.read_surface_id} requires replay hash`, ctx));
  }
  if (!desc.redis_acceleration_allowed && r.allow_cache_acceleration) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REDIS_AS_AUTHORITY_READ,
      `surface ${r.read_surface_id} does not permit Redis acceleration`,
      ctx));
  }
  if (r.read_mode === L11ReadMode.LIVE_CURRENT &&
      r.consumer_class === L11ConsumerClass.OBSERVABILITY &&
      !r.require_current_authority) {
    // Observability may read but must still flag current-authority requirement
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_CURRENT_READ_BYPASSES_CURRENT_REGISTRY,
      'observability LIVE_CURRENT read must require current authority', ctx));
  }
  return issues;
}
