"""
🌊 CROWD PSYCHOLOGY PREDICTOR - DIVINE MASS BEHAVIOR PREDICTION
==============================================================

Revolutionary crowd psychology prediction engine that forecasts mass
psychological movements, herd behavior, and collective decision-making
in cryptocurrency markets with unprecedented accuracy.

BREAKTHROUGH CAPABILITIES:
- Mass psychology modeling
- Herd behavior prediction
- Panic/euphoria cascade forecasting
- Tipping point identification
- Collective intelligence assessment
- Crowd wisdom vs madness detection
- Social contagion modeling
- Mass coordination prediction

"Madness is rare in individuals — but in groups, parties, nations, and ages, it is the rule." - Nietzsche
We predict when crowds become wise and when they descend into madness.
"""

import asyncio
import logging
import re
import numpy as np
from typing import Dict, List, Optional, Tuple, Any, Set
from datetime import datetime, timedelta
import json
from collections import defaultdict, Counter
from dataclasses import dataclass
import math

from ..models.psychological_patterns import (
    CrowdBehavior,
    CrowdBehaviorType
)

logger = logging.getLogger(__name__)

@dataclass
class CrowdState:
    """Current state of crowd psychology"""
    dominant_emotion: str
    emotional_intensity: float
    coherence_level: float  # How unified the crowd is
    volatility: float
    direction: str  # bullish/bearish/neutral
    momentum: float
    stability: float
    contagion_rate: float
    critical_mass_reached: bool
    tipping_point_proximity: float

@dataclass
class BehaviorCascade:
    """Cascade of crowd behavior"""
    trigger_event: str
    cascade_type: str
    propagation_speed: float
    affected_population: float
    intensity_curve: List[float]
    duration_estimate: int
    reversal_probability: float

@dataclass
class CrowdIntelligence:
    """Collective intelligence metrics"""
    wisdom_score: float  # Crowd wisdom vs madness
    diversity_index: float
    independence_level: float
    aggregation_efficiency: float
    error_correlation: float
    predictive_accuracy: float

