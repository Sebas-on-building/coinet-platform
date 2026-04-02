/**
 * L1.4 — Field-specific payload validators.
 *
 * Each field needs domain-specific schema and sanity checks.
 * A well-formed payload from a reachable source can still be semantically invalid.
 */

import type { PayloadValidationResult } from './source-health-types';
import type { ScriptDistribution, DormantCohorts, PQEvidence } from './types';

function ok(): PayloadValidationResult {
  return { score: 1.0, issues: [], severity: 'none' };
}

function result(score: number, issues: string[]): PayloadValidationResult {
  let severity: PayloadValidationResult['severity'] = 'none';
  if (score < 0.5) severity = 'critical';
  else if (score < 0.7) severity = 'major';
  else if (score < 0.9) severity = 'minor';
  return { score: Math.max(0, Math.min(1, score)), issues, severity };
}

export function validateScriptDistribution(data: unknown): PayloadValidationResult {
  if (!data || typeof data !== 'object') return result(0, ['payload is null or not an object']);

  const d = data as Record<string, unknown>;
  const issues: string[] = [];
  let penalty = 0;

  const requiredBuckets = ['p2pk', 'p2pkh', 'p2wpkh', 'p2tr', 'p2sh', 'unknown', 'total'];
  for (const bucket of requiredBuckets) {
    if (d[bucket] === undefined || d[bucket] === null) {
      issues.push(`missing bucket: ${bucket}`);
      penalty += 0.12;
    } else if (typeof d[bucket] !== 'number') {
      issues.push(`non-numeric bucket: ${bucket}`);
      penalty += 0.10;
    } else if ((d[bucket] as number) < 0) {
      issues.push(`negative value: ${bucket}`);
      penalty += 0.15;
    }
  }

  if (typeof d.total === 'number' && d.total <= 0) {
    issues.push('total is zero or negative');
    penalty += 0.30;
  }

  if (typeof d.total === 'number' && d.total > 0) {
    const bucketSum = (['p2pk', 'p2pkh', 'p2wpkh', 'p2tr', 'p2sh', 'unknown'] as const)
      .reduce((sum, k) => sum + (typeof d[k] === 'number' ? (d[k] as number) : 0), 0);
    const drift = Math.abs(bucketSum - (d.total as number)) / (d.total as number);
    if (drift > 0.05) {
      issues.push(`bucket sum drift ${(drift * 100).toFixed(1)}% from total`);
      penalty += drift > 0.15 ? 0.25 : 0.10;
    }
  }

  if (typeof d.unknown === 'number' && typeof d.total === 'number' && d.total > 0) {
    const unknownPct = (d.unknown as number) / (d.total as number);
    if (unknownPct > 0.30) {
      issues.push(`unknown share ${(unknownPct * 100).toFixed(1)}% exceeds 30% threshold`);
      penalty += 0.20;
    }
  }

  return issues.length === 0 ? ok() : result(1 - penalty, issues);
}

export function validateDormantCohorts(data: unknown): PayloadValidationResult {
  if (!data || typeof data !== 'object') return result(0, ['payload is null or not an object']);

  const d = data as Record<string, unknown>;
  const issues: string[] = [];
  let penalty = 0;

  for (const bucket of ['gt_5y', 'gt_7y', 'gt_10y']) {
    if (d[bucket] === undefined || d[bucket] === null) {
      issues.push(`missing cohort: ${bucket}`);
      penalty += 0.15;
    } else if (typeof d[bucket] !== 'number') {
      issues.push(`non-numeric cohort: ${bucket}`);
      penalty += 0.12;
    } else if ((d[bucket] as number) < 0) {
      issues.push(`negative cohort: ${bucket}`);
      penalty += 0.20;
    }
  }

  const gt5 = typeof d.gt_5y === 'number' ? d.gt_5y as number : 0;
  const gt7 = typeof d.gt_7y === 'number' ? d.gt_7y as number : 0;
  const gt10 = typeof d.gt_10y === 'number' ? d.gt_10y as number : 0;

  if (gt7 > gt5 && gt5 > 0) {
    issues.push('gt_7y > gt_5y violates monotonic cohort logic');
    penalty += 0.15;
  }
  if (gt10 > gt7 && gt7 > 0) {
    issues.push('gt_10y > gt_7y violates monotonic cohort logic');
    penalty += 0.15;
  }

  return issues.length === 0 ? ok() : result(1 - penalty, issues);
}

