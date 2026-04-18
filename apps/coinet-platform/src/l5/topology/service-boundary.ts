/**
 * L5.3 Multi-store Architecture — Service Boundary Enforcement
 *
 * §5.3.10 — Service-to-Store Ownership Boundaries
 *
 * Prevents "just write it directly" culture. No service may have
 * unrestricted write access to all stores unless it is an explicit
 * L5 coordination component.
 */

import { L5StoreKind } from './store-profile';
import { L5TopologyError, L5TopologyErrorCode } from './topology-errors';

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE ROLE
// ═══════════════════════════════════════════════════════════════════════════════

export enum L5ServiceRole {
  /** Repository-level module that writes Postgres authority state. */
  AUTHORITY_REPOSITORY = 'AUTHORITY_REPOSITORY',
  /** Batch writer that writes ClickHouse analytical history. */
  ANALYTICAL_BATCH_WRITER = 'ANALYTICAL_BATCH_WRITER',
  /** Hot-state service that writes Redis ephemeral state. */
  HOT_STATE_SERVICE = 'HOT_STATE_SERVICE',
  /** Archive client that writes object storage evidence. */
  ARCHIVE_CLIENT = 'ARCHIVE_CLIENT',
  /** L5 coordinator with governed multi-store access. */
  L5_COORDINATOR = 'L5_COORDINATOR',
  /** Domain or application service — restricted access only. */
  DOMAIN_SERVICE = 'DOMAIN_SERVICE',
}

export const ALL_SERVICE_ROLES: readonly L5ServiceRole[] = Object.values(L5ServiceRole);

// ═══════════════════════════════════════════════════════════════════════════════
// ALLOWED WRITE ACCESS PER ROLE
// ═══════════════════════════════════════════════════════════════════════════════

const WRITE_ACCESS: Record<L5ServiceRole, readonly L5StoreKind[]> = {
  [L5ServiceRole.AUTHORITY_REPOSITORY]:  [L5StoreKind.POSTGRES],
  [L5ServiceRole.ANALYTICAL_BATCH_WRITER]: [L5StoreKind.CLICKHOUSE],
  [L5ServiceRole.HOT_STATE_SERVICE]:     [L5StoreKind.REDIS],
  [L5ServiceRole.ARCHIVE_CLIENT]:        [L5StoreKind.OBJECT_STORAGE],
  [L5ServiceRole.L5_COORDINATOR]:        [L5StoreKind.POSTGRES, L5StoreKind.CLICKHOUSE, L5StoreKind.REDIS, L5StoreKind.OBJECT_STORAGE],
  [L5ServiceRole.DOMAIN_SERVICE]:        [],
};

export function getAllowedWriteStores(role: L5ServiceRole): readonly L5StoreKind[] {
  return WRITE_ACCESS[role];
}

export function canWrite(role: L5ServiceRole, store: L5StoreKind): boolean {
  return WRITE_ACCESS[role].includes(store);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE REGISTRATION AND ENFORCEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ServiceBoundaryDeclaration {
  readonly serviceId: string;
  readonly role: L5ServiceRole;
  readonly declaredWriteStores: readonly L5StoreKind[];
}

const _services = new Map<string, ServiceBoundaryDeclaration>();

export function registerServiceBoundary(decl: ServiceBoundaryDeclaration): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  const allowed = WRITE_ACCESS[decl.role];

  for (const store of decl.declaredWriteStores) {
    if (!allowed.includes(store)) {
      violations.push(`Service '${decl.serviceId}' with role '${decl.role}' may not write to '${store}'`);
    }
  }

  if (decl.role !== L5ServiceRole.L5_COORDINATOR && decl.declaredWriteStores.length >= 4) {
    violations.push(`Service '${decl.serviceId}' has unrestricted all-store access but is not an L5 coordinator`);
  }

  if (violations.length === 0) {
    _services.set(decl.serviceId, decl);
  }

  return { valid: violations.length === 0, violations };
}

export function assertServiceWriteAccess(serviceId: string, targetStore: L5StoreKind): void {
  const decl = _services.get(serviceId);
  if (!decl) {
    throw new L5TopologyError(
      L5TopologyErrorCode.UNRESTRICTED_STORE_ACCESS,
      `Service '${serviceId}' has no registered boundary declaration`,
      { serviceId, targetStore },
    );
  }
  if (!canWrite(decl.role, targetStore)) {
    throw new L5TopologyError(
      L5TopologyErrorCode.UNRESTRICTED_STORE_ACCESS,
      `Service '${serviceId}' (role '${decl.role}') may not write to '${targetStore}'`,
      { serviceId, role: decl.role, targetStore },
    );
  }
}

export function getServiceBoundary(serviceId: string): ServiceBoundaryDeclaration | undefined {
  return _services.get(serviceId);
}

export function getAllServiceBoundaries(): readonly ServiceBoundaryDeclaration[] {
  return [..._services.values()];
}

export function resetServiceBoundaryRegistry(): void {
  _services.clear();
}
