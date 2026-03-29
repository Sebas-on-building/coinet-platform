/**
 * Evidence Mapper — binds observed signals to hypotheses via explicit evidence links.
 */

import type { SignalSnapshot } from '../judgment/types';
import type { HypothesisId, HypothesisEvidenceLink, CoverageState } from './types';
import { HYPOTHESIS_DEFINITIONS } from './registry';
import { EVIDENCE_KEY_MAP } from './evidence-mapper-keys';

const SUPPORT_THRESHOLD = 0.25;
const CONTRADICT_THRESHOLD = 0.3;

export function mapEvidenceForHypothesis(
  hypothesisId: HypothesisId,
  signals: SignalSnapshot,
  coverage: CoverageState,
): {
  supportLinks: HypothesisEvidenceLink[];
  contradictionLinks: HypothesisEvidenceLink[];
  missingLinks: HypothesisEvidenceLink[];
} {
  const def = HYPOTHESIS_DEFINITIONS[hypothesisId];
  const supportLinks: HypothesisEvidenceLink[] = [];
  const contradictionLinks: HypothesisEvidenceLink[] = [];
  const missingLinks: HypothesisEvidenceLink[] = [];

  for (const key of def.typicalSupports) {
    const mapping = EVIDENCE_KEY_MAP[key];
    if (!mapping) continue;

    const domainMissing = mapping.sourceDomains.some(d => coverage.missingDomains.includes(d));
    const domainStale = mapping.sourceDomains.some(d => coverage.staleDomains.includes(d));

    if (domainMissing) {
      missingLinks.push({
        evidenceKey: key, polarity: 'missing', weight: 0.15,
        reason: `Source domain ${mapping.sourceDomains.join('/')} unavailable`,
        sourceDomains: mapping.sourceDomains,
      });
      continue;
    }

    const value = Math.max(0, Math.min(1, mapping.extract(signals)));
    const link: HypothesisEvidenceLink = {
      evidenceKey: key, polarity: value >= SUPPORT_THRESHOLD ? 'support' : 'missing',
      weight: value, observedValue: value, normalizedValue: value,
      reason: value >= SUPPORT_THRESHOLD ? `${key} present at ${(value * 100).toFixed(0)}%` : `${key} below threshold`,
      sourceDomains: mapping.sourceDomains,
      stale: domainStale,
      freshnessPenaltyApplied: domainStale ? 0.15 : 0,
    };

    if (value >= SUPPORT_THRESHOLD) supportLinks.push(link);
    else missingLinks.push({ ...link, polarity: 'missing' });
  }

  for (const key of def.typicalContradictions) {
    const mapping = EVIDENCE_KEY_MAP[key];
    if (!mapping) continue;
    const domainMissing = mapping.sourceDomains.some(d => coverage.missingDomains.includes(d));
    if (domainMissing) continue;

    const value = Math.max(0, Math.min(1, mapping.extract(signals)));
    if (value >= CONTRADICT_THRESHOLD) {
      contradictionLinks.push({
        evidenceKey: key, polarity: 'contradict', weight: value,
        observedValue: value, normalizedValue: value,
        reason: `${key} contradicts at ${(value * 100).toFixed(0)}%`,
        sourceDomains: mapping.sourceDomains,
      });
    }
  }

  return { supportLinks, contradictionLinks, missingLinks };
}

export function buildCoverageState(signals: SignalSnapshot): CoverageState {
  const missing = signals._missing ? [...signals._missing] : [];
  const allDomains = [
    'market_surface', 'dex_emergence', 'derivatives_pressure',
    'protocol_substance', 'onchain_behavior', 'structural_safety',
    'narrative_attention', 'entity_context',
  ];
  const available = allDomains.filter(d => !missing.includes(d));
  const stale: string[] = [];
  if (signals.data_freshness < 0.4) stale.push(...available);

  return {
    availableDomains: available,
    missingDomains: missing,
    staleDomains: stale,
    overallCompleteness: signals.data_completeness,
    overallFreshness: signals.data_freshness,
  };
}
