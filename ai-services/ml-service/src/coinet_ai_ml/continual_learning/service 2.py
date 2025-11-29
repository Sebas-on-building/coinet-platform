"""
🔄 CONTINUAL LEARNING SERVICE - THE DIVINE ORCHESTRATOR
=======================================================

This is the main service that orchestrates all continual learning components,
providing a unified API for integrating continual learning into the broader
Coinet AI ecosystem.

SERVICE CAPABILITIES:
- Unified continual learning API
- Component lifecycle management
- Configuration management
- Health monitoring and diagnostics
- Integration with existing AI services
- Real-time adaptation orchestration

"The whole is greater than the sum of its parts."
- Aristotle

We orchestrate the symphony of continual learning, where each component
plays its divine role in perfect harmony.
"""

import asyncio
import logging
import time
from typing import Dict, List, Optional, Union, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import json
import threading

# Import all continual learning components
from .core import ContinualLearningEngine, ContinualLearningConfig, LearningMode, AdaptationStrategy
from .data_ingestion import DataIngestionPipeline
from .online_learning import OnlineLearningManager, OnlineLearningConfig, ModelType
from .model_versioning import ModelVersionManager
from .catastrophic_forgetting import CatastrophicForgettingPreventor
from .evaluation import EvaluationFramework
from .logging import ComprehensiveLogger
from .knowledge_graph_integration import KnowledgeGraphIntegrator
from .monitoring import MonitoringDashboard

# Import existing AI services for integration
try:
    from ..oracle.core.oracle_engine import MarketOracleEngine
    from ..psychology.core.psychology_engine import CryptoPsychologyEngine
    from ..knowledge_graph.core import KnowledgeGraph
except ImportError:
    MarketOracleEngine = None
    CryptoPsychologyEngine = None
    KnowledgeGraph = None

logger = logging.getLogger(__name__)


@dataclass
class ContinualLearningServiceConfig:
    """Configuration for the continual learning service"""
    # Core settings
    learning_mode: str = "hybrid"
    adaptation_strategy: str = "adaptive"
    update_frequency_seconds: int = 300

    # Component settings
    enable_data_ingestion: bool = True
    enable_online_learning: bool = True
    enable_model_versioning: bool = True
    enable_forgetting_prevention: bool = True
    enable_evaluation: bool = True
    enable_knowledge_integration: bool = True
    enable_monitoring: bool = True

    # Integration settings
    integrate_with_oracle: bool = True
    integrate_with_psychology: bool = True
    integrate_with_knowledge_graph: bool = True

    # Performance settings
    max_concurrent_updates: int = 5
    resource_monitoring_interval: int = 60

    # Logging settings
    log_level: str = "INFO"
    enable_structured_logging: bool = True


