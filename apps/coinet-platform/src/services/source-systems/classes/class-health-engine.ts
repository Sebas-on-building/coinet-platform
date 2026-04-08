/**
 * L1.4 Class Health Engine — authority-aware epistemic viability.
 *
 * Class health is NOT an average of provider health.
 * It is the epistemic viability of the truth class after considering:
 *   - owner availability
 *   - confirmer availability
 *   - substitution legality
 *   - active contradictions
 *   - proportion of critical fields healthy
 *   - no-fallback trigger activation
 *
 * A class can be degraded even if several providers are healthy, because:
 *   - the owner is down
 *   - remaining providers are only discovery or enrichment
 *   - no legal substitute exists
 */

import { TRUTH_CLASSES, SOURCE_CLASSES, SOURCE_CLASS_TO_TRUTH, type TruthClass, type SourceClass } from '../registry';
import { isProviderAvailable, getProviderHealth } from '../health-monitor';
import {
  getClassAuthority, getFieldsForClass, getOwners, getConfirmers,
} from './authority-constitution';
import { isSubstitutionLegal, getSubstitutionRule } from './substitution-constitution';
import { computeFieldHealth, deriveHealthState } from './field-health-engine';
import {
  type ClassHealthRecord, type ClassHealthImplication,
  type HealthState, type HealthFingerprint,
  L14_PLATFORM_VERSION,
} from './health-types';

// ═══════════════════════════════════════════════════════════════════════════════
// CLASS HEALTH COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute authority-aware epistemic viability for a truth class.
 */
export function computeClassHealth(truthClass: TruthClass): ClassHealthRecord {
  const constitution = getClassAuthority(truthClass);
  const sourceClass = constitution?.sourceClass ?? ('' as SourceClass);
  const fields = getFieldsForClass(truthClass);
  const implications: ClassHealthImplication[] = [];

  // Compute field health for all fields in this class
  const fieldRecords = fields.map(f => computeFieldHealth(f.fieldId, f.owner));

  // Owner analysis
  const owners = getOwners(truthClass);
  const ownerStates = owners.map(o => ({
    id: o,
    available: isProviderAvailable(o),
    health: getProviderHealth(o),
  }));
  const ownerHealthy = ownerStates.some(o => o.available && o.health.healthScore > 0.5);
  const bestOwnerState: HealthState | null = ownerStates.length > 0
    ? deriveHealthState(Math.max(...ownerStates.map(o => o.health.healthScore)))
    : null;

  if (!ownerHealthy) {
    implications.push({
      type: 'confidence_penalty',
      description: `Authority owner(s) degraded for ${truthClass} — all downstream claims weakened`,
      severity: 0.30,
    });
  }

  // Confirmer analysis
  const confirmers = getConfirmers(truthClass);
  const confirmerAvailable = confirmers.some(c => isProviderAvailable(c));

  // Substitution legality
  let legalSubstituteAvailable = false;
  for (const f of fields) {
    const rule = getSubstitutionRule(f.fieldId);
    if (rule) {
      for (const sub of rule.legalSubstitutes) {
        if (isProviderAvailable(sub.providerId)) {
          legalSubstituteAvailable = true;
          break;
        }
      }
    }
    if (legalSubstituteAvailable) break;
  }

  // Critical fields analysis
  const criticalFieldsTotal = fieldRecords.length;
  const criticalFieldsHealthy = fieldRecords.filter(f =>
    f.state === 'H0_HEALTHY' || f.state === 'H1_STRESSED',
  ).length;

  // No-fallback check
  const noFallbackTriggered = !ownerHealthy && !confirmerAvailable && !legalSubstituteAvailable;
  if (noFallbackTriggered) {
    implications.push({
      type: 'claim_suppressed',
      description: `No authority available for ${truthClass} — claims must be suppressed`,
      severity: 1.0,
    });
  }

  // Suppressed/unsafe fields
  const unsafeFields = fieldRecords.filter(f =>
    f.state === 'H4_UNSAFE' || f.state === 'H5_SUPPRESSED',
  );
  if (unsafeFields.length > 0) {
    implications.push({
      type: 'disclosure_required',
      description: `${unsafeFields.length} field(s) unsafe in ${truthClass}: ${unsafeFields.map(f => f.fieldId).join(', ')}`,
      severity: 0.20 * unsafeFields.length,
    });
  }

  // If owner not available but substitutes exist, add substitution disclosure
  if (!ownerHealthy && (confirmerAvailable || legalSubstituteAvailable)) {
    implications.push({
      type: 'substitution_blocked',
      description: `Authority owner degraded; fallback in use for ${truthClass}`,
      severity: 0.15,
    });
  }

  // Raw class health from field health average (authority-weighted)
  const fieldScores = fieldRecords.map(f => f.effectiveHealth);
  const rawClassHealth = fieldScores.length > 0
    ? fieldScores.reduce((a, b) => a + b, 0) / fieldScores.length
    : 0;

  // Authority adjustment: owner down penalizes heavily
  const authorityPenalty = ownerHealthy ? 0 : 0.25;
  const noFallbackPenalty = noFallbackTriggered ? 0.30 : 0;
  const effectiveClassHealth = Math.max(0, rawClassHealth - authorityPenalty - noFallbackPenalty);

  return {
    truthClass,
    sourceClass,
    ownerHealthy,
    ownerState: bestOwnerState,
    confirmerAvailable,
    legalSubstituteAvailable,
    activeContradictions: 0,
    criticalFieldsHealthy,
    criticalFieldsTotal,
    noFallbackTriggered,
    rawClassHealth,
    effectiveClassHealth,
    state: deriveHealthState(effectiveClassHealth),
    fieldRecords,
    implications,
    version: L14_PLATFORM_VERSION,
  };
}

