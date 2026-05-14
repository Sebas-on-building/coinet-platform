/**
 * L12.2 — Scenario coexistence law (§12.2.17).
 *
 * Multi-path competition is the load-bearing semantic of the scenario engine.
 * A scenario set must preserve coexistence of plausible paths, or explicitly
 * declare insufficient competition with disclosure.
 */

export enum L12ScenarioCoexistenceClass {
  CLEAN_BASE_WITH_ALTERNATIVES = 'CLEAN_BASE_WITH_ALTERNATIVES',
  CLOSE_PRIMARY_SECONDARY = 'CLOSE_PRIMARY_SECONDARY',
  UNRESOLVED_MULTI_PATH = 'UNRESOLVED_MULTI_PATH',
  CONTRADICTORY_PATHS_WITH_DISCLOSURE = 'CONTRADICTORY_PATHS_WITH_DISCLOSURE',
  SINGLE_PATH_INSUFFICIENT = 'SINGLE_PATH_INSUFFICIENT',
  ILLEGAL_COLLAPSED_SINGLE_PATH = 'ILLEGAL_COLLAPSED_SINGLE_PATH',
}

export const ALL_L12_COEXISTENCE_CLASSES: readonly L12ScenarioCoexistenceClass[] =
  Object.values(L12ScenarioCoexistenceClass);

export function isL12IllegalCoexistenceClass(c: L12ScenarioCoexistenceClass): boolean {
  return c === L12ScenarioCoexistenceClass.ILLEGAL_COLLAPSED_SINGLE_PATH;
}
