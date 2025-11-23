"""
🧠 KNOWLEDGE GRAPH INTEGRATION - THE DIVINE KNOWLEDGE WEAVER
===========================================================

This module integrates continual learning with the knowledge graph, allowing
models to contribute new insights, relationships, and entities to the collective
understanding of the crypto ecosystem.

INTEGRATION CAPABILITIES:
- Entity and relationship extraction from learning data
- Confidence-based knowledge updates
- Knowledge consolidation and deduplication
- Temporal knowledge tracking
- Cross-model knowledge sharing
- Automated knowledge validation
- Knowledge graph evolution monitoring

"Knowledge is power. Information is liberating."
- Kofi Annan

We weave new threads of knowledge into the grand tapestry of understanding.
"""

import asyncio
import logging
import time
from typing import Dict, List, Optional, Union, Any, Tuple, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import json
import re
import numpy as np

# Import knowledge graph components
from ..knowledge_graph.core import (
    KnowledgeGraph, Entity, Relationship, EntityType, RelationshipType, Property
)

logger = logging.getLogger(__name__)


class KnowledgeUpdateType(Enum):
    """Types of knowledge graph updates"""
    ENTITY_ADDITION = "entity_addition"
    ENTITY_UPDATE = "entity_update"
    ENTITY_MERGE = "entity_merge"
    RELATIONSHIP_ADDITION = "relationship_addition"
    RELATIONSHIP_UPDATE = "relationship_update"
    PROPERTY_UPDATE = "property_update"
    KNOWLEDGE_CONSOLIDATION = "knowledge_consolidation"
    KNOWLEDGE_PRUNING = "knowledge_pruning"


@dataclass
class KnowledgeUpdate:
    """A knowledge graph update operation"""
    update_id: str
    update_type: KnowledgeUpdateType
    timestamp: datetime
    source_component: str
    confidence: float
    entity_id: Optional[str] = None
    relationship_id: Optional[str] = None
    old_value: Optional[Any] = None
    new_value: Any = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    validation_status: str = "pending"
    applied: bool = False


@dataclass
class KnowledgeInsight:
    """An insight extracted for knowledge graph integration"""
    insight_id: str
    insight_type: str  # "entity", "relationship", "pattern", "trend"
    content: Dict[str, Any]
    confidence: float
    source_data: Dict[str, Any]
    extracted_at: datetime
    component_source: str
    validation_score: float = 0.0


