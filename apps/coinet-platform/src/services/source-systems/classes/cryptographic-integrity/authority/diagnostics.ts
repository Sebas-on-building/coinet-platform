/**
 * L1.2 CI Authority Diagnostics — audit-grade
 *
 * Section 8 observability:
 *  8.1 Metrics (7 core metrics)
 *  8.2 Logs (5 event types)
 *  8.3 Alerts (8 alert categories)
 */

import type {
  AuthorityClaim,
  AuthorityLevel,
  CIAuthorityAlert,
  CIAuthorityDiagnosticsReport,
  CIAuthorityMetrics,
  CryptoTruthDomain,
  FieldAuthorityResolution,
} from './types';
import { CI_AUTHORITY_VERSION } from './types';
import { CRYPTO_FIELD_DOMAIN_MAP } from './registry';
import { resolveAuthorityForFields } from './resolver';

export interface BuildAuthorityDiagnosticsInput {
  entity_id: string;
  claims_by_field: Record<string, AuthorityClaim[]>;
  history_resolutions?: FieldAuthorityResolution[];
}

function emptyDistribution(): Record<CryptoTruthDomain, Record<AuthorityLevel, number>> {
  return {
    protocol_structure: { primary: 0, secondary: 0, supporting: 0, speculative: 0 },
    onchain_exposure: { primary: 0, secondary: 0, supporting: 0, speculative: 0 },
    pqc_readiness: { primary: 0, secondary: 0, supporting: 0, speculative: 0 },
    vulnerability_modeling: { primary: 0, secondary: 0, supporting: 0, speculative: 0 },
    dormant_supply: { primary: 0, secondary: 0, supporting: 0, speculative: 0 },
    governance_upgrade: { primary: 0, secondary: 0, supporting: 0, speculative: 0 },
  };
}

function computeMetrics(
  resolutions: FieldAuthorityResolution[],
  previous: FieldAuthorityResolution[] = [],
): CIAuthorityMetrics {
  const total = Math.max(1, resolutions.length);
  const distribution = emptyDistribution();
  let fallbackCount = 0;
  let conflictCount = 0;
  let agreementSum = 0;
  let stalePrimaryCount = 0;
  let unresolvedCount = 0;
  let driftCount = 0;

  const prevByField = new Map(previous.map(r => [r.field_id, r]));

  for (const res of resolutions) {
    if (res.selected_authority_level) {
      distribution[res.truth_domain][res.selected_authority_level] += 1;
    }
    if (res.used_fallback) fallbackCount += 1;
    if (res.conflict_type !== 'none') conflictCount += 1;
    agreementSum += res.confidence.agreement_component;
    if (res.used_fallback && res.selected_authority_level === 'secondary') stalePrimaryCount += 1;
    if (!res.selected_source) unresolvedCount += 1;

    const prev = prevByField.get(res.field_id);
    if (prev && prev.selected_source !== res.selected_source) driftCount += 1;
  }

  return {
    authority_distribution_by_domain: distribution,
    fallback_rate: fallbackCount / total,
    conflict_rate: conflictCount / total,
    agreement_ratio: agreementSum / total,
    stale_primary_rate: stalePrimaryCount / total,
    unresolved_field_rate: unresolvedCount / total,
    authority_drift_over_time: previous.length > 0 ? driftCount / total : 0,
  };
}

