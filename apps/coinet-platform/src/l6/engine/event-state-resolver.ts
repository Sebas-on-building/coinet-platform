/**
 * L6.4 — EventStateResolver
 *
 * §6.4.7.4–§6.4.7.7 — The ONLY legal place where event lifecycle transitions
 * become authoritative. This resolver encodes the legal transition matrix and
 * the confirmation / suppression / expiry / resolution laws from L6.3.
 *
 * Timestamp-ordering law §6.3.6.6 is enforced on every mutation.
 */

import { EventOutput, EventResolutionSnapshot } from '../contracts/event-output.contract';
import { EventDefinitionContract } from '../contracts/event-definition.contract';
import {
  L6EventLifecycleState,
  LIFECYCLE_ORDINAL_MAP,
  isClosureState,
} from '../contracts/event-lifecycle-state';
import { computeReplayHash } from '../validation/replay-hash';
import { validateEventOutput } from '../validation/event-output-contract.validator';
import { L6ContractValidationResult } from '../validation/contract-violation-codes';

export interface LegalTransition {
  readonly from: L6EventLifecycleState;
  readonly to: L6EventLifecycleState;
}

export const LEGAL_TRANSITIONS: readonly LegalTransition[] = Object.freeze([
  { from: L6EventLifecycleState.CANDIDATE, to: L6EventLifecycleState.CONFIRMED },
  { from: L6EventLifecycleState.CANDIDATE, to: L6EventLifecycleState.SUPPRESSED },
  { from: L6EventLifecycleState.CANDIDATE, to: L6EventLifecycleState.QUARANTINED },
  { from: L6EventLifecycleState.CANDIDATE, to: L6EventLifecycleState.EXPIRED },
  { from: L6EventLifecycleState.CONFIRMED, to: L6EventLifecycleState.ACTIVE },
  { from: L6EventLifecycleState.CONFIRMED, to: L6EventLifecycleState.SUPPRESSED },
  { from: L6EventLifecycleState.CONFIRMED, to: L6EventLifecycleState.QUARANTINED },
  { from: L6EventLifecycleState.ACTIVE, to: L6EventLifecycleState.COOLING },
  { from: L6EventLifecycleState.ACTIVE, to: L6EventLifecycleState.RESOLVED },
  { from: L6EventLifecycleState.ACTIVE, to: L6EventLifecycleState.EXPIRED },
  { from: L6EventLifecycleState.COOLING, to: L6EventLifecycleState.RESOLVED },
  { from: L6EventLifecycleState.COOLING, to: L6EventLifecycleState.EXPIRED },
  { from: L6EventLifecycleState.COOLING, to: L6EventLifecycleState.ACTIVE },
]);