class CrowdPsychologyPredictor:
    """
    🌊 DIVINE CROWD PSYCHOLOGY PREDICTOR
    
    This predictor uses advanced crowd dynamics modeling, social physics,
    and collective behavior analysis to forecast mass psychological
    movements in crypto markets with divine precision.
    
    DIVINE CAPABILITIES:
    - Real-time crowd state assessment
    - Behavior cascade prediction
    - Tipping point identification
    - Collective intelligence evaluation
    - Social contagion modeling
    - Mass coordination detection
    """
    
    def __init__(self, config: Optional[Dict] = None):
        """Initialize the crowd psychology predictor"""
        self.config = config or self._get_default_config()
        
        # Crowd analysis systems
        self.crowd_state_analyzer = CrowdStateAnalyzer()
        self.cascade_predictor = CascadePredictor()
        self.tipping_point_detector = TippingPointDetector()
        self.collective_intelligence_assessor = CollectiveIntelligenceAssessor()
        self.contagion_modeler = ContagionModeler()
        self.coordination_detector = CoordinationDetector()
        
        # Historical tracking
        self.crowd_history = defaultdict(list)
        self.cascade_history = []
        self.prediction_accuracy = defaultdict(float)
        
        # Models and patterns
        self.behavior_patterns = self._load_behavior_patterns()
        self.cascade_models = self._load_cascade_models()
        self.contagion_parameters = self._load_contagion_parameters()
        
        logger.info("🌊 CrowdPsychologyPredictor initialized with divine mass behavior prediction")
    
    async def predict(self, enhanced_input: Dict) -> Optional[CrowdBehavior]:
        """
        🎯 MASTER CROWD PSYCHOLOGY PREDICTION
        
        Performs comprehensive crowd psychology analysis to predict
        mass behavior and collective decision-making patterns.
        """
        try:
            text = enhanced_input['processed_text']
            contextual_signals = enhanced_input.get('contextual_signals', {})
            social_features = enhanced_input.get('social_features', {})
            temporal_features = enhanced_input.get('temporal_features', {})
            
            # 1. Analyze current crowd state
            crowd_state = await self.crowd_state_analyzer.analyze(
                text, contextual_signals, social_features
            )
            
            # 2. Detect behavior patterns
            behavior_type = await self._identify_behavior_type(crowd_state, text)
            
            # 3. Predict cascades
            cascade_prediction = await self.cascade_predictor.predict(
                crowd_state, behavior_type, contextual_signals
            )
            
            # 4. Detect tipping points
            tipping_point = await self.tipping_point_detector.detect(
                crowd_state, cascade_prediction, temporal_features
            )
            
            # 5. Assess collective intelligence
            collective_intelligence = await self.collective_intelligence_assessor.assess(
                crowd_state, social_features, text
            )
            
            # 6. Model contagion dynamics
            contagion_dynamics = await self.contagion_modeler.model(
                crowd_state, social_features, contextual_signals
            )
            
            # 7. Detect coordination
            coordination = await self.coordination_detector.detect(
                text, social_features, temporal_features
            )
            
            # 8. Calculate participation and intensity
            participation_rate = await self._calculate_participation_rate(
                crowd_state, social_features, contagion_dynamics
            )
            
            intensity = await self._calculate_intensity(
                crowd_state, cascade_prediction
            )
            
            # 9. Predict momentum and stability
            momentum = await self._predict_momentum(
                crowd_state, cascade_prediction, tipping_point
            )
            
            stability = await self._assess_stability(
                crowd_state, collective_intelligence
            )
            
            # 10. Generate outcome probabilities
            outcome_probabilities = await self._generate_outcome_probabilities(
                behavior_type, crowd_state, cascade_prediction, tipping_point
            )
            
            # 11. Estimate duration
            duration = await self._estimate_duration(
                behavior_type, intensity, stability
            )
            
            # Create crowd behavior prediction if significant
            if intensity > self.config['behavior_threshold']:
                crowd_behavior = CrowdBehavior(
                    behavior_type=behavior_type,
                    intensity=intensity,
                    participation_rate=participation_rate,
                    momentum=momentum,
                    stability=stability,
                    duration_prediction=duration,
                    outcome_probability=outcome_probabilities
                )
                
                # Store for learning
                await self._store_prediction(crowd_behavior, enhanced_input)
                
                logger.info(f"🌊 Crowd psychology prediction: {behavior_type.value} with {intensity:.2f} intensity")
                
                return crowd_behavior
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Crowd psychology prediction failed: {str(e)}")
            return None
    
    async def _identify_behavior_type(self, crowd_state: CrowdState, text: str) -> CrowdBehaviorType:
        """Identify the type of crowd behavior"""
        
        # Check for rational consensus
        if crowd_state.coherence_level > 0.7 and crowd_state.volatility < 0.3:
            return CrowdBehaviorType.RATIONAL_CONSENSUS
        
        # Check for irrational exuberance
        if crowd_state.dominant_emotion == 'euphoria' and crowd_state.emotional_intensity > 0.7:
            return CrowdBehaviorType.IRRATIONAL_EXUBERANCE
        
        # Check for panic selling
        if crowd_state.dominant_emotion == 'fear' and crowd_state.momentum < -0.5:
            return CrowdBehaviorType.PANIC_SELLING
        
        # Check for FOMO buying
        fomo_indicators = ['fomo', 'missing out', 'moon', 'pump']
        if any(indicator in text.lower() for indicator in fomo_indicators) and crowd_state.momentum > 0.5:
            return CrowdBehaviorType.FOMO_BUYING
        
        # Check for herding
        if crowd_state.coherence_level > 0.6 and abs(crowd_state.momentum) > 0.4:
            return CrowdBehaviorType.HERDING
        
        # Check for contrarian revolt
        if 'contrarian' in text.lower() or 'against the crowd' in text.lower():
            return CrowdBehaviorType.CONTRARIAN_REVOLT
        
        # Default to herding
        return CrowdBehaviorType.HERDING
    
    async def _calculate_participation_rate(self, crowd_state: CrowdState, 
                                          social_features: Dict,
                                          contagion_dynamics: Dict) -> float:
        """Calculate crowd participation rate"""
        base_participation = 0.3
        
        # Critical mass increases participation
        if crowd_state.critical_mass_reached:
            base_participation += 0.3
        
        # High contagion rate increases participation
        base_participation += crowd_state.contagion_rate * 0.2
        
        # Social signals
        engagement = social_features.get('engagement_rate', 0)
        base_participation += min(engagement * 5, 0.2)
        
        # Contagion model adjustment
        if contagion_dynamics.get('R0', 1) > 2:  # High reproduction number
            base_participation += 0.1
        
        return min(base_participation, 1.0)
    
    async def _calculate_intensity(self, crowd_state: CrowdState, 
                                  cascade_prediction: Dict) -> float:
        """Calculate behavior intensity"""
        intensity = crowd_state.emotional_intensity
        
        # Cascade amplifies intensity
        if cascade_prediction and cascade_prediction.get('active', False):
            intensity *= (1 + cascade_prediction.get('amplification', 0.2))
        
        # Coherence amplifies intensity
        intensity *= (0.5 + crowd_state.coherence_level * 0.5)
        
        # Volatility can increase intensity
        if crowd_state.volatility > 0.7:
            intensity *= 1.2
        
        return min(intensity, 1.0)
    
    async def _predict_momentum(self, crowd_state: CrowdState,
                              cascade_prediction: Dict,
                              tipping_point: Dict) -> float:
        """Predict crowd momentum"""
        momentum = crowd_state.momentum
        
        # Near tipping point accelerates momentum
        if tipping_point and tipping_point.get('proximity', 0) > 0.7:
            momentum *= 1.5
        
        # Active cascade maintains momentum
        if cascade_prediction and cascade_prediction.get('active', False):
            momentum = momentum * 0.8 + cascade_prediction.get('direction', 0) * 0.2
        
        return np.clip(momentum, -1.0, 1.0)
    
    async def _assess_stability(self, crowd_state: CrowdState,
                              collective_intelligence: CrowdIntelligence) -> float:
        """Assess crowd behavior stability"""
        stability = crowd_state.stability
        
        # High volatility reduces stability
        stability *= (1.0 - crowd_state.volatility * 0.5)
        
        # Collective intelligence increases stability
        if collective_intelligence:
            stability *= (0.5 + collective_intelligence.wisdom_score * 0.5)
        
        # Near tipping point reduces stability
        if crowd_state.tipping_point_proximity > 0.7:
            stability *= 0.6
        
        return max(stability, 0.0)
    
    async def _generate_outcome_probabilities(self, behavior_type: CrowdBehaviorType,
                                            crowd_state: CrowdState,
                                            cascade_prediction: Dict,
                                            tipping_point: Dict) -> Dict[str, float]:
        """Generate probability distribution of outcomes"""
        outcomes = {}
        
        if behavior_type == CrowdBehaviorType.PANIC_SELLING:
            outcomes = {
                'continued_decline': 0.6,
                'stabilization': 0.25,
                'reversal': 0.15
            }
            
            # Adjust based on tipping point
            if tipping_point and tipping_point.get('crossed', False):
                outcomes['continued_decline'] = 0.8
                outcomes['reversal'] = 0.05
        
        elif behavior_type == CrowdBehaviorType.FOMO_BUYING:
            outcomes = {
                'continued_rise': 0.5,
                'consolidation': 0.3,
                'correction': 0.2
            }
            
            # Adjust based on cascade
            if cascade_prediction and cascade_prediction.get('active', False):
                outcomes['continued_rise'] = 0.7
                outcomes['correction'] = 0.1
        
        elif behavior_type == CrowdBehaviorType.IRRATIONAL_EXUBERANCE:
            outcomes = {
                'blow_off_top': 0.4,
                'gradual_decline': 0.35,
                'crash': 0.25
            }
        
        elif behavior_type == CrowdBehaviorType.RATIONAL_CONSENSUS:
            outcomes = {
                'steady_trend': 0.6,
                'minor_fluctuation': 0.3,
                'trend_change': 0.1
            }
        
        elif behavior_type == CrowdBehaviorType.HERDING:
            outcomes = {
                'trend_continuation': 0.5,
                'momentum_loss': 0.3,
                'reversal': 0.2
            }
        
        elif behavior_type == CrowdBehaviorType.CONTRARIAN_REVOLT:
            outcomes = {
                'trend_reversal': 0.4,
                'failed_revolt': 0.35,
                'prolonged_battle': 0.25
            }
        
        return outcomes
    
    async def _estimate_duration(self, behavior_type: CrowdBehaviorType,
                               intensity: float, stability: float) -> Optional[int]:
        """Estimate duration of crowd behavior in minutes"""
        
        # Base duration by behavior type
        base_durations = {
            CrowdBehaviorType.PANIC_SELLING: 30,
            CrowdBehaviorType.FOMO_BUYING: 60,
            CrowdBehaviorType.IRRATIONAL_EXUBERANCE: 120,
            CrowdBehaviorType.RATIONAL_CONSENSUS: 240,
            CrowdBehaviorType.HERDING: 90,
            CrowdBehaviorType.CONTRARIAN_REVOLT: 45
        }
        
        base_duration = base_durations.get(behavior_type, 60)
        
        # Intensity extends duration
        duration = base_duration * (1 + intensity * 0.5)
        
        # Low stability shortens duration
        duration *= (0.5 + stability * 0.5)
        
        return int(duration)
    
    async def _store_prediction(self, crowd_behavior: CrowdBehavior, enhanced_input: Dict):
        """Store prediction for learning and validation"""
        prediction_record = {
            'timestamp': datetime.utcnow(),
            'behavior_type': crowd_behavior.behavior_type.value,
            'intensity': crowd_behavior.intensity,
            'participation_rate': crowd_behavior.participation_rate,
            'momentum': crowd_behavior.momentum,
            'context': enhanced_input.get('contextual_signals', {})
        }
        
        self.crowd_history['predictions'].append(prediction_record)
        
        # Keep only recent history
        if len(self.crowd_history['predictions']) > 100:
            self.crowd_history['predictions'] = self.crowd_history['predictions'][-100:]
    
    def _load_behavior_patterns(self) -> Dict:
        """Load crowd behavior patterns"""
        return {
            'panic': {
                'triggers': ['crash', 'collapse', 'dump', 'sell-off'],
                'indicators': ['fear', 'anxiety', 'urgency'],
                'propagation': 'exponential',
                'duration': 'short'
            },
            'euphoria': {
                'triggers': ['moon', 'pump', 'breakthrough', 'all-time high'],
                'indicators': ['excitement', 'greed', 'overconfidence'],
                'propagation': 'viral',
                'duration': 'medium'
            },
            'herding': {
                'triggers': ['everyone', 'trending', 'popular'],
                'indicators': ['conformity', 'social proof'],
                'propagation': 'linear',
                'duration': 'long'
            }
        }
    
    def _load_cascade_models(self) -> Dict:
        """Load cascade prediction models"""
        return {
            'information_cascade': {
                'threshold': 0.3,
                'amplification': 1.5,
                'decay_rate': 0.1
            },
            'emotional_cascade': {
                'threshold': 0.4,
                'amplification': 2.0,
                'decay_rate': 0.2
            },
            'behavioral_cascade': {
                'threshold': 0.5,
                'amplification': 1.8,
                'decay_rate': 0.15
            }
        }
    
    def _load_contagion_parameters(self) -> Dict:
        """Load social contagion parameters"""
        return {
            'base_transmission_rate': 0.3,
            'recovery_rate': 0.1,
            'immunity_rate': 0.05,
            'super_spreader_factor': 3.0
        }
    
    def _get_default_config(self) -> Dict:
        """Get default configuration"""
        return {
            'behavior_threshold': 0.6,
            'prediction_horizon': 24,  # hours
            'cascade_detection': True,
            'tipping_point_detection': True
        }


