"""
🧠 CRYPTO PSYCHOLOGY ENGINE - THE DIVINE CORE
=============================================

The ultimate psychological analysis engine for cryptocurrency markets.
This is where human psychology meets algorithmic precision to create
unprecedented insights into crypto market behavior.

REVOLUTIONARY CAPABILITIES:
- Multi-dimensional psychological analysis
- Real-time emotional state detection
- Advanced manipulation identification
- Cognitive bias mitigation
- Social influence mapping
- Crowd psychology prediction
- Personalized psychological profiling

"The market is a voting machine in the short run, but a weighing machine in the long run." - Benjamin Graham
We decode both the voting patterns (psychology) and the weighing mechanisms (fundamentals).
"""

import asyncio
import logging
from typing import Dict, List, Optional, Union, Any, Tuple
from datetime import datetime, timedelta
import numpy as np
from dataclasses import dataclass
import json
import re

# Import enhanced NLP capabilities
from ...nlp.core import AdvancedNLPProcessor
from ...nlp.context import ContextManager
from ...nlp.ontologies import CryptoDomainOntology

from ..models.psychological_patterns import (
    PsychologicalPattern,
    EmotionalState,
    CognitiveBias,
    ManipulationTactic,
    SocialInfluence,
    NarrativePattern,
    CrowdBehavior,
    PsychologicalProfile,
    EmotionalPolarity,
    EmotionalIntensity,
    CognitiveBiasType,
    ManipulationTacticType,
    InfluenceType,
    CrowdBehaviorType
)

from .emotional_analyzer import EmotionalAnalyzer
from .manipulation_detector import ManipulationDetector
from .cognitive_bias_detector import CognitiveBiasDetector
from .social_influence_mapper import SocialInfluenceMapper
from .narrative_analyzer import NarrativeAnalyzer
from .crowd_psychology_predictor import CrowdPsychologyPredictor
from .psychological_profiler import PsychologicalProfiler

logger = logging.getLogger(__name__)

@dataclass
class AnalysisContext:
    """Context for psychological analysis"""
    input_text: str
    input_type: str  # 'ticker', 'thread', 'link', 'question', 'news'
    user_history: Optional[Dict] = None
    market_context: Optional[Dict] = None
    social_context: Optional[Dict] = None
    temporal_context: Optional[Dict] = None
    metadata: Optional[Dict] = None

