"""
Knowledge Graph Integration with Multi-Modal Fusion Pipeline

This module integrates the knowledge graph system with the existing multi-modal
fusion pipeline, allowing the fusion system to leverage knowledge graph context
for enhanced predictions and reasoning.
"""

import asyncio
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import logging

from coinet_ai_ml.knowledge_graph.core import KnowledgeGraph, Entity, EntityType, RelationshipType, Relationship
from coinet_ai_ml.knowledge_graph.api import KnowledgeGraphAPI, QueryEngine, GraphStorage, StorageBackend
from coinet_ai_ml.knowledge_graph.extraction import DataSourceIntegrator, ExtractedEntity, ExtractedRelation
from coinet_ai_ml.knowledge_graph.reasoning import ReasoningEngine

logger = logging.getLogger(__name__)


class KnowledgeGraphIntegrator:
    """Integrates knowledge graph with multi-modal fusion pipeline"""

    def __init__(self, fusion_config: Optional[Dict[str, Any]] = None):
        """Initialize knowledge graph integrator"""
        self.fusion_config = fusion_config or self._get_default_config()

        # Initialize knowledge graph components
        self.storage = GraphStorage(
            backend=self.fusion_config.get('storage_backend', 'sqlite'),
            config=self.fusion_config.get('storage', {})
        )

        self.query_engine = QueryEngine(self.storage)
        self.reasoning_engine = ReasoningEngine(self.query_engine.knowledge_graph)

        # Initialize extraction for integration with fusion data
        self.extractor = DataSourceIntegrator(self.fusion_config.get('extraction', {}))

        # Integration state
        self.last_sync_time = None
        self.integration_stats = {
            'entities_enriched': 0,
            'relationships_added': 0,
            'inference_runs': 0,
            'context_queries': 0
        }

    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            'storage_backend': 'sqlite',
            'storage': {
                'sqlite_path': 'knowledge_graph.db',
                'auto_commit': True
            },
            'extraction': {
                'enable_cross_source_deduplication': True,
                'confidence_threshold': 0.7
            },
            'reasoning': {
                'enable_property_inheritance': True,
                'enable_transitive_closure': True,
                'max_inference_depth': 3
            },
            'integration': {
                'enable_context_enrichment': True,
                'enable_auto_extraction': True,
                'enable_inference_enhancement': True,
                'context_similarity_threshold': 0.8,
                'max_context_entities': 10
            }
        }

    async def enrich_fusion_input(self, fusion_input: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich fusion input with knowledge graph context"""
        if not self.fusion_config['integration']['enable_context_enrichment']:
            return fusion_input

        enriched_input = fusion_input.copy()
        self.integration_stats['context_queries'] += 1

        # Extract entities from fusion input data
        extracted_entities = await self._extract_entities_from_fusion_input(fusion_input)

        # Find relevant entities in knowledge graph
        context_entities = []
        for extracted_entity in extracted_entities:
            # Search for similar entities in knowledge graph
            similar_entities = self.query_engine.search_by_text(
                extracted_entity.text,
                limit=5
            )

            # Filter by similarity and add to context
            for entity in similar_entities:
                similarity = self._calculate_text_similarity(
                    extracted_entity.text.lower(),
                    entity.name.lower()
                )
                if similarity >= self.fusion_config['integration']['context_similarity_threshold']:
                    context_entities.append({
                        'entity': entity,
                        'similarity': similarity,
                        'source': 'fusion_input',
                        'extracted_entity': extracted_entity.to_dict()
                    })

        # Limit context entities
        context_entities.sort(key=lambda x: x['similarity'], reverse=True)
        context_entities = context_entities[:self.fusion_config['integration']['max_context_entities']]

        # Add context to enriched input
        enriched_input['knowledge_graph_context'] = {
            'entities': [ctx['entity'].to_dict() for ctx in context_entities],
            'extraction_stats': {
                'total_extracted': len(extracted_entities),
                'context_entities_found': len(context_entities),
                'avg_similarity': sum(ctx['similarity'] for ctx in context_entities) / len(context_entities) if context_entities else 0.0
            }
        }

        # Run inference on context entities to enrich predictions
        if self.fusion_config['integration']['enable_inference_enhancement'] and context_entities:
            enriched_input = await self._enhance_with_inference(enriched_input, context_entities)

        return enriched_input

    async def _extract_entities_from_fusion_input(self, fusion_input: Dict[str, Any]) -> List[ExtractedEntity]:
        """Extract entities from fusion pipeline input data"""
        extracted_entities = []

        # Extract from market data
        if 'market_data' in fusion_input:
            market_text = self._market_data_to_text(fusion_input['market_data'])
            entities = await self.extractor.entity_extractor.extract_entities(
                market_text, data_source=self.extractor.entity_extractor.config.get('data_source', 'api_data')
            )
            extracted_entities.extend(entities)

        # Extract from social sentiment
        if 'social_sentiment' in fusion_input:
            social_text = self._social_data_to_text(fusion_input['social_sentiment'])
            entities = await self.extractor.entity_extractor.extract_entities(
                social_text, data_source=self.extractor.entity_extractor.config.get('data_source', 'api_data')
            )
            extracted_entities.extend(entities)

        # Extract from news articles
        if 'news_articles' in fusion_input:
            news_text = self._news_data_to_text(fusion_input['news_articles'])
            entities = await self.extractor.entity_extractor.extract_entities(
                news_text, data_source=self.extractor.entity_extractor.config.get('data_source', 'api_data')
            )
            extracted_entities.extend(entities)

        # Extract from on-chain data
        if 'onchain_data' in fusion_input:
            onchain_text = self._onchain_data_to_text(fusion_input['onchain_data'])
            entities = await self.extractor.entity_extractor.extract_entities(
                onchain_text, data_source=self.extractor.entity_extractor.config.get('data_source', 'api_data')
            )
            extracted_entities.extend(entities)

        return extracted_entities

    def _market_data_to_text(self, market_data: Dict[str, Any]) -> str:
        """Convert market data to text for entity extraction"""
        text_parts = []

        if 'prices' in market_data:
            prices = market_data['prices']
            if prices:
                text_parts.append(f"Current price: ${prices[-1]:.2f}, {len(prices)} data points")

        if 'volumes' in market_data:
            volumes = market_data['volumes']
            if volumes:
                text_parts.append(f"Trading volume: {volumes[-1]:.0f}")

        if 'token_symbol' in market_data:
            text_parts.append(f"Token: {market_data['token_symbol']}")

        return ". ".join(text_parts) if text_parts else ""

    def _social_data_to_text(self, social_data: Dict[str, Any]) -> str:
        """Convert social sentiment data to text"""
        text_parts = []

        if 'sentiment_score' in social_data:
            text_parts.append(f"Sentiment score: {social_data['sentiment_score']}")

        if 'mentions' in social_data:
            text_parts.append(f"Mentions: {social_data['mentions']}")

        if 'trending_topics' in social_data:
            topics = social_data['trending_topics']
            if topics:
                text_parts.append(f"Trending topics: {', '.join(topics[:3])}")

        return ". ".join(text_parts) if text_parts else ""

    def _news_data_to_text(self, news_data: List[Dict[str, Any]]) -> str:
        """Convert news articles to text"""
        if not news_data:
            return ""

        # Combine titles and summaries from multiple articles
        text_parts = []
        for article in news_data[:3]:  # Limit to first 3 articles
            if 'title' in article:
                text_parts.append(article['title'])
            if 'summary' in article:
                text_parts.append(article['summary'])

        return ". ".join(text_parts)

    def _onchain_data_to_text(self, onchain_data: Dict[str, Any]) -> str:
        """Convert on-chain data to text"""
        text_parts = []

        if 'transaction_count' in onchain_data:
            text_parts.append(f"Transactions: {onchain_data['transaction_count']}")

        if 'active_addresses' in onchain_data:
            text_parts.append(f"Active addresses: {onchain_data['active_addresses']}")

        if 'whale_transactions' in onchain_data:
            text_parts.append(f"Whale transactions: {onchain_data['whale_transactions']}")

        return ". ".join(text_parts) if text_parts else ""

    def _calculate_text_similarity(self, text1: str, text2: str) -> float:
        """Calculate text similarity for entity matching"""
        # Simple Jaccard similarity of words
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())

        if not words1 and not words2:
            return 1.0

        intersection = words1.intersection(words2)
        union = words1.union(words2)

        return len(intersection) / len(union) if union else 0.0

    async def _enhance_with_inference(self, enriched_input: Dict[str, Any],
                                    context_entities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Enhance fusion input with inference results"""
        enhanced_input = enriched_input.copy()

        # Run inference on context entities
        inference_results = []
        for ctx_entity_data in context_entities:
            entity = ctx_entity_data['entity']
            entity_inference = await self.reasoning_engine.infer_entity_properties(entity.id)

            for result in entity_inference:
                for fact in result.derived_facts:
                    fact['source_entity'] = entity.name
                    fact['inference_confidence'] = result.confidence
                    inference_results.append(fact)

        # Add inference results to enhanced input
        enhanced_input['knowledge_graph_inference'] = {
            'inferred_facts': inference_results,
            'inference_count': len(inference_results),
            'entities_analyzed': len(context_entities)
        }

        self.integration_stats['inference_runs'] += 1

        return enhanced_input

    async def update_knowledge_graph(self, fusion_results: Dict[str, Any]) -> None:
        """Update knowledge graph with fusion pipeline results"""
        if not self.fusion_config['integration']['enable_auto_extraction']:
            return

        # Extract entities from fusion results
        extracted_entities = await self._extract_entities_from_fusion_results(fusion_results)

        # Add new entities to knowledge graph
        for extracted_entity in extracted_entities:
            # Check if entity already exists (by name similarity)
            existing_entity = self.query_engine.search_by_text(extracted_entity.text, limit=1)

            if not existing_entity:
                # Create new entity
                entity = Entity(
                    id="",
                    name=extracted_entity.text,
                    entity_type=self._map_extracted_to_entity_type(extracted_entity.entity_type),
                    confidence=extracted_entity.confidence,
                    source=f"fusion_pipeline_{extracted_entity.data_source.value}",
                    metadata={'extraction_source': extracted_entity.metadata}
                )

                self.query_engine.knowledge_graph.add_entity(entity)
                self.integration_stats['entities_enriched'] += 1

        # Extract and add relationships
        if 'knowledge_graph_context' in fusion_results:
            context = fusion_results['knowledge_graph_context']
            if 'entities' in context:
                relationships = await self._extract_relationships_from_context(context['entities'])
                for relationship in relationships:
                    try:
                        self.query_engine.knowledge_graph.add_relationship(relationship)
                        self.integration_stats['relationships_added'] += 1
                    except ValueError:
                        # Relationship already exists or invalid
                        pass

        # Save updates to storage
        self.storage.save_knowledge_graph(self.query_engine.knowledge_graph)

    async def _extract_entities_from_fusion_results(self, fusion_results: Dict[str, Any]) -> List[ExtractedEntity]:
        """Extract entities from fusion pipeline results"""
        extracted_entities = []

        # Extract from predictions and insights
        if 'cross_modal_insights' in fusion_results:
            insights_text = str(fusion_results['cross_modal_insights'])
            entities = await self.extractor.entity_extractor.extract_entities(
                insights_text, data_source=self.extractor.entity_extractor.config.get('data_source', 'api_data')
            )
            extracted_entities.extend(entities)

        # Extract from market regime information
        if 'market_regime' in fusion_results:
            regime_text = f"Market regime: {fusion_results['market_regime']}"
            entities = await self.extractor.entity_extractor.extract_entities(
                regime_text, data_source=self.extractor.entity_extractor.config.get('data_source', 'api_data')
            )
            extracted_entities.extend(entities)

        return extracted_entities

    async def _extract_relationships_from_context(self, context_entities: List[Dict[str, Any]]) -> List[Relationship]:
        """Extract relationships between context entities"""
        relationships = []

        if len(context_entities) < 2:
            return relationships

        # Simple relationship extraction based on entity types and context
        for i, entity1_data in enumerate(context_entities):
            for entity2_data in context_entities[i+1:]:
                entity1 = Entity.from_dict(entity1_data)
                entity2 = Entity.from_dict(entity2_data)

                # Infer relationship based on entity types
                inferred_relationship = self._infer_relationship_type(entity1, entity2)

                if inferred_relationship:
                    relationship = Relationship(
                        id="",
                        source_id=entity1.id,
                        target_id=entity2.id,
                        relationship_type=inferred_relationship,
                        confidence=0.6,  # Moderate confidence for inferred relationships
                        source="fusion_context_inference",
                        metadata={'inference_method': 'entity_type_based'}
                    )

                    relationships.append(relationship)

        return relationships

    def _map_extracted_to_entity_type(self, extracted_type: str) -> EntityType:
        """Map extracted entity type to knowledge graph entity type"""
        type_mapping = {
            'CRYPTO_PROJECT': EntityType.CRYPTO_PROJECT,
            'PERSON': EntityType.FOUNDER,
            'ORGANIZATION': EntityType.ORGANIZATION,
            'EXCHANGE': EntityType.EXCHANGE,
            'TOKEN': EntityType.TOKEN,
            'BLOCKCHAIN': EntityType.BLOCKCHAIN,
            'PROTOCOL': EntityType.PROTOCOL
        }

        return type_mapping.get(extracted_type, EntityType.ORGANIZATION)

    def _infer_relationship_type(self, entity1: Entity, entity2: Entity) -> Optional[RelationshipType]:
        """Infer relationship type between two entities based on their types"""
        # Define relationship inference rules
        inference_rules = {
            (EntityType.CRYPTO_PROJECT, EntityType.FOUNDER): RelationshipType.FOUNDED,
            (EntityType.FOUNDER, EntityType.CRYPTO_PROJECT): RelationshipType.FOUNDED,  # Reverse
            (EntityType.CRYPTO_PROJECT, EntityType.INVESTOR): RelationshipType.INVESTED_IN,
            (EntityType.INVESTOR, EntityType.CRYPTO_PROJECT): RelationshipType.INVESTED_IN,  # Reverse
            (EntityType.CRYPTO_PROJECT, EntityType.EXCHANGE): RelationshipType.TRADED_ON,
            (EntityType.EXCHANGE, EntityType.CRYPTO_PROJECT): RelationshipType.TRADED_ON,  # Reverse
            (EntityType.CRYPTO_PROJECT, EntityType.CRYPTO_PROJECT): RelationshipType.COMPETES_WITH,
            (EntityType.ORGANIZATION, EntityType.CRYPTO_PROJECT): RelationshipType.PARTNERS_WITH,
            (EntityType.CRYPTO_PROJECT, EntityType.ORGANIZATION): RelationshipType.PARTNERS_WITH  # Reverse
        }

        entity_types = (entity1.entity_type, entity2.entity_type)

        # Check if we have a rule for these entity types
        if entity_types in inference_rules:
            return inference_rules[entity_types]

        # Check reverse
        reverse_types = (entity2.entity_type, entity1.entity_type)
        if reverse_types in inference_rules:
            return inference_rules[reverse_types]

        return None

    async def get_fusion_context(self, token_symbol: str, max_context_size: int = 5) -> Dict[str, Any]:
        """Get knowledge graph context for fusion pipeline predictions"""
        context = {
            'related_entities': [],
            'market_insights': [],
            'risk_factors': [],
            'opportunities': []
        }

        # Search for entities related to the token
        search_results = self.query_engine.search_by_text(token_symbol, limit=max_context_size * 2)

        for entity in search_results:
            # Get entity network information
            network_info = self.query_engine.get_entity_network(entity.id, max_depth=2)

            # Add to context based on entity type and properties
            if entity.entity_type == EntityType.CRYPTO_PROJECT:
                context['related_entities'].append({
                    'entity': entity.to_dict(),
                    'network_size': network_info.get('total_connections', 0),
                    'context_type': 'project'
                })

            elif entity.entity_type == EntityType.FOUNDER:
                context['market_insights'].append({
                    'insight': f"Founder {entity.name} has experience in crypto development",
                    'confidence': entity.confidence,
                    'source': 'knowledge_graph'
                })

            elif entity.entity_type == EntityType.INVESTOR:
                context['market_insights'].append({
                    'insight': f"Investor {entity.name} has backed crypto projects",
                    'confidence': entity.confidence,
                    'source': 'knowledge_graph'
                })

        # Run inference to get additional insights
        if self.fusion_config['integration']['enable_inference_enhancement']:
            for entity_data in context['related_entities'][:3]:  # Limit inference to top 3 entities
                entity = Entity.from_dict(entity_data['entity'])
                inference_results = await self.reasoning_engine.infer_entity_properties(entity.id)

                for result in inference_results:
                    for fact in result.derived_facts:
                        if fact['property_name'] == 'has_good_liquidity':
                            context['market_insights'].append({
                                'insight': f"{entity.name} has good liquidity indicators",
                                'confidence': fact['confidence'],
                                'source': 'inference'
                            })

        return context

    def get_integration_statistics(self) -> Dict[str, Any]:
        """Get integration statistics"""
        return {
            'knowledge_graph_stats': self.query_engine.get_entity_statistics(),
            'integration_stats': self.integration_stats.copy(),
            'last_sync': self.last_sync_time.isoformat() if self.last_sync_time else None,
            'config': self.fusion_config
        }

    async def sync_with_external_sources(self) -> Dict[str, Any]:
        """Sync knowledge graph with external data sources"""
        sync_results = {
            'entities_added': 0,
            'entities_updated': 0,
            'relationships_added': 0,
            'sources_processed': []
        }

        # This would integrate with external APIs, news feeds, etc.
        # For now, we'll simulate the sync process

        # Example: Sync with crypto project data
        # In a real implementation, this would call external APIs

        self.last_sync_time = datetime.utcnow()
        sync_results['sources_processed'].append('simulated_external_sync')

        return sync_results


class FusionKnowledgeGraphBridge:
    """Bridge between fusion pipeline and knowledge graph"""

    def __init__(self, integrator: KnowledgeGraphIntegrator):
        """Initialize bridge"""
        self.integrator = integrator
        self.bridge_config = integrator.fusion_config.get('bridge', {})

    async def pre_fusion_enrichment(self, fusion_input: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich fusion input before processing"""
        return await self.integrator.enrich_fusion_input(fusion_input)

    async def post_fusion_update(self, fusion_input: Dict[str, Any], fusion_results: Dict[str, Any]) -> None:
        """Update knowledge graph after fusion processing"""
        await self.integrator.update_knowledge_graph(fusion_results)

    async def get_contextual_insights(self, token_symbol: str) -> Dict[str, Any]:
        """Get contextual insights for token analysis"""
        return await self.integrator.get_fusion_context(token_symbol)


# Integration hooks for the existing fusion pipeline
async def enrich_fusion_with_knowledge_graph(fusion_engine, fusion_input: Dict[str, Any]) -> Dict[str, Any]:
    """Integration hook for enriching fusion input with knowledge graph context"""
    integrator = KnowledgeGraphIntegrator()
    return await integrator.enrich_fusion_input(fusion_input)


async def update_knowledge_graph_from_fusion(fusion_engine, fusion_input: Dict[str, Any],
                                           fusion_results: Dict[str, Any]) -> None:
    """Integration hook for updating knowledge graph from fusion results"""
    integrator = KnowledgeGraphIntegrator()
    await integrator.update_knowledge_graph(fusion_results)


async def get_knowledge_graph_context(fusion_engine, token_symbol: str) -> Dict[str, Any]:
    """Integration hook for getting knowledge graph context"""
    integrator = KnowledgeGraphIntegrator()
    return await integrator.get_fusion_context(token_symbol)
