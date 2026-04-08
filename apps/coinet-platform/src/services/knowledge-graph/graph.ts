/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     KNOWLEDGE GRAPH — IN-MEMORY GRAPH ENGINE                                  ║
 * ║                                                                               ║
 * ║   Stores and queries entity relationships. Bootstrapped from the             ║
 * ║   canonical registry and enriched at runtime.                                ║
 * ║                                                                               ║
 * ║   Enables: sector-linked analysis, ecosystem context, entity reasoning.      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { registry } from '../canonical/registry';
import type { AssetEntity, ProtocolEntity, ChainEntity } from '../canonical/types';
import type { Relationship, RelationshipType, EntityContext, GraphNode } from './types';
import type { EntityConfidenceState } from '../canonicalization/entity-confidence-model';
import type { ConfidenceGateDecision } from '../canonicalization/confidence-gate';

// ═══════════════════════════════════════════════════════════════════════════════
// GRAPH
// ═══════════════════════════════════════════════════════════════════════════════

class KnowledgeGraph {
  private edges: Relationship[] = [];
  private byFrom = new Map<string, Relationship[]>();
  private byTo = new Map<string, Relationship[]>();

  addRelationship(rel: Relationship): void {
    const existing = this.byFrom.get(rel.from) ?? [];
    const duplicate = existing.some(
      e => e.to === rel.to && e.type === rel.type
    );
    if (duplicate) return;

    this.edges.push(rel);

    const fromList = this.byFrom.get(rel.from) ?? [];
    fromList.push(rel);
    this.byFrom.set(rel.from, fromList);

    const toList = this.byTo.get(rel.to) ?? [];
    toList.push(rel);
    this.byTo.set(rel.to, toList);
  }

  getOutgoing(entityId: string, type?: RelationshipType): Relationship[] {
    const all = this.byFrom.get(entityId) ?? [];
    return type ? all.filter(r => r.type === type) : all;
  }

  getIncoming(entityId: string, type?: RelationshipType): Relationship[] {
    const all = this.byTo.get(entityId) ?? [];
    return type ? all.filter(r => r.type === type) : all;
  }

  getAllEdges(entityId: string): Relationship[] {
    return [...this.getOutgoing(entityId), ...this.getIncoming(entityId)];
  }

  /**
   * Build a full context object for an entity.
   * This is the main query method used by scoring and judgment engines.
   */
  getEntityContext(entityId: string): EntityContext {
    const relationships = this.getAllEdges(entityId);

    const ecosystemRels = [
      ...this.getOutgoing(entityId, 'ECOSYSTEM_MEMBER'),
      ...this.getOutgoing(entityId, 'BUILT_ON'),
      ...this.getOutgoing(entityId, 'NATIVE_TOKEN_OF'),
    ];
    const ecosystem = ecosystemRels.length > 0 ? ecosystemRels[0].to : null;

    const sectorRels = this.getOutgoing(entityId, 'BELONGS_TO_SECTOR');
    const sector = sectorRels.length > 0 ? sectorRels[0].to : null;

    const relatedAssets = sector
      ? this.getIncoming(sector, 'BELONGS_TO_SECTOR')
          .map(r => r.from)
          .filter(id => id !== entityId)
      : [];

    const govRels = this.getOutgoing(entityId, 'GOVERNANCE_TOKEN');
    const protocol = govRels.length > 0 ? govRels[0].to : null;

    let parentChain: string | null = null;
    const entity = registry.getByCanonicalId(entityId);
    if (entity?.kind === 'chain') {
      const childRels = this.getOutgoing(entityId, 'CHILD_CHAIN');
      parentChain = childRels.length > 0 ? childRels[0].to : null;
    }

    // Narratives
    const narrativeRels = this.getOutgoing(entityId, 'MEMBER_OF_NARRATIVE');
    const narratives = narrativeRels.map(r => r.to);

    // Competitors (via protocol governance → protocol → COMPETES_WITH)
    const competitors: string[] = [];
    if (protocol) {
      const compRels = [
        ...this.getOutgoing(protocol, 'COMPETES_WITH'),
        ...this.getIncoming(protocol, 'COMPETES_WITH'),
      ];
      for (const r of compRels) {
        const compId = r.from === protocol ? r.to : r.from;
        if (compId !== protocol) competitors.push(compId);
      }
    }
    const directComp = [
      ...this.getOutgoing(entityId, 'COMPETES_WITH'),
      ...this.getIncoming(entityId, 'COMPETES_WITH'),
    ];
    for (const r of directComp) {
      const compId = r.from === entityId ? r.to : r.from;
      if (!competitors.includes(compId)) competitors.push(compId);
    }

    // Child chains (for L1s)
    const childChains = this.getIncoming(entityId, 'CHILD_CHAIN').map(r => r.from);

    // Cap bucket and category from canonical entity
    let capBucket: string | null = null;
    let category: string | null = null;
    if (entity) {
      if ('capBucket' in entity && entity.capBucket) capBucket = entity.capBucket as string;
      if ('category' in entity && entity.category) category = entity.category as string;
      if ('sector' in entity && entity.sector && !category) category = entity.sector as string;
    }

    return {
      entityId,
      relationships,
      ecosystem,
      sector,
      relatedAssets: relatedAssets.slice(0, 20),
      protocol,
      parentChain,
      narratives,
      competitors,
      childChains,
      capBucket,
      category,
    };
  }

