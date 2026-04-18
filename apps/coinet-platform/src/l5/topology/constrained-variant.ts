/**
 * L5.3 Multi-store Architecture — Constrained Variant
 *
 * §5.3.5  — TimescaleDB Position
 * §5.3.12 — Constrained Topology Variant
 *
 * Constrained mode changes implementation footprint.
 * It does not change constitutional storage law.
 */

import { L5DeploymentMode, isReferenceMode } from './deployment-mode';
import { L5StoreKind, L5StorePlane } from './store-profile';
import { L5TopologyError, L5TopologyErrorCode } from './topology-errors';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTRAINED SUBSTITUTION RULE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConstrainedSubstitution {
  readonly plane: L5StorePlane;
  readonly referenceKind: L5StoreKind;
  readonly substituteBackend: string;
  readonly reason: string;
  readonly preservesConstitutionalLaw: boolean;
}

/**
 * The only legal substitution in constrained mode:
 * TimescaleDB replaces ClickHouse for the analytical plane.
 */
const LEGAL_SUBSTITUTIONS: readonly ConstrainedSubstitution[] = [
  {
    plane: L5StorePlane.ANALYTICAL,
    referenceKind: L5StoreKind.CLICKHOUSE,
    substituteBackend: 'TIMESCALEDB',
    reason: 'Budget/team constrained environment — single analytical backend on Postgres extension',
    preservesConstitutionalLaw: true,
  },
];

export function getLegalSubstitutions(): readonly ConstrainedSubstitution[] {
  return LEGAL_SUBSTITUTIONS;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTRAINED DRIFT RULES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConstrainedDriftViolation {
  readonly rule: string;
  readonly description: string;
}

const FORBIDDEN_CONSTRAINED_DRIFT: readonly ConstrainedDriftViolation[] = [
  { rule: 'REDIS_BECOMES_DURABLE', description: 'Redis becomes durable truth in constrained mode' },
  { rule: 'POSTGRES_BECOMES_RAW_ARCHIVE', description: 'Postgres becomes raw archive sink' },
  { rule: 'OBJECT_STORAGE_BECOMES_QUERY_REGISTRY', description: 'Object storage becomes query-time registry' },
  { rule: 'ANALYTICAL_LOSES_DEDUPE', description: 'Analytical history loses dedupe and replay metadata' },
  { rule: 'TOPOLOGY_LAW_DISAPPEARS', description: 'Temporary topology law disappears' },
];

export function getForbiddenConstrainedDrift(): readonly ConstrainedDriftViolation[] {
  return FORBIDDEN_CONSTRAINED_DRIFT;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTRAINED MODE EVALUATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConstrainedModeEvaluation {
  readonly mode: L5DeploymentMode;
  readonly isConstrained: boolean;
  readonly activeSubstitutions: readonly ConstrainedSubstitution[];
  readonly planesStillCovered: readonly L5StorePlane[];
  readonly valid: boolean;
  readonly violations: readonly string[];
}

export function evaluateConstrainedMode(mode: L5DeploymentMode): ConstrainedModeEvaluation {
  const violations: string[] = [];

  if (isReferenceMode(mode)) {
    return {
      mode,
      isConstrained: false,
      activeSubstitutions: [],
      planesStillCovered: [L5StorePlane.AUTHORITY, L5StorePlane.ANALYTICAL, L5StorePlane.SPEED, L5StorePlane.EVIDENCE],
      valid: true,
      violations: [],
    };
  }

  const activeSubstitutions = mode === L5DeploymentMode.CONSTRAINED_SINGLE_ANALYTICAL_BACKEND
    ? LEGAL_SUBSTITUTIONS
    : [];

  const planesStillCovered: L5StorePlane[] = [
    L5StorePlane.AUTHORITY,
    L5StorePlane.ANALYTICAL,
    L5StorePlane.SPEED,
    L5StorePlane.EVIDENCE,
  ];

  if (mode === L5DeploymentMode.LOCAL_DEV) {
    // Local dev must still cover all planes conceptually
  }

  return {
    mode,
    isConstrained: true,
    activeSubstitutions,
    planesStillCovered,
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Prevent reference mode from silently downgrading.
 */
export function assertNoSilentDowngrade(
  declaredMode: L5DeploymentMode,
  actualAnalyticalBackend: string,
): void {
  if (isReferenceMode(declaredMode) && actualAnalyticalBackend !== 'CLICKHOUSE') {
    throw new L5TopologyError(
      L5TopologyErrorCode.SILENT_MODE_DOWNGRADE,
      `Declared mode is REFERENCE_PRODUCTION but analytical backend is '${actualAnalyticalBackend}', not CLICKHOUSE`,
      { declaredMode, actualAnalyticalBackend },
    );
  }
}

/**
 * Validate that a substitution is legal.
 */
export function isLegalSubstitution(plane: L5StorePlane, substituteBackend: string): boolean {
  return LEGAL_SUBSTITUTIONS.some(
    s => s.plane === plane && s.substituteBackend === substituteBackend,
  );
}