class CryptoPsychologyEngine:
    """
    🧠 THE DIVINE CRYPTO PSYCHOLOGY ENGINE
    
    This is the crown jewel of Coinet AI - an unprecedented system that understands
    the deepest psychological patterns in cryptocurrency markets.
    
    DIVINE ARCHITECTURE:
    - Multi-agent psychological analysis
    - Real-time adaptation to user psychology
    - Advanced pattern recognition
    - Predictive psychological modeling
    - Bias detection and mitigation
    """
    
    def __init__(self, config: Optional[Dict] = None):
        """Initialize the divine psychology engine with enhanced NLP"""
        self.config = config or self._get_default_config()

        # Initialize enhanced NLP capabilities
        self.nlp_processor = AdvancedNLPProcessor(self.config.get('nlp', {}))
        self.context_manager = ContextManager(self.config.get('context', {}))
        self.domain_ontology = CryptoDomainOntology(self.config.get('ontology', {}))

        # Initialize the divine trinity of analyzers
        self.emotional_analyzer = EmotionalAnalyzer(self.config.get('emotional', {}))
        self.manipulation_detector = ManipulationDetector(self.config.get('manipulation', {}))
        self.cognitive_bias_detector = CognitiveBiasDetector(self.config.get('cognitive', {}))
        self.social_influence_mapper = SocialInfluenceMapper(self.config.get('social', {}))
        self.narrative_analyzer = NarrativeAnalyzer(self.config.get('narrative', {}))
        self.crowd_psychology_predictor = CrowdPsychologyPredictor(self.config.get('crowd', {}))
        self.psychological_profiler = PsychologicalProfiler(self.config.get('profiler', {}))

        # Enhanced analysis state
        self.nlp_cache = {}
        self.context_cache = {}

        # Performance tracking
        self.analysis_history = []
        self.accuracy_metrics = {}
        self.adaptation_weights = self._initialize_adaptation_weights()

        logger.info("🧠 CryptoPsychologyEngine initialized with divine NLP-enhanced perfection")
    
    async def analyze_psychology(self, 
                                input_text: str, 
                                input_type: str,
                                context: Optional[Dict] = None,
                                user_profile: Optional[Dict] = None) -> PsychologicalPattern:
        """
        🎯 MASTER PSYCHOLOGICAL ANALYSIS
        
        This is the divine function that orchestrates all psychological analysis.
        It combines multiple AI agents to create unprecedented insights.
        
        Args:
            input_text: The text to analyze (tweet, article, ticker, etc.)
            input_type: Type of input ('ticker', 'thread', 'link', 'question', 'news')
            context: Additional context (market data, social data, etc.)
            user_profile: User's psychological profile for personalization
            
        Returns:
            Comprehensive psychological pattern analysis
        """
        start_time = datetime.utcnow()
        
        try:
            # Create analysis context
            analysis_context = AnalysisContext(
                input_text=input_text,
                input_type=input_type,
                market_context=context.get('market') if context else None,
                social_context=context.get('social') if context else None,
                temporal_context=context.get('temporal') if context else None,
                metadata=context.get('metadata') if context else None
            )
            
            # Enhanced NLP processing for superior understanding
            nlp_analysis = await self._perform_enhanced_nlp_analysis(input_text, analysis_context)
            enhanced_input = await self._enhance_input_with_nlp(analysis_context, nlp_analysis)

            # DIVINE PARALLEL ANALYSIS - Run all analyzers simultaneously
            analysis_tasks = [
                self._analyze_emotional_dimensions(enhanced_input),
                self._detect_manipulation_patterns(enhanced_input),
                self._identify_cognitive_biases(enhanced_input),
                self._map_social_influences(enhanced_input),
                self._analyze_narrative_patterns(enhanced_input),
                self._predict_crowd_psychology(enhanced_input),
                self._generate_psychological_profile(enhanced_input, user_profile)
            ]
            
            # Execute all analyses in parallel for maximum speed
            results = await asyncio.gather(*analysis_tasks, return_exceptions=True)
            
            # Extract results (with error handling)
            emotional_state = results[0] if not isinstance(results[0], Exception) else None
            manipulation_tactics = results[1] if not isinstance(results[1], Exception) else []
            cognitive_biases = results[2] if not isinstance(results[2], Exception) else []
            social_influences = results[3] if not isinstance(results[3], Exception) else []
            narrative_patterns = results[4] if not isinstance(results[4], Exception) else []
            crowd_behavior = results[5] if not isinstance(results[5], Exception) else None
            psychological_profile = results[6] if not isinstance(results[6], Exception) else None
            
            # DIVINE SYNTHESIS - Combine all insights
            psychological_pattern = await self._synthesize_psychological_insights(
                emotional_state=emotional_state,
                manipulation_tactics=manipulation_tactics,
                cognitive_biases=cognitive_biases,
                social_influences=social_influences,
                narrative_patterns=narrative_patterns,
                crowd_behavior=crowd_behavior,
                psychological_profile=psychological_profile,
                context=analysis_context
            )
            
            # Calculate performance metrics
            analysis_time = (datetime.utcnow() - start_time).total_seconds()
            psychological_pattern.metadata = {
                'analysis_time_seconds': analysis_time,
                'engine_version': '1.0.0',
                'analysis_id': f"psych_{int(start_time.timestamp())}"
            }
            
            # Store for learning and improvement
            await self._store_analysis_for_learning(psychological_pattern, analysis_context)
            
            logger.info(f"🎯 Psychology analysis completed in {analysis_time:.2f}s with confidence {psychological_pattern.confidence_score:.3f}")
            
            return psychological_pattern
            
        except Exception as e:
            logger.error(f"❌ Psychology analysis failed: {str(e)}")
            raise
    
    async def _enhance_input(self, context: AnalysisContext) -> Dict:
        """Enhance input with additional context and preprocessing"""
        enhanced = {
            'original_text': context.input_text,
            'input_type': context.input_type,
            'processed_text': await self._preprocess_text(context.input_text),
            'linguistic_features': await self._extract_linguistic_features(context.input_text),
            'contextual_signals': await self._extract_contextual_signals(context),
            'temporal_features': await self._extract_temporal_features(context),
            'social_features': await self._extract_social_features(context)
        }
        
        return enhanced
    
    async def _preprocess_text(self, text: str) -> str:
        """Advanced text preprocessing for psychological analysis"""
        # Remove noise but preserve psychological signals
        processed = text.lower()
        
        # Normalize crypto symbols
        processed = re.sub(r'\$([A-Z]{2,10})', r'CRYPTO_SYMBOL_\1', processed)
        
        # Preserve emotional punctuation
        processed = re.sub(r'!{2,}', ' EXCITEMENT_MARKER ', processed)
        processed = re.sub(r'\?{2,}', ' CONFUSION_MARKER ', processed)
        
        # Preserve ALL CAPS (often indicates emotion)
        caps_words = re.findall(r'\b[A-Z]{2,}\b', text)
        for word in caps_words:
            processed = processed.replace(word.lower(), f'CAPS_{word}')
        
        return processed.strip()
    
    async def _extract_linguistic_features(self, text: str) -> Dict:
        """Extract advanced linguistic features for psychological analysis"""
        features = {
            'word_count': len(text.split()),
            'sentence_count': len(re.split(r'[.!?]+', text)),
            'avg_sentence_length': 0,
            'exclamation_ratio': text.count('!') / max(len(text), 1),
            'question_ratio': text.count('?') / max(len(text), 1),
            'caps_ratio': sum(1 for c in text if c.isupper()) / max(len(text), 1),
            'emoji_count': len(re.findall(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF]', text)),
            'urgency_words': self._count_urgency_words(text),
            'financial_terms': self._count_financial_terms(text),
            'emotional_words': self._count_emotional_words(text)
        }
        
        if features['sentence_count'] > 0:
            features['avg_sentence_length'] = features['word_count'] / features['sentence_count']
        
        return features
    
    async def _extract_contextual_signals(self, context: AnalysisContext) -> Dict:
        """Extract contextual signals that affect psychology"""
        signals = {}
        
        # Market context signals
        if context.market_context:
            market_data = context.market_context
            signals.update({
                'market_volatility': market_data.get('volatility', 0),
                'price_change_24h': market_data.get('price_change_24h', 0),
                'volume_change': market_data.get('volume_change', 0),
                'market_sentiment': market_data.get('sentiment', 'neutral')
            })
        
        # Social context signals
        if context.social_context:
            social_data = context.social_context
            signals.update({
                'social_volume': social_data.get('volume', 0),
                'social_sentiment': social_data.get('sentiment', 0),
                'influencer_activity': social_data.get('influencer_activity', 0),
                'trending_topics': social_data.get('trending_topics', [])
            })
        
        return signals
    
    async def _extract_temporal_features(self, context: AnalysisContext) -> Dict:
        """Extract temporal features that affect psychology"""
        now = datetime.utcnow()
        
        return {
            'hour_of_day': now.hour,
            'day_of_week': now.weekday(),
            'is_weekend': now.weekday() >= 5,
            'is_market_hours': 9 <= now.hour <= 16,  # Approximate
            'time_since_major_event': self._calculate_time_since_major_event(),
            'market_cycle_phase': self._determine_market_cycle_phase()
        }
    
    async def _extract_social_features(self, context: AnalysisContext) -> Dict:
        """Extract social features for influence analysis"""
        if not context.social_context:
            return {}
        
        social = context.social_context
        return {
            'follower_count': social.get('follower_count', 0),
            'engagement_rate': social.get('engagement_rate', 0),
            'account_age': social.get('account_age', 0),
            'verification_status': social.get('verified', False),
            'influence_score': social.get('influence_score', 0)
        }
    
    async def _analyze_emotional_dimensions(self, enhanced_input: Dict) -> EmotionalState:
        """Analyze emotional dimensions of the input"""
        return await self.emotional_analyzer.analyze(enhanced_input)
    
    async def _detect_manipulation_patterns(self, enhanced_input: Dict) -> List[ManipulationTactic]:
        """Detect manipulation patterns in the input"""
        return await self.manipulation_detector.detect(enhanced_input)
    
    async def _identify_cognitive_biases(self, enhanced_input: Dict) -> List[CognitiveBias]:
        """Identify cognitive biases in the input"""
        return await self.cognitive_bias_detector.detect(enhanced_input)
    
    async def _map_social_influences(self, enhanced_input: Dict) -> List[SocialInfluence]:
        """Map social influence patterns"""
        return await self.social_influence_mapper.map(enhanced_input)
    
    async def _analyze_narrative_patterns(self, enhanced_input: Dict) -> List[NarrativePattern]:
        """Analyze narrative patterns in the input"""
        return await self.narrative_analyzer.analyze(enhanced_input)
    
    async def _predict_crowd_psychology(self, enhanced_input: Dict) -> Optional[CrowdBehavior]:
        """Predict crowd psychology patterns"""
        return await self.crowd_psychology_predictor.predict(enhanced_input)
    
    async def _generate_psychological_profile(self, enhanced_input: Dict, user_profile: Optional[Dict]) -> Optional[PsychologicalProfile]:
        """Generate psychological profile"""
        return await self.psychological_profiler.profile(enhanced_input, user_profile)
    
    async def _synthesize_psychological_insights(self,
                                              emotional_state: Optional[EmotionalState],
                                              manipulation_tactics: List[ManipulationTactic],
                                              cognitive_biases: List[CognitiveBias],
                                              social_influences: List[SocialInfluence],
                                              narrative_patterns: List[NarrativePattern],
                                              crowd_behavior: Optional[CrowdBehavior],
                                              psychological_profile: Optional[PsychologicalProfile],
                                              context: AnalysisContext) -> PsychologicalPattern:
        """
        🧠 DIVINE SYNTHESIS - The Crown Jewel Function
        
        This function combines all psychological insights into a unified,
        actionable analysis that provides unprecedented market intelligence.
        """
        
        # Calculate overall confidence score
        confidence_scores = []
        if emotional_state:
            confidence_scores.append(emotional_state.confidence)
        confidence_scores.extend([mt.confidence for mt in manipulation_tactics])
        confidence_scores.extend([cb.confidence for cb in cognitive_biases])
        confidence_scores.extend([si.influence_strength for si in social_influences])
        
        overall_confidence = np.mean(confidence_scores) if confidence_scores else 0.5
        
        # Generate key insights
        key_insights = await self._generate_key_insights(
            emotional_state, manipulation_tactics, cognitive_biases,
            social_influences, narrative_patterns, crowd_behavior
        )
        
        # Identify risk factors
        risk_factors = await self._identify_risk_factors(
            emotional_state, manipulation_tactics, cognitive_biases
        )
        
        # Find opportunities
        opportunities = await self._identify_opportunities(
            emotional_state, social_influences, narrative_patterns
        )
        
        # Generate recommendations
        recommendations = await self._generate_recommendations(
            emotional_state, manipulation_tactics, cognitive_biases,
            social_influences, psychological_profile
        )
        
        # Predict psychological trajectory
        trajectory = await self._predict_psychological_trajectory(
            emotional_state, crowd_behavior, context
        )
        
        # Assess stability
        stability = await self._assess_psychological_stability(
            emotional_state, cognitive_biases, social_influences
        )
        
        # Create the divine pattern
        pattern = PsychologicalPattern(
            emotional_state=emotional_state or self._create_neutral_emotional_state(),
            cognitive_biases=cognitive_biases,
            manipulation_tactics=manipulation_tactics,
            social_influences=social_influences,
            narrative_patterns=narrative_patterns,
            crowd_behavior=crowd_behavior,
            psychological_profile=psychological_profile,
            confidence_score=overall_confidence,
            key_insights=key_insights,
            risk_factors=risk_factors,
            opportunities=opportunities,
            recommendations=recommendations,
            psychological_trajectory=trajectory,
            stability_assessment=stability,
            intervention_needs=await self._identify_intervention_needs(
                emotional_state, manipulation_tactics, cognitive_biases
            )
        )
        
        return pattern
    
    async def _generate_key_insights(self, *args) -> List[str]:
        """Generate key psychological insights"""
        insights = []
        
        emotional_state, manipulation_tactics, cognitive_biases, social_influences, narrative_patterns, crowd_behavior = args
        
        # Emotional insights
        if emotional_state and emotional_state.intensity in [EmotionalIntensity.INTENSE, EmotionalIntensity.EXTREME]:
            insights.append(f"🔥 Extreme {emotional_state.primary_emotion} detected - High risk of irrational decisions")
        
        # Manipulation insights
        if manipulation_tactics:
            high_sophistication = [mt for mt in manipulation_tactics if mt.sophistication_level > 0.7]
            if high_sophistication:
                insights.append(f"🚨 {len(high_sophistication)} sophisticated manipulation tactic(s) detected")
        
        # Bias insights
        if cognitive_biases:
            high_impact_biases = [cb for cb in cognitive_biases if cb.decision_impact > 0.7]
            if high_impact_biases:
                insights.append(f"🧠 {len(high_impact_biases)} high-impact cognitive bias(es) affecting judgment")
        
        # Social insights
        if social_influences:
            strong_influences = [si for si in social_influences if si.influence_strength > 0.7]
            if strong_influences:
                insights.append(f"👥 Strong social influence detected from {len(strong_influences)} source(s)")
        
        # Crowd insights
        if crowd_behavior and crowd_behavior.intensity > 0.7:
            insights.append(f"🌊 Intense {crowd_behavior.behavior_type} crowd behavior detected")
        
        return insights
    
    async def _identify_risk_factors(self, emotional_state, manipulation_tactics, cognitive_biases) -> List[str]:
        """Identify psychological risk factors"""
        risks = []
        
        # Emotional risks
        if emotional_state:
            if emotional_state.intensity == EmotionalIntensity.EXTREME:
                risks.append("Extreme emotional state may lead to impulsive decisions")
            if emotional_state.decision_clarity_impact < 0.3:
                risks.append("Poor decision clarity due to emotional state")
        
        # Manipulation risks
        for tactic in manipulation_tactics:
            if tactic.potential_impact > 0.6:
                risks.append(f"High-impact {tactic.tactic_type} manipulation detected")
        
        # Cognitive risks
        for bias in cognitive_biases:
            if bias.financial_risk > 0.6:
                risks.append(f"High financial risk from {bias.bias_type}")
        
        return risks
    
    async def _identify_opportunities(self, emotional_state, social_influences, narrative_patterns) -> List[str]:
        """Identify psychological opportunities"""
        opportunities = []
        
        # Contrarian opportunities
        if emotional_state and emotional_state.intensity == EmotionalIntensity.EXTREME:
            if emotional_state.polarity == EmotionalPolarity.BEARISH_PANIC:
                opportunities.append("Extreme fear may present contrarian buying opportunity")
            elif emotional_state.polarity == EmotionalPolarity.BULLISH_EUPHORIA:
                opportunities.append("Extreme greed may signal profit-taking opportunity")
        
        # Social opportunities
        for influence in social_influences:
            if influence.audience_skepticism > 0.7:
                opportunities.append("High audience skepticism suggests independent thinking opportunity")
        
        # Narrative opportunities
        for pattern in narrative_patterns:
            if pattern.virality_potential > 0.8 and pattern.emotional_resonance < 0.5:
                opportunities.append("High virality but low emotional resonance - early positioning opportunity")
        
        return opportunities
    
    async def _generate_recommendations(self, *args) -> List[str]:
        """Generate actionable psychological recommendations"""
        recommendations = []
        
        emotional_state, manipulation_tactics, cognitive_biases, social_influences, psychological_profile = args
        
        # Emotional recommendations
        if emotional_state and emotional_state.intensity >= EmotionalIntensity.INTENSE:
            recommendations.append("⏸️ Take a cooling-off period before making important decisions")
            recommendations.append("🧘 Practice emotional regulation techniques")
        
        # Bias mitigation recommendations
        for bias in cognitive_biases:
            recommendations.extend(bias.mitigation_strategies)
        
        # Manipulation protection recommendations
        for tactic in manipulation_tactics:
            recommendations.extend(tactic.protection_strategies)
        
        # Social influence recommendations
        if social_influences:
            high_influence = [si for si in social_influences if si.influence_strength > 0.7]
            if high_influence:
                recommendations.append("🤔 Seek independent sources to validate social consensus")
        
        return list(set(recommendations))  # Remove duplicates
    
    def _create_neutral_emotional_state(self) -> EmotionalState:
        """Create a neutral emotional state as fallback"""
        return EmotionalState(
            primary_emotion="neutral",
            polarity=EmotionalPolarity.NEUTRAL,
            intensity=EmotionalIntensity.CALM,
            confidence=0.5,
            emotional_volatility=0.2,
            authenticity_score=0.8,
            emotional_trajectory="stable",
            risk_appetite_impact=0.0,
            decision_clarity_impact=0.8
        )
    
    # Helper methods for feature extraction
    def _count_urgency_words(self, text: str) -> int:
        urgency_words = ['urgent', 'now', 'immediately', 'quickly', 'asap', 'hurry', 'rush', 'fast', 'breaking', 'alert']
        return sum(1 for word in urgency_words if word in text.lower())
    
    def _count_financial_terms(self, text: str) -> int:
        financial_terms = ['buy', 'sell', 'trade', 'invest', 'profit', 'loss', 'gain', 'bull', 'bear', 'pump', 'dump', 'moon', 'lambo']
        return sum(1 for term in financial_terms if term in text.lower())
    
    def _count_emotional_words(self, text: str) -> int:
        emotional_words = ['amazing', 'terrible', 'fantastic', 'awful', 'incredible', 'devastating', 'thrilled', 'devastated', 'excited', 'scared']
        return sum(1 for word in emotional_words if word in text.lower())
    
    def _calculate_time_since_major_event(self) -> int:
        """Calculate hours since last major market event"""
        # This would connect to your event detection system
        return 24  # Placeholder
    
    def _determine_market_cycle_phase(self) -> str:
        """Determine current market cycle phase"""
        # This would connect to your market analysis
        return "accumulation"  # Placeholder
    
    async def _predict_psychological_trajectory(self, emotional_state, crowd_behavior, context) -> str:
        """Predict psychological trajectory"""
        if emotional_state and emotional_state.emotional_trajectory:
            return emotional_state.emotional_trajectory
        
        if crowd_behavior and crowd_behavior.momentum:
            if crowd_behavior.momentum > 0.5:
                return "intensifying"
            elif crowd_behavior.momentum < -0.5:
                return "declining"
        
        return "stable"
    
    async def _assess_psychological_stability(self, emotional_state, cognitive_biases, social_influences) -> float:
        """Assess overall psychological stability"""
        stability_factors = []
        
        if emotional_state:
            stability_factors.append(1.0 - emotional_state.emotional_volatility)
        
        # Biases reduce stability
        if cognitive_biases:
            avg_bias_impact = np.mean([bias.decision_impact for bias in cognitive_biases])
            stability_factors.append(1.0 - avg_bias_impact)
        
        # Strong social influences can reduce stability
        if social_influences:
            avg_influence = np.mean([inf.influence_strength for inf in social_influences])
            stability_factors.append(1.0 - (avg_influence * 0.5))  # Moderate impact
        
        return np.mean(stability_factors) if stability_factors else 0.5
    
    async def _identify_intervention_needs(self, emotional_state, manipulation_tactics, cognitive_biases) -> List[str]:
        """Identify when psychological interventions are needed"""
        interventions = []
        
        # Emotional interventions
        if emotional_state and emotional_state.intensity == EmotionalIntensity.EXTREME:
            interventions.append("immediate_emotional_regulation")
        
        # Manipulation interventions
        high_risk_manipulation = [mt for mt in manipulation_tactics if mt.potential_impact > 0.8]
        if high_risk_manipulation:
            interventions.append("manipulation_awareness_training")
        
        # Bias interventions
        high_risk_biases = [cb for cb in cognitive_biases if cb.financial_risk > 0.8]
        if high_risk_biases:
            interventions.append("cognitive_bias_correction")
        
        return interventions
    
    async def _store_analysis_for_learning(self, pattern: PsychologicalPattern, context: AnalysisContext):
        """Store analysis for continuous learning and improvement"""
        # This would store to your learning database
        self.analysis_history.append({
            'timestamp': datetime.utcnow(),
            'pattern': pattern,
            'context': context,
            'confidence': pattern.confidence_score
        })
        
        # Keep only recent history
        if len(self.analysis_history) > 1000:
            self.analysis_history = self.analysis_history[-1000:]
    
    async def _perform_enhanced_nlp_analysis(self, text: str, context: AnalysisContext) -> Dict:
        """Perform enhanced NLP analysis using advanced techniques"""
        # Check cache first
        cache_key = hash(text) % 1000
        if cache_key in self.nlp_cache:
            cached_result = self.nlp_cache[cache_key]
            if (datetime.utcnow() - cached_result['timestamp']).total_seconds() < 300:  # 5 minute cache
                return cached_result['result']

        try:
            # Determine domain focus from context
            domain_focus = context.market_context.get('domain') if context.market_context else None

            # Perform comprehensive NLP analysis
            nlp_result = await self.nlp_processor.analyze_text(
                text,
                context={
                    'market': context.market_context,
                    'social': context.social_context,
                    'temporal': context.temporal_context
                },
                domain_focus=domain_focus
            )

            # Cache result
            self.nlp_cache[cache_key] = {
                'result': nlp_result,
                'timestamp': datetime.utcnow()
            }

            return nlp_result

        except Exception as e:
            logger.warning(f"⚠️ Enhanced NLP analysis failed: {str(e)}")
            # Return basic fallback
            return {
                'confidence_scores': {'overall': 0.5},
                'entities': [],
                'contextual_insights': {},
                'domain_concepts': []
            }

    async def _enhance_input_with_nlp(self, context: AnalysisContext, nlp_analysis: Dict) -> Dict:
        """Enhance input analysis with NLP insights"""
        enhanced = {
            'original_text': context.input_text,
            'input_type': context.input_type,
            'processed_text': await self._preprocess_text_with_nlp(context.input_text, nlp_analysis),
            'linguistic_features': await self._extract_linguistic_features_with_nlp(context.input_text, nlp_analysis),
            'contextual_signals': await self._extract_contextual_signals_with_nlp(context, nlp_analysis),
            'temporal_features': await self._extract_temporal_features(context),
            'social_features': await self._extract_social_features(context),
            'nlp_enhancements': {
                'entities': nlp_analysis.get('entities', []),
                'contextual_insights': nlp_analysis.get('contextual_insights', {}),
                'domain_concepts': nlp_analysis.get('domain_concepts', []),
                'confidence': nlp_analysis.get('confidence_scores', {}).get('overall', 0.5)
            }
        }

        return enhanced

    async def _preprocess_text_with_nlp(self, text: str, nlp_analysis: Dict) -> str:
        """Enhanced text preprocessing using NLP insights"""
        processed = await self._preprocess_text(text)

        # Apply NLP-based enhancements
        entities = nlp_analysis.get('entities', [])

        # Enhance entity recognition in processed text
        for entity in entities:
            if entity.get('confidence', 0) > 0.8:
                entity_text = entity['text']
                entity_type = entity['type']

                # Add entity type markers
                if entity_type == 'CRYPTOCURRENCY':
                    processed = processed.replace(entity_text, f"CRYPTO_{entity_text}")
                elif entity_type == 'EXCHANGE':
                    processed = processed.replace(entity_text, f"EXCHANGE_{entity_text}")
                elif entity_type in ['PERSON', 'ORGANIZATION']:
                    processed = processed.replace(entity_text, f"ENTITY_{entity_text}")

        return processed

    async def _extract_linguistic_features_with_nlp(self, text: str, nlp_analysis: Dict) -> Dict:
        """Extract linguistic features enhanced with NLP analysis"""
        base_features = await self._extract_linguistic_features(text)

        # Add NLP-enhanced features
        entities = nlp_analysis.get('entities', [])
        contextual_insights = nlp_analysis.get('contextual_insights', {})

        enhanced_features = {
            **base_features,
            'entity_count': len(entities),
            'entity_types': list(set(e.get('type', 'UNKNOWN') for e in entities)),
            'avg_entity_confidence': np.mean([e.get('confidence', 0) for e in entities]) if entities else 0,
            'contextual_insight_count': len(contextual_insights),
            'nlp_confidence': nlp_analysis.get('confidence_scores', {}).get('overall', 0.5)
        }

        return enhanced_features

    async def _extract_contextual_signals_with_nlp(self, context: AnalysisContext, nlp_analysis: Dict) -> Dict:
        """Extract contextual signals enhanced with NLP analysis"""
        base_signals = await self._extract_contextual_signals(context)

        # Add NLP-based contextual signals
        domain_concepts = nlp_analysis.get('domain_concepts', [])
        contextual_insights = nlp_analysis.get('contextual_insights', {})

        enhanced_signals = {
            **base_signals,
            'nlp_domain_concepts': len(domain_concepts),
            'nlp_contextual_insights': list(contextual_insights.keys()),
            'nlp_confidence': nlp_analysis.get('confidence_scores', {}).get('overall', 0.5)
        }

        return enhanced_signals

    def _get_default_config(self) -> Dict:
        """Get default configuration for the psychology engine"""
        return {
            'emotional': {
                'sensitivity': 0.7,
                'context_window': 5,
                'emotion_threshold': 0.6
            },
            'manipulation': {
                'sophistication_threshold': 0.5,
                'evidence_threshold': 0.6
            },
            'cognitive': {
                'bias_threshold': 0.5,
                'severity_threshold': 0.7
            },
            'social': {
                'influence_threshold': 0.6,
                'network_analysis': True
            },
            'narrative': {
                'theme_detection': True,
                'virality_prediction': True
            },
            'crowd': {
                'behavior_threshold': 0.6,
                'prediction_horizon': 24
            },
            'profiler': {
                'learning_enabled': True,
                'adaptation_rate': 0.1
            },
            'nlp': {
                'embeddings': {
                    'models': ['bert-base-uncased', 'roberta-base'],
                    'pooling_strategy': 'mean',
                    'max_sequence_length': 512
                },
                'ner': {
                    'model': 'dbmdz/bert-large-cased-finetuned-conll03-english',
                    'confidence_threshold': 0.7
                },
                'parsing': {
                    'model': 'en_core_web_sm',
                    'relationship_extraction': True
                },
                'ontology': {
                    'domains': ['cryptocurrency', 'finance', 'psychology'],
                    'similarity_threshold': 0.6
                },
                'context': {
                    'max_context_length': 1000,
                    'temporal_window': 24
                }
            },
            'context': {
                'relevance_threshold': 0.6,
                'max_context_length': 1000,
                'temporal_window': 24
            },
            'ontology': {
                'domains': ['cryptocurrency', 'finance', 'psychology'],
                'similarity_threshold': 0.6,
                'context_window': 3
            }
        }
    
    def _initialize_adaptation_weights(self) -> Dict:
        """Initialize weights for adaptive learning"""
        return {
            'emotional_weight': 1.0,
            'manipulation_weight': 1.0,
            'cognitive_weight': 1.0,
            'social_weight': 1.0,
            'narrative_weight': 1.0,
            'crowd_weight': 1.0
        }
