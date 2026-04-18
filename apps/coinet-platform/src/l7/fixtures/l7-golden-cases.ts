/**
 * L7.8 — Golden Validation Cases
 *
 * §7.8.2.4 (fixture artifacts), §7.8.8.3 — Canonical, replay-stable
 * truth-testing cases covering every `L7ValidationClass` and every
 * registered `L7ValidationFamilyId`. Their `replay_hash` must remain
 * stable across versions unless a §7.8.7.2 migration explicitly changes
 * semantics.
 *
 * These fixtures are shaped as *projections* of the already-built L7.2
 * object model (not new objects). Band-level tests compare observed
 * runtime outputs against these golden rows; drift against them is a
 * regression (§7.8.4.1 Band A/C, §7.8.4.2 Band H/J).
 */

import { L7ValidationFamilyId } from '../contracts/validation-family-definition';
import { L7ValidationClass } from '../contracts/validation-output-class';
import { L7ConfidenceBand } from '../contracts/confidence-assessment';
import { L7ContradictionFamily } from '../contracts/contradiction-bundle';

export interface L7GoldenValidationCase {
  readonly case_id: string;
  readonly family: L7ValidationFamilyId;
  readonly subject_ref: string;
  readonly scope_type: 'ASSET' | 'PROTOCOL' | 'ENTITY' | 'SECTOR';
  readonly scope_id: string;
  readonly as_of: string;
  readonly expected_class: L7ValidationClass;
  readonly expected_modifiers: readonly string[];
  readonly contradiction_families: readonly L7ContradictionFamily[];
  readonly expected_confidence_band: L7ConfidenceBand;
  readonly restriction_profile_id: string | null;
  readonly replay_hash: string;
  readonly description: string;
}

