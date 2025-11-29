"""
Core Knowledge Graph Structures

Defines the fundamental components of the knowledge graph including entities,
relationships, properties, and the main graph structure.
"""

from typing import Dict, List, Set, Optional, Any, Union
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import hashlib
import json
import uuid


class EntityType(Enum):
    """Types of entities in the crypto ecosystem"""
    CRYPTO_PROJECT = "crypto_project"
    FOUNDER = "founder"
    EMPLOYEE = "employee"
    INVESTOR = "investor"
    REGULATORY_BODY = "regulatory_body"
    FINANCIAL_INSTRUMENT = "financial_instrument"
    BLOCKCHAIN = "blockchain"
    EXCHANGE = "exchange"
    PROTOCOL = "protocol"
    TOKEN = "token"
    WALLET = "wallet"
    EVENT = "event"
    DOCUMENT = "document"
    PERSON = "person"
    ORGANIZATION = "organization"
    FINANCIAL_AMOUNT = "financial_amount"
    ON_CHAIN_METRIC = "on_chain_metric"
    LOCATION = "location"
    OTHER = "other"


class RelationshipType(Enum):
    """Types of relationships between entities"""
    OWNS = "owns"
    FOUNDED = "founded"
    EMPLOYS = "employs"
    INVESTED_IN = "invested_in"
    PARTNERS_WITH = "partners_with"
    REGULATES = "regulates"
    TRADED_ON = "traded_on"
    BUILT_ON = "built_on"
    COMPETES_WITH = "competes_with"
    ACQUIRED = "acquired"
    MERGED_WITH = "merged_with"
    FORKED_FROM = "forked_from"
    ADVISOR_TO = "advisor_to"
    MENTORS = "mentors"
    COLLABORATES_WITH = "collaborates_with"
    FUNDS = "funds"
    BACKS = "backs"
    SUPPORTS = "supports"
    OPPOSES = "opposes"
    REFERENCES = "references"
    CITES = "cites"


