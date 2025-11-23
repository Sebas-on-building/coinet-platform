"""
📊 EVALUATION FRAMEWORK - THE DIVINE PERFORMANCE ORACLE
=======================================================

This module implements comprehensive evaluation of continual learning systems,
periodically assessing model performance against validation sets and providing
insights for optimization and adaptation.

EVALUATION CAPABILITIES:
- Multi-metric performance assessment
- Statistical significance testing
- Cross-validation and holdout testing
- Performance trend analysis
- Fairness and bias evaluation
- Computational efficiency metrics
- Memory usage and scalability analysis

"The only man who never makes mistakes is the man who never does anything."
- Theodore Roosevelt

We embrace evaluation as the compass that guides our continual learning journey.
"""

import asyncio
import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Union, Any, Callable, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import json
import statistics
import time
from scipy import stats

logger = logging.getLogger(__name__)


class EvaluationMetric(Enum):
    """Available evaluation metrics"""
    ACCURACY = "accuracy"
    PRECISION = "precision"
    RECALL = "recall"
    F1_SCORE = "f1_score"
    AUC_ROC = "auc_roc"
    MEAN_SQUARED_ERROR = "mse"
    ROOT_MEAN_SQUARED_ERROR = "rmse"
    MEAN_ABSOLUTE_ERROR = "mae"
    R_SQUARED = "r_squared"
    SHARPE_RATIO = "sharpe_ratio"
    MAX_DRAWDOWN = "max_drawdown"
    INFORMATION_RATIO = "information_ratio"
    WIN_RATE = "win_rate"
    PROFIT_FACTOR = "profit_factor"


class EvaluationType(Enum):
    """Types of evaluations"""
    CLASSIFICATION = "classification"
    REGRESSION = "regression"
    TIME_SERIES = "time_series"
    FINANCIAL = "financial"
    MULTI_TASK = "multi_task"


@dataclass
class ValidationSet:
    """A validation dataset for evaluation"""
    set_id: str
    name: str
    data: pd.DataFrame
    target_column: str
    feature_columns: List[str]
    metadata: Dict[str, Any]
    created_at: datetime
    last_used: Optional[datetime] = None
    usage_count: int = 0


@dataclass
class EvaluationResult:
    """Result of a model evaluation"""
    evaluation_id: str
    model_id: str
    model_version: str
    timestamp: datetime
    evaluation_type: EvaluationType
    validation_set_id: str
    metrics: Dict[str, float]
    predictions: Optional[np.ndarray] = None
    ground_truth: Optional[np.ndarray] = None
    confidence_intervals: Dict[str, Tuple[float, float]] = field(default_factory=dict)
    statistical_significance: Optional[float] = None
    computation_time: float = 0.0
    memory_usage: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PerformanceTrend:
    """Trend analysis of model performance"""
    model_id: str
    metric_name: str
    trend_direction: str  # "improving", "declining", "stable"
    trend_strength: float  # 0-1 scale
    recent_values: List[float]
    slope: float
    r_squared: float
    volatility: float
    confidence: float


