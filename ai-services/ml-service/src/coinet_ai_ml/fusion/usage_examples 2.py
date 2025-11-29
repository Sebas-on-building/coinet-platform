#!/usr/bin/env python3
"""
🚀 USAGE EXAMPLES - Multi-Modal Fusion Pipeline
==============================================

Comprehensive examples showing how to use Coinet's revolutionary
multi-modal fusion system for cryptocurrency market analysis.

🎯 EXAMPLES INCLUDED:
- Basic fusion pipeline usage
- Custom configuration and optimization
- Real-time data integration
- Performance monitoring and debugging
- Advanced fusion strategies
- API integration patterns

Run with: python usage_examples.py
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Import our fusion components (mock implementations for demo)
class MultiModalInput:
    """Input data for multi-modal fusion"""
    def __init__(self, market_data=None, social_sentiment=None, news_articles=None,
                 onchain_data=None, psychological_profile=None, timestamp=None, user_context=None):
        self.market_data = market_data
        self.social_sentiment = social_sentiment
        self.news_articles = news_articles
        self.onchain_data = onchain_data
        self.psychological_profile = psychological_profile
        self.timestamp = timestamp
        self.user_context = user_context

class MultiModalOutput:
    """Output from multi-modal fusion"""
    def __init__(self, fused_embedding, predictions, confidence_scores, modality_importance,
                 cross_modal_insights, processing_metadata, execution_time_ms):
        self.fused_embedding = fused_embedding
        self.predictions = predictions
        self.confidence_scores = confidence_scores
        self.modality_importance = modality_importance
        self.cross_modal_insights = cross_modal_insights
        self.processing_metadata = processing_metadata
        self.execution_time_ms = execution_time_ms

class MockMultiModalFusionEngine:
    """Mock implementation of the fusion engine for demonstration"""

    def __init__(self, config=None):
        self.config = config or self._get_default_config()
        self.performance_metrics = {
            'total_predictions': 0,
            'successful_fusions': 0,
            'average_confidence': 0.0,
            'execution_times': []
        }

    def _get_default_config(self):
        return {
            'temporal': {'window_sizes': [60, 300, 900]},
            'encoders': {'market': {}, 'social': {}, 'news': {}, 'onchain': {}, 'psychology': {}},
            'fusion': {'strategy': 'hybrid', 'embedding_dim': 512}
        }

    async def process_multimodal_input(self, input_data):
        """Process multi-modal input through the fusion pipeline"""

        # Simulate processing time
        await asyncio.sleep(0.1)

        # Mock fusion results
        return MultiModalOutput(
            fused_embedding=[0.1] * 512,  # Mock embedding
            predictions={
                'price_movement': {
                    'direction': 'bullish',
                    'confidence': 0.85,
                    'magnitude': 3.2
                },
                'market_sentiment': {
                    'dominant_sentiment': 'bullish',
                    'sentiment_score': 15.5,
                    'confidence': 0.78
                },
                'risk_assessment': {
                    'risk_level': 'moderate',
                    'risk_score': 45.0,
                    'confidence': 0.82
                }
            },
            confidence_scores={
                'price_movement': 0.85,
                'market_sentiment': 0.78,
                'risk_assessment': 0.82
            },
            modality_importance={
                'market': 0.35,
                'social': 0.25,
                'news': 0.20,
                'onchain': 0.15,
                'psychology': 0.05
            },
            cross_modal_insights={
                'synergies': ['Market + On-Chain correlation detected'],
                'contradictions': ['Social sentiment diverges from fundamentals']
            },
            processing_metadata={
                'modalities_processed': 5,
                'alignment_quality': 0.94,
                'fusion_strategy': 'hybrid'
            },
            execution_time_ms=1200.0
        )

class ExampleDataGenerator:
    """Generate example data for demonstrations"""

    def generate_market_data(self):
        """Generate realistic market data"""
        return {
            'prices': [45000, 45200, 44900, 45100, 45300, 45500, 45400, 45600, 45800, 46000],
            'volumes': [1500000, 1800000, 1200000, 1600000, 1900000, 2100000, 1800000, 2200000, 2400000, 2600000],
            'timestamps': [datetime.utcnow() - timedelta(minutes=i) for i in range(10)],
            'indicators': {
                'rsi': [65, 68, 62, 66, 69, 72, 70, 73, 75, 77],
                'macd': [120, 140, 100, 130, 150, 170, 160, 180, 200, 220]
            }
        }

    def generate_social_sentiment(self):
        """Generate social media sentiment data"""
        return [
            "🚀 BTC is going to the moon! Just bought more! #crypto #hodl",
            "Amazing fundamentals for Bitcoin. This is undervalued! 📈",
            "Whales are accumulating BTC. Major pump incoming! 💎🙌",
            "⚠️ BTC looking weak. Time to sell? #crypto",
            "Overvalued hype. BTC will crash soon. 📉"
        ]

    def generate_news_articles(self):
        """Generate news article data"""
        return [
            "Major Institutional Adoption: BlackRock Announces $500M Bitcoin Investment",
            "Regulatory Update: United States Clarifies Cryptocurrency Tax Policy for Bitcoin",
            "Technical Breakthrough: Bitcoin Network Achieves Record Transaction Speed",
            "Market Analysis: Experts Predict Bitcoin Could Reach $100K This Year"
        ]

    def generate_onchain_data(self):
        """Generate on-chain analytics data"""
        return {
            'nodes': [
                {'id': 'addr_1', 'type': 'whale', 'balance': 150.5},
                {'id': 'addr_2', 'type': 'retail', 'balance': 2.3},
                {'id': 'addr_3', 'type': 'exchange', 'balance': 5000.0}
            ],
            'edges': [
                {'source': 'addr_1', 'target': 'addr_3', 'amount': 50.0},
                {'source': 'addr_2', 'target': 'addr_1', 'amount': 1.5}
            ],
            'network_metrics': {
                'total_transactions': 1250,
                'active_addresses': 890,
                'total_volume': 125000.0
            }
        }

    def generate_psychological_profile(self):
        """Generate user psychological profile data"""
        return {
            'behavioral_patterns': {
                'risk_tolerance': 0.7,
                'trading_frequency': 'medium',
                'profit_taking_behavior': 'optimal'
            },
            'emotional_state': {
                'current_mood': 'optimistic',
                'confidence_level': 0.8,
                'stress_level': 0.3
            },
            'social_influence': {
                'herd_behavior_tendency': 0.6,
                'influencer_following': 3
            }
        }

async def example_1_basic_usage():
    """Example 1: Basic multi-modal fusion usage"""

    print("🎯 EXAMPLE 1: Basic Multi-Modal Fusion Usage")
    print("=" * 50)

    # Initialize the fusion engine
    engine = MockMultiModalFusionEngine()

    # Generate example data
    data_gen = ExampleDataGenerator()
    market_data = data_gen.generate_market_data()
    social_data = data_gen.generate_social_sentiment()
    news_data = data_gen.generate_news_articles()
    onchain_data = data_gen.generate_onchain_data()
    psych_data = data_gen.generate_psychological_profile()

    # Create multi-modal input
    input_data = MultiModalInput(
        market_data=market_data,
        social_sentiment=social_data,
        news_articles=news_data,
        onchain_data=onchain_data,
        psychological_profile=psych_data,
        timestamp=datetime.utcnow()
    )

    # Process through fusion pipeline
    result = await engine.process_multimodal_input(input_data)

    # Display results
    print(f"✅ Processing completed in {result.execution_time_ms:.1f}ms")
    print(f"📊 Fusion confidence: {result.confidence_scores.get('overall', 0):.3f}")
    print()

    print("💰 Price Movement Prediction:")
    price_pred = result.predictions['price_movement']
    print(f"   Direction: {price_pred['direction']}")
    print(f"   Confidence: {price_pred['confidence']:.3f}")
    print(f"   Magnitude: {price_pred['magnitude']:.1f}%")
    print()

    print("📊 Market Sentiment Prediction:")
    sentiment_pred = result.predictions['market_sentiment']
    print(f"   Dominant Sentiment: {sentiment_pred['dominant_sentiment']}")
    print(f"   Sentiment Score: {sentiment_pred['sentiment_score']:+.1f}")
    print(f"   Confidence: {sentiment_pred['confidence']:.3f}")
    print()

    print("⚠️ Risk Assessment:")
    risk_pred = result.predictions['risk_assessment']
    print(f"   Risk Level: {risk_pred['risk_level']}")
    print(f"   Risk Score: {risk_pred['risk_score']:.1f}")
    print(f"   Confidence: {risk_pred['confidence']:.3f}")
    print()

    return result

async def example_2_advanced_configuration():
    """Example 2: Advanced configuration and optimization"""

    print("🎯 EXAMPLE 2: Advanced Configuration & Optimization")
    print("=" * 50)

    # Custom configuration for high-frequency trading
    config = {
        'temporal': {
            'window_sizes': [15, 60, 300],  # Shorter windows for HFT
            'latency_compensation': True,
            'quality_threshold': 0.9
        },
        'encoders': {
            'market': {
                'cnn_layers': [64, 128, 256, 512, 1024],
                'attention_heads': 16,
                'dropout': 0.05
            },
            'social': {
                'transformer_layers': 12,
                'embedding_dim': 1024,
                'attention_heads': 16
            }
        },
        'fusion': {
            'strategy': 'hybrid',
            'embedding_dim': 1024,
            'attention_heads': 16,
            'dropout': 0.05
        }
    }

    engine = MockMultiModalFusionEngine(config)

    # Generate high-frequency data
    data_gen = ExampleDataGenerator()
    market_data = data_gen.generate_market_data()  # More frequent updates
    social_data = data_gen.generate_social_sentiment()[:10]  # Recent posts only

    input_data = MultiModalInput(
        market_data=market_data,
        social_sentiment=social_data,
        timestamp=datetime.utcnow()
    )

    result = await engine.process_multimodal_input(input_data)

    print("⚡ High-Frequency Trading Configuration:")
    print(f"   Temporal windows: {config['temporal']['window_sizes']}")
    print(f"   CNN layers: {config['encoders']['market']['cnn_layers']}")
    print(f"   Fusion strategy: {config['fusion']['strategy']}")
    print()

    print(f"🎯 Optimized Results:")
    print(f"   Processing time: {result.execution_time_ms:.1f}ms")
    print(f"   Modalities processed: {result.processing_metadata['modalities_processed']}")
    print(f"   Alignment quality: {result.processing_metadata['alignment_quality']:.3f}")
    print()

    return result

async def example_3_real_time_integration():
    """Example 3: Real-time data integration and streaming"""

    print("🎯 EXAMPLE 3: Real-Time Integration & Streaming")
    print("=" * 50)

    engine = MockMultiModalFusionEngine()

    # Simulate real-time data streams
    data_streams = {
        'market': [],
        'social': [],
        'news': []
    }

    # Simulate streaming data updates
    for i in range(5):
        # Add new market data point
        base_price = 45000 + i * 100
        data_streams['market'].append({
            'price': base_price + (i % 3 - 1) * 50,  # Small fluctuations
            'volume': 1000000 + i * 100000,
            'timestamp': datetime.utcnow() - timedelta(minutes=5-i)
        })

        # Add new social post
        posts = [
            f"BTC at ${base_price} - holding strong! 🚀",
            f"Market looking bullish at ${base_price} 📈",
            f"Careful at ${base_price} - potential pullback 📉"
        ]
        data_streams['social'].append(posts[i % 3])

        # Simulate processing each update
        input_data = MultiModalInput(
            market_data={'prices': [d['price'] for d in data_streams['market']]},
            social_sentiment=data_streams['social'],
            timestamp=datetime.utcnow()
        )

        result = await engine.process_multimodal_input(input_data)

        print(f"📈 Update {i+1}: Price ${result.predictions['price_movement']['magnitude']:.0f} {result.predictions['price_movement']['direction']}")
        print(f"   Confidence: {result.confidence_scores.get('price_movement', 0):.3f}")
        print()

        # Small delay to simulate real-time processing
        await asyncio.sleep(0.1)

    print("🎯 Real-time processing completed successfully!")
    print()

    return result

async def example_4_performance_monitoring():
    """Example 4: Performance monitoring and optimization"""

    print("🎯 EXAMPLE 4: Performance Monitoring & Optimization")
    print("=" * 50)

    engine = MockMultiModalFusionEngine()

    # Run multiple analyses to gather performance metrics
    results = []
    for i in range(10):
        data_gen = ExampleDataGenerator()
        input_data = MultiModalInput(
            market_data=data_gen.generate_market_data(),
            social_sentiment=data_gen.generate_social_sentiment()[:5],  # Limit for speed
            timestamp=datetime.utcnow()
        )

        result = await engine.process_multimodal_input(input_data)
        results.append(result)

        print(f"Analysis {i+1}: {result.execution_time_ms:.1f}ms, Confidence: {result.confidence_scores.get('overall', 0):.3f}")

    # Calculate performance statistics
    execution_times = [r.execution_time_ms for r in results]
    confidences = [r.confidence_scores.get('overall', 0) for r in results]

    print()
    print("📊 Performance Summary:")
    print(f"   Average execution time: {sum(execution_times)/len(execution_times):.1f}ms")
    print(f"   Average confidence: {sum(confidences)/len(confidences):.3f}")
    print(f"   Min/Max execution time: {min(execution_times):.1f}ms / {max(execution_times):.1f}ms")
    print(f"   Success rate: {len(results)}/10 (100%)")
    print()

    return results

async def example_5_api_integration():
    """Example 5: API integration patterns"""

    print("🎯 EXAMPLE 5: API Integration Patterns")
    print("=" * 50)

    # Simulate API request/response pattern
    def create_api_request(token_symbol: str, user_id: str = None):
        """Create API request structure"""
        return {
            'token_symbol': token_symbol,
            'time_window_minutes': 15,
            'include_psychology': user_id is not None,
            'user_id': user_id,
            'modalities': ['market', 'social', 'news', 'onchain', 'psychology']
        }

    async def simulate_api_response(request):
        """Simulate API response processing"""
        engine = MockMultiModalFusionEngine()

        # Gather data (in real implementation, this would call external services)
        data_gen = ExampleDataGenerator()
        multimodal_data = {
            'market': data_gen.generate_market_data(),
            'social': data_gen.generate_social_sentiment(),
            'news': data_gen.generate_news_articles(),
            'onchain': data_gen.generate_onchain_data(),
            'psychology': data_gen.generate_psychological_profile() if request['include_psychology'] else None
        }

        input_data = MultiModalInput(
            market_data=multimodal_data.get('market'),
            social_sentiment=multimodal_data.get('social'),
            news_articles=multimodal_data.get('news'),
            onchain_data=multimodal_data.get('onchain'),
            psychological_profile=multimodal_data.get('psychology'),
            timestamp=datetime.utcnow()
        )
        result = await engine.process_multimodal_input(input_data)

        # Format API response
        return {
            'token_symbol': request['token_symbol'],
            'timestamp': datetime.utcnow().isoformat(),
            'predictions': result.predictions,
            'confidence_scores': result.confidence_scores,
            'modality_importance': result.modality_importance,
            'cross_modal_insights': result.cross_modal_insights,
            'processing_metadata': result.processing_metadata,
            'execution_time_ms': result.execution_time_ms
        }

    # Simulate API calls
    requests = [
        create_api_request('BTC'),
        create_api_request('ETH'),
        create_api_request('BTC', user_id='user_123')  # With psychology
    ]

    print("🔗 Simulating API requests...")
    for i, request in enumerate(requests, 1):
        print(f"\n📡 Request {i}: {request['token_symbol']}")
        if request['user_id']:
            print(f"   User ID: {request['user_id']}")
            print(f"   Psychology: {'Included' if request['include_psychology'] else 'Excluded'}")

        response = await simulate_api_response(request)
        print(f"   ⏱️ Processing time: {response['execution_time_ms']:.1f}ms")
        print(f"   🎯 Confidence: {response['confidence_scores'].get('overall', 0):.3f}")

    print()
    print("✅ API integration simulation complete!")
    print()

    return requests

async def example_6_batch_processing():
    """Example 6: Batch processing for multiple tokens"""

    print("🎯 EXAMPLE 6: Batch Processing for Multiple Tokens")
    print("=" * 50)

    engine = MockMultiModalFusionEngine()

    # Batch processing for multiple tokens
    tokens = ['BTC', 'ETH', 'ADA', 'DOT', 'LINK']
    batch_results = []

    print(f"🔄 Processing batch of {len(tokens)} tokens...")

    for token in tokens:
        data_gen = ExampleDataGenerator()
        input_data = MultiModalInput(
            market_data=data_gen.generate_market_data(),
            social_sentiment=data_gen.generate_social_sentiment()[:3],
            news_articles=data_gen.generate_news_articles()[:2],
            onchain_data=data_gen.generate_onchain_data(),
            psychological_profile=data_gen.generate_psychological_profile(),
            timestamp=datetime.utcnow()
        )

        result = await engine.process_multimodal_input(input_data)
        batch_results.append({
            'token': token,
            'result': result
        })

        print(f"   ✅ {token}: {result.execution_time_ms:.1f}ms, Confidence: {result.confidence_scores.get('overall', 0):.3f}")

    print()
    print("📊 Batch Processing Summary:")
    print(f"   Tokens processed: {len(batch_results)}")
    print(f"   Average processing time: {sum(r['result'].execution_time_ms for r in batch_results)/len(batch_results):.1f}ms")
    print(f"   Average confidence: {sum(r['result'].confidence_scores.get('overall', 0) for r in batch_results)/len(batch_results):.3f}")

    # Analyze cross-token correlations
    confidences = [r['result'].confidence_scores.get('overall', 0) for r in batch_results]
    print(f"   Confidence range: {min(confidences):.3f} - {max(confidences):.3f}")
    print()

    return batch_results

async def main():
    """Run all usage examples"""

    print("🚀 COINET AI - MULTI-MODAL FUSION PIPELINE EXAMPLES")
    print("=" * 65)
    print()
    print("This comprehensive example suite demonstrates how to use Coinet's")
    print("revolutionary multi-modal fusion system for cryptocurrency analysis.")
    print()

    # Run all examples
    examples = [
        example_1_basic_usage,
        example_2_advanced_configuration,
        example_3_real_time_integration,
        example_4_performance_monitoring,
        example_5_api_integration,
        example_6_batch_processing
    ]

    results = {}
    for i, example_func in enumerate(examples, 1):
        print(f"\n{'='*20} EXAMPLE {i} {'='*20}")
        try:
            result = await example_func()
            results[f'example_{i}'] = result
            print(f"✅ Example {i} completed successfully")
        except Exception as e:
            print(f"❌ Example {i} failed: {e}")
        print()

    # Save comprehensive results
    with open('usage_examples_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.utcnow().isoformat(),
            'examples_run': len(examples),
            'results': results
        }, f, indent=2, default=str)

    print("📄 Complete results saved to: usage_examples_results.json")
    print()
    print("🎉 ALL EXAMPLES COMPLETED!")
    print("=" * 65)
    print()
    print("🚀 NEXT STEPS:")
    print("   1. Install ML dependencies (torch, pandas, psutil) for full functionality")
    print("   2. Run the web interface: open web_interface.html in your browser")
    print("   3. Test the actual fusion pipeline with real market data")
    print("   4. Integrate with live data sources for production use")
    print()
    print("💡 For production deployment, refer to FUSION_PIPELINE_README.md")

if __name__ == "__main__":
    # Run all examples
    asyncio.run(main())
