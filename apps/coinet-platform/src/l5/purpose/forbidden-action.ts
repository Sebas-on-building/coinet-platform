/**
 * L5.1 Purpose — Forbidden Actions
 *
 * §5.1.5 — Forbidden Powers of Layer 5
 *
 * These actions are constitutionally illegal inside Layer 5.
 * The purpose of codifying them as an enum is to make policy
 * checks machine-executable, not just documentation.
 */

import { L5PurposeError, L5PurposeErrorCode } from './purpose-errors';

// ═══════════════════════════════════════════════════════════════════════════════
// FORBIDDEN ACTION ENUM
// ═══════════════════════════════════════════════════════════════════════════════

export enum ForbiddenL5Action {
  /** L5 may not invent canonical identity when L3 has not resolved it. */
  INVENT_CANONICAL_IDENTITY = 'INVENT_CANONICAL_IDENTITY',

  /** L5 may not reinterpret or override confidence rights from L3. */
  REINTERPRET_CONFIDENCE = 'REINTERPRET_CONFIDENCE',

  /** L5 may not decide that one provider field "is close enough" to a metric contract. */
  REDEFINE_METRIC_MEANING = 'REDEFINE_METRIC_MEANING',

  /** L5 may not decide edge legality, propagation meaning, or admissibility law. */
  REDEFINE_GRAPH_SEMANTICS = 'REDEFINE_GRAPH_SEMANTICS',

  /** L5 may not silently promote UNRESOLVED/CONTESTED to RESOLVED. */
  UPGRADE_UNRESOLVED_SILENTLY = 'UPGRADE_UNRESOLVED_SILENTLY',

  /** Provider labels, ids, symbols, slugs are proposals, not internal truth. */
  ACCEPT_PROVIDER_NATIVE_AS_TRUTH = 'ACCEPT_PROVIDER_NATIVE_AS_TRUTH',

  /** No read model, cache, or projection may become an undeclared authority surface. */
  CREATE_SHADOW_AUTHORITY = 'CREATE_SHADOW_AUTHORITY',

  /** L5 may degrade but may not conceal loss of evidence, archive, or projection lineage. */
  HIDE_FAILURE_WITH_FALLBACK = 'HIDE_FAILURE_WITH_FALLBACK',
}

export const ALL_FORBIDDEN_ACTIONS: readonly ForbiddenL5Action[] = [
  ForbiddenL5Action.INVENT_CANONICAL_IDENTITY,
  ForbiddenL5Action.REINTERPRET_CONFIDENCE,
  ForbiddenL5Action.REDEFINE_METRIC_MEANING,
  ForbiddenL5Action.REDEFINE_GRAPH_SEMANTICS,
  ForbiddenL5Action.UPGRADE_UNRESOLVED_SILENTLY,
  ForbiddenL5Action.ACCEPT_PROVIDER_NATIVE_AS_TRUTH,
  ForbiddenL5Action.CREATE_SHADOW_AUTHORITY,
  ForbiddenL5Action.HIDE_FAILURE_WITH_FALLBACK,
];

// ═══════════════════════════════════════════════════════════════════════════════
// FORBIDDEN ACTION DETECTION SIGNATURES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Describes a detected or suspected forbidden action attempt.
 * These objects are produced by policy checks, not by the
 * violating code itself.
 */
export interface ForbiddenActionSignal {
  readonly action: ForbiddenL5Action;
  readonly moduleId: string;
  readonly description: string;
  readonly severity: 'BLOCK' | 'WARN';
  readonly detectedAt: string;
  readonly metadata: Record<string, unknown>;
}

const _forbiddenActionLog: ForbiddenActionSignal[] = [];

/**
 * Record a forbidden action signal. BLOCK-severity signals are
 * additionally thrown as L5PurposeError so they cannot be ignored.
 */
