"""
📝 COMPREHENSIVE LOGGING SYSTEM - THE DIVINE CHRONICLER
=======================================================

This module implements comprehensive logging for all continual learning activities,
providing detailed audit trails, performance monitoring, and debugging capabilities.

LOGGING CAPABILITIES:
- Structured logging with contextual information
- Performance metrics tracking
- Error tracking and alerting
- Data lineage and provenance
- Learning event correlation
- Real-time dashboard integration
- Log aggregation and analysis

"Those who cannot remember the past are condemned to repeat it."
- George Santayana

We remember everything, ensuring every learning moment contributes to future wisdom.
"""

import asyncio
import logging
import json
import time
import threading
from typing import Dict, List, Optional, Union, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from enum import Enum
import uuid
import gzip
import os
from collections import defaultdict, deque

# External logging integrations
try:
    import structlog
    STRUCTLOG_AVAILABLE = True
except ImportError:
    STRUCTLOG_AVAILABLE = False

logger = logging.getLogger(__name__)


class LogLevel(Enum):
    """Logging levels"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class LogCategory(Enum):
    """Categories of logged events"""
    DATA_INGESTION = "data_ingestion"
    MODEL_UPDATE = "model_update"
    EVALUATION = "evaluation"
    FORGETTING_PREVENTION = "forgetting_prevention"
    VERSIONING = "versioning"
    KNOWLEDGE_GRAPH = "knowledge_graph"
    SYSTEM = "system"
    PERFORMANCE = "performance"
    SECURITY = "security"


@dataclass
class LearningEvent:
    """A structured learning event for logging"""
    event_id: str
    timestamp: datetime
    category: LogCategory
    level: LogLevel
    component: str  # Which component generated the event
    operation: str  # What operation was performed
    status: str     # "success", "failure", "warning"
    duration_ms: float
    metadata: Dict[str, Any]
    context: Dict[str, Any]
    error_message: Optional[str] = None
    stack_trace: Optional[str] = None


@dataclass
class PerformanceMetric:
    """Performance metric for tracking"""
    metric_name: str
    value: float
    unit: str
    timestamp: datetime
    component: str
    metadata: Dict[str, Any]


class ComprehensiveLogger:
    """
    📝 THE DIVINE CHRONICLER

    This logger provides comprehensive tracking of all continual learning activities,
    ensuring complete audit trails and performance monitoring.

    KEY FEATURES:
    - Structured logging with rich context
    - Performance metrics collection and aggregation
    - Error tracking with stack traces
    - Real-time alerting on critical events
    - Log correlation and analysis
    - Multiple output destinations (file, database, external services)
    """

    def __init__(self, config: Optional[Dict] = None):
        """Initialize the comprehensive logger"""
        self.config = config or self._get_default_config()

        # Event storage
        self.learning_events: deque = deque(maxlen=self.config.get('max_events_in_memory', 10000))
        self.performance_metrics: deque = deque(maxlen=self.config.get('max_metrics_in_memory', 50000))

        # Event aggregation
        self.event_counts: Dict[str, int] = defaultdict(int)
        self.error_counts: Dict[str, int] = defaultdict(int)
        self.performance_aggregates: Dict[str, Dict] = defaultdict(dict)

        # Log destinations
        self.log_handlers: Dict[str, Any] = {}

        # Background processing
        self.log_processing_task = None
        self.is_logging = False

        # Initialize logging infrastructure
        self._setup_logging_infrastructure()

        logger.info("📝 ComprehensiveLogger initialized with divine chronicling capabilities")

    def _setup_logging_infrastructure(self):
        """Setup logging infrastructure and handlers"""
        # Setup structured logging if available
        if STRUCTLOG_AVAILABLE:
            structlog.configure(
                processors=[
                    structlog.stdlib.filter_by_level,
                    structlog.stdlib.add_logger_name,
                    structlog.stdlib.add_log_level,
                    structlog.stdlib.PositionalArgumentsFormatter(),
                    structlog.processors.TimeStamper(fmt="iso"),
                    structlog.processors.StackInfoRenderer(),
                    structlog.processors.format_exc_info,
                    structlog.processors.UnicodeDecoder(),
                    structlog.processors.JSONRenderer()
                ],
                wrapper_class=structlog.stdlib.BoundLogger,
                logger_factory=structlog.stdlib.LoggerFactory(),
                cache_logger_on_first_use=True,
            )

        # Setup file logging
        if self.config.get('enable_file_logging', True):
            self._setup_file_logging()

        # Setup external integrations
        self._setup_external_integrations()

    def _setup_file_logging(self):
        """Setup file-based logging"""
        log_dir = self.config.get('log_directory', './logs/continual_learning')
        os.makedirs(log_dir, exist_ok=True)

        # Main log file
        log_file = os.path.join(log_dir, 'continual_learning.log')

        # Setup rotating file handler
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.DEBUG)

        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(formatter)

        # Add to root logger
        root_logger = logging.getLogger()
        root_logger.addHandler(file_handler)
        root_logger.setLevel(logging.DEBUG)

        self.log_handlers['file'] = file_handler

    def _setup_external_integrations(self):
        """Setup external logging integrations"""
        # Elasticsearch integration
        if self.config.get('enable_elasticsearch', False):
            try:
                from elasticsearch import Elasticsearch
                es_config = self.config.get('elasticsearch_config', {})
                es_client = Elasticsearch(**es_config)
                self.log_handlers['elasticsearch'] = es_client
            except ImportError:
                logger.warning("⚠️ Elasticsearch not available for logging")

        # Redis integration for real-time metrics
        if self.config.get('enable_redis_logging', False):
            try:
                import redis
                redis_config = self.config.get('redis_config', {})
                redis_client = redis.Redis(**redis_config)
                self.log_handlers['redis'] = redis_client
            except ImportError:
                logger.warning("⚠️ Redis not available for logging")

    def log_learning_event(self, category: LogCategory, level: LogLevel, component: str,
                          operation: str, status: str, duration_ms: float,
                          metadata: Optional[Dict] = None, context: Optional[Dict] = None,
                          error_message: Optional[str] = None, stack_trace: Optional[str] = None):
        """Log a learning event with full context"""
        event = LearningEvent(
            event_id=str(uuid.uuid4()),
            timestamp=datetime.utcnow(),
            category=category,
            level=level,
            component=component,
            operation=operation,
            status=status,
            duration_ms=duration_ms,
            metadata=metadata or {},
            context=context or {},
            error_message=error_message,
            stack_trace=stack_trace
        )

        # Store event
        self.learning_events.append(event)

        # Update counters
        self.event_counts[f"{category.value}:{status}"] += 1
        if status == "failure":
            self.error_counts[f"{component}:{operation}"] += 1

        # Log to standard logging
        log_message = f"[{component}] {operation} - {status} ({duration_ms:.2f}ms)"

        if metadata:
            log_message += f" | metadata: {json.dumps(metadata)}"

        if error_message:
            log_message += f" | error: {error_message}"

        # Log at appropriate level
        if level == LogLevel.DEBUG:
            logger.debug(log_message, extra={'event': event})
        elif level == LogLevel.INFO:
            logger.info(log_message, extra={'event': event})
        elif level == LogLevel.WARNING:
            logger.warning(log_message, extra={'event': event})
        elif level == LogLevel.ERROR:
            logger.error(log_message, extra={'event': event})
        elif level == LogLevel.CRITICAL:
            logger.critical(log_message, extra={'event': event})

        # Send to external handlers
        asyncio.create_task(self._send_to_external_handlers(event))

    def log_performance_metric(self, metric_name: str, value: float, unit: str,
                              component: str, metadata: Optional[Dict] = None):
        """Log a performance metric"""
        metric = PerformanceMetric(
            metric_name=metric_name,
            value=value,
            unit=unit,
            timestamp=datetime.utcnow(),
            component=component,
            metadata=metadata or {}
        )

        # Store metric
        self.performance_metrics.append(metric)

        # Update aggregates
        if metric_name not in self.performance_aggregates[component]:
            self.performance_aggregates[component][metric_name] = {
                'values': [],
                'unit': unit,
                'last_updated': datetime.utcnow()
            }

        agg = self.performance_aggregates[component][metric_name]
        agg['values'].append(value)

        # Keep only recent values
        max_values = self.config.get('max_aggregated_values', 1000)
        if len(agg['values']) > max_values:
            agg['values'] = agg['values'][-max_values:]

        agg['last_updated'] = datetime.utcnow()

        # Log to standard logging
        logger.info(f"📊 [{component}] {metric_name}: {value} {unit}", extra={'metric': metric})

        # Send to external handlers
        asyncio.create_task(self._send_metric_to_external_handlers(metric))

    async def _send_to_external_handlers(self, event: LearningEvent):
        """Send event to external logging handlers"""
        try:
            # Elasticsearch
            if 'elasticsearch' in self.log_handlers:
                await self._send_to_elasticsearch(event)

            # Redis for real-time monitoring
            if 'redis' in self.log_handlers:
                await self._send_to_redis(event)

        except Exception as e:
            logger.error(f"❌ Failed to send event to external handlers: {str(e)}")

    async def _send_metric_to_external_handlers(self, metric: PerformanceMetric):
        """Send metric to external handlers"""
        try:
            # Redis for real-time metrics
            if 'redis' in self.log_handlers:
                redis_client = self.log_handlers['redis']

                # Store in Redis for real-time access
                key = f"continual_learning:metrics:{metric.component}:{metric.metric_name}"
                redis_client.lpush(key, json.dumps(asdict(metric)))

                # Keep only recent metrics
                redis_client.ltrim(key, 0, 99)

                # Set expiry for automatic cleanup
                redis_client.expire(key, 3600)  # 1 hour

        except Exception as e:
            logger.error(f"❌ Failed to send metric to external handlers: {str(e)}")

    async def _send_to_elasticsearch(self, event: LearningEvent):
        """Send event to Elasticsearch"""
        try:
            es_client = self.log_handlers['elasticsearch']

            # Index event
            index_name = f"continual-learning-{event.timestamp.strftime('%Y.%m.%d')}"

            doc = {
                '@timestamp': event.timestamp.isoformat(),
                'event_id': event.event_id,
                'category': event.category.value,
                'level': event.level.value,
                'component': event.component,
                'operation': event.operation,
                'status': event.status,
                'duration_ms': event.duration_ms,
                'metadata': event.metadata,
                'context': event.context
            }

            if event.error_message:
                doc['error_message'] = event.error_message
            if event.stack_trace:
                doc['stack_trace'] = event.stack_trace

            await asyncio.get_event_loop().run_in_executor(
                None, es_client.index, index_name, doc
            )

        except Exception as e:
            logger.error(f"❌ Failed to send to Elasticsearch: {str(e)}")

    async def _send_to_redis(self, event: LearningEvent):
        """Send event to Redis for real-time monitoring"""
        try:
            redis_client = self.log_handlers['redis']

            # Store recent events for real-time dashboard
            key = "continual_learning:events:recent"

            # Add event
            event_data = {
                'event_id': event.event_id,
                'timestamp': event.timestamp.isoformat(),
                'category': event.category.value,
                'level': event.level.value,
                'component': event.component,
                'operation': event.operation,
                'status': event.status,
                'duration_ms': event.duration_ms
            }

            redis_client.lpush(key, json.dumps(event_data))

            # Keep only recent events
            redis_client.ltrim(key, 0, 999)

            # Set expiry
            redis_client.expire(key, 3600)  # 1 hour

            # Update counters in Redis
            counter_key = f"continual_learning:counters:{event.category.value}:{event.status}"
            redis_client.incr(counter_key)
            redis_client.expire(counter_key, 3600)

        except Exception as e:
            logger.error(f"❌ Failed to send to Redis: {str(e)}")

    def get_recent_events(self, category: Optional[LogCategory] = None,
                         component: Optional[str] = None, limit: int = 100) -> List[Dict]:
        """Get recent learning events"""
        events = list(self.learning_events)

        # Filter events
        if category:
            events = [e for e in events if e.category == category]
        if component:
            events = [e for e in events if e.component == component]

        # Sort by timestamp (newest first) and limit
        events = sorted(events, key=lambda e: e.timestamp, reverse=True)[:limit]

        return [asdict(e) for e in events]

    def get_event_statistics(self) -> Dict[str, Any]:
        """Get event statistics and summaries"""
        if not self.learning_events:
            return {}

        events = list(self.learning_events)

        # Basic statistics
        total_events = len(events)
        last_hour = datetime.utcnow() - timedelta(hours=1)
        recent_events = [e for e in events if e.timestamp > last_hour]

        # Category breakdown
        category_counts = defaultdict(int)
        for event in events:
            category_counts[event.category.value] += 1

        # Status breakdown
        status_counts = defaultdict(int)
        for event in events:
            status_counts[event.status] += 1

        # Component breakdown
        component_counts = defaultdict(int)
        for event in events:
            component_counts[event.component] += 1

        # Error analysis
        errors = [e for e in events if e.status == "failure"]
        error_rate = len(errors) / max(total_events, 1)

        # Performance analysis
        avg_duration = np.mean([e.duration_ms for e in events]) if events else 0
        max_duration = max([e.duration_ms for e in events], default=0)

        return {
            'total_events': total_events,
            'recent_events': len(recent_events),
            'error_rate': error_rate,
            'average_duration_ms': avg_duration,
            'max_duration_ms': max_duration,
            'category_breakdown': dict(category_counts),
            'status_breakdown': dict(status_counts),
            'component_breakdown': dict(component_counts),
            'top_errors': self._get_top_errors(errors, limit=10)
        }

    def _get_top_errors(self, errors: List[LearningEvent], limit: int = 10) -> List[Dict]:
        """Get most common errors"""
        error_types = defaultdict(int)
        error_details = defaultdict(list)

        for error in errors:
            key = f"{error.component}:{error.operation}"
            error_types[key] += 1
            error_details[key].append({
                'error_message': error.error_message,
                'timestamp': error.timestamp.isoformat(),
                'metadata': error.metadata
            })

        # Sort by frequency
        sorted_errors = sorted(error_types.items(), key=lambda x: x[1], reverse=True)[:limit]

        return [
            {
                'error_type': error_type,
                'count': count,
                'examples': error_details[error_type][:3]  # First 3 examples
            }
            for error_type, count in sorted_errors
        ]

    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance metrics summary"""
        if not self.performance_metrics:
            return {}

        metrics = list(self.performance_metrics)

        # Group by component and metric
        component_metrics = defaultdict(lambda: defaultdict(list))

        for metric in metrics:
            component_metrics[metric.component][metric.metric_name].append(metric.value)

        summary = {}

        for component, metric_dict in component_metrics.items():
            component_summary = {}

            for metric_name, values in metric_dict.items():
                if values:
                    component_summary[metric_name] = {
                        'current': values[-1],
                        'average': np.mean(values),
                        'min': np.min(values),
                        'max': np.max(values),
                        'std': np.std(values),
                        'count': len(values),
                        'unit': metrics[0].unit if metrics else 'unknown'
                    }

            summary[component] = component_summary

        return summary

    def export_logs(self, start_time: Optional[datetime] = None,
                   end_time: Optional[datetime] = None,
                   format: str = 'json') -> str:
        """Export logs in specified format"""
        events = list(self.learning_events)

        # Filter by time range
        if start_time:
            events = [e for e in events if e.timestamp >= start_time]
        if end_time:
            events = [e for e in events if e.timestamp <= end_time]

        if format == 'json':
            return json.dumps([asdict(e) for e in events], indent=2, default=str)
        elif format == 'csv':
            # Convert to CSV format
            import csv
            import io

            output = io.StringIO()
            fieldnames = ['event_id', 'timestamp', 'category', 'level', 'component',
                         'operation', 'status', 'duration_ms', 'metadata', 'context', 'error_message']

            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()

            for event in events:
                row = asdict(event)
                row['metadata'] = json.dumps(row['metadata'])
                row['context'] = json.dumps(row['context'])
                writer.writerow(row)

            return output.getvalue()
        else:
            raise ValueError(f"Unsupported export format: {format}")

    def create_performance_report(self, time_window_hours: int = 24) -> Dict[str, Any]:
        """Create a comprehensive performance report"""
        cutoff_time = datetime.utcnow() - timedelta(hours=time_window_hours)
        recent_events = [e for e in self.learning_events if e.timestamp > cutoff_time]
        recent_metrics = [m for m in self.performance_metrics if m.timestamp > cutoff_time]

        # Event analysis
        event_analysis = self._analyze_events(recent_events)

        # Performance analysis
        performance_analysis = self._analyze_performance(recent_metrics)

        # System health
        system_health = self._assess_system_health(recent_events, recent_metrics)

        return {
            'report_id': str(uuid.uuid4()),
            'generated_at': datetime.utcnow().isoformat(),
            'time_window_hours': time_window_hours,
            'event_analysis': event_analysis,
            'performance_analysis': performance_analysis,
            'system_health': system_health,
            'recommendations': self._generate_recommendations(event_analysis, performance_analysis, system_health)
        }

    def _analyze_events(self, events: List[LearningEvent]) -> Dict[str, Any]:
        """Analyze events for patterns and insights"""
        if not events:
            return {}

        # Event frequency by category
        category_freq = defaultdict(int)
        for event in events:
            category_freq[event.category.value] += 1

        # Success rates by component
        component_success = defaultdict(lambda: {'success': 0, 'total': 0})
        for event in events:
            comp_stats = component_success[event.component]
            comp_stats['total'] += 1
            if event.status == 'success':
                comp_stats['success'] += 1

        success_rates = {
            comp: stats['success'] / stats['total'] if stats['total'] > 0 else 0
            for comp, stats in component_success.items()
        }

        # Operation duration analysis
        operation_durations = defaultdict(list)
        for event in events:
            operation_durations[event.operation].append(event.duration_ms)

        duration_stats = {
            op: {
                'avg': np.mean(durations),
                'median': np.median(durations),
                'p95': np.percentile(durations, 95),
                'count': len(durations)
            }
            for op, durations in operation_durations.items()
        }

        return {
            'total_events': len(events),
            'category_frequency': dict(category_freq),
            'success_rates_by_component': success_rates,
            'operation_duration_stats': duration_stats
        }

    def _analyze_performance(self, metrics: List[PerformanceMetric]) -> Dict[str, Any]:
        """Analyze performance metrics"""
        if not metrics:
            return {}

        # Group metrics by component
        component_metrics = defaultdict(lambda: defaultdict(list))

        for metric in metrics:
            component_metrics[metric.component][metric.metric_name].append({
                'value': metric.value,
                'timestamp': metric.timestamp
            })

        analysis = {}

        for component, metric_dict in component_metrics.items():
            component_analysis = {}

            for metric_name, values in metric_dict.items():
                if values:
                    value_list = [v['value'] for v in values]
                    timestamps = [v['timestamp'] for v in values]

                    component_analysis[metric_name] = {
                        'current_value': value_list[-1],
                        'average': np.mean(value_list),
                        'min': np.min(value_list),
                        'max': np.max(value_list),
                        'std': np.std(value_list),
                        'trend': self._calculate_trend(timestamps, value_list),
                        'volatility': np.std(value_list) / (np.mean(value_list) + 1e-8)
                    }

            analysis[component] = component_analysis

        return analysis

    def _calculate_trend(self, timestamps: List[datetime], values: List[float]) -> str:
        """Calculate trend direction"""
        if len(values) < 2:
            return 'insufficient_data'

        # Simple linear trend
        x = [(t - timestamps[0]).total_seconds() for t in timestamps]
        if len(set(x)) < 2:  # All same time
            return 'stable'

        slope = np.polyfit(x, values, 1)[0]

        if slope > 0.001:
            return 'increasing'
        elif slope < -0.001:
            return 'decreasing'
        else:
            return 'stable'

    def _assess_system_health(self, events: List[LearningEvent], metrics: List[PerformanceMetric]) -> Dict[str, Any]:
        """Assess overall system health"""
        health_score = 100.0

        # Error rate impact
        if events:
            error_count = sum(1 for e in events if e.status == 'failure')
            error_rate = error_count / len(events)
            health_score -= error_rate * 50  # Up to 50 point penalty

        # Performance volatility impact
        if metrics:
            # Calculate average volatility across components
            volatilities = []
            for component_metrics in self._analyze_performance(metrics).values():
                for metric_data in component_metrics.values():
                    if 'volatility' in metric_data:
                        volatilities.append(metric_data['volatility'])

            if volatilities:
                avg_volatility = np.mean(volatilities)
                health_score -= avg_volatility * 20  # Up to 20 point penalty

        # Component availability
        components = set(e.component for e in events)
        successful_components = set(e.component for e in events if e.status == 'success')

        availability = len(successful_components) / len(components) if components else 1.0
        health_score *= availability

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
            'health_score': max(0.0, health_score),
            'status': status,
            'components_available': len(successful_components),
            'total_components': len(components),
            'error_rate': error_count / len(events) if events else 0,
            'performance_volatility': avg_volatility if volatilities else 0
        }

    def _generate_recommendations(self, event_analysis: Dict, performance_analysis: Dict, system_health: Dict) -> List[str]:
        """Generate recommendations based on analysis"""
        recommendations = []

        # Health-based recommendations
        if system_health['status'] in ['poor', 'critical']:
            recommendations.append("🚨 Critical: Address high error rates in failing components")
            recommendations.append("🔧 Consider reducing learning frequency to improve stability")

        if system_health['error_rate'] > 0.1:
            recommendations.append("⚠️ High error rate detected - investigate failing operations")

        # Performance-based recommendations
        for component, metrics in performance_analysis.items():
            for metric_name, metric_data in metrics.items():
                if metric_data.get('volatility', 0) > 0.5:
                    recommendations.append(f"📈 High volatility in {component}.{metric_name} - consider stabilization techniques")

        # Event-based recommendations
        if event_analysis.get('total_events', 0) == 0:
            recommendations.append("📊 No events logged - verify logging configuration")

        return recommendations

    def _get_default_config(self) -> Dict:
        """Get default configuration"""
        return {
            'max_events_in_memory': 10000,
            'max_metrics_in_memory': 50000,
            'max_aggregated_values': 1000,
            'enable_file_logging': True,
            'log_directory': './logs/continual_learning',
            'enable_elasticsearch': False,
            'elasticsearch_config': {},
            'enable_redis_logging': False,
            'redis_config': {},
            'log_level': 'INFO',
            'enable_performance_tracking': True,
            'enable_error_alerting': True,
            'error_alert_threshold': 0.1
        }

    def cleanup_old_logs(self, retention_days: int = 30):
        """Clean up old logs based on retention policy"""
        cutoff_time = datetime.utcnow() - timedelta(days=retention_days)

        # Remove old events
        while self.learning_events and self.learning_events[0].timestamp < cutoff_time:
            self.learning_events.popleft()

        # Remove old metrics
        while self.performance_metrics and self.performance_metrics[0].timestamp < cutoff_time:
            self.performance_metrics.popleft()

        logger.info(f"🧹 Cleaned up logs older than {retention_days} days")

    def get_system_overview(self) -> Dict[str, Any]:
        """Get comprehensive system overview"""
        return {
            'events_in_memory': len(self.learning_events),
            'metrics_in_memory': len(self.performance_metrics),
            'event_counts': dict(self.event_counts),
            'error_counts': dict(self.error_counts),
            'external_handlers': list(self.log_handlers.keys()),
            'performance_aggregates': {
                component: {
                    metric: len(data.get('values', []))
                    for metric, data in metrics.items()
                }
                for component, metrics in self.performance_aggregates.items()
            }
        }