export const L7_GOLDEN_VALIDATION_CASES: readonly L7GoldenValidationCase[] =
  Object.freeze([
    {
      case_id: 'gv.market.clean_confirmed.btc',
      family: L7ValidationFamilyId.MARKET_STRENGTH_VALIDATION,
      subject_ref: 'vs.market_strength.btc.v1',
      scope_type: 'ASSET', scope_id: 'BTC',
      as_of: '2026-01-15T12:00:00Z',
      expected_class: L7ValidationClass.CONFIRMED,
      expected_modifiers: [],
      contradiction_families: [],
      expected_confidence_band: L7ConfidenceBand.HIGH,
      restriction_profile_id: null,
      replay_hash: 'vh.market.confirmed.btc.v1.h0001',
      description: 'All support surfaces agree; no challenges; no staleness.',
    },
    {
      case_id: 'gv.market.weakly_confirmed.eth',
      family: L7ValidationFamilyId.MARKET_STRENGTH_VALIDATION,
      subject_ref: 'vs.market_strength.eth.v1',
      scope_type: 'ASSET', scope_id: 'ETH',
      as_of: '2026-01-15T12:00:00Z',
      expected_class: L7ValidationClass.WEAKLY_CONFIRMED,
      expected_modifiers: ['INCOMPLETE_SUPPORT_PRESENT'],
      contradiction_families: [],
      expected_confidence_band: L7ConfidenceBand.MODERATE,
      restriction_profile_id: 'rp.reduced_reliance.moderate.v1',
      replay_hash: 'vh.market.weakly.eth.v1.h0002',
      description: 'Majority support; one expected surface is missing but not critical.',
    },
    {
      case_id: 'gv.derivatives.conflicting.sol',
      family: L7ValidationFamilyId.DERIVATIVES_CONTRADICTION_VALIDATION,
      subject_ref: 'vs.derivatives_contradiction.sol.v1',
      scope_type: 'ASSET', scope_id: 'SOL',
      as_of: '2026-01-15T12:00:00Z',
      expected_class: L7ValidationClass.CONFLICTING,
      expected_modifiers: ['UNRESOLVED_CONTRADICTION_PRESENT'],
      contradiction_families: [L7ContradictionFamily.PRICE_FLOW_DIVERGENCE],
      expected_confidence_band: L7ConfidenceBand.LOW,
      restriction_profile_id: 'rp.contradicted_claim.strict.v1',
      replay_hash: 'vh.derivatives.conflicting.sol.v1.h0003',
      description: 'Funding vs OI vs price flow diverge; bundle required.',
    },
    {
      case_id: 'gv.protocol.insufficient.arb',
      family: L7ValidationFamilyId.PROTOCOL_SUBSTANCE_VALIDATION,
      subject_ref: 'vs.protocol_substance.arb.v1',
      scope_type: 'PROTOCOL', scope_id: 'ARB',
      as_of: '2026-01-15T12:00:00Z',
      expected_class: L7ValidationClass.INSUFFICIENT,
      expected_modifiers: ['INCOMPLETE_SUPPORT_PRESENT'],
      contradiction_families: [],
      expected_confidence_band: L7ConfidenceBand.LOW,
      restriction_profile_id: 'rp.insufficient_support.strict.v1',
      replay_hash: 'vh.protocol.insufficient.arb.v1.h0004',
      description: 'Required support surfaces not available; confirmation blocked.',
    },
    {
      case_id: 'gv.narrative.stale.pepe',
      family: L7ValidationFamilyId.NARRATIVE_VALIDATION,
      subject_ref: 'vs.narrative.pepe.v1',
      scope_type: 'ASSET', scope_id: 'PEPE',
      as_of: '2026-01-15T12:00:00Z',
      expected_class: L7ValidationClass.STALE,
      expected_modifiers: ['STALE_SUPPORT_PRESENT'],
      contradiction_families: [L7ContradictionFamily.SIGNAL_STALENESS],
      expected_confidence_band: L7ConfidenceBand.LOW,
      restriction_profile_id: 'rp.stale.moderate.v1',
      replay_hash: 'vh.narrative.stale.pepe.v1.h0005',
      description: 'Freshness window violated; stale support may not masquerade as fresh.',
    },
    {
      case_id: 'gv.accumulation.ambiguous.doge',
      family: L7ValidationFamilyId.ACCUMULATION_VALIDATION,
      subject_ref: 'vs.accumulation.doge.v1',
      scope_type: 'ASSET', scope_id: 'DOGE',
      as_of: '2026-01-15T12:00:00Z',
      expected_class: L7ValidationClass.AMBIGUOUS,
      expected_modifiers: ['AMBIGUOUS_DIRECTION_PRESENT'],
      contradiction_families: [],
      expected_confidence_band: L7ConfidenceBand.LOW,
      restriction_profile_id: 'rp.ambiguous.moderate.v1',
      replay_hash: 'vh.accumulation.ambiguous.doge.v1.h0006',
      description: 'Netflow sign indeterminate; direction cannot be asserted.',
    },
    {
      case_id: 'gv.risk.degraded.unknown',
      family: L7ValidationFamilyId.RISK_OVERHANG_VALIDATION,
      subject_ref: 'vs.risk_overhang.unknown.v1',
      scope_type: 'ASSET', scope_id: 'UNKNOWN',
      as_of: '2026-01-15T12:00:00Z',
      expected_class: L7ValidationClass.DEGRADED,
      expected_modifiers: ['DEGRADED_SOURCE_PRESENT'],
      contradiction_families: [],
      expected_confidence_band: L7ConfidenceBand.LOW,
      restriction_profile_id: 'rp.degraded.strict.v1',
      replay_hash: 'vh.risk.degraded.unknown.v1.h0007',
      description: 'Underlying source confidence below threshold; degraded verdict.',
    },
    {
      case_id: 'gv.cross_domain.confirmed.l2_basket',
      family: L7ValidationFamilyId.CROSS_DOMAIN_ALIGNMENT_VALIDATION,
      subject_ref: 'vs.cross_domain_alignment.l2_basket.v1',
      scope_type: 'SECTOR', scope_id: 'L2_BASKET',
      as_of: '2026-01-15T12:00:00Z',
      expected_class: L7ValidationClass.CONFIRMED,
      expected_modifiers: [],
      contradiction_families: [],
      expected_confidence_band: L7ConfidenceBand.HIGH,
      restriction_profile_id: null,
      replay_hash: 'vh.cross_domain.confirmed.l2.v1.h0008',
      description: 'All domain surfaces aligned; sector-level confirmation.',
    },
    {
      case_id: 'gv.risk.material_overhang.xyz',
      family: L7ValidationFamilyId.RISK_OVERHANG_VALIDATION,
      subject_ref: 'vs.risk_overhang.xyz.v1',
      scope_type: 'ASSET', scope_id: 'XYZ',
      as_of: '2026-01-15T12:00:00Z',
      expected_class: L7ValidationClass.CONFLICTING,
      expected_modifiers: ['UNRESOLVED_CONTRADICTION_PRESENT'],
      contradiction_families: [L7ContradictionFamily.MATERIAL_RISK_OVERHANG],
      expected_confidence_band: L7ConfidenceBand.LOW,
      restriction_profile_id: 'rp.contradicted_claim.strict.v1',
      replay_hash: 'vh.risk.overhang.xyz.v1.h0009',
      description: 'Large material risk overhang dominates otherwise-confirming support.',
    },
    {
      case_id: 'gv.narrative.cross_source.doge',
      family: L7ValidationFamilyId.NARRATIVE_VALIDATION,
      subject_ref: 'vs.narrative.doge.v1',
      scope_type: 'ASSET', scope_id: 'DOGE',
      as_of: '2026-01-15T12:00:00Z',
      expected_class: L7ValidationClass.CONFLICTING,
      expected_modifiers: ['UNRESOLVED_CONTRADICTION_PRESENT'],
      contradiction_families: [L7ContradictionFamily.CROSS_SOURCE_DISAGREEMENT],
      expected_confidence_band: L7ConfidenceBand.LOW,
      restriction_profile_id: 'rp.contradicted_claim.strict.v1',
      replay_hash: 'vh.narrative.cross_source.doge.v1.h0010',
      description: 'Primary and secondary sentiment sources disagree materially.',
    },
  ]);

export function goldenCorpusSnapshotL7(): readonly string[] {
  return L7_GOLDEN_VALIDATION_CASES.map(c => c.replay_hash).sort();
}

/**
 * Which families are covered by the golden corpus. Used by Band J and
 * Band H to assert cross-family breadth.
 */
export function goldenCorpusFamilies(): ReadonlySet<L7ValidationFamilyId> {
  return new Set(L7_GOLDEN_VALIDATION_CASES.map(c => c.family));
}

/**
 * Which validation classes are covered by the golden corpus.
 */
export function goldenCorpusClasses(): ReadonlySet<L7ValidationClass> {
  return new Set(L7_GOLDEN_VALIDATION_CASES.map(c => c.expected_class));
}
