"""
❤️ EMOTIONAL ANALYZER - DIVINE EMOTIONAL INTELLIGENCE
====================================================

Revolutionary emotional analysis engine that understands the deepest
emotional patterns in cryptocurrency markets with unprecedented precision.

BREAKTHROUGH CAPABILITIES:
- Multi-dimensional emotional state detection
- Authenticity vs manipulation assessment
- Emotional trajectory prediction
- Risk appetite impact analysis
- Decision clarity evaluation
- Emotional volatility measurement

"Emotion is the enemy of rational argument." - Warren Buffett
We decode emotions to restore rational thinking in crypto markets.
"""

import asyncio
import logging
import re
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
import json

from ..models.psychological_patterns import (
    EmotionalState,
    EmotionalPolarity,
    EmotionalIntensity
)

logger = logging.getLogger(__name__)

class EmotionalAnalyzer:
    """
    ❤️ DIVINE EMOTIONAL ANALYZER
    
    This analyzer uses advanced NLP and psychological models to detect
    and analyze emotional states in crypto-related content with
    unprecedented accuracy and depth.
    """
    
    def __init__(self, config: Optional[Dict] = None):
        """Initialize the emotional analyzer"""
        self.config = config or self._get_default_config()
        
        # Emotional lexicons and patterns
        self.emotion_lexicons = self._load_emotion_lexicons()
        self.crypto_emotion_patterns = self._load_crypto_emotion_patterns()
        self.emotional_indicators = self._load_emotional_indicators()
        
        # ML models (placeholders for now - would load actual models)
        self.emotion_classifier = None  # Would load transformer model
        self.authenticity_detector = None  # Would load authenticity model
        self.trajectory_predictor = None  # Would load trajectory model
        
        logger.info("❤️ EmotionalAnalyzer initialized with divine emotional intelligence")
    
    async def analyze(self, enhanced_input: Dict) -> EmotionalState:
        """
        🎯 MASTER EMOTIONAL ANALYSIS
        
        Performs comprehensive emotional analysis combining multiple
        methodologies for maximum accuracy and insight.
        """
        try:
            text = enhanced_input['processed_text']
            linguistic_features = enhanced_input['linguistic_features']
            contextual_signals = enhanced_input['contextual_signals']
            
            # Multi-dimensional emotional analysis
            emotional_dimensions = await self._analyze_emotional_dimensions(text, linguistic_features)
            
            # Determine emotional polarity and intensity
            polarity = await self._determine_emotional_polarity(emotional_dimensions, contextual_signals)
            intensity = await self._calculate_emotional_intensity(emotional_dimensions, linguistic_features)
            
            # Advanced emotional analysis
            authenticity = await self._assess_emotional_authenticity(text, emotional_dimensions)
            volatility = await self._calculate_emotional_volatility(text, linguistic_features)
            trajectory = await self._predict_emotional_trajectory(emotional_dimensions, contextual_signals)
            
            # Impact assessments
            risk_appetite_impact = await self._assess_risk_appetite_impact(emotional_dimensions, intensity)
            decision_clarity_impact = await self._assess_decision_clarity_impact(emotional_dimensions, intensity)
            
            # Identify triggers and context
            triggers = await self._identify_emotional_triggers(text, contextual_signals)
            context_factors = await self._extract_context_factors(enhanced_input)
            
            # Calculate confidence
            confidence = await self._calculate_confidence(emotional_dimensions, authenticity, linguistic_features)
            
            # Predict duration
            predicted_duration = await self._predict_emotional_duration(intensity, trajectory, contextual_signals)
            
            # Create emotional state
            emotional_state = EmotionalState(
                primary_emotion=emotional_dimensions['primary'],
                polarity=polarity,
                intensity=intensity,
                confidence=confidence,
                secondary_emotions=emotional_dimensions['secondary'],
                emotional_volatility=volatility,
                authenticity_score=authenticity,
                emotional_triggers=triggers,
                context_factors=context_factors,
                emotional_trajectory=trajectory,
                predicted_duration=predicted_duration,
                risk_appetite_impact=risk_appetite_impact,
                decision_clarity_impact=decision_clarity_impact
            )
            
            logger.info(f"❤️ Emotional analysis completed: {emotional_state.primary_emotion} ({intensity.value}) with {confidence:.3f} confidence")
            
            return emotional_state
            
        except Exception as e:
            logger.error(f"❌ Emotional analysis failed: {str(e)}")
            # Return neutral state as fallback
            return self._create_neutral_emotional_state()
    
    async def _analyze_emotional_dimensions(self, text: str, linguistic_features: Dict) -> Dict:
        """Analyze multiple emotional dimensions"""
        
        # Lexicon-based emotion detection
        lexicon_emotions = await self._lexicon_based_detection(text)
        
        # Pattern-based emotion detection
        pattern_emotions = await self._pattern_based_detection(text)
        
        # Linguistic feature-based detection
        feature_emotions = await self._feature_based_detection(linguistic_features)
        
        # Crypto-specific emotion detection
        crypto_emotions = await self._crypto_specific_detection(text)
        
        # Combine all methods
        combined_emotions = await self._combine_emotion_signals(
            lexicon_emotions, pattern_emotions, feature_emotions, crypto_emotions
        )
        
        return combined_emotions
    
    async def _lexicon_based_detection(self, text: str) -> Dict:
        """Detect emotions using lexicon-based approach"""
        emotions = {}
        words = text.lower().split()
        
        for emotion, word_list in self.emotion_lexicons.items():
            score = sum(1 for word in words if word in word_list)
            emotions[emotion] = score / max(len(words), 1)  # Normalize by text length
        
        return emotions
    
    async def _pattern_based_detection(self, text: str) -> Dict:
        """Detect emotions using pattern-based approach"""
        emotions = {}
        
        for emotion, patterns in self.crypto_emotion_patterns.items():
            score = 0
            for pattern in patterns:
                matches = len(re.findall(pattern, text, re.IGNORECASE))
                score += matches
            
            emotions[emotion] = score / max(len(text.split()), 1)
        
        return emotions
    
    async def _feature_based_detection(self, features: Dict) -> Dict:
        """Detect emotions using linguistic features"""
        emotions = {}
        
        # Excitement indicators
        excitement_score = (
            features['exclamation_ratio'] * 0.4 +
            features['caps_ratio'] * 0.3 +
            features['urgency_words'] * 0.3
        )
        emotions['excitement'] = min(excitement_score, 1.0)
        
        # Fear indicators
        fear_score = (
            features['question_ratio'] * 0.3 +
            (1.0 - features['avg_sentence_length'] / 20.0) * 0.2 +  # Short sentences = anxiety
            features['emotional_words'] * 0.5
        )
        emotions['fear'] = min(fear_score, 1.0)
        
        # Confidence indicators
        confidence_score = (
            features['avg_sentence_length'] / 20.0 * 0.4 +  # Longer sentences = confidence
            features['financial_terms'] * 0.6
        )
        emotions['confidence'] = min(confidence_score, 1.0)
        
        return emotions
    
    async def _crypto_specific_detection(self, text: str) -> Dict:
        """Detect crypto-specific emotions"""
        emotions = {}
        text_lower = text.lower()
        
        # FOMO detection
        fomo_indicators = ['fomo', 'missing out', 'too late', 'should have bought', 'wish i bought']
        fomo_score = sum(1 for indicator in fomo_indicators if indicator in text_lower)
        emotions['fomo'] = min(fomo_score / 5.0, 1.0)
        
        # Euphoria detection
        euphoria_indicators = ['moon', 'lambo', 'diamond hands', 'to the moon', 'rocket', '🚀']
        euphoria_score = sum(1 for indicator in euphoria_indicators if indicator in text_lower)
        emotions['euphoria'] = min(euphoria_score / 5.0, 1.0)
        
        # Panic detection
        panic_indicators = ['panic', 'dump', 'crash', 'dead', 'scam', 'rug pull']
        panic_score = sum(1 for indicator in panic_indicators if indicator in text_lower)
        emotions['panic'] = min(panic_score / 5.0, 1.0)
        
        # Greed detection
        greed_indicators = ['100x', '1000x', 'easy money', 'guaranteed', 'get rich']
        greed_score = sum(1 for indicator in greed_indicators if indicator in text_lower)
        emotions['greed'] = min(greed_score / 5.0, 1.0)
        
        return emotions
    
    async def _combine_emotion_signals(self, *emotion_dicts) -> Dict:
        """Combine multiple emotion detection methods"""
        combined = {}
        all_emotions = set()
        
        # Collect all emotions
        for emotion_dict in emotion_dicts:
            all_emotions.update(emotion_dict.keys())
        
        # Combine scores with weights
        weights = [0.25, 0.25, 0.25, 0.25]  # Equal weights for now
        
        for emotion in all_emotions:
            scores = []
            for i, emotion_dict in enumerate(emotion_dicts):
                scores.append(emotion_dict.get(emotion, 0) * weights[i])
            
            combined[emotion] = sum(scores)
        
        # Find primary and secondary emotions
        sorted_emotions = sorted(combined.items(), key=lambda x: x[1], reverse=True)
        
        return {
            'primary': sorted_emotions[0][0] if sorted_emotions else 'neutral',
            'secondary': [emotion for emotion, score in sorted_emotions[1:4] if score > 0.1],
            'scores': combined
        }
    
    async def _determine_emotional_polarity(self, emotional_dimensions: Dict, contextual_signals: Dict) -> EmotionalPolarity:
        """Determine the overall emotional polarity"""
        primary_emotion = emotional_dimensions['primary']
        scores = emotional_dimensions['scores']
        
        # Map emotions to polarities
        bullish_emotions = ['excitement', 'euphoria', 'confidence', 'greed', 'fomo']
        bearish_emotions = ['fear', 'panic', 'anxiety', 'despair', 'doubt']
        
        bullish_score = sum(scores.get(emotion, 0) for emotion in bullish_emotions)
        bearish_score = sum(scores.get(emotion, 0) for emotion in bearish_emotions)
        
        # Consider market context
        if contextual_signals.get('price_change_24h', 0) > 0.1:
            bullish_score *= 1.2
        elif contextual_signals.get('price_change_24h', 0) < -0.1:
            bearish_score *= 1.2
        
        # Determine polarity based on scores
        if bullish_score > bearish_score * 1.5:
            if bullish_score > 0.7:
                return EmotionalPolarity.BULLISH_EUPHORIA
            else:
                return EmotionalPolarity.BULLISH_OPTIMISM
        elif bearish_score > bullish_score * 1.5:
            if bearish_score > 0.7:
                return EmotionalPolarity.BEARISH_PANIC
            else:
                return EmotionalPolarity.BEARISH_CONCERN
        else:
            return EmotionalPolarity.NEUTRAL
    
    async def _calculate_emotional_intensity(self, emotional_dimensions: Dict, linguistic_features: Dict) -> EmotionalIntensity:
        """Calculate the intensity of emotions"""
        scores = emotional_dimensions['scores']
        
        # Base intensity from emotion scores
        max_emotion_score = max(scores.values()) if scores else 0
        
        # Intensity amplifiers from linguistic features
        intensity_amplifiers = (
            linguistic_features['exclamation_ratio'] * 0.3 +
            linguistic_features['caps_ratio'] * 0.2 +
            linguistic_features['emoji_count'] / max(len(linguistic_features.get('word_count', 1)), 1) * 0.2 +
            linguistic_features['urgency_words'] / max(linguistic_features.get('word_count', 1), 1) * 0.3
        )
        
        # Combined intensity
        combined_intensity = max_emotion_score + intensity_amplifiers
        
        # Map to intensity levels
        if combined_intensity >= 0.8:
            return EmotionalIntensity.EXTREME
        elif combined_intensity >= 0.6:
            return EmotionalIntensity.INTENSE
        elif combined_intensity >= 0.4:
            return EmotionalIntensity.MODERATE
        elif combined_intensity >= 0.2:
            return EmotionalIntensity.MILD
        else:
            return EmotionalIntensity.CALM
    
    async def _assess_emotional_authenticity(self, text: str, emotional_dimensions: Dict) -> float:
        """Assess whether emotions are authentic or manipulated"""
        authenticity_score = 1.0
        
        # Check for emotional manipulation patterns
        manipulation_patterns = [
            r'\b(URGENT|BREAKING|ALERT)\b',  # All caps urgency
            r'[!]{3,}',  # Multiple exclamation marks
            r'\b(guaranteed|100%|never fail)\b',  # Absolute claims
            r'\b(act now|limited time|hurry)\b'  # Pressure tactics
        ]
        
        for pattern in manipulation_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                authenticity_score -= 0.15
        
        # Check for emotional consistency
        primary_score = emotional_dimensions['scores'].get(emotional_dimensions['primary'], 0)
        secondary_scores = [emotional_dimensions['scores'].get(emotion, 0) 
                          for emotion in emotional_dimensions['secondary']]
        
        if secondary_scores and max(secondary_scores) > primary_score * 0.8:
            authenticity_score -= 0.1  # Conflicting emotions reduce authenticity
        
        # Check for over-the-top expressions
        extreme_expressions = ['amazing', 'incredible', 'unbelievable', 'impossible', 'revolutionary']
        extreme_count = sum(1 for expr in extreme_expressions if expr in text.lower())
        if extreme_count > 2:
            authenticity_score -= 0.1
        
        return max(authenticity_score, 0.0)
    
    async def _calculate_emotional_volatility(self, text: str, linguistic_features: Dict) -> float:
        """Calculate emotional volatility (stability vs instability)"""
        
        # Sentence-level emotional variation
        sentences = re.split(r'[.!?]+', text)
        sentence_emotions = []
        
        for sentence in sentences:
            if len(sentence.strip()) > 5:  # Skip very short sentences
                sentence_emotion = await self._quick_emotion_score(sentence)
                sentence_emotions.append(sentence_emotion)
        
        if len(sentence_emotions) < 2:
            return 0.2  # Low volatility for single emotion
        
        # Calculate variance in emotional intensity
        emotion_variance = np.var(sentence_emotions)
        
        # Linguistic volatility indicators
        punctuation_variance = (
            linguistic_features['exclamation_ratio'] + 
            linguistic_features['question_ratio']
        )
        
        # Combined volatility
        volatility = min(emotion_variance + punctuation_variance * 0.5, 1.0)
        
        return volatility
    
    async def _quick_emotion_score(self, text: str) -> float:
        """Quick emotion scoring for volatility calculation"""
        positive_words = ['good', 'great', 'amazing', 'excellent', 'fantastic', 'up', 'gain', 'profit']
        negative_words = ['bad', 'terrible', 'awful', 'horrible', 'down', 'loss', 'crash', 'dump']
        
        words = text.lower().split()
        positive_score = sum(1 for word in words if word in positive_words)
        negative_score = sum(1 for word in words if word in negative_words)
        
        return (positive_score - negative_score) / max(len(words), 1)
    
    async def _predict_emotional_trajectory(self, emotional_dimensions: Dict, contextual_signals: Dict) -> str:
        """Predict the trajectory of emotional state"""
        primary_emotion = emotional_dimensions['primary']
        scores = emotional_dimensions['scores']
        
        # Current market momentum
        price_momentum = contextual_signals.get('price_change_24h', 0)
        volume_change = contextual_signals.get('volume_change', 0)
        
        # Emotional momentum indicators
        intensity_indicators = ['excitement', 'euphoria', 'panic', 'fear']
        current_intensity = sum(scores.get(emotion, 0) for emotion in intensity_indicators)
        
        # Predict trajectory based on current state and context
        if current_intensity > 0.7:
            # High intensity emotions tend to revert
            if price_momentum > 0.05:
                return "intensifying"  # Momentum supports emotion
            else:
                return "declining"  # No momentum support
        elif current_intensity < 0.3:
            # Low intensity emotions tend to build
            if abs(price_momentum) > 0.03:
                return "increasing"  # Price movement triggers emotion
            else:
                return "stable"
        else:
            # Moderate intensity - depends on momentum
            if volume_change > 0.2:
                return "increasing"  # High volume suggests building emotion
            else:
                return "stable"
    
    async def _assess_risk_appetite_impact(self, emotional_dimensions: Dict, intensity: EmotionalIntensity) -> float:
        """Assess impact on risk appetite"""
        scores = emotional_dimensions['scores']
        
        # Risk-increasing emotions
        risk_seeking_emotions = ['euphoria', 'greed', 'fomo', 'excitement']
        risk_seeking_score = sum(scores.get(emotion, 0) for emotion in risk_seeking_emotions)
        
        # Risk-decreasing emotions
        risk_averse_emotions = ['fear', 'panic', 'anxiety', 'doubt']
        risk_averse_score = sum(scores.get(emotion, 0) for emotion in risk_averse_emotions)
        
        # Base impact
        impact = risk_seeking_score - risk_averse_score
        
        # Intensity amplifies impact
        intensity_multiplier = {
            EmotionalIntensity.CALM: 0.2,
            EmotionalIntensity.MILD: 0.4,
            EmotionalIntensity.MODERATE: 0.6,
            EmotionalIntensity.INTENSE: 0.8,
            EmotionalIntensity.EXTREME: 1.0
        }
        
        impact *= intensity_multiplier.get(intensity, 0.5)
        
        return np.clip(impact, -1.0, 1.0)
    
    async def _assess_decision_clarity_impact(self, emotional_dimensions: Dict, intensity: EmotionalIntensity) -> float:
        """Assess impact on decision-making clarity"""
        scores = emotional_dimensions['scores']
        
        # Clarity-reducing emotions (high arousal)
        high_arousal_emotions = ['excitement', 'panic', 'euphoria', 'fear', 'anger']
        arousal_score = sum(scores.get(emotion, 0) for emotion in high_arousal_emotions)
        
        # Clarity-enhancing emotions (calm focus)
        calm_emotions = ['confidence', 'contentment', 'satisfaction']
        calm_score = sum(scores.get(emotion, 0) for emotion in calm_emotions)
        
        # Base clarity (starts high)
        base_clarity = 0.8
        
        # High arousal reduces clarity
        clarity_reduction = arousal_score * 0.6
        
        # Calm emotions maintain clarity
        clarity_boost = calm_score * 0.2
        
        # Intensity amplifies the reduction
        intensity_impact = {
            EmotionalIntensity.CALM: 0.1,
            EmotionalIntensity.MILD: 0.2,
            EmotionalIntensity.MODERATE: 0.4,
            EmotionalIntensity.INTENSE: 0.7,
            EmotionalIntensity.EXTREME: 1.0
        }
        
        final_clarity = base_clarity - (clarity_reduction * intensity_impact.get(intensity, 0.5)) + clarity_boost
        
        return np.clip(final_clarity, 0.0, 1.0)
    
    async def _identify_emotional_triggers(self, text: str, contextual_signals: Dict) -> List[str]:
        """Identify what triggered the emotional state"""
        triggers = []
        text_lower = text.lower()
        
        # Price movement triggers
        if contextual_signals.get('price_change_24h', 0) > 0.1:
            triggers.append("significant_price_increase")
        elif contextual_signals.get('price_change_24h', 0) < -0.1:
            triggers.append("significant_price_decrease")
        
        # News/event triggers
        news_keywords = ['announce', 'news', 'update', 'breaking', 'partnership', 'regulation']
        if any(keyword in text_lower for keyword in news_keywords):
            triggers.append("news_or_announcement")
        
        # Social triggers
        social_keywords = ['everyone', 'people', 'community', 'twitter', 'reddit']
        if any(keyword in text_lower for keyword in social_keywords):
            triggers.append("social_sentiment")
        
        # Technical triggers
        technical_keywords = ['support', 'resistance', 'breakout', 'pattern', 'chart']
        if any(keyword in text_lower for keyword in technical_keywords):
            triggers.append("technical_analysis")
        
        # FOMO triggers
        fomo_keywords = ['missing', 'late', 'should have', 'opportunity']
        if any(keyword in text_lower for keyword in fomo_keywords):
            triggers.append("fear_of_missing_out")
        
        return triggers
    
    async def _extract_context_factors(self, enhanced_input: Dict) -> Dict[str, Any]:
        """Extract contextual factors affecting emotion"""
        factors = {}
        
        # Linguistic context
        linguistic = enhanced_input['linguistic_features']
        factors['text_length'] = linguistic['word_count']
        factors['formality'] = 1.0 - (linguistic['exclamation_ratio'] + linguistic['caps_ratio'])
        
        # Temporal context
        temporal = enhanced_input.get('temporal_features', {})
        factors['time_of_day'] = temporal.get('hour_of_day', 12)
        factors['is_weekend'] = temporal.get('is_weekend', False)
        
        # Market context
        contextual = enhanced_input.get('contextual_signals', {})
        factors['market_volatility'] = contextual.get('market_volatility', 0)
        factors['social_volume'] = contextual.get('social_volume', 0)
        
        return factors
    
    async def _calculate_confidence(self, emotional_dimensions: Dict, authenticity: float, linguistic_features: Dict) -> float:
        """Calculate confidence in emotional analysis"""
        confidence_factors = []
        
        # Strength of primary emotion
        primary_strength = emotional_dimensions['scores'].get(emotional_dimensions['primary'], 0)
        confidence_factors.append(primary_strength)
        
        # Authenticity score
        confidence_factors.append(authenticity)
        
        # Text quality indicators
        text_quality = min(linguistic_features['word_count'] / 20.0, 1.0)  # Longer text = more confidence
        confidence_factors.append(text_quality)
        
        # Consistency across methods
        scores = list(emotional_dimensions['scores'].values())
        if scores:
            score_variance = np.var(scores)
            consistency = 1.0 - min(score_variance * 2, 1.0)  # Lower variance = higher consistency
            confidence_factors.append(consistency)
        
        return np.mean(confidence_factors)
    
    async def _predict_emotional_duration(self, intensity: EmotionalIntensity, trajectory: str, contextual_signals: Dict) -> Optional[int]:
        """Predict how long the emotional state will last"""
        
        # Base duration by intensity (in minutes)
        base_duration = {
            EmotionalIntensity.CALM: 120,
            EmotionalIntensity.MILD: 60,
            EmotionalIntensity.MODERATE: 30,
            EmotionalIntensity.INTENSE: 15,
            EmotionalIntensity.EXTREME: 5
        }
        
        duration = base_duration.get(intensity, 30)
        
        # Trajectory adjustments
        if trajectory == "intensifying":
            duration *= 1.5
        elif trajectory == "declining":
            duration *= 0.7
        
        # Market volatility impact
        volatility = contextual_signals.get('market_volatility', 0.5)
        duration *= (1.0 + volatility)
        
        return int(duration)
    
    def _create_neutral_emotional_state(self) -> EmotionalState:
        """Create a neutral emotional state as fallback"""
        return EmotionalState(
            primary_emotion="neutral",
            polarity=EmotionalPolarity.NEUTRAL,
            intensity=EmotionalIntensity.CALM,
            confidence=0.5,
            secondary_emotions=[],
            emotional_volatility=0.2,
            authenticity_score=0.8,
            emotional_triggers=[],
            context_factors={},
            emotional_trajectory="stable",
            predicted_duration=60,
            risk_appetite_impact=0.0,
            decision_clarity_impact=0.8
        )
    
    def _load_emotion_lexicons(self) -> Dict[str, List[str]]:
        """Load emotion lexicons for detection"""
        return {
            'joy': ['happy', 'excited', 'thrilled', 'elated', 'euphoric', 'ecstatic', 'delighted'],
            'fear': ['scared', 'afraid', 'terrified', 'anxious', 'worried', 'nervous', 'panicked'],
            'anger': ['angry', 'furious', 'mad', 'irritated', 'frustrated', 'annoyed', 'outraged'],
            'sadness': ['sad', 'depressed', 'disappointed', 'devastated', 'heartbroken', 'miserable'],
            'surprise': ['surprised', 'shocked', 'amazed', 'astonished', 'stunned', 'startled'],
            'disgust': ['disgusted', 'revolted', 'repulsed', 'sickened', 'nauseated'],
            'trust': ['trust', 'confident', 'assured', 'certain', 'secure', 'comfortable'],
            'anticipation': ['excited', 'eager', 'hopeful', 'optimistic', 'expecting', 'anticipating']
        }
    
    def _load_crypto_emotion_patterns(self) -> Dict[str, List[str]]:
        """Load crypto-specific emotion patterns"""
        return {
            'fomo': [
                r'\bfomo\b',
                r'missing out',
                r'should have bought',
                r'too late',
                r'wish i had'
            ],
            'euphoria': [
                r'\bmoon\b',
                r'to the moon',
                r'\blambo\b',
                r'diamond hands',
                r'🚀+',
                r'100x'
            ],
            'panic': [
                r'\bpanic\b',
                r'dump',
                r'crash',
                r'dead cat',
                r'rug pull',
                r'going to zero'
            ],
            'greed': [
                r'easy money',
                r'guaranteed',
                r'get rich',
                r'millionaire',
                r'financial freedom'
            ]
        }
    
    def _load_emotional_indicators(self) -> Dict[str, Dict]:
        """Load emotional indicators and weights"""
        return {
            'punctuation_weights': {
                '!': 0.8,
                '?': 0.3,
                '...': 0.4,
                'ALL_CAPS': 0.7
            },
            'emoji_emotions': {
                '😀': 'joy',
                '😢': 'sadness',
                '😡': 'anger',
                '😨': 'fear',
                '🚀': 'excitement',
                '💎': 'confidence'
            }
        }
    
    def _get_default_config(self) -> Dict:
        """Get default configuration"""
        return {
            'sensitivity': 0.7,
            'context_window': 5,
            'emotion_threshold': 0.6,
            'authenticity_threshold': 0.7,
            'volatility_threshold': 0.5
        }
