/**
 * L5.7 Assurance — Replay Fidelity Levels
 *
 * §5.7.4.4 — RPL-1/2/3
 */

export enum L5ReplayFidelity {
  STRUCTURAL = 'STRUCTURAL',
  ANALYTICAL = 'ANALYTICAL',
  FORENSIC = 'FORENSIC',
}

export const ALL_REPLAY_FIDELITIES: readonly L5ReplayFidelity[] = Object.values(L5ReplayFidelity);

export interface ReplayFidelityRequirement {
  readonly fidelity: L5ReplayFidelity;
  readonly requiresManifest: boolean;
  readonly requiresEnvelope: boolean;
  readonly requiresProjections: boolean;
  readonly requiresArchivePointers: boolean;
  readonly requiresLifecycleHistory: boolean;
  readonly requiresAnalyticalRows: boolean;
  readonly requiresFeatureHistories: boolean;
  readonly requiresScoreHistories: boolean;
  readonly requiresRawArchive: boolean;
  readonly requiresNormalizedEnvelope: boolean;
  readonly requiresTransitionHistory: boolean;
  readonly requiresAuditEvents: boolean;
  readonly requiresBundleLineage: boolean;
  readonly requiresRepairHistory: boolean;
}

export const FIDELITY_REQUIREMENTS: Record<L5ReplayFidelity, ReplayFidelityRequirement> = {
  [L5ReplayFidelity.STRUCTURAL]: {
    fidelity: L5ReplayFidelity.STRUCTURAL,
    requiresManifest: true, requiresEnvelope: true, requiresProjections: true,
    requiresArchivePointers: true, requiresLifecycleHistory: true,
    requiresAnalyticalRows: false, requiresFeatureHistories: false, requiresScoreHistories: false,
    requiresRawArchive: false, requiresNormalizedEnvelope: false,
    requiresTransitionHistory: false, requiresAuditEvents: false,
    requiresBundleLineage: false, requiresRepairHistory: false,
  },
  [L5ReplayFidelity.ANALYTICAL]: {
    fidelity: L5ReplayFidelity.ANALYTICAL,
    requiresManifest: true, requiresEnvelope: true, requiresProjections: true,
    requiresArchivePointers: true, requiresLifecycleHistory: true,
    requiresAnalyticalRows: true, requiresFeatureHistories: true, requiresScoreHistories: true,
    requiresRawArchive: false, requiresNormalizedEnvelope: false,
    requiresTransitionHistory: false, requiresAuditEvents: false,
    requiresBundleLineage: false, requiresRepairHistory: false,
  },
  [L5ReplayFidelity.FORENSIC]: {
    fidelity: L5ReplayFidelity.FORENSIC,
    requiresManifest: true, requiresEnvelope: true, requiresProjections: true,
    requiresArchivePointers: true, requiresLifecycleHistory: true,
    requiresAnalyticalRows: true, requiresFeatureHistories: true, requiresScoreHistories: true,
    requiresRawArchive: true, requiresNormalizedEnvelope: true,
    requiresTransitionHistory: true, requiresAuditEvents: true,
    requiresBundleLineage: true, requiresRepairHistory: true,
  },
};

export function getFidelityRequirements(f: L5ReplayFidelity): ReplayFidelityRequirement {
  return FIDELITY_REQUIREMENTS[f];
}
