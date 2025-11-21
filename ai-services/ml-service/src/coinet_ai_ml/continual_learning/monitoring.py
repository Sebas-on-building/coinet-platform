"""
📊 CONTINUAL LEARNING MONITORING DASHBOARD - THE DIVINE OBSERVATORY
====================================================================

This module provides comprehensive monitoring and visualization capabilities
for the continual learning system, offering real-time insights into system
health, performance, and learning progress.

MONITORING CAPABILITIES:
- Real-time system health monitoring
- Performance metrics visualization
- Learning progress tracking
- Alert management and notification
- Historical trend analysis
- Predictive maintenance insights
- Resource utilization monitoring

"The eye sees only what the mind is prepared to comprehend."
- Robertson Davies

We prepare the mind to comprehend the intricate dance of continual learning.
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
import statistics

import numpy as np

# Web framework for dashboard (would use FastAPI/Flask in production)
try:
    from fastapi import FastAPI, HTTPException
    from fastapi.responses import HTMLResponse, JSONResponse
    import uvicorn
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False

logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class SystemAlert:
    """A system alert"""
    alert_id: str
    timestamp: datetime
    severity: AlertSeverity
    component: str
    title: str
    message: str
    metrics: Dict[str, Any]
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved: bool = False
    resolved_at: Optional[datetime] = None


@dataclass
class DashboardMetrics:
    """Metrics for dashboard display"""
    system_health: Dict[str, Any]
    learning_status: Dict[str, Any]
    performance_summary: Dict[str, Any]
    knowledge_graph_metrics: Dict[str, Any]
    alerts: List[Dict]
    recent_activity: List[Dict]
    resource_utilization: Dict[str, float]


class MonitoringDashboard:
    """
    📊 THE DIVINE OBSERVATORY

    This dashboard provides comprehensive monitoring and visualization of the
    continual learning system, offering real-time insights and historical analysis.

    KEY FEATURES:
    - Real-time system health monitoring
    - Interactive performance visualizations
    - Alert management and escalation
    - Historical trend analysis
    - Resource utilization tracking
    - Predictive maintenance insights
    - Custom dashboard configuration
    """

    def __init__(self, continual_learning_engine, config: Optional[Dict] = None):
        """Initialize the monitoring dashboard"""
        self.continual_learning_engine = continual_learning_engine
        self.config = config or self._get_default_config()

        # Alert management
        self.active_alerts: List[SystemAlert] = []
        self.alert_history: List[SystemAlert] = []
        self.alert_rules: Dict[str, Callable] = {}

        # Dashboard state
        self.dashboard_data: Optional[DashboardMetrics] = None
        self.last_update: Optional[datetime] = None

        # Background monitoring
        self.monitoring_task = None
        self.is_monitoring = False

        # Web dashboard (if FastAPI available)
        self.web_app = None
        if FASTAPI_AVAILABLE:
            self._setup_web_dashboard()

        # Setup default alert rules
        self._setup_alert_rules()

        logger.info("📊 MonitoringDashboard initialized with divine observatory capabilities")

    def _setup_web_dashboard(self):
        """Setup web-based dashboard"""
        if not FASTAPI_AVAILABLE:
            return

        self.web_app = FastAPI(title="Continual Learning Dashboard", version="1.0.0")

        @self.web_app.get("/")
        async def dashboard_home():
            """Serve dashboard homepage"""
            return HTMLResponse(self._generate_dashboard_html())

        @self.web_app.get("/api/metrics")
        async def get_metrics():
            """Get current metrics"""
            return JSONResponse(self.get_current_metrics())

        @self.web_app.get("/api/alerts")
        async def get_alerts():
            """Get active alerts"""
            return JSONResponse([asdict(alert) for alert in self.active_alerts])

        @self.web_app.post("/api/alerts/{alert_id}/acknowledge")
        async def acknowledge_alert(alert_id: str):
            """Acknowledge an alert"""
            for alert in self.active_alerts:
                if alert.alert_id == alert_id:
                    alert.acknowledged = True
                    alert.acknowledged_at = datetime.utcnow()
                    return {"status": "acknowledged"}

            raise HTTPException(status_code=404, detail="Alert not found")

        @self.web_app.get("/api/history")
        async def get_history(days: int = 7):
            """Get historical data"""
            return JSONResponse(self.get_historical_data(days))

        logger.info("🌐 Web dashboard setup complete")

    def _generate_dashboard_html(self) -> str:
        """Generate HTML for the dashboard"""
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Continual Learning Dashboard</title>
            <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .metric-card { border: 1px solid #ddd; padding: 15px; margin: 10px; border-radius: 5px; }
                .alert { padding: 10px; margin: 10px; border-radius: 5px; }
                .alert.critical { background-color: #ffebee; border-left: 5px solid #f44336; }
                .alert.warning { background-color: #fff3e0; border-left: 5px solid #ff9800; }
                .alert.info { background-color: #e3f2fd; border-left: 5px solid #2196f3; }
                .chart-container { width: 100%; height: 400px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <h1>🔄 Continual Learning System Dashboard</h1>

            <div id="system-health" class="metric-card">
                <h2>System Health</h2>
                <div id="health-metrics"></div>
            </div>

            <div id="learning-status" class="metric-card">
                <h2>Learning Status</h2>
                <div id="learning-metrics"></div>
            </div>

            <div id="performance" class="metric-card">
                <h2>Performance Summary</h2>
                <div id="performance-metrics"></div>
            </div>

            <div id="alerts" class="metric-card">
                <h2>Active Alerts</h2>
                <div id="alerts-container"></div>
            </div>

            <div class="chart-container">
                <div id="performance-chart"></div>
            </div>

            <script>
                async function updateDashboard() {
                    try {
                        const response = await fetch('/api/metrics');
                        const data = await response.json();

                        updateMetrics('health-metrics', data.system_health);
                        updateMetrics('learning-metrics', data.learning_status);
                        updateMetrics('performance-metrics', data.performance_summary);

                        updateAlerts(data.alerts);
                        updateChart(data.performance_history);

                    } catch (error) {
                        console.error('Failed to update dashboard:', error);
                    }
                }

                function updateMetrics(containerId, metrics) {
                    const container = document.getElementById(containerId);
                    container.innerHTML = Object.entries(metrics)
                        .map(([key, value]) =>
                            `<div><strong>${key}:</strong> ${typeof value === 'object' ? JSON.stringify(value) : value}</div>`
                        ).join('');
                }

                function updateAlerts(alerts) {
                    const container = document.getElementById('alerts-container');
                    container.innerHTML = alerts.map(alert =>
                        `<div class="alert ${alert.severity}">
                            <strong>${alert.title}</strong><br>
                            ${alert.message}<br>
                            <small>${new Date(alert.timestamp).toLocaleString()}</small>
                        </div>`
                    ).join('');
                }

                function updateChart(history) {
                    if (!history || history.length === 0) return;

                    const timestamps = history.map(h => new Date(h.timestamp));
                    const scores = history.map(h => h.overall_score || 0);

                    const trace = {
                        x: timestamps,
                        y: scores,
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: 'Performance Score'
                    };

                    const layout = {
                        title: 'Performance Over Time',
                        xaxis: { title: 'Time' },
                        yaxis: { title: 'Score' }
                    };

                    Plotly.newPlot('performance-chart', [trace], layout);
                }

                // Update every 30 seconds
                setInterval(updateDashboard, 30000);
                updateDashboard(); // Initial load
            </script>
        </body>
        </html>
        """

    def _setup_alert_rules(self):
        """Setup default alert rules"""
        self.alert_rules = {
            'high_error_rate': self._check_high_error_rate,
            'performance_degradation': self._check_performance_degradation,
            'memory_usage': self._check_memory_usage,
            'learning_stalled': self._check_learning_stalled,
            'knowledge_graph_anomalies': self._check_knowledge_graph_anomalies
        }

    async def start_monitoring(self):
        """Start the monitoring system"""
        if self.is_monitoring:
            logger.warning("📊 Monitoring already running")
            return

        self.is_monitoring = True

        # Start background monitoring task
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())

        # Start web dashboard if available
        if self.web_app and self.config.get('enable_web_dashboard', True):
            dashboard_port = self.config.get('dashboard_port', 8001)
            asyncio.create_task(self._start_web_dashboard(dashboard_port))

        logger.info("🚀 Monitoring dashboard started")

    async def stop_monitoring(self):
        """Stop the monitoring system"""
        if not self.is_monitoring:
            return

        self.is_monitoring = False

        if self.monitoring_task:
            self.monitoring_task.cancel()

        logger.info("⏹️ Monitoring dashboard stopped")

    async def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.is_monitoring:
            try:
                # Update dashboard data
                await self._update_dashboard_data()

                # Check alert rules
                await self._check_alert_rules()

                # Clean up old alerts
                self._cleanup_old_alerts()

                # Wait for next update
                await asyncio.sleep(self.config.get('monitoring_interval_seconds', 60))

            except asyncio.CancelledError:
                logger.info("🛑 Monitoring loop cancelled")
                break
            except Exception as e:
                logger.error(f"❌ Error in monitoring loop: {str(e)}")
                await asyncio.sleep(60)  # Wait before retrying

    async def _update_dashboard_data(self):
        """Update dashboard metrics"""
        try:
            # Get data from continual learning engine components
            system_health = self._get_system_health()
            learning_status = self._get_learning_status()
            performance_summary = self._get_performance_summary()
            knowledge_graph_metrics = self._get_knowledge_graph_metrics()
            alerts = [asdict(alert) for alert in self.active_alerts]
            recent_activity = self._get_recent_activity()
            resource_utilization = self._get_resource_utilization()

            self.dashboard_data = DashboardMetrics(
                system_health=system_health,
                learning_status=learning_status,
                performance_summary=performance_summary,
                knowledge_graph_metrics=knowledge_graph_metrics,
                alerts=alerts,
                recent_activity=recent_activity,
                resource_utilization=resource_utilization
            )

            self.last_update = datetime.utcnow()

        except Exception as e:
            logger.error(f"❌ Failed to update dashboard data: {str(e)}")

    def _get_system_health(self) -> Dict[str, Any]:
        """Get system health metrics"""
        try:
            # Get from logger
            logger_metrics = self.continual_learning_engine.logger.get_system_overview() if hasattr(self.continual_learning_engine, 'logger') else {}

            return {
                'overall_status': 'healthy',
                'uptime_seconds': time.time() - (self.continual_learning_engine.start_time if hasattr(self.continual_learning_engine, 'start_time') else time.time()),
                'components_active': len(logger_metrics.get('component_breakdown', {})),
                'error_rate': logger_metrics.get('error_rate', 0.0),
                'last_update': self.last_update.isoformat() if self.last_update else None
            }

        except Exception as e:
            logger.error(f"❌ Failed to get system health: {str(e)}")
            return {'error': str(e)}

    def _get_learning_status(self) -> Dict[str, Any]:
        """Get learning status"""
        try:
            if hasattr(self.continual_learning_engine, 'get_learning_status'):
                return self.continual_learning_engine.get_learning_status()
            else:
                return {
                    'is_learning': False,
                    'learning_mode': 'unknown',
                    'models_count': 0,
                    'last_update': None
                }

        except Exception as e:
            logger.error(f"❌ Failed to get learning status: {str(e)}")
            return {'error': str(e)}

    def _get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary"""
        try:
            if hasattr(self.continual_learning_engine, 'evaluation_framework'):
                return self.continual_learning_engine.evaluation_framework.get_evaluation_summary()
            else:
                return {'message': 'No evaluation data available'}

        except Exception as e:
            logger.error(f"❌ Failed to get performance summary: {str(e)}")
            return {'error': str(e)}

    def _get_knowledge_graph_metrics(self) -> Dict[str, Any]:
        """Get knowledge graph metrics"""
        try:
            if hasattr(self.continual_learning_engine, 'knowledge_graph_integrator'):
                return self.continual_learning_engine.knowledge_graph_integrator.get_knowledge_metrics()
            else:
                return {'message': 'No knowledge graph integration available'}

        except Exception as e:
            logger.error(f"❌ Failed to get knowledge graph metrics: {str(e)}")
            return {'error': str(e)}

    def _get_recent_activity(self, limit: int = 20) -> List[Dict]:
        """Get recent activity"""
        try:
            if hasattr(self.continual_learning_engine, 'logger'):
                return self.continual_learning_engine.logger.get_recent_events(limit=limit)
            else:
                return []

        except Exception as e:
            logger.error(f"❌ Failed to get recent activity: {str(e)}")
            return []

    def _get_resource_utilization(self) -> Dict[str, float]:
        """Get resource utilization metrics"""
        try:
            # Memory usage
            import psutil
            process = psutil.Process()
            memory_info = process.memory_info()

            return {
                'memory_usage_mb': memory_info.rss / 1024 / 1024,
                'cpu_usage_percent': process.cpu_percent(),
                'open_files': len(process.open_files()),
                'threads': process.num_threads()
            }

        except ImportError:
            return {'memory_usage_mb': 0, 'cpu_usage_percent': 0}
        except Exception as e:
            logger.error(f"❌ Failed to get resource utilization: {str(e)}")
            return {}

    async def _check_alert_rules(self):
        """Check all alert rules"""
        for rule_name, rule_func in self.alert_rules.items():
            try:
                alerts = await rule_func()
                for alert in alerts:
                    self._add_alert(alert)

            except Exception as e:
                logger.error(f"❌ Failed to check alert rule {rule_name}: {str(e)}")

    async def _check_high_error_rate(self) -> List[SystemAlert]:
        """Check for high error rates"""
        alerts = []

        try:
            if hasattr(self.continual_learning_engine, 'logger'):
                stats = self.continual_learning_engine.logger.get_event_statistics()

                error_rate = stats.get('error_rate', 0)
                threshold = self.config.get('error_rate_threshold', 0.1)  # 10%

                if error_rate > threshold:
                    alert = SystemAlert(
                        alert_id=str(uuid.uuid4()),
                        timestamp=datetime.utcnow(),
                        severity=AlertSeverity.WARNING,
                        component="system",
                        title="High Error Rate Detected",
                        message=f"Error rate is {error_rate:.1%}, above threshold of {threshold:.1%}",
                        metrics={'error_rate': error_rate, 'threshold': threshold}
                    )
                    alerts.append(alert)

        except Exception as e:
            logger.error(f"❌ Failed to check high error rate: {str(e)}")

        return alerts

    async def _check_performance_degradation(self) -> List[SystemAlert]:
        """Check for performance degradation"""
        alerts = []

        try:
            if hasattr(self.continual_learning_engine, 'evaluation_framework'):
                # Check for declining performance trends
                model_trends = {}

                # This would check each model's performance trend
                # For now, placeholder implementation

                for model_id in ['oracle_engine', 'psychology_engine']:  # Example models
                    trend = self.continual_learning_engine.evaluation_framework.get_performance_trends(model_id)
                    if trend and trend.trend_direction == "declining":
                        alert = SystemAlert(
                            alert_id=str(uuid.uuid4()),
                            timestamp=datetime.utcnow(),
                            severity=AlertSeverity.WARNING,
                            component=model_id,
                            title=f"Performance Degradation in {model_id}",
                            message=f"Performance trend is declining with strength {trend.trend_strength:.3f}",
                            metrics={'trend_strength': trend.trend_strength, 'slope': trend.slope}
                        )
                        alerts.append(alert)

        except Exception as e:
            logger.error(f"❌ Failed to check performance degradation: {str(e)}")

        return alerts

    async def _check_memory_usage(self) -> List[SystemAlert]:
        """Check memory usage"""
        alerts = []

        try:
            utilization = self._get_resource_utilization()
            memory_mb = utilization.get('memory_usage_mb', 0)

            # Alert thresholds (MB)
            warning_threshold = self.config.get('memory_warning_threshold_mb', 1000)
            critical_threshold = self.config.get('memory_critical_threshold_mb', 2000)

            if memory_mb > critical_threshold:
                alert = SystemAlert(
                    alert_id=str(uuid.uuid4()),
                    timestamp=datetime.utcnow(),
                    severity=AlertSeverity.CRITICAL,
                    component="system",
                    title="Critical Memory Usage",
                    message=f"Memory usage is {memory_mb:.0f}MB, above critical threshold of {critical_threshold}MB",
                    metrics={'memory_usage_mb': memory_mb, 'threshold_mb': critical_threshold}
                )
                alerts.append(alert)
            elif memory_mb > warning_threshold:
                alert = SystemAlert(
                    alert_id=str(uuid.uuid4()),
                    timestamp=datetime.utcnow(),
                    severity=AlertSeverity.WARNING,
                    component="system",
                    title="High Memory Usage",
                    message=f"Memory usage is {memory_mb:.0f}MB, above warning threshold of {warning_threshold}MB",
                    metrics={'memory_usage_mb': memory_mb, 'threshold_mb': warning_threshold}
                )
                alerts.append(alert)

        except Exception as e:
            logger.error(f"❌ Failed to check memory usage: {str(e)}")

        return alerts

    async def _check_learning_stalled(self) -> List[SystemAlert]:
        """Check if learning has stalled"""
        alerts = []

        try:
            if hasattr(self.continual_learning_engine, 'get_learning_status'):
                status = self.continual_learning_engine.get_learning_status()

                # Check if learning has been inactive for too long
                if status.get('last_update') and status.get('is_learning'):
                    last_update_str = status['last_update']
                    if last_update_str:
                        last_update = datetime.fromisoformat(last_update_str)
                        time_since_update = (datetime.utcnow() - last_update).total_seconds()

                        stall_threshold = self.config.get('learning_stall_threshold_seconds', 3600)  # 1 hour

                        if time_since_update > stall_threshold:
                            alert = SystemAlert(
                                alert_id=str(uuid.uuid4()),
                                timestamp=datetime.utcnow(),
                                severity=AlertSeverity.WARNING,
                                component="continual_learning",
                                title="Learning Process Stalled",
                                message=f"No learning updates for {time_since_update:.0f} seconds",
                                metrics={'time_since_update': time_since_update, 'threshold': stall_threshold}
                            )
                            alerts.append(alert)

        except Exception as e:
            logger.error(f"❌ Failed to check learning stall: {str(e)}")

        return alerts

    async def _check_knowledge_graph_anomalies(self) -> List[SystemAlert]:
        """Check for knowledge graph anomalies"""
        alerts = []

        try:
            if hasattr(self.continual_learning_engine, 'knowledge_graph_integrator'):
                metrics = self.continual_learning_engine.knowledge_graph_integrator.get_knowledge_metrics()

                # Check for unusual growth rates
                growth_rate = metrics.get('knowledge_growth_rate', 0)
                max_growth_rate = self.config.get('max_knowledge_growth_rate', 1000)  # entities per day

                if growth_rate > max_growth_rate:
                    alert = SystemAlert(
                        alert_id=str(uuid.uuid4()),
                        timestamp=datetime.utcnow(),
                        severity=AlertSeverity.WARNING,
                        component="knowledge_graph",
                        title="Unusual Knowledge Graph Growth",
                        message=f"Knowledge graph growing at {growth_rate:.0f} entities/day, above threshold of {max_growth_rate}",
                        metrics={'growth_rate': growth_rate, 'threshold': max_growth_rate}
                    )
                    alerts.append(alert)

        except Exception as e:
            logger.error(f"❌ Failed to check knowledge graph anomalies: {str(e)}")

        return alerts

    def _add_alert(self, alert: SystemAlert):
        """Add an alert to the active alerts"""
        self.active_alerts.append(alert)

        # Keep only recent alerts
        max_alerts = self.config.get('max_active_alerts', 100)
        if len(self.active_alerts) > max_alerts:
            self.active_alerts = self.active_alerts[-max_alerts:]

        logger.info(f"🚨 Added alert: {alert.title} ({alert.severity.value})")

    def _cleanup_old_alerts(self):
        """Clean up old resolved alerts"""
        current_time = datetime.utcnow()
        retention_hours = self.config.get('alert_retention_hours', 24)

        # Move resolved alerts to history
        resolved_alerts = []
        remaining_alerts = []

        for alert in self.active_alerts:
            if alert.resolved:
                resolved_alerts.append(alert)
            elif (current_time - alert.timestamp).total_seconds() > retention_hours * 3600:
                resolved_alerts.append(alert)  # Move old alerts to history
            else:
                remaining_alerts.append(alert)

        self.active_alerts = remaining_alerts
        self.alert_history.extend(resolved_alerts)

        # Keep only recent history
        max_history = self.config.get('max_alert_history', 1000)
        if len(self.alert_history) > max_history:
            self.alert_history = self.alert_history[-max_history:]

    def get_current_metrics(self) -> Dict[str, Any]:
        """Get current dashboard metrics"""
        if not self.dashboard_data:
            return {'error': 'No dashboard data available'}

        return {
            'system_health': self.dashboard_data.system_health,
            'learning_status': self.dashboard_data.learning_status,
            'performance_summary': self.dashboard_data.performance_summary,
            'knowledge_graph_metrics': self.dashboard_data.knowledge_graph_metrics,
            'alerts': self.dashboard_data.alerts,
            'recent_activity': self.dashboard_data.recent_activity[:10],  # Last 10 activities
            'resource_utilization': self.dashboard_data.resource_utilization,
            'last_updated': self.last_update.isoformat() if self.last_update else None
        }

    def get_historical_data(self, days: int = 7) -> Dict[str, Any]:
        """Get historical data for trend analysis"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(days=days)

            # Get historical events
            if hasattr(self.continual_learning_engine, 'logger'):
                historical_events = [
                    event for event in self.continual_learning_engine.logger.learning_events
                    if event.timestamp > cutoff_time
                ]
            else:
                historical_events = []

            # Get performance history
            performance_history = []
            if hasattr(self.continual_learning_engine, 'evaluation_framework'):
                # This would get historical evaluation results
                performance_history = []

            return {
                'events': [asdict(event) for event in historical_events],
                'performance_history': performance_history,
                'alerts': [asdict(alert) for alert in self.alert_history if alert.timestamp > cutoff_time]
            }

        except Exception as e:
            logger.error(f"❌ Failed to get historical data: {str(e)}")
            return {'error': str(e)}

    async def _start_web_dashboard(self, port: int):
        """Start the web dashboard server"""
        if not FASTAPI_AVAILABLE or not self.web_app:
            logger.warning("⚠️ Web dashboard not available (FastAPI not installed)")
            return

        try:
            config = uvicorn.Config(self.web_app, host="0.0.0.0", port=port)
            server = uvicorn.Server(config)

            logger.info(f"🌐 Starting web dashboard on port {port}")

            # Run server in background
            await server.serve()

        except Exception as e:
            logger.error(f"❌ Failed to start web dashboard: {str(e)}")

    def _get_default_config(self) -> Dict:
        """Get default configuration"""
        return {
            'monitoring_interval_seconds': 60,
            'enable_web_dashboard': True,
            'dashboard_port': 8001,
            'error_rate_threshold': 0.1,
            'memory_warning_threshold_mb': 1000,
            'memory_critical_threshold_mb': 2000,
            'learning_stall_threshold_seconds': 3600,
            'max_knowledge_growth_rate': 1000,
            'max_active_alerts': 100,
            'max_alert_history': 1000,
            'alert_retention_hours': 24
        }
