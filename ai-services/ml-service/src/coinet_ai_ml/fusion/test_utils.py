"""
🧪 TEST UTILITIES - COMPREHENSIVE TESTING FRAMEWORK
==================================================

Advanced testing utilities for the multi-modal fusion pipeline including:
- Mock data generators for realistic test scenarios
- Performance metrics collection and analysis
- Test result validation and benchmarking
- Automated test reporting and visualization

These utilities enable comprehensive testing without external dependencies
and provide detailed insights into system performance and reliability.
"""

import asyncio
import logging
import time
import psutil
import torch
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import json
import os
import gc
from contextlib import contextmanager

logger = logging.getLogger(__name__)

@dataclass
class TestMetrics:
    """Comprehensive test metrics collection"""
    test_name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    execution_time_ms: float = 0.0
    memory_usage_mb: float = 0.0
    cpu_usage_percent: float = 0.0
    success: bool = False
    error_message: Optional[str] = None
    additional_metrics: Dict[str, Any] = field(default_factory=dict)

@dataclass
class PerformanceBenchmark:
    """Performance benchmark results"""
    test_name: str
    execution_times: List[float]
    memory_usages: List[float]
    cpu_usages: List[float]
    throughput_per_second: float = 0.0
    mean_execution_time: float = 0.0
    std_execution_time: float = 0.0
    p95_execution_time: float = 0.0
    p99_execution_time: float = 0.0

class TestMetricsCollector:
    """
    🧪 TEST METRICS COLLECTOR - PERFORMANCE MONITORING

    Collects comprehensive performance metrics during testing including:
    - Execution time tracking
    - Memory usage monitoring
    - CPU utilization measurement
    - Custom metric collection
    - Statistical analysis of results
    """

    def __init__(self):
        self.metrics: Dict[str, TestMetrics] = {}
        self.process = psutil.Process()

    @contextmanager
    def measure_performance(self, test_name: str, collect_memory: bool = True, collect_cpu: bool = True):
        """Context manager for measuring test performance"""

        # Initialize metrics
        metrics = TestMetrics(
            test_name=test_name,
            start_time=datetime.utcnow()
        )

        # Record initial memory and CPU state
        if collect_memory:
            metrics.memory_usage_mb = self._get_memory_usage()

        if collect_cpu:
            metrics.cpu_usage_percent = self._get_cpu_usage()

        try:
            yield metrics

            # Mark as successful
            metrics.success = True

        except Exception as e:
            metrics.success = False
            metrics.error_message = str(e)
            logger.error(f"❌ Test {test_name} failed: {str(e)}")

        finally:
            # Record final metrics
            metrics.end_time = datetime.utcnow()
            metrics.execution_time_ms = (metrics.end_time - metrics.start_time).total_seconds() * 1000

            if collect_memory:
                metrics.memory_usage_mb = max(metrics.memory_usage_mb, self._get_memory_usage())

            if collect_cpu:
                metrics.cpu_usage_percent = max(metrics.cpu_usage_percent, self._get_cpu_usage())

            # Store metrics
            self.metrics[test_name] = metrics

            # Log performance summary
            self._log_performance_summary(metrics)

    def _get_memory_usage(self) -> float:
        """Get current memory usage in MB"""
        try:
            return self.process.memory_info().rss / 1024 / 1024
        except:
            return 0.0

    def _get_cpu_usage(self) -> float:
        """Get current CPU usage percentage"""
        try:
            return self.process.cpu_percent()
        except:
            return 0.0

    def _log_performance_summary(self, metrics: TestMetrics):
        """Log performance summary for a test"""

        status = "✅" if metrics.success else "❌"
        logger.info(f"{status} {metrics.test_name}: {metrics.execution_time_ms:.2f}ms, "
                   f"Memory: {metrics.memory_usage_mb:.1f}MB, "
                   f"CPU: {metrics.cpu_usage_percent:.1f}%")

        if metrics.error_message:
            logger.error(f"   Error: {metrics.error_message}")

    def get_benchmark_results(self, test_name: str) -> Optional[PerformanceBenchmark]:
        """Get performance benchmark for a specific test"""

        if test_name not in self.metrics:
            return None

        metrics_list = [self.metrics[test_name]]

        return PerformanceBenchmark(
            test_name=test_name,
            execution_times=[m.execution_time_ms for m in metrics_list],
            memory_usages=[m.memory_usage_mb for m in metrics_list],
            cpu_usages=[m.cpu_usage_percent for m in metrics_list],
            mean_execution_time=np.mean([m.execution_time_ms for m in metrics_list]),
            std_execution_time=np.std([m.execution_time_ms for m in metrics_list]),
            p95_execution_time=np.percentile([m.execution_time_ms for m in metrics_list], 95),
            p99_execution_time=np.percentile([m.execution_time_ms for m in metrics_list], 99)
        )

    def get_all_metrics(self) -> Dict[str, TestMetrics]:
        """Get all collected metrics"""
        return self.metrics.copy()

    def export_metrics(self, filename: str):
        """Export metrics to JSON file"""

        export_data = {}
        for name, metrics in self.metrics.items():
            export_data[name] = {
                'test_name': metrics.test_name,
                'execution_time_ms': metrics.execution_time_ms,
                'memory_usage_mb': metrics.memory_usage_mb,
                'cpu_usage_percent': metrics.cpu_usage_percent,
                'success': metrics.success,
                'error_message': metrics.error_message,
                'additional_metrics': metrics.additional_metrics,
                'start_time': metrics.start_time.isoformat(),
                'end_time': metrics.end_time.isoformat() if metrics.end_time else None
            }

        with open(filename, 'w') as f:
            json.dump(export_data, f, indent=2)

        logger.info(f"📊 Metrics exported to {filename}")

