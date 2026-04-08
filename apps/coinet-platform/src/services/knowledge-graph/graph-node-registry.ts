/**
 * L4.0 — Graph Object Model Bootstrap: Node Registry
 *
 * Registry and storage layer for graph nodes. Maintains class-based indexes,
 * canonical-object-to-node lookups, and graph-native derivation lineage.
 */

import type {
  GraphNodeRecord, GraphNodeClass, CanonicalNodeType,
  GraphNativeNodeType, GraphNodeLifecycleState,
} from './graph-node-types';

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORES
// ═══════════════════════════════════════════════════════════════════════════════

const _byId = new Map<string, GraphNodeRecord>();
const _byCanonicalObjectId = new Map<string, GraphNodeRecord>();
const _byClass = new Map<GraphNodeClass, GraphNodeRecord[]>();
const _byCanonicalSubtype = new Map<CanonicalNodeType, GraphNodeRecord[]>();
const _byNativeSubtype = new Map<GraphNativeNodeType, GraphNodeRecord[]>();
const _byLifecycle = new Map<GraphNodeLifecycleState, GraphNodeRecord[]>();
const _byDerivationBasis = new Map<string, GraphNodeRecord[]>();
const _eventsByAffectedObject = new Map<string, GraphNodeRecord[]>();
const _byClusterKey = new Map<string, GraphNodeRecord>();
const _byCohortKey = new Map<string, GraphNodeRecord>();

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL INDEXING
// ═══════════════════════════════════════════════════════════════════════════════

