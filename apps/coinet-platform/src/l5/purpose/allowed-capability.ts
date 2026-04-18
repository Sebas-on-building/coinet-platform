/**
 * L5.1 Purpose — Allowed Capabilities
 *
 * §5.1.4 — Legal Powers of Layer 5
 *
 * These are the only actions Layer 5 is constitutionally permitted to perform.
 * Any L5 module must declare which capabilities it exercises.
 * Architecture tests must verify no L5 module performs unregistered work.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CAPABILITY ENUM
// ═══════════════════════════════════════════════════════════════════════════════

export enum AllowedL5Capability {
  /** Persist outputs from L3, L4, scoring, reporting, alerting, audit. */
  PERSIST_GOVERNED_OUTPUT = 'PERSIST_GOVERNED_OUTPUT',

  /** Persist scores, reports, user settings, watchlists, manifests, operational state. */
  PERSIST_APP_STATE = 'PERSIST_APP_STATE',

  /** Validate write envelopes, assign routing, create manifests, coordinate projection. */
  COORDINATE_CROSS_STORE_WRITE = 'COORDINATE_CROSS_STORE_WRITE',

  /** Create latest-state read models, historical read models, hot caches. */
  MATERIALIZE_READ_PROJECTION = 'MATERIALIZE_READ_PROJECTION',

  /** Enforce state-class routing, idempotency, retention, archive, replay, dedupe law. */
  ENFORCE_STORAGE_LAW = 'ENFORCE_STORAGE_LAW',

  /** Reconstruct point-in-time views, trace lineage, forensic bundles. */
  RECONSTRUCT_HISTORICAL_STATE = 'RECONSTRUCT_HISTORICAL_STATE',

  /** Build forensic trace bundles linking evidence to reports, scores, and decisions. */
  BUILD_FORENSIC_TRACE = 'BUILD_FORENSIC_TRACE',
}

export const ALL_CAPABILITIES: readonly AllowedL5Capability[] = [
  AllowedL5Capability.PERSIST_GOVERNED_OUTPUT,
  AllowedL5Capability.PERSIST_APP_STATE,
  AllowedL5Capability.COORDINATE_CROSS_STORE_WRITE,
  AllowedL5Capability.MATERIALIZE_READ_PROJECTION,
  AllowedL5Capability.ENFORCE_STORAGE_LAW,
  AllowedL5Capability.RECONSTRUCT_HISTORICAL_STATE,
  AllowedL5Capability.BUILD_FORENSIC_TRACE,
];

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface L5ModuleCapabilityDeclaration {
  readonly moduleId: string;
  readonly declaredCapabilities: readonly AllowedL5Capability[];
  readonly registeredAt: string;
}

const _moduleCapabilities = new Map<string, L5ModuleCapabilityDeclaration>();

export function registerL5ModuleCapabilities(decl: L5ModuleCapabilityDeclaration): { success: boolean; error?: string } {
  for (const cap of decl.declaredCapabilities) {
    if (!ALL_CAPABILITIES.includes(cap)) {
      return { success: false, error: `UNKNOWN_CAPABILITY: '${cap}' is not a legal L5 capability` };
    }
  }
  _moduleCapabilities.set(decl.moduleId, decl);
  return { success: true };
}

export function getModuleCapabilities(moduleId: string): L5ModuleCapabilityDeclaration | undefined {
  return _moduleCapabilities.get(moduleId);
}

export function getAllRegisteredModules(): readonly L5ModuleCapabilityDeclaration[] {
  return [..._moduleCapabilities.values()];
}

/**
 * Guard: asserts that a module is performing work within its declared capabilities.
 * Returns null if legal, or an error string describing the violation.
 */
export function assertLayer5Capability(
  moduleId: string,
  requestedCapability: AllowedL5Capability,
): { allowed: boolean; violation?: string } {
  const decl = _moduleCapabilities.get(moduleId);
  if (!decl) {
    return {
      allowed: false,
      violation: `MODULE_UNREGISTERED: '${moduleId}' has not declared any L5 capabilities`,
    };
  }
  if (!decl.declaredCapabilities.includes(requestedCapability)) {
    return {
      allowed: false,
      violation: `CAPABILITY_UNDECLARED: '${moduleId}' did not declare capability '${requestedCapability}'`,
    };
  }
  return { allowed: true };
}

export function resetCapabilityRegistry(): void {
  _moduleCapabilities.clear();
}
