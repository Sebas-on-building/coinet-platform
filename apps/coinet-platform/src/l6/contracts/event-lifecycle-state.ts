/**
 * L6.3 — Event Lifecycle State
 *
 * §6.3.6.3 / §6.3.6.6 — Re-exports the frozen lifecycle state enum from L6.2
 * and adds the lifecycle-ordering graph and timestamp-ordering law required
 * by the L6.3 event output contract validator.
 */

import { L6EventLifecycleState, ALL_EVENT_LIFECYCLE_STATES } from './event-contract';

export { L6EventLifecycleState };

export const LIFECYCLE_CLOSURE_STATES: readonly L6EventLifecycleState[] = [
  L6EventLifecycleState.RESOLVED,
  L6EventLifecycleState.EXPIRED,
  L6EventLifecycleState.SUPPRESSED,
  L6EventLifecycleState.QUARANTINED,
];

export function isClosureState(state: L6EventLifecycleState): boolean {
  return LIFECYCLE_CLOSURE_STATES.includes(state);
}

export function isRegisteredLifecycleState(state: string): state is L6EventLifecycleState {
  return ALL_EVENT_LIFECYCLE_STATES.includes(state as L6EventLifecycleState);
}

export type LifecycleOrdinalMap = Readonly<Record<L6EventLifecycleState, number>>;

export const LIFECYCLE_ORDINAL_MAP: LifecycleOrdinalMap = Object.freeze({
  [L6EventLifecycleState.CANDIDATE]: 0,
  [L6EventLifecycleState.CONFIRMED]: 1,
  [L6EventLifecycleState.ACTIVE]: 2,
  [L6EventLifecycleState.COOLING]: 3,
  [L6EventLifecycleState.RESOLVED]: 4,
  [L6EventLifecycleState.EXPIRED]: 4,
  [L6EventLifecycleState.SUPPRESSED]: 5,
  [L6EventLifecycleState.QUARANTINED]: 5,
});
