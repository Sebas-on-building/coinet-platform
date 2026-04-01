/**
 * Redundancy Diagnostics — internal observability for substitution health.
 */

import type { ResolvedSubstitution, SubstitutionFingerprint, BlindSpotEscalation } from './types';
import { REDUNDANCY_RULES } from './truth-atom-rules';
import { resolveAllSubstitutions, type SubstitutionContext } from './resolver';
import { buildSubstitutionFingerprint } from './fingerprint';
import { getRecentEvents, getSubstitutionFrequency, getMostFragileAtoms } from './substitution-memory';
import { evaluateBlindSpotEscalation } from './blind-spot-escalation';
import { getActiveLockouts } from './claim-lockouts';
import { L13_REDUNDANCY_VERSION } from './types';

export interface RedundancyDiagnosticsReport {
  version: string;
  timestamp: string;
  totalRules: number;
  failStopCount: number;
  failSoftCount: number;
  resolutions: ResolvedSubstitution[];
  fingerprint: SubstitutionFingerprint;
  primaryHealthy: string[];
  substituted: string[];
  temporalFallback: string[];
  blind: string[];
  lockedOutClaims: string[];
  escalation: BlindSpotEscalation | null;
  recentEvents: ReturnType<typeof getRecentEvents>;
  mostFragileAtoms: ReturnType<typeof getMostFragileAtoms>;
  warnings: string[];
}

export function buildRedundancyDiagnostics(
  context: SubstitutionContext = {},
): RedundancyDiagnosticsReport {
  const allResolutions = resolveAllSubstitutions(context);
  const resolutions = [...allResolutions.values()];

  const fingerprint = buildSubstitutionFingerprint(context);

  const primaryHealthy = resolutions.filter(r => r.status === 'PRIMARY_HEALTHY').map(r => r.truthAtomId);
  const substituted = resolutions.filter(r => r.status === 'SECONDARY_SUBSTITUTED').map(r => r.truthAtomId);
  const temporalFallback = resolutions.filter(r => r.status === 'TEMPORAL_FALLBACK_ACTIVE').map(r => r.truthAtomId);
  const blind = resolutions.filter(r => r.status === 'BLIND').map(r => r.truthAtomId);

  const lockouts = getActiveLockouts(blind);

  const warnings: string[] = [];
  if (blind.length > 3) {
    warnings.push(`High blind-atom count: ${blind.length} truth atoms have no authority`);
  }
  if (fingerprint.escalation?.level === 'judgment_unsafe') {
    warnings.push('CRITICAL: compound blindness escalated to judgment_unsafe');
  }
  if (substituted.length + temporalFallback.length > resolutions.length * 0.4) {
    warnings.push(`High substitution burden: ${((substituted.length + temporalFallback.length) / resolutions.length * 100).toFixed(0)}% of atoms are substituted or temporal`);
  }

  const failStopRules = REDUNDANCY_RULES.filter(r => r.failMode === 'fail_stop');
  const blindFailStops = blind.filter(b => failStopRules.some(r => r.truthAtomId === b));
  if (blindFailStops.length > 0) {
    warnings.push(`FAIL-STOP atoms are blind: ${blindFailStops.join(', ')} — related strong claims must be refused`);
  }

  return {
    version: L13_REDUNDANCY_VERSION,
    timestamp: new Date().toISOString(),
    totalRules: REDUNDANCY_RULES.length,
    failStopCount: failStopRules.length,
    failSoftCount: REDUNDANCY_RULES.filter(r => r.failMode === 'fail_soft').length,
    resolutions,
    fingerprint,
    primaryHealthy,
    substituted,
    temporalFallback,
    blind,
    lockedOutClaims: lockouts.map(l => l.claimFamily),
    escalation: fingerprint.escalation,
    recentEvents: getRecentEvents(50),
    mostFragileAtoms: getMostFragileAtoms(10),
    warnings,
  };
}
