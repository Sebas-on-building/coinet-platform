/**
 * L6.3 — Materialization Policy Descriptor
 *
 * §6.3.3.2 (materialization block) / §6.3.7.3 — Every primitive must declare
 * where and how its outputs are persisted via L5. This module classifies L5
 * storage routes per materialization policy and exposes the coverage and
 * freshness-budget classifications the validators use.
 */

import { L6MaterializationPolicy } from './primitive-contract';

export { L6MaterializationPolicy };

export enum L6CoverageRequirementClass {
  FULL = 'FULL',
  MAJORITY = 'MAJORITY',
  MINIMUM = 'MINIMUM',
  OPTIONAL = 'OPTIONAL',
}

export const ALL_COVERAGE_REQUIREMENT_CLASSES: readonly L6CoverageRequirementClass[] =
  Object.values(L6CoverageRequirementClass);

export enum L6FreshnessBudgetClass {
  REALTIME = 'REALTIME',
  NEAR_REALTIME = 'NEAR_REALTIME',
  PERIODIC = 'PERIODIC',
  DAILY = 'DAILY',
  CATALOG = 'CATALOG',
}

export const ALL_FRESHNESS_BUDGET_CLASSES: readonly L6FreshnessBudgetClass[] =
  Object.values(L6FreshnessBudgetClass);

export enum L6MaterializationSink {
  POSTGRES_CURRENT_STATE = 'POSTGRES_CURRENT_STATE',
  CLICKHOUSE_HISTORY = 'CLICKHOUSE_HISTORY',
  CLICKHOUSE_EVENT_INSTANCE = 'CLICKHOUSE_EVENT_INSTANCE',
  OBJECT_STORE_EVIDENCE_PACK = 'OBJECT_STORE_EVIDENCE_PACK',
  REDIS_HOT_FEATURE = 'REDIS_HOT_FEATURE',
  REDIS_HOT_EVENT = 'REDIS_HOT_EVENT',
}

export const ALL_MATERIALIZATION_SINKS: readonly L6MaterializationSink[] =
  Object.values(L6MaterializationSink);

export interface MaterializationPolicyDescriptor {
  readonly policy: L6MaterializationPolicy;
  readonly requiredSinks: readonly L6MaterializationSink[];
  readonly optionalSinks: readonly L6MaterializationSink[];
  readonly replayRequired: true;
  readonly lineageCarryRequired: true;
  readonly manifestBackedRequired: true;
}

export const MATERIALIZATION_POLICY_DESCRIPTORS: Record<L6MaterializationPolicy, MaterializationPolicyDescriptor> = {
  [L6MaterializationPolicy.CURRENT_STATE_AND_HISTORY]: {
    policy: L6MaterializationPolicy.CURRENT_STATE_AND_HISTORY,
    requiredSinks: [
      L6MaterializationSink.POSTGRES_CURRENT_STATE,
      L6MaterializationSink.CLICKHOUSE_HISTORY,
    ],
    optionalSinks: [L6MaterializationSink.REDIS_HOT_FEATURE, L6MaterializationSink.OBJECT_STORE_EVIDENCE_PACK],
    replayRequired: true, lineageCarryRequired: true, manifestBackedRequired: true,
  },
  [L6MaterializationPolicy.HISTORY_ONLY]: {
    policy: L6MaterializationPolicy.HISTORY_ONLY,
    requiredSinks: [L6MaterializationSink.CLICKHOUSE_HISTORY],
    optionalSinks: [L6MaterializationSink.OBJECT_STORE_EVIDENCE_PACK],
    replayRequired: true, lineageCarryRequired: true, manifestBackedRequired: true,
  },
  [L6MaterializationPolicy.INSTANCE_ONLY]: {
    policy: L6MaterializationPolicy.INSTANCE_ONLY,
    requiredSinks: [L6MaterializationSink.CLICKHOUSE_EVENT_INSTANCE],
    optionalSinks: [L6MaterializationSink.OBJECT_STORE_EVIDENCE_PACK, L6MaterializationSink.REDIS_HOT_EVENT],
    replayRequired: true, lineageCarryRequired: true, manifestBackedRequired: true,
  },
  [L6MaterializationPolicy.CURRENT_STATE_AND_INSTANCE]: {
    policy: L6MaterializationPolicy.CURRENT_STATE_AND_INSTANCE,
    requiredSinks: [
      L6MaterializationSink.POSTGRES_CURRENT_STATE,
      L6MaterializationSink.CLICKHOUSE_EVENT_INSTANCE,
    ],
    optionalSinks: [L6MaterializationSink.OBJECT_STORE_EVIDENCE_PACK, L6MaterializationSink.REDIS_HOT_EVENT],
    replayRequired: true, lineageCarryRequired: true, manifestBackedRequired: true,
  },
};

export function getMaterializationDescriptor(
  policy: L6MaterializationPolicy,
): MaterializationPolicyDescriptor | null {
  return MATERIALIZATION_POLICY_DESCRIPTORS[policy] ?? null;
}

export function isValidMaterializationPolicy(policy: string): policy is L6MaterializationPolicy {
  return policy in MATERIALIZATION_POLICY_DESCRIPTORS;
}

export function materializationRequiresCurrentState(policy: L6MaterializationPolicy): boolean {
  const d = MATERIALIZATION_POLICY_DESCRIPTORS[policy];
  return d?.requiredSinks.includes(L6MaterializationSink.POSTGRES_CURRENT_STATE) ?? false;
}

export function materializationRequiresHistory(policy: L6MaterializationPolicy): boolean {
  const d = MATERIALIZATION_POLICY_DESCRIPTORS[policy];
  return d?.requiredSinks.includes(L6MaterializationSink.CLICKHOUSE_HISTORY) ?? false;
}

export function materializationRequiresInstance(policy: L6MaterializationPolicy): boolean {
  const d = MATERIALIZATION_POLICY_DESCRIPTORS[policy];
  return d?.requiredSinks.includes(L6MaterializationSink.CLICKHOUSE_EVENT_INSTANCE) ?? false;
}
