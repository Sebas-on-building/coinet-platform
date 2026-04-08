/**
 * L3.5-A — Canonical Metric Namespace
 *
 * Defines the stable registry of internal metric paths and the
 * canonical observation artifact that later layers consume.
 *
 * Path grammar: <family>.<measure>.<basis_or_unit?>.<window?>
 * Every path must be backed by a contract in metric-contracts.ts.
 *
 * Providers emit fields. L3.5 defines metrics.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  getMetricContract,
  type MetricContract,
  type MetricUseDomain,
} from './metric-contracts';

export const L35_NAMESPACE_VERSION = '1.0.0' as const;
export const L35_OBSERVATION_SCHEMA_VERSION = 'v1' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC PATH DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

export interface MetricPathDefinition {
  metricPath: string;
  semanticFamily: string;
  description: string;
  registeredAt: string;
}

const _pathRegistry = new Map<string, MetricPathDefinition>();

export function registerMetricPath(
  metricPath: string,
  semanticFamily: string,
  description: string,
): MetricPathDefinition {
  if (_pathRegistry.has(metricPath)) {
    throw new Error(`L35: duplicate metric path '${metricPath}'`);
  }
  const def: MetricPathDefinition = {
    metricPath,
    semanticFamily,
    description,
    registeredAt: new Date().toISOString(),
  };
  _pathRegistry.set(metricPath, def);
  return def;
}

export function getMetricPathDefinition(metricPath: string): MetricPathDefinition | undefined {
  return _pathRegistry.get(metricPath);
}

export function listMetricPathsByFamily(family: string): MetricPathDefinition[] {
  return [..._pathRegistry.values()].filter(d => d.semanticFamily === family);
}

export function listAllMetricPaths(): string[] {
  return [..._pathRegistry.keys()];
}

export function resetPathRegistry(): void {
  _pathRegistry.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL METRIC OBSERVATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface MetricProvenance {
  providerId: string;
  rawFieldName: string;
  rawMetricRef?: string;
  mapperVersion: string;
  lineageRefs: string[];
}

export interface CanonicalMetricObservation {
  schemaVersion: string;
  observationId: string;
  metricPath: string;
  metricContractVersion: string;
  objectId: string;
  objectType: string;
  value: number | string | boolean | Record<string, unknown>;
  unit: string;
  observedAt: string;
  windowStart?: string;
  windowEnd?: string;
  provenance: MetricProvenance;
  compatibilitySignature: string;
  freshnessState: 'FRESH' | 'WARNING' | 'STALE' | 'UNUSABLE';
  admissibilityState: 'ADMITTED' | 'CONDITIONAL' | 'BLOCKED';
  allowedUses: MetricUseDomain[];
  blockedUses: MetricUseDomain[];
  scars: string[];
  validationReportId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBSERVATION BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export interface BuildObservationInput {
  metricPath: string;
  objectId: string;
  objectType: string;
  value: number | string | boolean | Record<string, unknown>;
  observedAt: string;
  windowStart?: string;
  windowEnd?: string;
  provenance: MetricProvenance;
  freshnessState: CanonicalMetricObservation['freshnessState'];
  admissibilityState: CanonicalMetricObservation['admissibilityState'];
  scars?: string[];
  validationReportId: string;
}

export function buildCanonicalMetricObservation(
  input: BuildObservationInput,
): CanonicalMetricObservation | { error: string } {
  const contract = getMetricContract(input.metricPath);
  if (!contract) {
    return { error: `NO_METRIC_CONTRACT:${input.metricPath}` };
  }

  const blockedUses: MetricUseDomain[] = [];
  const allowedUses: MetricUseDomain[] = [...contract.allowedUses];

  if (input.freshnessState === 'STALE' || input.freshnessState === 'UNUSABLE') {
    for (const bu of contract.blockedUsesUnderUncertainty) {
      if (!blockedUses.includes(bu)) blockedUses.push(bu);
    }
  }
  if (input.admissibilityState === 'BLOCKED') {
    blockedUses.push(...contract.allowedUses.filter(u => !blockedUses.includes(u)));
    allowedUses.length = 0;
  }
  if (input.admissibilityState === 'CONDITIONAL') {
    for (const bu of contract.blockedUsesUnderUncertainty) {
      if (!blockedUses.includes(bu)) blockedUses.push(bu);
    }
  }

  for (const bu of blockedUses) {
    const idx = allowedUses.indexOf(bu);
    if (idx >= 0) allowedUses.splice(idx, 1);
  }

  return {
    schemaVersion: L35_OBSERVATION_SCHEMA_VERSION,
    observationId: `obs_${uuidv4()}`,
    metricPath: input.metricPath,
    metricContractVersion: contract.contractVersion,
    objectId: input.objectId,
    objectType: input.objectType,
    value: input.value,
    unit: contract.unit,
    observedAt: input.observedAt,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    provenance: input.provenance,
    compatibilitySignature: contract.comparabilitySignature,
    freshnessState: input.freshnessState,
    admissibilityState: input.admissibilityState,
    allowedUses,
    blockedUses,
    scars: input.scars ?? [],
    validationReportId: input.validationReportId,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBSERVATION STORE
// ═══════════════════════════════════════════════════════════════════════════════

const _observations: CanonicalMetricObservation[] = [];
const _byObjectAndPath = new Map<string, CanonicalMetricObservation[]>();

export function persistObservation(obs: CanonicalMetricObservation): void {
  _observations.push(obs);
  const key = `${obs.objectId}::${obs.metricPath}`;
  const list = _byObjectAndPath.get(key) ?? [];
  list.push(obs);
  _byObjectAndPath.set(key, list);
}

export function getObservationsForObject(
  objectId: string,
  metricPath?: string,
): CanonicalMetricObservation[] {
  if (metricPath) {
    return _byObjectAndPath.get(`${objectId}::${metricPath}`) ?? [];
  }
  return _observations.filter(o => o.objectId === objectId);
}

export function getLatestObservation(
  objectId: string,
  metricPath: string,
): CanonicalMetricObservation | undefined {
  const all = _byObjectAndPath.get(`${objectId}::${metricPath}`);
  return all ? all[all.length - 1] : undefined;
}

export function getAllObservations(): readonly CanonicalMetricObservation[] {
  return _observations;
}

export function resetObservationStore(): void {
  _observations.length = 0;
  _byObjectAndPath.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOOTSTRAP PATH REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export function bootstrapNamespacePaths(): void {
  if (_pathRegistry.size > 0) return;
  const families: Record<string, [string, string][]> = {
    price: [
      ['price.spot.usd', 'Market-wide aggregated spot price in USD'],
      ['price.mark.usd', 'Derivative venue mark price in USD'],
      ['price.index.usd', 'Composite index price in USD'],
      ['price.pool.quote', 'DEX pool-specific quote price'],
    ],
    volume: [
      ['volume.spot.usd.24h', 'Spot volume in USD, 24h rolling'],
      ['volume.perp.notional.usd.24h', 'Perpetual notional volume in USD, 24h rolling'],
    ],
    open_interest: [
      ['oi.notional.usd', 'Open interest notional in USD'],
      ['oi.contracts', 'Open interest in contract count'],
    ],
    funding: [
      ['funding.rate.8h', 'Perpetual funding rate, 8h window'],
      ['funding.rate.1h', 'Perpetual funding rate, 1h window'],
    ],
    liquidations: [
      ['liquidations.notional.usd.24h', 'Liquidation notional in USD, 24h rolling'],
      ['liquidations.count.24h', 'Liquidation event count, 24h rolling'],
    ],
    protocol: [
      ['protocol.tvl.usd', 'Protocol total value locked in USD'],
      ['protocol.fees.usd.24h', 'Protocol fees in USD, 24h rolling'],
      ['protocol.revenue.usd.24h', 'Protocol revenue in USD, 24h rolling'],
      ['protocol.treasury.usd', 'Protocol treasury value in USD'],
    ],
    wallet_flow: [
      ['wallet.exchange_inflow.usd.24h', 'Exchange inflow in USD, 24h rolling'],
      ['wallet.exchange_outflow.usd.24h', 'Exchange outflow in USD, 24h rolling'],
      ['wallet.netflow.usd.24h', 'Net exchange flow in USD, 24h rolling'],
    ],
    narrative: [
      ['narrative.intensity', 'Narrative topic attention intensity score'],
      ['narrative.velocity', 'Narrative topic attention velocity score'],
    ],
    security: [
      ['security.risk.flag_count', 'Security risk flag count'],
      ['security.risk.severity', 'Security risk severity score'],
    ],
  };

  for (const [family, paths] of Object.entries(families)) {
    for (const [path, desc] of paths) {
      registerMetricPath(path, family, desc);
    }
  }
}

bootstrapNamespacePaths();
