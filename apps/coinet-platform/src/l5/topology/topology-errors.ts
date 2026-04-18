/**
 * L5.3 Multi-store Architecture — Error Codes
 *
 * Every error encodes a specific topology violation.
 */

export enum L5TopologyErrorCode {
  /** Reference mode missing a required store kind. */
  MISSING_STORE_KIND = 'L5_TOPOLOGY_MISSING_STORE_KIND',

  /** A store kind was assigned to the wrong architectural plane. */
  ILLEGAL_PLANE_ASSIGNMENT = 'L5_TOPOLOGY_ILLEGAL_PLANE_ASSIGNMENT',

  /** Interaction between two stores is constitutionally illegal. */
  ILLEGAL_STORE_INTERACTION = 'L5_TOPOLOGY_ILLEGAL_STORE_INTERACTION',

  /** A service has unrestricted direct access to all stores. */
  UNRESTRICTED_STORE_ACCESS = 'L5_TOPOLOGY_UNRESTRICTED_STORE_ACCESS',

  /** Namespace policy missing for a store before production boot. */
  NAMESPACE_POLICY_MISSING = 'L5_TOPOLOGY_NAMESPACE_POLICY_MISSING',

  /** Deployment mode is unrecognized. */
  ILLEGAL_DEPLOYMENT_MODE = 'L5_TOPOLOGY_ILLEGAL_DEPLOYMENT_MODE',

  /** Reference mode silently degraded to constrained. */
  SILENT_MODE_DOWNGRADE = 'L5_TOPOLOGY_SILENT_MODE_DOWNGRADE',

  /** Store assigned data classes forbidden by its topology profile. */
  FORBIDDEN_DATA_CLASS = 'L5_TOPOLOGY_FORBIDDEN_DATA_CLASS',

  /** Constrained variant violates constitutional storage law. */
  CONSTRAINED_VARIANT_VIOLATION = 'L5_TOPOLOGY_CONSTRAINED_VARIANT_VIOLATION',

  /** Required configuration key missing at boot. */
  CONFIG_MISSING = 'L5_TOPOLOGY_CONFIG_MISSING',

  /** Storage plane not covered by any store in the topology. */
  UNCOVERED_PLANE = 'L5_TOPOLOGY_UNCOVERED_PLANE',

  /** Topology change attempts to alter constitutional storage law. */
  CONSTITUTIONAL_LAW_VIOLATION = 'L5_TOPOLOGY_CONSTITUTIONAL_LAW_VIOLATION',
}

export class L5TopologyError extends Error {
  public readonly code: L5TopologyErrorCode;
  public readonly details: Record<string, unknown>;

  constructor(code: L5TopologyErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(`[${code}] ${message}`);
    this.name = 'L5TopologyError';
    this.code = code;
    this.details = details;
  }
}
