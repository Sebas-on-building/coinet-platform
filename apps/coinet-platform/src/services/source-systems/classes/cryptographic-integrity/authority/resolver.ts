/**
 * L1.2 CI Authority Resolver — audit-grade
 *
 * Section 7 runtime logic:
 *  7.1 Source Classification Engine
 *  7.2 Authority Resolver (domain-aware, freshness-gated)
 *  7.3 Conflict Detection Engine
 *  7.4 Conflict Classification (structural / temporal / interpretive)
 *  7.5 Resolution Logic (consensus, disagreement, fallback, unresolved)
 *  7.6 Confidence Composer (5-component)
 *  7.7 Fallback Engine (explicit logging)
 *
 * Enforces doctrine rules:
 *  3.3 Behavior beats intention (override enforcement)
 *  3.4 Deployment beats proposal (override enforcement)
 *  3.5 Conflict preserved when material
 *  3.6 Authority does not remove uncertainty
 *  3.7 Fallback must be explicit
 */

import type {
  AuthorityClaim,
  AuthorityLevel,
  ConfidenceComposition,
  ConflictType,
  ConsensusState,
  CryptoTruthDomain,
  FieldAuthorityResolution,
  SourceAuthorityObject,
  TrustClass,
} from './types';
import {
  AUTHORITY_LEVEL_WEIGHT,
  CONFLICT_CONFIDENCE_PENALTY,
  DOMAIN_FRESHNESS_THRESHOLD_HOURS,
  FALLBACK_PENALTY_SCHEDULE,
  REALITY_HIERARCHY_WEIGHT,
  STRONG_INFERENCE_MIN_CONFIDENCE,
  TRUST_CLASS_WEIGHT,
  UNRESOLVED_PROHIBITION_MESSAGE,
  shouldOverride,
} from './doctrine';
import { getDomainForField, getSourceById, getSourcesForDomain } from './registry';

type ResolvedCandidate = {
  claim: AuthorityClaim;
  source: SourceAuthorityObject;
  ageHours: number;
  eligibleByFreshness: boolean;
  score: number;
};

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function computeAgeHours(now: Date, observedAt?: string): number {
  const dt = parseDate(observedAt);
  if (!dt) return Number.POSITIVE_INFINITY;
  return Math.max(0, (now.getTime() - dt.getTime()) / (1000 * 60 * 60));
}

