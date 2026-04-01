/**
 * 13.2 On-Chain Exposure Analyzer
 *
 * Detects when public keys are exposed, classifies reuse patterns,
 * estimates dormant vulnerable balances, and flags cross-chain exposure.
 *
 * Distinguishes: direct observed | inferred | unresolved exposure.
 */

import type {
  KeyExposureState,
  ExposureSurfaceClass,
  DormantSupplyEstimate,
  ExposureAnalysis,
  EvidenceMode,
  AddressOrAccountModel,
  PublicKeyExposureModel,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// EXPOSURE MODEL RULES
// ═══════════════════════════════════════════════════════════════════════════════

interface ExposureModelRule {
  account_model: AddressOrAccountModel;
  pk_model: PublicKeyExposureModel;
  base_exposure_state: KeyExposureState;
  base_surface: ExposureSurfaceClass;
  cross_chain_default: boolean;
  notes: string[];
}

const EXPOSURE_MODEL_RULES: ExposureModelRule[] = [
  {
    account_model: 'utxo_hidden_until_spend',
    pk_model: 'hidden_until_spend',
    base_exposure_state: 'not_exposed',
    base_surface: 'narrow',
    cross_chain_default: false,
    notes: ['Public key only revealed when UTXO is spent', 'Unspent outputs remain protected'],
  },
  {
    account_model: 'utxo_always_exposed',
    pk_model: 'always_exposed',
    base_exposure_state: 'exposed_current',
    base_surface: 'moderate',
    cross_chain_default: false,
    notes: ['Legacy address formats that embed public key'],
  },
  {
    account_model: 'account_public_key_bound',
    pk_model: 'account_level_visible',
    base_exposure_state: 'exposed_current',
    base_surface: 'broad',
    cross_chain_default: true,
    notes: ['Account model: address derived from public key, which is permanently exposed after first transaction'],
  },
  {
    account_model: 'smart_contract_account',
    pk_model: 'conditionally_exposed',
    base_exposure_state: 'partially_exposed',
    base_surface: 'moderate',
    cross_chain_default: false,
    notes: ['Exposure depends on account abstraction implementation'],
  },
  {
    account_model: 'validator_key_set',
    pk_model: 'always_exposed',
    base_exposure_state: 'exposed_current',
    base_surface: 'moderate',
    cross_chain_default: false,
    notes: ['Validator public keys are published for consensus participation'],
  },
  {
    account_model: 'admin_multisig',
    pk_model: 'conditionally_exposed',
    base_exposure_state: 'partially_exposed',
    base_surface: 'narrow',
    cross_chain_default: false,
    notes: ['Multisig participants may or may not have exposed individual keys'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYZER
// ═══════════════════════════════════════════════════════════════════════════════

export function analyzeExposure(
  accountModel: AddressOrAccountModel,
  pkModel: PublicKeyExposureModel,
  observedReuseRate: number | null = null,
  estimatedDormantUsd: number | null = null,
  crossChainSignals: boolean | null = null,
): ExposureAnalysis {
  const rule = EXPOSURE_MODEL_RULES.find(
    r => r.account_model === accountModel && r.pk_model === pkModel,
  );

  if (!rule) {
    return {
      key_state: 'unresolved',
      reuse_rate: observedReuseRate,
      exposure_surface: 'unresolved',
      dormant_estimate: null,
      cross_chain_risk: crossChainSignals,
      exposure_pathways: ['Exposure model not matched — unresolved'],
      evidence_mode: 'inferred',
      confidence: 0.3,
    };
  }

  let key_state = rule.base_exposure_state;
  let surface = rule.base_surface;
  const pathways = [...rule.notes];

  if (observedReuseRate !== null && observedReuseRate > 0.5) {
    if (key_state === 'not_exposed') key_state = 'exposed_historical';
    if (surface === 'narrow') surface = 'moderate';
    pathways.push(`High address reuse rate (${(observedReuseRate * 100).toFixed(1)}%) widens exposure`);
  }

  const dormant: DormantSupplyEstimate | null =
    estimatedDormantUsd !== null
      ? {
          lower_bound_usd: estimatedDormantUsd * 0.6,
          base_estimate_usd: estimatedDormantUsd,
          upper_bound_usd: estimatedDormantUsd * 1.5,
          coverage_pct: 0.7,
          confidence_bucket: estimatedDormantUsd > 1_000_000_000 ? 'high' : estimatedDormantUsd > 100_000_000 ? 'medium' : 'low',
        }
      : null;

  const crossChain = crossChainSignals ?? rule.cross_chain_default;
  if (crossChain) {
    pathways.push('Cross-chain exposure risk: same key material may be used on multiple chains');
    if (surface === 'narrow') surface = 'moderate';
    else if (surface === 'moderate') surface = 'broad';
  }

  const evidenceMode: EvidenceMode =
    observedReuseRate !== null ? 'direct' : 'inferred';

  const confidence =
    evidenceMode === 'direct' ? 0.85 : 0.6;

  return {
    key_state,
    reuse_rate: observedReuseRate,
    exposure_surface: surface,
    dormant_estimate: dormant,
    cross_chain_risk: crossChain,
    exposure_pathways: pathways,
    evidence_mode: evidenceMode,
    confidence,
  };
}

export function classifyExposureSeverity(surface: ExposureSurfaceClass): number {
  switch (surface) {
    case 'narrow': return 0.2;
    case 'moderate': return 0.4;
    case 'broad': return 0.7;
    case 'systemic': return 0.95;
    case 'unresolved': return 0.5;
  }
}
