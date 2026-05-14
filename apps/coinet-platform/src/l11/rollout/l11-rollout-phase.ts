/**
 * L11.9 — Rollout Phases (§11.9.15.1 / §11.9.15.3)
 */

import { L11CertificationLevel } from '../contracts/l11-ratification-artifact';

export const L11_ROLLOUT_POLICY_VERSION = 'l11.9.rollout.v1';

export enum L11RolloutPhase {
  PRE_ROLLOUT = 'PRE_ROLLOUT',
  SHADOW = 'SHADOW',
  CANARY = 'CANARY',
  PARTIAL_LIVE = 'PARTIAL_LIVE',
  FULL_LIVE = 'FULL_LIVE',
  FROZEN_LIVE = 'FROZEN_LIVE',
}

export const ALL_L11_ROLLOUT_PHASES:
  readonly L11RolloutPhase[] = Object.values(L11RolloutPhase);

export const L11_ROLLOUT_PHASE_ORDER:
  Readonly<Record<L11RolloutPhase, number>> = {
  [L11RolloutPhase.PRE_ROLLOUT]: 0,
  [L11RolloutPhase.SHADOW]: 1,
  [L11RolloutPhase.CANARY]: 2,
  [L11RolloutPhase.PARTIAL_LIVE]: 3,
  [L11RolloutPhase.FULL_LIVE]: 4,
  [L11RolloutPhase.FROZEN_LIVE]: 5,
};

/** Minimum certification level required to enter each phase. */
export const L11_ROLLOUT_PHASE_MIN_CERT_LEVEL:
  Readonly<Record<L11RolloutPhase, L11CertificationLevel>> = {
  [L11RolloutPhase.PRE_ROLLOUT]: L11CertificationLevel.NOT_CERTIFIED,
  [L11RolloutPhase.SHADOW]: L11CertificationLevel.CONSTITUTIONAL_GREEN,
  [L11RolloutPhase.CANARY]: L11CertificationLevel.RUNTIME_GREEN,
  [L11RolloutPhase.PARTIAL_LIVE]: L11CertificationLevel.RUNTIME_GREEN,
  [L11RolloutPhase.FULL_LIVE]: L11CertificationLevel.PERSISTENCE_GREEN,
  [L11RolloutPhase.FROZEN_LIVE]: L11CertificationLevel.PRODUCTION_GREEN,
};

export interface L11RolloutPhaseRequirements {
  readonly phase: L11RolloutPhase;
  readonly description: string;
  readonly required_flags: readonly L11RolloutPhaseFlag[];
}

export enum L11RolloutPhaseFlag {
  CONTRACTS_EXIST = 'CONTRACTS_EXIST',
  INVENTORY_EXISTS = 'INVENTORY_EXISTS',
  MASTER_CERT_RUNNABLE = 'MASTER_CERT_RUNNABLE',
  SCORES_COMPUTED_NON_AUTHORITATIVE = 'SCORES_COMPUTED_NON_AUTHORITATIVE',
  ATTRIBUTION_PRESENT = 'ATTRIBUTION_PRESENT',
  CALIBRATION_HOOKS_GENERATED = 'CALIBRATION_HOOKS_GENERATED',
  PERSISTENCE_TESTED = 'PERSISTENCE_TESTED',
  LIMITED_LIVE_CURRENT_SERVING = 'LIMITED_LIVE_CURRENT_SERVING',
  DOWNSTREAM_READ_SURFACES_TESTED = 'DOWNSTREAM_READ_SURFACES_TESTED',
  REPLAY_PASS_RATE_ABOVE_THRESHOLD = 'REPLAY_PASS_RATE_ABOVE_THRESHOLD',
  NO_CRITICAL_BREACH = 'NO_CRITICAL_BREACH',
  SELECTED_FAMILIES_LIVE = 'SELECTED_FAMILIES_LIVE',
  HISTORICAL_APPEND_GREEN = 'HISTORICAL_APPEND_GREEN',
  READ_SERVICES_STABLE = 'READ_SERVICES_STABLE',
  DRIFT_MONITOR_ACTIVE = 'DRIFT_MONITOR_ACTIVE',
  ALL_EIGHT_FAMILIES_LIVE = 'ALL_EIGHT_FAMILIES_LIVE',
  L12_DEPENDENCY_CONTRACT_ACTIVE = 'L12_DEPENDENCY_CONTRACT_ACTIVE',
  FREEZE_POLICY_ACTIVE = 'FREEZE_POLICY_ACTIVE',
  EXTENSION_POLICY_ACTIVE = 'EXTENSION_POLICY_ACTIVE',
  RATIFICATION_ARTIFACT_EMITTED = 'RATIFICATION_ARTIFACT_EMITTED',
  ARTIFACT_FINGERPRINT_STORED = 'ARTIFACT_FINGERPRINT_STORED',
  L12_DEPENDENCY_DECLARED_SAFE = 'L12_DEPENDENCY_DECLARED_SAFE',
}

