/**
 * L12.7 — Certification Bands (§12.7.5, §12.7.19)
 *
 * Seven core bands (A–G) plus an artifact / rollout / freeze band (H)
 * that together prove Layer 12 is production-green. Each band declares
 * its source sublayers; the master certification orchestrator only
 * checks that the relevant suites green-pass — it does not duplicate
 * per-band logic.
 */

import { L12SublayerId } from '../contracts/l12-final-definition';

export const L12_CERTIFICATION_BAND_POLICY_VERSION =
  'l12.7.cert-band.v1';

/**
 * §12.7.5 — required bands. Band H (`H_ARTIFACT_ROLLOUT_FREEZE`) is
 * specified additionally in §12.7.19 ("additional production band")
 * and is treated as required.
 */
export enum L12CertificationBand {
  BAND_A_DOCTRINE_AND_CONTRACTS = 'BAND_A_DOCTRINE_AND_CONTRACTS',
  BAND_B_CONDITION_TRIGGER_INVALIDATION =
    'BAND_B_CONDITION_TRIGGER_INVALIDATION',
  BAND_C_GENERATION_AND_RANKING = 'BAND_C_GENERATION_AND_RANKING',
  BAND_D_CONFIDENCE_AND_RESTRICTIONS =
    'BAND_D_CONFIDENCE_AND_RESTRICTIONS',
  BAND_E_L11_SCORE_CONTEXT = 'BAND_E_L11_SCORE_CONTEXT',
  BAND_F_PERSISTENCE_REPLAY_REPAIR =
    'BAND_F_PERSISTENCE_REPLAY_REPAIR',
  BAND_G_ADVERSARIAL_MISUSE = 'BAND_G_ADVERSARIAL_MISUSE',
  BAND_H_ARTIFACT_ROLLOUT_FREEZE = 'BAND_H_ARTIFACT_ROLLOUT_FREEZE',
}

export const ALL_L12_CERTIFICATION_BANDS:
  readonly L12CertificationBand[] =
  Object.values(L12CertificationBand);

export interface L12CertificationBandDefinition {
  readonly band_id: L12CertificationBand;
  readonly title: string;
  readonly source_sublayers: readonly L12SublayerId[];
  readonly description: string;
}

export const L12_CERTIFICATION_BAND_REGISTRY:
  Readonly<Record<L12CertificationBand,
    L12CertificationBandDefinition>> = {
  [L12CertificationBand.BAND_A_DOCTRINE_AND_CONTRACTS]: {
    band_id: L12CertificationBand.BAND_A_DOCTRINE_AND_CONTRACTS,
    title: 'Doctrine and contracts (L12.1 + L12.2 + L12.3)',
    source_sublayers: [
      L12SublayerId.L12_1_CONSTITUTION,
      L12SublayerId.L12_2_OBJECTS,
      L12SublayerId.L12_3_CONTRACTS,
    ],
    description:
      'Scenario doctrine, object model, and universal contract surface ' +
      'with prediction-theater / recommendation / final-judgment bans',
  },
  [L12CertificationBand.BAND_B_CONDITION_TRIGGER_INVALIDATION]: {
    band_id: L12CertificationBand.BAND_B_CONDITION_TRIGGER_INVALIDATION,
    title: 'Condition / trigger / invalidation law (L12.3 + L12.5)',
    source_sublayers: [
      L12SublayerId.L12_3_CONTRACTS,
      L12SublayerId.L12_5_TEMPLATES,
    ],
    description:
      'Conditions require governed refs; triggers monitored; every ' +
      'scenario has invalidation; active invalidation caps confidence',
  },
  [L12CertificationBand.BAND_C_GENERATION_AND_RANKING]: {
    band_id: L12CertificationBand.BAND_C_GENERATION_AND_RANKING,
    title: 'Scenario generation and ranking (L12.4 + L12.5)',
    source_sublayers: [
      L12SublayerId.L12_4_RUNTIME,
      L12SublayerId.L12_5_TEMPLATES,
    ],
    description:
      'Base case + alternatives or insufficient-data; deterministic ' +
      'ranking; candidate stage cannot rank',
  },
  [L12CertificationBand.BAND_D_CONFIDENCE_AND_RESTRICTIONS]: {
    band_id: L12CertificationBand.BAND_D_CONFIDENCE_AND_RESTRICTIONS,
    title: 'Path confidence and restrictions (L12.5)',
    source_sublayers: [L12SublayerId.L12_5_TEMPLATES],
    description:
      'Confidence cap law; restrictions block recommendation / ' +
      'prediction / trade action / final judgment without L13',
  },
  [L12CertificationBand.BAND_E_L11_SCORE_CONTEXT]: {
    band_id: L12CertificationBand.BAND_E_L11_SCORE_CONTEXT,
    title: 'L11 score-context consumption (L12.3 + L12.4)',
    source_sublayers: [
      L12SublayerId.L12_3_CONTRACTS,
      L12SublayerId.L12_4_RUNTIME,
    ],
    description:
      'Naked score rejected; full L11 bundle (attribution, drift, ' +
      'visibility, restrictions, lineage, replay) required',
  },
  [L12CertificationBand.BAND_F_PERSISTENCE_REPLAY_REPAIR]: {
    band_id: L12CertificationBand.BAND_F_PERSISTENCE_REPLAY_REPAIR,
    title: 'Persistence, replay, repair (L12.6)',
    source_sublayers: [L12SublayerId.L12_6_PERSISTENCE],
    description:
      'L5-only persistence; current authority; replay reconstructs; ' +
      'repair never invents evidence',
  },
  [L12CertificationBand.BAND_G_ADVERSARIAL_MISUSE]: {
    band_id: L12CertificationBand.BAND_G_ADVERSARIAL_MISUSE,
    title: 'Adversarial misuse (cross-sublayer)',
    source_sublayers: [
      L12SublayerId.L12_1_CONSTITUTION,
      L12SublayerId.L12_3_CONTRACTS,
      L12SublayerId.L12_5_TEMPLATES,
      L12SublayerId.L12_6_PERSISTENCE,
    ],
    description:
      'Prediction theater, recommendation leakage, final judgment ' +
      'leakage, lower-layer rebuild, scenario-as-trade rejected',
  },
  [L12CertificationBand.BAND_H_ARTIFACT_ROLLOUT_FREEZE]: {
    band_id: L12CertificationBand.BAND_H_ARTIFACT_ROLLOUT_FREEZE,
    title: 'Artifact, rollout, freeze (L12.7)',
    source_sublayers: [L12SublayerId.L12_7_RATIFICATION],
    description:
      'Certification report valid; ratification artifact valid; ' +
      'fingerprints deterministic; rollout gate legal; freeze legal',
  },
};

export function describeL12Band(b: L12CertificationBand): string {
  return L12_CERTIFICATION_BAND_REGISTRY[b].title;
}
