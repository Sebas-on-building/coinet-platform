/**
 * L1.4.1 Claim Permission Compiler
 *
 * Health does not decide speech directly. Permission decides speech.
 *
 * This compiler takes the full epistemic state of a field:
 *   - operational health
 *   - epistemic integrity
 *   - recovery state
 *   - class authority viability
 *   - substitution legality
 *   - field criticality
 *
 * And produces a deterministic, auditable permission:
 *   - what Coinet is ALLOWED to claim
 *   - what Coinet MUST disclose
 *   - what Coinet MUST suppress
 *   - what confidence haircut applies
 *
 * Two fields with identical health scores can produce radically different
 * permissions if their integrity states differ. That is the core insight.
 */

import type { TruthClass } from '../registry';
import { getFieldAuthority, FIELD_AUTHORITY_MAP } from './authority-constitution';
import { getSubstitutionRule } from './substitution-constitution';
import { isProviderAvailable, getProviderHealth } from '../health-monitor';
import { computeFieldHealth, deriveHealthState } from './field-health-engine';
import { evaluateFieldIntegrity, type ObservedFieldMetadata } from './epistemic-integrity-engine';
import { getFieldCriticality } from './field-criticality-map';
import { getRecoveryState } from './recovery-governor';
import {
  type ClaimPermission, type HealthDecisionRecord, type HealthState, type IntegrityState,
  type RecoveryState, type FieldCriticality,
  CLAIM_PERMISSION_SPEAKABLE, RECOVERY_TRUST_HAIRCUT, CRITICALITY_SUPPRESSION_WEIGHT,
  L14_PLATFORM_VERSION,
} from './health-types';

// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSION COMPILATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The constitutional decision ladder.
 * Order matters: harder constraints evaluate first.
 */
