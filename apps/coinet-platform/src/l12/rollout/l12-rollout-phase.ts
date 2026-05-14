/**
 * L12.7 — Rollout Phases (§12.7.12)
 */

import { L12CertificationLevel } from '../certification/l12-certification-level';

export const L12_ROLLOUT_POLICY_VERSION = 'l12.7.rollout.v1';

export enum L12RolloutPhase {
  PRE_ROLLOUT = 'PRE_ROLLOUT',
  SHADOW = 'SHADOW',
  CANARY = 'CANARY',
  PARTIAL_LIVE = 'PARTIAL_LIVE',
  FULL_LIVE = 'FULL_LIVE',
  FROZEN_LIVE = 'FROZEN_LIVE',
}

export const ALL_L12_ROLLOUT_PHASES:
  readonly L12RolloutPhase[] = Object.values(L12RolloutPhase);

export const L12_ROLLOUT_PHASE_ORDER:
  Readonly<Record<L12RolloutPhase, number>> = {
  [L12RolloutPhase.PRE_ROLLOUT]: 0,
  [L12RolloutPhase.SHADOW]: 1,
  [L12RolloutPhase.CANARY]: 2,
  [L12RolloutPhase.PARTIAL_LIVE]: 3,
  [L12RolloutPhase.FULL_LIVE]: 4,
  [L12RolloutPhase.FROZEN_LIVE]: 5,
};

/** Minimum certification level required to enter each rollout phase. */
export const L12_ROLLOUT_PHASE_MIN_CERT_LEVEL:
  Readonly<Record<L12RolloutPhase, L12CertificationLevel>> = {
  [L12RolloutPhase.PRE_ROLLOUT]: L12CertificationLevel.NOT_CERTIFIED,
  [L12RolloutPhase.SHADOW]: L12CertificationLevel.CONTRACT_ONLY,
  [L12RolloutPhase.CANARY]: L12CertificationLevel.RUNTIME_GREEN,
  [L12RolloutPhase.PARTIAL_LIVE]: L12CertificationLevel.PERSISTENCE_GREEN,
  [L12RolloutPhase.FULL_LIVE]: L12CertificationLevel.PRODUCTION_GREEN,
  [L12RolloutPhase.FROZEN_LIVE]: L12CertificationLevel.PRODUCTION_GREEN,
};

/** §12.7.12 — required gate flags per phase. */
export enum L12RolloutPhaseFlag {
  CONTRACTS_EXIST = 'CONTRACTS_EXIST',
  OBJECTS_EXIST = 'OBJECTS_EXIST',
  RUNTIME_DAG_GREEN = 'RUNTIME_DAG_GREEN',
  TEMPLATES_GREEN = 'TEMPLATES_GREEN',
  PERSISTENCE_GREEN = 'PERSISTENCE_GREEN',
  READ_SURFACES_GREEN = 'READ_SURFACES_GREEN',
  REPLAY_REPAIR_GREEN = 'REPLAY_REPAIR_GREEN',
  NO_CONSTITUTIONAL_BREACH = 'NO_CONSTITUTIONAL_BREACH',
  NO_PREDICTION_THEATER_BREACH = 'NO_PREDICTION_THEATER_BREACH',
  NO_RECOMMENDATION_LEAK = 'NO_RECOMMENDATION_LEAK',
  NO_FINAL_JUDGMENT_LEAK = 'NO_FINAL_JUDGMENT_LEAK',
  NO_CRITICAL_BREACH = 'NO_CRITICAL_BREACH',
  L11_SCORE_CONTEXT_GREEN = 'L11_SCORE_CONTEXT_GREEN',
  MASTER_CERT_RUNNABLE = 'MASTER_CERT_RUNNABLE',
  MASTER_CERT_GREEN = 'MASTER_CERT_GREEN',
  L13_HANDOFF_APPROVED = 'L13_HANDOFF_APPROVED',
  RATIFICATION_ARTIFACT_EMITTED = 'RATIFICATION_ARTIFACT_EMITTED',
  COMBINED_FINGERPRINT_STABLE = 'COMBINED_FINGERPRINT_STABLE',
  FREEZE_ACTIVATED = 'FREEZE_ACTIVATED',
  ROLLBACK_POLICY_ACTIVE = 'ROLLBACK_POLICY_ACTIVE',
}

