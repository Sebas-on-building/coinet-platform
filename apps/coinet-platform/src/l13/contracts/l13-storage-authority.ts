/**
 * L13.10 — Storage Authority, Mutation, and Materialization Contracts
 *
 * §13.10.4 / §13.10.7 — Closed sets describing where a durable
 * surface lives, how it may be mutated, and how it materializes
 * through Layer 5.
 */

export enum L13StorageAuthorityClass {
  POSTGRES_CURRENT = 'POSTGRES_CURRENT',
  POSTGRES_APPEND_ONLY = 'POSTGRES_APPEND_ONLY',
  OBJECT_STORAGE_IMMUTABLE = 'OBJECT_STORAGE_IMMUTABLE',
  TIME_SERIES_APPEND = 'TIME_SERIES_APPEND',
  AUDIT_APPEND_ONLY = 'AUDIT_APPEND_ONLY',
  REDIS_CACHE_NON_AUTHORITY = 'REDIS_CACHE_NON_AUTHORITY',
}

export const ALL_L13_STORAGE_AUTHORITY_CLASSES:
  readonly L13StorageAuthorityClass[] =
  Object.values(L13StorageAuthorityClass);

export function l13IsAuthorityClass(
  cls: L13StorageAuthorityClass,
): boolean {
  return cls !== L13StorageAuthorityClass.REDIS_CACHE_NON_AUTHORITY;
}

export enum L13MutationDiscipline {
  IMMUTABLE = 'IMMUTABLE',
  APPEND_ONLY = 'APPEND_ONLY',
  SUPERSESSION_SAFE_CURRENT = 'SUPERSESSION_SAFE_CURRENT',
  RECOMPUTABLE_CURRENT = 'RECOMPUTABLE_CURRENT',
}

export const ALL_L13_MUTATION_DISCIPLINES:
  readonly L13MutationDiscipline[] =
  Object.values(L13MutationDiscipline);

export enum L13MaterializationMode {
  DIRECT_ROW = 'DIRECT_ROW',
  POINTER_TO_OBJECT_STORE = 'POINTER_TO_OBJECT_STORE',
  HISTORICAL_FACT_APPEND = 'HISTORICAL_FACT_APPEND',
  AUDIT_EVENT_APPEND = 'AUDIT_EVENT_APPEND',
  CURRENT_REGISTRY_UPSERT = 'CURRENT_REGISTRY_UPSERT',
}

export const ALL_L13_MATERIALIZATION_MODES:
  readonly L13MaterializationMode[] =
  Object.values(L13MaterializationMode);
