/**
 * 13.3 Security Structure Classifier
 *
 * Maps observed structure to attack surface classes.
 * Classifies at-rest / on-spend / setup / validator / admin / cross-domain surfaces.
 * Computes overall fragility class.
 *
 * Never produces exploit predictions — only structural classes.
 */

import type {
  CryptographicAttackSurface,
  AttackSurfaceLevel,
  CitedField,
  SignatureSchemeFamily,
  PublicKeyExposureModel,
  TrustedSetupDependency,
  ValidatorKeyModel,
  AdminKeyModel,
  ExposureSurfaceClass,
  FragilityClass,
  SecurityClassification,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// SURFACE CLASSIFICATION RULES
// ═══════════════════════════════════════════════════════════════════════════════

function classifyAtRest(
  pkModel: PublicKeyExposureModel,
  exposureSurface: ExposureSurfaceClass,
): AttackSurfaceLevel {
  if (pkModel === 'always_exposed' || pkModel === 'account_level_visible') {
    return exposureSurface === 'systemic' ? 'critical' : exposureSurface === 'broad' ? 'high' : 'moderate';
  }
  if (pkModel === 'hidden_until_spend') return 'low';
  if (pkModel === 'conditionally_exposed') return 'moderate';
  return 'unresolved';
}

function classifyOnSpend(
  schemeFamily: SignatureSchemeFamily,
  pkModel: PublicKeyExposureModel,
): AttackSurfaceLevel {
  if (pkModel === 'hidden_until_spend') {
    return schemeFamily === 'ECDSA' ? 'moderate' : 'low';
  }
  if (schemeFamily === 'ECDSA' || schemeFamily === 'EdDSA') return 'moderate';
  if (schemeFamily === 'hash_based' || schemeFamily === 'lattice_based') return 'low';
  return 'unresolved';
}

function classifySetupDependency(setup: TrustedSetupDependency): AttackSurfaceLevel {
  switch (setup) {
    case 'none': return 'none';
    case 'historical': return 'low';
    case 'active': return 'moderate';
    case 'indirect': return 'low';
    case 'uncertain': return 'unresolved';
  }
}

function classifyValidatorSurface(model: ValidatorKeyModel): AttackSurfaceLevel {
  switch (model) {
    case 'distributed_validator_set': return 'low';
    case 'threshold_key': return 'low';
    case 'rotating_key': return 'moderate';
    case 'multisig_controlled': return 'moderate';
    case 'single_key': return 'high';
    case 'unknown': return 'unresolved';
  }
}

function classifyAdminSurface(model: AdminKeyModel): AttackSurfaceLevel {
  switch (model) {
    case 'none': return 'none';
    case 'dao_gated': return 'low';
    case 'threshold': return 'moderate';
    case 'multisig': return 'moderate';
    case 'single_operator': return 'high';
    case 'opaque': return 'high';
    case 'unknown': return 'unresolved';
  }
}

function classifyCrossDomain(
  crossChainRisk: boolean | null,
  exposureSurface: ExposureSurfaceClass,
): AttackSurfaceLevel {
  if (crossChainRisk === null) return 'unresolved';
  if (!crossChainRisk) return 'none';
  return exposureSurface === 'broad' || exposureSurface === 'systemic' ? 'high' : 'moderate';
}

function makeCitedLevel(
  level: AttackSurfaceLevel,
  sources: string[],
  confidence: number,
): CitedField<AttackSurfaceLevel> {
  return {
    value: level,
    confidence,
    freshness: 1.0,
    degradation_state: 'healthy',
    evidence_mode: 'inferred',
    source_origin: sources,
    last_verified_timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FRAGILITY CLASS DERIVATION
// ═══════════════════════════════════════════════════════════════════════════════

const LEVEL_SCORES: Record<AttackSurfaceLevel, number> = {
  none: 0,
  low: 0.15,
  moderate: 0.35,
  high: 0.6,
  critical: 0.85,
  unresolved: 0.5,
};

function deriveFragilityClass(surface: CryptographicAttackSurface): FragilityClass {
  const scores = [
    LEVEL_SCORES[surface.at_rest_exposure.value] * 1.5,
    LEVEL_SCORES[surface.on_spend_susceptibility.value],
    LEVEL_SCORES[surface.on_setup_dependency.value] * 0.8,
    LEVEL_SCORES[surface.validator_compromise_surface.value] * 1.2,
    LEVEL_SCORES[surface.admin_compromise_surface.value] * 1.3,
    LEVEL_SCORES[surface.cross_domain_surface.value] * 0.7,
  ];
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  const hasUnresolved = Object.values(surface).some(
    (f: CitedField<AttackSurfaceLevel>) => f.value === 'unresolved',
  );

  if (hasUnresolved && avg > 0.4) return 'unresolved';
  if (avg < 0.15) return 'structurally_strong';
  if (avg < 0.3) return 'conditionally_resilient';
  if (avg < 0.5) return 'partially_fragile';
  if (avg < 0.7) return 'structurally_fragile';
  return 'critically_fragile';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export function classifySecurityStructure(
  schemeFamily: SignatureSchemeFamily,
  pkModel: PublicKeyExposureModel,
  trustedSetup: TrustedSetupDependency,
  validatorModel: ValidatorKeyModel,
  adminModel: AdminKeyModel,
  exposureSurface: ExposureSurfaceClass,
  crossChainRisk: boolean | null,
  sources: string[],
  confidence: number,
): SecurityClassification {
  const attack_surface: CryptographicAttackSurface = {
    at_rest_exposure: makeCitedLevel(classifyAtRest(pkModel, exposureSurface), sources, confidence),
    on_spend_susceptibility: makeCitedLevel(classifyOnSpend(schemeFamily, pkModel), sources, confidence),
    on_setup_dependency: makeCitedLevel(classifySetupDependency(trustedSetup), sources, confidence),
    validator_compromise_surface: makeCitedLevel(classifyValidatorSurface(validatorModel), sources, confidence),
    admin_compromise_surface: makeCitedLevel(classifyAdminSurface(adminModel), sources, confidence),
    cross_domain_surface: makeCitedLevel(classifyCrossDomain(crossChainRisk, exposureSurface), sources, confidence),
  };

  const fragility_class = deriveFragilityClass(attack_surface);

  const structural_notes: string[] = [];
  if (attack_surface.at_rest_exposure.value === 'high' || attack_surface.at_rest_exposure.value === 'critical') {
    structural_notes.push('Elevated at-rest exposure: public keys permanently visible on-chain');
  }
  if (attack_surface.admin_compromise_surface.value === 'high') {
    structural_notes.push('Single-operator or opaque admin key model increases upgrade compromise surface');
  }
  if (attack_surface.on_setup_dependency.value === 'moderate') {
    structural_notes.push('Active trusted setup dependency introduces ceremony-risk surface');
  }
  if (fragility_class === 'unresolved') {
    structural_notes.push('Multiple unresolved attack surfaces prevent clean fragility classification');
  }

  return {
    attack_surface,
    fragility_class,
    structural_notes,
  };
}
