"""
Knowledge Graph API

REST API endpoints for interacting with the knowledge graph system,
providing querying, updating, and inference capabilities.
"""

import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query, Body
from pydantic import BaseModel, Field
import structlog
import json

from coinet_ai_ml.knowledge_graph.core import KnowledgeGraph, Entity, Relationship, EntityType, RelationshipType, Property
from coinet_ai_ml.knowledge_graph.extraction import DataSourceIntegrator, ExtractedEntity, ExtractedRelation
from coinet_ai_ml.knowledge_graph.reasoning import ReasoningEngine, InferenceResult
from coinet_ai_ml.knowledge_graph.storage import GraphStorage, QueryEngine, StorageBackend, Query

logger = structlog.get_logger(__name__)


# Pydantic models for API requests/responses
class EntityCreateRequest(BaseModel):
    name: str
    entity_type: str
    properties: Optional[Dict[str, Any]] = Field(default_factory=dict)
    aliases: Optional[List[str]] = Field(default_factory=list)
    confidence: float = 1.0
    source: str = "api"
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class RelationshipCreateRequest(BaseModel):
    source_id: str
    target_id: str
    relationship_type: str
    properties: Optional[Dict[str, Any]] = Field(default_factory=dict)
    confidence: float = 1.0
    source: str = "api"
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class EntityUpdateRequest(BaseModel):
    properties: Optional[Dict[str, Any]] = Field(default_factory=dict)
    aliases: Optional[List[str]] = Field(default_factory=list)
    confidence: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class QueryRequest(BaseModel):
    query_type: str
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict)
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict)
    limit: Optional[int] = None
    offset: int = 0


class TextExtractionRequest(BaseModel):
    text: str
    data_source: str = "api_data"
    source_url: str = ""
    context: str = ""
    include_relations: bool = True


class InferenceRequest(BaseModel):
    entity_id: Optional[str] = None
    max_depth: int = 3
    run_full_inference: bool = False