class MockDataGenerator:
    """
    🎭 MOCK DATA GENERATOR - REALISTIC TEST DATA

    Generates realistic mock data for all modalities to enable comprehensive
    testing without external service dependencies. Creates data that mimics
    real-world patterns and distributions.
    """

    def __init__(self, seed: int = 42):
        """Initialize mock data generator"""
        self.seed = seed
        np.random.seed(seed)
        torch.manual_seed(seed)

    def generate_market_data(self, num_samples: int = 100, volatility: float = 0.02) -> Dict[str, Any]:
        """Generate realistic market data"""

        # Generate price series with random walk
        prices = [100.0]  # Starting price
        for i in range(1, num_samples):
            # Random walk with trend and volatility
            change = np.random.normal(0.001, volatility)  # Slight upward trend
            new_price = prices[-1] * (1 + change)
            prices.append(max(new_price, 0.01))  # Ensure positive prices

        # Generate volume data
        volumes = []
        for price in prices:
            # Volume correlated with price movement
            base_volume = 1000000
            volume_noise = np.random.normal(0, 0.3)
            volume = base_volume * (1 + volume_noise) * (price / 100)
            volumes.append(max(volume, 1000))

        # Generate timestamps
        base_time = datetime.utcnow() - timedelta(minutes=num_samples)
        timestamps = [base_time + timedelta(minutes=i) for i in range(num_samples)]

        return {
            'prices': prices,
            'volumes': volumes,
            'timestamps': timestamps,
            'indicators': {
                'rsi': np.random.uniform(30, 70, num_samples).tolist(),
                'macd': np.random.normal(0, 1, num_samples).tolist(),
                'sma_20': [np.mean(prices[max(0, i-20):i+1]) for i in range(num_samples)],
                'sma_50': [np.mean(prices[max(0, i-50):i+1]) for i in range(num_samples)]
            },
            'market_cap': [p * v / 1000000 for p, v in zip(prices, volumes)],  # Simplified
            'volatility': volatility * 100
        }

    def generate_social_sentiment(self, num_posts: int = 50) -> List[str]:
        """Generate realistic social media posts"""

        # Sentiment templates with crypto-specific language
        bullish_templates = [
            "🚀 {token} is going to the moon! Just bought more! #crypto #hodl",
            "Amazing fundamentals for {token}. This is undervalued! 📈",
            "Whales are accumulating {token}. Major pump incoming! 💎🙌",
            "Best project in crypto space. {token} will 10x this bull run!",
            "Technical analysis shows {token} breaking resistance. Bullish! 📊"
        ]

        bearish_templates = [
            "⚠️ {token} looking weak. Time to sell? #crypto",
            "Overvalued hype. {token} will crash soon. 📉",
            "Institutions dumping {token}. Bear market confirmed!",
            "This {token} project is a scam. Stay away! 🚨",
            "Technical indicators flashing sell signal for {token}. 😰"
        ]

        neutral_templates = [
            "Following {token} developments. Interesting project.",
            "Mixed signals for {token}. Monitoring closely.",
            "Community seems divided on {token}. What do you think?",
            "{token} partnership announced. Could be significant.",
            "Volume picking up for {token}. Watching for breakout."
        ]

        # Generate posts with random sentiment
        posts = []
        sentiments = np.random.choice(['bullish', 'bearish', 'neutral'],
                                    size=num_posts, p=[0.4, 0.3, 0.3])

        for sentiment in sentiments:
            if sentiment == 'bullish':
                template = np.random.choice(bullish_templates)
            elif sentiment == 'bearish':
                template = np.random.choice(bearish_templates)
            else:
                template = np.random.choice(neutral_templates)

            post = template.format(token="BTC")
            posts.append(post)

        return posts

    def generate_news_articles(self, num_articles: int = 10) -> List[str]:
        """Generate realistic news articles"""

        # News templates covering various crypto topics
        news_templates = [
            "Major Institutional Adoption: {company} Announces $500M {token} Investment",
            "Regulatory Update: {country} Clarifies Cryptocurrency Tax Policy for {token}",
            "Technical Breakthrough: {token} Network Achieves Record Transaction Speed",
            "Market Analysis: Experts Predict {token} Could Reach $100K This Year",
            "DeFi Integration: {token} Partners with Leading DEX for Enhanced Liquidity",
            "Mining News: New {token} Mining Facility Opens in {location}",
            "Security Alert: {token} Network Experiences Minor Vulnerability, Quickly Patched",
            "ETF Approval: {token} Futures ETF Approved by Regulatory Authorities",
            "Adoption Milestone: {token} Now Accepted by Major Retailers in {country}",
            "Price Analysis: {token} Shows Strong Technical Patterns, Bullish Outlook"
        ]

        # Article variations
        companies = ["BlackRock", "Fidelity", "Goldman Sachs", "JPMorgan", "Tesla"]
        countries = ["United States", "Singapore", "Switzerland", "Germany", "UAE"]
        locations = ["Texas", "Kazakhstan", "Iceland", "China", "Russia"]

        articles = []
        for _ in range(num_articles):
            template = np.random.choice(news_templates)

            # Fill in template variables
            article = template
            if "{company}" in article:
                article = article.replace("{company}", np.random.choice(companies))
            if "{country}" in article:
                article = article.replace("{country}", np.random.choice(countries))
            if "{location}" in article:
                article = article.replace("{location}", np.random.choice(locations))
            if "{token}" in article:
                article = article.replace("{token}", "Bitcoin")

            # Add some length variation
            if np.random.random() > 0.5:
                article += " This development is expected to have significant implications for the cryptocurrency market."

            articles.append(article)

        return articles

    def generate_onchain_data(self, num_nodes: int = 100, num_edges: int = 500) -> Dict[str, Any]:
        """Generate realistic on-chain transaction graph data"""

        # Generate nodes (wallets/addresses)
        nodes = []
        for i in range(num_nodes):
            node_type = np.random.choice(['whale', 'retail', 'exchange', 'contract'], p=[0.1, 0.7, 0.15, 0.05])
            balance = np.random.exponential(10) if node_type == 'whale' else np.random.exponential(1)

            nodes.append({
                'id': f'addr_{i}',
                'type': node_type,
                'balance': balance,
                'transaction_count': np.random.poisson(50),
                'first_seen': (datetime.utcnow() - timedelta(days=np.random.randint(30, 365))).isoformat()
            })

        # Generate edges (transactions)
        edges = []
        for _ in range(num_edges):
            source_idx = np.random.randint(0, num_nodes)
            target_idx = np.random.randint(0, num_nodes)

            # Avoid self-loops for simplicity
            while source_idx == target_idx:
                target_idx = np.random.randint(0, num_nodes)

            amount = np.random.exponential(1)  # Transaction amount
            timestamp = datetime.utcnow() - timedelta(minutes=np.random.randint(0, 1440))  # Last 24 hours

            edges.append({
                'source': nodes[source_idx]['id'],
                'target': nodes[target_idx]['id'],
                'amount': amount,
                'timestamp': timestamp.isoformat(),
                'tx_hash': f'tx_{np.random.randint(1000000, 9999999)}'
            })

        return {
            'nodes': nodes,
            'edges': edges,
            'network_metrics': {
                'total_transactions': num_edges,
                'active_addresses': len(set([e['source'] for e in edges] + [e['target'] for e in edges])),
                'total_volume': sum(e['amount'] for e in edges),
                'avg_transaction_size': np.mean([e['amount'] for e in edges])
            }
        }

    def generate_psychological_profile(self) -> Dict[str, Any]:
        """Generate realistic psychological profile data"""

        # Behavioral patterns
        behavioral_patterns = {
            'risk_tolerance': np.random.uniform(0.2, 0.8),  # 0.2 = conservative, 0.8 = aggressive
            'trading_frequency': np.random.choice(['low', 'medium', 'high'], p=[0.3, 0.5, 0.2]),
            'avg_hold_time_days': np.random.exponential(30) + 1,  # Exponential distribution
            'profit_taking_behavior': np.random.choice(['early', 'optimal', 'late'], p=[0.3, 0.4, 0.3]),
            'loss_aversion_score': np.random.uniform(0.5, 0.9)  # Higher = more loss averse
        }

        # Emotional state indicators
        emotional_state = {
            'current_mood': np.random.choice(['optimistic', 'neutral', 'pessimistic', 'excited', 'anxious'], p=[0.3, 0.4, 0.1, 0.15, 0.05]),
            'confidence_level': np.random.uniform(0.3, 0.9),
            'stress_level': np.random.uniform(0.1, 0.7),
            'fomo_intensity': np.random.uniform(0.2, 0.8),  # Fear of missing out
            'greed_factor': np.random.uniform(0.1, 0.6)
        }

        # Cognitive biases
        cognitive_biases = {
            'confirmation_bias': np.random.uniform(0.3, 0.8),
            'overconfidence': np.random.uniform(0.2, 0.7),
            'anchoring_effect': np.random.uniform(0.4, 0.8),
            'availability_heuristic': np.random.uniform(0.3, 0.7),
            'loss_aversion': behavioral_patterns['loss_aversion_score']
        }

        # Social influence patterns
        social_influence = {
            'influencer_following': np.random.choice([0, 1, 2, 3, 4], p=[0.4, 0.3, 0.15, 0.1, 0.05]),  # 0=none, 4=heavy
            'community_engagement': np.random.uniform(0.1, 0.8),
            'social_proof_susceptibility': np.random.uniform(0.2, 0.7),
            'herd_behavior_tendency': np.random.uniform(0.3, 0.8)
        }

        return {
            'behavioral_patterns': behavioral_patterns,
            'emotional_state': emotional_state,
            'cognitive_biases': cognitive_biases,
            'social_influence': social_influence,
            'overall_psychology_score': np.random.uniform(0.4, 0.8)  # Composite score
        }

    def generate_complete_multimodal_dataset(self,
                                          num_samples: int = 10,
                                          include_all_modalities: bool = True) -> List[Dict[str, Any]]:
        """Generate complete multi-modal datasets for testing"""

        datasets = []

        for i in range(num_samples):
            dataset = {
                'sample_id': f'sample_{i}',
                'timestamp': datetime.utcnow() - timedelta(minutes=i*5)
            }

            # Generate data for each modality
            if include_all_modalities:
                dataset.update({
                    'market_data': self.generate_market_data(num_samples=50),
                    'social_sentiment': self.generate_social_sentiment(num_posts=20),
                    'news_articles': self.generate_news_articles(num_articles=5),
                    'onchain_data': self.generate_onchain_data(num_nodes=50, num_edges=200),
                    'psychological_profile': self.generate_psychological_profile()
                })
            else:
                # Generate partial datasets for testing robustness
                modalities_to_include = np.random.choice(
                    ['market', 'social', 'news', 'onchain', 'psychology'],
                    size=np.random.randint(2, 5), replace=False
                )

                for modality in modalities_to_include:
                    if modality == 'market':
                        dataset['market_data'] = self.generate_market_data(num_samples=50)
                    elif modality == 'social':
                        dataset['social_sentiment'] = self.generate_social_sentiment(num_posts=20)
                    elif modality == 'news':
                        dataset['news_articles'] = self.generate_news_articles(num_articles=5)
                    elif modality == 'onchain':
                        dataset['onchain_data'] = self.generate_onchain_data(num_nodes=50, num_edges=200)
                    elif modality == 'psychology':
                        dataset['psychological_profile'] = self.generate_psychological_profile()

            datasets.append(dataset)

        return datasets

    def generate_anomaly_dataset(self) -> Dict[str, Any]:
        """Generate dataset with intentional anomalies for testing"""

        # Create anomalous market data (extreme volatility)
        market_data = self.generate_market_data(num_samples=100, volatility=0.1)  # High volatility

        # Add flash crash event
        crash_start = 50
        crash_prices = market_data['prices'].copy()
        for i in range(crash_start, min(crash_start + 10, len(crash_prices))):
            crash_prices[i] = crash_prices[i] * (1 - 0.3)  # 30% crash

        market_data['prices'] = crash_prices

        # Create anomalous social sentiment (extreme bearish)
        bearish_posts = [
            "CRASH! CRASH! CRASH! {token} is collapsing! SELL EVERYTHING! 🚨😱",
            "This is the end of crypto! {token} going to zero! Run for your lives!",
            "Institutions are dumping everything! Bloodbath incoming! 💀📉",
            "I lost everything on {token}! Never investing again! 😭💸",
            "The bubble has burst! {token} is worthless now! 🔥💥"
        ]

        social_sentiment = [post.format(token="BTC") for post in bearish_posts * 10]

        # Create anomalous news (regulatory crackdown)
        crisis_news = [
            "URGENT: Government Bans All Cryptocurrency Trading in Major Markets",
            "BREAKING: {token} Declared Illegal by Financial Regulators",
            "CRISIS: Major Exchanges Shutting Down {token} Trading",
            "PANIC: Institutional Investors Massively Selling {token} Holdings",
            "CATASTROPHE: {token} Network Experiences Critical Security Breach"
        ]

        news_articles = [article.format(token="Bitcoin") for article in crisis_news]

        return {
            'market_data': market_data,
            'social_sentiment': social_sentiment,
            'news_articles': news_articles,
            'onchain_data': self.generate_onchain_data(num_nodes=20, num_edges=50),  # Reduced activity
            'psychological_profile': {
                'behavioral_patterns': {'risk_tolerance': 0.1, 'trading_frequency': 'low'},
                'emotional_state': {'current_mood': 'panic', 'confidence_level': 0.1, 'stress_level': 0.9},
                'cognitive_biases': {'confirmation_bias': 0.9, 'overconfidence': 0.1, 'loss_aversion': 0.9},
                'social_influence': {'influencer_following': 0, 'community_engagement': 0.1}
            },
            'anomaly_type': 'market_crash',
            'severity': 'extreme'
        }

    def create_temporal_misalignment_scenario(self) -> Dict[str, Any]:
        """Create scenario with temporal misalignments for testing"""

        base_time = datetime.utcnow()

        return {
            'market_data': {
                'prices': [100, 101, 102, 103, 104],
                'timestamps': [
                    base_time - timedelta(minutes=5),
                    base_time - timedelta(minutes=4),
                    base_time - timedelta(minutes=3),
                    base_time - timedelta(minutes=2),
                    base_time - timedelta(minutes=1)
                ]
            },
            'social_sentiment': [
                {
                    'text': "Great analysis!",
                    'timestamp': base_time - timedelta(minutes=8),  # Older than market data
                    'confidence': 0.8
                }
            ],
            'news_articles': [
                {
                    'title': "Breaking News",
                    'timestamp': base_time + timedelta(minutes=2),  # Future timestamp
                    'summary': "Important development"
                }
            ],
            'expected_alignment_issues': [
                'social_sentiment_too_old',
                'news_future_timestamp',
                'latency_compensation_needed'
            ]
        }

