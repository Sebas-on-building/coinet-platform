/**
 * L8.5 — Regime Consumption Rights Registry
 *
 * §8.5.8.4 — Wraps the static consumption-rights matrix so the
 * consumption validator has one source of truth.
 */

import {
  L8RegimeConsumptionRight,
  L8_CONSUMPTION_RIGHTS_MATRIX,
  getL8ConsumptionRights,
  hasL8ConsumptionRight,
} from '../contracts/regime-consumption-rights';
import type { L8RegimeDependencyClass } from '../contracts/regime-input-binding';
import type {
  L8RegimeInputAdmissibilityClass,
} from '../contracts/regime-admissibility';

export class L8RegimeConsumptionRightsRegistry {
  list(): readonly L8RegimeConsumptionRight[] {
    return Object.values(L8RegimeConsumptionRight);
  }

  rightsFor(
    depClass: L8RegimeDependencyClass,
    admissibility: L8RegimeInputAdmissibilityClass,
  ): readonly L8RegimeConsumptionRight[] {
    return getL8ConsumptionRights(depClass, admissibility);
  }

  has(
    depClass: L8RegimeDependencyClass,
    admissibility: L8RegimeInputAdmissibilityClass,
    right: L8RegimeConsumptionRight,
  ): boolean {
    return hasL8ConsumptionRight(depClass, admissibility, right);
  }

  matrix(): typeof L8_CONSUMPTION_RIGHTS_MATRIX {
    return L8_CONSUMPTION_RIGHTS_MATRIX;
  }
}

const defaultRegistry = new L8RegimeConsumptionRightsRegistry();

export function getDefaultL8RegimeConsumptionRightsRegistry():
  L8RegimeConsumptionRightsRegistry {
  return defaultRegistry;
}
