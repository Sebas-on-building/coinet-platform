/**
 * L3.5-A — Canonical Metric Contracts
 *
 * The lawbook of L3.5. Defines what each metric means, what it
 * measures, in what units, over what window, and what later layers
 * may or may not do with it.
 *
 * A metric is only real inside Coinet when it has a canonical contract.
 * A later layer must never infer metric semantics from the path alone.
 */

export const L35_CONTRACTS_VERSION = '1.0.0' as const;
export const L35_CONTRACT_SCHEMA_VERSION = 'v1' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export type MetricUnit =
  | 'USD' | 'QUOTE' | 'PERCENT' | 'BASIS_POINTS'
  | 'COUNT' | 'SCORE' | 'RATIO' | 'SEVERITY' | 'BOOLEAN_FLAG';

export type MetricValueType =
  | 'DECIMAL' | 'INTEGER' | 'BOOLEAN' | 'ENUM' | 'STRING' | 'VECTOR';

export type MetricAggregationRule =
  | 'POINT_IN_TIME' | 'SUM' | 'AVG' | 'VWAP' | 'MAX' | 'MIN' | 'NET' | 'CUSTOM';

export type MetricWindowKind =
  | 'INSTANT' | 'ROLLING' | 'SESSION' | 'CALENDAR' | 'CUSTOM';

export type MetricWindowUnit = 'SEC' | 'MIN' | 'HOUR' | 'DAY' | 'WEEK';

export type MetricNullability = 'NOT_NULL' | 'NULLABLE' | 'CONDITIONALLY_NULLABLE';

export type MetricUseDomain =
  | 'SCORING' | 'CONTRADICTION' | 'SCENARIO' | 'JUDGMENT'
  | 'DISPLAY' | 'CHARTING' | 'CALIBRATION' | 'REPLAY'
  | 'RANKING' | 'ALERTS';

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export interface MetricScope {
  subject: string;
  domain: string;
  chainScope?: string;
  venueScope?: string;
  assetScope?: string;
}

export interface MetricBasis {
  priceBasis?: string;
  valuationBasis?: string;
  flowBasis?: string;
  riskBasis?: string;
  eventBasis?: string;
}

export interface MetricWindow {
  kind: MetricWindowKind;
  value?: number;
  unit?: MetricWindowUnit;
}

export interface MetricFreshnessExpectations {
  maxAgeMs: number;
  warningAgeMs: number;
  unusableAgeMs: number;
}

export interface MetricProvenanceRequirements {
  requireProviderId: boolean;
  requireLineageRefs: boolean;
  requireMappingVersion: boolean;
  requireRawFieldRef: boolean;
}

export interface MetricPrecisionRules {
  maxDecimals?: number;
  minDecimals?: number;
}

