/**
 * L1.3 Substitution Engine — runtime continuity legality decision engine.
 *
 * For every field, decides:
 *   - can this source substitute?
 *   - at what semantic loss level?
 *   - with what penalty?
 *   - with what disclosure?
 *   - what downstream must be weakened or blocked?
 *   - is the attempt illegal?
 */

import type { TruthClass } from '../registry';
import { getProviderHealth, isProviderAvailable } from '../health-monitor';
import {
  type SemanticLossLevel,
  type SubstitutionOutcome,
  type LegalityGate,
  type GateResult,
  type SubstitutionResolutionRecord,
  type IllegalSubstitutionIncident,
  type SubstitutionDiagnostics,
  L13_PLATFORM_VERSION,
} from './substitution-types';
import type { FieldSubstitutionRule } from './substitution-types';
import {
  SUBSTITUTION_CONSTITUTION,
  getSubstitutionRule,
  getAllSubstitutionRules,
  isSubstitutionIllegal,
} from './substitution-constitution';
import { isProviderProhibited } from './authority-constitution';

// ═══════════════════════════════════════════════════════════════════════════════
// INCIDENT LOG
// ═══════════════════════════════════════════════════════════════════════════════

const incidentLog: IllegalSubstitutionIncident[] = [];

export function getIncidents(): IllegalSubstitutionIncident[] {
  return [...incidentLog];
}

export function clearIncidents(): void {
  incidentLog.length = 0;
}

