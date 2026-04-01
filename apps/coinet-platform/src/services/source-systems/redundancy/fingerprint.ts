/**
 * Substitution Fingerprint — builds a per-judgment redundancy summary
 * showing what is primary-backed, substituted, temporal, blind, or locked.
 */

import { TRUTH_CLASSES } from '../registry';
import type { SubstitutionFingerprint, SubstitutionFingerprintEntry, ResolvedSubstitution, BlindSpotEscalation } from './types';
import { L13_REDUNDANCY_VERSION } from './types';
import { resolveAllSubstitutions, type SubstitutionContext } from './resolver';
import { evaluateBlindSpotEscalation } from './blind-spot-escalation';
import { getRedundancyRule } from './truth-atom-rules';

export function buildSubstitutionFingerprint(
  context: SubstitutionContext = {},
): SubstitutionFingerprint {
  const allResolutions = resolveAllSubstitutions(context);
  const entries: SubstitutionFingerprintEntry[] = [];
  const allLockedClaims = new Set<string>();

  for (const [atomId, resolved] of allResolutions) {
    const rule = getRedundancyRule(atomId);
    entries.push({
      truthAtomId: atomId,
      truthClass: rule?.truthClass ?? 'market_surface' as any,
      status: resolved.status,
      mode: resolved.mode,
      activeSource: resolved.activeSourceId,
      confidencePenalty: resolved.penalty.totalConfidenceReduction,
    });

    for (const lc of resolved.lockedOutClaims) {
      allLockedClaims.add(lc);
    }
  }

  const totalSubstitutions = entries.filter(e =>
    e.status !== 'PRIMARY_HEALTHY' && e.status !== 'BLIND' && e.status !== 'LOCKED_OUT',
  ).length;
  const totalBlind = entries.filter(e => e.status === 'BLIND').length;

  const escalationInput = entries.map(e => ({
    truthAtomId: e.truthAtomId,
    truthClass: e.truthClass,
    status: e.status,
  }));
  const escalation = evaluateBlindSpotEscalation({ atomStatuses: escalationInput });

  if (escalation) {
    for (const f of escalation.affectedClaimFamilies) {
      allLockedClaims.add(f);
    }
  }

  const totalAtoms = entries.length;
  const healthyCount = entries.filter(e => e.status === 'PRIMARY_HEALTHY').length;
  const overallIntegrity = totalAtoms > 0 ? healthyCount / totalAtoms : 0;

  return {
    timestamp: new Date().toISOString(),
    entries,
    totalSubstitutions,
    totalBlind,
    lockedOutClaims: [...allLockedClaims],
    escalation,
    overallIntegrity,
    version: L13_REDUNDANCY_VERSION,
  };
}

export function formatSubstitutionFingerprintForAI(fp: SubstitutionFingerprint): string {
  const lines: string[] = ['## Substitution State'];

  const byClass = new Map<string, SubstitutionFingerprintEntry[]>();
  for (const e of fp.entries) {
    const existing = byClass.get(e.truthClass) ?? [];
    existing.push(e);
    byClass.set(e.truthClass, existing);
  }

  for (const [tc, atoms] of byClass) {
    if (tc === TRUTH_CLASSES.REASONING_EXPRESSION) continue;
    const label = tc.replace(/_/g, ' ');
    const statuses = new Set(atoms.map(a => a.status));

    if (statuses.has('BLIND')) {
      lines.push(`  ${label}: BLIND — ${atoms.filter(a => a.status === 'BLIND').length} atom(s) without authority`);
    } else if (statuses.has('TEMPORAL_FALLBACK_ACTIVE')) {
      lines.push(`  ${label}: temporal fallback`);
    } else if (statuses.has('SECONDARY_SUBSTITUTED') || statuses.has('ADJACENT_CONTINUITY_ONLY')) {
      lines.push(`  ${label}: substituted`);
    } else {
      lines.push(`  ${label}: primary healthy`);
    }
  }

  if (fp.lockedOutClaims.length > 0) {
    lines.push('');
    lines.push('Locked-out claims:');
    for (const c of fp.lockedOutClaims) {
      lines.push(`  - ${c}`);
    }
  }

  if (fp.escalation) {
    lines.push('');
    lines.push(`Escalation: ${fp.escalation.level} — ${fp.escalation.message}`);
  }

  lines.push(`Overall integrity: ${(fp.overallIntegrity * 100).toFixed(0)}%`);

  return lines.join('\n');
}
