"""
🔄 CONTINUAL LEARNING CORE ENGINE - THE DIVINE ADAPTATION SYSTEM
================================================================

This is the heart of the continual learning system - orchestrating real-time
adaptation across all AI models and knowledge structures.

ARCHITECTURE:
- Multi-source data ingestion pipeline
- Online learning algorithm coordination
- Model versioning and rollback management
- Knowledge graph continual evolution
- Catastrophic forgetting prevention
- Continuous evaluation framework

"The only way to make sense out of change is to plunge into it, move with it, and join the dance."
- Alan Watts

We dance with the ever-changing markets, learning and adapting with divine grace.
"""

import asyncio
import logging
import threading
import time
from typing import Dict, List, Optional, Union, Any, Callable, Tuple
from datetime import datetime, timedelta
import json
import uuid
import hashlib

from dataclasses import dataclass, field
from enum import Enum

import numpy as np

# Import existing services
from ..knowledge_graph.core import KnowledgeGraph, Entity, Relationship, EntityType, RelationshipType, Property
from ..oracle.core.oracle_engine import MarketOracleEngine
from ..psychology.core.psychology_engine import CryptoPsychologyEngine

logger = logging.getLogger(__name__)


class LearningMode(Enum):
    """Different modes of continual learning"""
    ONLINE = "online"  # Real-time incremental learning
    BATCH = "batch"    # Periodic batch updates
    HYBRID = "hybrid"  # Combination of both
    PAUSED = "paused"  # Learning temporarily disabled


class AdaptationStrategy(Enum):
    """Strategies for model adaptation"""
    CONSERVATIVE = "conservative"  # Slow, careful updates
    AGGRESSIVE = "aggressive"      # Fast adaptation
    BALANCED = "balanced"          # Middle ground
    ADAPTIVE = "adaptive"          # Dynamically adjusts based on performance


class DataSource(Enum):
    """Sources of learning data"""
    MARKET_FEEDS = "market_feeds"
    SOCIAL_MEDIA = "social_media"
    REGULATORY = "regulatory"
    NEWS = "news"
    ON_CHAIN = "on_chain"
    USER_BEHAVIOR = "user_behavior"
    EXTERNAL_APIS = "external_apis"


@dataclass
class LearningEvent:
    """Represents a learning event"""
    event_id: str
    timestamp: datetime
    data_source: DataSource
    data_type: str
    data_size: int
    learning_impact: float
    model_updates: Dict[str, Any]
    knowledge_graph_updates: Dict[str, Any]
    performance_metrics: Dict[str, float]
    success: bool
    error_message: Optional[str] = None


@dataclass
class ModelCheckpoint:
    """Represents a model checkpoint for versioning"""
    checkpoint_id: str
    model_name: str
    version: str
    timestamp: datetime
    performance_metrics: Dict[str, float]
    model_weights: Dict[str, Any]
    metadata: Dict[str, Any]
    parent_checkpoint_id: Optional[str] = None
    rollback_eligible: bool = True


@dataclass
class ContinualLearningConfig:
    """Configuration for continual learning"""
    learning_mode: LearningMode = LearningMode.HYBRID
    adaptation_strategy: AdaptationStrategy = AdaptationStrategy.ADAPTIVE
    learning_rate: float = 0.001
    batch_size: int = 32
    update_frequency_seconds: int = 300  # 5 minutes
    evaluation_frequency_hours: int = 24

    # Catastrophic forgetting prevention
    memory_retention_rate: float = 0.8
    knowledge_preservation_threshold: float = 0.7
    forgetting_detection_sensitivity: float = 0.1

    # Data ingestion settings
    max_data_buffer_size: int = 10000
    data_quality_threshold: float = 0.8
    source_reliability_weights: Dict[DataSource, float] = field(default_factory=dict)

    # Model versioning
    max_checkpoint_history: int = 50
    auto_rollback_on_degradation: bool = True
    rollback_threshold: float = -0.1  # 10% performance degradation

    # Knowledge graph settings
    knowledge_graph_update_threshold: float = 0.6
    relationship_confidence_threshold: float = 0.7
    entity_merge_threshold: float = 0.8


