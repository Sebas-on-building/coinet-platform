/**
 * L8.2 — Regime Coexistence Registry
 *
 * §8.2.9.7 — Canonical registry of coexistence rules across all
 * families. Wraps the rulebook and the deterministic coexistence
 * decision function so validators have one source of truth.
 */

import { L8RegimeFamily } from '../contracts/regime-family';
import { L8RegimeClass } from '../contracts/regime-class';
import { L8RegimeCoexistenceClass } from '../contracts/regime-state';
import {
  L8CoexistenceRule,
  L8_COEXISTENCE_RULES,
  L8CoexistenceDecision,
  getCoexistenceRule,
  decideCoexistence,
  isIllegalIntraFamilyPair,
} from '../contracts/regime-coexistence';

export class L8RegimeCoexistenceRegistry {
  private readonly rules: readonly L8CoexistenceRule[];

  constructor(rules: readonly L8CoexistenceRule[] = L8_COEXISTENCE_RULES) {
    this.rules = rules;
  }

  list(): readonly L8CoexistenceRule[] {
    return this.rules;
  }

  listForFamily(family: L8RegimeFamily): readonly L8CoexistenceRule[] {
    return this.rules.filter(r => r.family === family);
  }

  rule(
    family: L8RegimeFamily,
    a: L8RegimeClass,
    b: L8RegimeClass,
  ): L8CoexistenceRule | undefined {
    return getCoexistenceRule(family, a, b);
  }

  decide(
    family: L8RegimeFamily,
    primary: L8RegimeClass,
    secondary: L8RegimeClass | null,
    declared: L8RegimeCoexistenceClass,
  ): L8CoexistenceDecision {
    return decideCoexistence(family, primary, secondary, declared);
  }

  isIllegal(
    family: L8RegimeFamily,
    primary: L8RegimeClass,
    secondary: L8RegimeClass,
  ): boolean {
    return isIllegalIntraFamilyPair(family, primary, secondary);
  }
}

const defaultCoexistenceRegistry = new L8RegimeCoexistenceRegistry();

export function getDefaultL8CoexistenceRegistry(): L8RegimeCoexistenceRegistry {
  return defaultCoexistenceRegistry;
}

export {
  getCoexistenceRule,
  decideCoexistence,
  isIllegalIntraFamilyPair,
};
