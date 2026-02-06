"""
🔥 MULTI-MODAL FUSION ENGINE - THE DIVINE INTEGRATOR
====================================================

The crown jewel of Coinet AI - a revolutionary multi-modal fusion system
that integrates market data, social sentiment, news articles, on-chain analytics,
and user psychological profiles into a unified, intelligent prediction system.

This engine orchestrates:
- Temporal alignment for real-time synchronization
- Separate encoders for each modality (CNN, Transformer, GNN, Psychology)
- Advanced fusion mechanisms for joint representation learning
- Cross-modal attention and correlation analysis

"True intelligence emerges not from isolated analysis, but from the
harmonious integration of diverse perspectives." - Multi-Modal AI Philosophy
"""

import asyncio
import logging
from typing import Dict, List, Optional, Tuple, Union, Any
from datetime import datetime, timedelta
import numpy as np
import torch
import torch.nn as nn
from dataclasses import dataclass

from .encoders import (
    CNNEncoder, TransformerEncoder, GNNEncoder, PsychologyEncoder, EncodedFeatures
)
from .temporal_alignment import TemporalAligner, TemporalSignal, AlignedSignal
from .fusion_mechanisms import MultiModalFusionMechanisms, FusionResult

logger = logging.getLogger(__name__)

@dataclass
class MultiModalInput:
    """Input data for multi-modal fusion"""
    market_data: Optional[Dict] = None
    social_sentiment: Optional[List[str]] = None
    news_articles: Optional[List[str]] = None
    onchain_data: Optional[Dict] = None
    psychological_profile: Optional[Dict] = None
    timestamp: Optional[datetime] = None
    user_context: Optional[Dict] = None

@dataclass
class MultiModalOutput:
    """Output from multi-modal fusion"""
    fused_embedding: torch.Tensor
    predictions: Dict[str, Any]
    confidence_scores: Dict[str, float]
    modality_importance: Dict[str, float]
    cross_modal_insights: Dict[str, Any]
    processing_metadata: Dict[str, Any]
    execution_time_ms: float