class KnowledgeGraphAPI:
    """REST API for knowledge graph operations"""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize knowledge graph API"""
        self.config = config or self._get_default_config()

        # Initialize core components
        self.storage = GraphStorage(
            backend=self.config.get('storage_backend', 'sqlite'),
            config=self.config.get('storage', {})
        )

        self.query_engine = QueryEngine(self.storage)
        self.reasoning_engine = ReasoningEngine(self.query_engine.knowledge_graph)

        # Initialize extraction pipeline
        self.extractor = DataSourceIntegrator(self.config.get('extraction', {}))

        # Track API usage
        self.api_stats = {
            'total_requests': 0,
            'requests_by_type': {},
            'last_request': None
        }

    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            'storage_backend': 'sqlite',
            'storage': {
                'sqlite_path': 'knowledge_graph.db',
                'auto_commit': True,
                'backup_enabled': True
            },
            'extraction': {
                'enable_cross_source_deduplication': True,
                'confidence_threshold': 0.7
            },
            'reasoning': {
                'enable_property_inheritance': True,
                'enable_transitive_closure': True,
                'max_inference_depth': 5
            },
            'api': {
                'max_query_limit': 1000,
                'enable_caching': True,
                'cache_ttl_seconds': 300
            }
        }

    def _map_string_to_entity_type(self, entity_type_str: str) -> EntityType:
        try:
            return EntityType[entity_type_str.upper()]
        except KeyError:
            logger.warning(f"Unknown entity type '{entity_type_str}'. Defaulting to ORGANIZATION.")
            return EntityType.ORGANIZATION

    def _map_string_to_relationship_type(self, relationship_type_str: str) -> RelationshipType:
        try:
            return RelationshipType[relationship_type_str.upper()]
        except KeyError:
            logger.warning(f"Unknown relationship type '{relationship_type_str}'. Defaulting to PARTNERS_WITH.")
            return RelationshipType.PARTNERS_WITH

    def create_fastapi_app(self) -> FastAPI:
        """Create FastAPI application with knowledge graph endpoints"""
        app = FastAPI(
            title="Coinet Knowledge Graph API",
            description="Advanced knowledge graph system for crypto ecosystem analysis",
            version="1.0.0"
        )

        # Entity management endpoints
        @app.post("/entities", response_model=dict, tags=["Entities"])
        async def create_entity(request: EntityCreateRequest):
            """Create a new entity in the knowledge graph"""
            return await self._create_entity(request)

        @app.get("/entities/{entity_id}", response_model=dict, tags=["Entities"])
        async def get_entity(entity_id: str):
            """Get entity by ID"""
            return await self._get_entity(entity_id)

        @app.get("/entities", response_model=dict, tags=["Entities"])
        async def list_entities(
            entity_type: Optional[str] = None,
            limit: int = Query(100, ge=1, le=self.config['api']['max_query_limit']),
            offset: int = Query(0, ge=0)
        ):
            """List entities with optional filtering"""
            return await self._list_entities(entity_type, limit, offset)

        @app.put("/entities/{entity_id}", response_model=dict, tags=["Entities"])
        async def update_entity(entity_id: str, request: EntityUpdateRequest):
            """Update entity properties"""
            return await self._update_entity(entity_id, request)

        @app.delete("/entities/{entity_id}", response_model=dict, tags=["Entities"])
        async def delete_entity(entity_id: str):
            """Delete entity and its relationships"""
            return await self._delete_entity(entity_id)

        # Relationship management endpoints
        @app.post("/relationships", response_model=dict, tags=["Relationships"])
        async def create_relationship(request: RelationshipCreateRequest):
            """Create a new relationship between entities"""
            return await self._create_relationship(request)

        @app.get("/relationships/{relationship_id}", response_model=dict, tags=["Relationships"])
        async def get_relationship(relationship_id: str):
            """Get relationship by ID"""
            return await self._get_relationship(relationship_id)

        @app.get("/relationships", response_model=dict, tags=["Relationships"])
        async def list_relationships(
            source_id: Optional[str] = None,
            target_id: Optional[str] = None,
            relationship_type: Optional[str] = None,
            limit: int = Query(100, ge=1, le=self.config['api']['max_query_limit']),
            offset: int = Query(0, ge=0)
        ):
            """List relationships with optional filtering"""
            return await self._list_relationships(source_id, target_id, relationship_type, limit, offset)

        # Query endpoints
        @app.post("/query", response_model=dict, tags=["Query"])
        async def execute_query(request: QueryRequest):
            """Execute a complex query against the knowledge graph"""
            return await self._execute_query(request)

        @app.get("/search", response_model=dict, tags=["Query"])
        async def search_entities(
            q: str = Query(..., description="Search query"),
            entity_types: Optional[List[str]] = Query(None),
            limit: int = Query(10, ge=1, le=100)
        ):
            """Full-text search across entities"""
            return await self._search_entities(q, entity_types, limit)

        @app.get("/entities/{entity_id}/network", response_model=dict, tags=["Query"])
        async def get_entity_network(
            entity_id: str,
            max_depth: int = Query(2, ge=1, le=5)
        ):
            """Get network information for an entity"""
            return await self._get_entity_network(entity_id, max_depth)

        @app.get("/entities/{entity_id}/similar", response_model=dict, tags=["Query"])
        async def get_similar_entities(
            entity_id: str,
            limit: int = Query(5, ge=1, le=20)
        ):
            """Find entities similar to the given entity"""
            return await self._get_similar_entities(entity_id, limit)

        # Extraction endpoints
        @app.post("/extract", response_model=dict, tags=["Extraction"])
        async def extract_from_text(request: TextExtractionRequest):
            """Extract entities and relationships from text"""
            return await self._extract_from_text(request)

        # Inference endpoints
        @app.post("/infer", response_model=dict, tags=["Inference"])
        async def run_inference(request: InferenceRequest):
            """Run inference operations on the knowledge graph"""
            return await self._run_inference(request)

        @app.get("/entities/{entity_id}/infer", response_model=dict, tags=["Inference"])
        async def infer_entity_properties(entity_id: str):
            """Infer properties for a specific entity"""
            return await self._infer_entity_properties(entity_id)

        # Statistics and health endpoints
        @app.get("/statistics", response_model=dict, tags=["Statistics"])
        async def get_statistics():
            """Get knowledge graph statistics"""
            return await self._get_statistics()

        @app.get("/health", response_model=dict, tags=["Health"])
        async def health_check():
            """Health check endpoint"""
            return await self._health_check()

        @app.post("/backup", response_model=dict, tags=["Maintenance"])
        async def create_backup():
            """Create a backup of the knowledge graph"""
            return await self._create_backup()

        @app.get("/export", response_model=dict, tags=["Export"])
        async def export_graph(format: str = Query("json", regex="^(json|cypher)$")):
            """Export knowledge graph in various formats"""
            return await self._export_graph(format)

        return app

    async def _create_entity(self, request: EntityCreateRequest) -> Dict[str, Any]:
        """Create a new entity"""
        self.api_stats['total_requests'] += 1
        self.api_stats['requests_by_type']['create_entity'] = \
            self.api_stats['requests_by_type'].get('create_entity', 0) + 1
        self.api_stats['last_request'] = datetime.utcnow()

        try:
            entity_type = self._map_string_to_entity_type(request.entity_type)

            entity = Entity(
                id="",  # Let it auto-generate
                name=request.name,
                entity_type=entity_type,
                confidence=request.confidence,
                source=request.source,
                metadata=request.metadata
            )

            # Add properties
            for prop_name, prop_value in request.properties.items():
                entity.update_property(prop_name, prop_value, request.source, request.confidence)

            # Add aliases
            for alias in request.aliases:
                entity.add_alias(alias)

            # Add to knowledge graph
            self.query_engine.knowledge_graph.add_entity(entity)

            # Save to storage
            self.storage.save_knowledge_graph(self.query_engine.knowledge_graph)

            return {
                'success': True,
                'entity_id': entity.id,
                'entity': entity.to_dict(),
                'message': f'Entity "{request.name}" created successfully'
            }

        except Exception as e:
            logger.error(f"Failed to create entity: {e}")
            raise HTTPException(status_code=400, detail=str(e))

    async def _get_entity(self, entity_id: str) -> Dict[str, Any]:
        """Get entity by ID"""
        entity = self.query_engine.knowledge_graph.get_entity(entity_id)

        if not entity:
            raise HTTPException(status_code=404, detail=f'Entity {entity_id} not found')

        return {
            'success': True,
            'entity': entity.to_dict()
        }

    async def _list_entities(self, entity_type: Optional[str], limit: int, offset: int) -> Dict[str, Any]:
        """List entities with filtering"""
        entities = list(self.query_engine.knowledge_graph.entities.values())

        # Apply filters
        if entity_type:
            et = self._map_string_to_entity_type(entity_type)
            # Only filter if a specific (non-default) entity_type was requested, or if the default is explicitly searched
            if et != EntityType.ORGANIZATION or entity_type.upper() == EntityType.ORGANIZATION.name:
                entities = [e for e in entities if e.entity_type == et]

        # Apply pagination
        total_count = len(entities)
        entities = entities[offset:offset + limit]

        return {
            'success': True,
            'entities': [e.to_dict() for e in entities],
            'total_count': total_count,
            'limit': limit,
            'offset': offset
        }

    async def _update_entity(self, entity_id: str, request: EntityUpdateRequest) -> Dict[str, Any]:
        """Update entity properties"""
        entity = self.query_engine.knowledge_graph.get_entity(entity_id)

        if not entity:
            raise HTTPException(status_code=404, detail=f'Entity {entity_id} not found')

        # Update properties
        for prop_name, prop_value in request.properties.items():
            entity.update_property(prop_name, prop_value, "api_update",
                                 request.confidence or entity.confidence)

        # Update aliases
        for alias in request.aliases:
            entity.add_alias(alias)

        # Update metadata
        if request.metadata:
            entity.metadata.update(request.metadata)

        # Save to storage
        self.storage.save_knowledge_graph(self.query_engine.knowledge_graph)

        return {
            'success': True,
            'entity': entity.to_dict(),
            'message': f'Entity "{entity.name}" updated successfully'
        }

    async def _delete_entity(self, entity_id: str) -> Dict[str, Any]:
        """Delete entity and its relationships"""
        success = self.query_engine.knowledge_graph.remove_entity(entity_id)

        if not success:
            raise HTTPException(status_code=404, detail=f'Entity {entity_id} not found')

        # Save to storage
        self.storage.save_knowledge_graph(self.query_engine.knowledge_graph)

        return {
            'success': True,
            'message': f'Entity {entity_id} deleted successfully'
        }

    async def _create_relationship(self, request: RelationshipCreateRequest) -> Dict[str, Any]:
        """Create a new relationship"""
        try:
            # Map string relationship type to enum
            relationship_type = self._map_string_to_relationship_type(request.relationship_type)

            relationship = Relationship(
                id="",  # Let it auto-generate
                source_id=request.source_id,
                target_id=request.target_id,
                relationship_type=relationship_type,
                confidence=request.confidence,
                source=request.source,
                metadata=request.metadata
            )

            # Add properties
            for prop_name, prop_value in request.properties.items():
                relationship.add_property(
                    Property(
                        name=prop_name,
                        value=prop_value,
                        confidence=request.confidence,
                        source=request.source
                    )
                )

            # Add to knowledge graph
            self.query_engine.knowledge_graph.add_relationship(relationship)

            # Save to storage
            self.storage.save_knowledge_graph(self.query_engine.knowledge_graph)

            return {
                'success': True,
                'relationship_id': relationship.id,
                'relationship': relationship.to_dict(),
                'message': f'Relationship created successfully'
            }

        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error(f"Failed to create relationship: {e}")
            raise HTTPException(status_code=400, detail=str(e))

    async def _get_relationship(self, relationship_id: str) -> Dict[str, Any]:
        """Get relationship by ID"""
        relationship = self.query_engine.knowledge_graph.get_relationship(relationship_id)

        if not relationship:
            raise HTTPException(status_code=404, detail=f'Relationship {relationship_id} not found')

        return {
            'success': True,
            'relationship': relationship.to_dict()
        }

    async def _list_relationships(self, source_id: Optional[str], target_id: Optional[str],
                                relationship_type: Optional[str], limit: int, offset: int) -> Dict[str, Any]:
        """List relationships with filtering"""
        # Build filters
        filters = {}
        if source_id:
            filters['source_id'] = source_id
        if target_id:
            filters['target_id'] = target_id
        if relationship_type:
            rel_type = self._map_string_to_relationship_type(relationship_type)
            if rel_type != RelationshipType.PARTNERS_WITH or relationship_type.upper() == RelationshipType.PARTNERS_WITH.name:
                filters['relationship_type'] = rel_type

        # Get relationships using the query engine
        query = Query(
            query_type='find_relationships',
            filters=filters,
            limit=limit,
            offset=offset
        )

        result = self.query_engine.execute_query(query)

        return {
            'success': True,
            'relationships': [r.to_dict() for r in result.relationships],
            'total_count': result.total_count,
            'limit': limit,
            'offset': offset
        }

    async def _execute_query(self, request: QueryRequest) -> Dict[str, Any]:
        """Execute a complex query"""
        query = Query(
            query_type=request.query_type,
            parameters=request.parameters,
            filters=request.filters,
            limit=request.limit,
            offset=request.offset
        )

        result = self.query_engine.execute_query(query)

        return {
            'success': True,
            'entities': [e.to_dict() for e in result.entities],
            'relationships': [r.to_dict() for r in result.relationships],
            'total_count': result.total_count,
            'execution_time_ms': result.execution_time_ms,
            'query': request.dict()
        }

    async def _search_entities(self, search_text: str, entity_types: Optional[List[str]],
                             limit: int) -> Dict[str, Any]:
        """Search entities by text"""
        # Convert string entity types to EntityType enum
        types_filter = None
        if entity_types:
            types_filter = []
            for et_str in entity_types:
                try:
                    types_filter.append(EntityType(et_str))
                except ValueError:
                    pass  # Invalid entity type, skip

        entities = self.query_engine.search_by_text(search_text, types_filter, limit)

        return {
            'success': True,
            'entities': [e.to_dict() for e in entities],
            'query': search_text,
            'limit': limit
        }

    async def _get_entity_network(self, entity_id: str, max_depth: int) -> Dict[str, Any]:
        """Get network information for an entity"""
        network_info = self.query_engine.get_entity_network(entity_id, max_depth)

        if not network_info:
            raise HTTPException(status_code=404, detail=f'Entity {entity_id} not found')

        return {
            'success': True,
            'center_entity': network_info['center_entity'].to_dict(),
            'depth_entities': {
                depth: {eid: entity.to_dict() for eid, entity in entities.items()}
                for depth, entities in network_info['depth_entities'].items()
            },
            'total_connections': network_info['total_connections'],
            'max_depth': network_info['max_depth']
        }

    async def _get_similar_entities(self, entity_id: str, limit: int) -> Dict[str, Any]:
        """Get similar entities"""
        similar = self.query_engine.get_similar_entities(entity_id, limit)

        if not similar:
            raise HTTPException(status_code=404, detail=f'Entity {entity_id} not found')

        return {
            'success': True,
            'similar_entities': [
                {
                    'entity': entity.to_dict(),
                    'similarity_score': score
                }
                for entity, score in similar
            ],
            'limit': limit
        }

    async def _extract_from_text(self, request: TextExtractionRequest) -> Dict[str, Any]:
        """Extract entities and relationships from text"""
        from coinet_ai_ml.knowledge_graph.extraction import DataSource

        # Convert string to enum
        try:
            data_source = DataSource(request.data_source)
        except ValueError:
            data_source = DataSource.API_DATA

        # Extract entities
        entities = await self.extractor.entity_extractor.extract_entities(
            request.text, data_source, request.source_url, request.context
        )

        relations = []
        if request.include_relations:
            # Extract relationships (need entities for context)
            relations = await self.extractor.relation_extractor.extract_relations(
                request.text, entities, data_source
            )

        return {
            'success': True,
            'entities': [e.to_dict() for e in entities],
            'relationships': [r.to_dict() for r in relations],
            'extraction_stats': {
                'entities_found': len(entities),
                'relationships_found': len(relations),
                'data_source': request.data_source
            }
        }

    async def _run_inference(self, request: InferenceRequest) -> Dict[str, Any]:
        """Run inference operations"""
        if request.run_full_inference:
            # Run full inference on the entire graph
            results = await self.reasoning_engine.run_full_inference()

            return {
                'success': True,
                'inference_results': results,
                'summary': results['summary']
            }
        elif request.entity_id:
            # Infer properties for specific entity
            results = await self.reasoning_engine.infer_entity_properties(request.entity_id)

            return {
                'success': True,
                'inference_results': [r.__dict__ for r in results],
                'entity_id': request.entity_id
            }
        else:
            raise HTTPException(status_code=400, detail='Either entity_id or run_full_inference must be specified')

    async def _infer_entity_properties(self, entity_id: str) -> Dict[str, Any]:
        """Infer properties for a specific entity"""
        results = await self.reasoning_engine.infer_entity_properties(entity_id)

        return {
            'success': True,
            'inference_results': [r.__dict__ for r in results],
            'entity_id': entity_id
        }

    async def _get_statistics(self) -> Dict[str, Any]:
        """Get knowledge graph statistics"""
        stats = self.query_engine.get_entity_statistics()

        # Add API usage statistics
        stats['api_usage'] = self.api_stats.copy()

        return {
            'success': True,
            'statistics': stats
        }

    async def _health_check(self) -> Dict[str, Any]:
        """Health check endpoint"""
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'components': {
                'storage': 'healthy',
                'query_engine': 'healthy',
                'reasoning_engine': 'healthy'
            }
        }

        # Check storage connectivity
        try:
            self.query_engine.sync_with_storage()
        except Exception as e:
            health_status['components']['storage'] = f'unhealthy: {str(e)}'
            health_status['status'] = 'degraded'

        return health_status

    async def _create_backup(self) -> Dict[str, Any]:
        """Create a backup"""
        try:
            backup_path = self.storage.backup()
            return {
                'success': True,
                'backup_path': backup_path,
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Backup failed: {e}")
            raise HTTPException(status_code=500, detail=f'Backup failed: {str(e)}')

    async def _export_graph(self, format: str) -> Dict[str, Any]:
        """Export knowledge graph"""
        try:
            exported_data = self.query_engine.export_graph(format)

            return {
                'success': True,
                'format': format,
                'data': exported_data,
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Export failed: {e}")
            raise HTTPException(status_code=500, detail=f'Export failed: {str(e)}')


# Standalone FastAPI app creation function
def create_knowledge_graph_app(config: Optional[Dict[str, Any]] = None) -> FastAPI:
    """Create a standalone FastAPI app for the knowledge graph"""
    kg_api = KnowledgeGraphAPI(config)
    return kg_api.create_fastapi_app()
