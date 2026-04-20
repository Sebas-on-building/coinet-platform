/**
 * L9.2 — Sequence Coexistence Registry
 *
 * §9.2.7 — Runtime registry that wraps the intra-family coexistence
 * rulebook and decides legality for a declared (primary, secondary,
 * coexistence_class) tuple (§9.2.7.4).
 */

import { L9SequenceFamily } from '../contracts/sequence-family';
import { L9SequenceState } from '../contracts/sequence-state';
import {
  L9SequenceCoexistenceClass,
  L9SequenceCoexistenceRule,
  L9_SEQUENCE_COEXISTENCE_RULES,
  L9CoexistenceDecision,
  decideL9Coexistence,
  getL9CoexistenceRule,
  l9IsIllegalIntraFamilyPair,
} from '../contracts/sequence-coexistence';

export class L9SequenceCoexistenceRegistry {
  private readonly rules: readonly L9SequenceCoexistenceRule[];

  constructor(
    rules: readonly L9SequenceCoexistenceRule[] = L9_SEQUENCE_COEXISTENCE_RULES,
  ) {
    this.rules = rules;
  }

  list(): readonly L9SequenceCoexistenceRule[] {
    return this.rules;
  }

  getRule(
    family: L9SequenceFamily,
    a: L9SequenceState,
    b: L9SequenceState,
  ): L9SequenceCoexistenceRule | undefined {
    return getL9CoexistenceRule(family, a, b);
  }

  decide(
    family: L9SequenceFamily,
    primary: L9SequenceState,
    secondary: L9SequenceState | null,
    declared: L9SequenceCoexistenceClass,
  ): L9CoexistenceDecision {
    return decideL9Coexistence(family, primary, secondary, declared);
  }

  isIllegalIntraFamilyPair(
    family: L9SequenceFamily,
    primary: L9SequenceState,
    secondary: L9SequenceState,
  ): boolean {
    return l9IsIllegalIntraFamilyPair(family, primary, secondary);
  }
}

const defaultCoexistenceRegistry = new L9SequenceCoexistenceRegistry();

export function getDefaultL9SequenceCoexistenceRegistry():
  L9SequenceCoexistenceRegistry {
  return defaultCoexistenceRegistry;
}