function logIncident(
  fieldId: string, truthClass: TruthClass, providerId: string,
  reason: string, gatesFailed: LegalityGate[],
): void {
  incidentLog.push({
    timestamp: new Date().toISOString(),
    fieldId, truthClass, attemptedProvider: providerId,
    reason, gatesFailed,
    severity: gatesFailed.includes('truth_domain_equivalence') ? 'critical' : 'warning',
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGALITY GATE RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

function runLegalityGates(
  fieldId: string,
  rule: FieldSubstitutionRule,
  candidateId: string,
): GateResult[] {
  const results: GateResult[] = [];
  const candidate = rule.legalSubstitutes.find(s => s.providerId === candidateId);
  const illegalCheck = isSubstitutionIllegal(fieldId, candidateId);

  // Gate 1: truth domain equivalence
  const prohibited = isProviderProhibited(rule.truthClass, candidateId);
  results.push({
    gate: 'truth_domain_equivalence',
    passed: !prohibited && !illegalCheck.illegal,
    reason: illegalCheck.illegal
      ? `ILLEGAL: ${illegalCheck.reason}`
      : prohibited
        ? `Provider "${candidateId}" is a prohibited non-owner for ${rule.truthClass}`
        : 'Same truth domain',
  });

  // Gate 2: field identity equivalence
  const isEnumerated = !!candidate;
  results.push({
    gate: 'field_identity_equivalence',
    passed: isEnumerated,
    reason: isEnumerated
      ? `Provider "${candidateId}" is enumerated for field "${fieldId}"`
      : `Provider "${candidateId}" is not listed as a legal substitute for "${fieldId}"`,
  });

  // Gate 3: semantic granularity equivalence
  const granularityOk = isEnumerated && (
    candidate!.semanticLoss === 'S0_full_equivalent' ||
    candidate!.semanticLoss === 'S1_near_equivalent' ||
    candidate!.semanticLoss === 'S2_degraded_equivalent'
  );
  results.push({
    gate: 'semantic_granularity_equivalence',
    passed: isEnumerated ? granularityOk || candidate!.semanticLoss === 'S3_partial_view_only' : false,
    reason: isEnumerated
      ? `Semantic loss: ${candidate!.semanticLoss}`
      : 'Not enumerated — granularity unknown',
  });

  // Gate 4: scope equivalence (conditions check)
  const scopeOk = isEnumerated && candidate!.conditions.length > 0;
  results.push({
    gate: 'scope_equivalence',
    passed: scopeOk || !isEnumerated,
    reason: isEnumerated
      ? `Conditions: ${candidate!.conditions.join('; ')}`
      : 'Not applicable — not enumerated',
  });

  // Gate 5: methodology compatibility
  const methodOk = !rule.methodologyCompatibilityRequired || !candidate?.methodologyNote;
  results.push({
    gate: 'methodology_compatibility',
    passed: isEnumerated,
    reason: candidate?.methodologyNote
      ? `Note: ${candidate.methodologyNote}`
      : 'No methodology mismatch noted',
  });

  // Gate 6: freshness legality
  const health = getProviderHealth(candidateId);
  const freshEnough = health.staleDurationMs <= rule.freshnessToleranceMs || health.lastSuccessAt === 0;
  results.push({
    gate: 'freshness_legality',
    passed: freshEnough || health.lastSuccessAt === 0,
    reason: freshEnough
      ? `Freshness OK (stale: ${health.staleDurationMs}ms, tolerance: ${rule.freshnessToleranceMs}ms)`
      : `Stale beyond tolerance (${health.staleDurationMs}ms > ${rule.freshnessToleranceMs}ms)`,
  });

  // Gate 7: validation legality
  const available = isProviderAvailable(candidateId);
  results.push({
    gate: 'validation_legality',
    passed: available,
    reason: available ? 'Provider available' : 'Provider unavailable (circuit open or never seen)',
  });

  // Gate 8: declared epistemic cost
  results.push({
    gate: 'declared_epistemic_cost',
    passed: isEnumerated,
    reason: isEnumerated
      ? `Penalty: ${candidate!.confidencePenalty}, Loss: ${candidate!.semanticLoss}`
      : 'No declared cost — unenumerated provider',
  });

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLUTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve substitution for a single field.
 *
 * Decision ladder:
 *   1. Check primary owner health
 *   2. If healthy → USE_PRIMARY
 *   3. Enumerate candidates from constitution
 *   4. Run legality gates on each candidate
 *   5. Select best legal candidate
 *   6. If none → SUPPRESS_CLAIM
 */
export function resolveSubstitution(fieldId: string): SubstitutionResolutionRecord {
  const rule = getSubstitutionRule(fieldId);
  if (!rule) {
    return {
      fieldId, truthClass: '' as TruthClass, outcome: 'SUPPRESS_CLAIM',
      selectedProvider: null, semanticLoss: 'S5_illegal', confidencePenalty: 1.0,
      gateResults: [], disclosure: `No substitution rule for "${fieldId}"`,
      downstreamBlocked: [], reason: ['Field not in substitution constitution'],
      version: L13_PLATFORM_VERSION,
    };
  }

  const reason: string[] = [];

  // Step 1-2: check primary
  const primaryHealth = getProviderHealth(rule.primaryOwner);
  const primaryAvailable = isProviderAvailable(rule.primaryOwner) && primaryHealth.healthScore > 0.3;

  if (primaryAvailable) {
    reason.push(`Primary "${rule.primaryOwner}" healthy (score: ${primaryHealth.healthScore.toFixed(2)})`);
    return {
      fieldId, truthClass: rule.truthClass, outcome: 'USE_PRIMARY',
      selectedProvider: rule.primaryOwner, semanticLoss: 'S0_full_equivalent',
      confidencePenalty: 0, gateResults: [], disclosure: '',
      downstreamBlocked: [], reason, version: L13_PLATFORM_VERSION,
    };
  }

  reason.push(`Primary "${rule.primaryOwner}" degraded/unavailable (score: ${primaryHealth.healthScore.toFixed(2)})`);

  // Step 3-4: enumerate and evaluate candidates
  if (rule.legalSubstitutes.length === 0) {
    reason.push('No legal substitutes defined — field has no-fallback');
    return {
      fieldId, truthClass: rule.truthClass, outcome: 'SUPPRESS_CLAIM',
      selectedProvider: null, semanticLoss: 'S5_illegal', confidencePenalty: 1.0,
      gateResults: [], disclosure: rule.disclosureTemplate,
      downstreamBlocked: rule.downstreamBlockers,
      reason, version: L13_PLATFORM_VERSION,
    };
  }

  // Try candidates in semantic-loss order (best first)
  const sortedCandidates = [...rule.legalSubstitutes].sort((a, b) =>
    a.confidencePenalty - b.confidencePenalty,
  );

  for (const candidate of sortedCandidates) {
    const gates = runLegalityGates(fieldId, rule, candidate.providerId);
    const criticalFailed = gates.filter(g =>
      !g.passed && (
        g.gate === 'truth_domain_equivalence' ||
        g.gate === 'field_identity_equivalence' ||
        g.gate === 'validation_legality'
      ),
    );

    if (criticalFailed.length > 0) {
      reason.push(`Candidate "${candidate.providerId}" failed critical gates: ${criticalFailed.map(g => g.gate).join(', ')}`);
      continue;
    }

    // Candidate passes critical gates
    const outcome: SubstitutionOutcome =
      candidate.semanticLoss === 'S0_full_equivalent' ? 'USE_SUBSTITUTE_FULL' :
      candidate.semanticLoss === 'S1_near_equivalent' ? 'USE_SUBSTITUTE_FULL' :
      candidate.semanticLoss === 'S2_degraded_equivalent' ? 'USE_SUBSTITUTE_DEGRADED' :
      candidate.semanticLoss === 'S3_partial_view_only' ? 'PARTIAL_VIEW_ONLY' :
      'SUPPRESS_CLAIM';

    reason.push(`Selected substitute "${candidate.providerId}" at ${candidate.semanticLoss}`);

    return {
      fieldId, truthClass: rule.truthClass, outcome,
      selectedProvider: candidate.providerId,
      semanticLoss: candidate.semanticLoss,
      confidencePenalty: candidate.confidencePenalty,
      gateResults: gates,
      disclosure: rule.disclosureTemplate,
      downstreamBlocked: candidate.semanticLoss === 'S3_partial_view_only' ? rule.downstreamBlockers : [],
      reason, version: L13_PLATFORM_VERSION,
    };
  }

  // No candidate passed
  reason.push('All legal substitutes failed legality gates — claim suppressed');
  return {
    fieldId, truthClass: rule.truthClass, outcome: 'SUPPRESS_CLAIM',
    selectedProvider: null, semanticLoss: 'S5_illegal', confidencePenalty: 1.0,
    gateResults: [], disclosure: rule.disclosureTemplate,
    downstreamBlocked: rule.downstreamBlockers,
    reason, version: L13_PLATFORM_VERSION,
  };
}

/**
 * Validate whether a specific provider is legal as a substitute for a field.
 * If illegal, logs an incident.
 */
export function validateSubstitutionAttempt(
  fieldId: string,
  providerId: string,
): SubstitutionResolutionRecord {
  const rule = getSubstitutionRule(fieldId);
  if (!rule) {
    return {
      fieldId, truthClass: '' as TruthClass, outcome: 'ILLEGAL_SUBSTITUTION_BLOCKED',
      selectedProvider: null, semanticLoss: 'S5_illegal', confidencePenalty: 1.0,
      gateResults: [], disclosure: `No substitution rule for "${fieldId}"`,
      downstreamBlocked: [], reason: ['Field not in substitution constitution'],
      version: L13_PLATFORM_VERSION,
    };
  }

  // Check if the provider is the primary owner
  if (rule.primaryOwner === providerId) {
    return {
      fieldId, truthClass: rule.truthClass, outcome: 'USE_PRIMARY',
      selectedProvider: providerId, semanticLoss: 'S0_full_equivalent',
      confidencePenalty: 0, gateResults: [], disclosure: '',
      downstreamBlocked: [], reason: ['Provider is primary owner'],
      version: L13_PLATFORM_VERSION,
    };
  }

  // Check illegal list
  const illegalCheck = isSubstitutionIllegal(fieldId, providerId);
  if (illegalCheck.illegal) {
    const failedGates: LegalityGate[] = ['truth_domain_equivalence'];
    logIncident(fieldId, rule.truthClass, providerId, illegalCheck.reason!, failedGates);
    return {
      fieldId, truthClass: rule.truthClass, outcome: 'ILLEGAL_SUBSTITUTION_BLOCKED',
      selectedProvider: null, semanticLoss: 'S5_illegal', confidencePenalty: 1.0,
      gateResults: [{
        gate: 'truth_domain_equivalence', passed: false,
        reason: `ILLEGAL: ${illegalCheck.reason}`,
      }],
      disclosure: '', downstreamBlocked: rule.downstreamBlockers,
      reason: [`ILLEGAL: ${illegalCheck.reason}`],
      version: L13_PLATFORM_VERSION,
    };
  }

  // Check legal list
  const gates = runLegalityGates(fieldId, rule, providerId);
  const candidate = rule.legalSubstitutes.find(s => s.providerId === providerId);

  if (!candidate) {
    const failedGates: LegalityGate[] = ['field_identity_equivalence'];
    logIncident(fieldId, rule.truthClass, providerId, 'Not enumerated as legal substitute', failedGates);
    return {
      fieldId, truthClass: rule.truthClass, outcome: 'ILLEGAL_SUBSTITUTION_BLOCKED',
      selectedProvider: null, semanticLoss: 'S5_illegal', confidencePenalty: 1.0,
      gateResults: gates, disclosure: '',
      downstreamBlocked: rule.downstreamBlockers,
      reason: [`Provider "${providerId}" not enumerated for field "${fieldId}"`],
      version: L13_PLATFORM_VERSION,
    };
  }

  // Legal candidate exists — return its resolution
  const outcome: SubstitutionOutcome =
    candidate.semanticLoss === 'S0_full_equivalent' ? 'USE_SUBSTITUTE_FULL' :
    candidate.semanticLoss === 'S1_near_equivalent' ? 'USE_SUBSTITUTE_FULL' :
    candidate.semanticLoss === 'S2_degraded_equivalent' ? 'USE_SUBSTITUTE_DEGRADED' :
    candidate.semanticLoss === 'S3_partial_view_only' ? 'PARTIAL_VIEW_ONLY' :
    'SUPPRESS_CLAIM';

  return {
    fieldId, truthClass: rule.truthClass, outcome,
    selectedProvider: providerId, semanticLoss: candidate.semanticLoss,
    confidencePenalty: candidate.confidencePenalty, gateResults: gates,
    disclosure: rule.disclosureTemplate,
    downstreamBlocked: candidate.semanticLoss === 'S3_partial_view_only' ? rule.downstreamBlockers : [],
    reason: [`Legal substitute at ${candidate.semanticLoss}`],
    version: L13_PLATFORM_VERSION,
  };
}

/**
 * Resolve all fields and build full diagnostics.
 */
export function resolveAllSubstitutions(): SubstitutionDiagnostics {
  const rules = getAllSubstitutionRules();
  const records = rules.map(r => resolveSubstitution(r.fieldId));

  return {
    totalFields: records.length,
    primaryUsed: records.filter(r => r.outcome === 'USE_PRIMARY').length,
    substituted: records.filter(r =>
      r.outcome === 'USE_SUBSTITUTE_FULL' || r.outcome === 'USE_SUBSTITUTE_DEGRADED',
    ).length,
    degradedSubstituted: records.filter(r => r.outcome === 'USE_SUBSTITUTE_DEGRADED').length,
    partialViewOnly: records.filter(r => r.outcome === 'PARTIAL_VIEW_ONLY').length,
    suppressed: records.filter(r => r.outcome === 'SUPPRESS_CLAIM').length,
    illegalBlocked: records.filter(r => r.outcome === 'ILLEGAL_SUBSTITUTION_BLOCKED').length,
    totalPenalty: records.reduce((sum, r) => sum + r.confidencePenalty, 0),
    incidents: getIncidents(),
    records,
    version: L13_PLATFORM_VERSION,
  };
}