export function validatePqEvidence(data: unknown): PayloadValidationResult {
  if (!data || typeof data !== 'object') return result(0, ['payload is null or not an object']);

  const d = data as Record<string, unknown>;
  const issues: string[] = [];
  let penalty = 0;

  for (const field of ['hasProposal', 'hasImplementation', 'hasDeployment']) {
    if (d[field] === undefined || d[field] === null) {
      issues.push(`missing evidence field: ${field}`);
      penalty += 0.12;
    } else if (typeof d[field] !== 'boolean') {
      issues.push(`non-boolean evidence field: ${field}`);
      penalty += 0.10;
    }
  }

  if (d.hasDeployment === true && d.hasImplementation === false) {
    issues.push('deployment=true without implementation=true is incoherent');
    penalty += 0.20;
  }
  if (d.hasImplementation === true && d.hasProposal === false) {
    issues.push('implementation=true without proposal=true is incoherent');
    penalty += 0.15;
  }

  if (!d.lastUpdate || typeof d.lastUpdate !== 'string') {
    issues.push('missing or invalid lastUpdate timestamp');
    penalty += 0.08;
  }

  return issues.length === 0 ? ok() : result(1 - penalty, issues);
}

export function validateTotalSupply(data: unknown): PayloadValidationResult {
  if (data === null || data === undefined) return result(0, ['payload is null']);

  let value: number;
  if (typeof data === 'number') {
    value = data;
  } else if (typeof data === 'object' && (data as any).value !== undefined) {
    value = (data as any).value;
  } else {
    return result(0, ['payload is not numeric and has no .value']);
  }

  const issues: string[] = [];
  let penalty = 0;

  if (value <= 0) {
    issues.push('supply value is zero or negative');
    penalty += 0.50;
  }
  if (value > 21_000_001) {
    issues.push('supply exceeds BTC protocol maximum');
    penalty += 0.40;
  }
  if (value < 18_000_000) {
    issues.push('supply suspiciously low for current BTC state');
    penalty += 0.15;
  }

  return issues.length === 0 ? ok() : result(1 - penalty, issues);
}

export function validateBtcPriceContext(data: unknown): PayloadValidationResult {
  if (!data || typeof data !== 'object') return result(0, ['payload is null or not an object']);

  const d = data as Record<string, unknown>;
  const issues: string[] = [];
  let penalty = 0;

  if (typeof d.price !== 'number' || d.price <= 0) {
    issues.push('missing or invalid price');
    penalty += 0.40;
  }

  return issues.length === 0 ? ok() : result(1 - penalty, issues);
}

export function validateOutcomeMetrics(data: unknown): PayloadValidationResult {
  if (!data || typeof data !== 'object') return result(0, ['payload is null or not an object']);

  const d = data as Record<string, unknown>;
  const issues: string[] = [];
  let penalty = 0;

  if (!d.snapshot_id || typeof d.snapshot_id !== 'string') {
    issues.push('missing snapshot linkage');
    penalty += 0.30;
  }
  if (!d.window || typeof d.window !== 'string') {
    issues.push('missing outcome window');
    penalty += 0.20;
  }

  return issues.length === 0 ? ok() : result(1 - penalty, issues);
}

const VALIDATORS: Record<string, (data: unknown) => PayloadValidationResult> = {
  scriptDistribution: validateScriptDistribution,
  dormantCohorts: validateDormantCohorts,
  pqEvidence: validatePqEvidence,
  totalSupply: validateTotalSupply,
  btcPriceContext: validateBtcPriceContext,
  outcomeMetrics: validateOutcomeMetrics,
};

export function validatePayload(fieldName: string, data: unknown): PayloadValidationResult {
  const validator = VALIDATORS[fieldName];
  if (!validator) return result(0.5, [`no validator defined for field "${fieldName}"`]);
  return validator(data);
}