class FusionValidator:
    """
    ✅ FUSION VALIDATOR - ACCURACY AND RELIABILITY TESTING

    Validates the correctness and reliability of multi-modal fusion results
    through comprehensive testing scenarios and accuracy benchmarks.
    """

    def __init__(self):
        self.validation_results = {}
        self.accuracy_benchmarks = {}

    async def validate_fusion_accuracy(self,
                                     fusion_engine,
                                     test_datasets: List[Dict[str, Any]],
                                     expected_results: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Validate fusion accuracy against expected results"""

        validation_results = {
            'total_tests': len(test_datasets),
            'successful_fusions': 0,
            'accuracy_scores': {},
            'error_analysis': [],
            'performance_metrics': {}
        }

        for i, dataset in enumerate(test_datasets):
            try:
                # Run fusion on test dataset
                fusion_result = await fusion_engine.process_multimodal_input(dataset)

                # Validate against expected results if provided
                if expected_results and f'sample_{i}' in expected_results and fusion_result is not None:
                    expected = expected_results[f'sample_{i}']

                    # Calculate accuracy for each prediction type
                    if hasattr(fusion_result, 'predictions') and fusion_result.predictions:
                        for prediction_type in ['price_movement', 'market_sentiment', 'risk_assessment']:
                            if prediction_type in fusion_result.predictions:
                                accuracy = self._calculate_prediction_accuracy(
                                    fusion_result.predictions[prediction_type],
                                    expected.get(prediction_type, {})
                                )
                                validation_results['accuracy_scores'][f'{prediction_type}_sample_{i}'] = accuracy

                validation_results['successful_fusions'] += 1

            except Exception as e:
                validation_results['error_analysis'].append({
                    'sample_id': f'sample_{i}',
                    'error': str(e),
                    'dataset_shape': {k: len(v) if isinstance(v, (list, dict)) else type(v).__name__
                                    for k, v in dataset.items()}
                })

        # Calculate overall accuracy
        if validation_results['accuracy_scores']:
            validation_results['overall_accuracy'] = np.mean(list(validation_results['accuracy_scores'].values()))
        else:
            validation_results['overall_accuracy'] = 0.0

        validation_results['success_rate'] = (
            validation_results['successful_fusions'] / validation_results['total_tests']
        )

        return validation_results

    def _calculate_prediction_accuracy(self, predicted: Dict[str, Any], expected: Dict[str, Any]) -> float:
        """Calculate accuracy between predicted and expected results"""

        accuracy_factors = []

        # Direction accuracy (for price movement)
        if 'direction' in predicted and 'direction' in expected:
            direction_match = predicted['direction'] == expected['direction']
            accuracy_factors.append(1.0 if direction_match else 0.0)

        # Confidence accuracy (within 20% tolerance)
        if 'confidence' in predicted and 'confidence' in expected:
            confidence_diff = abs(predicted['confidence'] - expected['confidence'])
            confidence_accuracy = max(0.0, 1.0 - confidence_diff / 0.2)  # 20% tolerance
            accuracy_factors.append(confidence_accuracy)

        # Sentiment accuracy
        if 'dominant_sentiment' in predicted and 'dominant_sentiment' in expected:
            sentiment_match = predicted['dominant_sentiment'] == expected['dominant_sentiment']
            accuracy_factors.append(1.0 if sentiment_match else 0.0)

        # Risk level accuracy
        if 'risk_level' in predicted and 'risk_level' in expected:
            risk_match = predicted['risk_level'] == expected['risk_level']
            accuracy_factors.append(1.0 if risk_match else 0.0)

        return np.mean(accuracy_factors) if accuracy_factors else 0.0

    def validate_modality_encoding(self,
                                encoder,
                                test_inputs: List[Any],
                                expected_outputs: Optional[List[Any]] = None) -> Dict[str, Any]:
        """Validate individual modality encoder accuracy"""

        results = {
            'total_tests': len(test_inputs),
            'successful_encodings': 0,
            'encoding_times': [],
            'output_shapes': [],
            'accuracy_scores': []
        }

        for i, test_input in enumerate(test_inputs):
            try:
                # Time the encoding
                start_time = time.time()
                encoded = encoder.encode(test_input)
                encoding_time = (time.time() - start_time) * 1000

                results['successful_encodings'] += 1
                results['encoding_times'].append(encoding_time)
                results['output_shapes'].append(list(encoded.embedding.shape))

                # Validate against expected output if provided
                if expected_outputs and i < len(expected_outputs):
                    accuracy = self._calculate_encoding_accuracy(encoded, expected_outputs[i])
                    results['accuracy_scores'].append(accuracy)

            except Exception as e:
                logger.warning(f"❌ Encoding test {i} failed: {str(e)}")

        # Calculate statistics
        if results['encoding_times']:
            results['avg_encoding_time'] = np.mean(results['encoding_times'])
            results['std_encoding_time'] = np.std(results['encoding_times'])

        if results['accuracy_scores']:
            results['avg_accuracy'] = np.mean(results['accuracy_scores'])

        results['success_rate'] = results['successful_encodings'] / results['total_tests']

        return results

    def _calculate_encoding_accuracy(self, encoded: Any, expected: Any) -> float:
        """Calculate encoding accuracy (simplified cosine similarity)"""

        if hasattr(encoded, 'embedding') and hasattr(expected, 'embedding'):
            # Calculate cosine similarity between embeddings
            similarity = torch.cosine_similarity(
                encoded.embedding.flatten(),
                expected.embedding.flatten(),
                dim=0
            ).item()

            return max(0.0, similarity)  # Ensure non-negative

        return 0.0

    def validate_temporal_alignment(self,
                                  temporal_aligner,
                                  misaligned_signals: Dict[str, Any],
                                  expected_alignment: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Validate temporal alignment functionality"""

        results = {
            'alignment_successful': False,
            'alignment_quality': 0.0,
            'latency_compensation_applied': False,
            'interpolation_performed': False,
            'alignment_errors': []
        }

        try:
            # Run temporal alignment
            aligned_result = temporal_aligner.align_signals(misaligned_signals)

            # Check if alignment was successful
            if aligned_result:
                results['alignment_successful'] = True

                # Calculate alignment quality
                quality_scores = [signal.alignment_quality for signal in aligned_result.values()]
                results['alignment_quality'] = np.mean(quality_scores)

                # Check if latency compensation was applied
                for signal_list in aligned_result.values():
                    for signal in signal_list:
                        if signal.latency_ms == 0.0:  # Latency was compensated
                            results['latency_compensation_applied'] = True
                            break

                # Check if interpolation was performed
                if any(len(signals) > 1 for signals in aligned_result.values()):
                    results['interpolation_performed'] = True

            # Validate against expected alignment if provided
            if expected_alignment:
                # Compare actual vs expected alignment quality
                expected_quality = expected_alignment.get('quality', 0.0)
                quality_diff = abs(results['alignment_quality'] - expected_quality)
                results['quality_accuracy'] = max(0.0, 1.0 - quality_diff / 0.1)  # 10% tolerance

        except Exception as e:
            results['alignment_errors'].append(str(e))

        return results

class AccuracyBenchmark:
    """
    📊 ACCURACY BENCHMARK - COMPREHENSIVE PERFORMANCE ANALYSIS

    Runs comprehensive accuracy benchmarks comparing the fusion pipeline
    against ground truth data and established baselines.
    """

    def __init__(self):
        self.benchmark_results = {}

    async def run_comprehensive_benchmark(self,
                                        fusion_engine,
                                        benchmark_datasets: List[Dict[str, Any]],
                                        ground_truth: Dict[str, Any]) -> Dict[str, Any]:
        """Run comprehensive accuracy benchmark"""

        benchmark_start = datetime.utcnow()

        results = {
            'benchmark_id': f'benchmark_{int(time.time())}',
            'start_time': benchmark_start.isoformat(),
            'total_samples': len(benchmark_datasets),
            'modality_coverage': {},
            'prediction_accuracies': {},
            'fusion_quality_metrics': {},
            'performance_metrics': {},
            'comparative_analysis': {}
        }

        # Run benchmark for each sample
        sample_results = []

        for i, dataset in enumerate(benchmark_datasets):
            try:
                sample_result = await self._benchmark_single_sample(fusion_engine, dataset, ground_truth, i)
                sample_results.append(sample_result)

            except Exception as e:
                logger.error(f"❌ Benchmark sample {i} failed: {str(e)}")
                sample_results.append({
                    'sample_id': f'sample_{i}',
                    'error': str(e),
                    'accuracy': 0.0
                })

        # Aggregate results
        results.update(self._aggregate_benchmark_results(sample_results))

        results['end_time'] = datetime.utcnow().isoformat()
        results['duration_minutes'] = (datetime.utcnow() - benchmark_start).total_seconds() / 60

        # Store results
        self.benchmark_results[results['benchmark_id']] = results

        return results

    async def _benchmark_single_sample(self,
                                     fusion_engine,
                                     dataset: Dict[str, Any],
                                     ground_truth: Dict[str, Any],
                                     sample_index: int) -> Dict[str, Any]:
        """Benchmark a single sample against ground truth"""

        sample_id = f'sample_{sample_index}'

        # Run fusion
        fusion_result = await fusion_engine.process_multimodal_input(dataset)

        # Compare against ground truth
        expected = ground_truth.get(sample_id, {})

        accuracies = {}

        # Price movement accuracy
        if 'price_movement' in fusion_result.predictions and 'price_movement' in expected:
            accuracies['price_movement'] = self._calculate_price_accuracy(
                fusion_result.predictions['price_movement'],
                expected['price_movement']
            )

        # Sentiment accuracy
        if 'market_sentiment' in fusion_result.predictions and 'market_sentiment' in expected:
            accuracies['market_sentiment'] = self._calculate_sentiment_accuracy(
                fusion_result.predictions['market_sentiment'],
                expected['market_sentiment']
            )

        # Risk assessment accuracy
        if 'risk_assessment' in fusion_result.predictions and 'risk_assessment' in expected:
            accuracies['risk_assessment'] = self._calculate_risk_accuracy(
                fusion_result.predictions['risk_assessment'],
                expected['risk_assessment']
            )

        # Overall accuracy for this sample
        overall_accuracy = np.mean(list(accuracies.values())) if accuracies else 0.0

        return {
            'sample_id': sample_id,
            'fusion_confidence': fusion_result.confidence_scores.get('overall', 0.0),
            'execution_time_ms': fusion_result.execution_time_ms,
            'modalities_used': len([k for k, v in dataset.items() if v is not None and k != 'sample_id' and k != 'timestamp']),
            'individual_accuracies': accuracies,
            'overall_accuracy': overall_accuracy
        }

    def _calculate_price_accuracy(self, predicted: Dict[str, Any], expected: Dict[str, Any]) -> float:
        """Calculate price movement prediction accuracy"""

        accuracy_factors = []

        # Direction accuracy
        if predicted.get('direction') and expected.get('direction'):
            direction_match = predicted['direction'] == expected['direction']
            accuracy_factors.append(1.0 if direction_match else 0.0)

        # Magnitude accuracy (within 50% tolerance)
        if predicted.get('magnitude') and expected.get('magnitude'):
            pred_mag = abs(predicted['magnitude'])
            exp_mag = abs(expected['magnitude'])
            mag_diff = abs(pred_mag - exp_mag)
            mag_accuracy = max(0.0, 1.0 - mag_diff / max(exp_mag, 1.0))
            accuracy_factors.append(mag_accuracy)

        # Timeframe accuracy
        if predicted.get('timeframes') and expected.get('timeframes'):
            for tf in ['1h', '6h', '24h', '7d']:
                if tf in predicted['timeframes'] and tf in expected['timeframes']:
                    tf_diff = abs(predicted['timeframes'][tf] - expected['timeframes'][tf])
                    tf_accuracy = max(0.0, 1.0 - tf_diff)
                    accuracy_factors.append(tf_accuracy)

        return np.mean(accuracy_factors) if accuracy_factors else 0.0

    def _calculate_sentiment_accuracy(self, predicted: Dict[str, Any], expected: Dict[str, Any]) -> float:
        """Calculate market sentiment prediction accuracy"""

        accuracy_factors = []

        # Dominant sentiment accuracy
        if predicted.get('dominant_sentiment') and expected.get('dominant_sentiment'):
            sentiment_match = predicted['dominant_sentiment'] == expected['dominant_sentiment']
            accuracy_factors.append(1.0 if sentiment_match else 0.0)

        # Sentiment score accuracy (within 10 points tolerance)
        if predicted.get('sentiment_score') and expected.get('sentiment_score'):
            score_diff = abs(predicted['sentiment_score'] - expected['sentiment_score'])
            score_accuracy = max(0.0, 1.0 - score_diff / 10.0)
            accuracy_factors.append(score_accuracy)

        return np.mean(accuracy_factors) if accuracy_factors else 0.0

    def _calculate_risk_accuracy(self, predicted: Dict[str, Any], expected: Dict[str, Any]) -> float:
        """Calculate risk assessment accuracy"""

        accuracy_factors = []

        # Risk level accuracy
        if predicted.get('risk_level') and expected.get('risk_level'):
            risk_match = predicted['risk_level'] == expected['risk_level']
            accuracy_factors.append(1.0 if risk_match else 0.0)

        # Risk score accuracy (within 10% tolerance)
        if predicted.get('risk_score') and expected.get('risk_score'):
            pred_score = predicted['risk_score']
            exp_score = expected['risk_score']
            score_diff = abs(pred_score - exp_score)
            score_accuracy = max(0.0, 1.0 - score_diff / max(exp_score, 1.0))
            accuracy_factors.append(score_accuracy)

        return np.mean(accuracy_factors) if accuracy_factors else 0.0

    def _aggregate_benchmark_results(self, sample_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Aggregate benchmark results across all samples"""

        if not sample_results:
            return {}

        # Calculate overall statistics
        accuracies = [r['overall_accuracy'] for r in sample_results if 'overall_accuracy' in r]
        execution_times = [r['execution_time_ms'] for r in sample_results if 'execution_time_ms' in r]
        fusion_confidences = [r['fusion_confidence'] for r in sample_results if 'fusion_confidence' in r]

        aggregated = {
            'overall_accuracy': np.mean(accuracies) if accuracies else 0.0,
            'accuracy_std': np.std(accuracies) if accuracies else 0.0,
            'accuracy_distribution': {
                'excellent': len([a for a in accuracies if a > 0.8]),
                'good': len([a for a in accuracies if 0.6 <= a <= 0.8]),
                'fair': len([a for a in accuracies if 0.4 <= a < 0.6]),
                'poor': len([a for a in accuracies if a < 0.4])
            },
            'avg_execution_time_ms': np.mean(execution_times) if execution_times else 0.0,
            'execution_time_std': np.std(execution_times) if execution_times else 0.0,
            'avg_fusion_confidence': np.mean(fusion_confidences) if fusion_confidences else 0.0,
            'samples_processed': len(sample_results),
            'successful_samples': len([r for r in sample_results if 'error' not in r])
        }

        return aggregated

    def export_benchmark_report(self, benchmark_id: str, filename: str):
        """Export benchmark results to file"""

        if benchmark_id not in self.benchmark_results:
            raise ValueError(f"Benchmark {benchmark_id} not found")

        results = self.benchmark_results[benchmark_id]

        # Create comprehensive report
        report = {
            'benchmark_metadata': {
                'benchmark_id': results['benchmark_id'],
                'start_time': results['start_time'],
                'end_time': results['end_time'],
                'duration_minutes': results['duration_minutes'],
                'total_samples': results['total_samples']
            },
            'accuracy_results': results.get('overall_accuracy', {}),
            'performance_metrics': results.get('performance_metrics', {}),
            'modality_analysis': results.get('modality_coverage', {}),
            'detailed_results': results  # Full results for detailed analysis
        }

        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)

        logger.info(f"📊 Benchmark report exported to {filename}")

        return report