function buildAlerts(
  metrics: CIAuthorityMetrics,
  resolutions: FieldAuthorityResolution[],
  previous: FieldAuthorityResolution[],
): CIAuthorityAlert[] {
  const alerts: CIAuthorityAlert[] = [];

  if (metrics.unresolved_field_rate > 0.2) {
    alerts.push({ severity: 'critical', category: 'missing_primary_sources', message: `${(metrics.unresolved_field_rate * 100).toFixed(0)}% of fields have no authority source` });
  }

  if (metrics.fallback_rate > 0.3) {
    alerts.push({ severity: 'warning', category: 'repeated_fallback_dependency', message: `Fallback rate is ${(metrics.fallback_rate * 100).toFixed(0)}% — system is repeatedly relying on non-primary authority` });
  }

  if (metrics.conflict_rate > 0.25) {
    alerts.push({ severity: 'critical', category: 'high_conflict_in_critical_fields', message: `Conflict rate is ${(metrics.conflict_rate * 100).toFixed(0)}% — material disagreement across cryptographic fields` });
  }

  if (metrics.authority_drift_over_time > 0.15 && previous.length > 0) {
    alerts.push({ severity: 'warning', category: 'sudden_authority_changes', message: `Authority drift detected: ${(metrics.authority_drift_over_time * 100).toFixed(0)}% of fields changed authority source since last resolution` });
  }

  if (metrics.stale_primary_rate > 0.2) {
    alerts.push({ severity: 'warning', category: 'stale_critical_sources', message: `${(metrics.stale_primary_rate * 100).toFixed(0)}% of primaries are stale — freshness failures in critical authority` });
  }

  const criticalDomains: CryptoTruthDomain[] = ['protocol_structure', 'onchain_exposure'];
  const criticalConflicts = resolutions.filter(r =>
    r.conflict_type !== 'none' && criticalDomains.includes(r.truth_domain),
  );
  if (criticalConflicts.length > 0) {
    alerts.push({ severity: 'critical', category: 'critical_domain_conflicts', message: `Conflicts in critical domains: ${criticalConflicts.map(r => r.field_id).join(', ')}` });
  }

  const strongInferenceBlocked = resolutions.filter(r => r.prohibit_strong_inference);
  if (strongInferenceBlocked.length > 0) {
    alerts.push({ severity: 'warning', category: 'strong_inference_blocked', message: `Strong inference prohibited for ${strongInferenceBlocked.length} field(s) due to insufficient authority quality` });
  }

  const overrides = resolutions.filter(r => r.override_applied);
  if (overrides.length > 0) {
    alerts.push({ severity: 'info', category: 'doctrine_overrides_applied', message: `Doctrine overrides active on ${overrides.length} field(s): ${[...new Set(overrides.map(r => r.override_applied))].join(', ')}` });
  }

  return alerts;
}

export function buildCIAuthorityDiagnostics(input: BuildAuthorityDiagnosticsInput): CIAuthorityDiagnosticsReport {
  const resolutions = resolveAuthorityForFields(input.claims_by_field, new Date());
  const previous = input.history_resolutions ?? [];
  const metrics = computeMetrics(resolutions, previous);
  const alerts = buildAlerts(metrics, resolutions, previous);

  const logs = resolutions.flatMap(res => {
    const ts = new Date().toISOString();
    const events: CIAuthorityDiagnosticsReport['logs'] = [{
      timestamp: ts, field_id: res.field_id, event: 'source_selected',
      details: `Selected ${res.selected_source ?? 'none'} (${res.selected_authority_level ?? 'none'}, consensus=${res.consensus_state})`,
    }];
    if (res.conflict_type !== 'none') {
      events.push({ timestamp: ts, field_id: res.field_id, event: 'conflict_detected',
        details: `type=${res.conflict_type} candidates=${res.candidate_sources.join(',')}` });
    }
    if (res.used_fallback) {
      events.push({ timestamp: ts, field_id: res.field_id, event: 'fallback_used',
        details: `reason=${res.fallback_reason ?? 'unknown'} penalty_level=${res.selected_authority_level}` });
    }
    if (res.override_applied) {
      events.push({ timestamp: ts, field_id: res.field_id, event: 'authority_override',
        details: `rule=${res.override_applied}` });
    }
    if (res.degradation_flag) {
      events.push({ timestamp: ts, field_id: res.field_id, event: 'degradation_triggered',
        details: `confidence=${res.confidence.final_confidence.toFixed(3)} prohibit_strong=${res.prohibit_strong_inference}` });
    }
    return events;
  });

  return {
    version: CI_AUTHORITY_VERSION,
    timestamp: new Date().toISOString(),
    entity_id: input.entity_id,
    resolutions, metrics, alerts, logs,
  };
}

export function buildDefaultClaimsFromFields(fields: Record<string, unknown>): Record<string, AuthorityClaim[]> {
  const out: Record<string, AuthorityClaim[]> = {};
  const sourceIdByDomain: Record<CryptoTruthDomain, string> = {
    protocol_structure: 'client_repo',
    onchain_exposure: 'onchain_observer',
    pqc_readiness: 'mainnet_activation',
    vulnerability_modeling: 'peer_reviewed_research',
    dormant_supply: 'onchain_cluster_estimator',
    governance_upgrade: 'executed_governance',
  };
  for (const [fieldId, value] of Object.entries(fields)) {
    const domain = CRYPTO_FIELD_DOMAIN_MAP[fieldId];
    if (!domain) continue;
    out[fieldId] = [{
      field_id: fieldId,
      source_id: sourceIdByDomain[domain],
      value,
      observed_at: new Date().toISOString(),
      evidence_mode: 'direct',
    }];
  }
  return out;
}
