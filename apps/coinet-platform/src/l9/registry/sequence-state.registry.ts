/**
 * L9.2 — Sequence State Registry
 *
 * §9.2.6 — Runtime registry wrapping the frozen state-descriptor table.
 * Enforces family membership, scope legality, post-event anchor
 * requirements, and clean-single eligibility (§9.2.6.5).
 */

import { L9SequenceFamily, L9SequenceScopeType } from '../contracts/sequence-family';
import {
  L9SequenceState,
  L9SequenceStateDescriptor,
  L9_SEQUENCE_STATE_DESCRIPTORS,
  isL9RegisteredSequenceState,
  l9StateBelongsToFamily,
  l9StateAllowsScope,
  l9StateRequiresPostEventAnchor,
  l9StateAllowsCleanSingle,
  getL9SequenceStatesForFamily,
  getL9SequenceDominance,
} from '../contracts/sequence-state';

export class L9SequenceStateRegistry {
  private readonly byState: Map<L9SequenceState, L9SequenceStateDescriptor>;

  constructor(
    descriptors: readonly L9SequenceStateDescriptor[] = L9_SEQUENCE_STATE_DESCRIPTORS,
  ) {
    this.byState = new Map(descriptors.map(d => [d.state, d]));
  }

  list(): readonly L9SequenceStateDescriptor[] {
    return Array.from(this.byState.values());
  }

  get(state: L9SequenceState): L9SequenceStateDescriptor | undefined {
    return this.byState.get(state);
  }

  isRegistered(value: string): boolean {
    return this.byState.has(value as L9SequenceState);
  }

  belongsToFamily(state: L9SequenceState, family: L9SequenceFamily): boolean {
    return l9StateBelongsToFamily(state, family);
  }

  allowsScope(state: L9SequenceState, scope: L9SequenceScopeType): boolean {
    return l9StateAllowsScope(state, scope);
  }

  requiresPostEventAnchor(state: L9SequenceState): boolean {
    return l9StateRequiresPostEventAnchor(state);
  }

  allowsCleanSingle(state: L9SequenceState): boolean {
    return l9StateAllowsCleanSingle(state);
  }

  statesForFamily(family: L9SequenceFamily): readonly L9SequenceStateDescriptor[] {
    return getL9SequenceStatesForFamily(family);
  }
}

const defaultSequenceStateRegistry = new L9SequenceStateRegistry();

export function getDefaultL9SequenceStateRegistry(): L9SequenceStateRegistry {
  return defaultSequenceStateRegistry;
}

export {
  isL9RegisteredSequenceState,
  l9StateBelongsToFamily,
  l9StateAllowsScope,
  l9StateRequiresPostEventAnchor,
  l9StateAllowsCleanSingle,
  getL9SequenceStatesForFamily,
  getL9SequenceDominance,
};