  /**
   * Find all assets in a given sector.
   */
  getSectorMembers(sectorId: string): string[] {
    return this.getIncoming(sectorId, 'BELONGS_TO_SECTOR').map(r => r.from);
  }

  /**
   * Find all assets/protocols in a chain ecosystem.
   */
  getEcosystemMembers(chainId: string): string[] {
    return [
      ...this.getIncoming(chainId, 'ECOSYSTEM_MEMBER'),
      ...this.getIncoming(chainId, 'BUILT_ON'),
      ...this.getIncoming(chainId, 'NATIVE_TOKEN_OF'),
    ].map(r => r.from);
  }

  /**
   * Find shortest path between two entities (BFS, max depth 4).
   */
  findPath(fromId: string, toId: string, maxDepth = 4): string[] | null {
    if (fromId === toId) return [fromId];

    const visited = new Set<string>([fromId]);
    const queue: Array<{ id: string; path: string[] }> = [{ id: fromId, path: [fromId] }];

    while (queue.length > 0) {
      const current = queue.shift()!;

      // Stop expanding once we've reached the depth limit
      if (current.path.length >= maxDepth) continue;

      const neighbors = this.getAllEdges(current.id).map(r =>
        r.from === current.id ? r.to : r.from
      );

      for (const neighbor of neighbors) {
        if (neighbor === toId) return [...current.path, neighbor];
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ id: neighbor, path: [...current.path, neighbor] });
        }
      }
    }

    return null;
  }

  /**
   * L3.3-B confidence-gated relationship insertion.
   * Checks the confidence gate before adding a graph edge.
   * Denied mutations are blocked; conditional/scar-allowed are tagged.
   */
  addGatedRelationship(
    rel: Relationship,
    confidenceState: EntityConfidenceState | undefined,
  ): { added: boolean; gateDecision?: ConfidenceGateDecision } {
    if (!confidenceState) {
      this.addRelationship(rel);
      return { added: true };
    }
    try {
      const { canUseForGraphRelation } =
        require('../canonicalization/confidence-gate') as typeof import('../canonicalization/confidence-gate');
      const gate = canUseForGraphRelation(rel.from, confidenceState.objectType, confidenceState);
      if (!gate.allowed) {
        return { added: false, gateDecision: gate };
      }
      if (gate.mode === 'ALLOW_WITH_SCAR' || gate.mode === 'CONDITIONAL') {
        rel.meta = {
          ...rel.meta,
          confidence_gate_band: gate.band,
          confidence_gate_mode: gate.mode,
          confidence_gate_scars: gate.activeScars.map(s => s.code),
          provisional: true,
        };
      }
      this.addRelationship(rel);
      return { added: true, gateDecision: gate };
    } catch {
      this.addRelationship(rel);
      return { added: true };
    }
  }

  get size(): { nodes: number; edges: number } {
    const nodeIds = new Set<string>();
    for (const e of this.edges) {
      nodeIds.add(e.from);
      nodeIds.add(e.to);
    }
    return { nodes: nodeIds.size, edges: this.edges.length };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON + BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════════════════

export const graph = new KnowledgeGraph();

function rel(from: string, to: string, type: RelationshipType, strength = 1.0): Relationship {
  return { from, to, type, strength };
}

function bootstrapGraph(): void {
  // ── Chain hierarchy ───────────────────────────────────────────────────
  graph.addRelationship(rel('chain:polygon', 'chain:ethereum', 'CHILD_CHAIN'));
  graph.addRelationship(rel('chain:arbitrum', 'chain:ethereum', 'CHILD_CHAIN'));
  graph.addRelationship(rel('chain:base', 'chain:ethereum', 'CHILD_CHAIN'));
  graph.addRelationship(rel('chain:optimism', 'chain:ethereum', 'CHILD_CHAIN'));

  // ── Asset → chain (native tokens) ────────────────────────────────────
  graph.addRelationship(rel('asset:ethereum', 'chain:ethereum', 'NATIVE_TOKEN_OF'));
  graph.addRelationship(rel('asset:solana', 'chain:solana', 'NATIVE_TOKEN_OF'));
  graph.addRelationship(rel('asset:binancecoin', 'chain:bsc', 'NATIVE_TOKEN_OF'));
  graph.addRelationship(rel('asset:avalanche', 'chain:avalanche', 'NATIVE_TOKEN_OF'));
  graph.addRelationship(rel('asset:polkadot', 'chain:polkadot', 'NATIVE_TOKEN_OF', 0.9));

  // ── Asset → ecosystem ────────────────────────────────────────────────
  graph.addRelationship(rel('asset:uniswap', 'chain:ethereum', 'ECOSYSTEM_MEMBER'));
  graph.addRelationship(rel('asset:aave', 'chain:ethereum', 'ECOSYSTEM_MEMBER'));
  graph.addRelationship(rel('asset:chainlink', 'chain:ethereum', 'ECOSYSTEM_MEMBER'));
  graph.addRelationship(rel('asset:pepe', 'chain:ethereum', 'ECOSYSTEM_MEMBER'));

  // ── Asset → governance token of protocol ──────────────────────────────
  graph.addRelationship(rel('asset:uniswap', 'protocol:uniswap', 'GOVERNANCE_TOKEN'));
  graph.addRelationship(rel('asset:aave', 'protocol:aave', 'GOVERNANCE_TOKEN'));

  // ── Protocol → chain ─────────────────────────────────────────────────
  graph.addRelationship(rel('protocol:uniswap', 'chain:ethereum', 'BUILT_ON'));
  graph.addRelationship(rel('protocol:uniswap', 'chain:polygon', 'BUILT_ON', 0.7));
  graph.addRelationship(rel('protocol:uniswap', 'chain:arbitrum', 'BUILT_ON', 0.7));
  graph.addRelationship(rel('protocol:aave', 'chain:ethereum', 'BUILT_ON'));
  graph.addRelationship(rel('protocol:aave', 'chain:polygon', 'BUILT_ON', 0.7));
  graph.addRelationship(rel('protocol:lido', 'chain:ethereum', 'BUILT_ON'));
  graph.addRelationship(rel('protocol:makerdao', 'chain:ethereum', 'BUILT_ON'));

  // ── Sector memberships ───────────────────────────────────────────────
  const defiAssets = ['asset:uniswap', 'asset:aave'];
  for (const a of defiAssets) {
    graph.addRelationship(rel(a, 'sector:defi', 'BELONGS_TO_SECTOR'));
  }

  const memeAssets = ['asset:dogecoin', 'asset:pepe'];
  for (const a of memeAssets) {
    graph.addRelationship(rel(a, 'sector:meme', 'BELONGS_TO_SECTOR'));
  }

  const l1Assets = ['asset:ethereum', 'asset:solana', 'asset:avalanche', 'asset:cardano', 'asset:polkadot'];
  for (const a of l1Assets) {
    graph.addRelationship(rel(a, 'sector:smart-contract-platform', 'BELONGS_TO_SECTOR'));
  }

  graph.addRelationship(rel('asset:chainlink', 'sector:oracle', 'BELONGS_TO_SECTOR'));
  graph.addRelationship(rel('asset:usdt', 'sector:stablecoin', 'BELONGS_TO_SECTOR'));
  graph.addRelationship(rel('asset:usdc', 'sector:stablecoin', 'BELONGS_TO_SECTOR'));

  // ── Competitive relationships ────────────────────────────────────────
  graph.addRelationship(rel('protocol:uniswap', 'protocol:sushiswap', 'COMPETES_WITH', 0.7));
  graph.addRelationship(rel('protocol:aave', 'protocol:compound', 'COMPETES_WITH', 0.7));
}

bootstrapGraph();

export { KnowledgeGraph };
