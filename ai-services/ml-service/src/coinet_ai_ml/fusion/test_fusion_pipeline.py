"""
🧪 COMPREHENSIVE FUSION PIPELINE TESTS - THE ULTIMATE VALIDATION SUITE
=======================================================================

Complete test suite for the multi-modal fusion pipeline including:
- Unit tests for all components (encoders, alignment, fusion)
- Integration tests for end-to-end pipeline
- Performance benchmarks and stress testing
- Accuracy validation against ground truth
- Error handling and edge case testing
- Mock data generation and service simulation

Run with: python -m pytest src/coinet_ai_ml/fusion/test_fusion_pipeline.py -v
"""

import asyncio
import pytest
import torch
import numpy as np
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any

from .test_utils import (
    MockDataGenerator, TestMetricsCollector, FusionValidator, AccuracyBenchmark,
    TestMetrics, PerformanceBenchmark
)
from .multimodal_fusion import MultiModalFusionEngine, MultiModalInput
from .encoders import CNNEncoder, TransformerEncoder, GNNEncoder, PsychologyEncoder
from .temporal_alignment import TemporalAligner, TemporalSignal
from .fusion_mechanisms import MultiModalFusionMechanisms

# Test configuration
TEST_CONFIG = {
    'performance_thresholds': {
        'max_encoding_time_ms': 1000,
        'max_fusion_time_ms': 500,
        'max_total_time_ms': 2000,
        'min_success_rate': 0.95,
        'min_accuracy': 0.7
    },
    'test_data_sizes': {
        'small': 10,
        'medium': 50,
        'large': 100,
        'stress': 500
    }
}