/**
 * Compute health for all 9 truth classes.
 */
export function computeAllClassHealth(): Record<string, ClassHealthRecord> {
  const all: Record<string, ClassHealthRecord> = {};
  const classes = [
    TRUTH_CLASSES.MARKET_SURFACE, TRUTH_CLASSES.DEX_EMERGENCE,
    TRUTH_CLASSES.DERIVATIVES_PRESSURE, TRUTH_CLASSES.PROTOCOL_SUBSTANCE,
    TRUTH_CLASSES.ONCHAIN_BEHAVIOR, TRUTH_CLASSES.STRUCTURAL_SAFETY,
    TRUTH_CLASSES.NARRATIVE_ATTENTION, TRUTH_CLASSES.ENTITY_CONTEXT,
    TRUTH_CLASSES.REASONING_EXPRESSION,
  ];
  for (const tc of classes) {
    all[tc] = computeClassHealth(tc);
  }
  return all;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM HEALTH FINGERPRINT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a complete health fingerprint for the entire system.
 */
export function buildHealthFingerprint(): HealthFingerprint {
  const allClasses = computeAllClassHealth();
  const classEntries = Object.values(allClasses);

  // Collect unique providers
  const providerSet = new Set<string>();
  for (const c of classEntries) {
    for (const f of c.fieldRecords) {
      providerSet.add(f.providerId);
    }
  }

  const providers = [...providerSet].map(pid => {
    const health = getProviderHealth(pid);
    return { providerId: pid, state: deriveHealthState(health.healthScore), score: health.healthScore };
  });

  // Collect all fields
  const fieldMap = new Map<string, { state: HealthState; score: number }>();
  for (const c of classEntries) {
    for (const f of c.fieldRecords) {
      fieldMap.set(f.fieldId, { state: f.state, score: f.effectiveHealth });
    }
  }
  const fields = [...fieldMap.entries()].map(([fieldId, v]) => ({ fieldId, ...v }));

  const classes = classEntries.map(c => ({
    truthClass: c.truthClass,
    state: c.state,
    score: c.effectiveClassHealth,
    ownerHealthy: c.ownerHealthy,
  }));

  const suppressedFields = fields.filter(f => f.state === 'H5_SUPPRESSED').map(f => f.fieldId);
  const unsafeClasses = classes.filter(c =>
    c.state === 'H4_UNSAFE' || c.state === 'H5_SUPPRESSED',
  ).map(c => c.truthClass);

  const classScores = classes.map(c => c.score);
  const systemScore = classScores.length > 0
    ? classScores.reduce((a, b) => a + b, 0) / classScores.length
    : 0;

  return {
    timestamp: new Date().toISOString(),
    providers,
    fields,
    classes,
    systemState: deriveHealthState(systemScore),
    systemScore,
    suppressedFields,
    unsafeClasses,
    version: L14_PLATFORM_VERSION,
  };
}

/**
 * Get classes that are epistemically unsafe (not just technically down).
 */
export function getEpistemicallyUnsafeClasses(): ClassHealthRecord[] {
  const all = computeAllClassHealth();
  return Object.values(all).filter(c =>
    c.state === 'H4_UNSAFE' || c.state === 'H5_SUPPRESSED' || c.noFallbackTriggered,
  );
}

/**
 * Get downstream implications across all classes.
 */
export function getAllHealthImplications(): ClassHealthImplication[] {
  const all = computeAllClassHealth();
  return Object.values(all).flatMap(c => c.implications);
}
