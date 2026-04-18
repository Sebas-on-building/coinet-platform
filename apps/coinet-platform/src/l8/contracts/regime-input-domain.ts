/**
 * L8.5 — Regime Input Domain Taxonomy
 *
 * §8.5.2.3 / §8.5.2.5 — Canonical conceptual input domains. Every regime
 * template must reference one or more input domains, not ad-hoc signal
 * names (§8.5.2.4). Each domain descriptor declares semantic purpose,
 * legal lower-layer sources, scope legality, freshness posture, and
 * whether contradiction/restriction consumption is required when the
 * domain consumes L7.
 */

import {
  L8RegimeInputFamily,
  L8RegimeInputSourceLayer,
} from './regime-input-family';

/**
 * §8.5.2.3 — Canonical input domains.
 *
 * `VALIDATION_SUPPORT_DOMAIN` is the domain that consumes L7 truth-
 * tested claims to feed regime classification.
 */
export enum L8RegimeInputDomain {
  BREADTH_DOMAIN = 'BREADTH_DOMAIN',
  STABLECOIN_FLOW_DOMAIN = 'STABLECOIN_FLOW_DOMAIN',
  PROTOCOL_ACTIVITY_DOMAIN = 'PROTOCOL_ACTIVITY_DOMAIN',
  DERIVATIVES_STRUCTURE_DOMAIN = 'DERIVATIVES_STRUCTURE_DOMAIN',
  SPOT_PERP_RELATION_DOMAIN = 'SPOT_PERP_RELATION_DOMAIN',
  NARRATIVE_BREADTH_DOMAIN = 'NARRATIVE_BREADTH_DOMAIN',
  VOLATILITY_DOMAIN = 'VOLATILITY_DOMAIN',
  LIQUIDITY_DOMAIN = 'LIQUIDITY_DOMAIN',
  SEQUENCE_STATE_DOMAIN = 'SEQUENCE_STATE_DOMAIN',
  RISK_OVERHANG_DOMAIN = 'RISK_OVERHANG_DOMAIN',
  ECOSYSTEM_ROTATION_DOMAIN = 'ECOSYSTEM_ROTATION_DOMAIN',
  VALIDATION_SUPPORT_DOMAIN = 'VALIDATION_SUPPORT_DOMAIN',
}

export const ALL_L8_REGIME_INPUT_DOMAINS: readonly L8RegimeInputDomain[] =
  Object.values(L8RegimeInputDomain);

/** Legal scope types a domain may operate at. */
export type L8RegimeDomainScopeType =
  | 'MARKET' | 'CHAIN' | 'SECTOR' | 'ECOSYSTEM' | 'PROTOCOL'
  | 'ASSET' | 'TOKEN' | 'PORTFOLIO' | 'NARRATIVE_CLUSTER';

/** §8.5.2.5 — Required freshness posture for domain evidence. */
export type L8RegimeDomainFreshness =
  | 'STRICT' | 'TOLERANT' | 'PERMISSIVE';

export interface L8RegimeInputDomainDescriptor {
  readonly domain: L8RegimeInputDomain;
  readonly semantic_purpose: string;
  readonly legal_families: readonly L8RegimeInputFamily[];
  readonly legal_scope_types: readonly L8RegimeDomainScopeType[];
  readonly legal_source_layers: readonly L8RegimeInputSourceLayer[];
  readonly freshness_posture: L8RegimeDomainFreshness;
  readonly must_consume_contradiction_posture: boolean;
  readonly must_consume_restriction_posture: boolean;
  readonly evidence_only_allowed: boolean;
}

/**
 * §8.5.2.5 / §8.5.3.3 / §8.5.4.3 — Frozen descriptor table. Every
 * runtime domain-to-family binding must resolve against this table.
 */
