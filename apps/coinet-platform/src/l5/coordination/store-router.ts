/**
 * L5.5 Write Coordination — Store Router
 *
 * §5.5.5.5 — StoreRouter
 *
 * Determines execution branches from resolved envelope.
 */

import { L5ExecutionMode } from './coordination-state';
import type { ResolvedStorageEnvelope } from '../envelope';
import { L5WriteClass } from '../envelope';

export interface StoreRoutingDecision {
  readonly executionMode: L5ExecutionMode;
  readonly primaryAuthorityStore: string;
  readonly archiveFirst: boolean;
  readonly requiresManifest: boolean;
  readonly requiredProjectionStores: readonly string[];
  readonly optionalProjectionStores: readonly string[];
}

const ARCHIVE_FIRST_CLASSES: readonly string[] = [
  L5WriteClass.IMMUTABLE_ARCHIVE,
];

export function routeEnvelope(env: ResolvedStorageEnvelope): StoreRoutingDecision {
  const routing = env.routing;
  const archiveFirst = ARCHIVE_FIRST_CLASSES.includes(env.write_class) || (env.archive_required && routing.primary_authority_store === 'OBJECT_STORAGE');

  return {
    executionMode: archiveFirst ? L5ExecutionMode.ARCHIVE_FIRST : L5ExecutionMode.AUTHORITY_TX_FIRST,
    primaryAuthorityStore: routing.primary_authority_store,
    archiveFirst,
    requiresManifest: routing.manifest_required,
    requiredProjectionStores: routing.required_projection_plan,
    optionalProjectionStores: routing.optional_projection_plan,
  };
}

export function isArchiveFirstRequired(writeClass: L5WriteClass, archiveRequired: boolean): boolean {
  return ARCHIVE_FIRST_CLASSES.includes(writeClass) || (archiveRequired && writeClass === L5WriteClass.IMMUTABLE_ARCHIVE);
}
