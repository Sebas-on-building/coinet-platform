"""
Knowledge Graph Storage and Querying System

Efficient storage, indexing, and querying capabilities for the knowledge graph
with support for various query types and real-time synchronization.
"""

import json
import sqlite3
import asyncio
from typing import Dict, List, Set, Optional, Any, Tuple, Union
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import logging
import os
import pickle
import threading
from contextlib import contextmanager

from coinet_ai_ml.knowledge_graph.core import KnowledgeGraph, Entity, Relationship, Property, EntityType, RelationshipType

logger = logging.getLogger(__name__)


class StorageBackend(Enum):
    """Storage backend options"""
    SQLITE = "sqlite"
    JSON_FILE = "json_file"
    IN_MEMORY = "in_memory"
    POSTGRESQL = "postgresql"
    NEO4J = "neo4j"


@dataclass
class Query:
    """Represents a knowledge graph query"""
    query_type: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    filters: Dict[str, Any] = field(default_factory=dict)
    limit: Optional[int] = None
    offset: int = 0
    include_metadata: bool = True

    def to_dict(self) -> Dict[str, Any]:
        """Convert query to dictionary"""
        return {
            'query_type': self.query_type,
            'parameters': self.parameters,
            'filters': self.filters,
            'limit': self.limit,
            'offset': self.offset,
            'include_metadata': self.include_metadata
        }


