/**
 * L1.2 CI Authority Evaluation — Section 9
 *
 *  9.1 Correctness: does authority align with real-world truth?
 *  9.2 Stability: does resolution remain stable without material change?
 *  9.3 Impact: does authority improve downstream scoring?
 *  9.4 Failure detection: weak sources overriding strong, stale treated as current, etc.
 */

import type { FieldAuthorityResolution, CryptoTruthDomain } from './types';
import { STRONG_INFERENCE_MIN_CONFIDENCE } from './doctrine';

export interface EvaluationResult {
  correctness: CorrectnessCheck;
  stability: StabilityCheck;
  impact: ImpactCheck;
  failures: FailureCheck[];
  pass: boolean;
  summary: string;
}

export interface CorrectnessCheck {
  primary_source_coverage: number;
  domains_with_primary: CryptoTruthDomain[];
  domains_without_primary: CryptoTruthDomain[];
  fields_with_wrong_domain: string[];
}

export interface StabilityCheck {
  drift_rate: number;
  flapping_fields: string[];
  stable: boolean;
}

export interface ImpactCheck {
  avg_confidence: number;
  fields_below_strong_threshold: number;
  conflict_preservation_count: number;
  fallback_degradation_count: number;
}

export interface FailureCheck {
  type: 'weak_overrides_strong' | 'stale_treated_as_current' | 'conflict_collapsed' | 'fallback_no_degradation';
  field_id: string;
  details: string;
}

export function evaluateAuthority(
  current: FieldAuthorityResolution[],
  previous: FieldAuthorityResolution[] = [],
): EvaluationResult {
  const correctness = checkCorrectness(current);
  const stability = checkStability(current, previous);
  const impact = checkImpact(current);
  const failures = detectFailures(current);

  const pass = failures.length === 0
    && correctness.domains_without_primary.length <= 1
    && stability.stable
    && impact.avg_confidence > 0.4;

  const summary = pass
    ? 'Authority evaluation passed — no critical failures detected'
    : `Authority evaluation flagged ${failures.length} failure(s), ${correctness.domains_without_primary.length} domain(s) without primary, avg confidence ${impact.avg_confidence.toFixed(2)}`;

  return { correctness, stability, impact, failures, pass, summary };
}

function checkCorrectness(resolutions: FieldAuthorityResolution[]): CorrectnessCheck {
  const domainSeen = new Map<CryptoTruthDomain, boolean>();
  const wrongDomain: string[] = [];

  for (const res of resolutions) {
    if (res.selected_authority_level === 'primary') {
      domainSeen.set(res.truth_domain, true);
    } else if (!domainSeen.has(res.truth_domain)) {
      domainSeen.set(res.truth_domain, false);
    }
  }

  const allDomains: CryptoTruthDomain[] = ['protocol_structure', 'onchain_exposure', 'pqc_readiness', 'vulnerability_modeling', 'dormant_supply', 'governance_upgrade'];
  const withPrimary = allDomains.filter(d => domainSeen.get(d) === true);
  const withoutPrimary = allDomains.filter(d => domainSeen.get(d) !== true);

  return {
    primary_source_coverage: allDomains.length > 0 ? withPrimary.length / allDomains.length : 0,
    domains_with_primary: withPrimary,
    domains_without_primary: withoutPrimary,
    fields_with_wrong_domain: wrongDomain,
  };
}

function checkStability(
  current: FieldAuthorityResolution[],
  previous: FieldAuthorityResolution[],
): StabilityCheck {
  if (previous.length === 0) return { drift_rate: 0, flapping_fields: [], stable: true };

  const prevMap = new Map(previous.map(r => [r.field_id, r]));
  let driftCount = 0;
  const flapping: string[] = [];

  for (const cur of current) {
    const prev = prevMap.get(cur.field_id);
    if (prev && prev.selected_source !== cur.selected_source) {
      driftCount += 1;
      flapping.push(cur.field_id);
    }
  }

  const driftRate = current.length > 0 ? driftCount / current.length : 0;
  return { drift_rate: driftRate, flapping_fields: flapping, stable: driftRate < 0.15 };
}

function checkImpact(resolutions: FieldAuthorityResolution[]): ImpactCheck {
  const total = Math.max(1, resolutions.length);
  let confidenceSum = 0;
  let belowStrong = 0;
  let conflictPreserved = 0;
  let fallbackDegraded = 0;

  for (const res of resolutions) {
    confidenceSum += res.confidence.final_confidence;
    if (res.confidence.final_confidence < STRONG_INFERENCE_MIN_CONFIDENCE) belowStrong += 1;
    if (res.conflict_type !== 'none') conflictPreserved += 1;
    if (res.used_fallback && res.degradation_flag) fallbackDegraded += 1;
  }

  return {
    avg_confidence: confidenceSum / total,
    fields_below_strong_threshold: belowStrong,
    conflict_preservation_count: conflictPreserved,
    fallback_degradation_count: fallbackDegraded,
  };
}

function detectFailures(resolutions: FieldAuthorityResolution[]): FailureCheck[] {
  const failures: FailureCheck[] = [];

  for (const res of resolutions) {
    if (res.selected_authority_level === 'speculative' && res.candidate_sources.length > 1) {
      failures.push({
        type: 'weak_overrides_strong',
        field_id: res.field_id,
        details: `Speculative source selected despite ${res.candidate_sources.length} candidates`,
      });
    }

    if (res.used_fallback && !res.degradation_flag) {
      failures.push({
        type: 'fallback_no_degradation',
        field_id: res.field_id,
        details: 'Fallback used but degradation flag not set',
      });
    }

    if (res.conflict_type !== 'none' && res.conflicts.length === 0) {
      failures.push({
        type: 'conflict_collapsed',
        field_id: res.field_id,
        details: `Conflict type=${res.conflict_type} but no preserved conflict records`,
      });
    }
  }

  return failures;
}