export interface L12RolloutPhaseRequirements {
  readonly phase: L12RolloutPhase;
  readonly description: string;
  readonly required_flags: readonly L12RolloutPhaseFlag[];
}

export const L12_ROLLOUT_PHASE_REQUIREMENTS:
  Readonly<Record<L12RolloutPhase, L12RolloutPhaseRequirements>> = {
  [L12RolloutPhase.PRE_ROLLOUT]: {
    phase: L12RolloutPhase.PRE_ROLLOUT,
    description: 'closure contracts, runner exists, no critical breach',
    required_flags: [
      L12RolloutPhaseFlag.CONTRACTS_EXIST,
      L12RolloutPhaseFlag.OBJECTS_EXIST,
      L12RolloutPhaseFlag.MASTER_CERT_RUNNABLE,
    ],
  },
  [L12RolloutPhase.SHADOW]: {
    phase: L12RolloutPhase.SHADOW,
    description: 'L12.1–L12.3 green; constitutional surface clean',
    required_flags: [
      L12RolloutPhaseFlag.CONTRACTS_EXIST,
      L12RolloutPhaseFlag.OBJECTS_EXIST,
      L12RolloutPhaseFlag.NO_CONSTITUTIONAL_BREACH,
    ],
  },
  [L12RolloutPhase.CANARY]: {
    phase: L12RolloutPhase.CANARY,
    description: 'runtime + templates green; no prediction/recommendation leak',
    required_flags: [
      L12RolloutPhaseFlag.RUNTIME_DAG_GREEN,
      L12RolloutPhaseFlag.TEMPLATES_GREEN,
      L12RolloutPhaseFlag.NO_PREDICTION_THEATER_BREACH,
      L12RolloutPhaseFlag.NO_RECOMMENDATION_LEAK,
    ],
  },
  [L12RolloutPhase.PARTIAL_LIVE]: {
    phase: L12RolloutPhase.PARTIAL_LIVE,
    description: 'persistence + read surfaces + replay/repair green',
    required_flags: [
      L12RolloutPhaseFlag.PERSISTENCE_GREEN,
      L12RolloutPhaseFlag.READ_SURFACES_GREEN,
      L12RolloutPhaseFlag.REPLAY_REPAIR_GREEN,
      L12RolloutPhaseFlag.L11_SCORE_CONTEXT_GREEN,
    ],
  },
  [L12RolloutPhase.FULL_LIVE]: {
    phase: L12RolloutPhase.FULL_LIVE,
    description: 'master cert green; zero critical breaches; L13 approved',
    required_flags: [
      L12RolloutPhaseFlag.MASTER_CERT_GREEN,
      L12RolloutPhaseFlag.NO_CRITICAL_BREACH,
      L12RolloutPhaseFlag.NO_FINAL_JUDGMENT_LEAK,
      L12RolloutPhaseFlag.L13_HANDOFF_APPROVED,
    ],
  },
  [L12RolloutPhase.FROZEN_LIVE]: {
    phase: L12RolloutPhase.FROZEN_LIVE,
    description: 'ratification artifact emitted; freeze active; fingerprint stable',
    required_flags: [
      L12RolloutPhaseFlag.RATIFICATION_ARTIFACT_EMITTED,
      L12RolloutPhaseFlag.FREEZE_ACTIVATED,
      L12RolloutPhaseFlag.COMBINED_FINGERPRINT_STABLE,
      L12RolloutPhaseFlag.ROLLBACK_POLICY_ACTIVE,
    ],
  },
};
