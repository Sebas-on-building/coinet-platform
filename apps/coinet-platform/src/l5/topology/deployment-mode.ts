/**
 * L5.3 Multi-store Architecture — Deployment Modes
 *
 * §5.3.11 — Production Configuration Contract
 */

export enum L5DeploymentMode {
  /** Full four-store reference topology. */
  REFERENCE_PRODUCTION = 'REFERENCE_PRODUCTION',

  /** TimescaleDB replaces ClickHouse for the analytical plane. */
  CONSTRAINED_SINGLE_ANALYTICAL_BACKEND = 'CONSTRAINED_SINGLE_ANALYTICAL_BACKEND',

  /** Local development with potentially in-process substitutes. */
  LOCAL_DEV = 'LOCAL_DEV',
}

export const ALL_DEPLOYMENT_MODES: readonly L5DeploymentMode[] = [
  L5DeploymentMode.REFERENCE_PRODUCTION,
  L5DeploymentMode.CONSTRAINED_SINGLE_ANALYTICAL_BACKEND,
  L5DeploymentMode.LOCAL_DEV,
];

export function isReferenceMode(mode: L5DeploymentMode): boolean {
  return mode === L5DeploymentMode.REFERENCE_PRODUCTION;
}

export function isConstrainedMode(mode: L5DeploymentMode): boolean {
  return mode === L5DeploymentMode.CONSTRAINED_SINGLE_ANALYTICAL_BACKEND;
}

export function isValidDeploymentMode(value: string): value is L5DeploymentMode {
  return ALL_DEPLOYMENT_MODES.includes(value as L5DeploymentMode);
}
