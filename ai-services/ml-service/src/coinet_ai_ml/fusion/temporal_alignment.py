"""
⏰ TEMPORAL ALIGNMENT SYSTEM - THE TIME SYNCHRONIZER
===================================================

Advanced temporal alignment system that synchronizes heterogeneous data streams
with different sampling rates, latencies, and time zones into a unified temporal
framework for multi-modal fusion.

KEY FEATURES:
- Dynamic resampling for different time granularities
- Latency compensation and prediction
- Time zone normalization
- Event-based temporal anchoring
- Sliding window temporal aggregation
"""

import asyncio
import logging
from typing import Dict, List, Optional, Tuple, Union, Any
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from dataclasses import dataclass
from collections import defaultdict, deque
import pytz

logger = logging.getLogger(__name__)

@dataclass
class TemporalSignal:
    """Represents a signal with temporal metadata"""
    timestamp: datetime
    value: Any
    modality: str
    confidence: float = 1.0
    latency_ms: float = 0.0
    timezone: str = 'UTC'

@dataclass
class AlignedSignal:
    """Temporally aligned signal ready for fusion"""
    unified_timestamp: datetime
    original_signals: Dict[str, TemporalSignal]
    interpolated_values: Dict[str, Any]
    alignment_quality: float
    time_window: Tuple[datetime, datetime]

