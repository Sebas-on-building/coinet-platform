/**
 * L5.1 Purpose — Invariants
 *
 * §5.1.9 — L5 Purpose Invariants
 *
 * These are the hard constitutional assertions that all L5 components
 * must satisfy. They are the machine-readable version of purpose law.
 * Test suites assert against these; architecture reviews check them;
 * CI gates enforce them.
 */

import {
  L5StateClass,
  type L5PurposeClassification,
  getStateClassProperties,
  getAuthorityHome,
} from './state-class';
import { L5PurposeError, L5PurposeErrorCode } from './purpose-errors';

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT IDS
// ═══════════════════════════════════════════════════════════════════════════════

export type L5PurposeInvariantId =
  | 'INV-5.1-A'
  | 'INV-5.1-B'
  | 'INV-5.1-C'
  | 'INV-5.1-D'
  | 'INV-5.1-E'
  | 'INV-5.1-F'
  | 'INV-5.1-G'
  | 'INV-5.1-H'
  | 'INV-5.1-I'
  | 'INV-5.1-J';

export interface InvariantDefinition {
  readonly id: L5PurposeInvariantId;
  readonly title: string;
  readonly law: string;
}

export const L5_PURPOSE_INVARIANTS: readonly InvariantDefinition[] = [
  {
    id: 'INV-5.1-A',
    title: 'No state-class impersonation',
    law: 'No state class may silently impersonate another.',
  },
  {
    id: 'INV-5.1-B',
    title: 'Mandatory state-class declaration',
    law: 'Every governed write must declare a primary state class.',
  },
  {
    id: 'INV-5.1-C',
    title: 'Single authority home',
    law: 'Every authority-bearing state must have exactly one legal authority home.',
  },
  {
    id: 'INV-5.1-D',
    title: 'Replay lineage',
    law: 'Every replay-required write must preserve enough lineage to reconstruct time-of-belief state.',
  },
  {
    id: 'INV-5.1-E',
    title: 'No ephemeral authority promotion',
    law: 'No hot state may become durable truth by consumer convenience.',
  },
  {
    id: 'INV-5.1-F',
    title: 'Archive indexability',
    law: 'No immutable archive object may exist without indexable lineage metadata.',
  },
  {
    id: 'INV-5.1-G',
    title: 'No silent resolution hardening',
    law: 'No unresolved or contested lower-layer status may be silently hardened by L5 persistence.',
  },
  {
    id: 'INV-5.1-H',
    title: 'Projection loss distinction',
    law: 'Projection loss must never be misreported as truth loss unless the primary authority store failed.',
  },
  {
    id: 'INV-5.1-I',
    title: 'Late data visibility',
    law: 'Late data must never mutate current belief invisibly.',
  },
  {
    id: 'INV-5.1-J',
    title: 'Read surface honesty',
    law: 'Every materialized read surface must preserve the distinction between authority, history, hotness, and evidence.',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT CHECK RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface InvariantCheckResult {
  readonly invariantId: L5PurposeInvariantId;
  readonly passed: boolean;
  readonly violation?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT ASSERTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check INV-5.1-A: the classification's primaryStateClass must not
 * contradict its properties. Ephemeral cannot claim authority; archive
 * cannot claim ephemeral; etc.
 */
function checkA(c: L5PurposeClassification): InvariantCheckResult {
  const props = getStateClassProperties(c.primaryStateClass);
  if (c.isAuthorityBearing && !props.isAuthorityBearing) {
    return { invariantId: 'INV-5.1-A', passed: false, violation: `State class '${c.primaryStateClass}' claims authority but class does not bear authority` };
  }
  if (c.isEphemeral && props.isDurable) {
    return { invariantId: 'INV-5.1-A', passed: false, violation: `Ephemeral flag set but state class '${c.primaryStateClass}' is durable` };
  }
  return { invariantId: 'INV-5.1-A', passed: true };
}

/**
 * Check INV-5.1-B: classification must have a valid primary state class.
 */
function checkB(c: L5PurposeClassification): InvariantCheckResult {
  if (!c.primaryStateClass || !Object.values(L5StateClass).includes(c.primaryStateClass)) {
    return { invariantId: 'INV-5.1-B', passed: false, violation: 'Primary state class is unresolved or invalid' };
  }
  return { invariantId: 'INV-5.1-B', passed: true };
}

/**
 * Check INV-5.1-C: if authority-bearing, the fact class must have a declared home.
 * Requires a factClass context to check.
 */
function checkC(c: L5PurposeClassification, factClass?: string): InvariantCheckResult {
  if (!c.isAuthorityBearing) return { invariantId: 'INV-5.1-C', passed: true };
  if (!factClass) return { invariantId: 'INV-5.1-C', passed: true };
  const home = getAuthorityHome(factClass);
  if (!home) {
    return { invariantId: 'INV-5.1-C', passed: false, violation: `Authority-bearing fact class '${factClass}' has no declared authority home` };
  }
  return { invariantId: 'INV-5.1-C', passed: true };
}

/**
 * Check INV-5.1-D: replay-required writes must declare enough lineage.
 * At the classification level, we can only check that the flag is set
 * consistently with the state class.
 */
function checkD(c: L5PurposeClassification, hasLineageMetadata?: boolean): InvariantCheckResult {
  if (!c.isReplayRequired) return { invariantId: 'INV-5.1-D', passed: true };
  if (hasLineageMetadata === false) {
    return { invariantId: 'INV-5.1-D', passed: false, violation: 'Replay-required write lacks lineage metadata' };
  }
  return { invariantId: 'INV-5.1-D', passed: true };
}

/**
 * Check INV-5.1-E: ephemeral state must not be flagged as authority-bearing.
 */
function checkE(c: L5PurposeClassification): InvariantCheckResult {
  if (c.isEphemeral && c.isAuthorityBearing) {
    return { invariantId: 'INV-5.1-E', passed: false, violation: 'Ephemeral state cannot be authority-bearing' };
  }
  return { invariantId: 'INV-5.1-E', passed: true };
}

/**
 * Check INV-5.1-F: archive-required writes must have archive metadata.
 */
function checkF(c: L5PurposeClassification, hasArchiveMetadata?: boolean): InvariantCheckResult {
  if (!c.archiveRequired) return { invariantId: 'INV-5.1-F', passed: true };
  if (c.primaryStateClass === L5StateClass.IMMUTABLE_ARCHIVE_STATE && hasArchiveMetadata === false) {
    return { invariantId: 'INV-5.1-F', passed: false, violation: 'Immutable archive write lacks indexable lineage metadata' };
  }
  return { invariantId: 'INV-5.1-F', passed: true };
}

/**
 * Check INV-5.1-G: L5 must not harden unresolved status.
 * This is checked at write-intent level, not classification level.
 */
function checkG(_c: L5PurposeClassification, hardeningUnresolved?: boolean): InvariantCheckResult {
  if (hardeningUnresolved === true) {
    return { invariantId: 'INV-5.1-G', passed: false, violation: 'L5 is hardening unresolved lower-layer status' };
  }
  return { invariantId: 'INV-5.1-G', passed: true };
}

/**
 * Check INV-5.1-H: projection loss ≠ truth loss.
 */
function checkH(c: L5PurposeClassification, isProjectionLoss?: boolean, reportedAsTruthLoss?: boolean): InvariantCheckResult {
  if (isProjectionLoss && reportedAsTruthLoss && !c.isAuthorityBearing) {
    return { invariantId: 'INV-5.1-H', passed: false, violation: 'Projection loss misreported as truth loss for non-authority state' };
  }
  return { invariantId: 'INV-5.1-H', passed: true };
}

/**
 * Check INV-5.1-I: late-data-sensitive writes must declare that status.
 */
function checkI(c: L5PurposeClassification, isLateData?: boolean): InvariantCheckResult {
  if (isLateData === true && !c.lateArrivalSensitive) {
    return { invariantId: 'INV-5.1-I', passed: false, violation: 'Late data arriving at a write not marked lateArrivalSensitive' };
  }
  return { invariantId: 'INV-5.1-I', passed: true };
}

/**
 * Check INV-5.1-J: projection targets must not include the primary class
 * for authority writes (self-projection is not materialization).
 */
function checkJ(c: L5PurposeClassification): InvariantCheckResult {
  if (c.isAuthorityBearing && c.projectionTargets.includes(c.primaryStateClass)) {
    return { invariantId: 'INV-5.1-J', passed: false, violation: 'Authority write projects into its own primary class, breaking read-surface distinction' };
  }
  return { invariantId: 'INV-5.1-J', passed: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export interface InvariantCheckContext {
  readonly factClass?: string;
  readonly hasLineageMetadata?: boolean;
  readonly hasArchiveMetadata?: boolean;
  readonly hardeningUnresolved?: boolean;
  readonly isProjectionLoss?: boolean;
  readonly reportedAsTruthLoss?: boolean;
  readonly isLateData?: boolean;
}

/**
 * Run all 10 purpose invariants against a classification and optional context.
 * Returns an array of check results. Any failures indicate constitutional violations.
 */
export function assertL5PurposeInvariant(
  classification: L5PurposeClassification,
  ctx: InvariantCheckContext = {},
): InvariantCheckResult[] {
  return [
    checkA(classification),
    checkB(classification),
    checkC(classification, ctx.factClass),
    checkD(classification, ctx.hasLineageMetadata),
    checkE(classification),
    checkF(classification, ctx.hasArchiveMetadata),
    checkG(classification, ctx.hardeningUnresolved),
    checkH(classification, ctx.isProjectionLoss, ctx.reportedAsTruthLoss),
    checkI(classification, ctx.isLateData),
    checkJ(classification),
  ];
}

/**
 * Convenience: assert all invariants and throw on first failure.
 */
export function enforceL5PurposeInvariants(
  classification: L5PurposeClassification,
  ctx: InvariantCheckContext = {},
): void {
  const results = assertL5PurposeInvariant(classification, ctx);
  const failures = results.filter(r => !r.passed);
  if (failures.length > 0) {
    const first = failures[0];
    throw new L5PurposeError(
      L5PurposeErrorCode.L5_PURPOSE_FORBIDDEN_ACTION,
      `Invariant ${first.invariantId} violated: ${first.violation}`,
      { failures },
    );
  }
}