export const L11_ROLLOUT_PHASE_REQUIREMENTS:
  Readonly<Record<L11RolloutPhase, L11RolloutPhaseRequirements>> = {
  [L11RolloutPhase.PRE_ROLLOUT]: {
    phase: L11RolloutPhase.PRE_ROLLOUT,
    description: 'closure contracts, inventory, master certification runnable',
    required_flags: [
      L11RolloutPhaseFlag.CONTRACTS_EXIST,
      L11RolloutPhaseFlag.INVENTORY_EXISTS,
      L11RolloutPhaseFlag.MASTER_CERT_RUNNABLE,
    ],
  },
  [L11RolloutPhase.SHADOW]: {
    phase: L11RolloutPhase.SHADOW,
    description: 'scores computed but not authoritative; full sidecar wiring',
    required_flags: [
      L11RolloutPhaseFlag.SCORES_COMPUTED_NON_AUTHORITATIVE,
      L11RolloutPhaseFlag.ATTRIBUTION_PRESENT,
      L11RolloutPhaseFlag.CALIBRATION_HOOKS_GENERATED,
      L11RolloutPhaseFlag.PERSISTENCE_TESTED,
    ],
  },
  [L11RolloutPhase.CANARY]: {
    phase: L11RolloutPhase.CANARY,
    description: 'limited live serving with full attribution and read surfaces',
    required_flags: [
      L11RolloutPhaseFlag.LIMITED_LIVE_CURRENT_SERVING,
      L11RolloutPhaseFlag.DOWNSTREAM_READ_SURFACES_TESTED,
      L11RolloutPhaseFlag.REPLAY_PASS_RATE_ABOVE_THRESHOLD,
      L11RolloutPhaseFlag.NO_CRITICAL_BREACH,
    ],
  },
  [L11RolloutPhase.PARTIAL_LIVE]: {
    phase: L11RolloutPhase.PARTIAL_LIVE,
    description: 'selected score families live; drift monitoring active',
    required_flags: [
      L11RolloutPhaseFlag.SELECTED_FAMILIES_LIVE,
      L11RolloutPhaseFlag.HISTORICAL_APPEND_GREEN,
      L11RolloutPhaseFlag.READ_SERVICES_STABLE,
      L11RolloutPhaseFlag.DRIFT_MONITOR_ACTIVE,
    ],
  },
  [L11RolloutPhase.FULL_LIVE]: {
    phase: L11RolloutPhase.FULL_LIVE,
    description: 'all 8 production families live with active L12 contract',
    required_flags: [
      L11RolloutPhaseFlag.ALL_EIGHT_FAMILIES_LIVE,
      L11RolloutPhaseFlag.L12_DEPENDENCY_CONTRACT_ACTIVE,
    ],
  },
  [L11RolloutPhase.FROZEN_LIVE]: {
    phase: L11RolloutPhase.FROZEN_LIVE,
    description: 'freeze active, ratification artifact stored, L12+ safe',
    required_flags: [
      L11RolloutPhaseFlag.FREEZE_POLICY_ACTIVE,
      L11RolloutPhaseFlag.EXTENSION_POLICY_ACTIVE,
      L11RolloutPhaseFlag.RATIFICATION_ARTIFACT_EMITTED,
      L11RolloutPhaseFlag.ARTIFACT_FINGERPRINT_STORED,
      L11RolloutPhaseFlag.L12_DEPENDENCY_DECLARED_SAFE,
    ],
  },
};
