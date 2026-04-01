/**
 * Section 15 — Observability / Diagnostics
 *
 * Exposes operational diagnostics strong enough to detect
 * epistemic failure, not just system failure.
 */

import type { CryptographicIntegrityState, CIDiagnosticMetrics } from './types';
import { computeDiagnosticMetrics, assessDegradation, deriveOverallUncertainty, type DegradationReport } from './degradation';
import { produceCryptographicIntegrityState, type CIOrchestrationInput } from './orchestrator';

// ═══════════════════════════════════════════════════════════════════════════════
// FULL DIAGNOSTICS REPORT
// ═══════════════════════════════════════════════════════════════════════════════

export interface CIDiagnosticsReport {
  entity_id: string;
  entity_type: string;
  version: string;
  timestamp: string;

  state: CryptographicIntegrityState;
  metrics: CIDiagnosticMetrics;
  degradation: DegradationReport;
  overall_uncertainty: string;

  alerts: CIDiagnosticAlert[];
  evaluation_notes: string[];
}

export interface CIDiagnosticAlert {
  severity: 'info' | 'warning' | 'critical';
  category: string;
  message: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALERT GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

function generateAlerts(
  state: CryptographicIntegrityState,
  metrics: CIDiagnosticMetrics,
  degradation: DegradationReport,
): CIDiagnosticAlert[] {
  const alerts: CIDiagnosticAlert[] = [];

  if (metrics.unresolved_field_rate > 0.4) {
    alerts.push({
      severity: 'critical',
      category: 'unresolved_posture',
      message: `${(metrics.unresolved_field_rate * 100).toFixed(0)}% of cryptographic fields are unresolved — posture cannot be reliably assessed`,
    });
  }

  if (metrics.stale_field_rate > 0.3) {
    alerts.push({
      severity: 'warning',
      category: 'stale_fields',
      message: `${(metrics.stale_field_rate * 100).toFixed(0)}% of fields are stale — verification needed`,
    });
  }

  if (metrics.source_disagreement_rate > 0.1) {
    alerts.push({
      severity: 'warning',
      category: 'source_conflict',
      message: 'Conflicting primary sources detected in cryptographic classification',
    });
  }

  if (state.overall_fragility_class.value === 'critically_fragile') {
    alerts.push({
      severity: 'critical',
      category: 'fragility',
      message: 'Entity classified as critically fragile — elevated structural risk across multiple attack surfaces',
    });
  }

  if (state.pqc_migration_stage.value === 'no_path') {
    alerts.push({
      severity: 'warning',
      category: 'pqc_migration',
      message: 'No PQC migration path detected — long-term cryptographic resilience at risk',
    });
  }

  if (state.admin_key_model.value === 'single_operator' || state.admin_key_model.value === 'opaque') {
    alerts.push({
      severity: 'warning',
      category: 'admin_risk',
      message: `Admin key model (${state.admin_key_model.value}) creates elevated upgrade compromise surface`,
    });
  }

  if (degradation.claim_restriction_level === 'full_lockout') {
    alerts.push({
      severity: 'critical',
      category: 'claim_lockout',
      message: 'Cryptographic truth degradation has triggered full claim lockout — downstream confidence must be heavily penalized',
    });
  }

  if (state.dormant_vulnerable_supply.value && state.dormant_vulnerable_supply.value.base_estimate_usd > 50_000_000_000) {
    alerts.push({
      severity: 'info',
      category: 'dormant_supply',
      message: `Significant dormant vulnerable supply estimated: $${(state.dormant_vulnerable_supply.value.base_estimate_usd / 1e9).toFixed(1)}B`,
    });
  }

  if (metrics.field_coverage_rate < 0.5) {
    alerts.push({
      severity: 'warning',
      category: 'low_coverage',
      message: `Only ${(metrics.field_coverage_rate * 100).toFixed(0)}% field coverage — many cryptographic properties are unknown`,
    });
  }

  return alerts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUATION NOTES
// ═══════════════════════════════════════════════════════════════════════════════

function generateEvaluationNotes(
  state: CryptographicIntegrityState,
  metrics: CIDiagnosticMetrics,
): string[] {
  const notes: string[] = [];

  if (metrics.direct_evidence_rate > 0.7) {
    notes.push('High direct-evidence rate — structural posture well-supported by known chain architecture');
  } else if (metrics.inferred_evidence_rate > 0.5) {
    notes.push('Majority of evidence is inferred — structural claims carry elevated uncertainty');
  }

  if (state.overall_fragility_class.value === 'structurally_strong') {
    notes.push('Structural assessment is favorable — but does not eliminate future risk from quantum or protocol-level changes');
  }

  if (state.pqc_migration_stage.value === 'conceptual' || state.pqc_migration_stage.value === 'governance_discussion') {
    notes.push('PQC migration is pre-implementation — intent should not be confused with deployment');
  }

  if (state.key_exposure_state.value === 'exposed_current' && state.exposure_surface_class.value === 'broad') {
    notes.push('Broad current key exposure creates permanent at-rest vulnerability surface under future quantum capability');
  }

  return notes;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export function buildCIDiagnostics(input: CIOrchestrationInput): CIDiagnosticsReport {
  const state = produceCryptographicIntegrityState(input);
  const metrics = computeDiagnosticMetrics(state);
  const degradation = assessDegradation(state);
  const uncertainty = deriveOverallUncertainty(state);
  const alerts = generateAlerts(state, metrics, degradation);
  const evaluationNotes = generateEvaluationNotes(state, metrics);

  return {
    entity_id: input.entity_id,
    entity_type: input.entity_type,
    version: state.version,
    timestamp: state.timestamp,
    state,
    metrics,
    degradation,
    overall_uncertainty: uncertainty,
    alerts,
    evaluation_notes: evaluationNotes,
  };
}