class MultiModalFusionEngine:
    """
    🔥 THE DIVINE MULTI-MODAL FUSION ENGINE

    This is the pinnacle of Coinet AI - an unprecedented system that
    seamlessly integrates multiple data modalities to achieve godlike
    market intelligence and prediction accuracy.

    ARCHITECTURE OVERVIEW:
    1. Temporal Alignment: Synchronize all data streams in time
    2. Modality Encoding: Extract rich representations from each modality
    3. Cross-Modal Fusion: Learn joint representations across modalities
    4. Unified Prediction: Generate holistic insights and predictions

    KEY INNOVATIONS:
    - Real-time temporal synchronization across heterogeneous data sources
    - Advanced neural encoders for each modality type
    - Cross-modal attention mechanisms for joint learning
    - Dynamic modality weighting based on relevance and quality
    - Continuous learning and adaptation to market conditions
    """

    def __init__(self, config: Optional[Dict] = None):
        """Initialize the divine multi-modal fusion engine"""

        self.config = self._get_default_config()
        if config:
            # Deep merge the provided config with defaults
            self._merge_config(self.config, config)

        # Initialize core components
        self.temporal_aligner = TemporalAligner(self.config.get('temporal', {}))
        self.fusion_mechanisms = MultiModalFusionMechanisms(self.config.get('fusion', {}))

        # Initialize modality encoders
        self.encoders = {
            'market': CNNEncoder(self.config.get('encoders', {}).get('market', {})),
            'social': TransformerEncoder(self.config.get('encoders', {}).get('social', {})),
            'news': TransformerEncoder(self.config.get('encoders', {}).get('news', {})),
            'onchain': GNNEncoder(self.config.get('encoders', {}).get('onchain', {})),
            'psychology': PsychologyEncoder(self.config.get('encoders', {}).get('psychology', {}))
        }

        # Prediction heads for different tasks
        self.prediction_heads = self._initialize_prediction_heads()

        # Performance tracking
        self.performance_metrics = {
            'total_predictions': 0,
            'successful_fusions': 0,
            'average_confidence': 0.0,
            'modality_success_rates': {},
            'execution_times': []
        }

        # Adaptive learning components
        self.adaptive_weights = self._initialize_adaptive_weights()

        logger.info("🔥 MultiModalFusionEngine initialized with divine perfection")

    async def initialize(self):
        """Initialize all components of the fusion engine"""

        logger.info("🚀 Initializing MultiModalFusionEngine components...")

        # Initialize encoders
        init_tasks = [encoder.initialize() for encoder in self.encoders.values()]
        await asyncio.gather(*init_tasks)

        # Initialize fusion mechanisms
        # (Already initialized in constructor)

        logger.info("✅ All MultiModalFusionEngine components initialized successfully")

    async def process_multimodal_input(self, input_data: MultiModalInput) -> MultiModalOutput:
        """
        🎯 MASTER MULTI-MODAL PROCESSING

        The divine orchestration function that processes multi-modal input
        through the complete fusion pipeline.

        Args:
            input_data: Multi-modal input containing data from all sources

        Returns:
            Comprehensive multi-modal analysis and predictions
        """

        start_time = datetime.utcnow()

        try:
            # Step 1: Temporal Alignment
            logger.info("⏰ Step 1: Temporal Alignment")
            aligned_signals = await self._align_temporal_signals(input_data)

            # Step 2: Modality Encoding
            logger.info("🔢 Step 2: Modality Encoding")
            encoded_features = await self._encode_modalities(input_data, aligned_signals)

            # Step 3: Cross-Modal Fusion
            logger.info("🔗 Step 3: Cross-Modal Fusion")
            fusion_result = await self._fuse_modality_embeddings(encoded_features)

            # Step 4: Unified Prediction
            logger.info("🎯 Step 4: Unified Prediction")
            predictions = await self._generate_unified_predictions(fusion_result)

            # Step 5: Confidence Assessment
            logger.info("📊 Step 5: Confidence Assessment")
            confidence_scores = self._assess_prediction_confidence(fusion_result, predictions)

            # Step 6: Cross-Modal Insights
            logger.info("💡 Step 6: Cross-Modal Insights")
            cross_modal_insights = await self._generate_cross_modal_insights(fusion_result)

            # Step 7: Adaptive Learning Update
            logger.info("🧠 Step 7: Adaptive Learning")
            await self._update_adaptive_weights(fusion_result, predictions)

            # Calculate execution time
            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000

            # Update performance metrics
            await self._update_performance_metrics(fusion_result, execution_time)

            return MultiModalOutput(
                fused_embedding=fusion_result.fused_embedding,
                predictions=predictions,
                confidence_scores=confidence_scores,
                modality_importance=fusion_result.modality_importance,
                cross_modal_insights=cross_modal_insights,
                processing_metadata={
                    'temporal_alignment_quality': aligned_signals.get('alignment_quality', 0.0),
                    'encoding_success_rate': self._calculate_encoding_success_rate(encoded_features),
                    'fusion_strategy_used': self.config['fusion']['fusion_strategy'],
                    'num_modalities_processed': len([k for k, v in encoded_features.items() if v is not None])
                },
                execution_time_ms=execution_time
            )

        except Exception as e:
            logger.error(f"❌ Multi-modal processing failed: {str(e)}")

            # Return fallback output
            return await self._generate_fallback_output(input_data, start_time)

    async def _align_temporal_signals(self, input_data: MultiModalInput) -> Dict[str, Any]:
        """Align temporal signals from all modalities"""

        # Convert input data to temporal signals
        temporal_signals = {}

        if input_data.market_data:
            # Market data signals (high frequency)
            market_signals = [
                TemporalSignal(
                    timestamp=input_data.timestamp or datetime.utcnow(),
                    value=input_data.market_data,
                    modality='market_data',
                    confidence=0.9,
                    latency_ms=100  # Low latency for market data
                )
            ]
            temporal_signals['market_data'] = market_signals

        if input_data.social_sentiment:
            # Social sentiment signals (medium frequency)
            social_signals = [
                TemporalSignal(
                    timestamp=input_data.timestamp or datetime.utcnow(),
                    value=text,
                    modality='social_sentiment',
                    confidence=0.7,
                    latency_ms=3000  # Higher latency for social data
                ) for text in input_data.social_sentiment
            ]
            temporal_signals['social_sentiment'] = social_signals

        if input_data.news_articles:
            # News signals (low frequency)
            news_signals = [
                TemporalSignal(
                    timestamp=input_data.timestamp or datetime.utcnow(),
                    value=article,
                    modality='news_articles',
                    confidence=0.8,
                    latency_ms=10000  # High latency for news processing
                ) for article in input_data.news_articles
            ]
            temporal_signals['news_articles'] = news_signals

        if input_data.onchain_data:
            # On-chain signals (low frequency)
            onchain_signals = [
                TemporalSignal(
                    timestamp=input_data.timestamp or datetime.utcnow(),
                    value=input_data.onchain_data,
                    modality='onchain_analytics',
                    confidence=0.6,
                    latency_ms=5000  # Medium latency for on-chain data
                )
            ]
            temporal_signals['onchain_analytics'] = onchain_signals

        if input_data.psychological_profile:
            # Psychology signals (very low frequency)
            psych_signals = [
                TemporalSignal(
                    timestamp=input_data.timestamp or datetime.utcnow(),
                    value=input_data.psychological_profile,
                    modality='psychological_profiles',
                    confidence=0.8,
                    latency_ms=1000  # Low latency for psychology data
                )
            ]
            temporal_signals['psychological_profiles'] = psych_signals

        # Perform temporal alignment
        aligned_result = await self.temporal_aligner.align_signals(temporal_signals)

        return {
            'aligned_signals': aligned_result,
            'alignment_quality': np.mean([signal.alignment_quality for signal in aligned_result.values()]),
            'modalities_present': list(aligned_result.keys())
        }

    async def _encode_modalities(self,
                               input_data: MultiModalInput,
                               aligned_signals: Dict[str, Any]) -> Dict[str, EncodedFeatures]:
        """Encode each modality into feature representations"""

        encoded_features = {}

        # Encode market data (visual/charts)
        if input_data.market_data and 'market_data' in aligned_signals['modalities_present']:
            try:
                market_features = await self.encoders['market'].encode(input_data.market_data)
                encoded_features['market'] = market_features
                logger.info(f"✅ Market data encoded in {market_features.encoding_time_ms:.2f}ms")
            except Exception as e:
                logger.warning(f"⚠️ Market encoding failed: {str(e)}")
                encoded_features['market'] = None

        # Encode social sentiment (text)
        if input_data.social_sentiment and 'social_sentiment' in aligned_signals['modalities_present']:
            try:
                social_features = await self.encoders['social'].encode(input_data.social_sentiment)
                encoded_features['social'] = social_features
                logger.info(f"✅ Social sentiment encoded in {social_features.encoding_time_ms:.2f}ms")
            except Exception as e:
                logger.warning(f"⚠️ Social encoding failed: {str(e)}")
                encoded_features['social'] = None

        # Encode news articles (text)
        if input_data.news_articles and 'news_articles' in aligned_signals['modalities_present']:
            try:
                news_features = await self.encoders['news'].encode(input_data.news_articles)
                encoded_features['news'] = news_features
                logger.info(f"✅ News articles encoded in {news_features.encoding_time_ms:.2f}ms")
            except Exception as e:
                logger.warning(f"⚠️ News encoding failed: {str(e)}")
                encoded_features['news'] = None

        # Encode on-chain data (graph)
        if input_data.onchain_data and ('onchain_analytics' in aligned_signals['modalities_present'] or 'onchain_data' in aligned_signals['modalities_present']):
            try:
                onchain_features = await self.encoders['onchain'].encode(input_data.onchain_data)
                encoded_features['onchain'] = onchain_features
                logger.info(f"✅ On-chain data encoded in {onchain_features.encoding_time_ms:.2f}ms")
            except Exception as e:
                logger.warning(f"⚠️ On-chain encoding failed: {str(e)}")
                encoded_features['onchain'] = None

        # Encode psychological profile (structured)
        if input_data.psychological_profile and ('psychological_profiles' in aligned_signals['modalities_present'] or 'psychological_profile' in aligned_signals['modalities_present']):
            try:
                psych_features = await self.encoders['psychology'].encode(input_data.psychological_profile)
                encoded_features['psychology'] = psych_features
                logger.info(f"✅ Psychology profile encoded in {psych_features.encoding_time_ms:.2f}ms")
            except Exception as e:
                logger.warning(f"⚠️ Psychology encoding failed: {str(e)}")
                encoded_features['psychology'] = None

        return encoded_features

    async def _fuse_modality_embeddings(self, encoded_features: Dict[str, EncodedFeatures]) -> FusionResult:
        """Fuse encoded features using advanced mechanisms"""

        # Filter out failed encodings
        valid_features = {
            modality: features.embedding for modality, features in encoded_features.items()
            if features is not None and features.embedding is not None
        }

        if not valid_features:
            raise ValueError("No valid modality encodings available for fusion")

        # Perform fusion using configured strategy
        fusion_strategy = self.config['fusion']['fusion_strategy']

        fusion_result = await self.fusion_mechanisms.fuse_modalities(
            valid_features, fusion_strategy
        )

        logger.info(f"🔗 Modality fusion completed with confidence {fusion_result.fusion_confidence:.3f}")

        return fusion_result

    async def _generate_unified_predictions(self, fusion_result: FusionResult) -> Dict[str, Any]:
        """Generate predictions using the fused representation"""

        predictions = {}

        # Price movement prediction
        price_prediction = await self._predict_price_movement(fusion_result)
        predictions['price_movement'] = price_prediction

        # Market sentiment prediction
        sentiment_prediction = await self._predict_market_sentiment(fusion_result)
        predictions['market_sentiment'] = sentiment_prediction

        # Risk assessment
        risk_assessment = await self._assess_market_risk(fusion_result)
        predictions['risk_assessment'] = risk_assessment

        # Trading opportunities
        opportunities = await self._identify_trading_opportunities(fusion_result)
        predictions['trading_opportunities'] = opportunities

        # Market regime classification
        regime_classification = await self._classify_market_regime(fusion_result)
        predictions['market_regime'] = regime_classification

        return predictions

    async def _predict_price_movement(self, fusion_result: FusionResult) -> Dict[str, Any]:
        """Predict price movement using fused embeddings"""

        # Use price prediction head
        price_logits = self.prediction_heads['price_movement'](fusion_result.fused_embedding)

        # Convert to probabilities
        price_probs = torch.softmax(price_logits, dim=-1)

        return {
            'direction': ['strong_bullish', 'bullish', 'neutral', 'bearish', 'strong_bearish'][price_probs.argmax().item()],
            'confidence': price_probs.max().item(),
            'magnitude': abs(price_logits.squeeze().mean().item()) * 100,  # Approximate percentage
            'timeframes': {
                '1h': price_probs[0].item(),
                '6h': price_probs[1].item(),
                '24h': price_probs[2].item(),
                '7d': price_probs[3].item()
            }
        }

    async def _predict_market_sentiment(self, fusion_result: FusionResult) -> Dict[str, Any]:
        """Predict overall market sentiment"""

        sentiment_logits = self.prediction_heads['market_sentiment'](fusion_result.fused_embedding)
        sentiment_probs = torch.softmax(sentiment_logits, dim=-1)

        sentiment_labels = ['extreme_fear', 'fear', 'neutral', 'greed', 'extreme_greed']
        dominant_sentiment = sentiment_labels[sentiment_probs.argmax().item()]

        return {
            'dominant_sentiment': dominant_sentiment,
            'sentiment_score': (sentiment_probs.argmax().item() - 2) * 25,  # Convert to -50 to 50 scale
            'confidence': sentiment_probs.max().item(),
            'breakdown': {
                label: prob.item() for label, prob in zip(sentiment_labels, sentiment_probs)
            }
        }

    async def _assess_market_risk(self, fusion_result: FusionResult) -> Dict[str, Any]:
        """Assess overall market risk"""

        risk_logits = self.prediction_heads['risk_assessment'](fusion_result.fused_embedding)
        risk_score = torch.sigmoid(risk_logits).squeeze().item() * 100  # Convert to 0-100 scale

        # Risk level classification
        if risk_score < 25:
            risk_level = 'low'
        elif risk_score < 50:
            risk_level = 'moderate'
        elif risk_score < 75:
            risk_level = 'high'
        else:
            risk_level = 'extreme'

        return {
            'risk_score': risk_score,
            'risk_level': risk_level,
            'risk_factors': self._identify_risk_factors(fusion_result),
            'volatility_forecast': risk_score * 1.5,  # Rough estimate
            'confidence': min(1.0, risk_score / 50)  # Higher risk = higher confidence in assessment
        }

    async def _identify_trading_opportunities(self, fusion_result: FusionResult) -> List[Dict[str, Any]]:
        """Identify potential trading opportunities"""

        # Use opportunity detection head
        opportunity_logits = self.prediction_heads['trading_opportunities'](fusion_result.fused_embedding)
        opportunity_scores = torch.softmax(opportunity_logits, dim=-1)

        opportunities = []

        # Define opportunity types
        opportunity_types = [
            'breakout_continuation',
            'reversal_pattern',
            'momentum_trade',
            'mean_reversion',
            'volatility_expansion'
        ]

        for i, (opp_type, score) in enumerate(zip(opportunity_types, opportunity_scores)):
            if score > 0.3:  # Threshold for significant opportunities
                opportunities.append({
                    'type': opp_type,
                    'confidence': score.item(),
                    'expected_return': score.item() * 20,  # Rough estimate
                    'risk_reward_ratio': min(3.0, score.item() * 5),  # Higher confidence = better ratio
                    'timeframe': ['short', 'medium', 'long'][min(i, 2)],
                    'modality_drivers': self._identify_opportunity_drivers(fusion_result, opp_type)
                })

        return sorted(opportunities, key=lambda x: x['confidence'], reverse=True)[:5]  # Top 5

    async def _classify_market_regime(self, fusion_result: FusionResult) -> Dict[str, Any]:
        """Classify current market regime"""

        regime_logits = self.prediction_heads['market_regime'](fusion_result.fused_embedding)
        regime_probs = torch.softmax(regime_logits, dim=-1)

        regime_types = [
            'bull_market',
            'bear_market',
            'sideways_consolidation',
            'high_volatility',
            'distribution_phase',
            'accumulation_phase'
        ]

        dominant_regime = regime_types[regime_probs.argmax().item()]

        return {
            'current_regime': dominant_regime,
            'confidence': regime_probs.max().item(),
            'regime_probabilities': {
                regime: prob.item() for regime, prob in zip(regime_types, regime_probs)
            },
            'expected_duration_days': self._estimate_regime_duration(dominant_regime),
            'transition_probability': 0.1  # Placeholder - would be learned
        }

    def _assess_prediction_confidence(self,
                                    fusion_result: FusionResult,
                                    predictions: Dict[str, Any]) -> Dict[str, float]:
        """Assess confidence in each prediction type"""

        base_confidence = fusion_result.fusion_confidence

        confidence_scores = {}

        # Base confidence from fusion quality
        for prediction_type in predictions.keys():
            confidence_scores[prediction_type] = base_confidence

            # Adjust based on modality agreement
            modality_agreement = self._calculate_modality_agreement(fusion_result, prediction_type)
            confidence_scores[prediction_type] *= (0.8 + 0.2 * modality_agreement)

            # Adjust based on cross-modal correlations
            correlation_bonus = np.mean(list(fusion_result.cross_modal_correlations.values()))
            confidence_scores[prediction_type] *= (0.9 + 0.1 * correlation_bonus)

        return confidence_scores

    async def _generate_cross_modal_insights(self, fusion_result: FusionResult) -> Dict[str, Any]:
        """Generate insights from cross-modal analysis"""

        insights = {
            'modality_synergies': self._identify_modality_synergies(fusion_result),
            'contradictory_signals': self._identify_contradictory_signals(fusion_result),
            'emerging_patterns': self._identify_emerging_patterns(fusion_result),
            'anomaly_detection': self._detect_anomalies(fusion_result),
            'confidence_factors': self._analyze_confidence_factors(fusion_result)
        }

        return insights

    def _initialize_prediction_heads(self) -> nn.ModuleDict:
        """Initialize prediction heads for different tasks"""

        embed_dim = self.config['fusion']['embed_dim']

        return nn.ModuleDict({
            'price_movement': nn.Sequential(
                nn.Linear(embed_dim, embed_dim // 2),
                nn.ReLU(),
                nn.Dropout(0.1),
                nn.Linear(embed_dim // 2, 5)  # 5 price movement categories
            ),
            'market_sentiment': nn.Sequential(
                nn.Linear(embed_dim, embed_dim // 2),
                nn.ReLU(),
                nn.Dropout(0.1),
                nn.Linear(embed_dim // 2, 5)  # 5 sentiment levels
            ),
            'risk_assessment': nn.Sequential(
                nn.Linear(embed_dim, embed_dim // 2),
                nn.ReLU(),
                nn.Dropout(0.1),
                nn.Linear(embed_dim // 2, 1)  # Single risk score
            ),
            'trading_opportunities': nn.Sequential(
                nn.Linear(embed_dim, embed_dim // 2),
                nn.ReLU(),
                nn.Dropout(0.1),
                nn.Linear(embed_dim // 2, 5)  # 5 opportunity types
            ),
            'market_regime': nn.Sequential(
                nn.Linear(embed_dim, embed_dim // 2),
                nn.ReLU(),
                nn.Dropout(0.1),
                nn.Linear(embed_dim // 2, 6)  # 6 market regime types
            )
        })

    def _initialize_adaptive_weights(self) -> Dict[str, Dict[str, float]]:
        """Initialize adaptive learning weights with proper structure"""

        return {
            'modality_weights': {
                'market': 1.0,
                'social': 1.0,
                'news': 1.0,
                'onchain': 1.0,
                'psychology': 1.0
            },
            'fusion_strategy_weights': {
                'attention': 1.0,
                'joint_embedding': 1.0,
                'transformer': 1.0,
                'hybrid': 1.0
            },
            'prediction_weights': {
                'price_movement': 1.0,
                'market_sentiment': 1.0,
                'risk_assessment': 1.0,
                'trading_opportunities': 1.0,
                'market_regime': 1.0
            },
            'performance_history': [],  # Track performance over time
            'last_update': None
        }

    def _calculate_encoding_success_rate(self, encoded_features: Dict[str, EncodedFeatures]) -> float:
        """Calculate success rate of modality encoding"""

        if not encoded_features:
            return 0.0

        successful_encodings = sum(1 for features in encoded_features.values() if features is not None)
        return successful_encodings / len(encoded_features)

    def _calculate_modality_agreement(self, fusion_result: FusionResult, prediction_type: str) -> float:
        """Calculate agreement between modalities for a prediction type"""

        # This would analyze how much modalities agree on the prediction
        # For now, return a placeholder based on cross-modal correlations
        return np.mean(list(fusion_result.cross_modal_correlations.values()))

    def _identify_risk_factors(self, fusion_result: FusionResult) -> List[str]:
        """Identify key risk factors from fusion analysis"""

        risk_factors = []

        # High volatility risk
        if fusion_result.cross_modal_correlations.get('market_onchain', 0) < 0.3:
            risk_factors.append('market_onchain_divergence')

        # Sentiment extremes
        if fusion_result.modality_importance.get('social', 0) > 0.4:
            risk_factors.append('extreme_social_sentiment')

        # News impact
        if fusion_result.modality_importance.get('news', 0) > 0.3:
            risk_factors.append('significant_news_impact')

        return risk_factors[:3]  # Return top 3

    def _identify_opportunity_drivers(self, fusion_result: FusionResult, opportunity_type: str) -> List[str]:
        """Identify which modalities are driving a trading opportunity"""

        drivers = []

        # Analyze modality importance for this opportunity type
        if opportunity_type == 'breakout_continuation':
            if fusion_result.modality_importance.get('market', 0) > 0.3:
                drivers.append('strong_technical_signals')
            if fusion_result.modality_importance.get('onchain', 0) > 0.2:
                drivers.append('whale_accumulation')

        elif opportunity_type == 'reversal_pattern':
            if fusion_result.modality_importance.get('psychology', 0) > 0.2:
                drivers.append('crowd_psychology_shift')
            if fusion_result.modality_importance.get('social', 0) > 0.3:
                drivers.append('sentiment_divergence')

        return drivers

    def _estimate_regime_duration(self, regime: str) -> int:
        """Estimate expected duration of market regime in days"""

        duration_map = {
            'bull_market': 90,
            'bear_market': 60,
            'sideways_consolidation': 30,
            'high_volatility': 14,
            'distribution_phase': 45,
            'accumulation_phase': 45
        }

        return duration_map.get(regime, 30)

    def _identify_modality_synergies(self, fusion_result: FusionResult) -> List[str]:
        """Identify synergies between modalities"""

        synergies = []

        # Strong correlations indicate synergies
        for correlation_key, correlation in fusion_result.cross_modal_correlations.items():
            if correlation > 0.7:
                modalities = correlation_key.split('_')
                synergies.append(f"strong_alignment_between_{modalities[0]}_and_{modalities[1]}")

        return synergies

    def _identify_contradictory_signals(self, fusion_result: FusionResult) -> List[str]:
        """Identify contradictory signals between modalities"""

        contradictions = []

        # Low correlations may indicate contradictions
        for correlation_key, correlation in fusion_result.cross_modal_correlations.items():
            if correlation < 0.3:
                modalities = correlation_key.split('_')
                contradictions.append(f"divergence_between_{modalities[0]}_and_{modalities[1]}")

        return contradictions

    def _identify_emerging_patterns(self, fusion_result: FusionResult) -> List[str]:
        """Identify emerging patterns from cross-modal analysis"""

        patterns = []

        # Analyze attention weights for patterns
        if hasattr(fusion_result.cross_attention_weights, 'mean'):
            attention_mean = fusion_result.cross_attention_weights.mean().item()
            if attention_mean > 0.8:
                patterns.append('strong_cross_modal_consensus_emerging')

        return patterns

    def _detect_anomalies(self, fusion_result: FusionResult) -> List[str]:
        """Detect anomalies in cross-modal relationships"""

        anomalies = []

        # Unusual modality importance patterns
        importance_values = list(fusion_result.modality_importance.values())
        if len(importance_values) > 0:
            importance_std = np.std(importance_values)
            if importance_std > 0.3:
                anomalies.append('unusual_modality_importance_distribution')

        return anomalies

    def _analyze_confidence_factors(self, fusion_result: FusionResult) -> Dict[str, float]:
        """Analyze factors contributing to prediction confidence"""

        return {
            'fusion_quality': fusion_result.fusion_confidence,
            'modality_agreement': np.mean(list(fusion_result.cross_modal_correlations.values())),
            'embedding_consistency': 1.0 - min(np.var([v.norm().item() for v in fusion_result.modality_embeddings.values()]), 1.0),
            'temporal_alignment': 0.9,  # Would be calculated from temporal alignment metrics
            'data_completeness': len(fusion_result.modality_embeddings) / 5.0  # 5 possible modalities
        }

    async def _update_adaptive_weights(self, fusion_result: FusionResult, predictions: Dict[str, Any]):
        """Update adaptive weights based on fusion performance with robust handling"""

        try:
            # Ensure adaptive weights are properly initialized
            if not hasattr(self, 'adaptive_weights') or self.adaptive_weights is None:
                self.adaptive_weights = self._initialize_adaptive_weights()

            # Update modality weights based on importance in successful predictions
            if fusion_result.modality_importance:
                for modality, importance in fusion_result.modality_importance.items():
                    if modality in self.adaptive_weights['modality_weights']:
                        # Exponential moving average update with bounds checking
                        alpha = 0.1
                        current_weight = self.adaptive_weights['modality_weights'][modality]
                        new_weight = (1 - alpha) * current_weight + alpha * max(0.1, min(importance, 2.0))

                        # Ensure weights stay within reasonable bounds
                        self.adaptive_weights['modality_weights'][modality] = max(0.1, min(new_weight, 3.0))

            # Update fusion strategy weights based on confidence
            strategy = self.config.get('fusion', {}).get('fusion_strategy', 'hybrid')
            if strategy in self.adaptive_weights['fusion_strategy_weights']:
                strategy_confidence = max(0.0, min(fusion_result.fusion_confidence, 1.0))
                alpha = 0.05
                current_weight = self.adaptive_weights['fusion_strategy_weights'][strategy]
                new_weight = (1 - alpha) * current_weight + alpha * strategy_confidence

                self.adaptive_weights['fusion_strategy_weights'][strategy] = max(0.1, min(new_weight, 3.0))

            # Update prediction weights based on prediction performance
            if predictions:
                for pred_type in predictions.keys():
                    if pred_type in self.adaptive_weights['prediction_weights']:
                        # Use confidence score from fusion result if available
                        pred_confidence = fusion_result.confidence_scores.get(pred_type, 0.5)
                        alpha = 0.08
                        current_weight = self.adaptive_weights['prediction_weights'][pred_type]
                        new_weight = (1 - alpha) * current_weight + alpha * pred_confidence

                        self.adaptive_weights['prediction_weights'][pred_type] = max(0.1, min(new_weight, 3.0))

            # Record update timestamp and performance
            from datetime import datetime
            self.adaptive_weights['last_update'] = datetime.utcnow()
            self.adaptive_weights['performance_history'].append({
                'timestamp': datetime.utcnow(),
                'fusion_confidence': fusion_result.fusion_confidence,
                'modality_count': len(fusion_result.modality_importance),
                'predictions_count': len(predictions)
            })

            # Keep only recent history (last 100 entries)
            if len(self.adaptive_weights['performance_history']) > 100:
                self.adaptive_weights['performance_history'] = self.adaptive_weights['performance_history'][-100:]

        except Exception as e:
            logger.warning(f"Failed to update adaptive weights: {str(e)}")
            # Don't crash the system if adaptive weights update fails

    async def _update_adaptive_weights_from_performance(self):
        """Update adaptive weights based on recent performance"""

        # Get recent performance metrics
        metrics = self.get_performance_metrics()

        if metrics['total_predictions'] < 10:
            return  # Not enough data for meaningful updates

        # Update modality weights based on success rates
        for modality, success_rate in metrics['modality_success_rates'].items():
            if modality in self.adaptive_weights['modality_weights']:
                # Exponential moving average update
                alpha = 0.1
                self.adaptive_weights['modality_weights'][modality] = (
                    (1 - alpha) * self.adaptive_weights['modality_weights'][modality] + alpha * success_rate
                )

        # Update fusion strategy weights based on average confidence
        strategy = self.config['fusion']['fusion_strategy']
        if strategy in self.adaptive_weights['fusion_strategy_weights']:
            strategy_confidence = metrics['average_confidence']
            alpha = 0.05
            self.adaptive_weights['fusion_strategy_weights'][strategy] = (
                (1 - alpha) * self.adaptive_weights['fusion_strategy_weights'][strategy] + alpha * strategy_confidence
            )

    async def _update_performance_metrics(self, fusion_result: FusionResult, execution_time: float):
        """Update performance tracking metrics"""

        self.performance_metrics['total_predictions'] += 1
        self.performance_metrics['successful_fusions'] += 1
        self.performance_metrics['average_confidence'] = (
            (self.performance_metrics['average_confidence'] * (self.performance_metrics['total_predictions'] - 1) +
             fusion_result.fusion_confidence) / self.performance_metrics['total_predictions']
        )

        # Update execution time tracking
        self.performance_metrics['execution_times'].append(execution_time)
        if len(self.performance_metrics['execution_times']) > 100:
            self.performance_metrics['execution_times'] = self.performance_metrics['execution_times'][-100:]

        # Update modality success rates
        if 'modality_success_rates' not in self.performance_metrics:
            self.performance_metrics['modality_success_rates'] = {}

        for modality in fusion_result.modality_embeddings.keys():
            if modality not in self.performance_metrics['modality_success_rates']:
                self.performance_metrics['modality_success_rates'][modality] = 0
            self.performance_metrics['modality_success_rates'][modality] += 1

    async def _generate_fallback_output(self, input_data: MultiModalInput, start_time: datetime) -> MultiModalOutput:
        """Generate fallback output when fusion fails"""

        execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000

        return MultiModalOutput(
            fused_embedding=torch.zeros(self.config['fusion']['embed_dim']),
            predictions={
                'price_movement': {'direction': 'neutral', 'confidence': 0.5, 'magnitude': 0.0},
                'market_sentiment': {'dominant_sentiment': 'neutral', 'confidence': 0.5},
                'risk_assessment': {'risk_level': 'moderate', 'risk_score': 50.0, 'confidence': 0.5},
                'trading_opportunities': [],
                'market_regime': {'current_regime': 'unknown', 'confidence': 0.0}
            },
            confidence_scores={'overall': 0.5},
            modality_importance={},
            cross_modal_insights={'error': 'Fusion system unavailable'},
            processing_metadata={'fallback_mode': True},
            execution_time_ms=execution_time
        )

    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics"""

        metrics = self.performance_metrics.copy()

        # Calculate derived metrics
        if metrics['execution_times']:
            metrics['average_execution_time'] = np.mean(metrics['execution_times'])
            metrics['execution_time_std'] = np.std(metrics['execution_times'])

        # Calculate modality success rates
        total_attempts = metrics.get('total_predictions', 0)
        if total_attempts > 0 and 'modality_success_rates' in metrics:
            for modality in metrics['modality_success_rates']:
                metrics['modality_success_rates'][modality] = (
                    metrics['modality_success_rates'][modality] / total_attempts
                )

        return metrics

    def _merge_config(self, base_config: Dict, user_config: Dict):
        """Deep merge user config with base config"""
        for key, value in user_config.items():
            if key in base_config and isinstance(base_config[key], dict) and isinstance(value, dict):
                self._merge_config(base_config[key], value)
            else:
                base_config[key] = value

    def _get_default_config(self) -> Dict:
        """Get default configuration for the fusion engine"""

        return {
            'temporal': {
                'default_window_minutes': 5,
                'max_latency_compensation_ms': 5000,
                'quality_threshold': 0.7
            },
            'encoders': {
                'market': {
                    'input_channels': 3,
                    'hidden_dims': [64, 128, 256, 512],
                    'feature_dim': 512,
                    'use_attention': True
                },
                'social': {
                    'vocab_size': 30000,
                    'max_length': 512,
                    'embedding_dim': 768,
                    'hidden_dim': 768,
                    'num_layers': 6,
                    'pooling_strategy': 'cls_token'
                },
                'news': {
                    'vocab_size': 30000,
                    'max_length': 1024,
                    'embedding_dim': 768,
                    'hidden_dim': 768,
                    'num_layers': 6,
                    'pooling_strategy': 'mean'
                },
                'onchain': {
                    'node_features': 64,
                    'edge_features': 32,
                    'hidden_dim': 128,
                    'num_layers': 3,
                    'graph_pooling': 'global_mean'
                },
                'psychology': {
                    'behavioral_features': 32,
                    'emotional_features': 16,
                    'cognitive_features': 24,
                    'social_features': 20,
                    'hidden_dim': 128,
                    'use_attention': True
                }
            },
            'fusion': {
                'embed_dim': 512,
                'hidden_dim': 1024,
                'num_heads': 8,
                'dropout': 0.1,
                'fusion_strategy': 'hybrid',
                'use_contrastive_loss': True,
                'use_correlation_learning': True
            }
        }
