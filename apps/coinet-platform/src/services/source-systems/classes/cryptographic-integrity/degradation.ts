/**
 * 13.6 Degradation and Blind-Spot Manager
 *
 * Identifies incomplete cryptographic truth, widens uncertainty,
 * lowers downstream permission to claim, and surfaces unresolved
 * states to other layers.
 *
 * This is mandatory and not optional.
 */

import type {
  CryptographicIntegrityState,
  CitedField,
  DegradationState,
  UncertaintyState,
  CIDiagnosticMetrics,
} from './types';

import { ALL_DEGRADATION_EFFECTS, DEGRADATION_INVARIANT, type DegradationEffect } from './doctrine';

// ═══════════════════════════════════════════════════════════════════════════════
// FIELD INSPECTION
// ═══════════════════════════════════════════════════════════════════════════════

const CORE_FIELD_KEYS: Array<keyof CryptographicIntegrityState> = [
  'signature_scheme_family',
  'signature_scheme_variant',
  'address_or_account_model',
  'public_key_exposure_model',
  'key_exposure_state',
  'exposure_surface_class',
  'trusted_setup_dependency',
  'validator_key_model',
  'admin_key_model',
  'pqc_support_status',
  'pqc_migration_stage',
  'migration_velocity',
  'upgrade_dependency_risk',
  'overall_fragility_class',
];

function isCitedField(val: unknown): val is CitedField<unknown> {
  return val !== null && typeof val === 'object' && 'value' in val && 'confidence' in val && 'degradation_state' in val;
}

export function computeDiagnosticMetrics(state: CryptographicIntegrityState): CIDiagnosticMetrics {
  let total = 0;
  let covered = 0;
  let directCount = 0;
  let inferredCount = 0;
  let unresolvedCount = 0;
  let staleCount = 0;
  let degradedCount = 0;
  let disagreeCount = 0;

  for (const key of CORE_FIELD_KEYS) {
    const val = state[key];
    if (!isCitedField(val)) continue;

    total++;
    const field = val as CitedField<unknown>;

    if (field.value !== 'unknown' && field.value !== null && field.value !== 'unresolved') {
      covered++;
    }
    if (field.evidence_mode === 'direct') directCount++;
    if (field.evidence_mode === 'inferred') inferredCount++;
    if (field.value === 'unresolved' || field.value === 'unknown') unresolvedCount++;
    if (field.degradation_state === 'stale') staleCount++;
    if (field.degradation_state === 'degraded' || field.degradation_state === 'partial') degradedCount++;
    if (field.degradation_state === 'conflicting') disagreeCount++;
  }

  return {
    field_coverage_rate: total > 0 ? covered / total : 0,
    direct_evidence_rate: total > 0 ? directCount / total : 0,
    inferred_evidence_rate: total > 0 ? inferredCount / total : 0,
    unresolved_field_rate: total > 0 ? unresolvedCount / total : 0,
    stale_field_rate: total > 0 ? staleCount / total : 0,
    degradation_incidence_rate: total > 0 ? degradedCount / total : 0,
    source_disagreement_rate: total > 0 ? disagreeCount / total : 0,
    completeness_score: total > 0 ? (covered / total) * (1 - unresolvedCount / total) : 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERALL UNCERTAINTY
// ═══════════════════════════════════════════════════════════════════════════════

export function deriveOverallUncertainty(state: CryptographicIntegrityState): UncertaintyState {
  const metrics = computeDiagnosticMetrics(state);

  if (metrics.source_disagreement_rate > 0.2) return 'conflicting';
  if (metrics.unresolved_field_rate > 0.4) return 'unresolved';
  if (metrics.stale_field_rate > 0.3) return 'stale';
  if (metrics.degradation_incidence_rate > 0.3) return 'degraded';
  if (metrics.inferred_evidence_rate > 0.6) return 'inferred';
  return 'known';
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEGRADATION EFFECTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface DegradationReport {
  triggered_effects: DegradationEffect[];
  confidence_penalty: number;
  claim_restriction_level: 'none' | 'mild' | 'moderate' | 'severe' | 'full_lockout';
  blind_spots: string[];
  warnings: string[];
  invariant: string;
}

export function assessDegradation(state: CryptographicIntegrityState): DegradationReport {
  const metrics = computeDiagnosticMetrics(state);
  const uncertainty = deriveOverallUncertainty(state);

  const effects: DegradationEffect[] = [];
  const blindSpots: string[] = [];
  const warnings: string[] = [];
  let penalty = 0;

  if (metrics.field_coverage_rate < 0.5) {
    effects.push('lower_field_confidence', 'lower_downstream_confidence', 'explicit_blind_spot_disclosure');
    penalty += 0.3;
    warnings.push(`Low field coverage: ${(metrics.field_coverage_rate * 100).toFixed(0)}%`);
  }

  if (metrics.unresolved_field_rate > 0.3) {
    effects.push('unresolved_state_tagging', 'wider_hypothesis_spread');
    penalty += 0.2;
    warnings.push(`High unresolved rate: ${(metrics.unresolved_field_rate * 100).toFixed(0)}%`);
  }

  if (metrics.stale_field_rate > 0.2) {
    effects.push('score_penalties_for_uncertainty', 'ai_language_softening');
    penalty += 0.15;
    warnings.push(`Stale fields: ${(metrics.stale_field_rate * 100).toFixed(0)}%`);
  }

  if (metrics.source_disagreement_rate > 0.1) {
    effects.push('contradiction_preservation');
    penalty += 0.1;
    warnings.push('Source disagreement detected in cryptographic posture');
  }

  if (uncertainty === 'unresolved' || uncertainty === 'conflicting') {
    effects.push('wider_scenario_spread');
  }

  for (const key of CORE_FIELD_KEYS) {
    const val = state[key];
    if (isCitedField(val)) {
      const field = val as CitedField<unknown>;
      if (field.value === 'unknown' || field.value === 'unresolved') {
        blindSpots.push(key);
      }
    }
  }

  let restriction: DegradationReport['claim_restriction_level'] = 'none';
  if (penalty > 0.5) restriction = 'full_lockout';
  else if (penalty > 0.35) restriction = 'severe';
  else if (penalty > 0.2) restriction = 'moderate';
  else if (penalty > 0.1) restriction = 'mild';

  return {
    triggered_effects: [...new Set(effects)],
    confidence_penalty: Math.min(penalty, 0.7),
    claim_restriction_level: restriction,
    blind_spots: blindSpots,
    warnings,
    invariant: DEGRADATION_INVARIANT,
  };
}