export const L8_REGIME_INPUT_DOMAIN_DESCRIPTORS:
  readonly L8RegimeInputDomainDescriptor[] = [
    {
      domain: L8RegimeInputDomain.BREADTH_DOMAIN,
      semantic_purpose: 'Market and participation breadth',
      legal_families: [
        L8RegimeInputFamily.BREADTH_FAMILY,
        L8RegimeInputFamily.MOMENTUM_PARTICIPATION_FAMILY,
      ],
      legal_scope_types: ['MARKET', 'SECTOR', 'ECOSYSTEM'],
      legal_source_layers: ['L6'],
      freshness_posture: 'STRICT',
      must_consume_contradiction_posture: false,
      must_consume_restriction_posture: false,
      evidence_only_allowed: true,
    },
    {
      domain: L8RegimeInputDomain.STABLECOIN_FLOW_DOMAIN,
      semantic_purpose: 'Stablecoin growth / contraction / flow signals',
      legal_families: [
        L8RegimeInputFamily.ONCHAIN_FLOW_FAMILY,
      ],
      legal_scope_types: ['MARKET', 'CHAIN', 'ECOSYSTEM'],
      legal_source_layers: ['L6'],
      freshness_posture: 'STRICT',
      must_consume_contradiction_posture: false,
      must_consume_restriction_posture: false,
      evidence_only_allowed: true,
    },
    {
      domain: L8RegimeInputDomain.PROTOCOL_ACTIVITY_DOMAIN,
      semantic_purpose: 'Protocol activity, TVL, revenue substance',
      legal_families: [
        L8RegimeInputFamily.PROTOCOL_SUBSTANCE_FAMILY,
        L8RegimeInputFamily.ONCHAIN_FLOW_FAMILY,
      ],
      legal_scope_types: ['PROTOCOL', 'CHAIN', 'ECOSYSTEM'],
      legal_source_layers: ['L6'],
      freshness_posture: 'TOLERANT',
      must_consume_contradiction_posture: false,
      must_consume_restriction_posture: false,
      evidence_only_allowed: true,
    },
    {
      domain: L8RegimeInputDomain.DERIVATIVES_STRUCTURE_DOMAIN,
      semantic_purpose: 'Derivatives crowding, leverage posture',
      legal_families: [
        L8RegimeInputFamily.DERIVATIVES_STRUCTURE_FAMILY,
      ],
      legal_scope_types: ['MARKET', 'ASSET', 'TOKEN'],
      legal_source_layers: ['L6'],
      freshness_posture: 'STRICT',
      must_consume_contradiction_posture: false,
      must_consume_restriction_posture: false,
      evidence_only_allowed: true,
    },
    {
      domain: L8RegimeInputDomain.SPOT_PERP_RELATION_DOMAIN,
      semantic_purpose: 'Spot vs perp relationship structure',
      legal_families: [
        L8RegimeInputFamily.SPOT_PERP_RELATION_FAMILY,
        L8RegimeInputFamily.DERIVATIVES_STRUCTURE_FAMILY,
      ],
      legal_scope_types: ['MARKET', 'ASSET', 'TOKEN'],
      legal_source_layers: ['L6'],
      freshness_posture: 'STRICT',
      must_consume_contradiction_posture: false,
      must_consume_restriction_posture: false,
      evidence_only_allowed: true,
    },
    {
      domain: L8RegimeInputDomain.NARRATIVE_BREADTH_DOMAIN,
      semantic_purpose: 'Narrative breadth, intensity, divergence',
      legal_families: [
        L8RegimeInputFamily.NARRATIVE_STATE_FAMILY,
      ],
      legal_scope_types: ['NARRATIVE_CLUSTER', 'SECTOR', 'MARKET'],
      legal_source_layers: ['L6'],
      freshness_posture: 'TOLERANT',
      must_consume_contradiction_posture: false,
      must_consume_restriction_posture: false,
      evidence_only_allowed: true,
    },
    {
      domain: L8RegimeInputDomain.VOLATILITY_DOMAIN,
      semantic_purpose: 'Realised and implied volatility regime',
      legal_families: [
        L8RegimeInputFamily.VOLATILITY_FAMILY,
      ],
      legal_scope_types: ['MARKET', 'ASSET', 'TOKEN'],
      legal_source_layers: ['L6'],
      freshness_posture: 'STRICT',
      must_consume_contradiction_posture: false,
      must_consume_restriction_posture: false,
      evidence_only_allowed: true,
    },
    {
      domain: L8RegimeInputDomain.LIQUIDITY_DOMAIN,
      semantic_purpose: 'Depth, spread, and liquidity-fragility',
      legal_families: [
        L8RegimeInputFamily.LIQUIDITY_STRUCTURE_FAMILY,
      ],
      legal_scope_types: ['MARKET', 'CHAIN', 'ASSET', 'TOKEN'],
      legal_source_layers: ['L6'],
      freshness_posture: 'STRICT',
      must_consume_contradiction_posture: false,
      must_consume_restriction_posture: false,
      evidence_only_allowed: true,
    },
    {
      domain: L8RegimeInputDomain.SEQUENCE_STATE_DOMAIN,
      semantic_purpose: 'Token maturity and sequence state',
      legal_families: [
        L8RegimeInputFamily.SEQUENCE_STATE_FAMILY,
      ],
      legal_scope_types: ['TOKEN', 'ASSET', 'PROTOCOL'],
      legal_source_layers: ['L6'],
      freshness_posture: 'TOLERANT',
      must_consume_contradiction_posture: false,
      must_consume_restriction_posture: false,
      evidence_only_allowed: true,
    },
    {
      domain: L8RegimeInputDomain.RISK_OVERHANG_DOMAIN,
      semantic_purpose:
        'Security, unlock, and governance risk overhang signals',
      legal_families: [
        L8RegimeInputFamily.SECURITY_OVERHANG_FAMILY,
        L8RegimeInputFamily.ONCHAIN_FLOW_FAMILY,
      ],
      legal_scope_types: ['ASSET', 'TOKEN', 'PROTOCOL'],
      legal_source_layers: ['L6'],
      freshness_posture: 'TOLERANT',
      must_consume_contradiction_posture: false,
      must_consume_restriction_posture: false,
      evidence_only_allowed: true,
    },
    {
      domain: L8RegimeInputDomain.ECOSYSTEM_ROTATION_DOMAIN,
      semantic_purpose:
        'Cross-ecosystem / cross-chain rotation and attention flow',
      legal_families: [
        L8RegimeInputFamily.L4_GRAPH_CONTEXT_FAMILY,
        L8RegimeInputFamily.NARRATIVE_STATE_FAMILY,
        L8RegimeInputFamily.ONCHAIN_FLOW_FAMILY,
      ],
      legal_scope_types: [
        'ECOSYSTEM', 'SECTOR', 'NARRATIVE_CLUSTER', 'CHAIN',
      ],
      legal_source_layers: ['L4', 'L6'],
      freshness_posture: 'TOLERANT',
      must_consume_contradiction_posture: false,
      must_consume_restriction_posture: false,
      evidence_only_allowed: true,
    },
    {
      domain: L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
      semantic_purpose:
        'L7 validation, contradiction, confidence, and restriction ' +
        'surfaces that govern regime admissibility and weighting',
      legal_families: [
        L8RegimeInputFamily.VALIDATION_ASSESSMENT_FAMILY,
        L8RegimeInputFamily.CONTRADICTION_BUNDLE_FAMILY,
        L8RegimeInputFamily.VALIDATION_CONFIDENCE_FAMILY,
        L8RegimeInputFamily.CLAIM_RESTRICTION_FAMILY,
        L8RegimeInputFamily.VALIDATION_HISTORY_FAMILY,
        L8RegimeInputFamily.VALIDATION_EVIDENCE_SURFACE_FAMILY,
      ],
      legal_scope_types: [
        'MARKET', 'CHAIN', 'SECTOR', 'ECOSYSTEM', 'ASSET', 'TOKEN',
        'PROTOCOL', 'PORTFOLIO', 'NARRATIVE_CLUSTER',
      ],
      legal_source_layers: ['L7'],
      freshness_posture: 'STRICT',
      must_consume_contradiction_posture: true,
      must_consume_restriction_posture: true,
      evidence_only_allowed: true,
    },
  ];

export function getL8RegimeInputDomainDescriptor(
  domain: L8RegimeInputDomain,
): L8RegimeInputDomainDescriptor | undefined {
  return L8_REGIME_INPUT_DOMAIN_DESCRIPTORS.find(d => d.domain === domain);
}

export function isL8RegisteredInputDomain(value: string): boolean {
  return L8_REGIME_INPUT_DOMAIN_DESCRIPTORS.some(d => d.domain === value);
}

export function domainAllowsFamily(
  domain: L8RegimeInputDomain,
  family: L8RegimeInputFamily,
): boolean {
  const d = getL8RegimeInputDomainDescriptor(domain);
  if (!d) return false;
  return d.legal_families.includes(family);
}

export function domainAllowsScope(
  domain: L8RegimeInputDomain,
  scope: L8RegimeDomainScopeType,
): boolean {
  const d = getL8RegimeInputDomainDescriptor(domain);
  if (!d) return false;
  return d.legal_scope_types.includes(scope);
}
