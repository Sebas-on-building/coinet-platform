/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔒 QS FEATURE: Security Posture                                           ║
 * ║                                                                               ║
 * ║   Measures: Incident history, audits, bug bounties                           ║
 * ║   Higher = more secure                                                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { FeatureDefinition, FeatureFunction, FeatureResult, FeatureContext } from '../types';
import {
  getDataValue,
  checkRequiredInputs,
  calculateFreshnessHours,
  calculateConfidence,
  normalizeLinear,
  normalizeSigmoid,
  createUnavailableResult,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

export const SECURITY_POSTURE_DEFINITION: FeatureDefinition = {
  id: 'qs_security_posture',
  name: 'Security Posture',
  category: 'qs',
  description: 'Composite measure of security based on audit status, incident history, and bug bounty programs',
  segment: 'SEC',
  defaultWeight: 0.20,
  requiredInputs: [], // Can compute partial score
  optionalInputs: [
    'audit_count',
    'audit_score',
    'has_bug_bounty',
    'bug_bounty_max_payout',
    'incident_count_12m',
    'incident_severity_max',
    'days_since_last_incident',
    'contract_verified',
    'has_mint_function',
    'has_admin_keys',
  ],
  updateFrequencyHours: 168, // Weekly
  higherIsBetter: true,
  normalization: {
    method: 'custom',
    min: 0,
    max: 100,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

export const computeSecurityPosture: FeatureFunction = (ctx: FeatureContext): FeatureResult => {
  const def = SECURITY_POSTURE_DEFINITION;
  const allInputs = [...def.requiredInputs, ...def.optionalInputs];
  const { present, missing } = checkRequiredInputs(ctx, allInputs);
  
  // Need at least 2 inputs to compute meaningful score
  if (present.length < 2) {
    return createUnavailableResult(def, missing, 'Insufficient security data');
  }
  
  const warnings: string[] = [];
  const intermediates: Record<string, number> = {};
  
  // ─────────────────────────────────────────────────────────────────────────────
  // AUDIT SCORE (0-30 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let auditScore = 0;
  const auditCount = getDataValue(ctx, 'audit_count');
  const auditQuality = getDataValue(ctx, 'audit_score');
  
  if (auditCount !== null) {
    // Points for number of audits (diminishing returns)
    if (auditCount >= 3) auditScore += 15;
    else if (auditCount >= 2) auditScore += 12;
    else if (auditCount >= 1) auditScore += 8;
    else auditScore += 0;
    
    intermediates['audit_count_score'] = auditScore;
  }
  
  if (auditQuality !== null) {
    // Quality score from audit results (0-100 input)
    auditScore += (auditQuality / 100) * 15;
    intermediates['audit_quality_score'] = (auditQuality / 100) * 15;
  } else if (auditCount !== null && auditCount > 0) {
    // If audited but no quality score, assume moderate
    auditScore += 8;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // BUG BOUNTY SCORE (0-20 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let bountyScore = 0;
  const hasBounty = getDataValue(ctx, 'has_bug_bounty');
  const bountyMax = getDataValue(ctx, 'bug_bounty_max_payout');
  
  if (hasBounty === 1) {
    bountyScore += 10;
    
    if (bountyMax !== null) {
      // Scale by bounty size (higher bounty = more serious about security)
      if (bountyMax >= 1_000_000) bountyScore += 10;
      else if (bountyMax >= 250_000) bountyScore += 7;
      else if (bountyMax >= 50_000) bountyScore += 4;
      else bountyScore += 2;
    }
    
    intermediates['bounty_score'] = bountyScore;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // INCIDENT HISTORY (0-25 points, subtractive)
  // ─────────────────────────────────────────────────────────────────────────────
  let incidentScore = 25; // Start with full points
  const incidentCount = getDataValue(ctx, 'incident_count_12m');
  const incidentSeverity = getDataValue(ctx, 'incident_severity_max');
  const daysSinceIncident = getDataValue(ctx, 'days_since_last_incident');
  
  if (incidentCount !== null) {
    // Deduct for incidents
    if (incidentCount === 0) {
      incidentScore = 25; // Perfect
    } else if (incidentCount === 1) {
      incidentScore = 15;
    } else if (incidentCount === 2) {
      incidentScore = 8;
    } else {
      incidentScore = 0;
      warnings.push(`${incidentCount} security incidents in last 12 months`);
    }
    
    // Further adjust by severity
    if (incidentSeverity !== null && incidentSeverity >= 8) {
      incidentScore = Math.max(0, incidentScore - 10);
      warnings.push('Critical severity incident detected');
    }
    
    // Recovery time bonus
    if (daysSinceIncident !== null && daysSinceIncident > 180) {
      incidentScore = Math.min(25, incidentScore + 5);
    }
    
    intermediates['incident_score'] = incidentScore;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CONTRACT RISK (0-25 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let contractScore = 25;
  const contractVerified = getDataValue(ctx, 'contract_verified');
  const hasMint = getDataValue(ctx, 'has_mint_function');
  const hasAdmin = getDataValue(ctx, 'has_admin_keys');
  
  if (contractVerified !== null) {
    if (contractVerified === 0) {
      contractScore -= 15;
      warnings.push('Contract not verified on explorer');
    }
  }
  
  if (hasMint === 1) {
    contractScore -= 5;
    warnings.push('Contract has mint function');
  }
  
  if (hasAdmin === 1) {
    contractScore -= 5;
    warnings.push('Contract has admin keys');
  }
  
  intermediates['contract_score'] = Math.max(0, contractScore);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FINAL SCORE
  // ─────────────────────────────────────────────────────────────────────────────
  const rawScore = auditScore + bountyScore + incidentScore + Math.max(0, contractScore);
  const normalizedScore = Math.max(0, Math.min(100, rawScore));
  
  return {
    id: def.id,
    name: def.name,
    category: def.category,
    raw: rawScore,
    normalized: normalizedScore,
    weight: def.defaultWeight,
    contribution: normalizedScore * def.defaultWeight,
    available: true,
    quality: {
      coverage: present.length / allInputs.length,
      freshnessHours: calculateFreshnessHours(ctx, present),
      confidence: calculateConfidence(ctx, present),
    },
    inputs: present,
    missing,
    warnings,
    debug: {
      formula: 'audit_score + bounty_score + incident_score + contract_score',
      intermediates,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const securityPostureFeature = {
  definition: SECURITY_POSTURE_DEFINITION,
  compute: computeSecurityPosture,
};