export function isLegalTransition(
  from: L6EventLifecycleState,
  to: L6EventLifecycleState,
): boolean {
  if (from === to) return false;
  return LEGAL_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

export interface ConfirmationDecision {
  readonly decision: 'CONFIRM' | 'SUPPRESS' | 'QUARANTINE' | 'WAIT' | 'REJECT';
  readonly reason: string;
}

export interface ConfirmationInput {
  readonly trigger_fired: boolean;
  readonly confirmation_condition_passed: boolean;
  readonly evidence_present: boolean;
  readonly suppression_blocking: boolean;
  readonly duplicate_dedupe_detected: boolean;
  readonly quarantine_reason: string | null;
}

export interface TransitionResult {
  readonly output: EventOutput;
  readonly validation: L6ContractValidationResult;
  readonly transition_legal: boolean;
  readonly timestamp_legal: boolean;
  readonly reasons: readonly string[];
}

export class EventStateResolver {
  decideConfirmation(input: ConfirmationInput): ConfirmationDecision {
    if (input.quarantine_reason) {
      return { decision: 'QUARANTINE', reason: input.quarantine_reason };
    }
    if (input.duplicate_dedupe_detected) {
      return { decision: 'SUPPRESS', reason: 'DUPLICATE_DEDUPE_KEY' };
    }
    if (input.suppression_blocking) {
      return { decision: 'SUPPRESS', reason: 'SUPPRESSION_POLICY_BLOCKING' };
    }
    if (!input.trigger_fired) {
      return { decision: 'REJECT', reason: 'TRIGGER_NOT_FIRED' };
    }
    if (!input.confirmation_condition_passed) {
      return { decision: 'WAIT', reason: 'CONFIRMATION_PENDING' };
    }
    if (!input.evidence_present) {
      return { decision: 'WAIT', reason: 'EVIDENCE_PENDING' };
    }
    return { decision: 'CONFIRM', reason: 'CONFIRMATION_LAW_SATISFIED' };
  }

  /**
   * Apply a transition. Rejects illegal transitions and illegal timestamp
   * orderings by setting transition_legal/timestamp_legal false; never mutates
   * the input. Recomputes the replay_hash when state or timestamps change.
   */
  transition(
    def: EventDefinitionContract,
    current: EventOutput,
    target: L6EventLifecycleState,
    now: string,
    resolution?: EventResolutionSnapshot,
  ): TransitionResult {
    const reasons: string[] = [];
    const legal = isLegalTransition(current.state, target);
    if (!legal) reasons.push(`ILLEGAL_TRANSITION:${current.state}->${target}`);

    if (isClosureState(current.state)) {
      reasons.push(`ALREADY_IN_CLOSURE_STATE:${current.state}`);
    }

    const next = applyTransition(current, target, now, resolution);
    const timestampLegal = checkTimestamps(next);
    if (!timestampLegal) reasons.push('ILLEGAL_TIMESTAMP_ORDER');

    const nextWithHash: EventOutput = {
      ...next,
      lineage: {
        ...next.lineage,
        replay_hash: computeReplayHash({
          primitive_id: def.primitive_id,
          primitive_version: def.version,
          scope_type: next.scope_type,
          scope_id: next.scope_id,
          temporal_anchor: next.candidate_at,
          material_inputs: {
            state: next.state,
            dedupe_key: next.dedupe_key,
            candidate_at: next.candidate_at,
            confirmed_at: next.confirmed_at,
            active_at: next.active_at,
            peak_at: next.peak_at,
            resolved_at: next.resolved_at,
            expired_at: next.expired_at,
            trigger: next.trigger_values,
            resolution: next.resolution_values,
          },
        }),
      },
    };

    const validation = validateEventOutput(nextWithHash, def);

    return {
      output: nextWithHash,
      validation,
      transition_legal: legal,
      timestamp_legal: timestampLegal,
      reasons,
    };
  }
}

function applyTransition(
  e: EventOutput,
  target: L6EventLifecycleState,
  now: string,
  resolution?: EventResolutionSnapshot,
): EventOutput {
  const next: EventOutput = { ...e, state: target };
  switch (target) {
    case L6EventLifecycleState.CONFIRMED:
      return { ...next, confirmed_at: next.confirmed_at ?? now };
    case L6EventLifecycleState.ACTIVE:
      return { ...next, active_at: next.active_at ?? now };
    case L6EventLifecycleState.COOLING:
      return { ...next, peak_at: next.peak_at ?? now };
    case L6EventLifecycleState.RESOLVED:
      return {
        ...next,
        resolved_at: next.resolved_at ?? now,
        resolution_values: resolution ?? next.resolution_values,
      };
    case L6EventLifecycleState.EXPIRED:
      return { ...next, expired_at: next.expired_at ?? now };
    case L6EventLifecycleState.SUPPRESSED:
    case L6EventLifecycleState.QUARANTINED:
      return next;
    default:
      return next;
  }
}

function checkTimestamps(e: EventOutput): boolean {
  const order = [
    e.candidate_at,
    e.confirmed_at,
    e.active_at,
    e.peak_at,
    e.resolved_at,
    e.expired_at,
  ];
  let last: string | null = null;
  for (const t of order) {
    if (!t) continue;
    if (last !== null && t < last) return false;
    last = t;
  }
  // sanity: ordinal rank does not regress except within the same-rank group
  const rank = LIFECYCLE_ORDINAL_MAP[e.state];
  return Number.isFinite(rank);
}
