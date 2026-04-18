/**
 * L5.2 Authority Model — Projection Policy
 *
 * §5.2.11 — Projection Law
 *
 * Projections are always downstream of authority. They are idempotent.
 * They must preserve lineage. They may not silently mutate authority
 * semantics. A projection becomes illegal if consumers cannot tell
 * that it is derived, what it derives from, or whether it is lagging.
 */

import { L5AuthorityStore } from './authority-store';
import { L5AuthorityTier, isProjectionTier } from './authority-tier';
import { L5ProjectionCategory } from './projection-category';
import type { L5ProjectionPlan } from './authority-allocation';

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECTION DESCRIPTOR — RUNTIME METADATA FOR ACTIVE PROJECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProjectionDescriptor {
  readonly projectionId: string;
  readonly sourceAuthorityStore: L5AuthorityStore;
  readonly targetStore: L5AuthorityStore;
  readonly category: L5ProjectionCategory;
  readonly tier: L5AuthorityTier;
  readonly datumFamily: string;
  readonly isLagging: boolean;
  readonly lastSyncedAt: string | null;
  readonly lineageRef: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHADOW AUTHORITY DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export type ShadowAuthorityRisk =
  | 'NONE'
  | 'CACHE_AS_TRUTH'
  | 'HISTORY_AS_TRUTH'
  | 'BLOB_AS_STATE'
  | 'PROJECTION_DRIFT'
  | 'PROJECTION_FRESHER_THAN_AUTHORITY';

export interface ShadowAuthorityCheckInput {
  readonly projectionStore: L5AuthorityStore;
  readonly projectionTier: L5AuthorityTier;
  readonly authorityStore: L5AuthorityStore;
  readonly isProjectionFresherThanAuthority: boolean;
  readonly isProjectionUsedAsDirectTruthSource: boolean;
  readonly hasLineageToAuthority: boolean;
  readonly datumFamily: string;
}

export function detectShadowAuthorityRisk(input: ShadowAuthorityCheckInput): ShadowAuthorityRisk {
  if (!isProjectionTier(input.projectionTier)) return 'NONE';

  if (input.isProjectionUsedAsDirectTruthSource) {
    if (input.projectionStore === L5AuthorityStore.REDIS) return 'CACHE_AS_TRUTH';
    if (input.projectionStore === L5AuthorityStore.CLICKHOUSE) return 'HISTORY_AS_TRUTH';
    if (input.projectionStore === L5AuthorityStore.OBJECT_STORAGE) return 'BLOB_AS_STATE';
  }

  if (input.isProjectionFresherThanAuthority) return 'PROJECTION_FRESHER_THAN_AUTHORITY';

  if (!input.hasLineageToAuthority) return 'PROJECTION_DRIFT';

  return 'NONE';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECTION PLAN VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProjectionPlanValidation {
  readonly valid: boolean;
  readonly violations: string[];
}

export function validateProjectionPlan(plan: L5ProjectionPlan, primaryStore: L5AuthorityStore): ProjectionPlanValidation {
  const violations: string[] = [];

  if (plan.store === primaryStore) {
    violations.push(`Projection targets the same store as primary authority ('${primaryStore}')`);
  }

  if (plan.required && !plan.idempotent) {
    violations.push('Required projection must be idempotent');
  }

  if (plan.required && !plan.lineageRequired) {
    violations.push('Required projection must preserve lineage');
  }

  return { valid: violations.length === 0, violations };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECTION REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

const _projections = new Map<string, ProjectionDescriptor>();

export function registerProjection(desc: ProjectionDescriptor): void {
  _projections.set(desc.projectionId, desc);
}

export function getProjection(projectionId: string): ProjectionDescriptor | undefined {
  return _projections.get(projectionId);
}

export function getProjectionsForDatumFamily(datumFamily: string): ProjectionDescriptor[] {
  return [..._projections.values()].filter(p => p.datumFamily === datumFamily);
}

export function resetProjectionRegistry(): void {
  _projections.clear();
}
