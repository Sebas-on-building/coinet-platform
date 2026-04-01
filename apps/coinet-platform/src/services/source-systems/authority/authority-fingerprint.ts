/**
 * Authority Fingerprint Builder — Strategy 5.
 *
 * Every judgment should carry an authority fingerprint showing
 * which truth domains were primary-led, which used fallback,
 * which were challenged, and which were blind.
 */

import type { TruthClass } from '../registry';
import { TRUTH_CLASSES } from '../registry';
import type {
  AuthorityFingerprint,
  AuthorityFingerprintEntry,
  AuthoritySubstitutionEvent,
  ResolvedAuthority,
  AuthorityStatus,
  AuthorityStrength,
} from './types';
import { L12_AUTHORITY_VERSION } from './types';

export function buildAuthorityFingerprint(
  resolutions: Map<string, ResolvedAuthority>,
): AuthorityFingerprint {
  const classMap = new Map<TruthClass, AuthorityFingerprintEntry>();
  const contestedAtoms: string[] = [];
  const blindDomains: string[] = [];
  const substitutions: AuthoritySubstitutionEvent[] = [];

  for (const tc of Object.values(TRUTH_CLASSES)) {
    classMap.set(tc, {
      truthClass: tc,
      status: 'BLIND',
      primarySource: null,
      wasSubstituted: false,
      wasChallenged: false,
      strength: 'WEAK',
    });
  }

  for (const [atomId, resolved] of resolutions) {
    const atom = atomId.split('.')[0];
    let tc: TruthClass | undefined;

    for (const [key, value] of Object.entries(TRUTH_CLASSES)) {
      const prefix = atomToClassPrefix(atomId);
      if (value === prefix) {
        tc = value;
        break;
      }
    }

    if (!tc) {
      tc = inferClassFromAtom(atomId);
    }
    if (!tc) continue;

    const existing = classMap.get(tc)!;

    if (statusPriority(resolved.status) > statusPriority(existing.status)) {
      existing.status = resolved.status;
    } else if (resolved.status === 'HEALTHY' && existing.status === 'BLIND') {
      existing.status = resolved.status;
    }

    if (resolved.activePrimary && !existing.primarySource) {
      existing.primarySource = resolved.activePrimary;
    }

    if (strengthPriority(resolved.strength) > strengthPriority(existing.strength)) {
      existing.strength = resolved.strength;
    }

    if (resolved.outcome === 'SECONDARY_SUBSTITUTED') {
      existing.wasSubstituted = true;
      substitutions.push({
        truthAtomId: atomId,
        originalPrimary: 'unknown',
        substitutedWith: resolved.activeSecondary ?? 'unknown',
        reason: resolved.rationale.join('; '),
      });
    }

    if (resolved.outcome === 'PRIMARY_CONTESTED' || resolved.outcome === 'UNRESOLVED_CONFLICT') {
      existing.wasChallenged = true;
      contestedAtoms.push(atomId);
    }

    if (resolved.outcome === 'AUTHORITY_BLIND') {
      if (!blindDomains.includes(tc)) blindDomains.push(tc);
    }
  }

  const entries = [...classMap.values()];

  for (const entry of entries) {
    if (entry.status === 'BLIND' && !blindDomains.includes(entry.truthClass)) {
      if (entry.truthClass !== TRUTH_CLASSES.REASONING_EXPRESSION) {
        blindDomains.push(entry.truthClass);
      }
    }
  }

  const healthyCount = entries.filter(e => e.status === 'HEALTHY' || e.status === 'PARTIAL').length;
  const totalObservational = entries.filter(e => e.truthClass !== TRUTH_CLASSES.REASONING_EXPRESSION).length;
  const overallAuthorityScore = totalObservational > 0 ? healthyCount / totalObservational : 0;

  return {
    timestamp: new Date().toISOString(),
    entries,
    contestedAtoms,
    blindDomains,
    substitutions,
    overallAuthorityScore,
    version: L12_AUTHORITY_VERSION,
  };
}

export function formatAuthorityFingerprintForAI(fp: AuthorityFingerprint): string {
  const lines: string[] = ['## Authority Fingerprint'];

  for (const entry of fp.entries) {
    if (entry.truthClass === TRUTH_CLASSES.REASONING_EXPRESSION) continue;
    const label = entry.truthClass.replace(/_/g, ' ');
    let statusLine = `  ${label}: ${entry.status.toLowerCase()}`;
    if (entry.primarySource) statusLine += ` (${entry.primarySource})`;
    if (entry.wasSubstituted) statusLine += ' [substituted]';
    if (entry.wasChallenged) statusLine += ' [challenged]';
    lines.push(statusLine);
  }

  if (fp.blindDomains.length > 0) {
    lines.push('');
    lines.push(`Blind domains: ${fp.blindDomains.join(', ')}`);
  }

  if (fp.contestedAtoms.length > 0) {
    lines.push(`Contested atoms: ${fp.contestedAtoms.join(', ')}`);
  }

  if (fp.substitutions.length > 0) {
    lines.push(`Substitutions: ${fp.substitutions.length}`);
  }

  lines.push(`Overall authority: ${(fp.overallAuthorityScore * 100).toFixed(0)}%`);

  return lines.join('\n');
}

export function formatAuthorityFingerprintCompact(
  fp: AuthorityFingerprint,
): Record<string, { status: string; source: string | null; challenged: boolean }> {
  const result: Record<string, { status: string; source: string | null; challenged: boolean }> = {};
  for (const entry of fp.entries) {
    if (entry.truthClass === TRUTH_CLASSES.REASONING_EXPRESSION) continue;
    result[entry.truthClass] = {
      status: entry.status,
      source: entry.primarySource,
      challenged: entry.wasChallenged,
    };
  }
  return result;
}

function atomToClassPrefix(atomId: string): string | undefined {
  const prefixMap: Record<string, string> = {
    price: 'market_surface',
    volume: 'market_surface',
    market_cap: 'market_surface',
    fdv: 'market_surface',
    liquidity: 'market_surface',
    pair: 'dex_emergence',
    oi: 'derivatives_pressure',
    funding: 'derivatives_pressure',
    liq: 'derivatives_pressure',
    crowding: 'derivatives_pressure',
    long_short: 'derivatives_pressure',
    protocol: 'protocol_substance',
    wallet: 'onchain_behavior',
    contract: 'onchain_behavior',
    security: 'structural_safety',
    narrative: 'narrative_attention',
    sentiment: 'narrative_attention',
    news: 'narrative_attention',
    social: 'narrative_attention',
    entity: 'entity_context',
  };
  const prefix = atomId.split('.')[0];
  return prefixMap[prefix];
}

function inferClassFromAtom(atomId: string): TruthClass | undefined {
  return atomToClassPrefix(atomId) as TruthClass | undefined;
}

function statusPriority(status: AuthorityStatus): number {
  const map: Record<AuthorityStatus, number> = {
    HEALTHY: 6,
    PARTIAL: 5,
    CONTESTED: 4,
    DEGRADED: 3,
    STALE: 2,
    BLIND: 1,
  };
  return map[status] ?? 0;
}

function strengthPriority(s: AuthorityStrength): number {
  const map: Record<AuthorityStrength, number> = { ABSOLUTE: 4, HIGH: 3, MEDIUM: 2, WEAK: 1 };
  return map[s] ?? 0;
}
