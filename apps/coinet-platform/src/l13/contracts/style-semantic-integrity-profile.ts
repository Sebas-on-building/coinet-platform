/**
 * L13.8 — Style Semantic Integrity Profile Contract
 *
 * §13.8.24 / §13.8.25 — Tracks whether the response shaper's pass
 * preserved every required semantic anchor (uncertainty,
 * contradiction, trigger, invalidation, restriction). If style
 * shaping silently mutated semantics, the integrity profile
 * records the violation and the runtime routes the output back
 * into the L13.6 governed rewrite flow.
 */

import type { L13RequiredSemanticAnchorClass } from './style-policy';

export enum L13StyleIntegrityStatus {
  STYLE_INTEGRITY_CLEAN = 'STYLE_INTEGRITY_CLEAN',
  STYLE_INTEGRITY_CLEAN_WITH_DISCLOSURE_FLOOR = 'STYLE_INTEGRITY_CLEAN_WITH_DISCLOSURE_FLOOR',
  STYLE_RESHAPE_REQUIRED = 'STYLE_RESHAPE_REQUIRED',
  STYLE_SEMANTIC_REWRITE_REQUIRED = 'STYLE_SEMANTIC_REWRITE_REQUIRED',
  STYLE_BLOCKED = 'STYLE_BLOCKED',
}

export const ALL_L13_STYLE_INTEGRITY_STATUSES:
  readonly L13StyleIntegrityStatus[] =
  Object.values(L13StyleIntegrityStatus);

export const L13_BLOCKING_STYLE_INTEGRITY_STATUSES:
  readonly L13StyleIntegrityStatus[] = [
  L13StyleIntegrityStatus.STYLE_SEMANTIC_REWRITE_REQUIRED,
  L13StyleIntegrityStatus.STYLE_BLOCKED,
];

export function isL13BlockingStyleIntegrity(
  status: L13StyleIntegrityStatus,
): boolean {
  return L13_BLOCKING_STYLE_INTEGRITY_STATUSES.includes(status);
}

export interface L13StyleSemanticIntegrityProfile {
  readonly style_integrity_id: string;
  readonly source_mode_payload_ref: string;
  readonly shaped_response_ref: string;

  readonly required_anchor_classes:
    readonly L13RequiredSemanticAnchorClass[];
  readonly anchor_classes_preserved:
    readonly L13RequiredSemanticAnchorClass[];
  readonly anchor_classes_missing:
    readonly L13RequiredSemanticAnchorClass[];

  readonly preserved_uncertainty_anchor: boolean;
  readonly preserved_contradiction_anchor: boolean;
  readonly preserved_trigger_anchor: boolean;
  readonly preserved_invalidation_anchor: boolean;
  readonly preserved_restriction_anchor: boolean;

  readonly added_claim_detected: boolean;
  readonly removed_required_claim_detected: boolean;
  readonly confidence_strengthened_detected: boolean;
  readonly disclosure_weakened_detected: boolean;

  readonly integrity_status: L13StyleIntegrityStatus;
  readonly policy_version: string;
  readonly replay_hash: string;
}
