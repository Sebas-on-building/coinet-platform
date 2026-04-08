/**
 * L4.0 — Graph Object Model Bootstrap: Canonical Projection
 *
 * Projects Layer 3 canonical objects into Layer 4 canonical graph nodes.
 * Projection is one-way: L4 reads L3, L4 never mutates L3 identity.
 */

import type { CanonicalObjectType } from '../canonicalization/canonical-entity-types';
import type {
  GraphNodeRecord, CanonicalNodeType,
} from './graph-node-types';
import {
  getDefaultCanonicalCapabilities,
  getDefaultCanonicalRestrictions,
} from './graph-node-types';
import {
  registerGraphNode,
  getGraphNodeByCanonicalObjectId,
  getGraphNodeById,
} from './graph-node-registry';
import { validateCanonicalProjection } from './graph-node-validator';

// ═══════════════════════════════════════════════════════════════════════════════
// L3 OBJECT TYPE → L4 CANONICAL NODE TYPE MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

const L3_TO_L4_NODE_TYPE: Record<string, CanonicalNodeType> = {
  ASSET: 'ASSET',
  PAIR: 'PAIR',
  PROTOCOL: 'PROTOCOL',
  ENTITY: 'ENTITY',
  CHAIN: 'CHAIN',
  NARRATIVE_TOPIC: 'NARRATIVE_TOPIC',
};

export function mapL3TypeToCanonicalNodeType(
  objectType: CanonicalObjectType | string,
): CanonicalNodeType | undefined {
  return L3_TO_L4_NODE_TYPE[objectType];
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISTIC NODE ID
// ═══════════════════════════════════════════════════════════════════════════════

export function buildCanonicalNodeId(objectType: string, canonicalObjectId: string): string {
  return `gn:canonical:${objectType.toLowerCase()}:${canonicalObjectId}`;
}

export function buildNativeNodeId(subtype: string, key: string): string {
  return `gn:native:${subtype.toLowerCase()}:${key}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECTION INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface CanonicalProjectionInput {
  canonicalObjectId: string;
  objectType: CanonicalObjectType | string;
  label: string;
  version?: string;
  confidenceRef?: string;
  lineageRefs?: string[];
  metadata?: Record<string, unknown>;
}

export interface ProjectionResult {
  success: boolean;
  nodeId?: string;
  node?: GraphNodeRecord;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT — create a canonical graph node from L3 object
// ═══════════════════════════════════════════════════════════════════════════════

export function projectCanonicalObjectToGraphNode(
  input: CanonicalProjectionInput,
): ProjectionResult {
  const canonicalNodeType = mapL3TypeToCanonicalNodeType(input.objectType);
  if (!canonicalNodeType) {
    return { success: false, error: `UNKNOWN_L3_OBJECT_TYPE:${input.objectType}` };
  }

  const existing = getGraphNodeByCanonicalObjectId(input.canonicalObjectId);
  if (existing && existing.lifecycleState === 'ACTIVE') {
    return { success: false, error: `DUPLICATE_PROJECTION:${input.canonicalObjectId}` };
  }

  const nodeId = buildCanonicalNodeId(input.objectType, input.canonicalObjectId);
  const now = new Date().toISOString();

  const node: GraphNodeRecord = {
    nodeId,
    nodeClass: 'CANONICAL',
    canonicalNodeType,
    nativeNodeType: undefined,
    origin: 'L3_CANONICAL_PROJECTION',
    canonicalObjectId: input.canonicalObjectId,
    label: input.label,
    version: input.version ?? '1.0.0',
    lifecycleState: 'ACTIVE',
    capabilities: getDefaultCanonicalCapabilities(),
    restrictions: getDefaultCanonicalRestrictions(),
    createdAt: now,
    updatedAt: now,
    evidenceRefs: [],
    lineageRefs: input.lineageRefs ?? [],
    metadata: {
      ...input.metadata,
      ...(input.confidenceRef ? { confidenceRef: input.confidenceRef } : {}),
    },
  };

  const validation = validateCanonicalProjection(node);
  if (!validation.valid) {
    return { success: false, error: validation.violations.map(v => v.code).join(', ') };
  }

  const reg = registerGraphNode(node);
  if (!reg.success) {
    return { success: false, error: reg.error };
  }

  return { success: true, nodeId, node };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC — update a canonical node when L3 state changes
// ═══════════════════════════════════════════════════════════════════════════════

export function syncCanonicalGraphNode(
  canonicalObjectId: string,
  updates: {
    label?: string;
    version?: string;
    confidenceRef?: string;
    lifecycleState?: GraphNodeRecord['lifecycleState'];
    metadata?: Record<string, unknown>;
  },
): ProjectionResult {
  const node = getGraphNodeByCanonicalObjectId(canonicalObjectId);
  if (!node) {
    return { success: false, error: `CANONICAL_NODE_NOT_FOUND:${canonicalObjectId}` };
  }

  if (updates.label) node.label = updates.label;
  if (updates.version) node.version = updates.version;
  if (updates.lifecycleState) node.lifecycleState = updates.lifecycleState;
  if (updates.confidenceRef) node.metadata.confidenceRef = updates.confidenceRef;
  if (updates.metadata) Object.assign(node.metadata, updates.metadata);
  node.updatedAt = new Date().toISOString();

  return { success: true, nodeId: node.nodeId, node };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REBUILD — full re-projection of a canonical node from scratch
// ═══════════════════════════════════════════════════════════════════════════════

export function rebuildCanonicalNodeProjection(
  input: CanonicalProjectionInput,
): ProjectionResult {
  const existing = getGraphNodeByCanonicalObjectId(input.canonicalObjectId);
  if (existing) {
    existing.lifecycleState = 'HISTORICAL';
    existing.updatedAt = new Date().toISOString();
  }

  return projectCanonicalObjectToGraphNode(input);
}
