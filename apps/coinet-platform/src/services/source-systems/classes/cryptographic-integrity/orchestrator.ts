/**
 * Section 14 — Processing Flow (Orchestrator)
 *
 * 1.  Ingest cryptographic-relevant sources
 * 2.  Classify source by truth domain
 * 3.  Parse direct structural facts
 * 4.  Compute exposure properties
 * 5.  Reconcile conflicting evidence
 * 6.  Derive bounded structural inference
 * 7.  Attach confidence and degradation metadata
 * 8.  Emit canonical cryptographic state
 * 9.  Persist lineage and version state
 * 10. Expose state to downstream layers
 */

import type {
  CryptographicIntegrityState,
  CryptoEntityType,
  CitedField,
  DegradationState,
  EvidenceMode,
  FragilityClass,
  UncertaintyState,
} from './types';
import { CI_VERSION } from './types';
import { parseProtocolStructure } from './protocol-parser';
import { analyzeExposure } from './exposure-analyzer';
import { classifySecurityStructure } from './security-classifier';
import { trackPqcMigration } from './pqc-tracker';
import { estimateDormantVulnerableSupply } from './dormant-supply';
import { deriveOverallUncertainty, computeDiagnosticMetrics } from './degradation';

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface CIOrchestrationInput {
  entity_id: string;
  entity_type: CryptoEntityType;
  entity_label?: string;

  raw_texts?: string[];
  source_ids?: string[];

  observed_reuse_rate?: number | null;
  estimated_dormant_usd?: number | null;
  current_price_usd?: number | null;
  cross_chain_signals?: boolean | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CITED FIELD FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

function cite<T>(
  value: T,
  confidence: number,
  evidenceMode: EvidenceMode,
  sources: string[],
  degradation: DegradationState = 'healthy',
): CitedField<T> {
  return {
    value,
    confidence,
    freshness: 1.0,
    degradation_state: degradation,
    evidence_mode: evidenceMode,
    source_origin: sources,
    last_verified_timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATE
// ═══════════════════════════════════════════════════════════════════════════════

export function produceCryptographicIntegrityState(
  input: CIOrchestrationInput,
): CryptographicIntegrityState {
  const sources = input.source_ids ?? ['protocol-parser', 'exposure-analyzer', 'pqc-tracker'];
  const rawTexts = input.raw_texts ?? [];

  // Step 3: Parse direct structural facts
  const parsed = parseProtocolStructure(input.entity_id, rawTexts);
  const parserConfidence = parsed.parser_confidence;
  const parserMode: EvidenceMode = parserConfidence > 0.7 ? 'direct' : 'inferred';
  const parserDegradation: DegradationState = parsed.uncertainty_flags.length > 2 ? 'partial' : 'healthy';

  // Step 4: Compute exposure properties
  const accountModel = parsed.scheme_family === 'ECDSA' && parsed.scheme_variant === 'secp256k1_ecdsa'
    ? (input.entity_id.toLowerCase().includes('bitcoin') ? 'utxo_hidden_until_spend' as const : 'account_public_key_bound' as const)
    : parsed.scheme_family === 'EdDSA'
      ? 'account_public_key_bound' as const
      : 'unknown' as const;

  const pkModel = accountModel === 'utxo_hidden_until_spend'
    ? 'hidden_until_spend' as const
    : accountModel === 'account_public_key_bound'
      ? 'account_level_visible' as const
      : 'unknown' as const;

  const exposure = analyzeExposure(
    accountModel,
    pkModel,
    input.observed_reuse_rate ?? null,
    input.estimated_dormant_usd ?? null,
    input.cross_chain_signals ?? null,
  );

  // Step 5-6: Classify security structure
  const security = classifySecurityStructure(
    parsed.scheme_family,
    pkModel,
    parsed.trusted_setup,
    parsed.validator_model,
    parsed.admin_model,
    exposure.exposure_surface,
    exposure.cross_chain_risk,
    sources,
    parserConfidence,
  );

  // PQC migration
  const pqc = trackPqcMigration(input.entity_id, rawTexts);

  // Dormant supply
  const dormant = estimateDormantVulnerableSupply(input.entity_id, input.current_price_usd ?? null);

  // Step 7-8: Assemble canonical state
  const state: CryptographicIntegrityState = {
    entity_id: input.entity_id,
    entity_type: input.entity_type,
    entity_label: input.entity_label,
    version: CI_VERSION,
    timestamp: new Date().toISOString(),

    // Core structure
    signature_scheme_family: cite(parsed.scheme_family, parserConfidence, parserMode, sources, parserDegradation),
    signature_scheme_variant: cite(parsed.scheme_variant, parserConfidence, parserMode, sources, parserDegradation),
    address_or_account_model: cite(accountModel, parserConfidence, parserMode, sources, parserDegradation),
    public_key_exposure_model: cite(pkModel, parserConfidence, parserMode, sources, parserDegradation),

    // Exposure
    key_exposure_state: cite(exposure.key_state, exposure.confidence, exposure.evidence_mode, sources),
    address_reuse_rate: cite(exposure.reuse_rate, exposure.confidence, exposure.evidence_mode, sources),
    exposure_confidence: cite(exposure.confidence, exposure.confidence, exposure.evidence_mode, sources),
    dormant_vulnerable_supply: cite(dormant, dormant ? 0.7 : 0.3, dormant ? 'reconciled' : 'modeled', sources, dormant ? 'healthy' : 'partial'),
    exposure_surface_class: cite(exposure.exposure_surface, exposure.confidence, exposure.evidence_mode, sources),
    cross_chain_exposure_risk: cite(exposure.cross_chain_risk, exposure.confidence, exposure.evidence_mode, sources),

    // Architecture-risk
    trusted_setup_dependency: cite(parsed.trusted_setup, parserConfidence, parserMode, sources, parserDegradation),
    validator_key_model: cite(parsed.validator_model, parserConfidence, parserMode, sources, parserDegradation),
    admin_key_model: cite(parsed.admin_model, parserConfidence, parserMode, sources, parserDegradation),
    cryptographic_attack_surface: security.attack_surface,

    // PQC
    pqc_support_status: cite(pqc.support_status, pqc.confidence, pqc.evidence_mode, pqc.evidence_sources),
    pqc_migration_stage: cite(pqc.migration_stage, pqc.confidence, pqc.evidence_mode, pqc.evidence_sources),
    migration_velocity: cite(pqc.velocity, pqc.confidence, pqc.evidence_mode, pqc.evidence_sources),
    upgrade_dependency_risk: cite(pqc.upgrade_risk, pqc.confidence, pqc.evidence_mode, pqc.evidence_sources),

    // Aggregate
    overall_fragility_class: cite(security.fragility_class, parserConfidence * 0.9, 'reconciled', sources),
    overall_uncertainty_state: 'known',
    field_coverage_rate: 0,
    direct_evidence_rate: 0,
  };

  // Step 9: Compute diagnostics and uncertainty
  const metrics = computeDiagnosticMetrics(state);
  state.field_coverage_rate = metrics.field_coverage_rate;
  state.direct_evidence_rate = metrics.direct_evidence_rate;
  state.overall_uncertainty_state = deriveOverallUncertainty(state);

  return state;
}

export function formatCIStateForAI(state: CryptographicIntegrityState): string {
  const lines: string[] = [
    `## Cryptographic Integrity: ${state.entity_label ?? state.entity_id}`,
    '',
    `Signature: ${state.signature_scheme_family.value} (${state.signature_scheme_variant.value})`,
    `Account model: ${state.address_or_account_model.value}`,
    `Key exposure: ${state.key_exposure_state.value} (${state.public_key_exposure_model.value})`,
    `Exposure surface: ${state.exposure_surface_class.value}`,
    `Fragility class: ${state.overall_fragility_class.value}`,
    '',
    `PQC support: ${state.pqc_support_status.value}`,
    `Migration stage: ${state.pqc_migration_stage.value} (velocity: ${state.migration_velocity.value})`,
    `Upgrade risk: ${state.upgrade_dependency_risk.value}`,
    '',
    `Validator model: ${state.validator_key_model.value}`,
    `Admin model: ${state.admin_key_model.value}`,
    `Trusted setup: ${state.trusted_setup_dependency.value}`,
  ];

  if (state.dormant_vulnerable_supply.value) {
    const d = state.dormant_vulnerable_supply.value;
    lines.push(`Dormant vulnerable supply: $${(d.base_estimate_usd / 1e9).toFixed(1)}B (±${(((d.upper_bound_usd - d.lower_bound_usd) / d.base_estimate_usd) * 50).toFixed(0)}%, coverage: ${(d.coverage_pct * 100).toFixed(0)}%)`);
  }

  lines.push('');
  lines.push(`Overall uncertainty: ${state.overall_uncertainty_state}`);
  lines.push(`Field coverage: ${(state.field_coverage_rate * 100).toFixed(0)}% | Direct evidence: ${(state.direct_evidence_rate * 100).toFixed(0)}%`);

  return lines.join('\n');
}