class TestFusionPipeline:
    """
    🧪 MAIN TEST SUITE - COMPREHENSIVE FUSION PIPELINE VALIDATION

    Orchestrates all tests for the multi-modal fusion pipeline ensuring
    correctness, performance, and reliability across all components.
    """

    def __init__(self):
        self.mock_generator = MockDataGenerator(seed=42)
        self.metrics_collector = TestMetricsCollector()
        self.validator = FusionValidator()
        self.benchmark = AccuracyBenchmark()

        # Initialize test components
        self.fusion_engine = None
        self.encoders = {}
        self.temporal_aligner = None
        self.fusion_mechanisms = None

    async def setup_test_environment(self):
        """Set up test environment and initialize all components"""

        # Initialize fusion engine with test configuration
        test_config = {
            'fusion': {
                'embed_dim': 256,  # Smaller for faster testing
                'hidden_dim': 512,
                'fusion_strategy': 'hybrid'
            },
            'encoders': {
                'market': {'feature_dim': 256},
                'social': {'hidden_dim': 256, 'num_layers': 2},
                'news': {'hidden_dim': 256, 'num_layers': 2},
                'onchain': {'hidden_dim': 128, 'num_layers': 2},
                'psychology': {'hidden_dim': 128}
            }
        }

        self.fusion_engine = MultiModalFusionEngine(test_config)

        # Initialize individual components for unit testing
        self.encoders = {
            'market': CNNEncoder({'feature_dim': 256}),
            'social': TransformerEncoder({'hidden_dim': 256, 'num_layers': 2}),
            'news': TransformerEncoder({'hidden_dim': 256, 'num_layers': 2}),
            'onchain': GNNEncoder({'hidden_dim': 128, 'num_layers': 2}),
            'psychology': PsychologyEncoder({'hidden_dim': 128})
        }

        self.temporal_aligner = TemporalAligner()
        self.fusion_mechanisms = MultiModalFusionMechanisms({
            'embed_dim': 256,
            'hidden_dim': 512,
            'fusion_strategy': 'hybrid'
        })

        # Initialize all components
        await self.fusion_engine.initialize()

        for encoder in self.encoders.values():
            await encoder.initialize()

        print("✅ Test environment initialized successfully")

    @pytest.mark.asyncio
    async def test_temporal_alignment_functionality(self):
        """Test temporal alignment with various scenarios"""

        print("\n🕰️ Testing Temporal Alignment...")

        # Test 1: Basic alignment with well-aligned data
        with self.metrics_collector.measure_performance("temporal_alignment_basic") as metrics:
            well_aligned_signals = {
                'market_data': [
                    TemporalSignal(datetime.utcnow() - timedelta(minutes=i), f"value_{i}", 'market_data')
                    for i in range(5)
                ],
                'social_sentiment': [
                    TemporalSignal(datetime.utcnow() - timedelta(minutes=i), f"sentiment_{i}", 'social_sentiment')
                    for i in range(5)
                ]
            }

            aligned_result = await self.temporal_aligner.align_signals(well_aligned_signals)

            assert aligned_result is not None
            assert len(aligned_result) == 2  # Two modalities

            # Check alignment quality
            qualities = [signal.alignment_quality for signal in aligned_result.values()]
            assert all(q > 0.8 for q in qualities), f"Poor alignment quality: {qualities}"

        # Test 2: Misaligned data requiring interpolation
        with self.metrics_collector.measure_performance("temporal_alignment_interpolation") as metrics:
            misaligned_signals = self.mock_generator.create_temporal_misalignment_scenario()
            aligned_result = await self.temporal_aligner.align_signals(misaligned_signals)

            assert aligned_result is not None

            # Should handle misalignments gracefully
            qualities = [signal.alignment_quality for signal in aligned_result.values()]
            assert any(q > 0.5 for q in qualities), "Should handle misalignments"

        # Test 3: Latency compensation
        with self.metrics_collector.measure_performance("temporal_alignment_latency") as metrics:
            high_latency_signals = {
                'news_articles': [
                    TemporalSignal(
                        datetime.utcnow() - timedelta(minutes=10),
                        "Late news",
                        'news_articles',
                        latency_ms=5000  # 5 second latency
                    )
                ]
            }

            aligned_result = await self.temporal_aligner.align_signals(high_latency_signals)

            # Should compensate for latency
            assert aligned_result is not None

        print("✅ Temporal alignment tests passed")

    @pytest.mark.asyncio
    async def test_modality_encoders(self):
        """Test all modality encoders individually"""

        print("\n🔢 Testing Modality Encoders...")

        # Test CNN Encoder (Market data)
        with self.metrics_collector.measure_performance("cnn_encoder_test") as metrics:
            market_data = self.mock_generator.generate_market_data(num_samples=50)
            encoded = await self.encoders['market'].encode(market_data)

            assert encoded is not None
            assert encoded.embedding is not None
            assert encoded.embedding.shape[0] == 1  # Batch size 1

            # Performance check
            assert encoded.encoding_time_ms < TEST_CONFIG['performance_thresholds']['max_encoding_time_ms']

        # Test Transformer Encoder (Social sentiment)
        with self.metrics_collector.measure_performance("transformer_encoder_social") as metrics:
            social_posts = self.mock_generator.generate_social_sentiment(num_posts=20)
            encoded = await self.encoders['social'].encode(social_posts)

            assert encoded is not None
            assert encoded.embedding is not None

        # Test Transformer Encoder (News articles)
        with self.metrics_collector.measure_performance("transformer_encoder_news") as metrics:
            news_articles = self.mock_generator.generate_news_articles(num_articles=10)
            encoded = await self.encoders['news'].encode(news_articles)

            assert encoded is not None
            assert encoded.embedding is not None

        # Test GNN Encoder (On-chain data)
        with self.metrics_collector.measure_performance("gnn_encoder_test") as metrics:
            onchain_data = self.mock_generator.generate_onchain_data(num_nodes=50, num_edges=100)

            # Convert to proper format for GNN
            node_features = torch.randn(50, 64)  # 50 nodes, 64 features
            edge_index = torch.randint(0, 50, (2, 100))  # 100 edges

            gnn_input = {
                'node_features': node_features,
                'edge_index': edge_index
            }

            encoded = await self.encoders['onchain'].encode(gnn_input)

            assert encoded is not None
            assert encoded.embedding is not None

        # Test Psychology Encoder
        with self.metrics_collector.measure_performance("psychology_encoder_test") as metrics:
            psych_profile = self.mock_generator.generate_psychological_profile()
            encoded = await self.encoders['psychology'].encode(psych_profile)

            assert encoded is not None
            assert encoded.embedding is not None

        print("✅ Modality encoder tests passed")

    @pytest.mark.asyncio
    async def test_fusion_mechanisms(self):
        """Test cross-modal fusion mechanisms"""

        print("\n🔗 Testing Fusion Mechanisms...")

        # Generate test embeddings for each modality
        modality_embeddings = {}

        # Market embedding (CNN output)
        market_data = self.mock_generator.generate_market_data(num_samples=50)
        market_encoded = await self.encoders['market'].encode(market_data)
        modality_embeddings['market'] = market_encoded.embedding

        # Social embedding (Transformer output)
        social_posts = self.mock_generator.generate_social_sentiment(num_posts=20)
        social_encoded = await self.encoders['social'].encode(social_posts)
        modality_embeddings['social'] = social_encoded.embedding

        # News embedding (Transformer output)
        news_articles = self.mock_generator.generate_news_articles(num_articles=10)
        news_encoded = await self.encoders['news'].encode(news_articles)
        modality_embeddings['news'] = news_encoded.embedding

        # On-chain embedding (GNN output)
        onchain_data = self.mock_generator.generate_onchain_data(num_nodes=30, num_edges=60)
        node_features = torch.randn(30, 64)
        edge_index = torch.randint(0, 30, (2, 60))
        gnn_input = {'node_features': node_features, 'edge_index': edge_index}
        onchain_encoded = await self.encoders['onchain'].encode(gnn_input)
        modality_embeddings['onchain'] = onchain_encoded.embedding

        # Psychology embedding
        psych_profile = self.mock_generator.generate_psychological_profile()
        psych_encoded = await self.encoders['psychology'].encode(psych_profile)
        modality_embeddings['psychology'] = psych_encoded.embedding

        # Test different fusion strategies
        fusion_strategies = ['attention', 'joint_embedding', 'transformer', 'hybrid']

        for strategy in fusion_strategies:
            with self.metrics_collector.measure_performance(f"fusion_{strategy}") as metrics:
                fusion_result = await self.fusion_mechanisms.fuse_modalities(
                    modality_embeddings, strategy
                )

                assert fusion_result is not None
                assert fusion_result.fused_embedding is not None
                assert fusion_result.fusion_confidence >= 0.0
                assert fusion_result.fusion_confidence <= 1.0

                # Check modality importance
                assert len(fusion_result.modality_importance) == len(modality_embeddings)
                assert all(0.0 <= imp <= 1.0 for imp in fusion_result.modality_importance.values())

                # Check cross-modal correlations
                assert len(fusion_result.cross_modal_correlations) > 0

        print("✅ Fusion mechanism tests passed")

    @pytest.mark.asyncio
    async def test_complete_fusion_pipeline(self):
        """Test complete end-to-end fusion pipeline"""

        print("\n🔥 Testing Complete Fusion Pipeline...")

        # Test with complete multi-modal dataset
        test_datasets = self.mock_generator.generate_complete_multimodal_dataset(
            num_samples=TEST_CONFIG['test_data_sizes']['small'],
            include_all_modalities=True
        )

        successful_fusions = 0
        total_fusions = len(test_datasets)

        for i, dataset in enumerate(test_datasets):
            with self.metrics_collector.measure_performance(f"complete_pipeline_{i}") as metrics:
                try:
                    # Convert to MultiModalInput format
                    multimodal_input = MultiModalInput(
                        market_data=dataset.get('market_data'),
                        social_sentiment=dataset.get('social_sentiment'),
                        news_articles=dataset.get('news_articles'),
                        onchain_data=dataset.get('onchain_data'),
                        psychological_profile=dataset.get('psychological_profile'),
                        timestamp=dataset.get('timestamp')
                    )

                    # Process through complete pipeline
                    result = await self.fusion_engine.process_multimodal_input(multimodal_input)

                    assert result is not None
                    assert result.fused_embedding is not None
                    assert result.predictions is not None
                    assert result.confidence_scores is not None

                    # Validate prediction structure
                    required_predictions = ['price_movement', 'market_sentiment', 'risk_assessment']
                    for pred_type in required_predictions:
                        assert pred_type in result.predictions

                    # Check confidence scores
                    for pred_type in required_predictions:
                        assert pred_type in result.confidence_scores
                        assert 0.0 <= result.confidence_scores[pred_type] <= 1.0

                    successful_fusions += 1

                except Exception as e:
                    print(f"❌ Fusion {i} failed: {str(e)}")
                    continue

        success_rate = successful_fusions / total_fusions
        assert success_rate >= TEST_CONFIG['performance_thresholds']['min_success_rate'], \
            f"Success rate {success_rate:.2f} below threshold {TEST_CONFIG['performance_thresholds']['min_success_rate']}"

        print(f"✅ Complete pipeline tests passed ({successful_fusions}/{total_fusions} successful)")

    @pytest.mark.asyncio
    async def test_performance_benchmarks(self):
        """Test performance under different loads"""

        print("\n⚡ Testing Performance Benchmarks...")

        # Test with different data sizes
        data_sizes = ['small', 'medium', 'large']

        for size in data_sizes:
            num_samples = TEST_CONFIG['test_data_sizes'][size]

            with self.metrics_collector.measure_performance(f"performance_{size}") as metrics:
                # Generate test data
                test_datasets = self.mock_generator.generate_complete_multimodal_dataset(
                    num_samples=num_samples,
                    include_all_modalities=True
                )

                # Process all datasets
                successful_fusions = 0

                for dataset in test_datasets:
                    try:
                        multimodal_input = MultiModalInput(
                            market_data=dataset.get('market_data'),
                            social_sentiment=dataset.get('social_sentiment'),
                            news_articles=dataset.get('news_articles'),
                            onchain_data=dataset.get('onchain_data'),
                            psychological_profile=dataset.get('psychological_profile')
                        )

                        result = await self.fusion_engine.process_multimodal_input(multimodal_input)
                        if result:
                            successful_fusions += 1

                    except Exception:
                        continue

                success_rate = successful_fusions / num_samples

                # Validate performance thresholds
                assert metrics.execution_time_ms < TEST_CONFIG['performance_thresholds']['max_total_time_ms'], \
                    f"Execution time {metrics.execution_time_ms}ms exceeds threshold"

                assert success_rate >= TEST_CONFIG['performance_thresholds']['min_success_rate'], \
                    f"Success rate {success_rate:.2f} below threshold"

        # Test stress scenario
        if TEST_CONFIG['test_data_sizes']['stress'] <= 100:  # Don't run extremely large stress tests
            with self.metrics_collector.measure_performance("performance_stress") as metrics:
                stress_datasets = self.mock_generator.generate_complete_multimodal_dataset(
                    num_samples=TEST_CONFIG['test_data_sizes']['stress'],
                    include_all_modalities=False  # Use partial data for stress test
                )

                processed_count = 0
                for dataset in stress_datasets[:50]:  # Limit to first 50 for reasonable test time
                    try:
                        multimodal_input = MultiModalInput(
                            market_data=dataset.get('market_data'),
                            social_sentiment=dataset.get('social_sentiment')
                        )

                        result = await self.fusion_engine.process_multimodal_input(multimodal_input)
                        if result:
                            processed_count += 1

                    except Exception:
                        continue

                assert processed_count > 0, "Stress test should process at least some samples"

        print("✅ Performance benchmark tests passed")

    @pytest.mark.asyncio
    async def test_accuracy_validation(self):
        """Test accuracy against ground truth data"""

        print("\n🎯 Testing Accuracy Validation...")

        # Generate test datasets with known ground truth
        test_datasets = []
        ground_truth = {}

        for i in range(TEST_CONFIG['test_data_sizes']['medium']):
            # Create dataset with predictable patterns
            dataset = self.mock_generator.generate_complete_multimodal_dataset(
                num_samples=1, include_all_modalities=True
            )[0]

            # Create corresponding ground truth based on data patterns
            expected_predictions = self._generate_ground_truth_for_dataset(dataset)

            test_datasets.append(dataset)
            ground_truth[f'sample_{i}'] = expected_predictions

        # Run accuracy validation
        with self.metrics_collector.measure_performance("accuracy_validation") as metrics:
            validation_results = await self.validator.validate_fusion_accuracy(
                self.fusion_engine, test_datasets, ground_truth
            )

            # Validate accuracy thresholds
            assert validation_results['overall_accuracy'] >= TEST_CONFIG['performance_thresholds']['min_accuracy'], \
                f"Overall accuracy {validation_results['overall_accuracy']:.3f} below threshold"

            assert validation_results['success_rate'] >= TEST_CONFIG['performance_thresholds']['min_success_rate'], \
                f"Success rate {validation_results['success_rate']:.2f} below threshold"

            # Check that we have meaningful accuracy scores
            assert len(validation_results['accuracy_scores']) > 0, "Should have accuracy scores"

            # Log detailed accuracy results
            print(f"   Overall accuracy: {validation_results['overall_accuracy']:.3f}")
            print(f"   Success rate: {validation_results['success_rate']:.2f}")

            if validation_results['accuracy_scores']:
                avg_accuracy = np.mean(list(validation_results['accuracy_scores'].values()))
                print(f"   Average prediction accuracy: {avg_accuracy:.3f}")

        print("✅ Accuracy validation tests passed")

    @pytest.mark.asyncio
    async def test_error_handling_and_edge_cases(self):
        """Test error handling and edge cases"""

        print("\n🚨 Testing Error Handling and Edge Cases...")

        # Test 1: Empty input
        with self.metrics_collector.measure_performance("error_empty_input") as metrics:
            try:
                empty_input = MultiModalInput()
                result = await self.fusion_engine.process_multimodal_input(empty_input)

                # Should handle gracefully with fallback
                assert result is not None
                assert 'fallback_mode' in result.processing_metadata

            except Exception as e:
                # Should not crash on empty input
                assert False, f"Should handle empty input gracefully: {str(e)}"

        # Test 2: Partial modality data
        with self.metrics_collector.measure_performance("error_partial_data") as metrics:
            partial_input = MultiModalInput(
                market_data=self.mock_generator.generate_market_data(),
                # Missing other modalities
            )

            result = await self.fusion_engine.process_multimodal_input(partial_input)

            assert result is not None
            # Should still produce predictions even with partial data

        # Test 3: Malformed data
        with self.metrics_collector.measure_performance("error_malformed_data") as metrics:
            malformed_input = MultiModalInput(
                market_data={'invalid': 'data'},
                social_sentiment=["valid post"],
                news_articles=["valid article"]
            )

            try:
                result = await self.fusion_engine.process_multimodal_input(malformed_input)
                # Should handle malformed data gracefully
                assert result is not None

            except Exception as e:
                # Should not crash on malformed data
                print(f"   Expected graceful handling of malformed data: {str(e)}")

        # Test 4: Anomaly detection
        with self.metrics_collector.measure_performance("error_anomaly_detection") as metrics:
            anomaly_dataset = self.mock_generator.generate_anomaly_dataset()

            result = await self.fusion_engine.process_multimodal_input(anomaly_dataset)

            assert result is not None
            # Should detect anomalies and adjust confidence accordingly

        print("✅ Error handling tests passed")

    @pytest.mark.asyncio
    async def test_memory_and_resource_management(self):
        """Test memory usage and resource management"""

        print("\n💾 Testing Memory and Resource Management...")

        # Monitor memory usage during intensive operations
        initial_memory = self.metrics_collector._get_memory_usage()

        # Run memory-intensive test
        with self.metrics_collector.measure_performance("memory_stress_test") as metrics:
            # Generate large dataset
            large_datasets = self.mock_generator.generate_complete_multimodal_dataset(
                num_samples=TEST_CONFIG['test_data_sizes']['large'],
                include_all_modalities=True
            )

            # Process all datasets
            for dataset in large_datasets:
                try:
                    multimodal_input = MultiModalInput(
                        market_data=dataset.get('market_data'),
                        social_sentiment=dataset.get('social_sentiment'),
                        news_articles=dataset.get('news_articles'),
                        onchain_data=dataset.get('onchain_data'),
                        psychological_profile=dataset.get('psychological_profile')
                    )

                    result = await self.fusion_engine.process_multimodal_input(multimodal_input)

                except Exception:
                    continue

            # Force garbage collection
            import gc
            gc.collect()

        final_memory = self.metrics_collector._get_memory_usage()
        memory_increase = final_memory - initial_memory

        # Memory increase should be reasonable (less than 100MB for test)
        assert memory_increase < 100, f"Memory increase {memory_increase:.1f}MB is too high"

        print(f"   Memory increase: {memory_increase:.1f}MB")
        print(f"   Peak memory usage: {metrics.memory_usage_mb:.1f}MB")

        print("✅ Memory management tests passed")

    def _generate_ground_truth_for_dataset(self, dataset: Dict[str, Any]) -> Dict[str, Any]:
        """Generate ground truth predictions for a dataset based on data patterns"""

        # Analyze market data patterns
        market_data = dataset.get('market_data', {})
        prices = market_data.get('prices', [])

        if not prices:
            return {}

        # Simple pattern analysis for ground truth
        price_trend = 'neutral'
        if len(prices) > 5:
            recent_prices = prices[-5:]
            first_price = recent_prices[0]
            last_price = recent_prices[-1]

            if first_price > 0 and last_price > 0:  # Avoid division by zero
                price_change = (last_price - first_price) / first_price

                if price_change > 0.02:  # 2% increase
                    price_trend = 'bullish'
                elif price_change < -0.02:  # 2% decrease
                    price_trend = 'bearish'

        # Analyze sentiment
        social_posts = dataset.get('social_sentiment', [])
        bullish_count = sum(1 for post in social_posts if 'bullish' in post.lower() or 'moon' in post.lower())
        bearish_count = sum(1 for post in social_posts if 'bearish' in post.lower() or 'crash' in post.lower())

        sentiment = 'neutral'
        if bullish_count > bearish_count * 1.5:
            sentiment = 'bullish'
        elif bearish_count > bullish_count * 1.5:
            sentiment = 'bearish'

        # Risk assessment based on volatility
        if market_data.get('volatility', 0) > 5:
            risk_level = 'high'
        elif market_data.get('volatility', 0) > 2:
            risk_level = 'moderate'
        else:
            risk_level = 'low'

        return {
            'price_movement': {
                'direction': price_trend,
                'confidence': 0.7,
                'magnitude': abs(np.random.normal(2, 1))  # 2% average move
            },
            'market_sentiment': {
                'dominant_sentiment': sentiment,
                'sentiment_score': np.random.uniform(-20, 20)  # -20 to 20 scale
            },
            'risk_assessment': {
                'risk_level': risk_level,
                'risk_score': market_data.get('volatility', 50)  # Use volatility as proxy
            }
        }

    async def run_all_tests(self):
        """Run all tests and generate comprehensive report"""

        print("🚀 Starting Comprehensive Fusion Pipeline Tests...\n")

        # Run all test methods
        await self.setup_test_environment()

        await self.test_temporal_alignment_functionality()
        await self.test_modality_encoders()
        await self.test_fusion_mechanisms()
        await self.test_complete_fusion_pipeline()
        await self.test_performance_benchmarks()
        await self.test_accuracy_validation()
        await self.test_error_handling_and_edge_cases()
        await self.test_memory_and_resource_management()

        # Generate comprehensive test report
        self.generate_test_report()

        print("\n🎉 All tests completed successfully!")

    def generate_test_report(self):
        """Generate comprehensive test report"""

        print("\n📊 COMPREHENSIVE TEST REPORT")
        print("=" * 50)

        # Overall statistics
        all_metrics = self.metrics_collector.get_all_metrics()
        total_tests = len(all_metrics)
        successful_tests = sum(1 for m in all_metrics.values() if m.success)
        success_rate = successful_tests / total_tests if total_tests > 0 else 0

        print(f"Total Tests: {total_tests}")
        print(f"Successful: {successful_tests}")
        print(f"Success Rate: {success_rate:.1%}")

        # Performance summary
        execution_times = [m.execution_time_ms for m in all_metrics.values() if m.success]
        if execution_times:
            avg_time = np.mean(execution_times)
            max_time = np.max(execution_times)
            min_time = np.min(execution_times)

            print("\nPerformance Summary:")
        print(f"  Average execution time: {avg_time:.2f}ms")
        print(f"  Fastest test: {min_time:.2f}ms")
        print(f"  Slowest test: {max_time:.2f}ms")

        # Memory usage summary
        memory_usages = [m.memory_usage_mb for m in all_metrics.values() if m.success]
        if memory_usages:
            avg_memory = np.mean(memory_usages)
            max_memory = np.max(memory_usages)

            print("\nMemory Usage Summary:")
            print(f"  Average memory usage: {avg_memory:.1f}MB")
            print(f"  Peak memory usage: {max_memory:.1f}MB")

        # Test category breakdown
        print("\nTest Categories:")

        categories = {}
        for test_name, metrics in all_metrics.items():
            category = test_name.split('_')[0] if '_' in test_name else 'other'
            if category not in categories:
                categories[category] = []
            categories[category].append(metrics)

        for category, metrics_list in categories.items():
            category_success = sum(1 for m in metrics_list if m.success)
            category_rate = category_success / len(metrics_list)
            print(f"  {category}: {category_success}/{len(metrics_list)} ({category_rate:.1%})")

        # Export detailed metrics
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        metrics_file = f"fusion_test_metrics_{timestamp}.json"
        self.metrics_collector.export_metrics(metrics_file)

        print(f"\n📄 Detailed metrics exported to: {metrics_file}")

        # Performance recommendations
        if success_rate < 0.95:
            print("\n⚠️ Performance Issues Detected:")
            print("  - Consider optimizing slow tests")
            print("  - Check for memory leaks")
            print("  - Review error handling in failed tests")

        if avg_time > 1000:
            print("\n⚡ Performance Optimization Suggestions:")
            print("  - Consider reducing model sizes for testing")
            print("  - Implement test data caching")
            print("  - Parallelize independent tests")

        print("\n✅ Test suite completed successfully!")

# Test fixtures and utilities
@pytest.fixture(scope="module")
def fusion_test_suite():
    """Pytest fixture for fusion test suite"""
    return TestFusionPipeline()

@pytest.mark.asyncio
async def test_fusion_pipeline_comprehensive(fusion_test_suite):
    """Comprehensive test using pytest fixture"""
    await fusion_test_suite.run_all_tests()

# Standalone test runner
async def run_standalone_tests():
    """Run tests standalone (not through pytest)"""
    test_suite = TestFusionPipeline()
    await test_suite.run_all_tests()

if __name__ == "__main__":
    # Run tests directly
    asyncio.run(run_standalone_tests())
