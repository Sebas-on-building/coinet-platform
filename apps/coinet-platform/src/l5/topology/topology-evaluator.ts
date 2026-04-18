/**
 * L5.3 Multi-store Architecture — Topology Evaluator
 *
 * §5.3.16 — Topology Evaluator
 *
 * Main executable artifact of L5.3. Takes a deployment mode and
 * produces the full validated topology map.
 */

import { L5DeploymentMode, isReferenceMode, isValidDeploymentMode } from './deployment-mode';
import { L5StoreKind, L5StorePlane, ALL_STORE_KINDS, ALL_STORE_PLANES, REFERENCE_STORE_PROFILES, type L5StoreProfile } from './store-profile';
import { L5InteractionLegality, getAllInteractionRules, type InteractionRule } from './store-topology';
import { getNamespacePolicy, type NamespacePolicy } from './namespace-policy';
import { evaluateConstrainedMode, type ConstrainedModeEvaluation } from './constrained-variant';
import { assertAllTopologyInvariants, type TopologyInvariantResult } from './topology-invariants';
import { L5TopologyError, L5TopologyErrorCode } from './topology-errors';

// ═══════════════════════════════════════════════════════════════════════════════
// TOPOLOGY MAP
// ═══════════════════════════════════════════════════════════════════════════════

export interface L5TopologyMap {
  readonly mode: L5DeploymentMode;
  readonly stores: readonly L5StoreProfile[];
  readonly interactionRules: readonly InteractionRule[];
  readonly namespaces: Record<string, NamespacePolicy>;
  readonly constrainedEvaluation: ConstrainedModeEvaluation;
  readonly invariantResults: readonly TopologyInvariantResult[];
  readonly invariantsPassed: boolean;
  readonly valid: boolean;
  readonly violations: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function evaluateL5Topology(mode: L5DeploymentMode): L5TopologyMap {
  if (!isValidDeploymentMode(mode)) {
    throw new L5TopologyError(
      L5TopologyErrorCode.ILLEGAL_DEPLOYMENT_MODE,
      `Unrecognized deployment mode '${mode}'`,
      { mode },
    );
  }

  const violations: string[] = [];

  // Collect stores
  const stores: L5StoreProfile[] = ALL_STORE_KINDS.map(k => REFERENCE_STORE_PROFILES[k]);

  // Collect interaction rules
  const interactionRules = getAllInteractionRules();

  // Collect namespaces
  const namespaces: Record<string, NamespacePolicy> = {};
  for (const kind of ALL_STORE_KINDS) {
    namespaces[kind] = getNamespacePolicy(kind);
  }

  // Evaluate constrained mode
  const constrainedEvaluation = evaluateConstrainedMode(mode);
  violations.push(...constrainedEvaluation.violations);

  // Validate reference-mode completeness
  if (isReferenceMode(mode)) {
    if (stores.length !== 4) {
      violations.push(`Reference mode requires exactly 4 stores, found ${stores.length}`);
    }

    const coveredPlanes = new Set(stores.map(s => s.plane));
    for (const plane of ALL_STORE_PLANES) {
      if (!coveredPlanes.has(plane)) {
        violations.push(`Reference mode missing plane '${plane}'`);
      }
    }
  }

  // Run invariants
  const invariantResults = assertAllTopologyInvariants({
    mode,
    activeStores: ALL_STORE_KINDS,
    coveredPlanes: [...ALL_STORE_PLANES],
    analyticalBackend: isReferenceMode(mode) ? 'CLICKHOUSE' : 'TIMESCALEDB',
  });
  const invariantsPassed = invariantResults.every(r => r.passed);

  return {
    mode,
    stores,
    interactionRules,
    namespaces,
    constrainedEvaluation,
    invariantResults,
    invariantsPassed,
    valid: violations.length === 0 && invariantsPassed,
    violations,
  };
}

/**
 * Quick validity check for a deployment mode without building full map.
 */
export function isTopologyValid(mode: L5DeploymentMode): boolean {
  try {
    const map = evaluateL5Topology(mode);
    return map.valid;
  } catch {
    return false;
  }
}
