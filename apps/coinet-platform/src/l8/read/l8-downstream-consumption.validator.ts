/**
 * L8.8 — Downstream Consumption Validator
 *
 * §8.8.8 — The no-rebuild law: later layers may read L8 current,
 * historical, evidence, and lineage surfaces, but may NOT:
 *   - reclassify regime from L6/L7 in live mode
 *   - derive their own transition posture from raw L6/L7
 *   - compute their own multiplier posture from raw L6/L7
 *   - ignore reliance posture / cap chains
 *   - hit raw archive objects directly
 *   - spoof read mode across boundaries
 */

import {
  L8ConsumerClass, L8ReadRequest,
} from '../contracts/l8-read-surface';
import {
  L8PersistenceViolation,
  L8PersistenceViolationCode,
  buildL8PersistenceViolation,
} from '../persistence/l8-persistence-violation-codes';

export interface L8DownstreamConsumptionAttempt {
  readonly consumer_class: L8ConsumerClass;
  readonly consumer_service: string;
  readonly read_request: L8ReadRequest | null;
  /** caller declares it will re-classify regime from L6/L7 live. */
  readonly will_rebuild_regime_from_l6_l7: boolean;
  readonly will_rebuild_transition_from_l6_l7: boolean;
  readonly will_rebuild_multiplier_from_l6_l7: boolean;
  readonly accesses_raw_archive_path: boolean;
  readonly ignores_reliance_posture: boolean;
  readonly ignores_cap_chain: boolean;
  readonly spoofed_read_mode: boolean;
}

export interface L8DownstreamValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L8PersistenceViolation[];
}

const ADAPTER_CONSUMERS: readonly L8ConsumerClass[] = [
  L8ConsumerClass.REPLAY_ADAPTER,
  L8ConsumerClass.REPAIR_ADAPTER,
];

export class L8DownstreamConsumptionValidator {
  validate(
    attempt: L8DownstreamConsumptionAttempt,
  ): L8DownstreamValidationResult {
    const violations: L8PersistenceViolation[] = [];
    const subjectRef = attempt.read_request?.regime_subject_id ?? null;
    const surface = attempt.read_request?.surface_id ?? null;
    const source = attempt.consumer_service;

    // §8.8.8.7 — live rebuild of regime / transition / multiplier from
    // lower layers is illegal for non-adapter consumers.
    if (attempt.will_rebuild_regime_from_l6_l7 &&
        !ADAPTER_CONSUMERS.includes(attempt.consumer_class)) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.DOWNSTREAM_REBUILDS_REGIME_LIVE,
        `${source} rebuilds regime from L6/L7 live`,
        { regime_subject_id: subjectRef, surface,
          context: { consumer: attempt.consumer_class } },
      ));
    }
    if (attempt.will_rebuild_transition_from_l6_l7 &&
        !ADAPTER_CONSUMERS.includes(attempt.consumer_class)) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.DOWNSTREAM_REBUILDS_TRANSITION_LIVE,
        `${source} rebuilds transition posture from L6/L7 live`,
        { regime_subject_id: subjectRef, surface,
          context: { consumer: attempt.consumer_class } },
      ));
    }
    if (attempt.will_rebuild_multiplier_from_l6_l7 &&
        !ADAPTER_CONSUMERS.includes(attempt.consumer_class)) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.DOWNSTREAM_REBUILDS_MULTIPLIER_LIVE,
        `${source} rebuilds multiplier posture from L6/L7 live`,
        { regime_subject_id: subjectRef, surface,
          context: { consumer: attempt.consumer_class } },
      ));
    }

    // §8.8.7.7 — raw archive access ban for every consumer except
    // forensic tool + adapters.
    const mayAccessRaw =
      attempt.consumer_class === L8ConsumerClass.FORENSIC_TOOL ||
      ADAPTER_CONSUMERS.includes(attempt.consumer_class);
    if (attempt.accesses_raw_archive_path && !mayAccessRaw) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.DOWNSTREAM_RAW_ARCHIVE_ACCESS,
        `${source} accesses raw archive path`,
        { regime_subject_id: subjectRef, surface,
          context: { consumer: attempt.consumer_class } },
      ));
    }

    // §8.8.8.7 — ignoring reliance / cap chain is illegal
    if (attempt.ignores_reliance_posture) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.DOWNSTREAM_IGNORES_RELIANCE_POSTURE,
        `${source} ignores L8 reliance posture`,
        { regime_subject_id: subjectRef, surface },
      ));
    }
    if (attempt.ignores_cap_chain) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.DOWNSTREAM_IGNORES_CAP_CHAIN,
        `${source} ignores L8 cap chain`,
        { regime_subject_id: subjectRef, surface },
      ));
    }

    // §8.8.8.5 — read-mode spoofing
    if (attempt.spoofed_read_mode) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.DOWNSTREAM_READ_MODE_SPOOFED,
        `${source} spoofed read mode`,
        { regime_subject_id: subjectRef, surface },
      ));
    }

    // §8.8.8.7 — bypassing read surface entirely (no request envelope)
    if (!attempt.read_request) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.DOWNSTREAM_BYPASSES_READ_SURFACE,
        `${source} consumed L8 without a governed read request`,
        { regime_subject_id: subjectRef, surface,
          context: { consumer: attempt.consumer_class } },
      ));
    }

    return { ok: violations.length === 0, violations };
  }
}
