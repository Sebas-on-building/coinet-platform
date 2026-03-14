/**
 * Knowledge Graph — public API.
 *
 * Provides relational intelligence to all platform engines.
 * Use getEntityContext() for the primary enrichment query.
 */

export { graph } from './graph';
export type {
  Relationship,
  RelationshipType,
  EntityContext,
  SectorContext,
  GraphNode,
} from './types';