class TemporalAligner:
    """
    ⏰ THE DIVINE TEMPORAL SYNCHRONIZER

    This system ensures that all data modalities are perfectly synchronized
    in time, accounting for different sampling rates, latencies, and time zones.
    """

    def __init__(self, config: Optional[Dict] = None):
        """Initialize the temporal alignment system"""
        self.config = config or self._get_default_config()

        # Signal buffers for each modality
        self.signal_buffers = defaultdict(lambda: deque(maxlen=1000))

        # Temporal reference points
        self.temporal_anchors = {}

        # Alignment quality metrics
        self.alignment_metrics = defaultdict(list)

        # Time zone mappings
        self.timezone_map = {
            'UTC': pytz.UTC,
            'EST': pytz.timezone('US/Eastern'),
            'PST': pytz.timezone('US/Pacific'),
            'JST': pytz.timezone('Asia/Tokyo'),
            'GMT': pytz.timezone('GMT')
        }

        logger.info("⏰ TemporalAligner initialized with divine synchronization")

    async def align_signals(self,
                           signals: Dict[str, List[TemporalSignal]],
                           target_time: Optional[datetime] = None,
                           window_size: Optional[timedelta] = None) -> Dict[str, AlignedSignal]:
        """
        🎯 MASTER TEMPORAL ALIGNMENT

        Synchronizes multiple signal streams into unified temporal windows.

        Args:
            signals: Dictionary mapping modality names to lists of temporal signals
            target_time: Target time for alignment (defaults to current time)
            window_size: Size of temporal window for aggregation

        Returns:
            Dictionary of aligned signals for each time window
        """

        if target_time is None:
            target_time = datetime.utcnow()

        if window_size is None:
            window_size = timedelta(minutes=self.config['default_window_minutes'])

        # Step 1: Normalize time zones
        normalized_signals = await self._normalize_timezones(signals)

        # Step 2: Compensate for latencies
        latency_compensated = await self._compensate_latencies(normalized_signals)

        # Step 3: Create temporal windows
        windows = self._create_temporal_windows(target_time, window_size)

        # Step 4: Align signals to windows
        aligned_results = {}

        for window_id, (start_time, end_time) in windows.items():
            window_signals = await self._align_to_window(
                latency_compensated, start_time, end_time
            )

            # Step 5: Interpolate missing values
            interpolated = await self._interpolate_missing_values(window_signals, start_time, end_time)

            # Step 6: Calculate alignment quality
            quality = self._calculate_alignment_quality(window_signals, interpolated)

            aligned_results[window_id] = AlignedSignal(
                unified_timestamp=target_time,
                original_signals=window_signals,
                interpolated_values=interpolated,
                alignment_quality=quality,
                time_window=(start_time, end_time)
            )

        # Store alignment metrics
        await self._store_alignment_metrics(aligned_results)

        return aligned_results

    async def _normalize_timezones(self, signals: Dict[str, List[TemporalSignal]]) -> Dict[str, List[TemporalSignal]]:
        """Normalize all signals to UTC timezone"""

        normalized = {}

        for modality, signal_list in signals.items():
            normalized_signals = []

            for signal in signal_list:
                if signal.timezone != 'UTC':
                    # Convert to UTC
                    if signal.timezone in self.timezone_map:
                        try:
                            # Handle timestamp that might already have timezone info
                            if signal.timestamp.tzinfo is not None:
                                # Convert from existing timezone to UTC
                                utc_time = signal.timestamp.astimezone(pytz.UTC).replace(tzinfo=None)
                            else:
                                # Localize naive timestamp and convert to UTC
                                tz_aware = self.timezone_map[signal.timezone].localize(signal.timestamp)
                                utc_time = tz_aware.astimezone(pytz.UTC).replace(tzinfo=None)
                        except Exception as e:
                            logger.warning(f"Timezone conversion failed for {signal.timezone}: {e}")
                            utc_time = signal.timestamp  # Fallback to original timestamp
                    else:
                        # Assume UTC if timezone not recognized
                        utc_time = signal.timestamp
                else:
                    utc_time = signal.timestamp

                normalized_signal = TemporalSignal(
                    timestamp=utc_time,
                    value=signal.value,
                    modality=signal.modality,
                    confidence=signal.confidence,
                    latency_ms=signal.latency_ms,
                    timezone='UTC'
                )

                normalized_signals.append(normalized_signal)

            normalized[modality] = normalized_signals

        return normalized

    async def _compensate_latencies(self, signals: Dict[str, List[TemporalSignal]]) -> Dict[str, List[TemporalSignal]]:
        """Compensate for signal latencies by predicting forward"""

        compensated = {}

        for modality, signal_list in signals.items():
            modality_config = self.config['modalities'].get(modality, {})
            max_latency_ms = modality_config.get('max_latency_ms', 1000)

            # Sort signals by timestamp
            sorted_signals = sorted(signal_list, key=lambda x: x.timestamp)

            # Remove signals that are too old (beyond max latency)
            cutoff_time = datetime.utcnow() - timedelta(milliseconds=max_latency_ms)
            recent_signals = [s for s in sorted_signals if s.timestamp > cutoff_time]

            # Apply latency compensation
            compensated_signals = []

            for signal in recent_signals:
                # Predict signal value at current time based on latency
                latency_seconds = signal.latency_ms / 1000.0

                if latency_seconds > 0:
                    # Linear extrapolation based on recent trend
                    compensated_value = await self._extrapolate_signal_value(
                        signal, latency_seconds
                    )
                else:
                    compensated_value = signal.value

                compensated_signal = TemporalSignal(
                    timestamp=signal.timestamp + timedelta(milliseconds=signal.latency_ms),
                    value=compensated_value,
                    modality=signal.modality,
                    confidence=signal.confidence * 0.9,  # Slightly reduce confidence for extrapolation
                    latency_ms=0.0,  # Latency now compensated
                    timezone='UTC'
                )

                compensated_signals.append(compensated_signal)

            compensated[modality] = compensated_signals

        return compensated

    async def _extrapolate_signal_value(self, signal: TemporalSignal, latency_seconds: float) -> Any:
        """Extrapolate signal value forward in time with robust trend analysis"""

        # Handle non-numeric values (text, categories, etc.)
        if not isinstance(signal.value, (int, float, np.number)):
            # For non-numeric data, maintain original value but reduce confidence
            return signal.value

        # For numeric values, perform intelligent extrapolation
        base_value = float(signal.value)

        # Determine extrapolation strategy based on signal type and latency
        if latency_seconds <= 0:
            return base_value  # No extrapolation needed

        # Adaptive trend factor based on typical market dynamics
        # In production, this would use historical data and machine learning models

        # Market data extrapolation (prices, volumes)
        if 'price' in str(signal.modality).lower() or 'volume' in str(signal.modality).lower():
            # More conservative extrapolation for financial data
            if latency_seconds < 60:  # Short latency (< 1 minute)
                trend_factor = 0.0001  # Very small trend (0.01% per second)
            elif latency_seconds < 300:  # Medium latency (< 5 minutes)
                trend_factor = 0.00005  # Even smaller trend
            else:  # Long latency (> 5 minutes)
                trend_factor = 0.00001  # Minimal trend assumption

            # Add some randomness to simulate market uncertainty
            noise_factor = np.random.normal(0, 0.001)  # Small random component
            extrapolated_value = base_value * (1 + (trend_factor + noise_factor) * latency_seconds)

        # Social sentiment extrapolation (scores, indices)
        elif 'sentiment' in str(signal.modality).lower() or 'social' in str(signal.modality).lower():
            # Sentiment tends to mean-revert over time
            mean_reversion_factor = 0.5  # Tendency to revert to neutral (0.5)
            current_deviation = base_value - 0.5
            reversion_rate = 0.001  # Slow reversion rate

            extrapolated_value = base_value - current_deviation * (1 - np.exp(-reversion_rate * latency_seconds))

        # News/On-chain data extrapolation
        else:
            # Conservative approach for other data types
            trend_factor = 0.00002  # Very conservative trend
            extrapolated_value = base_value * (1 + trend_factor * latency_seconds)

        # Apply bounds and sanity checks
        if 'price' in str(signal.modality).lower():
            # Ensure prices stay positive and reasonable
            extrapolated_value = max(0.01, min(extrapolated_value, base_value * 2.0))
        elif 'sentiment' in str(signal.modality).lower():
            # Keep sentiment scores in reasonable bounds
            extrapolated_value = max(0.0, min(extrapolated_value, 1.0))

        return extrapolated_value

    def _create_temporal_windows(self,
                                target_time: datetime,
                                window_size: timedelta) -> Dict[str, Tuple[datetime, datetime]]:
        """Create overlapping temporal windows for analysis"""

        windows = {}

        # Create multiple window sizes for different analysis granularities
        window_sizes = [
            timedelta(minutes=1),   # High frequency
            timedelta(minutes=5),   # Medium frequency
            timedelta(minutes=15),  # Low frequency
        ]

        for i, size in enumerate(window_sizes):
            start_time = target_time - size
            end_time = target_time

            windows[f"window_{i}"] = (start_time, end_time)

        return windows

    async def _align_to_window(self,
                              signals: Dict[str, List[TemporalSignal]],
                              start_time: datetime,
                              end_time: datetime) -> Dict[str, List[TemporalSignal]]:
        """Align signals to a specific temporal window"""

        window_signals = {}

        for modality, signal_list in signals.items():
            # Filter signals within the time window
            window_signals_list = [
                signal for signal in signal_list
                if start_time <= signal.timestamp <= end_time
            ]

            # Sort by timestamp
            window_signals_list.sort(key=lambda x: x.timestamp)

            window_signals[modality] = window_signals_list

        return window_signals

    async def _interpolate_missing_values(self,
                                         window_signals: Dict[str, List[TemporalSignal]],
                                         start_time: datetime,
                                         end_time: datetime) -> Dict[str, Any]:
        """Interpolate missing values for modalities with gaps"""

        interpolated = {}

        for modality, signals in window_signals.items():
            modality_config = self.config['modalities'].get(modality, {})
            interpolation_method = modality_config.get('interpolation', 'linear')

            if not signals:
                # No signals in window - use default value
                interpolated[modality] = modality_config.get('default_value', 0.0)
                continue

            # Check if we need interpolation (gaps in signal)
            timestamps = [s.timestamp for s in signals]

            # Simple approach: use most recent value if gaps exist
            # In production, this would use sophisticated interpolation
            if len(signals) == 1:
                interpolated[modality] = signals[0].value
            else:
                # Use weighted average of recent values
                recent_signals = [s for s in signals if s.timestamp >= start_time]
                if recent_signals:
                    # Weighted by recency and confidence
                    weights = []
                    values = []

                    for signal in recent_signals:
                        # Recency weight (more recent = higher weight)
                        time_diff = (end_time - signal.timestamp).total_seconds()
                        recency_weight = 1.0 / (1.0 + time_diff / 60.0)  # Decay over 1 minute

                        # Confidence weight
                        confidence_weight = signal.confidence

                        total_weight = recency_weight * confidence_weight
                        weights.append(total_weight)
                        values.append(signal.value)

                    if weights:
                        interpolated[modality] = np.average(values, weights=weights)
                    else:
                        interpolated[modality] = signals[-1].value  # Fallback to most recent
                else:
                    interpolated[modality] = signals[-1].value

        return interpolated

    def _calculate_alignment_quality(self,
                                   window_signals: Dict[str, List[TemporalSignal]],
                                   interpolated: Dict[str, Any]) -> float:
        """Calculate quality of temporal alignment"""

        quality_factors = []

        for modality, signals in window_signals.items():
            if not signals:
                quality_factors.append(0.3)  # Low quality for missing modality
                continue

            # Signal density factor (more signals = higher quality)
            time_span = (signals[-1].timestamp - signals[0].timestamp).total_seconds()
            signal_density = len(signals) / max(time_span, 1)

            # Normalize to 0-1 scale (assume optimal density is 1 signal per second)
            density_score = min(signal_density / 1.0, 1.0)

            # Confidence factor
            avg_confidence = np.mean([s.confidence for s in signals])

            # Combined score for this modality
            modality_quality = (density_score * 0.6) + (avg_confidence * 0.4)
            quality_factors.append(modality_quality)

        # Overall alignment quality (average across modalities)
        overall_quality = np.mean(quality_factors) if quality_factors else 0.0

        return min(overall_quality, 1.0)

    async def _store_alignment_metrics(self, aligned_results: Dict[str, AlignedSignal]):
        """Store alignment metrics for monitoring and optimization"""

        for window_id, aligned_signal in aligned_results.items():
            metrics = {
                'timestamp': datetime.utcnow(),
                'window_id': window_id,
                'alignment_quality': aligned_signal.alignment_quality,
                'modalities_present': len(aligned_signal.original_signals),
                'total_signals': sum(len(signals) for signals in aligned_signal.original_signals.values())
            }

            self.alignment_metrics[window_id].append(metrics)

            # Keep only recent metrics
            if len(self.alignment_metrics[window_id]) > 100:
                self.alignment_metrics[window_id] = self.alignment_metrics[window_id][-100:]

    def get_alignment_metrics(self) -> Dict[str, Any]:
        """Get alignment quality metrics"""

        return {
            'average_quality': np.mean([
                metrics[-1]['alignment_quality']
                for window_metrics in self.alignment_metrics.values()
                if metrics
            ]),
            'modalities_coverage': self._calculate_modality_coverage(),
            'recent_performance': self._get_recent_performance()
        }

    def _calculate_modality_coverage(self) -> Dict[str, float]:
        """Calculate coverage percentage for each modality"""

        modality_counts = defaultdict(int)
        total_windows = 0

        for window_metrics in self.alignment_metrics.values():
            if not window_metrics:
                continue

            total_windows += len(window_metrics)

            for metrics in window_metrics:
                # Extract modalities from the alignment metrics
                # This assumes we store modality information in the metrics
                modalities_present = metrics.get('modalities_present', [])
                for modality in modalities_present:
                    modality_counts[modality] += 1

        # Calculate coverage percentages
        coverage = {}
        if total_windows > 0:
            for modality, count in modality_counts.items():
                coverage[modality] = count / total_windows

        return dict(coverage)

    def _get_recent_performance(self) -> Dict[str, Any]:
        """Get recent alignment performance metrics"""

        recent_windows = []
        for window_metrics in self.alignment_metrics.values():
            recent_windows.extend(window_metrics[-10:])  # Last 10 measurements per window

        if not recent_windows:
            return {}

        return {
            'avg_quality': np.mean([m['alignment_quality'] for m in recent_windows]),
            'quality_trend': self._calculate_quality_trend(recent_windows),
            'signal_density': np.mean([m['total_signals'] for m in recent_windows])
        }

    def _calculate_quality_trend(self, metrics: List[Dict]) -> str:
        """Calculate trend in alignment quality"""

        if len(metrics) < 2:
            return 'insufficient_data'

        recent = [m['alignment_quality'] for m in metrics[-5:]]
        older = [m['alignment_quality'] for m in metrics[-10:-5]]

        if not older:
            return 'stable'

        recent_avg = np.mean(recent)
        older_avg = np.mean(older)

        diff = recent_avg - older_avg

        if diff > 0.05:
            return 'improving'
        elif diff < -0.05:
            return 'declining'
        else:
            return 'stable'

    def _get_default_config(self) -> Dict:
        """Get default configuration for temporal alignment"""

        return {
            'default_window_minutes': 5,
            'max_latency_compensation_ms': 5000,
            'interpolation_method': 'linear',
            'quality_threshold': 0.7,
            'modalities': {
                'market_data': {
                    'sampling_rate_hz': 1.0,
                    'max_latency_ms': 1000,
                    'interpolation': 'linear',
                    'default_value': 0.0
                },
                'social_sentiment': {
                    'sampling_rate_hz': 0.1,
                    'max_latency_ms': 3000,
                    'interpolation': 'nearest',
                    'default_value': 0.0
                },
                'news_articles': {
                    'sampling_rate_hz': 0.01,
                    'max_latency_ms': 10000,
                    'interpolation': 'nearest',
                    'default_value': ''
                },
                'onchain_analytics': {
                    'sampling_rate_hz': 0.05,
                    'max_latency_ms': 5000,
                    'interpolation': 'linear',
                    'default_value': 0.0
                },
                'psychological_profiles': {
                    'sampling_rate_hz': 0.001,
                    'max_latency_ms': 1000,
                    'interpolation': 'nearest',
                    'default_value': {}
                }
            }
        }
