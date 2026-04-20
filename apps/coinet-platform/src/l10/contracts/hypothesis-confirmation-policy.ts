/**
 * L10.5 — Hypothesis Confirmation Policy Contract
 *
 * §10.5.4 — Freezes the meaning of confirmation: the required,
 * present, missing, and upgrade-critical confirmations the candidate
 * declares. Confirmation is the difference between an interesting
 * explanation and one the system may increasingly rely on.
 */

import { fnv1aHexL10 } from './hypothesis-subject';
import type {
  L10ConfirmationClass,
  L10ConfirmationPresence,
  L10EvidencePostureClass,
} from './hypothesis-evidence-semantics-types';

/**
 * §10.5.4 — One governed confirmation expectation.
 */
export interface L10ConfirmationObservation {
  readonly observation_id: string;
  readonly hypothesis_candidate_id: string;
  readonly confirmation_ref: string;
  readonly confirmation_domain: string;
  readonly confirmation_class: L10ConfirmationClass;
  readonly confirmation_presence: L10ConfirmationPresence;
  readonly evidence_posture: L10EvidencePostureClass;
  /** §10.5.4.6 — Whether this confirmation, if present, *upgrades* the
   *  candidate rather than merely stabilising it. */
  readonly is_upgrade_critical: boolean;
  readonly lineage_refs: readonly string[];
}

/**
 * §10.5.4.5 — Gap posture. Confirmation-gap is not a score; it is a
 * posture that answers three specific questions the engine must
 * remain able to answer mechanically.
 */
export enum L10ConfirmationGapPosture {
  COMPLETE = 'COMPLETE',
  STABLE_WITH_GAPS = 'STABLE_WITH_GAPS',
  FRAGILE_WITH_GAPS = 'FRAGILE_WITH_GAPS',
  SEVERELY_INCOMPLETE = 'SEVERELY_INCOMPLETE',
}
export const ALL_L10_CONFIRMATION_GAP_POSTURES:
  readonly L10ConfirmationGapPosture[] =
    Object.values(L10ConfirmationGapPosture);

/**
 * §10.5.4 — Policy contract for confirmation semantics.
 */
export interface L10HypothesisConfirmationPolicy {
  readonly policy_id: string;
  readonly hypothesis_candidate_id: string;
  readonly policy_version: string;

  /** §10.5.4.3 — Confirmation classes this candidate may surface. */
  readonly allowed_confirmation_classes:
    readonly L10ConfirmationClass[];

  /** §10.5.4.4 — Presence distinctions that must remain separate. */
  readonly required_presence_distinctions:
    readonly L10ConfirmationPresence[];

  /** §10.5.4.6 — At least this many upgrade-capable confirmations must
   *  be declared up-front for ranking to be emittable. */
  readonly required_upgrade_capable_classes:
    readonly L10ConfirmationClass[];

  /** §10.5.4.3 — Template-critical confirmation domains. */
  readonly mandatory_confirmation_domains: readonly string[];

  /** §10.5.4.7 — Whether the candidate may be primary while
   *  upgrade-critical confirmations are absent. */
  readonly allow_primary_with_missing_upgrades: boolean;

  readonly lineage_refs: readonly string[];
}

export function buildL10ConfirmationPolicyId(
  hypothesis_candidate_id: string,
  policy_version: string,
): string {
  const key = `${hypothesis_candidate_id}|${policy_version}`;
  return `hcnfpol_${fnv1aHexL10(key)}_${fnv1aHexL10(
    hypothesis_candidate_id,
  )}`;
}

export function buildL10ConfirmationObservationId(
  hypothesis_candidate_id: string,
  confirmation_ref: string,
  confirmation_domain: string,
): string {
  const key =
    `${hypothesis_candidate_id}|${confirmation_ref}|${confirmation_domain}`;
  return `hcnfobs_${fnv1aHexL10(key)}_${fnv1aHexL10(confirmation_ref)}`;
}