@dataclass
class QueryResult:
    """Result of a knowledge graph query"""
    entities: List[Entity] = field(default_factory=list)
    relationships: List[Relationship] = field(default_factory=list)
    total_count: int = 0
    execution_time_ms: float = 0.0
    query: Optional[Query] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class GraphStorage:
    """Persistent storage for knowledge graphs"""

    def __init__(self, backend: StorageBackend = StorageBackend.SQLITE, config: Optional[Dict[str, Any]] = None):
        """Initialize storage backend"""
        self.backend = backend
        self.config = config or self._get_default_config()
        self._lock = threading.RLock()

        # Initialize backend-specific storage
        if backend == "sqlite":
            self._init_sqlite()
        elif backend == "json_file":
            self._init_json_file()
        elif backend == "in_memory":
            self._init_in_memory()
        else:
            raise NotImplementedError(f"Backend {backend} not implemented")

    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration for storage"""
        return {
            'sqlite_path': 'knowledge_graph.db',
            'json_path': 'knowledge_graph.json',
            'auto_commit': True,
            'backup_enabled': True,
            'backup_interval': 300,  # 5 minutes
            'max_connections': 10
        }

    def _init_sqlite(self) -> None:
        """Initialize SQLite storage"""
        db_path = self.config['sqlite_path']
        os.makedirs(os.path.dirname(db_path) if os.path.dirname(db_path) else '.', exist_ok=True)

        self.db_connection = sqlite3.connect(db_path, check_same_thread=False)
        self.db_connection.row_factory = sqlite3.Row
        self._create_sqlite_tables()
        self._create_sqlite_indexes()

    def _create_sqlite_tables(self) -> None:
        """Create SQLite tables for knowledge graph storage"""
        cursor = self.db_connection.cursor()

        # Entities table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS entities (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                properties TEXT,  -- JSON serialized
                aliases TEXT,     -- JSON serialized
                confidence REAL DEFAULT 1.0,
                source TEXT,
                created_at TEXT,
                updated_at TEXT,
                metadata TEXT     -- JSON serialized
            )
        ''')

        # Relationships table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS relationships (
                id TEXT PRIMARY KEY,
                source_id TEXT NOT NULL,
                target_id TEXT NOT NULL,
                relationship_type TEXT NOT NULL,
                properties TEXT,  -- JSON serialized
                confidence REAL DEFAULT 1.0,
                source TEXT,
                created_at TEXT,
                updated_at TEXT,
                metadata TEXT,    -- JSON serialized
                FOREIGN KEY (source_id) REFERENCES entities (id),
                FOREIGN KEY (target_id) REFERENCES entities (id)
            )
        ''')

        # Entity index table for fast lookups
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS entity_index (
                key TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                entity_type TEXT,
                PRIMARY KEY (key, entity_id)
            )
        ''')

        # Inference history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS inference_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                inference_type TEXT NOT NULL,
                derived_facts TEXT,  -- JSON serialized
                confidence REAL,
                explanation TEXT,
                source_facts TEXT,   -- JSON serialized
                timestamp TEXT,
                metadata TEXT        -- JSON serialized
            )
        ''')

        self.db_connection.commit()

    def _create_sqlite_indexes(self) -> None:
        """Create indexes for efficient querying"""
        cursor = self.db_connection.cursor()

        # Indexes for fast entity lookups
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_entities_type ON entities (entity_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_entities_name ON entities (name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_entities_created ON entities (created_at)')

        # Indexes for fast relationship lookups
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships (source_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships (target_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships (relationship_type)')

        # Full-text search index
        cursor.execute('CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(name, content=entities, content_rowid=id)')

        self.db_connection.commit()

    def _init_json_file(self) -> None:
        """Initialize JSON file storage"""
        self.json_path = self.config['json_path']
        self._data = {'entities': {}, 'relationships': {}, 'metadata': {}}

        # Load existing data if file exists
        if os.path.exists(self.json_path):
            with open(self.json_path, 'r') as f:
                self._data = json.load(f)

    def _init_in_memory(self) -> None:
        """Initialize in-memory storage"""
        self._data = {'entities': {}, 'relationships': {}, 'metadata': {}}

    def save_knowledge_graph(self, knowledge_graph: KnowledgeGraph) -> None:
        """Save knowledge graph to storage"""
        with self._lock:
            if self.backend == "sqlite":
                self._save_to_sqlite(knowledge_graph)
            elif self.backend == "json_file":
                self._save_to_json(knowledge_graph)
            elif self.backend == "in_memory":
                self._save_to_memory(knowledge_graph)

    def _save_to_sqlite(self, knowledge_graph: KnowledgeGraph) -> None:
        """Save to SQLite database"""
        cursor = self.db_connection.cursor()

        # Clear existing data if this is a full save
        if self.config.get('full_save', False):
            cursor.execute('DELETE FROM entities')
            cursor.execute('DELETE FROM relationships')
            cursor.execute('DELETE FROM entity_index')

        # Save entities
        for entity_id, entity in knowledge_graph.entities.items():
            entity_data = entity.to_dict()
            cursor.execute('''
                INSERT OR REPLACE INTO entities
                (id, name, entity_type, properties, aliases, confidence, source, created_at, updated_at, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                entity_id,
                entity.name,
                entity.entity_type.value,
                json.dumps({k: v.to_dict() for k, v in entity.properties.items()}),
                json.dumps(list(entity.aliases)),
                entity.confidence,
                entity.source,
                entity.created_at.isoformat(),
                entity.updated_at.isoformat(),
                json.dumps(entity.metadata)
            ))

            # Note: FTS table is automatically updated when entities table changes
            # due to content=entities, content_rowid=id configuration

            # Update index
            self._update_entity_index_sqlite(cursor, entity)

        # Save relationships
        for rel_id, relationship in knowledge_graph.relationships.items():
            rel_data = relationship.to_dict()
            cursor.execute('''
                INSERT OR REPLACE INTO relationships
                (id, source_id, target_id, relationship_type, properties, confidence, source, created_at, updated_at, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                rel_id,
                relationship.source_id,
                relationship.target_id,
                relationship.relationship_type.value,
                json.dumps({k: v.to_dict() for k, v in relationship.properties.items()}),
                relationship.confidence,
                relationship.source,
                relationship.created_at.isoformat(),
                relationship.updated_at.isoformat(),
                json.dumps(relationship.metadata)
            ))

        self.db_connection.commit()

    def _update_entity_index_sqlite(self, cursor: sqlite3.Cursor, entity: Entity) -> None:
        """Update entity index in SQLite"""
        # Remove old index entries
        cursor.execute('DELETE FROM entity_index WHERE entity_id = ?', (entity.id,))

        # Add new index entries
        # Index by name
        cursor.execute('INSERT INTO entity_index (key, entity_id, entity_type) VALUES (?, ?, ?)',
                     (entity.name.lower(), entity.id, entity.entity_type.value))

        # Index by aliases
        for alias in entity.aliases:
            cursor.execute('INSERT INTO entity_index (key, entity_id, entity_type) VALUES (?, ?, ?)',
                         (alias.lower(), entity.id, entity.entity_type.value))

    def _save_to_json(self, knowledge_graph: KnowledgeGraph) -> None:
        """Save to JSON file"""
        self._data = knowledge_graph.to_dict()

        with open(self.json_path, 'w') as f:
            json.dump(self._data, f, indent=2, default=str)

    def _save_to_memory(self, knowledge_graph: KnowledgeGraph) -> None:
        """Save to in-memory storage"""
        self._data = knowledge_graph.to_dict()

    def load_knowledge_graph(self) -> KnowledgeGraph:
        """Load knowledge graph from storage"""
        with self._lock:
            if self.backend == "sqlite":
                return self._load_from_sqlite()
            elif self.backend == "json_file":
                return self._load_from_json()
            elif self.backend == "in_memory":
                return self._load_from_memory()

    def _load_from_sqlite(self) -> KnowledgeGraph:
        """Load from SQLite database"""
        knowledge_graph = KnowledgeGraph()

        cursor = self.db_connection.cursor()

        # Load entities
        cursor.execute('SELECT * FROM entities')
        for row in cursor.fetchall():
            entity = Entity(
                id=row['id'],
                name=row['name'],
                entity_type=EntityType(row['entity_type']),
                properties={k: Property.from_dict(v) for k, v in json.loads(row['properties'] or '{}').items()},
                aliases=set(json.loads(row['aliases'] or '[]')),
                confidence=row['confidence'],
                source=row['source'],
                created_at=datetime.fromisoformat(row['created_at']),
                updated_at=datetime.fromisoformat(row['updated_at']),
                metadata=json.loads(row['metadata'] or '{}')
            )
            knowledge_graph.add_entity(entity)

        # Load relationships
        cursor.execute('SELECT * FROM relationships')
        for row in cursor.fetchall():
            relationship = Relationship(
                id=row['id'],
                source_id=row['source_id'],
                target_id=row['target_id'],
                relationship_type=RelationshipType(row['relationship_type']),
                properties={k: Property.from_dict(v) for k, v in json.loads(row['properties'] or '{}').items()},
                confidence=row['confidence'],
                source=row['source'],
                created_at=datetime.fromisoformat(row['created_at']),
                updated_at=datetime.fromisoformat(row['updated_at']),
                metadata=json.loads(row['metadata'] or '{}')
            )
            knowledge_graph.add_relationship(relationship)

        return knowledge_graph

    def _load_from_json(self) -> KnowledgeGraph:
        """Load from JSON file"""
        with open(self.json_path, 'r') as f:
            data = json.load(f)

        return KnowledgeGraph.from_dict(data)

    def _load_from_memory(self) -> KnowledgeGraph:
        """Load from in-memory storage"""
        return KnowledgeGraph.from_dict(self._data)

    def backup(self, backup_path: Optional[str] = None) -> str:
        """Create a backup of the knowledge graph"""
        if not self.config['backup_enabled']:
            raise ValueError("Backups are disabled")

        if backup_path is None:
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            backup_path = f"knowledge_graph_backup_{timestamp}.json"

        # Load current state and save to backup
        knowledge_graph = self.load_knowledge_graph()
        backup_data = knowledge_graph.to_dict()

        with open(backup_path, 'w') as f:
            json.dump(backup_data, f, indent=2, default=str)

        logger.info(f"Knowledge graph backed up to {backup_path}")
        return backup_path

    def close(self) -> None:
        """Close storage connection"""
        if self.backend == "sqlite":
            self.db_connection.close()


class QueryEngine:
    """Advanced querying engine for knowledge graphs"""

    def __init__(self, storage: GraphStorage):
        """Initialize query engine"""
        self.storage = storage
        self.knowledge_graph = storage.load_knowledge_graph()

    def execute_query(self, query: Query) -> QueryResult:
        """Execute a query against the knowledge graph"""
        start_time = datetime.utcnow()

        try:
            if query.query_type == 'find_entities':
                entities = self._find_entities(query)
                relationships = []
            elif query.query_type == 'find_relationships':
                entities = []
                relationships = self._find_relationships(query)
            elif query.query_type == 'find_paths':
                entities = []
                relationships = []
                # Path finding would be handled separately
            elif query.query_type == 'subgraph':
                subgraph = self._get_subgraph(query)
                entities = list(subgraph.entities.values())
                relationships = list(subgraph.relationships.values())
            else:
                raise ValueError(f"Unknown query type: {query.query_type}")

            # Apply pagination
            if query.limit:
                entities = entities[query.offset:query.offset + query.limit]
                relationships = relationships[query.offset:query.offset + query.limit]

            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000

            return QueryResult(
                entities=entities,
                relationships=relationships,
                total_count=len(entities) + len(relationships),
                execution_time_ms=execution_time,
                query=query,
                metadata={'query_type': query.query_type}
            )

        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            return QueryResult(
                entities=[],
                relationships=[],
                total_count=0,
                execution_time_ms=execution_time,
                metadata={'error': str(e)}
            )

    def _find_entities(self, query: Query) -> List[Entity]:
        """Find entities matching query criteria"""
        entities = list(self.knowledge_graph.entities.values())

        # Apply filters
        if 'entity_type' in query.filters:
            entity_type = EntityType(query.filters['entity_type'])
            entities = [e for e in entities if e.entity_type == entity_type]

        if 'name_pattern' in query.filters:
            pattern = query.filters['name_pattern']
            entities = [e for e in entities if pattern.lower() in e.name.lower()]

        if 'has_property' in query.filters:
            prop_name = query.filters['has_property']
            entities = [e for e in entities if prop_name in e.properties]

        if 'property_value' in query.filters:
            prop_name = query.filters['property_value']['property']
            value = query.filters['property_value']['value']
            entities = [e for e in entities if e.get_property(prop_name) and e.get_property(prop_name).value == value]

        return entities

    def _find_relationships(self, query: Query) -> List[Relationship]:
        """Find relationships matching query criteria"""
        relationships = list(self.knowledge_graph.relationships.values())

        # Apply filters
        if 'source_id' in query.filters:
            relationships = [r for r in relationships if r.source_id == query.filters['source_id']]

        if 'target_id' in query.filters:
            relationships = [r for r in relationships if r.target_id == query.filters['target_id']]

        if 'relationship_type' in query.filters:
            rel_type = RelationshipType(query.filters['relationship_type'])
            relationships = [r for r in relationships if r.relationship_type == rel_type]

        if 'min_confidence' in query.filters:
            min_conf = query.filters['min_confidence']
            relationships = [r for r in relationships if r.confidence >= min_conf]

        return relationships

    def _get_subgraph(self, query: Query) -> KnowledgeGraph:
        """Get subgraph around specified entities"""
        center_ids = query.parameters.get('center_entities', [])
        radius = query.parameters.get('radius', 1)

        if not center_ids:
            return KnowledgeGraph()

        # Get subgraph for each center entity
        subgraph = KnowledgeGraph()
        for center_id in center_ids:
            center_subgraph = self.knowledge_graph.get_subgraph(center_id, radius)
            # Merge subgraphs
            for entity in center_subgraph.entities.values():
                subgraph.add_entity(entity)
            for rel in center_subgraph.relationships.values():
                subgraph.add_relationship(rel)

        return subgraph

    def search_by_text(self, search_text: str, entity_types: List[EntityType] = None,
                      limit: int = 10) -> List[Entity]:
        """Full-text search across entity names and properties"""
        entities = []

        search_lower = search_text.lower()

        for entity in self.knowledge_graph.entities.values():
            # Skip if entity type filter is specified and doesn't match
            if entity_types and entity.entity_type not in entity_types:
                continue

            # Search in entity name
            if search_lower in entity.name.lower():
                entities.append(entity)
                continue

            # Search in aliases
            if any(search_lower in alias.lower() for alias in entity.aliases):
                entities.append(entity)
                continue

            # Search in properties
            for prop in entity.properties.values():
                if search_lower in str(prop.value).lower():
                    entities.append(entity)
                    break

            # Limit results
            if len(entities) >= limit:
                break

        return entities

    def get_entity_network(self, entity_id: str, max_depth: int = 2) -> Dict[str, Any]:
        """Get network information for an entity"""
        if entity_id not in self.knowledge_graph.entities:
            return {}

        entity = self.knowledge_graph.entities[entity_id]

        # Get direct relationships
        direct_relationships = self.knowledge_graph.get_relationships(source_id=entity_id) + \
                              self.knowledge_graph.get_relationships(target_id=entity_id)

        # Get entities at different depths
        depth_entities = {0: {entity_id: entity}}

        for depth in range(1, max_depth + 1):
            entities_at_depth = set()

            for rel in direct_relationships:
                if depth == 1:
                    # Direct connections
                    if rel.source_id == entity_id:
                        entities_at_depth.add(rel.target_id)
                    else:
                        entities_at_depth.add(rel.source_id)

            # Get entities at this depth
            depth_entities[depth] = {
                eid: self.knowledge_graph.entities[eid]
                for eid in entities_at_depth
                if eid in self.knowledge_graph.entities
            }

        return {
            'center_entity': entity,
            'depth_entities': depth_entities,
            'total_connections': sum(len(entities) for entities in depth_entities.values()),
            'max_depth': max_depth
        }

    def get_similar_entities(self, entity_id: str, limit: int = 5) -> List[Tuple[Entity, float]]:
        """Find entities similar to the given entity"""
        if entity_id not in self.knowledge_graph.entities:
            return []

        target_entity = self.knowledge_graph.entities[entity_id]

        similarities = []

        for other_entity in self.knowledge_graph.entities.values():
            if other_entity.id == entity_id:
                continue

            # Calculate similarity based on shared properties and relationships
            similarity = self._calculate_entity_similarity(target_entity, other_entity)
            similarities.append((other_entity, similarity))

        # Sort by similarity and return top results
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:limit]

    def _calculate_entity_similarity(self, entity1: Entity, entity2: Entity) -> float:
        """Calculate similarity between two entities"""
        if entity1.entity_type != entity2.entity_type:
            return 0.0

        # Property-based similarity
        props1 = set(entity1.properties.keys())
        props2 = set(entity2.properties.keys())

        if not props1 and not props2:
            return 1.0

        intersection = props1.intersection(props2)
        union = props1.union(props2)

        jaccard_similarity = len(intersection) / len(union) if union else 0.0

        return jaccard_similarity

    def get_entity_statistics(self) -> Dict[str, Any]:
        """Get statistics about the knowledge graph"""
        entities = list(self.knowledge_graph.entities.values())
        relationships = list(self.knowledge_graph.relationships.values())

        # Entity type distribution
        entity_types = {}
        for entity in entities:
            et = entity.entity_type.value
            entity_types[et] = entity_types.get(et, 0) + 1

        # Relationship type distribution
        relationship_types = {}
        for rel in relationships:
            rt = rel.relationship_type.value
            relationship_types[rt] = relationship_types.get(rt, 0) + 1

        # Average confidence scores
        avg_entity_confidence = sum(e.confidence for e in entities) / len(entities) if entities else 0.0
        avg_relationship_confidence = sum(r.confidence for r in relationships) / len(relationships) if relationships else 0.0

        return {
            'total_entities': len(entities),
            'total_relationships': len(relationships),
            'entity_types': entity_types,
            'relationship_types': relationship_types,
            'avg_entity_confidence': avg_entity_confidence,
            'avg_relationship_confidence': avg_relationship_confidence,
            'graph_density': len(relationships) / (len(entities) * (len(entities) - 1)) if len(entities) > 1 else 0.0,
            'created_at': self.knowledge_graph.created_at.isoformat(),
            'last_updated': self.knowledge_graph.updated_at.isoformat()
        }

    def export_graph(self, format: str = 'json', include_inferred: bool = False) -> str:
        """Export knowledge graph in various formats"""
        if format == 'json':
            data = self.knowledge_graph.to_dict()
            return json.dumps(data, indent=2, default=str)
        elif format == 'cypher':
            # Export as Cypher queries for Neo4j
            return self._export_cypher(include_inferred)
        else:
            raise ValueError(f"Unsupported export format: {format}")

    def _export_cypher(self, include_inferred: bool = False) -> str:
        """Export as Cypher queries for Neo4j"""
        cypher_queries = []

        # Create entities
        for entity in self.knowledge_graph.entities.values():
            labels = [entity.entity_type.value.upper()]
            properties = {
                'name': entity.name,
                'confidence': entity.confidence,
                'source': entity.source,
                'created_at': entity.created_at.isoformat()
            }

            # Add entity properties
            for prop_name, prop in entity.properties.items():
                properties[prop_name] = prop.value

            # Create Cypher CREATE query
            props_str = ', '.join(f'{k}: ${k}' for k in properties.keys())
            query = "CREATE (n:" + ':'.join(labels) + ") { " + props_str + " }"
            cypher_queries.append(query)

        # Create relationships
        for rel in self.knowledge_graph.relationships.values():
            source_entity = self.knowledge_graph.entities[rel.source_id]
            target_entity = self.knowledge_graph.entities[rel.target_id]

            rel_type = rel.relationship_type.value.upper()
            properties = {
                'confidence': rel.confidence,
                'source': rel.source,
                'created_at': rel.created_at.isoformat()
            }

            # Add relationship properties
            for prop_name, prop in rel.properties.items():
                properties[prop_name] = prop.value

            props_str = ', '.join(f'{k}: ${k}' for k in properties.keys())
            query = """
            MATCH (a {""" + source_entity.name + """: $source_name}}), (b {""" + target_entity.name + """: $target_name}})
            CREATE (a)-[r:""" + rel_type + """] {""" + props_str + """}->(b)
            """
            cypher_queries.append(query)

        return '\n'.join(cypher_queries)

    def sync_with_storage(self) -> None:
        """Sync knowledge graph with storage"""
        self.knowledge_graph = self.storage.load_knowledge_graph()

    def update_from_knowledge_graph(self, knowledge_graph: KnowledgeGraph) -> None:
        """Update internal knowledge graph reference"""
        self.knowledge_graph = knowledge_graph