class CrowdStateAnalyzer:
    """Analyze current state of crowd psychology"""
    
    async def analyze(self, text: str, contextual_signals: Dict, 
                     social_features: Dict) -> CrowdState:
        """Analyze current crowd state"""
        
        # Detect dominant emotion
        dominant_emotion = await self._detect_dominant_emotion(text)
        
        # Calculate emotional intensity
        emotional_intensity = await self._calculate_emotional_intensity(text, contextual_signals)
        
        # Assess coherence level
        coherence_level = await self._assess_coherence(text, social_features)
        
        # Calculate volatility
        volatility = await self._calculate_volatility(contextual_signals)
        
        # Determine direction
        direction = await self._determine_direction(text, contextual_signals)
        
        # Calculate momentum
        momentum = await self._calculate_momentum(direction, contextual_signals)
        
        # Assess stability
        stability = await self._assess_stability(volatility, coherence_level)
        
        # Calculate contagion rate
        contagion_rate = await self._calculate_contagion_rate(
            emotional_intensity, social_features
        )
        
        # Check critical mass
        critical_mass_reached = await self._check_critical_mass(
            contagion_rate, social_features
        )
        
        # Calculate tipping point proximity
        tipping_point_proximity = await self._calculate_tipping_point_proximity(
            emotional_intensity, momentum, volatility
        )
        
        return CrowdState(
            dominant_emotion=dominant_emotion,
            emotional_intensity=emotional_intensity,
            coherence_level=coherence_level,
            volatility=volatility,
            direction=direction,
            momentum=momentum,
            stability=stability,
            contagion_rate=contagion_rate,
            critical_mass_reached=critical_mass_reached,
            tipping_point_proximity=tipping_point_proximity
        )
    
    async def _detect_dominant_emotion(self, text: str) -> str:
        """Detect dominant crowd emotion"""
        emotions = {
            'fear': ['panic', 'scared', 'worried', 'anxious', 'crash'],
            'greed': ['moon', 'lambo', 'rich', 'pump', 'gains'],
            'euphoria': ['amazing', 'incredible', 'breakthrough', 'revolutionary'],
            'anger': ['scam', 'fraud', 'manipulation', 'corrupt'],
            'hope': ['future', 'potential', 'opportunity', 'growth']
        }
        
        emotion_scores = {}
        for emotion, keywords in emotions.items():
            score = sum(1 for keyword in keywords if keyword in text.lower())
            emotion_scores[emotion] = score
        
        if emotion_scores:
            return max(emotion_scores, key=emotion_scores.get)
        
        return 'neutral'
    
    async def _calculate_emotional_intensity(self, text: str, contextual_signals: Dict) -> float:
        """Calculate emotional intensity of crowd"""
        intensity = 0.3
        
        # Exclamation marks indicate intensity
        exclamation_count = text.count('!')
        intensity += min(exclamation_count * 0.1, 0.3)
        
        # Caps indicate intensity
        caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
        intensity += min(caps_ratio * 2, 0.2)
        
        # Market volatility amplifies emotions
        volatility = contextual_signals.get('market_volatility', 0)
        intensity *= (1 + volatility * 0.5)
        
        return min(intensity, 1.0)
    
    async def _assess_coherence(self, text: str, social_features: Dict) -> float:
        """Assess how unified the crowd is"""
        coherence = 0.5
        
        # Consensus language increases coherence
        consensus_words = ['everyone', 'all', 'unanimous', 'agreed', 'consensus']
        consensus_count = sum(1 for word in consensus_words if word in text.lower())
        coherence += min(consensus_count * 0.15, 0.3)
        
        # High engagement indicates coherence
        engagement = social_features.get('engagement_rate', 0)
        coherence += min(engagement * 5, 0.2)
        
        return min(coherence, 1.0)
    
    async def _calculate_volatility(self, contextual_signals: Dict) -> float:
        """Calculate crowd volatility"""
        market_volatility = contextual_signals.get('market_volatility', 0.5)
        volume_change = abs(contextual_signals.get('volume_change', 0))
        
        volatility = (market_volatility * 0.7 + min(volume_change, 1.0) * 0.3)
        
        return volatility
    
    async def _determine_direction(self, text: str, contextual_signals: Dict) -> str:
        """Determine crowd direction"""
        bullish_words = ['buy', 'long', 'moon', 'pump', 'bullish', 'up']
        bearish_words = ['sell', 'short', 'dump', 'crash', 'bearish', 'down']
        
        bullish_score = sum(1 for word in bullish_words if word in text.lower())
        bearish_score = sum(1 for word in bearish_words if word in text.lower())
        
        # Consider market context
        price_change = contextual_signals.get('price_change_24h', 0)
        if price_change > 0.05:
            bullish_score += 2
        elif price_change < -0.05:
            bearish_score += 2
        
        if bullish_score > bearish_score:
            return 'bullish'
        elif bearish_score > bullish_score:
            return 'bearish'
        else:
            return 'neutral'
    
    async def _calculate_momentum(self, direction: str, contextual_signals: Dict) -> float:
        """Calculate crowd momentum"""
        base_momentum = 0.0
        
        if direction == 'bullish':
            base_momentum = 0.5
        elif direction == 'bearish':
            base_momentum = -0.5
        
        # Price change affects momentum
        price_change = contextual_signals.get('price_change_24h', 0)
        base_momentum += np.clip(price_change * 5, -0.5, 0.5)
        
        # Volume change affects momentum
        volume_change = contextual_signals.get('volume_change', 0)
        base_momentum += np.clip(volume_change * 0.3, -0.2, 0.2)
        
        return np.clip(base_momentum, -1.0, 1.0)
    
    async def _assess_stability(self, volatility: float, coherence: float) -> float:
        """Assess crowd stability"""
        # High volatility reduces stability
        stability = 1.0 - volatility * 0.6
        
        # High coherence increases stability
        stability += coherence * 0.3
        
        return np.clip(stability, 0.0, 1.0)
    
    async def _calculate_contagion_rate(self, emotional_intensity: float, 
                                       social_features: Dict) -> float:
        """Calculate social contagion rate"""
        base_rate = emotional_intensity * 0.5
        
        # Social reach affects contagion
        followers = social_features.get('follower_count', 0)
        if followers > 10000:
            base_rate += 0.2
        elif followers > 1000:
            base_rate += 0.1
        
        # Engagement affects contagion
        engagement = social_features.get('engagement_rate', 0)
        base_rate += min(engagement * 10, 0.3)
        
        return min(base_rate, 1.0)
    
    async def _check_critical_mass(self, contagion_rate: float, 
                                  social_features: Dict) -> bool:
        """Check if critical mass has been reached"""
        # High contagion rate indicates critical mass
        if contagion_rate > 0.7:
            return True
        
        # High engagement indicates critical mass
        if social_features.get('engagement_rate', 0) > 0.1:
            return True
        
        # Large audience can indicate critical mass
        if social_features.get('follower_count', 0) > 50000:
            return True
        
        return False
    
    async def _calculate_tipping_point_proximity(self, emotional_intensity: float,
                                                momentum: float, volatility: float) -> float:
        """Calculate proximity to tipping point"""
        proximity = 0.0
        
        # High emotional intensity brings closer to tipping point
        proximity += emotional_intensity * 0.4
        
        # Strong momentum indicates approaching tipping point
        proximity += abs(momentum) * 0.3
        
        # High volatility indicates instability near tipping point
        proximity += volatility * 0.3
        
        return min(proximity, 1.0)


