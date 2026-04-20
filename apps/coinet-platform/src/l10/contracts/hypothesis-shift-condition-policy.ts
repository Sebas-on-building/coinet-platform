/**
 * L10.5 — Hypothesis Shift-Condition Policy Contract
 *
 * §10.5.6 — Freezes the meaning of shift conditions: what would move
 * the secondary above the primary, what would strengthen the current
 * primary, what would collapse its rank, and what would narrow or
 * widen the ranking spread.
 *
 * Shift-condition policy is subject-scoped (not candidate-scoped): a
 * competition is about the ranking between candidates, not a property
 * of any single candidate.
 */

import { fnv1aHexL10 } from './hypothesis-subject';
import type {
  L10ShiftConditionClass,
} from './hypothesis-evidence-semantics-types';

/**
 * §10.5.6.4 — One governed shift-condition observation tied to a
 * specific semantic class and a specific evidence domain.
 */
export interface L10ShiftConditionObservation {
  readonly observation_id: string;
  readonly hypothesis_subject_id: string;
  readonly hypothesis_ranking_ref: string;
  readonly condition_class: L10ShiftConditionClass;
  /** §10.5.6.9 — Must cite a governed evidence domain, not prose. */
  readonly evidence_domain: string;
  /** §10.5.6.5 / §10.5.6.7 — Which candidate this condition attaches
   *  to. Promotion/collapse conditions must anchor on the primary or
   *  secondary; spread conditions may attach to either or both. */
  readonly anchor_candidate_refs: readonly string[];
  /** §10.5.6.5 — Missing confirmation, emerging contradiction, support
   *  or invalidation change, or regime/sequence shift this condition
   *  depends on. At least one governed driver is required. */
  readonly drivers: readonly L10ShiftConditionDriver[];
  readonly lineage_refs: readonly string[];
}

/**
 * §10.5.6.5 — Governed driver taxonomy. Every legal shift condition
 * must name at least one driver; free-text prose conditions are
 * illegal.
 */
export enum L10ShiftConditionDriver {
  MISSING_CONFIRMATION_ARRIVAL = 'MISSING_CONFIRMATION_ARRIVAL',
  MISSING_CONFIRMATION_STALL = 'MISSING_CONFIRMATION_STALL',
  EMERGING_CONTRADICTION = 'EMERGING_CONTRADICTION',
  CONTRADICTION_DECAY = 'CONTRADICTION_DECAY',
  SUPPORT_DROPOUT = 'SUPPORT_DROPOUT',
  SUPPORT_UPGRADE = 'SUPPORT_UPGRADE',
  INVALIDATION_CROSSING = 'INVALIDATION_CROSSING',
  REGIME_POSTURE_SHIFT = 'REGIME_POSTURE_SHIFT',
  SEQUENCE_POSTURE_SHIFT = 'SEQUENCE_POSTURE_SHIFT',
  VALIDATION_POSTURE_SHIFT = 'VALIDATION_POSTURE_SHIFT',
}
export const ALL_L10_SHIFT_CONDITION_DRIVERS:
  readonly L10ShiftConditionDriver[] =
    Object.values(L10ShiftConditionDriver);

/**
 * §10.5.6 — Policy contract for shift-condition semantics. Subject-
 * scoped because shift conditions describe the competition, not an
 * individual candidate.
 */
export interface L10HypothesisShiftConditionPolicy {
  readonly policy_id: string;
  readonly hypothesis_subject_id: string;
  readonly policy_version: string;

  /** §10.5.6.4 — Condition classes this subject may emit. */
  readonly allowed_condition_classes:
    readonly L10ShiftConditionClass[];

  /** §10.5.6.9 — Whether each condition must cite at least one
   *  governed driver. Always true in production; toggle kept only for
   *  strict vs permissive replay reconstruction. */
  readonly requires_governed_driver: true;

  /** §10.5.6.5 / §10.5.6.6 / §10.5.6.7 — Which classes are mandatory
   *  when competition is live (i.e. a secondary exists). */
  readonly mandatory_when_competition_live:
    readonly L10ShiftConditionClass[];

  /** §10.5.6.8 — Whether spread-narrowing conditions are mandatory
   *  even when no outright rank reversal is imminent. */
  readonly spread_narrowing_conditions_required: boolean;

  /** §10.5.6.9 — Minimum number of conditions per live competition. */
  readonly min_conditions_when_live: number;

  readonly lineage_refs: readonly string[];
}

export function buildL10ShiftConditionPolicyId(
  hypothesis_subject_id: string,
  policy_version: string,
): string {
  const key = `${hypothesis_subject_id}|${policy_version}`;
  return `hshftpol_${fnv1aHexL10(key)}_${fnv1aHexL10(
    hypothesis_subject_id,
  )}`;
}

export function buildL10ShiftConditionObservationId(
  hypothesis_subject_id: string,
  hypothesis_ranking_ref: string,
  condition_class: string,
  evidence_domain: string,
): string {
  const key =
    `${hypothesis_subject_id}|${hypothesis_ranking_ref}|${condition_class}|${evidence_domain}`;
  return `hshftobs_${fnv1aHexL10(key)}_${fnv1aHexL10(evidence_domain)}`;
}