function normalizeValue(value: unknown): string {
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try { return JSON.stringify(value); } catch { return String(value); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7.3 + 7.4 CONFLICT DETECTION & CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

function classifyConflict(candidates: ResolvedCandidate[]): ConflictType {
  if (candidates.length <= 1) return 'none';
  const values = new Set(candidates.map(c => normalizeValue(c.claim.value)));
  if (values.size <= 1) return 'none';

  const hasLargeAgeGap = candidates.some(c => c.ageHours > 24)
    && candidates.some(c => c.ageHours <= 24);
  if (hasLargeAgeGap) return 'temporal';

  const hasCodeVsObserved = candidates.some(c =>
    c.source.source_type === 'onchain_observation' || c.source.source_type === 'deployed_reality')
    && candidates.some(c =>
      c.source.source_type === 'statement' || c.source.source_type === 'proposal'
      || c.source.source_type === 'research');
  if (hasCodeVsObserved) return 'structural';

  return 'interpretive';
}

function detectConsensus(candidates: ResolvedCandidate[], selectedValue: unknown): ConsensusState {
  if (candidates.length === 0) return 'no_sources';
  if (candidates.length === 1) return 'single_source';
  const norm = normalizeValue(selectedValue);
  const agreeing = candidates.filter(c => normalizeValue(c.claim.value) === norm).length;
  return agreeing >= candidates.length * 0.7 ? 'consensus' : 'disagreement';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7.6 CONFIDENCE COMPOSER (5-component)
// ═══════════════════════════════════════════════════════════════════════════════

function composeConfidence(
  selected: ResolvedCandidate | null,
  agreementRatio: number,
  usedFallback: boolean,
  fallbackLevel: AuthorityLevel,
  conflictType: ConflictType,
): ConfidenceComposition {
  if (!selected) {
    return { authority_component: 0, agreement_component: 0, freshness_component: 0, coverage_component: 0, trust_component: 0, final_confidence: 0 };
  }

  const authority = AUTHORITY_LEVEL_WEIGHT[selected.source.authority_level];
  const freshness = selected.eligibleByFreshness ? Math.max(0, 1 - selected.ageHours / 72) : Math.max(0, 0.3 - selected.ageHours / 240);
  const coverage = selected.source.coverage;
  const trust = TRUST_CLASS_WEIGHT[selected.source.trust_class];

  const raw =
    authority * 0.3 +
    agreementRatio * 0.2 +
    freshness * 0.2 +
    coverage * 0.15 +
    trust * 0.15;

  const fallbackPenalty = usedFallback ? FALLBACK_PENALTY_SCHEDULE[fallbackLevel] : 0;
  const conflictPenalty = CONFLICT_CONFIDENCE_PENALTY[conflictType] ?? 0;
  const final = Math.max(0, Math.min(1, raw - fallbackPenalty - conflictPenalty));

  return {
    authority_component: authority,
    agreement_component: agreementRatio,
    freshness_component: freshness,
    coverage_component: coverage,
    trust_component: trust,
    final_confidence: final,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANDIDATE RANKING with doctrine override enforcement
// ═══════════════════════════════════════════════════════════════════════════════

function rankCandidate(c: ResolvedCandidate): number {
  const realityWeight = REALITY_HIERARCHY_WEIGHT[c.source.source_type] ?? 0.3;
  const authorityWeight = AUTHORITY_LEVEL_WEIGHT[c.source.authority_level];
  const trustWeight = TRUST_CLASS_WEIGHT[c.source.trust_class];
  const freshnessScore = c.eligibleByFreshness ? Math.max(0, 1 - c.ageHours / 72) : 0;
  return (
    realityWeight * 0.35 +
    authorityWeight * 0.25 +
    trustWeight * 0.2 +
    freshnessScore * 0.2
  );
}

function applyDoctrineOverrides(
  candidates: ResolvedCandidate[],
): { candidates: ResolvedCandidate[]; overrideApplied: string | null } {
  if (candidates.length < 2) return { candidates, overrideApplied: null };

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const override = shouldOverride(candidates[i].source.source_type, candidates[j].source.source_type);
      if (override && normalizeValue(candidates[i].claim.value) !== normalizeValue(candidates[j].claim.value)) {
        return { candidates, overrideApplied: override.id };
      }
      const reverseOverride = shouldOverride(candidates[j].source.source_type, candidates[i].source.source_type);
      if (reverseOverride && normalizeValue(candidates[i].claim.value) !== normalizeValue(candidates[j].claim.value)) {
        const reordered = [...candidates];
        const [moved] = reordered.splice(j, 1);
        reordered.unshift(moved);
        return { candidates: reordered, overrideApplied: reverseOverride.id };
      }
    }
  }
  return { candidates, overrideApplied: null };
}

function resolveCandidates(
  fieldId: string,
  claims: AuthorityClaim[],
  now: Date,
): { domain: CryptoTruthDomain; candidates: ResolvedCandidate[] } {
  const domain = getDomainForField(fieldId);
  const domainThresholds = DOMAIN_FRESHNESS_THRESHOLD_HOURS[domain];

  const fallbackSources = getSourcesForDomain(domain);
  const withFallback = claims.length > 0
    ? claims
    : fallbackSources.map(s => ({
      field_id: fieldId, source_id: s.source_id, value: 'unresolved' as const, observed_at: s.last_updated,
    }));

  const candidates: ResolvedCandidate[] = withFallback
    .map(claim => {
      const source = getSourceById(claim.source_id);
      if (!source) return null;
      const ageHours = computeAgeHours(now, claim.observed_at ?? source.last_updated);
      const maxAge = domainThresholds[source.authority_level];
      const eligibleByFreshness = ageHours <= maxAge;
      const base: ResolvedCandidate = { claim, source, ageHours, eligibleByFreshness, score: 0 };
      base.score = rankCandidate(base);
      return base;
    })
    .filter((x): x is ResolvedCandidate => Boolean(x));

  candidates.sort((a, b) => b.score - a.score);
  return { domain, candidates };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7.2 + 7.5 MAIN RESOLVER
// ═══════════════════════════════════════════════════════════════════════════════

export function resolveFieldAuthority(
  fieldId: string,
  claims: AuthorityClaim[],
  now = new Date(),
): FieldAuthorityResolution {
  const { domain, candidates: rawCandidates } = resolveCandidates(fieldId, claims, now);

  if (rawCandidates.length === 0) {
    return {
      field_id: fieldId, truth_domain: domain,
      selected_source: null, selected_authority_level: null, selected_trust_class: null,
      used_fallback: true, fallback_reason: 'no_candidate_sources', degradation_flag: true,
      conflict_type: 'none', consensus_state: 'no_sources',
      prohibit_strong_inference: true, override_applied: null,
      conflicts: [], candidate_sources: [],
      confidence: composeConfidence(null, 0, true, 'speculative', 'none'),
      attribution: null,
      rationale: ['No authority sources available for this field', UNRESOLVED_PROHIBITION_MESSAGE],
    };
  }

  const { candidates, overrideApplied } = applyDoctrineOverrides(rawCandidates);

  const primaryFresh = candidates.filter(c => c.source.authority_level === 'primary' && c.eligibleByFreshness);
  const secondaryFresh = candidates.filter(c => c.source.authority_level === 'secondary' && c.eligibleByFreshness);
  const supportingFresh = candidates.filter(c => c.source.authority_level === 'supporting' && c.eligibleByFreshness);

  const selected = primaryFresh[0] ?? secondaryFresh[0] ?? supportingFresh[0] ?? candidates[0];
  const usedFallback = primaryFresh.length === 0;
  const fallbackLevel = selected.source.authority_level;
  const fallbackReason = usedFallback
    ? primaryFresh.length === 0 && secondaryFresh.length > 0
      ? 'primary_missing_or_stale'
      : primaryFresh.length === 0 && secondaryFresh.length === 0 && supportingFresh.length > 0
        ? 'primary_and_secondary_missing_or_stale'
        : 'all_higher_authority_missing'
    : null;

  const comparisonPool = primaryFresh.length > 1
    ? primaryFresh
    : candidates.filter(c => c.eligibleByFreshness).slice(0, 4);
  const conflictType = classifyConflict(comparisonPool);

  const normalized = comparisonPool.map(c => normalizeValue(c.claim.value));
  const selectedNorm = normalizeValue(selected.claim.value);
  const agreementRatio = normalized.length <= 1
    ? 1
    : normalized.filter(v => v === selectedNorm).length / normalized.length;

  const consensusState = detectConsensus(comparisonPool, selected.claim.value);
  const confidence = composeConfidence(selected, agreementRatio, usedFallback, fallbackLevel, conflictType);
  const prohibitStrong = confidence.final_confidence < STRONG_INFERENCE_MIN_CONFIDENCE;
  const degradation = usedFallback || !selected.eligibleByFreshness || conflictType !== 'none';

  const conflicts = comparisonPool
    .filter(c => normalizeValue(c.claim.value) !== selectedNorm)
    .map(c => ({
      source_id: c.source.source_id,
      authority_level: c.source.authority_level,
      value_preview: normalizeValue(c.claim.value).slice(0, 120),
      reason: conflictType === 'temporal' ? 'stale_or_temporally_inconsistent'
        : conflictType === 'structural' ? 'structural_claim_disagreement'
          : 'interpretive_disagreement',
    }));

  const rationale: string[] = [
    `Domain: ${domain}`,
    `Selected: ${selected.source.source_id} (${selected.source.authority_level}, ${selected.source.trust_class})`,
    `Consensus: ${consensusState}`,
  ];
  if (usedFallback) rationale.push(`Fallback: ${fallbackReason}`);
  if (overrideApplied) rationale.push(`Doctrine override applied: ${overrideApplied}`);
  if (conflictType !== 'none') rationale.push(`Conflict preserved: ${conflictType} (penalty: -${(CONFLICT_CONFIDENCE_PENALTY[conflictType] * 100).toFixed(0)}%)`);
  if (prohibitStrong) rationale.push(UNRESOLVED_PROHIBITION_MESSAGE);

  return {
    field_id: fieldId, truth_domain: domain,
    selected_source: selected.source.source_id,
    selected_authority_level: selected.source.authority_level,
    selected_trust_class: selected.source.trust_class,
    used_fallback: usedFallback, fallback_reason: fallbackReason,
    degradation_flag: degradation,
    conflict_type: conflictType,
    consensus_state: consensusState,
    prohibit_strong_inference: prohibitStrong,
    override_applied: overrideApplied,
    conflicts, candidate_sources: candidates.map(c => c.source.source_id),
    confidence,
    attribution: {
      source_origin: [selected.source.source_id],
      authority_level: selected.source.authority_level,
      trust_class: selected.source.trust_class,
      evidence_mode: selected.claim.evidence_mode ?? 'inferred',
      confidence: confidence.final_confidence,
    },
    rationale,
  };
}

export function resolveAuthorityForFields(
  claimsByField: Record<string, AuthorityClaim[]>,
  now = new Date(),
): FieldAuthorityResolution[] {
  return Object.entries(claimsByField).map(([fieldId, claims]) =>
    resolveFieldAuthority(fieldId, claims, now),
  );
}

// 7.1 Source Classification Engine
export function classifySourceForDomain(sourceId: string): {
  source_id: string;
  truth_domain: CryptoTruthDomain | null;
  authority_level: AuthorityLevel | null;
  trust_class: TrustClass | null;
} {
  const source = getSourceById(sourceId);
  if (!source) return { source_id: sourceId, truth_domain: null, authority_level: null, trust_class: null };
  return { source_id: sourceId, truth_domain: source.truth_domain, authority_level: source.authority_level, trust_class: source.trust_class };
}