export interface MetricContract {
  schemaVersion: string;
  metricPath: string;
  contractVersion: string;
  semanticFamily: string;
  objectType: string;
  unit: MetricUnit;
  valueType: MetricValueType;
  scope: MetricScope;
  basis: MetricBasis;
  aggregationRule: MetricAggregationRule;
  window: MetricWindow;
  freshnessExpectations: MetricFreshnessExpectations;
  providerProvenanceRequirements: MetricProvenanceRequirements;
  allowedUses: MetricUseDomain[];
  blockedUsesUnderUncertainty: MetricUseDomain[];
  comparabilitySignature: string;
  acceptedSourceClasses: string[];
  blockedMergeConditions: string[];
  precisionRules?: MetricPrecisionRules;
  nullability: MetricNullability;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

const _contracts = new Map<string, MetricContract>();
const _versionIndex = new Map<string, string[]>(); // path → versions

export function registerMetricContract(contract: MetricContract): MetricContract {
  if (_contracts.has(contract.metricPath)) {
    throw new Error(`L35: duplicate metric contract for path '${contract.metricPath}'`);
  }
  _contracts.set(contract.metricPath, contract);
  const versions = _versionIndex.get(contract.metricPath) ?? [];
  versions.push(contract.contractVersion);
  _versionIndex.set(contract.metricPath, versions);
  return contract;
}

export function getMetricContract(metricPath: string): MetricContract | undefined {
  return _contracts.get(metricPath);
}

export function getMetricContractVersion(metricPath: string): string | undefined {
  return _contracts.get(metricPath)?.contractVersion;
}

export function getAllMetricContracts(): readonly MetricContract[] {
  return [..._contracts.values()];
}

export function listMetricContractPaths(): string[] {
  return [..._contracts.keys()];
}

export function getContractsByFamily(family: string): MetricContract[] {
  return [..._contracts.values()].filter(c => c.semanticFamily === family);
}

export function resetContractRegistry(): void {
  _contracts.clear();
  _versionIndex.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT BUILDER (reduces boilerplate for initial registrations)
// ═══════════════════════════════════════════════════════════════════════════════

function makeContract(partial: Omit<MetricContract, 'schemaVersion' | 'contractVersion' | 'comparabilitySignature'> & {
  contractVersion?: string;
}): MetricContract {
  const c: MetricContract = {
    schemaVersion: L35_CONTRACT_SCHEMA_VERSION,
    contractVersion: partial.contractVersion ?? '1.0.0',
    comparabilitySignature: deriveComparabilitySignature(partial),
    ...partial,
  };
  return c;
}

function deriveComparabilitySignature(c: Partial<MetricContract>): string {
  return [
    c.metricPath,
    c.objectType,
    c.unit,
    c.valueType,
    c.scope?.domain,
    c.basis?.priceBasis ?? c.basis?.valuationBasis ?? c.basis?.flowBasis ?? c.basis?.riskBasis ?? c.basis?.eventBasis ?? 'none',
    c.aggregationRule,
    c.window?.kind,
    c.window?.value ?? '',
    c.window?.unit ?? '',
  ].join('::');
}

export { deriveComparabilitySignature };

// ═══════════════════════════════════════════════════════════════════════════════
// STANDARD PROVENANCE & FRESHNESS TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const STANDARD_PROVENANCE: MetricProvenanceRequirements = {
  requireProviderId: true,
  requireLineageRefs: true,
  requireMappingVersion: true,
  requireRawFieldRef: true,
};

const FAST_FRESHNESS: MetricFreshnessExpectations = { maxAgeMs: 60_000, warningAgeMs: 30_000, unusableAgeMs: 120_000 };
const MODERATE_FRESHNESS: MetricFreshnessExpectations = { maxAgeMs: 300_000, warningAgeMs: 120_000, unusableAgeMs: 600_000 };
const SLOW_FRESHNESS: MetricFreshnessExpectations = { maxAgeMs: 3_600_000, warningAgeMs: 1_800_000, unusableAgeMs: 7_200_000 };

const SCORING_DISPLAY: MetricUseDomain[] = ['SCORING', 'CONTRADICTION', 'SCENARIO', 'JUDGMENT', 'DISPLAY', 'CHARTING', 'CALIBRATION', 'REPLAY', 'RANKING', 'ALERTS'];
const DISPLAY_ONLY: MetricUseDomain[] = ['DISPLAY', 'CHARTING', 'REPLAY'];

// ═══════════════════════════════════════════════════════════════════════════════
// INITIAL CONTRACT SET — registered on module load
// ═══════════════════════════════════════════════════════════════════════════════

export function bootstrapContracts(): void {
  if (_contracts.size > 0) return;

  // ── Price family ────────────────────────────────────────────────────────
  registerMetricContract(makeContract({
    metricPath: 'price.spot.usd', semanticFamily: 'price', objectType: 'ASSET',
    unit: 'USD', valueType: 'DECIMAL',
    scope: { subject: 'asset', domain: 'market_wide_spot' },
    basis: { priceBasis: 'spot' },
    aggregationRule: 'POINT_IN_TIME', window: { kind: 'INSTANT' },
    freshnessExpectations: FAST_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: SCORING_DISPLAY,
    blockedUsesUnderUncertainty: ['RANKING', 'SCENARIO'],
    acceptedSourceClasses: ['market_surface', 'aggregated_feed'],
    blockedMergeConditions: ['price.mark.usd', 'price.pool.quote', 'price.index.usd'],
    nullability: 'NOT_NULL',
  }));

  registerMetricContract(makeContract({
    metricPath: 'price.mark.usd', semanticFamily: 'price', objectType: 'PAIR',
    unit: 'USD', valueType: 'DECIMAL',
    scope: { subject: 'pair', domain: 'derivative_venue_mark' },
    basis: { priceBasis: 'mark' },
    aggregationRule: 'POINT_IN_TIME', window: { kind: 'INSTANT' },
    freshnessExpectations: FAST_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: SCORING_DISPLAY,
    blockedUsesUnderUncertainty: ['RANKING'],
    acceptedSourceClasses: ['market_surface'],
    blockedMergeConditions: ['price.spot.usd', 'price.pool.quote'],
    nullability: 'NOT_NULL',
  }));

  registerMetricContract(makeContract({
    metricPath: 'price.index.usd', semanticFamily: 'price', objectType: 'ASSET',
    unit: 'USD', valueType: 'DECIMAL',
    scope: { subject: 'asset', domain: 'composite_index' },
    basis: { priceBasis: 'index' },
    aggregationRule: 'POINT_IN_TIME', window: { kind: 'INSTANT' },
    freshnessExpectations: FAST_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: SCORING_DISPLAY,
    blockedUsesUnderUncertainty: ['RANKING'],
    acceptedSourceClasses: ['aggregated_feed'],
    blockedMergeConditions: ['price.spot.usd', 'price.mark.usd'],
    nullability: 'NOT_NULL',
  }));

  registerMetricContract(makeContract({
    metricPath: 'price.pool.quote', semanticFamily: 'price', objectType: 'PAIR',
    unit: 'QUOTE', valueType: 'DECIMAL',
    scope: { subject: 'pair', domain: 'dex_pool_specific' },
    basis: { priceBasis: 'pool_quote' },
    aggregationRule: 'POINT_IN_TIME', window: { kind: 'INSTANT' },
    freshnessExpectations: FAST_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: ['DISPLAY', 'CHARTING', 'REPLAY', 'CONTRADICTION'],
    blockedUsesUnderUncertainty: ['SCORING', 'RANKING', 'SCENARIO'],
    acceptedSourceClasses: ['dex_emergence'],
    blockedMergeConditions: ['price.spot.usd', 'price.mark.usd'],
    nullability: 'NOT_NULL',
  }));

  // ── Volume family ──────────────────────────────────────────────────────
  registerMetricContract(makeContract({
    metricPath: 'volume.spot.usd.24h', semanticFamily: 'volume', objectType: 'ASSET',
    unit: 'USD', valueType: 'DECIMAL',
    scope: { subject: 'asset', domain: 'market_wide_spot' },
    basis: { valuationBasis: 'usd_denominated' },
    aggregationRule: 'SUM', window: { kind: 'ROLLING', value: 24, unit: 'HOUR' },
    freshnessExpectations: MODERATE_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: SCORING_DISPLAY,
    blockedUsesUnderUncertainty: ['RANKING'],
    acceptedSourceClasses: ['market_surface', 'aggregated_feed'],
    blockedMergeConditions: ['volume.perp.notional.usd.24h'],
    nullability: 'NOT_NULL',
  }));

  registerMetricContract(makeContract({
    metricPath: 'volume.perp.notional.usd.24h', semanticFamily: 'volume', objectType: 'PAIR',
    unit: 'USD', valueType: 'DECIMAL',
    scope: { subject: 'pair', domain: 'perpetual_market' },
    basis: { valuationBasis: 'notional_usd' },
    aggregationRule: 'SUM', window: { kind: 'ROLLING', value: 24, unit: 'HOUR' },
    freshnessExpectations: MODERATE_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: SCORING_DISPLAY,
    blockedUsesUnderUncertainty: ['RANKING'],
    acceptedSourceClasses: ['market_surface'],
    blockedMergeConditions: ['volume.spot.usd.24h'],
    nullability: 'NOT_NULL',
  }));

  // ── Open interest family ───────────────────────────────────────────────
  registerMetricContract(makeContract({
    metricPath: 'oi.notional.usd', semanticFamily: 'open_interest', objectType: 'ASSET',
    unit: 'USD', valueType: 'DECIMAL',
    scope: { subject: 'asset', domain: 'derivatives_aggregate' },
    basis: { valuationBasis: 'notional_usd' },
    aggregationRule: 'POINT_IN_TIME', window: { kind: 'INSTANT' },
    freshnessExpectations: MODERATE_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: SCORING_DISPLAY,
    blockedUsesUnderUncertainty: ['RANKING'],
    acceptedSourceClasses: ['market_surface'],
    blockedMergeConditions: ['oi.contracts'],
    nullability: 'NOT_NULL',
  }));

  registerMetricContract(makeContract({
    metricPath: 'oi.contracts', semanticFamily: 'open_interest', objectType: 'PAIR',
    unit: 'COUNT', valueType: 'INTEGER',
    scope: { subject: 'pair', domain: 'venue_specific_contracts' },
    basis: { valuationBasis: 'contract_count' },
    aggregationRule: 'POINT_IN_TIME', window: { kind: 'INSTANT' },
    freshnessExpectations: MODERATE_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: SCORING_DISPLAY,
    blockedUsesUnderUncertainty: ['RANKING'],
    acceptedSourceClasses: ['market_surface'],
    blockedMergeConditions: ['oi.notional.usd'],
    nullability: 'NOT_NULL',
  }));

  // ── Funding family ─────────────────────────────────────────────────────
  registerMetricContract(makeContract({
    metricPath: 'funding.rate.8h', semanticFamily: 'funding', objectType: 'PAIR',
    unit: 'PERCENT', valueType: 'DECIMAL',
    scope: { subject: 'pair', domain: 'perpetual_market' },
    basis: { priceBasis: 'funding_rate' },
    aggregationRule: 'POINT_IN_TIME', window: { kind: 'ROLLING', value: 8, unit: 'HOUR' },
    freshnessExpectations: MODERATE_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: SCORING_DISPLAY,
    blockedUsesUnderUncertainty: ['RANKING'],
    acceptedSourceClasses: ['market_surface'],
    blockedMergeConditions: ['funding.rate.1h'],
    nullability: 'NOT_NULL',
  }));

  registerMetricContract(makeContract({
    metricPath: 'funding.rate.1h', semanticFamily: 'funding', objectType: 'PAIR',
    unit: 'PERCENT', valueType: 'DECIMAL',
    scope: { subject: 'pair', domain: 'perpetual_market' },
    basis: { priceBasis: 'funding_rate' },
    aggregationRule: 'POINT_IN_TIME', window: { kind: 'ROLLING', value: 1, unit: 'HOUR' },
    freshnessExpectations: FAST_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: SCORING_DISPLAY,
    blockedUsesUnderUncertainty: ['RANKING'],
    acceptedSourceClasses: ['market_surface'],
    blockedMergeConditions: ['funding.rate.8h'],
    nullability: 'NOT_NULL',
  }));

  // ── Liquidations family ────────────────────────────────────────────────
  registerMetricContract(makeContract({
    metricPath: 'liquidations.notional.usd.24h', semanticFamily: 'liquidations', objectType: 'ASSET',
    unit: 'USD', valueType: 'DECIMAL',
    scope: { subject: 'asset', domain: 'derivatives_aggregate' },
    basis: { valuationBasis: 'notional_usd' },
    aggregationRule: 'SUM', window: { kind: 'ROLLING', value: 24, unit: 'HOUR' },
    freshnessExpectations: MODERATE_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: SCORING_DISPLAY,
    blockedUsesUnderUncertainty: ['RANKING'],
    acceptedSourceClasses: ['market_surface'],
    blockedMergeConditions: ['liquidations.count.24h'],
    nullability: 'NOT_NULL',
  }));

  registerMetricContract(makeContract({
    metricPath: 'liquidations.count.24h', semanticFamily: 'liquidations', objectType: 'ASSET',
    unit: 'COUNT', valueType: 'INTEGER',
    scope: { subject: 'asset', domain: 'derivatives_aggregate' },
    basis: { valuationBasis: 'event_count' },
    aggregationRule: 'SUM', window: { kind: 'ROLLING', value: 24, unit: 'HOUR' },
    freshnessExpectations: MODERATE_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: SCORING_DISPLAY,
    blockedUsesUnderUncertainty: ['RANKING'],
    acceptedSourceClasses: ['market_surface'],
    blockedMergeConditions: ['liquidations.notional.usd.24h'],
    nullability: 'NOT_NULL',
  }));

  // ── Protocol family ────────────────────────────────────────────────────
  registerMetricContract(makeContract({
    metricPath: 'protocol.tvl.usd', semanticFamily: 'protocol', objectType: 'PROTOCOL',
    unit: 'USD', valueType: 'DECIMAL',
    scope: { subject: 'protocol', domain: 'protocol_wide' },
    basis: { valuationBasis: 'tvl' },
    aggregationRule: 'POINT_IN_TIME', window: { kind: 'INSTANT' },
    freshnessExpectations: SLOW_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: SCORING_DISPLAY,
    blockedUsesUnderUncertainty: ['RANKING', 'SCORING'],
    acceptedSourceClasses: ['protocol_substance'],
    blockedMergeConditions: ['protocol.treasury.usd'],
    nullability: 'NOT_NULL',
  }));

  registerMetricContract(makeContract({
    metricPath: 'protocol.fees.usd.24h', semanticFamily: 'protocol', objectType: 'PROTOCOL',
    unit: 'USD', valueType: 'DECIMAL',
    scope: { subject: 'protocol', domain: 'protocol_wide' },
    basis: { valuationBasis: 'fee_revenue' },
    aggregationRule: 'SUM', window: { kind: 'ROLLING', value: 24, unit: 'HOUR' },
    freshnessExpectations: SLOW_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: SCORING_DISPLAY,
    blockedUsesUnderUncertainty: ['RANKING'],
    acceptedSourceClasses: ['protocol_substance'],
    blockedMergeConditions: ['protocol.revenue.usd.24h'],
    nullability: 'NULLABLE',
  }));

  registerMetricContract(makeContract({
    metricPath: 'protocol.revenue.usd.24h', semanticFamily: 'protocol', objectType: 'PROTOCOL',
    unit: 'USD', valueType: 'DECIMAL',
    scope: { subject: 'protocol', domain: 'protocol_wide' },
    basis: { valuationBasis: 'protocol_revenue' },
    aggregationRule: 'SUM', window: { kind: 'ROLLING', value: 24, unit: 'HOUR' },
    freshnessExpectations: SLOW_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: SCORING_DISPLAY,
    blockedUsesUnderUncertainty: ['RANKING'],
    acceptedSourceClasses: ['protocol_substance'],
    blockedMergeConditions: ['protocol.fees.usd.24h'],
    nullability: 'NULLABLE',
  }));

  registerMetricContract(makeContract({
    metricPath: 'protocol.treasury.usd', semanticFamily: 'protocol', objectType: 'PROTOCOL',
    unit: 'USD', valueType: 'DECIMAL',
    scope: { subject: 'protocol', domain: 'treasury_specific' },
    basis: { valuationBasis: 'treasury' },
    aggregationRule: 'POINT_IN_TIME', window: { kind: 'INSTANT' },
    freshnessExpectations: SLOW_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: SCORING_DISPLAY,
    blockedUsesUnderUncertainty: ['RANKING', 'SCORING'],
    acceptedSourceClasses: ['protocol_substance'],
    blockedMergeConditions: ['protocol.tvl.usd'],
    nullability: 'NULLABLE',
  }));

  // ── Wallet / flow family ───────────────────────────────────────────────
  registerMetricContract(makeContract({
    metricPath: 'wallet.exchange_inflow.usd.24h', semanticFamily: 'wallet_flow', objectType: 'ENTITY',
    unit: 'USD', valueType: 'DECIMAL',
    scope: { subject: 'entity', domain: 'exchange_flow' },
    basis: { flowBasis: 'exchange_inflow' },
    aggregationRule: 'SUM', window: { kind: 'ROLLING', value: 24, unit: 'HOUR' },
    freshnessExpectations: MODERATE_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: SCORING_DISPLAY,
    blockedUsesUnderUncertainty: ['RANKING'],
    acceptedSourceClasses: ['on_chain_behavior', 'entity_context'],
    blockedMergeConditions: ['wallet.exchange_outflow.usd.24h', 'wallet.netflow.usd.24h'],
    nullability: 'NULLABLE',
  }));

  registerMetricContract(makeContract({
    metricPath: 'wallet.exchange_outflow.usd.24h', semanticFamily: 'wallet_flow', objectType: 'ENTITY',
    unit: 'USD', valueType: 'DECIMAL',
    scope: { subject: 'entity', domain: 'exchange_flow' },
    basis: { flowBasis: 'exchange_outflow' },
    aggregationRule: 'SUM', window: { kind: 'ROLLING', value: 24, unit: 'HOUR' },
    freshnessExpectations: MODERATE_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: SCORING_DISPLAY,
    blockedUsesUnderUncertainty: ['RANKING'],
    acceptedSourceClasses: ['on_chain_behavior', 'entity_context'],
    blockedMergeConditions: ['wallet.exchange_inflow.usd.24h', 'wallet.netflow.usd.24h'],
    nullability: 'NULLABLE',
  }));

  registerMetricContract(makeContract({
    metricPath: 'wallet.netflow.usd.24h', semanticFamily: 'wallet_flow', objectType: 'ENTITY',
    unit: 'USD', valueType: 'DECIMAL',
    scope: { subject: 'entity', domain: 'exchange_flow' },
    basis: { flowBasis: 'net_flow' },
    aggregationRule: 'NET', window: { kind: 'ROLLING', value: 24, unit: 'HOUR' },
    freshnessExpectations: MODERATE_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: SCORING_DISPLAY,
    blockedUsesUnderUncertainty: ['RANKING'],
    acceptedSourceClasses: ['on_chain_behavior', 'entity_context'],
    blockedMergeConditions: ['wallet.exchange_inflow.usd.24h', 'wallet.exchange_outflow.usd.24h'],
    nullability: 'NULLABLE',
  }));

  // ── Narrative family ───────────────────────────────────────────────────
  registerMetricContract(makeContract({
    metricPath: 'narrative.intensity', semanticFamily: 'narrative', objectType: 'NARRATIVE_TOPIC',
    unit: 'SCORE', valueType: 'DECIMAL',
    scope: { subject: 'narrative_topic', domain: 'topic_wide_attention' },
    basis: { eventBasis: 'narrative_intensity' },
    aggregationRule: 'POINT_IN_TIME', window: { kind: 'INSTANT' },
    freshnessExpectations: MODERATE_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: ['DISPLAY', 'CHARTING', 'REPLAY', 'CONTRADICTION', 'SCENARIO'],
    blockedUsesUnderUncertainty: ['SCORING', 'JUDGMENT', 'RANKING'],
    acceptedSourceClasses: ['narrative_attention'],
    blockedMergeConditions: ['narrative.velocity'],
    nullability: 'NOT_NULL',
  }));

  registerMetricContract(makeContract({
    metricPath: 'narrative.velocity', semanticFamily: 'narrative', objectType: 'NARRATIVE_TOPIC',
    unit: 'SCORE', valueType: 'DECIMAL',
    scope: { subject: 'narrative_topic', domain: 'topic_wide_attention' },
    basis: { eventBasis: 'narrative_velocity' },
    aggregationRule: 'POINT_IN_TIME', window: { kind: 'ROLLING', value: 24, unit: 'HOUR' },
    freshnessExpectations: MODERATE_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: ['DISPLAY', 'CHARTING', 'REPLAY', 'CONTRADICTION', 'SCENARIO'],
    blockedUsesUnderUncertainty: ['SCORING', 'JUDGMENT', 'RANKING'],
    acceptedSourceClasses: ['narrative_attention'],
    blockedMergeConditions: ['narrative.intensity'],
    nullability: 'NOT_NULL',
  }));

  // ── Security family ────────────────────────────────────────────────────
  registerMetricContract(makeContract({
    metricPath: 'security.risk.flag_count', semanticFamily: 'security', objectType: 'ASSET',
    unit: 'COUNT', valueType: 'INTEGER',
    scope: { subject: 'asset', domain: 'security_assessment' },
    basis: { riskBasis: 'flag_count' },
    aggregationRule: 'POINT_IN_TIME', window: { kind: 'INSTANT' },
    freshnessExpectations: SLOW_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: SCORING_DISPLAY,
    blockedUsesUnderUncertainty: ['RANKING'],
    acceptedSourceClasses: ['security_intelligence'],
    blockedMergeConditions: ['security.risk.severity'],
    nullability: 'NOT_NULL',
  }));

  registerMetricContract(makeContract({
    metricPath: 'security.risk.severity', semanticFamily: 'security', objectType: 'ASSET',
    unit: 'SEVERITY', valueType: 'DECIMAL',
    scope: { subject: 'asset', domain: 'security_assessment' },
    basis: { riskBasis: 'severity_score' },
    aggregationRule: 'POINT_IN_TIME', window: { kind: 'INSTANT' },
    freshnessExpectations: SLOW_FRESHNESS, providerProvenanceRequirements: STANDARD_PROVENANCE,
    allowedUses: SCORING_DISPLAY,
    blockedUsesUnderUncertainty: ['RANKING'],
    acceptedSourceClasses: ['security_intelligence'],
    blockedMergeConditions: ['security.risk.flag_count'],
    nullability: 'NOT_NULL',
  }));
}

bootstrapContracts();
