/**
 * L5.4 Universal Write Contract — Envelope Lifecycle
 *
 * §5.4.9 — Envelope Lifecycle State Machine
 */

import { L5EnvelopeError, L5EnvelopeErrorCode } from './envelope-errors';

export enum L5EnvelopeLifecycleState {
  RECEIVED = 'RECEIVED',
  NORMALIZED = 'NORMALIZED',
  STRUCTURALLY_VALIDATED = 'STRUCTURALLY_VALIDATED',
  SEMANTICALLY_VALIDATED = 'SEMANTICALLY_VALIDATED',
  CLASSIFIED = 'CLASSIFIED',
  AUTHORITY_ALLOCATED = 'AUTHORITY_ALLOCATED',
  TOPOLOGY_VALIDATED = 'TOPOLOGY_VALIDATED',
  ARCHIVE_PROOF_ATTACHED = 'ARCHIVE_PROOF_ATTACHED',
  READY_FOR_MANIFEST = 'READY_FOR_MANIFEST',
  QUARANTINED = 'QUARANTINED',
  REJECTED = 'REJECTED',
}

export const ALL_LIFECYCLE_STATES: readonly L5EnvelopeLifecycleState[] = Object.values(L5EnvelopeLifecycleState);

export const TERMINAL_LIFECYCLE_STATES: readonly L5EnvelopeLifecycleState[] = [
  L5EnvelopeLifecycleState.READY_FOR_MANIFEST,
  L5EnvelopeLifecycleState.QUARANTINED,
  L5EnvelopeLifecycleState.REJECTED,
];

const FORWARD_TRANSITIONS: Record<L5EnvelopeLifecycleState, readonly L5EnvelopeLifecycleState[]> = {
  [L5EnvelopeLifecycleState.RECEIVED]:                 [L5EnvelopeLifecycleState.NORMALIZED, L5EnvelopeLifecycleState.QUARANTINED, L5EnvelopeLifecycleState.REJECTED],
  [L5EnvelopeLifecycleState.NORMALIZED]:               [L5EnvelopeLifecycleState.STRUCTURALLY_VALIDATED, L5EnvelopeLifecycleState.QUARANTINED, L5EnvelopeLifecycleState.REJECTED],
  [L5EnvelopeLifecycleState.STRUCTURALLY_VALIDATED]:   [L5EnvelopeLifecycleState.SEMANTICALLY_VALIDATED, L5EnvelopeLifecycleState.QUARANTINED, L5EnvelopeLifecycleState.REJECTED],
  [L5EnvelopeLifecycleState.SEMANTICALLY_VALIDATED]:   [L5EnvelopeLifecycleState.CLASSIFIED, L5EnvelopeLifecycleState.QUARANTINED, L5EnvelopeLifecycleState.REJECTED],
  [L5EnvelopeLifecycleState.CLASSIFIED]:               [L5EnvelopeLifecycleState.AUTHORITY_ALLOCATED, L5EnvelopeLifecycleState.QUARANTINED, L5EnvelopeLifecycleState.REJECTED],
  [L5EnvelopeLifecycleState.AUTHORITY_ALLOCATED]:      [L5EnvelopeLifecycleState.TOPOLOGY_VALIDATED, L5EnvelopeLifecycleState.QUARANTINED, L5EnvelopeLifecycleState.REJECTED],
  [L5EnvelopeLifecycleState.TOPOLOGY_VALIDATED]:       [L5EnvelopeLifecycleState.ARCHIVE_PROOF_ATTACHED, L5EnvelopeLifecycleState.READY_FOR_MANIFEST, L5EnvelopeLifecycleState.QUARANTINED, L5EnvelopeLifecycleState.REJECTED],
  [L5EnvelopeLifecycleState.ARCHIVE_PROOF_ATTACHED]:   [L5EnvelopeLifecycleState.READY_FOR_MANIFEST, L5EnvelopeLifecycleState.QUARANTINED, L5EnvelopeLifecycleState.REJECTED],
  [L5EnvelopeLifecycleState.READY_FOR_MANIFEST]:       [],
  [L5EnvelopeLifecycleState.QUARANTINED]:              [],
  [L5EnvelopeLifecycleState.REJECTED]:                 [],
};

export function isLegalLifecycleTransition(from: L5EnvelopeLifecycleState, to: L5EnvelopeLifecycleState): boolean {
  return FORWARD_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getLegalLifecycleTransitions(from: L5EnvelopeLifecycleState): readonly L5EnvelopeLifecycleState[] {
  return FORWARD_TRANSITIONS[from] ?? [];
}

export function isTerminalLifecycleState(state: L5EnvelopeLifecycleState): boolean {
  return TERMINAL_LIFECYCLE_STATES.includes(state);
}

export function assertLifecycleTransition(from: L5EnvelopeLifecycleState, to: L5EnvelopeLifecycleState): void {
  if (!isLegalLifecycleTransition(from, to)) {
    throw new L5EnvelopeError(
      L5EnvelopeErrorCode.ILLEGAL_LIFECYCLE_TRANSITION,
      `Lifecycle transition '${from}' → '${to}' is illegal`,
      { from, to },
    );
  }
}

/**
 * Ordered progression for monotonic advancement check.
 */
const LIFECYCLE_ORDER: Record<L5EnvelopeLifecycleState, number> = {
  [L5EnvelopeLifecycleState.RECEIVED]: 0,
  [L5EnvelopeLifecycleState.NORMALIZED]: 1,
  [L5EnvelopeLifecycleState.STRUCTURALLY_VALIDATED]: 2,
  [L5EnvelopeLifecycleState.SEMANTICALLY_VALIDATED]: 3,
  [L5EnvelopeLifecycleState.CLASSIFIED]: 4,
  [L5EnvelopeLifecycleState.AUTHORITY_ALLOCATED]: 5,
  [L5EnvelopeLifecycleState.TOPOLOGY_VALIDATED]: 6,
  [L5EnvelopeLifecycleState.ARCHIVE_PROOF_ATTACHED]: 7,
  [L5EnvelopeLifecycleState.READY_FOR_MANIFEST]: 8,
  [L5EnvelopeLifecycleState.QUARANTINED]: 99,
  [L5EnvelopeLifecycleState.REJECTED]: 99,
};

export function isMonotonicAdvancement(from: L5EnvelopeLifecycleState, to: L5EnvelopeLifecycleState): boolean {
  if (to === L5EnvelopeLifecycleState.QUARANTINED || to === L5EnvelopeLifecycleState.REJECTED) return true;
  return LIFECYCLE_ORDER[to] > LIFECYCLE_ORDER[from];
}
