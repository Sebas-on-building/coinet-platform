/**
 * L6.1 — Mission Contract
 *
 * §6.1.2 — Layer 6 constructs replay-safe, deterministic features and events
 * from governed lower-layer state.
 */

import { L6PrimitiveClass, L6OutputSurfaceClass, L6DependencyLayer, L6AllowedCapability } from './l6-constitutional-types';

export const L6_MISSION = {
  name: 'Layer 6 — Feature & Event Engine',
  canonical: 'Layer 6 constructs replay-safe, deterministic features and events from governed lower-layer state.',
  intelligenceBoundary: 'Facts are not intelligence yet. Features and events are the first governed intelligence primitives.',
  frozenDependencies: [L6DependencyLayer.L3, L6DependencyLayer.L4, L6DependencyLayer.L5] as const,
  primitiveClasses: [L6PrimitiveClass.FEATURE, L6PrimitiveClass.EVENT] as const,
  outputClasses: [
    L6OutputSurfaceClass.FEATURE_HISTORY_FACT,
    L6OutputSurfaceClass.CURRENT_FEATURE_STATE,
    L6OutputSurfaceClass.EVENT_INSTANCE,
    L6OutputSurfaceClass.EVIDENCE_PACK,
  ] as const,
} as const;

export interface L6MissionConstraint {
  readonly allowedOutputClasses: readonly L6OutputSurfaceClass[];
  readonly forbiddenOutputClasses: readonly string[];
  readonly allowedDependencySources: readonly L6DependencyLayer[];
  readonly allowedCapabilities: readonly L6AllowedCapability[];
  readonly replayCompatibilityRequired: boolean;
  readonly storageRoutingRequired: boolean;
}

export const L6_MISSION_CONSTRAINT: L6MissionConstraint = {
  allowedOutputClasses: [...L6_MISSION.outputClasses],
  forbiddenOutputClasses: [
    'DASHBOARD_VIEW', 'REPORT_RENDER', 'SCORE_JUDGMENT', 'SCENARIO_CONCLUSION',
    'RECOMMENDATION', 'THESIS_CONFIRMATION', 'TRADE_SIGNAL',
  ],
  allowedDependencySources: [...L6_MISSION.frozenDependencies],
  allowedCapabilities: [...Object.values(L6AllowedCapability)],
  replayCompatibilityRequired: true,
  storageRoutingRequired: true,
};

export function isLegalOutputClass(cls: string): boolean {
  return (L6_MISSION_CONSTRAINT.allowedOutputClasses as readonly string[]).includes(cls);
}

export function isForbiddenOutputClass(cls: string): boolean {
  return L6_MISSION_CONSTRAINT.forbiddenOutputClasses.includes(cls);
}

export function matchesMission(description: string): boolean {
  const lower = description.toLowerCase();
  const hasPrimitiveWork = lower.includes('feature') || lower.includes('event') || lower.includes('evidence') || lower.includes('primitive');
  const hasJudgment = lower.includes('recommendation') || lower.includes('score judgment') || lower.includes('scenario conclusion') || lower.includes('trade signal');
  return hasPrimitiveWork && !hasJudgment;
}
