/**
 * L6.4 — DAG Node
 *
 * §6.4.2.3 — Canonical node classes. Layer 6's DAG is composed of these
 * classes only; any helper that runs outside of a registered node class
 * is illegal at runtime.
 */

import { L6ScopeType } from '../contracts/primitive-contract';

export enum L6DagNodeClass {
  INPUT = 'INPUT',
  PRIMITIVE_FEATURE = 'PRIMITIVE_FEATURE',
  COMPOSITE_FEATURE = 'COMPOSITE_FEATURE',
  CHANGE_DETECTION = 'CHANGE_DETECTION',
  EVENT_CANDIDATE = 'EVENT_CANDIDATE',
  EVENT_LIFECYCLE = 'EVENT_LIFECYCLE',
  EVIDENCE_PACK = 'EVIDENCE_PACK',
  MATERIALIZATION = 'MATERIALIZATION',
}

export const ALL_DAG_NODE_CLASSES: readonly L6DagNodeClass[] = Object.values(L6DagNodeClass);

export enum L6NodeExecutionState {
  PENDING = 'PENDING',
  READY = 'READY',
  RUNNING = 'RUNNING',
  RESOLVED = 'RESOLVED',
  DEFERRED = 'DEFERRED',
  BLOCKED = 'BLOCKED',
  DEGRADED = 'DEGRADED',
  PROVISIONAL = 'PROVISIONAL',
  SKIPPED = 'SKIPPED',
  FAILED = 'FAILED',
}

export const NODE_TERMINAL_STATES: readonly L6NodeExecutionState[] = [
  L6NodeExecutionState.RESOLVED,
  L6NodeExecutionState.DEFERRED,
  L6NodeExecutionState.BLOCKED,
  L6NodeExecutionState.DEGRADED,
  L6NodeExecutionState.PROVISIONAL,
  L6NodeExecutionState.SKIPPED,
  L6NodeExecutionState.FAILED,
];

export interface L6ScopeRef {
  readonly scope_type: L6ScopeType;
  readonly scope_id: string;
}

export interface L6DagNode {
  readonly node_id: string;
  readonly node_class: L6DagNodeClass;
  readonly primitive_id: string | null;
  readonly primitive_version: string | null;
  readonly scope: L6ScopeRef | null;
  readonly upstream: readonly string[];
  readonly downstream: readonly string[];
  readonly execution_state: L6NodeExecutionState;
  readonly meta: Readonly<Record<string, unknown>>;
}

export function isFeatureNodeClass(cls: L6DagNodeClass): boolean {
  return cls === L6DagNodeClass.PRIMITIVE_FEATURE
    || cls === L6DagNodeClass.COMPOSITE_FEATURE;
}

export function isEventNodeClass(cls: L6DagNodeClass): boolean {
  return cls === L6DagNodeClass.EVENT_CANDIDATE
    || cls === L6DagNodeClass.EVENT_LIFECYCLE;
}

export function canonicalNodeId(
  nodeClass: L6DagNodeClass,
  primitiveId: string | null,
  scope: L6ScopeRef | null,
  suffix?: string,
): string {
  const scopePart = scope ? `${scope.scope_type}:${scope.scope_id}` : 'GLOBAL';
  const pidPart = primitiveId ?? '_';
  const suffixPart = suffix ? `:${suffix}` : '';
  return `${nodeClass}|${pidPart}|${scopePart}${suffixPart}`;
}

export function isNodeTerminal(state: L6NodeExecutionState): boolean {
  return NODE_TERMINAL_STATES.includes(state);
}