class CascadePredictor:
    """Predict behavior cascades"""
    
    async def predict(self, crowd_state: CrowdState, behavior_type: CrowdBehaviorType,
                     contextual_signals: Dict) -> Dict:
        """Predict cascade dynamics"""
        cascade = {
            'active': False,
            'type': None,
            'amplification': 0.0,
            'direction': 0.0,
            'propagation_speed': 0.0,
            'affected_population': 0.0
        }
        
        # Check cascade conditions
        if crowd_state.emotional_intensity > 0.7 and crowd_state.contagion_rate > 0.6:
            cascade['active'] = True
            
            # Determine cascade type
            if behavior_type in [CrowdBehaviorType.PANIC_SELLING, CrowdBehaviorType.FOMO_BUYING]:
                cascade['type'] = 'emotional_cascade'
                cascade['amplification'] = 0.5
            elif behavior_type == CrowdBehaviorType.HERDING:
                cascade['type'] = 'information_cascade'
                cascade['amplification'] = 0.3
            else:
                cascade['type'] = 'behavioral_cascade'
                cascade['amplification'] = 0.4
            
            # Set direction based on crowd momentum
            cascade['direction'] = crowd_state.momentum
            
            # Calculate propagation speed
            cascade['propagation_speed'] = crowd_state.contagion_rate * crowd_state.emotional_intensity
            
            # Estimate affected population
            cascade['affected_population'] = min(
                crowd_state.contagion_rate * crowd_state.coherence_level * 1.5,
                1.0
            )
        
        return cascade


