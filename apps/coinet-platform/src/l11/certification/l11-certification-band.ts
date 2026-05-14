/**
 * L11.9 — Certification Bands (§11.9.12)
 *
 * Ten certification bands (A–J) that together prove Layer 11 is
 * production-green. Each band declares its source sublayers; the
 * master certification orchestrator only checks that the relevant
 * suites green-pass — it does not duplicate per-band logic.
 */

import { L11SublayerId } from '../contracts/l11-layer-inventory';

export enum L11CertificationBand {
  A_SCORE_DOCTRINE_AND_CONTRACTS = 'A_SCORE_DOCTRINE_AND_CONTRACTS',
  B_FORMULA_DETERMINISM = 'B_FORMULA_DETERMINISM',
  C_ATTRIBUTION = 'C_ATTRIBUTION',
  D_MISSING_DATA_AND_REGIME_MODIFIERS = 'D_MISSING_DATA_AND_REGIME_MODIFIERS',
  E_CALIBRATION_HOOKS = 'E_CALIBRATION_HOOKS',
  F_DRIFT_AND_THRESHOLD_GOVERNANCE = 'F_DRIFT_AND_THRESHOLD_GOVERNANCE',
  G_PERSISTENCE_REPLAY_REPAIR = 'G_PERSISTENCE_REPLAY_REPAIR',
  H_CROSS_LAYER_REGRESSION = 'H_CROSS_LAYER_REGRESSION',
  I_ROLLOUT_AND_ROLLBACK_GOVERNANCE = 'I_ROLLOUT_AND_ROLLBACK_GOVERNANCE',
  J_MASTER_ARTIFACT = 'J_MASTER_ARTIFACT',
}

export const ALL_L11_CERTIFICATION_BANDS:
  readonly L11CertificationBand[] = Object.values(L11CertificationBand);

export interface L11CertificationBandDefinition {
  readonly band_id: L11CertificationBand;
  readonly title: string;
  readonly source_sublayers: readonly L11SublayerId[];
}

export const L11_CERTIFICATION_BAND_REGISTRY:
  Readonly<Record<L11CertificationBand, L11CertificationBandDefinition>> = {
  [L11CertificationBand.A_SCORE_DOCTRINE_AND_CONTRACTS]: {
    band_id: L11CertificationBand.A_SCORE_DOCTRINE_AND_CONTRACTS,
    title: 'Score doctrine and contracts (L11.1 + L11.2)',
    source_sublayers: [
      L11SublayerId.L11_1_CONSTITUTION,
      L11SublayerId.L11_2_SCORE_DOCTRINE,
    ],
  },
  [L11CertificationBand.B_FORMULA_DETERMINISM]: {
    band_id: L11CertificationBand.B_FORMULA_DETERMINISM,
    title: 'Formula determinism (L11.3)',
    source_sublayers: [L11SublayerId.L11_3_FORMULA_LAW],
  },
  [L11CertificationBand.C_ATTRIBUTION]: {
    band_id: L11CertificationBand.C_ATTRIBUTION,
    title: 'Attribution (L11.4)',
    source_sublayers: [L11SublayerId.L11_4_ATTRIBUTION],
  },
  [L11CertificationBand.D_MISSING_DATA_AND_REGIME_MODIFIERS]: {
    band_id: L11CertificationBand.D_MISSING_DATA_AND_REGIME_MODIFIERS,
    title: 'Missing-data and regime modifiers (L11.5)',
    source_sublayers: [L11SublayerId.L11_5_MISSING_REGIME],
  },
  [L11CertificationBand.E_CALIBRATION_HOOKS]: {
    band_id: L11CertificationBand.E_CALIBRATION_HOOKS,
    title: 'Calibration hooks (L11.6)',
    source_sublayers: [L11SublayerId.L11_6_CALIBRATION],
  },
  [L11CertificationBand.F_DRIFT_AND_THRESHOLD_GOVERNANCE]: {
    band_id: L11CertificationBand.F_DRIFT_AND_THRESHOLD_GOVERNANCE,
    title: 'Drift and threshold governance (L11.7)',
    source_sublayers: [L11SublayerId.L11_7_DRIFT],
  },
  [L11CertificationBand.G_PERSISTENCE_REPLAY_REPAIR]: {
    band_id: L11CertificationBand.G_PERSISTENCE_REPLAY_REPAIR,
    title: 'Persistence, replay, repair, and adversarial misuse (L11.8)',
    source_sublayers: [L11SublayerId.L11_8_PERSISTENCE],
  },
  [L11CertificationBand.H_CROSS_LAYER_REGRESSION]: {
    band_id: L11CertificationBand.H_CROSS_LAYER_REGRESSION,
    title: 'Cross-layer regression (L10 + L11.1–L11.8)',
    source_sublayers: [
      L11SublayerId.L11_1_CONSTITUTION,
      L11SublayerId.L11_2_SCORE_DOCTRINE,
      L11SublayerId.L11_3_FORMULA_LAW,
      L11SublayerId.L11_4_ATTRIBUTION,
      L11SublayerId.L11_5_MISSING_REGIME,
      L11SublayerId.L11_6_CALIBRATION,
      L11SublayerId.L11_7_DRIFT,
      L11SublayerId.L11_8_PERSISTENCE,
    ],
  },
  [L11CertificationBand.I_ROLLOUT_AND_ROLLBACK_GOVERNANCE]: {
    band_id: L11CertificationBand.I_ROLLOUT_AND_ROLLBACK_GOVERNANCE,
    title: 'Rollout, rollback, and failure playbook governance (L11.9)',
    source_sublayers: [L11SublayerId.L11_9_RATIFICATION],
  },
  [L11CertificationBand.J_MASTER_ARTIFACT]: {
    band_id: L11CertificationBand.J_MASTER_ARTIFACT,
    title: 'Master ratification artifact (L11.9)',
    source_sublayers: [L11SublayerId.L11_9_RATIFICATION],
  },
};

export function describeL11Band(b: L11CertificationBand): string {
  return L11_CERTIFICATION_BAND_REGISTRY[b].title;
}