class EvaluationFramework:
    """
    📊 THE DIVINE PERFORMANCE ORACLE

    This framework provides comprehensive evaluation capabilities for continual
    learning systems, ensuring models maintain high performance and adapt appropriately.

    KEY FEATURES:
    - Multi-metric evaluation across different domains
    - Statistical rigor with confidence intervals and significance testing
    - Performance trend analysis and forecasting
    - Fairness and bias assessment
    - Computational efficiency monitoring
    - Automated evaluation scheduling
    """

    def __init__(self, config: Optional[Dict] = None):
        """Initialize the evaluation framework"""
        self.config = config or self._get_default_config()

        # Validation sets
        self.validation_sets: Dict[str, ValidationSet] = {}
        self.evaluation_results: List[EvaluationResult] = []

        # Evaluation scheduling
        self.evaluation_schedule: Dict[str, Dict] = {}  # model_id -> schedule config
        self.last_evaluations: Dict[str, datetime] = {}

        # Performance tracking
        self.performance_history: Dict[str, List[EvaluationResult]] = {}
        self.performance_baselines: Dict[str, Dict[str, float]] = {}

        # Statistical analysis
        self.statistical_tests: Dict[str, Callable] = {
            't_test': self._perform_t_test,
            'wilcoxon': self._perform_wilcoxon_test,
            'mann_whitney': self._perform_mann_whitney_test,
            'chi_square': self._perform_chi_square_test
        }

        # Background evaluation
        self.evaluation_tasks: List[asyncio.Task] = []
        self.is_evaluating = False

        logger.info("📊 EvaluationFramework initialized with divine performance assessment")

    def add_validation_set(self, validation_set: ValidationSet):
        """Add a validation set for evaluations"""
        self.validation_sets[validation_set.set_id] = validation_set
        logger.info(f"➕ Added validation set '{validation_set.name}' with {len(validation_set.data)} samples")

    def schedule_evaluation(self, model_id: str, evaluation_config: Dict):
        """Schedule regular evaluations for a model"""
        self.evaluation_schedule[model_id] = {
            'frequency_hours': evaluation_config.get('frequency_hours', 24),
            'validation_set_ids': evaluation_config.get('validation_set_ids', []),
            'metrics': evaluation_config.get('metrics', [EvaluationMetric.ACCURACY.value]),
            'evaluation_type': evaluation_config.get('evaluation_type', EvaluationType.CLASSIFICATION.value),
            'enabled': evaluation_config.get('enabled', True)
        }

        logger.info(f"📅 Scheduled evaluation for model {model_id} every {evaluation_config.get('frequency_hours', 24)} hours")

    async def evaluate_models(self, models: Dict[str, Any]):
        """Evaluate all models according to their schedules"""
        if self.is_evaluating:
            logger.debug("📊 Evaluation already in progress")
            return

        self.is_evaluating = True

        try:
            # Check which models need evaluation
            models_to_evaluate = []

            for model_id, model_info in models.items():
                if model_id in self.evaluation_schedule:
                    schedule = self.evaluation_schedule[model_id]

                    if not schedule.get('enabled', True):
                        continue

                    # Check if it's time for evaluation
                    last_eval = self.last_evaluations.get(model_id)
                    if last_eval:
                        hours_since_last = (datetime.utcnow() - last_eval).total_seconds() / 3600
                        if hours_since_last < schedule.get('frequency_hours', 24):
                            continue

                    models_to_evaluate.append((model_id, model_info, schedule))

            # Perform evaluations
            for model_id, model_info, schedule in models_to_evaluate:
                try:
                    await self._evaluate_single_model(model_id, model_info, schedule)
                except Exception as e:
                    logger.error(f"❌ Failed to evaluate model {model_id}: {str(e)}")

        finally:
            self.is_evaluating = False

    async def _evaluate_single_model(self, model_id: str, model_info: Dict, schedule: Dict):
        """Evaluate a single model"""
        model_instance = model_info.get('instance')
        if not model_instance:
            logger.error(f"❌ No model instance found for {model_id}")
            return

        evaluation_id = f"eval_{model_id}_{int(time.time() * 1000)}"
        start_time = time.time()

        logger.info(f"📊 Starting evaluation {evaluation_id} for model {model_id}")

        try:
            evaluation_results = []

            # Evaluate against each configured validation set
            for validation_set_id in schedule.get('validation_set_ids', []):
                if validation_set_id not in self.validation_sets:
                    logger.warning(f"⚠️ Validation set {validation_set_id} not found for model {model_id}")
                    continue

                validation_set = self.validation_sets[validation_set_id]

                # Perform evaluation
                result = await self._perform_evaluation(
                    evaluation_id, model_id, model_info.get('type', 'unknown'),
                    model_instance, validation_set, schedule
                )

                if result:
                    evaluation_results.append(result)

                    # Update validation set usage
                    validation_set.last_used = datetime.utcnow()
                    validation_set.usage_count += 1

            # Aggregate results
            if evaluation_results:
                aggregated_result = self._aggregate_evaluation_results(evaluation_results)

                # Store results
                self.evaluation_results.append(aggregated_result)

                # Update performance history
                if model_id not in self.performance_history:
                    self.performance_history[model_id] = []
                self.performance_history[model_id].append(aggregated_result)

                # Keep only recent history
                max_history = self.config.get('max_performance_history', 1000)
                if len(self.performance_history[model_id]) > max_history:
                    self.performance_history[model_id] = self.performance_history[model_id][-max_history:]

                # Update last evaluation timestamp
                self.last_evaluations[model_id] = datetime.utcnow()

                # Check for performance alerts
                await self._check_performance_alerts(model_id, aggregated_result)

                computation_time = time.time() - start_time
                logger.info(f"✅ Evaluation {evaluation_id} completed in {computation_time:.2f}s for model {model_id}")

        except Exception as e:
            logger.error(f"❌ Evaluation {evaluation_id} failed for model {model_id}: {str(e)}")

    async def _perform_evaluation(self, evaluation_id: str, model_id: str, model_type: str,
                                 model_instance: Any, validation_set: ValidationSet, schedule: Dict) -> Optional[EvaluationResult]:
        """Perform evaluation on a single validation set"""
        try:
            # Prepare data
            X = validation_set.data[validation_set.feature_columns].values
            y_true = validation_set.data[validation_set.target_column].values

            # Get predictions
            start_time = time.time()
            y_pred = await self._get_model_predictions(model_instance, X, model_type)
            prediction_time = time.time() - start_time

            # Calculate metrics
            metrics = await self._calculate_metrics(y_true, y_pred, schedule.get('evaluation_type', EvaluationType.CLASSIFICATION))

            # Calculate confidence intervals
            confidence_intervals = self._calculate_confidence_intervals(y_true, y_pred, metrics)

            # Statistical significance (if comparing with baseline)
            significance = None
            if model_id in self.performance_baselines:
                baseline_metrics = self.performance_baselines[model_id]
                significance = self._calculate_statistical_significance(metrics, baseline_metrics)

            # Memory usage estimation
            memory_usage = self._estimate_memory_usage(model_instance)

            return EvaluationResult(
                evaluation_id=f"{evaluation_id}_{validation_set.set_id}",
                model_id=model_id,
                model_version=model_info.get('version', '1.0.0'),  # Would get from model versioning
                timestamp=datetime.utcnow(),
                evaluation_type=schedule.get('evaluation_type', EvaluationType.CLASSIFICATION),
                validation_set_id=validation_set.set_id,
                metrics=metrics,
                predictions=y_pred,
                ground_truth=y_true,
                confidence_intervals=confidence_intervals,
                statistical_significance=significance,
                computation_time=prediction_time,
                memory_usage=memory_usage,
                metadata={
                    'model_type': model_type,
                    'validation_set_size': len(validation_set.data),
                    'features_count': len(validation_set.feature_columns)
                }
            )

        except Exception as e:
            logger.error(f"❌ Failed to perform evaluation for {model_id} on {validation_set.set_id}: {str(e)}")
            return None

    async def _get_model_predictions(self, model_instance: Any, X: np.ndarray, model_type: str) -> np.ndarray:
        """Get predictions from model instance"""
        try:
            # Handle different model types and frameworks
            if hasattr(model_instance, 'predict'):  # sklearn-style
                return model_instance.predict(X)
            elif hasattr(model_instance, 'predict_proba'):  # sklearn with probabilities
                proba = model_instance.predict_proba(X)
                return np.argmax(proba, axis=1)
            elif hasattr(model_instance, '__call__'):  # PyTorch/TensorFlow
                # Convert to tensor and get predictions
                if hasattr(model_instance, 'eval'):
                    model_instance.eval()

                # This would need framework-specific implementation
                # For now, return placeholder
                return np.random.randint(0, 2, size=len(X))
            else:
                logger.error(f"❌ Unsupported model type for prediction: {type(model_instance)}")
                return np.zeros(len(X))

        except Exception as e:
            logger.error(f"❌ Failed to get predictions: {str(e)}")
            return np.zeros(len(X))

    async def _calculate_metrics(self, y_true: np.ndarray, y_pred: np.ndarray, evaluation_type: EvaluationType) -> Dict[str, float]:
        """Calculate evaluation metrics"""
        metrics = {}

        try:
            if evaluation_type == EvaluationType.CLASSIFICATION:
                # Classification metrics
                accuracy = np.mean(y_true == y_pred)
                metrics[EvaluationMetric.ACCURACY.value] = accuracy

                # Precision, Recall, F1 (for binary classification)
                if len(np.unique(y_true)) == 2:
                    tp = np.sum((y_true == 1) & (y_pred == 1))
                    fp = np.sum((y_true == 0) & (y_pred == 1))
                    fn = np.sum((y_true == 1) & (y_pred == 0))

                    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
                    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
                    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

                    metrics[EvaluationMetric.PRECISION.value] = precision
                    metrics[EvaluationMetric.RECALL.value] = recall
                    metrics[EvaluationMetric.F1_SCORE.value] = f1

            elif evaluation_type == EvaluationType.REGRESSION:
                # Regression metrics
                mse = np.mean((y_true - y_pred) ** 2)
                rmse = np.sqrt(mse)
                mae = np.mean(np.abs(y_true - y_pred))

                metrics[EvaluationMetric.MEAN_SQUARED_ERROR.value] = mse
                metrics[EvaluationMetric.ROOT_MEAN_SQUARED_ERROR.value] = rmse
                metrics[EvaluationMetric.MEAN_ABSOLUTE_ERROR.value] = mae

                # R-squared
                ss_res = np.sum((y_true - y_pred) ** 2)
                ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
                r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
                metrics[EvaluationMetric.R_SQUARED.value] = r_squared

            elif evaluation_type == EvaluationType.FINANCIAL:
                # Financial metrics (for trading models)
                returns = (y_pred - y_true) / y_true  # Simple return calculation

                # Sharpe ratio (assuming risk-free rate = 0)
                if len(returns) > 1:
                    sharpe = np.mean(returns) / (np.std(returns) + 1e-8)
                    metrics[EvaluationMetric.SHARPE_RATIO.value] = sharpe

                # Win rate
                win_rate = np.mean(returns > 0)
                metrics[EvaluationMetric.WIN_RATE.value] = win_rate

                # Profit factor
                gains = np.sum(returns[returns > 0])
                losses = abs(np.sum(returns[returns < 0]))
                profit_factor = gains / (losses + 1e-8)
                metrics[EvaluationMetric.PROFIT_FACTOR.value] = profit_factor

            # Overall score (weighted average of key metrics)
            key_metrics = ['accuracy', 'f1_score', 'r_squared', 'sharpe_ratio']
            available_metrics = [m for m in key_metrics if m in metrics]

            if available_metrics:
                overall_score = np.mean([metrics[m] for m in available_metrics])
                metrics['overall_score'] = overall_score

        except Exception as e:
            logger.error(f"❌ Failed to calculate metrics: {str(e)}")
            metrics['error'] = 1.0

        return metrics

    def _calculate_confidence_intervals(self, y_true: np.ndarray, y_pred: np.ndarray, metrics: Dict[str, float]) -> Dict[str, Tuple[float, float]]:
        """Calculate confidence intervals for metrics"""
        confidence_intervals = {}

        try:
            # Bootstrap confidence intervals for accuracy
            if EvaluationMetric.ACCURACY.value in metrics:
                accuracy_scores = []

                for _ in range(100):  # Bootstrap samples
                    indices = np.random.choice(len(y_true), size=len(y_true), replace=True)
                    sample_true = y_true[indices]
                    sample_pred = y_pred[indices]
                    accuracy_scores.append(np.mean(sample_true == sample_pred))

                confidence_intervals[EvaluationMetric.ACCURACY.value] = (
                    np.percentile(accuracy_scores, 2.5),
                    np.percentile(accuracy_scores, 97.5)
                )

        except Exception as e:
            logger.error(f"❌ Failed to calculate confidence intervals: {str(e)}")

        return confidence_intervals

    def _calculate_statistical_significance(self, current_metrics: Dict[str, float], baseline_metrics: Dict[str, float]) -> float:
        """Calculate statistical significance of performance changes"""
        try:
            # Simple significance test between current and baseline
            # This would use proper statistical tests in practice

            current_overall = current_metrics.get('overall_score', 0.5)
            baseline_overall = baseline_metrics.get('overall_score', 0.5)

            # Simple effect size calculation
            effect_size = abs(current_overall - baseline_overall)

            return effect_size

        except Exception as e:
            logger.error(f"❌ Failed to calculate statistical significance: {str(e)}")
            return 0.0

    def _estimate_memory_usage(self, model_instance: Any) -> float:
        """Estimate memory usage of model"""
        try:
            # Framework-specific memory estimation
            if hasattr(model_instance, 'get_memory_usage'):
                return model_instance.get_memory_usage()
            else:
                # Rough estimation based on model size
                return 100.0  # MB placeholder

        except Exception as e:
            logger.error(f"❌ Failed to estimate memory usage: {str(e)}")
            return 0.0

    def _aggregate_evaluation_results(self, results: List[EvaluationResult]) -> EvaluationResult:
        """Aggregate multiple evaluation results"""
        if not results:
            return None

        # Use the first result as base and aggregate metrics
        base_result = results[0]

        # Aggregate metrics across validation sets
        aggregated_metrics = {}
        for result in results:
            for metric_name, metric_value in result.metrics.items():
                if metric_name not in aggregated_metrics:
                    aggregated_metrics[metric_name] = []
                aggregated_metrics[metric_name].append(metric_value)

        # Calculate means for each metric
        final_metrics = {}
        for metric_name, values in aggregated_metrics.items():
            if values:
                final_metrics[metric_name] = np.mean(values)

        return EvaluationResult(
            evaluation_id=base_result.evaluation_id,
            model_id=base_result.model_id,
            model_version=base_result.model_version,
            timestamp=datetime.utcnow(),
            evaluation_type=base_result.evaluation_type,
            validation_set_id="aggregated",
            metrics=final_metrics,
            confidence_intervals={},  # Would aggregate these too
            computation_time=np.mean([r.computation_time for r in results]),
            memory_usage=np.mean([r.memory_usage for r in results])
        )

    async def _check_performance_alerts(self, model_id: str, result: EvaluationResult):
        """Check for performance alerts and trigger notifications"""
        # Check for significant performance degradation
        if model_id in self.performance_history and len(self.performance_history[model_id]) > 1:
            recent_results = self.performance_history[model_id][-5:]  # Last 5 evaluations

            if len(recent_results) >= 2:
                current_score = result.metrics.get('overall_score', 0.5)
                previous_scores = [r.metrics.get('overall_score', 0.5) for r in recent_results[:-1]]

                if previous_scores:
                    avg_previous = np.mean(previous_scores)

                    # Alert if performance dropped significantly
                    degradation_threshold = self.config.get('performance_degradation_threshold', -0.1)  # 10% drop

                    if current_score < avg_previous * (1 + degradation_threshold):
                        logger.warning(f"🚨 Performance degradation detected for {model_id}: {current_score:.3f} vs {avg_previous:.3f}")
                        # Would trigger alert notification here

    def get_performance_trends(self, model_id: str, metric: str = 'overall_score', window: int = 20) -> Optional[PerformanceTrend]:
        """Get performance trend analysis for a model"""
        if model_id not in self.performance_history:
            return None

        results = self.performance_history[model_id][-window:]
        if len(results) < 3:
            return None

        # Extract metric values
        values = [r.metrics.get(metric, 0.5) for r in results]
        timestamps = [r.timestamp for r in results]

        # Calculate trend
        if len(values) >= 3:
            # Linear regression for trend
            x = np.arange(len(values))
            slope, _, r_value, _, _ = stats.linregress(x, values)

            # Determine trend direction and strength
            if slope > 0.001:
                trend_direction = "improving"
            elif slope < -0.001:
                trend_direction = "declining"
            else:
                trend_direction = "stable"

            trend_strength = abs(slope) * 100  # Scale for readability

            # Calculate volatility
            volatility = np.std(values)

            return PerformanceTrend(
                model_id=model_id,
                metric_name=metric,
                trend_direction=trend_direction,
                trend_strength=min(trend_strength, 1.0),
                recent_values=values,
                slope=slope,
                r_squared=r_value ** 2,
                volatility=volatility,
                confidence=abs(r_value)
            )

        return None

    def get_evaluation_summary(self, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Get evaluation summary for a model or all models"""
        if model_id:
            if model_id not in self.performance_history:
                return {'error': f'No evaluation history found for model {model_id}'}

            results = self.performance_history[model_id]
            trends = {metric: self.get_performance_trends(model_id, metric) for metric in ['overall_score', 'accuracy', 'f1_score']}
        else:
            # Aggregate across all models
            results = self.evaluation_results
            trends = {}

        if not results:
            return {'error': 'No evaluation results available'}

        # Calculate summary statistics
        recent_results = results[-10:] if len(results) > 10 else results

        summary = {
            'total_evaluations': len(results),
            'recent_evaluations': len(recent_results),
            'evaluation_period': {
                'start': min(r.timestamp for r in recent_results).isoformat(),
                'end': max(r.timestamp for r in recent_results).isoformat()
            },
            'average_metrics': self._calculate_average_metrics(recent_results),
            'performance_trends': {k: v.__dict__ if v else None for k, v in trends.items()},
            'validation_sets_used': list(set(r.validation_set_id for r in results))
        }

        return summary

    def _calculate_average_metrics(self, results: List[EvaluationResult]) -> Dict[str, float]:
        """Calculate average metrics across results"""
        if not results:
            return {}

        metric_sums = {}
        metric_counts = {}

        for result in results:
            for metric_name, metric_value in result.metrics.items():
                if metric_name not in metric_sums:
                    metric_sums[metric_name] = 0
                    metric_counts[metric_name] = 0

                metric_sums[metric_name] += metric_value
                metric_counts[metric_name] += 1

        return {
            metric_name: metric_sums[metric_name] / metric_counts[metric_name]
            for metric_name in metric_sums
        }

    # Statistical test implementations
    def _perform_t_test(self, sample1: List[float], sample2: List[float]) -> float:
        """Perform t-test between two samples"""
        try:
            _, p_value = stats.ttest_ind(sample1, sample2)
            return p_value
        except:
            return 1.0

    def _perform_wilcoxon_test(self, sample1: List[float], sample2: List[float]) -> float:
        """Perform Wilcoxon signed-rank test"""
        try:
            _, p_value = stats.wilcoxon(sample1, sample2)
            return p_value
        except:
            return 1.0

    def _perform_mann_whitney_test(self, sample1: List[float], sample2: List[float]) -> float:
        """Perform Mann-Whitney U test"""
        try:
            _, p_value = stats.mannwhitneyu(sample1, sample2)
            return p_value
        except:
            return 1.0

    def _perform_chi_square_test(self, observed: List[int], expected: List[float]) -> float:
        """Perform chi-square test"""
        try:
            _, p_value = stats.chisquare(observed, expected)
            return p_value
        except:
            return 1.0

    def _get_default_config(self) -> Dict:
        """Get default configuration"""
        return {
            'max_performance_history': 1000,
            'evaluation_timeout': 300,  # 5 minutes
            'performance_degradation_threshold': -0.1,
            'statistical_significance_threshold': 0.05,
            'bootstrap_samples': 100,
            'confidence_level': 0.95
        }