export function compilePermission(
  fieldId: string,
  observation?: ObservedFieldMetadata,
): HealthDecisionRecord {
  const field = getFieldAuthority(fieldId);
  const providerId = field?.owner ?? 'unknown';
  const truthClass = field?.truthClass ?? ('' as TruthClass);
  const reasons: string[] = [];

  // Step 1: Evaluate health
  const fieldHealth = computeFieldHealth(fieldId, providerId);
  const healthState = fieldHealth.state;

  // Step 2: Evaluate integrity
  const integrityRecord = observation
    ? evaluateFieldIntegrity(observation)
    : evaluateFieldIntegrity({ fieldId, providerId });
  const integrityState = integrityRecord.state;

  // Step 3: Get recovery state
  const recovery = getRecoveryState(providerId);
  const recoveryState = recovery.state;
  const recoveryHaircut = RECOVERY_TRUST_HAIRCUT[recoveryState];

  // Step 4: Get criticality
  const critEntry = getFieldCriticality(fieldId);
  const criticality = critEntry?.criticality ?? 'CONTEXTUAL';

  // Step 5: Check substitution legality
  const subRule = getSubstitutionRule(fieldId);
  let legalSubstituteExists = false;
  if (subRule) {
    legalSubstituteExists = subRule.legalSubstitutes.some(s => isProviderAvailable(s.providerId));
  }

  // ─── Decision ladder ─────────────────────────────────────────────────────

  let permission: ClaimPermission;
  let confidencePenalty = 0;
  let disclosureRequired = false;

  // Gate 1: Integrity broken → BLOCK or SUPPRESS regardless of health
  if (integrityState === 'I4_BROKEN') {
    permission = 'BLOCK_OUTPUT';
    confidencePenalty = 1.0;
    reasons.push('Integrity broken: field is no longer the same truth type');
    reasons.push(`Broken dimensions: ${integrityRecord.brokenDimensions.join(', ')}`);
  }

  // Gate 2: Integrity unknown → SUPPRESS (cannot verify, treat as unsafe)
  else if (integrityState === 'I5_UNKNOWN') {
    permission = 'SUPPRESS_CLAIM';
    confidencePenalty = 0.8;
    reasons.push('Integrity unknown: no representative tuple or verification impossible');
  }

  // Gate 3: Health suppressed → BLOCK
  else if (healthState === 'H5_SUPPRESSED') {
    permission = 'BLOCK_OUTPUT';
    confidencePenalty = 1.0;
    reasons.push('Health suppressed: source completely unavailable');
  }

  // Gate 4: Health unsafe → SUPPRESS unless legal substitute exists
  else if (healthState === 'H4_UNSAFE') {
    if (legalSubstituteExists) {
      permission = 'ALLOW_SUBSTITUTE_DEGRADED';
      confidencePenalty = 0.35;
      disclosureRequired = true;
      reasons.push('Primary unsafe, legal substitute active with degradation');
    } else {
      permission = 'SUPPRESS_CLAIM';
      confidencePenalty = 0.8;
      reasons.push('Primary unsafe and no legal substitute exists');
    }
  }

  // Gate 5: Material integrity mismatch → SUPPRESS for mission-critical, PARTIAL for others
  else if (integrityState === 'I3_MATERIAL_MISMATCH') {
    if (criticality === 'MISSION_CRITICAL' || criticality === 'THESIS_CRITICAL') {
      permission = 'SUPPRESS_CLAIM';
      confidencePenalty = 0.6;
      reasons.push(`Material integrity mismatch on ${criticality} field`);
      reasons.push(`Drifted: ${integrityRecord.brokenDimensions.join(', ')}`);
    } else {
      permission = 'PARTIAL_VIEW_ONLY';
      confidencePenalty = 0.4;
      disclosureRequired = true;
      reasons.push('Material integrity mismatch on non-critical field — partial view only');
    }
  }

  // Gate 6: Recovering provider → apply haircut
  else if (recoveryState === 'RECOVERING_UNVERIFIED') {
    permission = 'ALLOW_PRIMARY_WITH_HAIRCUT';
    confidencePenalty = recoveryHaircut;
    disclosureRequired = true;
    reasons.push('Provider recovering but not yet verified — probationary trust');
  }

  else if (recoveryState === 'RECOVERING_PROBATION') {
    permission = 'ALLOW_PRIMARY_WITH_HAIRCUT';
    confidencePenalty = recoveryHaircut;
    disclosureRequired = true;
    reasons.push('Provider in recovery probation');
  }

  // Gate 7: Health partial blindness → PARTIAL_VIEW_ONLY
  else if (healthState === 'H3_PARTIAL_BLINDNESS') {
    if (legalSubstituteExists) {
      permission = 'ALLOW_SUBSTITUTE_DEGRADED';
      confidencePenalty = 0.25;
      disclosureRequired = true;
      reasons.push('Primary partially blind, using legal substitute');
    } else {
      permission = 'PARTIAL_VIEW_ONLY';
      confidencePenalty = 0.30;
      disclosureRequired = true;
      reasons.push('Primary partially blind, no legal substitute');
    }
  }

  // Gate 8: Health degraded → ALLOW_PRIMARY_WITH_HAIRCUT
  else if (healthState === 'H2_DEGRADED') {
    permission = 'ALLOW_PRIMARY_WITH_HAIRCUT';
    confidencePenalty = 0.15;
    disclosureRequired = true;
    reasons.push('Primary degraded — usable with confidence reduction');
  }

  // Gate 9: Integrity degraded parity → ALLOW with disclosure
  else if (integrityState === 'I2_DEGRADED_PARITY') {
    permission = 'ALLOW_PRIMARY_WITH_DISCLOSURE';
    confidencePenalty = 0.10;
    disclosureRequired = true;
    reasons.push(`Integrity degraded parity: ${integrityRecord.brokenDimensions.join(', ')}`);
  }

  // Gate 10: Health stressed → ALLOW with small haircut
  else if (healthState === 'H1_STRESSED') {
    permission = integrityState === 'I1_MINOR_DRIFT'
      ? 'ALLOW_PRIMARY_WITH_DISCLOSURE'
      : 'ALLOW_PRIMARY_WITH_HAIRCUT';
    confidencePenalty = 0.05;
    if (integrityState === 'I1_MINOR_DRIFT') {
      disclosureRequired = true;
      reasons.push('Minor integrity drift combined with health stress');
    } else {
      reasons.push('Primary stressed but intact');
    }
  }

  // Gate 11: Minor integrity drift on healthy source → ALLOW with disclosure
  else if (integrityState === 'I1_MINOR_DRIFT') {
    permission = 'ALLOW_PRIMARY_WITH_DISCLOSURE';
    confidencePenalty = 0.03;
    disclosureRequired = true;
    reasons.push('Minor integrity drift — same truth type, small parameter change');
  }

  // Gate 12: Everything healthy and intact → ALLOW_PRIMARY
  else {
    permission = 'ALLOW_PRIMARY';
    confidencePenalty = 0;
    reasons.push('Full authority: primary healthy, integrity intact');
  }

  // Apply recovery haircut on top if in any recovery state
  if (recoveryState !== 'STABLE' && recoveryState !== 'FULLY_RESTORED') {
    confidencePenalty = Math.min(1, confidencePenalty + recoveryHaircut * 0.5);
    if (!reasons.some(r => r.includes('recovery') || r.includes('recovering') || r.includes('probation'))) {
      reasons.push(`Recovery haircut: ${recoveryState} (+${(recoveryHaircut * 0.5 * 100).toFixed(0)}%)`);
    }
  }

  const speakable = CLAIM_PERMISSION_SPEAKABLE[permission];

  return {
    fieldId,
    providerId,
    truthClass,
    healthState,
    integrityState,
    permissionState: permission,
    recoveryState,
    disclosureRequired,
    confidencePenalty: Math.round(confidencePenalty * 1000) / 1000,
    reasonCodes: reasons,
    speakable,
    version: L14_PLATFORM_VERSION,
  };
}

