/**
 * L6.2 — Lineage Policy Contract
 *
 * §6.2.6.1 / §6.2.6.2 — Every primitive must declare exact lineage rules.
 * Lineage must be traceable to L3 canonical objects, L4 graph surfaces,
 * and L5 storage authority. Hidden or implicit lineage is forbidden.
 */

export enum L6LineageScope {
  INPUTS_ONLY = 'INPUTS_ONLY',
  INPUTS_AND_BASELINE = 'INPUTS_AND_BASELINE',
  INPUTS_AND_CONTEXT = 'INPUTS_AND_CONTEXT',
  INPUTS_BASELINE_AND_CONTEXT = 'INPUTS_BASELINE_AND_CONTEXT',
  FULL_FORENSIC = 'FULL_FORENSIC',
}

export const ALL_LINEAGE_SCOPES: readonly L6LineageScope[] = Object.values(L6LineageScope);

export interface LineagePolicySpec {
  readonly scope: L6LineageScope;
  readonly requiredInputSurfaces: readonly string[];
  readonly requiredContextSurfaces: readonly string[];
  readonly carriesSourceVersion: boolean;
  readonly carriesSchemaVersion: boolean;
  readonly replayCompatible: boolean;
}

export function isCompleteLineagePolicy(spec: LineagePolicySpec | undefined | null): spec is LineagePolicySpec {
  if (!spec) return false;
  if (!spec.scope) return false;
  if (!Array.isArray(spec.requiredInputSurfaces)) return false;
  if (!spec.carriesSourceVersion) return false;
  if (!spec.carriesSchemaVersion) return false;
  if (!spec.replayCompatible) return false;
  return true;
}