function indexNode(node: GraphNodeRecord): void {
  _byId.set(node.nodeId, node);

  if (node.canonicalObjectId) {
    _byCanonicalObjectId.set(node.canonicalObjectId, node);
  }

  const classList = _byClass.get(node.nodeClass) ?? [];
  classList.push(node);
  _byClass.set(node.nodeClass, classList);

  if (node.canonicalNodeType) {
    const subList = _byCanonicalSubtype.get(node.canonicalNodeType) ?? [];
    subList.push(node);
    _byCanonicalSubtype.set(node.canonicalNodeType, subList);
  }

  if (node.nativeNodeType) {
    const subList = _byNativeSubtype.get(node.nativeNodeType) ?? [];
    subList.push(node);
    _byNativeSubtype.set(node.nativeNodeType, subList);
  }

  const lcList = _byLifecycle.get(node.lifecycleState) ?? [];
  lcList.push(node);
  _byLifecycle.set(node.lifecycleState, lcList);

  if (node.nativeNodeType && node.metadata.derivationBasis) {
    const basis = String(node.metadata.derivationBasis);
    const dbList = _byDerivationBasis.get(basis) ?? [];
    dbList.push(node);
    _byDerivationBasis.set(basis, dbList);
  }

  const affected = node.metadata.affectedObjectIds;
  if (Array.isArray(affected)) {
    for (const objId of affected) {
      const eList = _eventsByAffectedObject.get(String(objId)) ?? [];
      eList.push(node);
      _eventsByAffectedObject.set(String(objId), eList);
    }
  }

  if (node.metadata.sectorKey) _byClusterKey.set(String(node.metadata.sectorKey), node);
  if (node.metadata.ecosystemKey) _byClusterKey.set(String(node.metadata.ecosystemKey), node);
  if (node.metadata.competitorBasis) _byClusterKey.set(String(node.metadata.competitorBasis), node);
  if (node.metadata.themeKey) _byClusterKey.set(String(node.metadata.themeKey), node);
  if (node.metadata.venueClusterKey) _byClusterKey.set(String(node.metadata.venueClusterKey), node);
  if (node.metadata.cohortKey) _byCohortKey.set(String(node.metadata.cohortKey), node);
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

export function registerGraphNode(node: GraphNodeRecord): { success: boolean; error?: string } {
  const existingById = _byId.get(node.nodeId);
  if (existingById) {
    if (existingById.lifecycleState !== 'HISTORICAL' && existingById.lifecycleState !== 'DEPRECATED') {
      return { success: false, error: `NODE_ID_COLLISION:${node.nodeId}` };
    }
  }

  if (node.nodeClass === 'CANONICAL' && node.canonicalObjectId) {
    const existing = _byCanonicalObjectId.get(node.canonicalObjectId);
    if (existing && existing.lifecycleState === 'ACTIVE') {
      return { success: false, error: `DUPLICATE_CANONICAL_PROJECTION:${node.canonicalObjectId}` };
    }
  }

  if (node.nodeClass === 'CANONICAL' && !node.canonicalNodeType) {
    return { success: false, error: 'CANONICAL_NODE_MISSING_SUBTYPE' };
  }

  if (node.nodeClass === 'GRAPH_NATIVE' && !node.nativeNodeType) {
    return { success: false, error: 'GRAPH_NATIVE_NODE_MISSING_SUBTYPE' };
  }

  if (node.canonicalNodeType && node.nativeNodeType) {
    return { success: false, error: 'HYBRID_NODE_REJECTED' };
  }

  indexNode(node);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOKUPS
// ═══════════════════════════════════════════════════════════════════════════════

export function getGraphNodeById(nodeId: string): GraphNodeRecord | undefined {
  return _byId.get(nodeId);
}

export function getGraphNodeByCanonicalObjectId(canonicalObjectId: string): GraphNodeRecord | undefined {
  return _byCanonicalObjectId.get(canonicalObjectId);
}

export function listGraphNodesByClass(nodeClass: GraphNodeClass): readonly GraphNodeRecord[] {
  return _byClass.get(nodeClass) ?? [];
}

export function listGraphNodesByCanonicalSubtype(subtype: CanonicalNodeType): readonly GraphNodeRecord[] {
  return _byCanonicalSubtype.get(subtype) ?? [];
}

export function listGraphNodesByNativeSubtype(subtype: GraphNativeNodeType): readonly GraphNodeRecord[] {
  return _byNativeSubtype.get(subtype) ?? [];
}

export function listGraphNodesByLifecycle(state: GraphNodeLifecycleState): readonly GraphNodeRecord[] {
  return _byLifecycle.get(state) ?? [];
}

export function getEventNodesByAffectedObject(canonicalObjectId: string): readonly GraphNodeRecord[] {
  return _eventsByAffectedObject.get(canonicalObjectId) ?? [];
}

export function getClusterNodeByKey(key: string): GraphNodeRecord | undefined {
  return _byClusterKey.get(key);
}

export function getCohortNodeByKey(key: string): GraphNodeRecord | undefined {
  return _byCohortKey.get(key);
}

export function getNodesByDerivationBasis(basis: string): readonly GraphNodeRecord[] {
  return _byDerivationBasis.get(basis) ?? [];
}

export function getAllGraphNodes(): readonly GraphNodeRecord[] {
  return [..._byId.values()];
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIFECYCLE MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

function transitionLifecycle(nodeId: string, newState: GraphNodeLifecycleState): boolean {
  const node = _byId.get(nodeId);
  if (!node) return false;
  const oldState = node.lifecycleState;
  node.lifecycleState = newState;
  node.updatedAt = new Date().toISOString();

  const oldList = _byLifecycle.get(oldState);
  if (oldList) {
    const idx = oldList.indexOf(node);
    if (idx >= 0) oldList.splice(idx, 1);
  }
  const newList = _byLifecycle.get(newState) ?? [];
  newList.push(node);
  _byLifecycle.set(newState, newList);

  return true;
}

export function markGraphNodeDeprecated(nodeId: string): boolean {
  return transitionLifecycle(nodeId, 'DEPRECATED');
}

export function markGraphNodeStale(nodeId: string): boolean {
  return transitionLifecycle(nodeId, 'STALE');
}

export function markGraphNodeHistorical(nodeId: string): boolean {
  return transitionLifecycle(nodeId, 'HISTORICAL');
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESET
// ═══════════════════════════════════════════════════════════════════════════════

export function resetGraphNodeRegistry(): void {
  _byId.clear(); _byCanonicalObjectId.clear(); _byClass.clear();
  _byCanonicalSubtype.clear(); _byNativeSubtype.clear(); _byLifecycle.clear();
  _byDerivationBasis.clear(); _eventsByAffectedObject.clear();
  _byClusterKey.clear(); _byCohortKey.clear();
}
