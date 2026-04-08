/**
 * L3.5-A — Provider Metric Mappers
 *
 * Maps provider-specific raw fields into canonical metric contracts.
 * A provider field must never bypass mapper logic and enter
 * canonical space directly.
 *
 * Each mapping attempt emits a structured artifact for audit.
 */

import { v4 as uuidv4 } from 'uuid';
import { getMetricContract, type MetricContract } from './metric-contracts';

export const L35_MAPPER_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// MAPPER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type MetricMappingStatus = 'MAPPED' | 'BLOCKED' | 'AMBIGUOUS' | 'PARTIAL';

export interface ProviderFieldMapping {
  providerFieldName: string;
  canonicalMetricPath: string;
  unitNormalization?: string;
  basisNormalization?: string;
  windowNormalization?: string;
}

export interface ProviderMetricMapperConfig {
  providerId: string;
  mapperVersion: string;
  fieldMappings: ProviderFieldMapping[];
}

export interface MetricMappingArtifact {
  artifactId: string;
  providerId: string;
  rawFieldName: string;
  proposedMetricPath: string | null;
  contractVersionTargeted: string | null;
  unitNormalization: string | null;
  basisNormalization: string | null;
  windowNormalization: string | null;
  mappingConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  mapperVersion: string;
  status: MetricMappingStatus;
  blockReason: string | null;
  createdAt: string;
}

export interface MapProviderMetricInput {
  providerId: string;
  rawFieldName: string;
  rawValue: number | string | boolean | Record<string, unknown>;
  rawUnit?: string;
  rawTimestamp?: string;
  objectId: string;
  objectType: string;
  lineageRefs: string[];
}

export interface MapProviderMetricResult {
  status: MetricMappingStatus;
  metricPath: string | null;
  contract: MetricContract | null;
  normalizedValue: number | string | boolean | Record<string, unknown>;
  normalizedUnit: string | null;
  artifact: MetricMappingArtifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAPPER REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

const _mapperConfigs = new Map<string, ProviderMetricMapperConfig>();
const _mappingArtifacts: MetricMappingArtifact[] = [];

export function registerProviderMetricMapper(config: ProviderMetricMapperConfig): void {
  _mapperConfigs.set(config.providerId, config);
}

export function getProviderMetricMapper(providerId: string): ProviderMetricMapperConfig | undefined {
  return _mapperConfigs.get(providerId);
}

export function listMappableProviderFields(providerId: string): ProviderFieldMapping[] {
  return _mapperConfigs.get(providerId)?.fieldMappings ?? [];
}

export function getAllMappingArtifacts(): readonly MetricMappingArtifact[] {
  return _mappingArtifacts;
}

export function resetMapperState(): void {
  _mapperConfigs.clear();
  _mappingArtifacts.length = 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAPPER EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

export function mapProviderMetric(input: MapProviderMetricInput): MapProviderMetricResult {
  const config = _mapperConfigs.get(input.providerId);

  if (!config) {
    const artifact = emitArtifact(input.providerId, input.rawFieldName, null, null, 'BLOCKED', 'NO_MAPPER_CONFIG');
    return { status: 'BLOCKED', metricPath: null, contract: null, normalizedValue: input.rawValue, normalizedUnit: null, artifact };
  }

  const mapping = config.fieldMappings.find(m => m.providerFieldName === input.rawFieldName);
  if (!mapping) {
    const artifact = emitArtifact(input.providerId, input.rawFieldName, null, null, 'BLOCKED', 'FIELD_NOT_IN_MAPPER');
    return { status: 'BLOCKED', metricPath: null, contract: null, normalizedValue: input.rawValue, normalizedUnit: null, artifact };
  }

  const contract = getMetricContract(mapping.canonicalMetricPath);
  if (!contract) {
    const artifact = emitArtifact(input.providerId, input.rawFieldName, mapping.canonicalMetricPath, null, 'BLOCKED', 'NO_METRIC_CONTRACT');
    return { status: 'BLOCKED', metricPath: mapping.canonicalMetricPath, contract: null, normalizedValue: input.rawValue, normalizedUnit: null, artifact };
  }

  const normalizedValue = normalizeValue(input.rawValue, contract);
  const artifact = emitArtifact(
    input.providerId, input.rawFieldName,
    mapping.canonicalMetricPath, contract.contractVersion,
    'MAPPED', null,
    mapping.unitNormalization, mapping.basisNormalization, mapping.windowNormalization,
  );

  return {
    status: 'MAPPED',
    metricPath: mapping.canonicalMetricPath,
    contract,
    normalizedValue,
    normalizedUnit: contract.unit,
    artifact,
  };
}

function normalizeValue(
  raw: number | string | boolean | Record<string, unknown>,
  contract: MetricContract,
): number | string | boolean | Record<string, unknown> {
  if (contract.valueType === 'DECIMAL' && typeof raw === 'string') {
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) return parsed;
  }
  if (contract.valueType === 'INTEGER' && typeof raw === 'string') {
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) return parsed;
  }
  if (contract.valueType === 'BOOLEAN' && typeof raw === 'string') {
    return raw === 'true' || raw === '1';
  }
  return raw;
}

function emitArtifact(
  providerId: string,
  rawFieldName: string,
  proposedPath: string | null,
  contractVersion: string | null,
  status: MetricMappingStatus,
  blockReason: string | null,
  unitNorm?: string | null,
  basisNorm?: string | null,
  windowNorm?: string | null,
): MetricMappingArtifact {
  const artifact: MetricMappingArtifact = {
    artifactId: `mmap_${uuidv4()}`,
    providerId,
    rawFieldName,
    proposedMetricPath: proposedPath,
    contractVersionTargeted: contractVersion,
    unitNormalization: unitNorm ?? null,
    basisNormalization: basisNorm ?? null,
    windowNormalization: windowNorm ?? null,
    mappingConfidence: status === 'MAPPED' ? 'HIGH' : status === 'PARTIAL' ? 'MEDIUM' : 'LOW',
    mapperVersion: L35_MAPPER_VERSION,
    status,
    blockReason,
    createdAt: new Date().toISOString(),
  };
  _mappingArtifacts.push(artifact);
  return artifact;
}

export { emitArtifact as emitMetricMappingArtifact };