class TippingPointDetector:
    """Detect psychological tipping points"""
    
    async def detect(self, crowd_state: CrowdState, cascade_prediction: Dict,
                    temporal_features: Dict) -> Dict:
        """Detect tipping points"""
        tipping_point = {
            'proximity': crowd_state.tipping_point_proximity,
            'crossed': False,
            'type': None,
            'reversal_probability': 0.0
        }
        
        # Check if tipping point crossed
        if crowd_state.tipping_point_proximity > 0.8:
            tipping_point['crossed'] = True
            
            # Determine type
            if crowd_state.dominant_emotion == 'fear':
                tipping_point['type'] = 'panic_tipping_point'
                tipping_point['reversal_probability'] = 0.2
            elif crowd_state.dominant_emotion == 'euphoria':
                tipping_point['type'] = 'euphoria_tipping_point'
                tipping_point['reversal_probability'] = 0.4
            else:
                tipping_point['type'] = 'momentum_tipping_point'
                tipping_point['reversal_probability'] = 0.3
        
        # Active cascade increases tipping point likelihood
        if cascade_prediction and cascade_prediction.get('active', False):
            tipping_point['proximity'] = min(tipping_point['proximity'] * 1.2, 1.0)
        
        return tipping_point


class CollectiveIntelligenceAssessor:
    """Assess collective intelligence of crowd"""
    
    async def assess(self, crowd_state: CrowdState, social_features: Dict, 
                    text: str) -> CrowdIntelligence:
        """Assess collective intelligence"""
        
        # Calculate wisdom score
        wisdom_score = await self._calculate_wisdom_score(crowd_state, text)
        
        # Calculate diversity index
        diversity_index = await self._calculate_diversity(text, social_features)
        
        # Calculate independence level
        independence_level = await self._calculate_independence(crowd_state)
        
        # Calculate aggregation efficiency
        aggregation_efficiency = await self._calculate_aggregation_efficiency(
            crowd_state, diversity_index
        )
        
        # Calculate error correlation
        error_correlation = await self._calculate_error_correlation(crowd_state)
        
        # Calculate predictive accuracy
        predictive_accuracy = await self._calculate_predictive_accuracy(
            wisdom_score, diversity_index, independence_level
        )
        
        return CrowdIntelligence(
            wisdom_score=wisdom_score,
            diversity_index=diversity_index,
            independence_level=independence_level,
            aggregation_efficiency=aggregation_efficiency,
            error_correlation=error_correlation,
            predictive_accuracy=predictive_accuracy
        )
    
    async def _calculate_wisdom_score(self, crowd_state: CrowdState, text: str) -> float:
        """Calculate crowd wisdom vs madness"""
        wisdom = 0.5
        
        # Low emotional intensity increases wisdom
        wisdom += (1.0 - crowd_state.emotional_intensity) * 0.3
        
        # Stability increases wisdom
        wisdom += crowd_state.stability * 0.2
        
        # Rational language increases wisdom
        rational_words = ['analysis', 'data', 'evidence', 'research', 'study']
        rational_count = sum(1 for word in rational_words if word in text.lower())
        wisdom += min(rational_count * 0.1, 0.3)
        
        # High volatility decreases wisdom
        wisdom -= crowd_state.volatility * 0.2
        
        return np.clip(wisdom, 0.0, 1.0)
    
    async def _calculate_diversity(self, text: str, social_features: Dict) -> float:
        """Calculate opinion diversity"""
        diversity = 0.5
        
        # Conflicting opinions increase diversity
        if 'however' in text.lower() or 'but' in text.lower() or 'although' in text.lower():
            diversity += 0.2
        
        # Questions indicate diversity of thought
        question_count = text.count('?')
        diversity += min(question_count * 0.1, 0.2)
        
        # Low engagement might indicate diverse opinions
        engagement = social_features.get('engagement_rate', 0)
        if engagement < 0.05:
            diversity += 0.1
        
        return min(diversity, 1.0)
    
    async def _calculate_independence(self, crowd_state: CrowdState) -> float:
        """Calculate independence of crowd members"""
        independence = 1.0
        
        # High coherence reduces independence
        independence -= crowd_state.coherence_level * 0.4
        
        # High contagion reduces independence
        independence -= crowd_state.contagion_rate * 0.3
        
        # Critical mass reduces independence
        if crowd_state.critical_mass_reached:
            independence -= 0.2
        
        return max(independence, 0.0)
    
    async def _calculate_aggregation_efficiency(self, crowd_state: CrowdState,
                                               diversity: float) -> float:
        """Calculate how efficiently crowd aggregates information"""
        efficiency = 0.5
        
        # Diversity improves aggregation
        efficiency += diversity * 0.3
        
        # Stability improves aggregation
        efficiency += crowd_state.stability * 0.2
        
        # Low emotional intensity improves aggregation
        efficiency += (1.0 - crowd_state.emotional_intensity) * 0.2
        
        return min(efficiency, 1.0)
    
    async def _calculate_error_correlation(self, crowd_state: CrowdState) -> float:
        """Calculate error correlation in crowd"""
        # High coherence means correlated errors
        correlation = crowd_state.coherence_level * 0.6
        
        # Contagion increases error correlation
        correlation += crowd_state.contagion_rate * 0.4
        
        return min(correlation, 1.0)
    
    async def _calculate_predictive_accuracy(self, wisdom: float, diversity: float,
                                            independence: float) -> float:
        """Calculate expected predictive accuracy"""
        # Wisdom of crowds formula
        accuracy = wisdom * 0.4 + diversity * 0.3 + independence * 0.3
        
        return accuracy