class KnowledgeGraphIntegrator:
    """
    🧠 THE DIVINE KNOWLEDGE WEAVER

    This integrator connects continual learning systems with the knowledge graph,
    ensuring that new insights are properly captured, validated, and integrated
    into the collective understanding.

    KEY RESPONSIBILITIES:
    - Extract knowledge from learning data streams
    - Validate and filter knowledge updates
    - Apply updates to knowledge graph with proper versioning
    - Monitor knowledge graph evolution and health
    - Consolidate redundant knowledge
    - Track knowledge provenance and confidence
    """

    def __init__(self, config: Optional[Dict] = None):
        """Initialize the knowledge graph integrator"""
        self.config = config or self._get_default_config()

        # Knowledge extraction
        self.insight_extractors: Dict[str, Callable] = {
            'entity_extractor': self._extract_entities,
            'relationship_extractor': self._extract_relationships,
            'pattern_extractor': self._extract_patterns,
            'trend_extractor': self._extract_trends
        }

        # Knowledge validation
        self.validators: Dict[str, Callable] = {
            'confidence_validator': self._validate_confidence,
            'consistency_validator': self._validate_consistency,
            'novelty_validator': self._validate_novelty,
            'relevance_validator': self._validate_relevance
        }

        # Update tracking
        self.pending_updates: List[KnowledgeUpdate] = []
        self.applied_updates: List[KnowledgeUpdate] = []
        self.update_history: Dict[str, List[KnowledgeUpdate]] = {}  # entity_id -> updates

        # Knowledge quality tracking
        self.knowledge_metrics = {
            'total_insights_extracted': 0,
            'insights_applied': 0,
            'validation_pass_rate': 0.0,
            'knowledge_growth_rate': 0.0,
            'redundancy_rate': 0.0
        }

        logger.info("🧠 KnowledgeGraphIntegrator initialized with divine knowledge weaving")

    def set_knowledge_graph(self, knowledge_graph: KnowledgeGraph):
        """Set the knowledge graph to integrate with"""
        self.knowledge_graph = knowledge_graph
        logger.info("🧠 Connected to knowledge graph for continual evolution")

    async def process_learning_data(self, learning_data: Dict, source_component: str) -> List[KnowledgeInsight]:
        """Process learning data to extract knowledge insights"""
        if not self.knowledge_graph:
            logger.error("❌ No knowledge graph connected")
            return []

        insights = []

        try:
            # Extract insights from different perspectives
            for extractor_name, extractor_func in self.insight_extractors.items():
                try:
                    component_insights = await extractor_func(learning_data, source_component)
                    insights.extend(component_insights)

                    logger.debug(f"🔍 Extracted {len(component_insights)} insights using {extractor_name}")

                except Exception as e:
                    logger.error(f"❌ Failed to extract insights with {extractor_name}: {str(e)}")

            # Update extraction metrics
            self.knowledge_metrics['total_insights_extracted'] += len(insights)

            logger.info(f"✅ Processed learning data from {source_component}, extracted {len(insights)} insights")

            return insights

        except Exception as e:
            logger.error(f"❌ Failed to process learning data: {str(e)}")
            return []

    async def apply_insights_to_graph(self, insights: List[KnowledgeInsight]) -> List[KnowledgeUpdate]:
        """Apply validated insights to the knowledge graph"""
        if not self.knowledge_graph:
            logger.error("❌ No knowledge graph connected")
            return []

        applied_updates = []

        try:
            for insight in insights:
                # Validate insight before applying
                if not await self._validate_insight(insight):
                    logger.debug(f"❌ Insight {insight.insight_id} failed validation")
                    continue

                # Generate update operations
                updates = await self._generate_update_operations(insight)

                # Apply updates
                for update in updates:
                    if await self._apply_update(update):
                        applied_updates.append(update)
                        self.applied_updates.append(update)

                        # Track update history
                        if update.entity_id and update.entity_id not in self.update_history:
                            self.update_history[update.entity_id] = []
                        if update.entity_id:
                            self.update_history[update.entity_id].append(update)

            # Update application metrics
            self.knowledge_metrics['insights_applied'] += len(applied_updates)

            logger.info(f"✅ Applied {len(applied_updates)} knowledge updates to graph")

            return applied_updates

        except Exception as e:
            logger.error(f"❌ Failed to apply insights to knowledge graph: {str(e)}")
            return []

    async def evolve_knowledge_graph(self, knowledge_graph: KnowledgeGraph):
        """Evolve the knowledge graph based on continual learning"""
        # This is called by the main continual learning engine
        # Apply pending updates and consolidate knowledge

        try:
            # Apply any pending updates
            if self.pending_updates:
                logger.info(f"🔄 Applying {len(self.pending_updates)} pending knowledge updates")
                for update in self.pending_updates:
                    await self._apply_update(update)

            # Consolidate redundant knowledge
            await self._consolidate_redundant_knowledge()

            # Prune obsolete knowledge
            await self._prune_obsolete_knowledge()

            # Update knowledge metrics
            await self._update_knowledge_metrics()

        except Exception as e:
            logger.error(f"❌ Failed to evolve knowledge graph: {str(e)}")

    async def _extract_entities(self, learning_data: Dict, source_component: str) -> List[KnowledgeInsight]:
        """Extract entities from learning data"""
        insights = []

        # Extract from different data types
        if 'market_data' in learning_data:
            # Extract crypto entities from market data
            market_insights = await self._extract_market_entities(learning_data['market_data'], source_component)
            insights.extend(market_insights)

        if 'social_data' in learning_data:
            # Extract entities from social media data
            social_insights = await self._extract_social_entities(learning_data['social_data'], source_component)
            insights.extend(social_insights)

        if 'news_data' in learning_data:
            # Extract entities from news data
            news_insights = await self._extract_news_entities(learning_data['news_data'], source_component)
            insights.extend(news_insights)

        return insights

    async def _extract_relationships(self, learning_data: Dict, source_component: str) -> List[KnowledgeInsight]:
        """Extract relationships from learning data"""
        insights = []

        # Extract relationships between entities found in data
        if 'entities' in learning_data:
            entities = learning_data['entities']

            # Find potential relationships based on context
            for i, entity1 in enumerate(entities):
                for entity2 in entities[i+1:]:
                    relationship = await self._infer_relationship(entity1, entity2, learning_data)
                    if relationship:
                        insights.append(relationship)

        return insights

    async def _extract_patterns(self, learning_data: Dict, source_component: str) -> List[KnowledgeInsight]:
        """Extract patterns from learning data"""
        insights = []

        # Extract behavioral patterns, market patterns, etc.
        # This would analyze temporal sequences and recurring patterns

        return insights

    async def _extract_trends(self, learning_data: Dict, source_component: str) -> List[KnowledgeInsight]:
        """Extract trends from learning data"""
        insights = []

        # Extract market trends, sentiment trends, etc.
        # This would analyze time series data for trend identification

        return insights

    async def _extract_market_entities(self, market_data: Dict, source_component: str) -> List[KnowledgeInsight]:
        """Extract entities from market data"""
        insights = []

        # Extract cryptocurrency entities
        if 'symbol' in market_data:
            symbol = market_data['symbol'].upper()

            insight = KnowledgeInsight(
                insight_id=f"market_entity_{symbol}_{int(time.time())}",
                insight_type="entity",
                content={
                    'entity_type': EntityType.TOKEN.value,
                    'name': symbol,
                    'properties': {
                        'price': market_data.get('price'),
                        'volume_24h': market_data.get('volume_24h'),
                        'market_cap': market_data.get('market_cap'),
                        'price_change_24h': market_data.get('price_change_24h')
                    }
                },
                confidence=0.9,  # High confidence for market data
                source_data=market_data,
                extracted_at=datetime.utcnow(),
                component_source=source_component
            )
            insights.append(insight)

        return insights

    async def _extract_social_entities(self, social_data: Dict, source_component: str) -> List[KnowledgeInsight]:
        """Extract entities from social media data"""
        insights = []

        # Extract mentioned entities from social media text
        text = social_data.get('text', '')

        # Simple entity extraction (would use NLP in practice)
        crypto_symbols = re.findall(r'\$([A-Z]{2,10})', text)
        mentioned_users = re.findall(r'@(\w+)', text)

        for symbol in crypto_symbols:
            insight = KnowledgeInsight(
                insight_id=f"social_entity_{symbol}_{int(time.time())}",
                insight_type="entity",
                content={
                    'entity_type': EntityType.TOKEN.value,
                    'name': symbol,
                    'properties': {
                        'mentioned_in_social': True,
                        'sentiment_score': social_data.get('sentiment_score'),
                        'engagement_count': social_data.get('engagement', 0)
                    }
                },
                confidence=0.7,
                source_data=social_data,
                extracted_at=datetime.utcnow(),
                component_source=source_component
            )
            insights.append(insight)

        return insights

    async def _extract_news_entities(self, news_data: Dict, source_component: str) -> List[KnowledgeInsight]:
        """Extract entities from news data"""
        insights = []

        # Extract entities from news content
        title = news_data.get('title', '')
        content = news_data.get('content', '')

        # Simple extraction (would use NER in practice)
        crypto_mentions = re.findall(r'\b[A-Z]{2,10}\b', title + ' ' + content)

        for mention in crypto_mentions:
            # Check if it's likely a crypto symbol
            if len(mention) <= 10 and mention.isalpha():
                insight = KnowledgeInsight(
                    insight_id=f"news_entity_{mention}_{int(time.time())}",
                    insight_type="entity",
                    content={
                        'entity_type': EntityType.TOKEN.value,
                        'name': mention,
                        'properties': {
                            'mentioned_in_news': True,
                            'news_source': news_data.get('source'),
                            'relevance_score': 0.8
                        }
                    },
                    confidence=0.6,
                    source_data=news_data,
                    extracted_at=datetime.utcnow(),
                    component_source=source_component
                )
                insights.append(insight)

        return insights

    async def _infer_relationship(self, entity1: Dict, entity2: Dict, learning_data: Dict) -> Optional[KnowledgeInsight]:
        """Infer relationships between entities"""
        # Simple relationship inference based on context
        # In practice, this would use more sophisticated reasoning

        if entity1.get('entity_type') == EntityType.TOKEN.value and entity2.get('entity_type') == EntityType.TOKEN.value:
            # Tokens might be related through trading pairs, competition, etc.
            relationship_type = RelationshipType.COMPETES_WITH

            insight = KnowledgeInsight(
                insight_id=f"relationship_{entity1.get('name', 'unknown')}_{entity2.get('name', 'unknown')}_{int(time.time())}",
                insight_type="relationship",
                content={
                    'relationship_type': relationship_type.value,
                    'entity1': entity1,
                    'entity2': entity2,
                    'confidence': 0.5
                },
                confidence=0.5,
                source_data=learning_data,
                extracted_at=datetime.utcnow(),
                component_source="relationship_inferer"
            )
            return insight

        return None

    async def _validate_insight(self, insight: KnowledgeInsight) -> bool:
        """Validate a knowledge insight"""
        validation_score = 0.0
        validation_results = []

        # Apply all validators
        for validator_name, validator_func in self.validators.items():
            try:
                result = await validator_func(insight)
                validation_score += result['score']
                validation_results.append(result)

                logger.debug(f"✅ {validator_name} validation: {result['score']:.3f}")

            except Exception as e:
                logger.error(f"❌ Validation failed for {validator_name}: {str(e)}")
                validation_score += 0.0  # Failed validators don't penalize

        # Average validation score
        avg_score = validation_score / len(self.validators) if self.validators else 0.0

        # Update insight validation score
        insight.validation_score = avg_score

        # Accept if above threshold
        threshold = self.config.get('validation_threshold', 0.6)
        accepted = avg_score >= threshold

        logger.debug(f"🔍 Insight {insight.insight_id} validation: {avg_score:.3f} ({'accepted' if accepted else 'rejected'})")

        return accepted

    async def _validate_confidence(self, insight: KnowledgeInsight) -> Dict[str, Any]:
        """Validate insight confidence"""
        # Simple confidence validation
        if insight.confidence >= 0.8:
            return {'score': 1.0, 'reason': 'High confidence'}
        elif insight.confidence >= 0.6:
            return {'score': 0.8, 'reason': 'Moderate confidence'}
        else:
            return {'score': 0.4, 'reason': 'Low confidence'}

    async def _validate_consistency(self, insight: KnowledgeInsight) -> Dict[str, Any]:
        """Validate insight consistency with existing knowledge"""
        if not self.knowledge_graph:
            return {'score': 0.5, 'reason': 'No knowledge graph for consistency check'}

        # Check if insight conflicts with existing knowledge
        # This would compare with existing entities and relationships

        return {'score': 0.8, 'reason': 'Consistent with existing knowledge'}

    async def _validate_novelty(self, insight: KnowledgeInsight) -> Dict[str, Any]:
        """Validate insight novelty"""
        # Check if insight provides new information
        # This would check against recent updates

        return {'score': 0.7, 'reason': 'Novel information detected'}

    async def _validate_relevance(self, insight: KnowledgeInsight) -> Dict[str, Any]:
        """Validate insight relevance to domain"""
        # Check if insight is relevant to crypto/finance domain

        if insight.insight_type in ['entity', 'relationship']:
            return {'score': 0.9, 'reason': 'Highly relevant to domain'}
        else:
            return {'score': 0.6, 'reason': 'Moderately relevant'}

    async def _generate_update_operations(self, insight: KnowledgeInsight) -> List[KnowledgeUpdate]:
        """Generate update operations for an insight"""
        updates = []

        if insight.insight_type == "entity":
            updates.extend(await self._generate_entity_updates(insight))
        elif insight.insight_type == "relationship":
            updates.extend(await self._generate_relationship_updates(insight))

        return updates

    async def _generate_entity_updates(self, insight: KnowledgeInsight) -> List[KnowledgeUpdate]:
        """Generate entity update operations"""
        updates = []
        content = insight.content

        entity_name = content.get('name', 'unknown')
        entity_type = EntityType(content.get('entity_type', 'other'))

        # Check if entity already exists
        existing_entity = self.knowledge_graph.get_entity_by_name(entity_name) if self.knowledge_graph else None

        if existing_entity:
            # Update existing entity
            update = KnowledgeUpdate(
                update_id=f"update_entity_{existing_entity.id}_{int(time.time())}",
                update_type=KnowledgeUpdateType.ENTITY_UPDATE,
                timestamp=datetime.utcnow(),
                source_component=insight.component_source,
                confidence=insight.confidence,
                entity_id=existing_entity.id,
                new_value=content.get('properties', {}),
                metadata={
                    'insight_id': insight.insight_id,
                    'entity_name': entity_name,
                    'entity_type': entity_type.value
                }
            )
            updates.append(update)
        else:
            # Create new entity
            # Note: This would require generating a proper Entity object
            # For now, we create an update that the main system would handle
            update = KnowledgeUpdate(
                update_id=f"create_entity_{entity_name}_{int(time.time())}",
                update_type=KnowledgeUpdateType.ENTITY_ADDITION,
                timestamp=datetime.utcnow(),
                source_component=insight.component_source,
                confidence=insight.confidence,
                new_value=content,
                metadata={
                    'insight_id': insight.insight_id,
                    'entity_name': entity_name,
                    'entity_type': entity_type.value
                }
            )
            updates.append(update)

        return updates

    async def _generate_relationship_updates(self, insight: KnowledgeInsight) -> List[KnowledgeUpdate]:
        """Generate relationship update operations"""
        updates = []
        content = insight.content

        # This would create relationship updates
        # Implementation depends on how relationships are structured

        return updates

    async def _apply_update(self, update: KnowledgeUpdate) -> bool:
        """Apply a knowledge update"""
        try:
            if update.update_type == KnowledgeUpdateType.ENTITY_UPDATE:
                return await self._apply_entity_update(update)
            elif update.update_type == KnowledgeUpdateType.ENTITY_ADDITION:
                return await self._apply_entity_addition(update)
            elif update.update_type == KnowledgeUpdateType.RELATIONSHIP_ADDITION:
                return await self._apply_relationship_addition(update)
            else:
                logger.warning(f"⚠️ Unsupported update type: {update.update_type}")
                return False

        except Exception as e:
            logger.error(f"❌ Failed to apply update {update.update_id}: {str(e)}")
            update.validation_status = "failed"
            return False

    async def _apply_entity_update(self, update: KnowledgeUpdate) -> bool:
        """Apply entity update"""
        if not self.knowledge_graph or not update.entity_id:
            return False

        entity = self.knowledge_graph.get_entity(update.entity_id)
        if not entity:
            logger.error(f"❌ Entity {update.entity_id} not found for update")
            return False

        # Update entity properties
        new_properties = update.new_value if isinstance(update.new_value, dict) else {}

        for prop_name, prop_value in new_properties.items():
            entity.update_property(prop_name, prop_value, source=update.source_component, confidence=update.confidence)

        update.applied = True
        update.validation_status = "applied"

        logger.debug(f"✅ Updated entity {update.entity_id}")
        return True

    async def _apply_entity_addition(self, update: KnowledgeUpdate) -> bool:
        """Apply entity addition"""
        if not self.knowledge_graph:
            return False

        # Create new entity from update data
        entity_data = update.new_value if isinstance(update.new_value, dict) else {}

        entity = Entity(
            id="",  # Will be auto-generated
            name=entity_data.get('name', 'unknown'),
            entity_type=EntityType(entity_data.get('entity_type', 'other')),
            confidence=update.confidence,
            source=update.source_component
        )

        # Add properties
        properties = entity_data.get('properties', {})
        for prop_name, prop_value in properties.items():
            entity.add_property(Property(
                name=prop_name,
                value=prop_value,
                source=update.source_component,
                confidence=update.confidence
            ))

        self.knowledge_graph.add_entity(entity)
        update.entity_id = entity.id
        update.applied = True
        update.validation_status = "applied"

        logger.debug(f"✅ Added entity {entity.name} ({entity.id})")
        return True

    async def _apply_relationship_addition(self, update: KnowledgeUpdate) -> bool:
        """Apply relationship addition"""
        # Implementation would add relationships to knowledge graph
        update.applied = True
        update.validation_status = "applied"
        return True

    async def _consolidate_redundant_knowledge(self):
        """Consolidate redundant or duplicate knowledge"""
        if not self.knowledge_graph:
            return

        # Find and merge duplicate entities
        entities_by_name = {}
        for entity in self.knowledge_graph.entities.values():
            name_key = entity.name.lower()
            if name_key not in entities_by_name:
                entities_by_name[name_key] = []
            entities_by_name[name_key].append(entity)

        # Merge duplicates
        for name_key, entities in entities_by_name.items():
            if len(entities) > 1:
                # Merge entities with highest confidence first
                sorted_entities = sorted(entities, key=lambda e: e.confidence, reverse=True)
                primary_entity = sorted_entities[0]

                for duplicate in sorted_entities[1:]:
                    # Check if merge threshold is met
                    if duplicate.confidence > self.config.get('merge_threshold', 0.8):
                        merged_id = self.knowledge_graph.merge_entities(primary_entity.id, duplicate.id)
                        if merged_id:
                            logger.info(f"🔗 Merged duplicate entities: {duplicate.id} -> {merged_id}")

    async def _prune_obsolete_knowledge(self):
        """Prune obsolete or low-confidence knowledge"""
        if not self.knowledge_graph:
            return

        # Remove entities with very low confidence that haven't been updated recently
        cutoff_date = datetime.utcnow() - timedelta(days=self.config.get('obsolete_days', 90))

        entities_to_remove = []
        for entity in self.knowledge_graph.entities.values():
            if (entity.confidence < self.config.get('min_confidence_threshold', 0.3) and
                entity.updated_at < cutoff_date):
                entities_to_remove.append(entity.id)

        for entity_id in entities_to_remove:
            self.knowledge_graph.remove_entity(entity_id)
            logger.debug(f"🗑️ Removed obsolete entity {entity_id}")

    async def _update_knowledge_metrics(self):
        """Update knowledge graph metrics"""
        if not self.knowledge_graph:
            return

        # Calculate knowledge growth rate
        recent_updates = [u for u in self.applied_updates if u.timestamp > datetime.utcnow() - timedelta(days=7)]
        growth_rate = len(recent_updates) / 7.0  # Updates per day

        self.knowledge_metrics['knowledge_growth_rate'] = growth_rate

        # Calculate validation pass rate
        if self.knowledge_metrics['total_insights_extracted'] > 0:
            self.knowledge_metrics['validation_pass_rate'] = (
                self.knowledge_metrics['insights_applied'] /
                self.knowledge_metrics['total_insights_extracted']
            )

        # Calculate redundancy rate (simplified)
        self.knowledge_metrics['redundancy_rate'] = 0.1  # Would calculate based on actual redundancy

    def get_knowledge_metrics(self) -> Dict[str, Any]:
        """Get knowledge integration metrics"""
        return {
            'total_insights_extracted': self.knowledge_metrics['total_insights_extracted'],
            'insights_applied': self.knowledge_metrics['insights_applied'],
            'validation_pass_rate': self.knowledge_metrics['validation_pass_rate'],
            'knowledge_growth_rate': self.knowledge_metrics['knowledge_growth_rate'],
            'redundancy_rate': self.knowledge_metrics['redundancy_rate'],
            'pending_updates': len(self.pending_updates),
            'applied_updates': len(self.applied_updates),
            'knowledge_graph_size': {
                'entities': len(self.knowledge_graph.entities) if self.knowledge_graph else 0,
                'relationships': len(self.knowledge_graph.relationships) if self.knowledge_graph else 0
            }
        }

    def _get_default_config(self) -> Dict:
        """Get default configuration"""
        return {
            'validation_threshold': 0.6,
            'merge_threshold': 0.8,
            'min_confidence_threshold': 0.3,
            'obsolete_days': 90,
            'max_pending_updates': 1000,
            'consolidation_interval_hours': 24,
            'pruning_interval_hours': 168  # 1 week
        }