export function reportForbiddenAction(signal: ForbiddenActionSignal): void {
  _forbiddenActionLog.push(signal);
  if (signal.severity === 'BLOCK') {
    throw new L5PurposeError(
      L5PurposeErrorCode.L5_PURPOSE_FORBIDDEN_ACTION,
      `Forbidden L5 action: ${signal.action} by module '${signal.moduleId}' — ${signal.description}`,
      { signal },
    );
  }
}

export function getForbiddenActionLog(): readonly ForbiddenActionSignal[] {
  return [..._forbiddenActionLog];
}

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

export interface WriteIntentSignals {
  /** Does this write create or modify canonical identity without L3 backing? */
  readonly inventsCanonicalIdentity?: boolean;
  /** Does this write override confidence bands or rights profiles? */
  readonly overridesConfidenceRights?: boolean;
  /** Does this write remap metric semantics outside L3 contracts? */
  readonly redefinesMetricMeaning?: boolean;
  /** Does this write change graph edge legality or admissibility? */
  readonly redefinesGraphSemantics?: boolean;
  /** Does this write promote UNRESOLVED/CONTESTED/SCARRED to RESOLVED without L3 event? */
  readonly upgradesUnresolvedSilently?: boolean;
  /** Does this write treat provider-native identifiers as authoritative internal IDs? */
  readonly usesProviderNativeAsTruth?: boolean;
  /** Does this write establish a read surface as undeclared authority? */
  readonly createsShadowAuthority?: boolean;
  /** Does this write conceal a failure through silent fallback? */
  readonly hidesFailure?: boolean;
}

/**
 * Checks a write intent against all forbidden action policies.
 * Returns detected violations. Empty array means clean.
 */
export function assertNoForbiddenL5Action(
  moduleId: string,
  signals: WriteIntentSignals,
): ForbiddenActionSignal[] {
  const now = new Date().toISOString();
  const violations: ForbiddenActionSignal[] = [];

  const checks: Array<{ flag: boolean | undefined; action: ForbiddenL5Action; desc: string }> = [
    { flag: signals.inventsCanonicalIdentity, action: ForbiddenL5Action.INVENT_CANONICAL_IDENTITY, desc: 'Write invents canonical identity without L3 resolution' },
    { flag: signals.overridesConfidenceRights, action: ForbiddenL5Action.REINTERPRET_CONFIDENCE, desc: 'Write overrides confidence rights from lower-layer law' },
    { flag: signals.redefinesMetricMeaning, action: ForbiddenL5Action.REDEFINE_METRIC_MEANING, desc: 'Write redefines metric meaning outside L3 contracts' },
    { flag: signals.redefinesGraphSemantics, action: ForbiddenL5Action.REDEFINE_GRAPH_SEMANTICS, desc: 'Write redefines graph edge legality or admissibility' },
    { flag: signals.upgradesUnresolvedSilently, action: ForbiddenL5Action.UPGRADE_UNRESOLVED_SILENTLY, desc: 'Write silently promotes unresolved to resolved' },
    { flag: signals.usesProviderNativeAsTruth, action: ForbiddenL5Action.ACCEPT_PROVIDER_NATIVE_AS_TRUTH, desc: 'Write treats provider-native ID as internal truth' },
    { flag: signals.createsShadowAuthority, action: ForbiddenL5Action.CREATE_SHADOW_AUTHORITY, desc: 'Write creates undeclared authority surface' },
    { flag: signals.hidesFailure, action: ForbiddenL5Action.HIDE_FAILURE_WITH_FALLBACK, desc: 'Write conceals failure through silent fallback' },
  ];

  for (const c of checks) {
    if (c.flag === true) {
      violations.push({
        action: c.action,
        moduleId,
        description: c.desc,
        severity: 'BLOCK',
        detectedAt: now,
        metadata: {},
      });
    }
  }

  return violations;
}

export function resetForbiddenActionLog(): void {
  _forbiddenActionLog.length = 0;
}
