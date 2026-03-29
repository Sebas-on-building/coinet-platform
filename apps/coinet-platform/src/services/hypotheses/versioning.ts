/**
 * Versioning — tracks hypothesis engine configuration versions.
 */

import { HYPOTHESIS_REGISTRY_VERSION } from './registry';

export const HYPOTHESIS_ENGINE_VERSION = '1.0.0' as const;
export const HYPOTHESIS_SCORING_VERSION = '1.0.0' as const;

export interface HypothesisConfigVersions {
  hypothesisRegistryVersion: string;
  hypothesisEngineVersion: string;
  hypothesisScoringVersion: string;
  regimeConfigVersion?: string;
}

export function getConfigVersions(regimeVersion?: string): HypothesisConfigVersions {
  return {
    hypothesisRegistryVersion: HYPOTHESIS_REGISTRY_VERSION,
    hypothesisEngineVersion: HYPOTHESIS_ENGINE_VERSION,
    hypothesisScoringVersion: HYPOTHESIS_SCORING_VERSION,
    regimeConfigVersion: regimeVersion,
  };
}
