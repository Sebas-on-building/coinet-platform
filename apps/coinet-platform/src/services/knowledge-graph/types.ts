/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     KNOWLEDGE GRAPH — TYPE SYSTEM                                             ║
 * ║                                                                               ║
 * ║   Defines how canonical entities relate to one another.                       ║
 * ║   These relationships enable higher-order reasoning:                          ║
 * ║   sector-linked moves, entity context, cross-asset propagation.              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// RELATIONSHIP TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type RelationshipType =
  | 'BUILT_ON'          // protocol → chain
  | 'NATIVE_TOKEN_OF'   // asset → chain
  | 'GOVERNANCE_TOKEN'  // asset → protocol
  | 'BELONGS_TO_SECTOR' // asset → sector
  | 'MEMBER_OF_NARRATIVE' // asset → narrative
  | 'CHILD_CHAIN'       // chain → chain (L2 → L1)
  | 'COMPETES_WITH'     // protocol → protocol
  | 'FORKED_FROM'       // protocol → protocol
  | 'WALLET_HOLDS'      // wallet → asset
  | 'WALLET_INTERACTS'  // wallet → protocol
  | 'ECOSYSTEM_MEMBER'; // asset/protocol → chain (broad ecosystem)

export interface Relationship {
  from: string;   // canonical ID
  to: string;     // canonical ID
  type: RelationshipType;
  /** Strength of relationship 0–1 (1 = definitive, 0.5 = moderate, < 0.3 = weak) */
  strength: number;
  /** Additional metadata */
  meta?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRAPH NODE
// ═══════════════════════════════════════════════════════════════════════════════

export interface GraphNode {
  canonicalId: string;
  kind: string;
  edges: Relationship[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface EntityContext {
  entityId: string;
  /** Direct relationships */
  relationships: Relationship[];
  /** The chain ecosystem this entity belongs to */
  ecosystem: string | null;
  /** Sector context */
  sector: string | null;
  /** Related assets in same sector/narrative */
  relatedAssets: string[];
  /** Protocol context (if asset is a governance token) */
  protocol: string | null;
  /** Parent chain (if L2) */
  parentChain: string | null;
  /** Active narrative memberships */
  narratives: string[];
  /** Competing protocols */
  competitors: string[];
  /** Child chains (for L1s) */
  childChains: string[];
  /** Market cap bucket from canonical entity */
  capBucket: string | null;
  /** Entity category from canonical entity */
  category: string | null;
}

export interface SectorContext {
  sectorId: string;
  members: string[];
  activeNarratives: string[];
}