class ContinualLearningEngine:
    """
    🔄 THE DIVINE CONTINUAL LEARNING ENGINE

    This engine orchestrates the continuous evolution of all AI models and
    knowledge structures in response to real-time data streams.

    KEY RESPONSIBILITIES:
    - Coordinate data ingestion from multiple sources
    - Manage online learning algorithms across all models
    - Maintain model versioning and rollback capabilities
    - Prevent catastrophic forgetting
    - Continuously evaluate and adapt performance
    - Evolve the knowledge graph with new insights
    """

    def __init__(self, config: Optional[ContinualLearningConfig] = None):
        """Initialize the divine continual learning engine"""
        self.config = config or ContinualLearningConfig()

        # Initialize core components
        self.data_ingestion = None  # Will be injected
        self.online_learning = None  # Will be injected
        self.model_versioning = None  # Will be injected
        self.catastrophic_forgetting = None  # Will be injected
        self.evaluation_framework = None  # Will be injected
        self.knowledge_graph_integrator = None  # Will be injected

        # Learning state
        self.learning_mode = LearningMode.PAUSED
        self.is_learning = False
        self.learning_thread = None
        self.last_update_timestamp = None
        self.learning_events: List[LearningEvent] = []

        # Model references
        self.models: Dict[str, Any] = {}
        self.knowledge_graph: Optional[KnowledgeGraph] = None

        # Performance tracking
        self.performance_history: List[Dict] = []
        self.adaptation_metrics: Dict[str, float] = {}

        # Initialize default source reliability weights
        if not self.config.source_reliability_weights:
            self.config.source_reliability_weights = {
                DataSource.MARKET_FEEDS: 0.9,
                DataSource.ON_CHAIN: 0.85,
                DataSource.SOCIAL_MEDIA: 0.7,
                DataSource.NEWS: 0.75,
                DataSource.REGULATORY: 0.95,
                DataSource.USER_BEHAVIOR: 0.8,
                DataSource.EXTERNAL_APIS: 0.6
            }

        logger.info("🔄 ContinualLearningEngine initialized with divine adaptability")

    def register_model(self, model_name: str, model_instance: Any, model_type: str = "generic"):
        """Register a model for continual learning"""
        self.models[model_name] = {
            'instance': model_instance,
            'type': model_type,
            'last_update': None,
            'performance_baseline': {},
            'adaptation_enabled': True,
            'learning_rate': self.config.learning_rate,
            'update_count': 0
        }
        logger.info(f"📚 Registered {model_type} model '{model_name}' for continual learning")

    def set_knowledge_graph(self, knowledge_graph: KnowledgeGraph):
        """Set the knowledge graph for continual evolution"""
        self.knowledge_graph = knowledge_graph
        logger.info("🧠 Knowledge graph connected for continual evolution")

    def inject_components(self,
                         data_ingestion=None,
                         online_learning=None,
                         model_versioning=None,
                         catastrophic_forgetting=None,
                         evaluation_framework=None,
                         knowledge_graph_integrator=None):
        """Inject core learning components"""
        if data_ingestion:
            self.data_ingestion = data_ingestion
        if online_learning:
            self.online_learning = online_learning
        if model_versioning:
            self.model_versioning = model_versioning
        if catastrophic_forgetting:
            self.catastrophic_forgetting = catastrophic_forgetting
        if evaluation_framework:
            self.evaluation_framework = evaluation_framework
        if knowledge_graph_integrator:
            self.knowledge_graph_integrator = knowledge_graph_integrator

        logger.info("🔗 All continual learning components successfully injected")

    async def start_learning(self, mode: Optional[LearningMode] = None):
        """Start the continual learning process"""
        if self.is_learning:
            logger.warning("🔄 Continual learning already running")
            return

        if mode:
            self.learning_mode = mode

        self.is_learning = True

        # Start learning loop in background thread
        self.learning_thread = threading.Thread(target=self._learning_loop, daemon=True)
        self.learning_thread.start()

        logger.info(f"🚀 Continual learning started in {self.learning_mode.value} mode")

    def stop_learning(self):
        """Stop the continual learning process"""
        if not self.is_learning:
            return

        self.is_learning = False
        self.learning_mode = LearningMode.PAUSED

        if self.learning_thread and self.learning_thread.is_alive():
            self.learning_thread.join(timeout=5.0)

        logger.info("⏹️ Continual learning stopped")

    def _learning_loop(self):
        """Main learning loop running in background thread"""
        while self.is_learning:
            try:
                # Check if it's time for an update
                if self._should_update():
                    asyncio.run(self._perform_learning_cycle())

                # Sleep for a short interval
                time.sleep(min(self.config.update_frequency_seconds / 10, 30))

            except Exception as e:
                logger.error(f"❌ Error in learning loop: {str(e)}")
                time.sleep(60)  # Wait a minute before retrying

    def _should_update(self) -> bool:
        """Determine if learning cycle should run"""
        if not self.last_update_timestamp:
            return True

        time_since_update = datetime.utcnow() - self.last_update_timestamp
        return time_since_update.total_seconds() >= self.config.update_frequency_seconds

    async def _perform_learning_cycle(self):
        """Perform a complete learning cycle"""
        cycle_id = str(uuid.uuid4())
        start_time = datetime.utcnow()

        logger.info(f"🔄 Starting learning cycle {cycle_id}")

        try:
            # 1. Data Ingestion
            if self.data_ingestion:
                await self._ingest_data()

            # 2. Model Updates
            await self._update_models()

            # 3. Knowledge Graph Evolution
            if self.knowledge_graph_integrator:
                await self._evolve_knowledge_graph()

            # 4. Performance Evaluation
            if self.evaluation_framework:
                await self._evaluate_performance()

            # 5. Adaptation Strategy Update
            await self._update_adaptation_strategy()

            # 6. Catastrophic Forgetting Prevention
            if self.catastrophic_forgetting:
                await self._prevent_forgetting()

            # 7. Model Versioning
            if self.model_versioning:
                await self._create_checkpoint()

            # Record learning event
            self.last_update_timestamp = datetime.utcnow()
            learning_time = (datetime.utcnow() - start_time).total_seconds()

            learning_event = LearningEvent(
                event_id=cycle_id,
                timestamp=start_time,
                data_source=DataSource.MARKET_FEEDS,  # Primary source
                data_type="mixed",
                data_size=0,  # Would be calculated
                learning_impact=0.0,  # Would be calculated
                model_updates={},
                knowledge_graph_updates={},
                performance_metrics={},
                success=True
            )

            self.learning_events.append(learning_event)

            # Keep only recent events
            if len(self.learning_events) > 1000:
                self.learning_events = self.learning_events[-1000:]

            logger.info(f"✅ Learning cycle {cycle_id} completed in {learning_time:.2f}s")

        except Exception as e:
            logger.error(f"❌ Learning cycle {cycle_id} failed: {str(e)}")

            # Record failed learning event
            learning_event = LearningEvent(
                event_id=cycle_id,
                timestamp=start_time,
                data_source=DataSource.MARKET_FEEDS,
                data_type="mixed",
                data_size=0,
                learning_impact=0.0,
                model_updates={},
                knowledge_graph_updates={},
                performance_metrics={},
                success=False,
                error_message=str(e)
            )

            self.learning_events.append(learning_event)

    async def _ingest_data(self):
        """Ingest data from all configured sources"""
        if not self.data_ingestion:
            return

        # This would be implemented by the data ingestion component
        logger.debug("📊 Ingesting data from configured sources")

    async def _update_models(self):
        """Update all registered models with new data"""
        for model_name, model_info in self.models.items():
            if not model_info['adaptation_enabled']:
                continue

            try:
                logger.debug(f"🔧 Updating model {model_name}")

                # Update model using online learning
                if self.online_learning:
                    await self.online_learning.update_model(model_name, model_info)

                model_info['last_update'] = datetime.utcnow()
                model_info['update_count'] += 1

            except Exception as e:
                logger.error(f"❌ Failed to update model {model_name}: {str(e)}")

    async def _evolve_knowledge_graph(self):
        """Evolve knowledge graph with new insights"""
        if not self.knowledge_graph_integrator or not self.knowledge_graph:
            return

        try:
            await self.knowledge_graph_integrator.evolve_knowledge_graph(self.knowledge_graph)
        except Exception as e:
            logger.error(f"❌ Failed to evolve knowledge graph: {str(e)}")

    async def _evaluate_performance(self):
        """Evaluate current model performance"""
        if not self.evaluation_framework:
            return

        try:
            await self.evaluation_framework.evaluate_models(self.models)
        except Exception as e:
            logger.error(f"❌ Failed to evaluate performance: {str(e)}")

    async def _update_adaptation_strategy(self):
        """Update adaptation strategy based on performance"""
        # Analyze recent performance to adjust strategy
        if len(self.performance_history) < 5:
            return

        recent_performance = self.performance_history[-5:]

        # Simple adaptive strategy - could be made more sophisticated
        avg_performance = np.mean([p.get('overall_score', 0.5) for p in recent_performance])

        if avg_performance > 0.8:
            # Performance is good, can be more aggressive
            if self.config.adaptation_strategy == AdaptationStrategy.CONSERVATIVE:
                self.config.adaptation_strategy = AdaptationStrategy.BALANCED
                logger.info("📈 Performance excellent - increasing adaptation aggressiveness")
        elif avg_performance < 0.4:
            # Performance is poor, be more conservative
            if self.config.adaptation_strategy == AdaptationStrategy.AGGRESSIVE:
                self.config.adaptation_strategy = AdaptationStrategy.BALANCED
                logger.warning("📉 Performance declining - reducing adaptation aggressiveness")

    async def _prevent_forgetting(self):
        """Apply catastrophic forgetting prevention"""
        if not self.catastrophic_forgetting:
            return

        try:
            await self.catastrophic_forgetting.prevent_forgetting(self.models)
        except Exception as e:
            logger.error(f"❌ Failed to prevent catastrophic forgetting: {str(e)}")

    async def _create_checkpoint(self):
        """Create model checkpoints for versioning"""
        if not self.model_versioning:
            return

        try:
            await self.model_versioning.create_checkpoint(self.models, self.knowledge_graph)
        except Exception as e:
            logger.error(f"❌ Failed to create checkpoint: {str(e)}")

    def get_learning_status(self) -> Dict[str, Any]:
        """Get current learning status and metrics"""
        return {
            'is_learning': self.is_learning,
            'learning_mode': self.learning_mode.value,
            'adaptation_strategy': self.config.adaptation_strategy.value,
            'last_update': self.last_update_timestamp.isoformat() if self.last_update_timestamp else None,
            'models_count': len(self.models),
            'learning_events_count': len(self.learning_events),
            'performance_history_length': len(self.performance_history),
            'knowledge_graph_entities': len(self.knowledge_graph.entities) if self.knowledge_graph else 0,
            'knowledge_graph_relationships': len(self.knowledge_graph.relationships) if self.knowledge_graph else 0
        }

    def get_recent_learning_events(self, limit: int = 10) -> List[Dict]:
        """Get recent learning events"""
        recent_events = self.learning_events[-limit:] if self.learning_events else []
        return [event.__dict__ for event in recent_events]

    def rollback_model(self, model_name: str, target_version: str) -> bool:
        """Rollback a model to a previous version"""
        if not self.model_versioning:
            logger.error("❌ Model versioning not available")
            return False

        try:
            success = asyncio.run(self.model_versioning.rollback_model(model_name, target_version))
            if success:
                logger.info(f"🔄 Successfully rolled back model {model_name} to version {target_version}")
            return success
        except Exception as e:
            logger.error(f"❌ Failed to rollback model {model_name}: {str(e)}")
            return False

    def pause_learning(self):
        """Pause continual learning"""
        self.learning_mode = LearningMode.PAUSED
        logger.info("⏸️ Continual learning paused")

    def resume_learning(self, mode: Optional[LearningMode] = None):
        """Resume continual learning"""
        if mode:
            self.learning_mode = mode
        else:
            self.learning_mode = LearningMode.HYBRID

        logger.info(f"▶️ Continual learning resumed in {self.learning_mode.value} mode")

    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary across all models"""
        if not self.performance_history:
            return {'error': 'No performance data available'}

        recent_performance = self.performance_history[-10:] if self.performance_history else []

        return {
            'overall_trend': self._calculate_performance_trend(),
            'model_performance': {
                name: info.get('performance_score', 0.5)
                for name, info in self.models.items()
            },
            'recent_metrics': recent_performance,
            'adaptation_effectiveness': self.adaptation_metrics
        }

    def _calculate_performance_trend(self) -> str:
        """Calculate overall performance trend"""
        if len(self.performance_history) < 3:
            return "insufficient_data"

        recent_scores = [p.get('overall_score', 0.5) for p in self.performance_history[-5:]]
        trend = np.polyfit(range(len(recent_scores)), recent_scores, 1)[0]

        if trend > 0.01:
            return "improving"
        elif trend < -0.01:
            return "declining"
        else:
            return "stable"

    def _get_default_config(self) -> ContinualLearningConfig:
        """Get default configuration"""
        return ContinualLearningConfig()

    def __del__(self):
        """Cleanup when engine is destroyed"""
        self.stop_learning()