class ContagionModeler:
    """Model social contagion dynamics"""
    
    async def model(self, crowd_state: CrowdState, social_features: Dict,
                   contextual_signals: Dict) -> Dict:
        """Model contagion dynamics"""
        
        # Calculate basic reproduction number (R0)
        R0 = await self._calculate_R0(crowd_state, social_features)
        
        # Calculate transmission rate
        transmission_rate = crowd_state.contagion_rate
        
        # Calculate recovery rate
        recovery_rate = await self._calculate_recovery_rate(crowd_state)
        
        # Predict peak infection
        peak_time = await self._predict_peak_time(R0, transmission_rate)
        
        # Estimate herd immunity threshold
        herd_immunity_threshold = 1 - (1 / max(R0, 1.01))
        
        return {
            'R0': R0,
            'transmission_rate': transmission_rate,
            'recovery_rate': recovery_rate,
            'peak_time': peak_time,
            'herd_immunity_threshold': herd_immunity_threshold
        }
    
    async def _calculate_R0(self, crowd_state: CrowdState, social_features: Dict) -> float:
        """Calculate basic reproduction number"""
        # Base R0 from contagion rate
        R0 = crowd_state.contagion_rate * 3
        
        # Social reach affects R0
        followers = social_features.get('follower_count', 0)
        if followers > 100000:
            R0 *= 2
        elif followers > 10000:
            R0 *= 1.5
        
        # Emotional intensity affects R0
        R0 *= (1 + crowd_state.emotional_intensity * 0.5)
        
        return R0
    
    async def _calculate_recovery_rate(self, crowd_state: CrowdState) -> float:
        """Calculate recovery rate from contagion"""
        # Base recovery rate
        recovery = 0.2
        
        # Low emotional intensity speeds recovery
        recovery += (1.0 - crowd_state.emotional_intensity) * 0.3
        
        # Stability speeds recovery
        recovery += crowd_state.stability * 0.2
        
        return min(recovery, 1.0)
    
    async def _predict_peak_time(self, R0: float, transmission_rate: float) -> int:
        """Predict time to peak contagion in minutes"""
        if R0 <= 1:
            return 0  # No epidemic
        
        # Simple SIR model approximation
        peak_time = int(60 / (transmission_rate * (R0 - 1)))
        
        return min(peak_time, 1440)  # Cap at 24 hours


class CoordinationDetector:
    """Detect coordination in crowd behavior"""
    
    async def detect(self, text: str, social_features: Dict, 
                    temporal_features: Dict) -> Dict:
        """Detect coordination patterns"""
        coordination = {
            'detected': False,
            'type': None,
            'strength': 0.0,
            'participants': 0
        }
        
        # Check for coordination language
        coordination_words = ['together', 'coordinate', 'organize', 'unite', 'join']
        coord_count = sum(1 for word in coordination_words if word in text.lower())
        
        if coord_count > 1:
            coordination['detected'] = True
            coordination['type'] = 'explicit_coordination'
            coordination['strength'] = min(coord_count * 0.3, 1.0)
        
        # Check for temporal coordination
        hour = temporal_features.get('hour_of_day', 12)
        if hour in [9, 15, 16]:  # Market open/close times
            coordination['strength'] += 0.2
            if not coordination['detected']:
                coordination['detected'] = True
                coordination['type'] = 'temporal_coordination'
        
        # Estimate participants
        if coordination['detected']:
            followers = social_features.get('follower_count', 100)
            engagement = social_features.get('engagement_rate', 0.01)
            coordination['participants'] = int(followers * engagement * 10)
        
        return coordination
