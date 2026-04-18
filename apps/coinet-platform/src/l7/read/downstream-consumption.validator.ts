/**
 * L7.7 — Downstream Consumption Validator
 *
 * §7.7.7 — The upward contract. Later layers must consume Layer 7 through
 * governed read surfaces only, must not rebuild validation from raw L6
 * primitives in live mode, must not bypass restriction profiles, must not
 * read raw archive objects, and must respect cap-chain and restriction
 * posture.
 */

import {
  L7ConsumerClass,
  L7ReadMode,
  L7ReadRequest,
} from '../contracts/l7-read-surface';
import { L7RestrictionRight } from '../contracts/claim-restriction-profile';
import {
  L7PersistenceViolation,
  L7PersistenceViolationCode,
  buildL7PersistenceViolation,
} from '../persistence/l7-persistence-violation-codes';

export interface L7DownstreamConsumptionAttempt {
  readonly consumer_class: L7ConsumerClass;
  readonly consumer_service: string;
  readonly used_read_surface: boolean;
  readonly read_request: L7ReadRequest | null;
  readonly attempted_raw_l6_rebuild: boolean;
  readonly attempted_raw_clickhouse_read: boolean;
  readonly attempted_raw_redis_read: boolean;
  readonly attempted_raw_archive_access: boolean;
  readonly respects_restriction_profile: boolean;
  readonly respects_cap_chain: boolean;
  readonly action_requires_rights: readonly L7RestrictionRight[];
  readonly granted_rights: readonly L7RestrictionRight[];
  readonly spoofed_mode: boolean;
  readonly trace_id: string;
  readonly subject_id: string | null;
}

export class L7DownstreamConsumptionValidator {
  validate(
    attempt: L7DownstreamConsumptionAttempt,
  ): { readonly ok: boolean; readonly violations: readonly L7PersistenceViolation[] } {
    const violations: L7PersistenceViolation[] = [];

    if (!attempt.used_read_surface) {
      violations.push(v(
        L7PersistenceViolationCode.DOWNSTREAM_BYPASSES_READ_SURFACE,
        attempt,
        `consumer ${attempt.consumer_class}/${attempt.consumer_service} did not use a governed read surface`,
      ));
    }
    if (attempt.attempted_raw_clickhouse_read) {
      violations.push(v(
        L7PersistenceViolationCode.RAW_STORAGE_READ_ATTEMPT,
        attempt,
        `consumer attempted raw ClickHouse read`,
      ));
    }
    if (attempt.attempted_raw_redis_read) {
      violations.push(v(
        L7PersistenceViolationCode.REDIS_READ_AS_AUTHORITATIVE,
        attempt,
        `consumer attempted Redis-as-authoritative read`,
      ));
    }
    if (attempt.attempted_raw_archive_access) {
      violations.push(v(
        L7PersistenceViolationCode.DOWNSTREAM_RAW_ARCHIVE_ACCESS,
        attempt,
        `consumer attempted raw archive object access`,
      ));
    }

    // Live L6 rebuild.
    if (attempt.attempted_raw_l6_rebuild) {
      const legalLive =
        attempt.consumer_class === L7ConsumerClass.REPLAY_ADAPTER ||
        attempt.consumer_class === L7ConsumerClass.REPAIR_ADAPTER ||
        attempt.consumer_class === L7ConsumerClass.INTERNAL_L7;
      const inReplayOrRepair =
        attempt.read_request !== null &&
        (attempt.read_request.mode === L7ReadMode.REPLAY_RECONSTRUCTION ||
          attempt.read_request.mode === L7ReadMode.REPAIR_INSPECTION);
      if (!(legalLive && inReplayOrRepair)) {
        violations.push(v(
          L7PersistenceViolationCode.DOWNSTREAM_REBUILDS_VALIDATION,
          attempt,
          `consumer rebuilt validation from raw L6 primitives outside replay/repair`,
        ));
      }
    }

    // Restriction / cap respect.
    if (!attempt.respects_restriction_profile) {
      violations.push(v(
        L7PersistenceViolationCode.DOWNSTREAM_BYPASSES_RESTRICTION,
        attempt,
        `consumer bypassed restriction profile`,
      ));
    }
    if (!attempt.respects_cap_chain) {
      violations.push(v(
        L7PersistenceViolationCode.DOWNSTREAM_IGNORES_CAP_CHAIN,
        attempt,
        `consumer ignored cap chain`,
      ));
    }

    // Required right must be present in granted rights.
    for (const r of attempt.action_requires_rights) {
      if (!attempt.granted_rights.includes(r)) {
        violations.push(v(
          L7PersistenceViolationCode.DOWNSTREAM_IGNORES_RESTRICTION_POSTURE,
          attempt,
          `consumer performed action requiring ${r} without being granted it`,
        ));
      }
    }

    if (attempt.spoofed_mode) {
      violations.push(v(
        L7PersistenceViolationCode.DOWNSTREAM_READ_MODE_SPOOFED,
        attempt,
        `consumer spoofed read mode`,
      ));
    }

    return { ok: violations.length === 0, violations };
  }
}

function v(
  code: L7PersistenceViolationCode,
  a: L7DownstreamConsumptionAttempt,
  detail: string,
): L7PersistenceViolation {
  return buildL7PersistenceViolation(code, detail, {
    subject_id: a.subject_id,
    surface: a.read_request?.surface_id ?? null,
    context: {
      consumer_class: a.consumer_class,
      consumer_service: a.consumer_service,
      trace_id: a.trace_id,
    },
  });
}
