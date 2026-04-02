/**
 * L1.3 — Redundancy Matrix for BTC Quantum Loop fields.
 *
 * Each entry defines: what truth this field represents,
 * who may speak it, what fallback preserves truth,
 * and when substitution becomes a lie.
 */

import type { FieldRedundancyRule } from './redundancy-types';

export const REDUNDANCY_MATRIX: Record<string, FieldRedundancyRule> = {

  scriptDistribution: {
    fieldName: 'scriptDistribution',
    meaningClaim: 'Current or freshness-bounded BTC script-class balance distribution used to determine exposure structure.',
    primarySource: 'chain_indexed_utxo_classifier',
    secondarySource: 'external_chain_analytics_provider',

    acceptableSubstitutions: [
      { description: 'Recent cached primary snapshot', class: 'A', conditions: ['cache age within freshness window', 'schema matches logic version'] },
      { description: 'Recent cached secondary snapshot', class: 'B', conditions: ['cache age within freshness window', 'classification schema compatible'] },
      { description: 'Reconciled blend of primary + secondary', class: 'B', conditions: ['both recent', 'drift below tolerance', 'reconciliation noted'] },
    ],

    unacceptableSubstitutions: [
      'Previous judgment snapshot used as upstream input',
      'Manually guessed exposure percentages',
      'Stale historical averages with no freshness guarantee',
      'Narrative statements like "BTC exposure is high"',
      'Using key_exposure_rate feature output as substitute for raw distribution',
      'AI-generated or inferred script distribution',
    ],

    noFallbackConditions: [
      'No recent primary available',
      'No recent secondary available',
      'Schema mismatch between source and classifier',
      'Conflict between sources beyond drift tolerance',
      'Unknown share exceeds 30% of total',
    ],

    maxCacheAgeMs: 24 * 60 * 60 * 1000,       // 24h for primary cache
    maxStaleCacheAgeMs: 72 * 60 * 60 * 1000,   // 72h absolute max
    driftTolerancePct: 5,

    confidencePenalties: { A: 0.05, B: 0.15, C: 0.35, D: 1.0, E: 1.0 },

    downstreamClaimRestrictions: [
      'No high-confidence exposure statement',
      'No precise exposure percentage claim',
      'Directional claim blocked if confidence < 0.2',
    ],
  },

  dormantCohorts: {
    fieldName: 'dormantCohorts',
    meaningClaim: 'Age-bucketed BTC dormant supply distribution relevant to latent vulnerable supply estimation.',
    primarySource: 'chain_indexed_dormancy_engine',
    secondarySource: 'external_dormancy_analytics_provider',

    acceptableSubstitutions: [
      { description: 'Recent cached primary cohort snapshot', class: 'A', conditions: ['cache within dormancy freshness window'] },
      { description: 'Recent cached secondary cohort snapshot', class: 'B', conditions: ['bucket structure compatible', 'cache within freshness window'] },
      { description: 'Bounded carry-forward with stale discount', class: 'C', conditions: ['within stale window', 'bounds widened', 'confidence materially reduced'] },
    ],

    unacceptableSubstitutions: [
      'Reusing dormant_vulnerable_supply feature as raw cohort truth',
      'Narrative statements like "old BTC is inactive"',
      'Inferring dormancy from market calmness or volatility',
      'Manually fixed dormant number with no source lineage',
      'AI-generated dormancy estimates',
    ],

    noFallbackConditions: [
      'No valid cohort data available',
      'Stale carry-forward beyond permitted time window',
      'Major source conflict in dormant totals',
      'Cohort bucket structure incompatible with feature logic',
    ],

    maxCacheAgeMs: 7 * 24 * 60 * 60 * 1000,    // 7d — dormancy changes slowly
    maxStaleCacheAgeMs: 30 * 24 * 60 * 60 * 1000, // 30d absolute max with heavy penalty
    driftTolerancePct: 10,

    confidencePenalties: { A: 0.03, B: 0.10, C: 0.30, D: 1.0, E: 1.0 },

    downstreamClaimRestrictions: [
      'No confident "latent supply shock" language without valid cohort truth',
      'No precise vulnerable dormant supply figure unless sourced',
      'Slow-quantum scenario confidence must drop materially',
    ],
  },

  pqEvidence: {
    fieldName: 'pqEvidence',
    meaningClaim: 'Current evidence-based posture of Bitcoin PQ migration readiness including proposals, implementation, deployment, and adoption stage.',
    primarySource: 'deployed_code_state',
    secondarySource: 'governance_proposal_documents',

    acceptableSubstitutions: [
      { description: 'Governance-stage evidence for conceptual readiness', class: 'B', conditions: ['preserves stage distinction', 'no upgrade beyond evidence'] },
      { description: 'Recent verified roadmap for low-confidence stage', class: 'C', conditions: ['discussion-only evidence clearly marked', 'no deployment claim'] },
      { description: 'Last verified posture carry-forward', class: 'C', conditions: ['within long freshness window', 'no significant protocol event since', 'confidence penalty applied'] },
    ],

    unacceptableSubstitutions: [
      'Public marketing statements',
      'Generalized belief that Bitcoin is "working on quantum"',
      'Research paper threat models used as deployment evidence',
      'AI summarization without traceable source documents',
      'Assuming readiness from discussion volume alone',
    ],

    noFallbackConditions: [
      'Posture stage cannot be safely inferred',
      'Evidence sources disagree materially on stage',
      'No recent technical or governance evidence exists',
      'Source only supports aspirational intent, not stage classification',
    ],

    maxCacheAgeMs: 90 * 24 * 60 * 60 * 1000,   // 90d — PQC changes very slowly
    maxStaleCacheAgeMs: 180 * 24 * 60 * 60 * 1000,
    driftTolerancePct: 0,

    confidencePenalties: { A: 0.02, B: 0.15, C: 0.30, D: 1.0, E: 1.0 },

    downstreamClaimRestrictions: [
      'No "Bitcoin is migrating" claim without stage evidence',
      'No "migration reduces risk" statement unless real progress is evidenced',
    ],
  },

  totalSupply: {
    fieldName: 'totalSupply',
    meaningClaim: 'Reference BTC supply value used to normalize exposure and dormant metrics.',
    primarySource: 'chain_derived_emitted_supply',
    secondarySource: 'trusted_market_data_supply_field',

    acceptableSubstitutions: [
      { description: 'Recent cached primary supply', class: 'A', conditions: ['mismatch below tolerance'] },
      { description: 'Recent cached secondary supply', class: 'A', conditions: ['same supply definition used'] },
      { description: 'Deterministic protocol-level supply calculation', class: 'A', conditions: ['block height and reward schedule known'] },
    ],

    unacceptableSubstitutions: [
      'Manually typed constant with no timestamp',
      'Stale market-cap-derived reverse estimate',
      'Previous feature-normalized denominator reused without source',
    ],

    noFallbackConditions: [
      'Supply definition ambiguity (circulating vs emitted vs classified)',
      'Denominator type mismatch causing semantic break',
    ],

    maxCacheAgeMs: 24 * 60 * 60 * 1000,
    maxStaleCacheAgeMs: 7 * 24 * 60 * 60 * 1000,
    driftTolerancePct: 1,

    confidencePenalties: { A: 0.01, B: 0.05, C: 0.15, D: 1.0, E: 1.0 },

    downstreamClaimRestrictions: [
      'No precise exposure percentage if denominator definition unclear',
    ],
  },

  btcPriceContext: {
    fieldName: 'btcPriceContext',
    meaningClaim: 'Recent BTC market price and return context for reporting, calibration, or relevance overlays.',
    primarySource: 'trusted_market_data_feed',
    secondarySource: 'backup_market_feed',

    acceptableSubstitutions: [
      { description: 'Recent cached primary price', class: 'A', conditions: ['cache within market freshness window'] },
      { description: 'Recent cached secondary price', class: 'B', conditions: ['within tolerance of primary'] },
      { description: 'Reconciled median of two healthy feeds', class: 'A', conditions: ['both feeds healthy and recent'] },
    ],

    unacceptableSubstitutions: [
      'LLM-generated market summaries',
      'Old judgment text referencing price',
      'Social or news references to price',
    ],

    noFallbackConditions: [
      'Price feed conflict above tolerance',
      'Stale market context beyond 15min window',
    ],

    maxCacheAgeMs: 15 * 60 * 1000,
    maxStaleCacheAgeMs: 60 * 60 * 1000,
    driftTolerancePct: 2,

    confidencePenalties: { A: 0.02, B: 0.05, C: 0.15, D: 1.0, E: 1.0 },

    downstreamClaimRestrictions: [
      'Relevance/calibration context degrades if price missing',
    ],
  },

  outcomeMetrics: {
    fieldName: 'outcomeMetrics',
    meaningClaim: 'Post-snapshot realized outcomes used for calibration and edge testing.',
    primarySource: 'recorded_market_outcome_computation',
    secondarySource: 'fallback_price_feed_recomputation',

    acceptableSubstitutions: [
      { description: 'Recomputation from raw price history', class: 'A', conditions: ['same computation rules', 'same price source'] },
      { description: 'Secondary feed recomputation', class: 'B', conditions: ['within tolerance of primary', 'difference documented'] },
    ],

    unacceptableSubstitutions: [
      'Analyst judgment of what happened',
      'AI summary of market move',
      'Manually approximated return',
    ],

    noFallbackConditions: [
      'Cannot reconstruct price window accurately',
      'Snapshot linkage missing',
      'Outcome horizon window corrupted',
    ],

    maxCacheAgeMs: Infinity,
    maxStaleCacheAgeMs: Infinity,
    driftTolerancePct: 1,

    confidencePenalties: { A: 0.01, B: 0.05, C: 0.20, D: 1.0, E: 1.0 },

    downstreamClaimRestrictions: [
      'Calibration report must exclude affected rows',
      'No strong edge claim from incomplete outcome sample',
    ],
  },
};

export function getRedundancyRule(fieldName: string): FieldRedundancyRule | undefined {
  return REDUNDANCY_MATRIX[fieldName];
}

export function getAllFieldNames(): string[] {
  return Object.keys(REDUNDANCY_MATRIX);
}