@dataclass
class Property:
    """A property or attribute of an entity"""
    name: str
    value: Any
    data_type: str = "string"
    confidence: float = 1.0
    source: str = "unknown"
    timestamp: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert property to dictionary for serialization"""
        return {
            'name': self.name,
            'value': self.value,
            'data_type': self.data_type,
            'confidence': self.confidence,
            'source': self.source,
            'timestamp': self.timestamp.isoformat(),
            'metadata': self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Property':
        """Create property from dictionary"""
        return cls(
            name=data['name'],
            value=data['value'],
            data_type=data.get('data_type', 'string'),
            confidence=data.get('confidence', 1.0),
            source=data.get('source', 'unknown'),
            timestamp=datetime.fromisoformat(data['timestamp']),
            metadata=data.get('metadata', {})
        )


@dataclass
class Entity:
    """An entity in the knowledge graph"""
    id: str
    name: str
    entity_type: EntityType
    properties: Dict[str, Property] = field(default_factory=dict)
    aliases: Set[str] = field(default_factory=set)
    confidence: float = 1.0
    source: str = "unknown"
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """Generate ID if not provided"""
        if not self.id:
            self.id = self._generate_id()

    def _generate_id(self) -> str:
        """Generate unique ID for entity"""
        content = f"{self.name}_{self.entity_type.value}_{datetime.utcnow().isoformat()}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def add_property(self, property_obj: Property) -> None:
        """Add a property to the entity"""
        self.properties[property_obj.name] = property_obj
        self.updated_at = datetime.utcnow()

    def get_property(self, name: str) -> Optional[Property]:
        """Get a property by name"""
        return self.properties.get(name)

    def update_property(self, name: str, value: Any, source: str = "update", confidence: float = 1.0) -> None:
        """Update or add a property"""
        if name in self.properties:
            self.properties[name].value = value
            self.properties[name].source = source
            self.properties[name].confidence = confidence
            self.properties[name].timestamp = datetime.utcnow()
        else:
            self.add_property(Property(
                name=name,
                value=value,
                source=source,
                confidence=confidence
            ))
        self.updated_at = datetime.utcnow()

    def add_alias(self, alias: str) -> None:
        """Add an alias for this entity"""
        self.aliases.add(alias)
        self.updated_at = datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """Convert entity to dictionary for serialization"""
        return {
            'id': self.id,
            'name': self.name,
            'entity_type': self.entity_type.value,
            'properties': {k: v.to_dict() for k, v in self.properties.items()},
            'aliases': list(self.aliases),
            'confidence': self.confidence,
            'source': self.source,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'metadata': self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Entity':
        """Create entity from dictionary"""
        return cls(
            id=data['id'],
            name=data['name'],
            entity_type=EntityType(data['entity_type']),
            properties={k: Property.from_dict(v) for k, v in data.get('properties', {}).items()},
            aliases=set(data.get('aliases', [])),
            confidence=data.get('confidence', 1.0),
            source=data.get('source', 'unknown'),
            created_at=datetime.fromisoformat(data['created_at']),
            updated_at=datetime.fromisoformat(data['updated_at']),
            metadata=data.get('metadata', {})
        )


@dataclass
class Relationship:
    """A relationship between two entities"""
    id: str
    source_id: str
    target_id: str
    relationship_type: RelationshipType
    properties: Dict[str, Property] = field(default_factory=dict)
    confidence: float = 1.0
    source: str = "unknown"
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """Generate ID if not provided"""
        if not self.id:
            self.id = self._generate_id()

    def _generate_id(self) -> str:
        """Generate unique ID for relationship"""
        content = f"{self.source_id}_{self.target_id}_{self.relationship_type.value}_{datetime.utcnow().isoformat()}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def add_property(self, property_obj: Property) -> None:
        """Add a property to the relationship"""
        self.properties[property_obj.name] = property_obj
        self.updated_at = datetime.utcnow()

    def get_property(self, name: str) -> Optional[Property]:
        """Get a property by name"""
        return self.properties.get(name)

    def to_dict(self) -> Dict[str, Any]:
        """Convert relationship to dictionary for serialization"""
        return {
            'id': self.id,
            'source_id': self.source_id,
            'target_id': self.target_id,
            'relationship_type': self.relationship_type.value,
            'properties': {k: v.to_dict() for k, v in self.properties.items()},
            'confidence': self.confidence,
            'source': self.source,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'metadata': self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Relationship':
        """Create relationship from dictionary"""
        return cls(
            id=data['id'],
            source_id=data['source_id'],
            target_id=data['target_id'],
            relationship_type=RelationshipType(data['relationship_type']),
            properties={k: Property.from_dict(v) for k, v in data.get('properties', {}).items()},
            confidence=data.get('confidence', 1.0),
            source=data.get('source', 'unknown'),
            created_at=datetime.fromisoformat(data['created_at']),
            updated_at=datetime.fromisoformat(data['updated_at']),
            metadata=data.get('metadata', {})
        )


class KnowledgeGraph:
    """Main knowledge graph class that manages entities and relationships"""

    def __init__(self, name: str = "Coinet Knowledge Graph"):
        """Initialize the knowledge graph"""
        self.name = name
        self.entities: Dict[str, Entity] = {}
        self.relationships: Dict[str, Relationship] = {}
        self.entity_index: Dict[str, Set[str]] = {}  # name/alias -> entity IDs
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.metadata: Dict[str, Any] = {}

    def add_entity(self, entity: Entity) -> None:
        """Add an entity to the graph"""
        self.entities[entity.id] = entity

        # Update index
        self._update_entity_index(entity)

        self.updated_at = datetime.utcnow()

    def add_relationship(self, relationship: Relationship) -> None:
        """Add a relationship to the graph"""
        # Validate that source and target entities exist
        if relationship.source_id not in self.entities:
            raise ValueError(f"Source entity {relationship.source_id} not found")
        if relationship.target_id not in self.entities:
            raise ValueError(f"Target entity {relationship.target_id} not found")

        self.relationships[relationship.id] = relationship
        self.updated_at = datetime.utcnow()

    def get_entity(self, entity_id: str) -> Optional[Entity]:
        """Get an entity by ID"""
        return self.entities.get(entity_id)

    def get_entity_by_name(self, name: str) -> Optional[Entity]:
        """Get an entity by name or alias"""
        entity_ids = self.entity_index.get(name.lower(), set())
        if entity_ids:
            return self.entities.get(next(iter(entity_ids)))
        return None

    def get_relationship(self, relationship_id: str) -> Optional[Relationship]:
        """Get a relationship by ID"""
        return self.relationships.get(relationship_id)

    def get_relationships(self, source_id: str = None, target_id: str = None,
                        relationship_type: RelationshipType = None) -> List[Relationship]:
        """Get relationships based on filters"""
        relationships = list(self.relationships.values())

        if source_id:
            relationships = [r for r in relationships if r.source_id == source_id]
        if target_id:
            relationships = [r for r in relationships if r.target_id == target_id]
        if relationship_type:
            relationships = [r for r in relationships if r.relationship_type == relationship_type]

        return relationships

    def get_entities_by_type(self, entity_type: EntityType) -> List[Entity]:
        """Get all entities of a specific type"""
        return [e for e in self.entities.values() if e.entity_type == entity_type]

    def find_path(self, start_id: str, end_id: str, max_depth: int = 5) -> List[List[str]]:
        """Find paths between two entities"""
        if start_id not in self.entities or end_id not in self.entities:
            return []

        visited = set()
        paths = []

        def dfs(current_id: str, path: List[str], depth: int):
            if depth > max_depth:
                return

            path.append(current_id)

            if current_id == end_id:
                paths.append(path.copy())
                path.pop()
                return

            if current_id in visited:
                path.pop()
                return

            visited.add(current_id)

            # Find relationships where current entity is source
            for rel in self.relationships.values():
                if rel.source_id == current_id:
                    dfs(rel.target_id, path, depth + 1)

            path.pop()
            visited.remove(current_id)

        dfs(start_id, [], 0)
        return paths

    def get_subgraph(self, center_id: str, radius: int = 1) -> 'KnowledgeGraph':
        """Get a subgraph centered around an entity"""
        if center_id not in self.entities:
            return KnowledgeGraph()

        subgraph = KnowledgeGraph(f"Subgraph of {self.entities[center_id].name}")

        # BFS to find entities within radius
        visited = {center_id}
        queue = [(center_id, 0)]
        subgraph_entities = {center_id: self.entities[center_id]}

        while queue:
            current_id, depth = queue.pop(0)

            if depth >= radius:
                continue

            # Find relationships where current entity is source or target
            for rel in self.relationships.values():
                if rel.source_id == current_id and rel.target_id not in visited:
                    visited.add(rel.target_id)
                    queue.append((rel.target_id, depth + 1))
                    subgraph_entities[rel.target_id] = self.entities[rel.target_id]
                    subgraph.add_relationship(rel)
                elif rel.target_id == current_id and rel.source_id not in visited:
                    visited.add(rel.source_id)
                    queue.append((rel.source_id, depth + 1))
                    subgraph_entities[rel.source_id] = self.entities[rel.source_id]

        # Add all entities and their relationships
        for entity in subgraph_entities.values():
            subgraph.add_entity(entity)

        return subgraph

    def _update_entity_index(self, entity: Entity) -> None:
        """Update the entity index for fast lookups"""
        # Index by name
        name_key = entity.name.lower()
        if name_key not in self.entity_index:
            self.entity_index[name_key] = set()
        self.entity_index[name_key].add(entity.id)

        # Index by aliases
        for alias in entity.aliases:
            alias_key = alias.lower()
            if alias_key not in self.entity_index:
                self.entity_index[alias_key] = set()
            self.entity_index[alias_key].add(entity.id)

    def remove_entity(self, entity_id: str) -> bool:
        """Remove an entity and all its relationships"""
        if entity_id not in self.entities:
            return False

        # Remove all relationships involving this entity
        relationships_to_remove = []
        for rel_id, rel in self.relationships.items():
            if rel.source_id == entity_id or rel.target_id == entity_id:
                relationships_to_remove.append(rel_id)

        for rel_id in relationships_to_remove:
            del self.relationships[rel_id]

        # Remove from index
        entity = self.entities[entity_id]
        name_key = entity.name.lower()
        self.entity_index[name_key].discard(entity_id)
        if not self.entity_index[name_key]:
            del self.entity_index[name_key]

        for alias in entity.aliases:
            alias_key = alias.lower()
            self.entity_index[alias_key].discard(entity_id)
            if not self.entity_index[alias_key]:
                del self.entity_index[alias_key]

        # Remove entity
        del self.entities[entity_id]
        self.updated_at = datetime.utcnow()

        return True

    def merge_entities(self, entity1_id: str, entity2_id: str) -> Optional[str]:
        """Merge two entities into one, returning the surviving entity ID"""
        if entity1_id not in self.entities or entity2_id not in self.entities:
            return None

        if entity1_id == entity2_id:
            return entity1_id

        # Choose the entity with higher confidence or more properties as survivor
        entity1 = self.entities[entity1_id]
        entity2 = self.entities[entity2_id]

        if entity1.confidence >= entity2.confidence:
            survivor_id = entity1_id
            merged_id = entity2_id
        else:
            survivor_id = entity2_id
            merged_id = entity1_id

        survivor = self.entities[survivor_id]
        merged = self.entities[merged_id]

        # Merge properties
        for prop_name, prop in merged.properties.items():
            if prop_name not in survivor.properties:
                survivor.properties[prop_name] = prop
            else:
                # Keep the property with higher confidence
                if prop.confidence > survivor.properties[prop_name].confidence:
                    survivor.properties[prop_name] = prop

        # Merge aliases
        survivor.aliases.update(merged.aliases)

        # Update all relationships to point to survivor
        for rel in self.relationships.values():
            if rel.source_id == merged_id:
                rel.source_id = survivor_id
                rel.updated_at = datetime.utcnow()
            if rel.target_id == merged_id:
                rel.target_id = survivor_id
                rel.updated_at = datetime.utcnow()

        # Remove merged entity
        self.remove_entity(merged_id)

        # Update index
        self._update_entity_index(survivor)

        return survivor_id

    def to_dict(self) -> Dict[str, Any]:
        """Convert knowledge graph to dictionary for serialization"""
        return {
            'name': self.name,
            'entities': {k: v.to_dict() for k, v in self.entities.items()},
            'relationships': {k: v.to_dict() for k, v in self.relationships.items()},
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'metadata': self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'KnowledgeGraph':
        """Create knowledge graph from dictionary"""
        kg = cls(data['name'])
        kg.created_at = datetime.fromisoformat(data['created_at'])
        kg.updated_at = datetime.fromisoformat(data['updated_at'])
        kg.metadata = data.get('metadata', {})

        # Add entities
        for entity_data in data.get('entities', {}).values():
            entity = Entity.from_dict(entity_data)
            kg.add_entity(entity)

        # Add relationships
        for rel_data in data.get('relationships', {}).values():
            relationship = Relationship.from_dict(rel_data)
            kg.add_relationship(relationship)

        return kg

    def __len__(self) -> int:
        """Return number of entities in the graph"""
        return len(self.entities)

    def __str__(self) -> str:
        """String representation of the knowledge graph"""
        return f"KnowledgeGraph(name='{self.name}', entities={len(self.entities)}, relationships={len(self.relationships)})"