/**
 * Compile permissions for all fields.
 */
export function compileAllPermissions(
  observations?: ObservedFieldMetadata[],
): HealthDecisionRecord[] {
  const obsMap = new Map<string, ObservedFieldMetadata>();
  if (observations) {
    for (const o of observations) obsMap.set(o.fieldId, o);
  }

  return Object.keys(FIELD_AUTHORITY_MAP).map(fieldId =>
    compilePermission(fieldId, obsMap.get(fieldId)),
  );
}

/**
 * Get all fields where speech is suppressed or blocked.
 */
export function getSuppressedFields(observations?: ObservedFieldMetadata[]): HealthDecisionRecord[] {
  return compileAllPermissions(observations).filter(r => !r.speakable);
}

/**
 * Get all fields that require disclosure.
 */
export function getDisclosureRequiredFields(observations?: ObservedFieldMetadata[]): HealthDecisionRecord[] {
  return compileAllPermissions(observations).filter(r => r.disclosureRequired);
}

/**
 * Get the aggregate speakability report: how many fields are speakable vs suppressed.
 */
export function getSpeakabilityReport(observations?: ObservedFieldMetadata[]): {
  total: number;
  speakable: number;
  suppressed: number;
  blocked: number;
  disclosureRequired: number;
  avgConfidencePenalty: number;
} {
  const all = compileAllPermissions(observations);
  const speakable = all.filter(r => r.speakable).length;
  const suppressed = all.filter(r => r.permissionState === 'SUPPRESS_CLAIM').length;
  const blocked = all.filter(r => r.permissionState === 'BLOCK_OUTPUT').length;
  const disc = all.filter(r => r.disclosureRequired).length;
  const avgPenalty = all.length > 0
    ? all.reduce((sum, r) => sum + r.confidencePenalty, 0) / all.length
    : 0;
  return {
    total: all.length,
    speakable,
    suppressed,
    blocked,
    disclosureRequired: disc,
    avgConfidencePenalty: Math.round(avgPenalty * 1000) / 1000,
  };
}