class ContinualLearningService:
    """
    🔄 THE DIVINE CONTINUAL LEARNING ORCHESTRATOR

    This service orchestrates all continual learning components, providing a
    unified interface for integrating continual learning capabilities into
    the broader AI ecosystem.

    KEY RESPONSIBILITIES:
    - Initialize and manage all learning components
    - Coordinate learning cycles across models
    - Provide unified API for learning operations
    - Monitor system health and performance
    - Handle graceful startup and shutdown
    - Integrate with existing AI services
    """

    def __init__(self, config: Optional[ContinualLearningServiceConfig] = None):
        """Initialize the continual learning service"""
        self.config = config or ContinualLearningServiceConfig()
        self.start_time = time.time()

        # Core engine
        self.engine = ContinualLearningEngine(
            ContinualLearningConfig(
                learning_mode=LearningMode(self.config.learning_mode),
                adaptation_strategy=AdaptationStrategy(self.config.adaptation_strategy),
                update_frequency_seconds=self.config.update_frequency_seconds
            )
        )

        # Initialize components
        self.components = {}

        if self.config.enable_data_ingestion:
            self.data_ingestion = DataIngestionPipeline()
            self.components['data_ingestion'] = self.data_ingestion

        if self.config.enable_online_learning:
            self.online_learning = OnlineLearningManager()
            self.components['online_learning'] = self.online_learning

        if self.config.enable_model_versioning:
            self.model_versioning = ModelVersionManager()
            self.components['model_versioning'] = self.model_versioning

        if self.config.enable_forgetting_prevention:
            self.catastrophic_forgetting = CatastrophicForgettingPreventor()
            self.components['catastrophic_forgetting'] = self.catastrophic_forgetting

        if self.config.enable_evaluation:
            self.evaluation_framework = EvaluationFramework()
            self.components['evaluation_framework'] = self.evaluation_framework

        if self.config.enable_knowledge_integration:
            self.knowledge_graph_integrator = KnowledgeGraphIntegrator()
            self.components['knowledge_graph_integrator'] = self.knowledge_graph_integrator

        # Comprehensive logging
        self.logger = ComprehensiveLogger()
        self.components['logger'] = self.logger

        # Monitoring dashboard
        if self.config.enable_monitoring:
            self.monitoring_dashboard = MonitoringDashboard(self)
            self.components['monitoring_dashboard'] = self.monitoring_dashboard

        # Integrated AI services
        self.integrated_services = {}

        # Service state
        self.is_running = False
        self.initialized = False

        logger.info("🔄 ContinualLearningService initialized with divine orchestration capabilities")

    async def initialize(self) -> bool:
        """Initialize the continual learning service and all components"""
        try:
            logger.info("🚀 Initializing ContinualLearningService...")

            # Inject components into the core engine
            self.engine.inject_components(
                data_ingestion=self.data_ingestion if self.config.enable_data_ingestion else None,
                online_learning=self.online_learning if self.config.enable_online_learning else None,
                model_versioning=self.model_versioning if self.config.enable_model_versioning else None,
                catastrophic_forgetting=self.catastrophic_forgetting if self.config.enable_forgetting_prevention else None,
                evaluation_framework=self.evaluation_framework if self.config.enable_evaluation else None,
                knowledge_graph_integrator=self.knowledge_graph_integrator if self.config.enable_knowledge_integration else None
            )

            # Setup integrated services
            await self._setup_integrated_services()

            # Setup monitoring
            if self.config.enable_monitoring:
                await self.monitoring_dashboard.start_monitoring()

            # Setup data ingestion streams
            if self.config.enable_data_ingestion and self.data_ingestion:
                self.data_ingestion.setup_default_streams()

            # Mark as initialized
            self.initialized = True

            logger.info("✅ ContinualLearningService initialization completed")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to initialize ContinualLearningService: {str(e)}")
            return False

    async def _setup_integrated_services(self):
        """Setup integration with existing AI services"""
        try:
            # Integrate with Oracle Engine
            if self.config.integrate_with_oracle and MarketOracleEngine:
                oracle_engine = MarketOracleEngine()
                self.integrated_services['oracle_engine'] = oracle_engine

                # Register oracle models for continual learning
                if self.online_learning:
                    self.online_learning.register_model(
                        'oracle_market_predictor',
                        oracle_engine,
                        ModelType.ENSEMBLE
                    )

                logger.info("🔮 Integrated with Market Oracle Engine")

            # Integrate with Psychology Engine
            if self.config.integrate_with_psychology and CryptoPsychologyEngine:
                psychology_engine = CryptoPsychologyEngine()
                self.integrated_services['psychology_engine'] = psychology_engine

                # Register psychology models for continual learning
                if self.online_learning:
                    self.online_learning.register_model(
                        'psychology_analyzer',
                        psychology_engine,
                        ModelType.ENSEMBLE
                    )

                logger.info("🧠 Integrated with Psychology Engine")

            # Setup knowledge graph integration
            if self.config.integrate_with_knowledge_graph and KnowledgeGraph:
                knowledge_graph = KnowledgeGraph()
                self.integrated_services['knowledge_graph'] = knowledge_graph

                # Connect knowledge graph to integrator
                if self.knowledge_graph_integrator:
                    self.knowledge_graph_integrator.set_knowledge_graph(knowledge_graph)

                # Connect to core engine
                self.engine.set_knowledge_graph(knowledge_graph)

                logger.info("🧠 Connected knowledge graph for continual evolution")

        except Exception as e:
            logger.error(f"❌ Failed to setup integrated services: {str(e)}")

    async def start(self) -> bool:
        """Start the continual learning service"""
        if not self.initialized:
            logger.error("❌ Service not initialized")
            return False

        if self.is_running:
            logger.warning("🔄 Continual learning service already running")
            return True

        try:
            logger.info("🚀 Starting ContinualLearningService...")

            # Start data ingestion
            if self.config.enable_data_ingestion and self.data_ingestion:
                await self.data_ingestion.start_ingestion()

            # Start core learning engine
            await self.engine.start_learning()

            # Start monitoring
            if self.config.enable_monitoring and self.monitoring_dashboard:
                await self.monitoring_dashboard.start_monitoring()

            self.is_running = True

            logger.info("✅ ContinualLearningService started successfully")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to start ContinualLearningService: {str(e)}")
            return False

    async def stop(self) -> bool:
        """Stop the continual learning service"""
        if not self.is_running:
            return True

        try:
            logger.info("⏹️ Stopping ContinualLearningService...")

            # Stop core engine
            self.engine.stop_learning()

            # Stop data ingestion
            if self.config.enable_data_ingestion and self.data_ingestion:
                await self.data_ingestion.stop_ingestion()

            # Stop monitoring
            if self.config.enable_monitoring and self.monitoring_dashboard:
                await self.monitoring_dashboard.stop_monitoring()

            self.is_running = False

            logger.info("✅ ContinualLearningService stopped successfully")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to stop ContinualLearningService: {str(e)}")
            return False

    async def process_learning_data(self, learning_data: Dict, source_component: str) -> Dict[str, Any]:
        """Process new learning data through the continual learning pipeline"""
        if not self.is_running:
            logger.error("❌ Service not running")
            return {'error': 'Service not running'}

        try:
            self.logger.log_learning_event(
                category=LogCategory.DATA_INGESTION,
                level=LogLevel.INFO,
                component="continual_learning_service",
                operation="process_learning_data",
                status="started",
                duration_ms=0,
                metadata={'data_size': len(str(learning_data)), 'source': source_component}
            )

            start_time = time.time()

            results = {}

            # Process through knowledge graph integration
            if self.config.enable_knowledge_integration and self.knowledge_graph_integrator:
                insights = await self.knowledge_graph_integrator.process_learning_data(
                    learning_data, source_component
                )
                results['insights_extracted'] = len(insights)

                # Apply insights to knowledge graph
                updates = await self.knowledge_graph_integrator.apply_insights_to_graph(insights)
                results['updates_applied'] = len(updates)

            # Update models with new data
            if self.config.enable_online_learning and self.online_learning:
                # This would trigger model updates with the new data
                results['models_updated'] = 0

            processing_time = (time.time() - start_time) * 1000

            # Log completion
            self.logger.log_learning_event(
                category=LogCategory.DATA_INGESTION,
                level=LogLevel.INFO,
                component="continual_learning_service",
                operation="process_learning_data",
                status="completed",
                duration_ms=processing_time,
                metadata=results
            )

            return results

        except Exception as e:
            error_msg = str(e)
            self.logger.log_learning_event(
                category=LogCategory.DATA_INGESTION,
                level=LogLevel.ERROR,
                component="continual_learning_service",
                operation="process_learning_data",
                status="failed",
                duration_ms=0,
                error_message=error_msg
            )
            return {'error': error_msg}

    def register_model_for_learning(self, model_name: str, model_instance: Any, model_type: str):
        """Register a model for continual learning"""
        try:
            # Convert string model type to enum
            model_type_enum = ModelType(model_type.lower())

            # Register with online learning manager
            if self.config.enable_online_learning and self.online_learning:
                self.online_learning.register_model(model_name, model_instance, model_type_enum)

            # Register with forgetting prevention
            if self.config.enable_forgetting_prevention and self.catastrophic_forgetting:
                self.catastrophic_forgetting.register_model_for_protection(model_name, model_instance)

            # Register with core engine
            self.engine.register_model(model_name, model_instance, model_type)

            logger.info(f"📚 Registered model '{model_name}' for continual learning")

        except Exception as e:
            logger.error(f"❌ Failed to register model {model_name}: {str(e)}")

    def get_service_status(self) -> Dict[str, Any]:
        """Get comprehensive service status"""
        return {
            'service_name': 'ContinualLearningService',
            'version': '1.0.0',
            'is_running': self.is_running,
            'is_initialized': self.initialized,
            'uptime_seconds': time.time() - self.start_time,
            'components_enabled': {
                'data_ingestion': self.config.enable_data_ingestion,
                'online_learning': self.config.enable_online_learning,
                'model_versioning': self.config.enable_model_versioning,
                'forgetting_prevention': self.config.enable_forgetting_prevention,
                'evaluation': self.config.enable_evaluation,
                'knowledge_integration': self.config.enable_knowledge_integration,
                'monitoring': self.config.enable_monitoring
            },
            'integrated_services': list(self.integrated_services.keys()),
            'learning_status': self.engine.get_learning_status() if self.initialized else {},
            'last_update': datetime.utcnow().isoformat()
        }

    def get_component_status(self, component_name: str) -> Dict[str, Any]:
        """Get status of a specific component"""
        if component_name not in self.components:
            return {'error': f'Component {component_name} not found'}

        component = self.components[component_name]

        try:
            if component_name == 'data_ingestion' and hasattr(component, 'get_ingestion_metrics'):
                return component.get_ingestion_metrics()
            elif component_name == 'online_learning' and hasattr(component, 'get_learning_metrics'):
                return component.get_learning_metrics()
            elif component_name == 'model_versioning' and hasattr(component, 'get_versioning_metrics'):
                return component.get_versioning_metrics()
            elif component_name == 'catastrophic_forgetting' and hasattr(component, 'get_memory_statistics'):
                return component.get_memory_statistics()
            elif component_name == 'evaluation_framework' and hasattr(component, 'get_evaluation_summary'):
                return component.get_evaluation_summary()
            elif component_name == 'knowledge_graph_integrator' and hasattr(component, 'get_knowledge_metrics'):
                return component.get_knowledge_metrics()
            elif component_name == 'logger' and hasattr(component, 'get_system_overview'):
                return component.get_system_overview()
            elif component_name == 'monitoring_dashboard' and hasattr(component, 'get_current_metrics'):
                return component.get_current_metrics()
            else:
                return {'status': 'unknown', 'component': component_name}

        except Exception as e:
            return {'error': str(e), 'component': component_name}

    def get_system_health(self) -> Dict[str, Any]:
        """Get overall system health"""
        try:
            health_score = 100.0

            # Component health
            component_scores = []
            for component_name, component in self.components.items():
                try:
                    status = self.get_component_status(component_name)

                    if 'error' not in status:
                        component_scores.append(1.0)  # Healthy
                    else:
                        component_scores.append(0.5)  # Degraded
                        health_score -= 10  # Penalty for unhealthy component

                except Exception:
                    component_scores.append(0.0)
                    health_score -= 20

            if component_scores:
                avg_component_health = sum(component_scores) / len(component_scores)
                health_score *= avg_component_health

            # Learning activity
            if self.is_running:
                learning_status = self.engine.get_learning_status()
                if learning_status.get('is_learning'):
                    health_score += 10  # Bonus for active learning
                else:
                    health_score -= 20  # Penalty for inactive learning

            # Determine health status
            if health_score >= 90:
                status = 'excellent'
            elif health_score >= 75:
                status = 'good'
            elif health_score >= 60:
                status = 'fair'
            elif health_score >= 40:
                status = 'poor'
            else:
                status = 'critical'

            return {
                'health_score': max(0.0, min(100.0, health_score)),
                'status': status,
                'components_healthy': sum(1 for score in component_scores if score > 0.8),
                'total_components': len(self.components),
                'is_running': self.is_running,
                'is_initialized': self.initialized
            }

        except Exception as e:
            logger.error(f"❌ Failed to get system health: {str(e)}")
            return {'error': str(e), 'status': 'unknown'}

    def trigger_learning_cycle(self) -> Dict[str, Any]:
        """Manually trigger a learning cycle"""
        if not self.is_running:
            return {'error': 'Service not running'}

        try:
            # This would trigger an immediate learning cycle
            # For now, return current status
            return {
                'triggered': True,
                'timestamp': datetime.utcnow().isoformat(),
                'current_status': self.engine.get_learning_status()
            }

        except Exception as e:
            return {'error': str(e)}

    def rollback_model(self, model_name: str, target_version: str) -> Dict[str, Any]:
        """Rollback a model to a previous version"""
        try:
            success = self.engine.rollback_model(model_name, target_version)

            return {
                'success': success,
                'model_name': model_name,
                'target_version': target_version,
                'timestamp': datetime.utcnow().isoformat()
            }

        except Exception as e:
            return {'error': str(e), 'model_name': model_name}

    def get_recent_activity(self, limit: int = 50) -> List[Dict]:
        """Get recent learning activity"""
        try:
            if hasattr(self, 'logger') and self.logger:
                return self.logger.get_recent_events(limit=limit)
            else:
                return []

        except Exception as e:
            logger.error(f"❌ Failed to get recent activity: {str(e)}")
            return []

    def export_service_state(self) -> Dict[str, Any]:
        """Export complete service state for backup/inspection"""
        try:
            state = {
                'service_info': self.get_service_status(),
                'system_health': self.get_system_health(),
                'component_statuses': {
                    name: self.get_component_status(name)
                    for name in self.components.keys()
                },
                'recent_activity': self.get_recent_activity(20),
                'exported_at': datetime.utcnow().isoformat()
            }

            return state

        except Exception as e:
            logger.error(f"❌ Failed to export service state: {str(e)}")
            return {'error': str(e)}

    async def shutdown(self):
        """Gracefully shutdown the service"""
        logger.info("🔄 Shutting down ContinualLearningService...")

        try:
            # Stop the service
            await self.stop()

            # Cleanup resources
            for component in self.components.values():
                if hasattr(component, 'cleanup'):
                    await component.cleanup()

            logger.info("✅ ContinualLearningService shutdown completed")

        except Exception as e:
            logger.error(f"❌ Error during shutdown: {str(e)}")

    def __del__(self):
        """Cleanup when service is destroyed"""
        if self.is_running:
            asyncio.run(self.shutdown())
