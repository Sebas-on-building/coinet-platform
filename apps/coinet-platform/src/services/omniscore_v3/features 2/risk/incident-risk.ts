/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🚨 RISK FEATURE: Incident Risk                                            ║
 * ║                                                                               ║
 * ║   Measures: Recent exploits, outages, security incidents                     ║
 * ║   Has this project been hacked or had major issues?                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { FeatureDefinition, FeatureFunction, FeatureResult, FeatureContext } from '../types';
import {
  getDataValue,
  checkRequiredInputs,
  calculateFreshnessHours,
  calculateConfidence,
  createUnavailableResult,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

export const INCIDENT_RISK_DEFINITION: FeatureDefinition = {
  id: 'risk_incident',
  name: 'Incident Risk',
  category: 'risk',
  description: 'Measures risk from past security incidents and operational issues',
  segment: 'SEC',
  defaultWeight: 0.15,
  requiredInputs: [],
  optionalInputs: [
    'incident_count_12m',
    'incident_count_all_time',
    'incident_severity_max',
    'total_funds_lost_usd',
    'days_since_last_incident',
    'exploit_count',
    'outage_hours_12m',
    'has_incident_response_plan',
    'funds_recovered_percent',
  ],
  updateFrequencyHours: 24,
  higherIsBetter: false, // Higher score = MORE risk
  normalization: {
    method: 'custom',
    min: 0,
    max: 100,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

export const computeIncidentRisk: FeatureFunction = (ctx: FeatureContext): FeatureResult => {
  const def = INCIDENT_RISK_DEFINITION;
  const allInputs = [...def.requiredInputs, ...def.optionalInputs];
  const { present, missing } = checkRequiredInputs(ctx, allInputs);
  
  if (present.length < 1) {
    return createUnavailableResult(def, missing, 'No incident history data available');
  }
  
  const warnings: string[] = [];
  const intermediates: Record<string, number> = {};
  
  // ─────────────────────────────────────────────────────────────────────────────
  // RECENT INCIDENT COUNT (0-35 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let recentRisk = 0;
  const incidents12m = getDataValue(ctx, 'incident_count_12m');
  const exploitCount = getDataValue(ctx, 'exploit_count');
  
  if (incidents12m !== null) {
    if (incidents12m === 0) {
      recentRisk = 0; // Clean record
    } else if (incidents12m === 1) {
      recentRisk = 15;
      warnings.push('1 security incident in past 12 months');
    } else if (incidents12m === 2) {
      recentRisk = 25;
      warnings.push('2 security incidents in past 12 months');
    } else {
      recentRisk = 35;
      warnings.push(`${incidents12m} security incidents in past 12 months - high risk`);
    }
    
    intermediates['incidents_12m'] = incidents12m;
    intermediates['recent_incident_risk'] = recentRisk;
  }
  
  if (exploitCount !== null && exploitCount > 0) {
    // Exploits are worse than general incidents
    recentRisk = Math.max(recentRisk, exploitCount >= 2 ? 35 : 25);
    warnings.push(`${exploitCount} exploit(s) recorded`);
    intermediates['exploit_count'] = exploitCount;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SEVERITY (0-30 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let severityRisk = 0;
  const maxSeverity = getDataValue(ctx, 'incident_severity_max');
  const fundsLost = getDataValue(ctx, 'total_funds_lost_usd');
  
  if (maxSeverity !== null) {
    // Severity scale 1-10
    if (maxSeverity >= 9) {
      severityRisk = 30;
      warnings.push('Critical severity incident on record');
    } else if (maxSeverity >= 7) {
      severityRisk = 22;
      warnings.push('High severity incident on record');
    } else if (maxSeverity >= 5) {
      severityRisk = 14;
    } else if (maxSeverity >= 3) {
      severityRisk = 7;
    } else {
      severityRisk = 3;
    }
    
    intermediates['max_severity'] = maxSeverity;
    intermediates['severity_risk'] = severityRisk;
  }
  
  if (fundsLost !== null && fundsLost > 0) {
    // Funds lost amplifies severity
    if (fundsLost >= 100_000_000) {
      severityRisk = Math.max(severityRisk, 30);
      warnings.push(`$${(fundsLost / 1_000_000).toFixed(0)}M lost in incidents`);
    } else if (fundsLost >= 10_000_000) {
      severityRisk = Math.max(severityRisk, 25);
      warnings.push(`$${(fundsLost / 1_000_000).toFixed(0)}M lost in incidents`);
    } else if (fundsLost >= 1_000_000) {
      severityRisk = Math.max(severityRisk, 18);
    }
    
    intermediates['funds_lost_usd'] = fundsLost;
  }
  
  // Recovery can mitigate
  const recoveryPercent = getDataValue(ctx, 'funds_recovered_percent');
  if (recoveryPercent !== null && recoveryPercent >= 80) {
    severityRisk = Math.max(0, severityRisk - 8);
    intermediates['recovery_mitigation'] = -8;
  } else if (recoveryPercent !== null && recoveryPercent >= 50) {
    severityRisk = Math.max(0, severityRisk - 4);
    intermediates['recovery_mitigation'] = -4;
  }
  
  severityRisk = Math.min(30, severityRisk);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // RECENCY (0-20 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let recencyRisk = 0;
  const daysSinceIncident = getDataValue(ctx, 'days_since_last_incident');
  
  if (daysSinceIncident !== null) {
    if (daysSinceIncident < 30) {
      recencyRisk = 20;
      warnings.push('Security incident in last 30 days');
    } else if (daysSinceIncident < 90) {
      recencyRisk = 15;
    } else if (daysSinceIncident < 180) {
      recencyRisk = 10;
    } else if (daysSinceIncident < 365) {
      recencyRisk = 5;
    } else {
      recencyRisk = 2; // Over a year ago
    }
    
    intermediates['days_since_incident'] = daysSinceIncident;
    intermediates['recency_risk'] = recencyRisk;
  } else if (incidents12m === 0) {
    // No incidents in 12m = low recency risk
    recencyRisk = 0;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // OPERATIONAL STABILITY (0-15 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let operationalRisk = 0;
  const outageHours = getDataValue(ctx, 'outage_hours_12m');
  const hasIrPlan = getDataValue(ctx, 'has_incident_response_plan');
  
  if (outageHours !== null) {
    if (outageHours >= 48) {
      operationalRisk = 15;
      warnings.push(`${outageHours.toFixed(0)} hours of outages in past year`);
    } else if (outageHours >= 24) {
      operationalRisk = 10;
    } else if (outageHours >= 8) {
      operationalRisk = 5;
    } else {
      operationalRisk = 2;
    }
    
    intermediates['outage_hours'] = outageHours;
    intermediates['operational_risk'] = operationalRisk;
  }
  
  // IR plan can slightly mitigate
  if (hasIrPlan === 1) {
    operationalRisk = Math.max(0, operationalRisk - 3);
    intermediates['ir_plan_mitigation'] = -3;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FINAL RISK SCORE
  // ─────────────────────────────────────────────────────────────────────────────
  const rawRisk = recentRisk + severityRisk + recencyRisk + operationalRisk;
  const normalizedRisk = Math.max(0, Math.min(100, rawRisk));
  
  return {
    id: def.id,
    name: def.name,
    category: def.category,
    raw: rawRisk,
    normalized: normalizedRisk,
    weight: def.defaultWeight,
    contribution: normalizedRisk * def.defaultWeight,
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
      formula: 'recent_risk + severity_risk + recency_risk + operational_risk',
      intermediates,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const incidentRiskFeature = {
  definition: INCIDENT_RISK_DEFINITION,
  compute: computeIncidentRisk,
};
