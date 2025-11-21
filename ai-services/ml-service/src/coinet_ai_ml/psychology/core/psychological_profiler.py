"""
🎭 PSYCHOLOGICAL PROFILER - DIVINE PERSONALIZATION ENGINE
========================================================

Revolutionary psychological profiling engine that creates deep,
multi-dimensional psychological profiles for personalized analysis,
adaptation, and intervention in cryptocurrency trading.

BREAKTHROUGH CAPABILITIES:
- Deep psychological profiling
- Personality trait analysis
- Risk tolerance assessment
- Decision-making style identification
- Learning pattern recognition
- Stress response modeling
- Adaptive intervention generation
- Behavioral prediction

"Know thyself." - Socrates
We help users understand their psychological patterns to master crypto markets.
"""

import asyncio
import logging
import re
import numpy as np
from typing import Dict, List, Optional, Tuple, Any, Set
from datetime import datetime, timedelta
import json
from collections import defaultdict, Counter
from dataclasses import dataclass, field
import hashlib

from ..models.psychological_patterns import PsychologicalProfile, CognitiveBias

logger = logging.getLogger(__name__)

@dataclass
class PersonalityTraits:
    """Big Five personality traits adapted for crypto trading"""
    openness: float  # Openness to new investments/technologies
    conscientiousness: float  # Disciplined trading approach
    extraversion: float  # Social trading behavior
    agreeableness: float  # Susceptibility to social influence
    neuroticism: float  # Emotional stability in trading
    
    # Crypto-specific traits
    risk_seeking: float
    innovation_adoption: float
    hodl_tendency: float
    fomo_susceptibility: float
    technical_sophistication: float

@dataclass
class DecisionStyle:
    """Decision-making style profile"""
    style_type: str  # analytical, intuitive, dependent, avoidant, spontaneous
    speed: float  # Fast vs slow decision maker
    confidence: float  # Decision confidence level
    flexibility: float  # Ability to change decisions
    information_seeking: float  # How much info needed
    social_validation_need: float  # Need for others' approval

@dataclass
class RiskProfile:
    """Risk tolerance and behavior profile"""
    risk_tolerance: float
    risk_capacity: float  # Financial capacity for risk
    risk_perception: float  # How they perceive risk
    loss_tolerance: float
    gain_seeking: float
    portfolio_diversity_preference: float
    leverage_comfort: float
    volatility_tolerance: float

@dataclass
class LearningProfile:
    """Learning and adaptation profile"""
    learning_style: str  # visual, auditory, kinesthetic, reading
    learning_rate: float
    mistake_recovery: float
    pattern_recognition: float
    abstract_thinking: float
    practical_application: float
    knowledge_retention: float

@dataclass
class StressProfile:
    """Stress response and management profile"""
    stress_threshold: float
    stress_recovery_rate: float
    coping_mechanisms: List[str]
    stress_indicators: List[str]
    performance_under_pressure: float
    emotional_regulation: float

@dataclass
class UserPsychologicalProfile:
    """Complete psychological profile of a user"""
    user_id: str
    personality_traits: PersonalityTraits
    decision_style: DecisionStyle
    risk_profile: RiskProfile
    learning_profile: LearningProfile
    stress_profile: StressProfile
    dominant_biases: List[CognitiveBias]
    psychological_strengths: List[str]
    psychological_weaknesses: List[str]
    recommended_strategies: List[str]
    personalized_interventions: List[str]
    profile_confidence: float
    last_updated: datetime
    evolution_trajectory: str  # improving, stable, declining

class PsychologicalProfiler:
    """
    🎭 DIVINE PSYCHOLOGICAL PROFILER
    
    This profiler uses advanced psychological assessment, behavioral analysis,
    and machine learning to create deep, actionable psychological profiles
    that enable unprecedented personalization and intervention.
    
    DIVINE CAPABILITIES:
    - Multi-dimensional personality assessment
    - Decision style identification
    - Risk profiling and prediction
    - Learning pattern recognition
    - Stress response modeling
    - Personalized intervention generation
    """
    
    def __init__(self, config: Optional[Dict] = None):
        """Initialize the psychological profiler"""
        self.config = config or self._get_default_config()
        
        # Profiling systems
        self.personality_assessor = PersonalityAssessor()
        self.decision_analyzer = DecisionStyleAnalyzer()
        self.risk_assessor = RiskAssessor()
        self.learning_analyzer = LearningAnalyzer()
        self.stress_analyzer = StressAnalyzer()
        self.intervention_generator = InterventionGenerator()
        
        # Profile storage and tracking
        self.user_profiles = {}
        self.profile_history = defaultdict(list)
        self.behavior_patterns = defaultdict(lambda: defaultdict(list))
        
        # Assessment models
        self.assessment_models = self._load_assessment_models()
        self.intervention_templates = self._load_intervention_templates()
        
        logger.info("🎭 PsychologicalProfiler initialized with divine personalization")
    
    async def profile(self, enhanced_input: Dict, user_profile: Optional[Dict] = None) -> Optional[PsychologicalProfile]:
        """
        🎯 MASTER PSYCHOLOGICAL PROFILING
        
        Creates or updates a comprehensive psychological profile based on
        user behavior, decisions, and interactions.
        """
        try:
            text = enhanced_input['processed_text']
            linguistic_features = enhanced_input.get('linguistic_features', {})
            contextual_signals = enhanced_input.get('contextual_signals', {})
            
            # Get or create user ID
            user_id = user_profile.get('user_id') if user_profile else self._generate_user_id(text)
            
            # Retrieve existing profile if available
            existing_profile = self.user_profiles.get(user_id)
            
            # 1. Assess personality traits
            personality_traits = await self.personality_assessor.assess(
                text, linguistic_features, existing_profile
            )
            
            # 2. Analyze decision style
            decision_style = await self.decision_analyzer.analyze(
                text, enhanced_input, existing_profile
            )
            
            # 3. Assess risk profile
            risk_profile = await self.risk_assessor.assess(
                text, contextual_signals, existing_profile
            )
            
            # 4. Analyze learning patterns
            learning_profile = await self.learning_analyzer.analyze(
                text, enhanced_input, existing_profile
            )
            
            # 5. Analyze stress responses
            stress_profile = await self.stress_analyzer.analyze(
                text, linguistic_features, contextual_signals, existing_profile
            )
            
            # 6. Identify dominant biases
            dominant_biases = await self._identify_dominant_biases(
                enhanced_input, existing_profile
            )
            
            # 7. Identify strengths and weaknesses
            strengths = await self._identify_strengths(
                personality_traits, decision_style, risk_profile
            )
            
            weaknesses = await self._identify_weaknesses(
                personality_traits, decision_style, risk_profile, dominant_biases
            )
            
            # 8. Generate recommended strategies
            strategies = await self._generate_strategies(
                personality_traits, decision_style, risk_profile, weaknesses
            )
            
            # 9. Generate personalized interventions
            interventions = await self.intervention_generator.generate(
                personality_traits, decision_style, stress_profile, dominant_biases
            )
            
            # 10. Calculate profile confidence
            confidence = await self._calculate_profile_confidence(
                existing_profile, enhanced_input
            )
            
            # 11. Determine evolution trajectory
            trajectory = await self._determine_evolution_trajectory(
                existing_profile, personality_traits, decision_style
            )
            
            # Create complete profile
            complete_profile = UserPsychologicalProfile(
                user_id=user_id,
                personality_traits=personality_traits,
                decision_style=decision_style,
                risk_profile=risk_profile,
                learning_profile=learning_profile,
                stress_profile=stress_profile,
                dominant_biases=dominant_biases,
                psychological_strengths=strengths,
                psychological_weaknesses=weaknesses,
                recommended_strategies=strategies,
                personalized_interventions=interventions,
                profile_confidence=confidence,
                last_updated=datetime.utcnow(),
                evolution_trajectory=trajectory
            )
            
            # Store profile
            self.user_profiles[user_id] = complete_profile
            await self._store_profile_history(complete_profile)
            
            # Convert to API model
            api_profile = await self._convert_to_api_profile(complete_profile)
            
            logger.info(f"🎭 Psychological profile created/updated for user {user_id[:8]}")
            
            return api_profile
            
        except Exception as e:
            logger.error(f"❌ Psychological profiling failed: {str(e)}")
            return None
    
    async def _identify_dominant_biases(self, enhanced_input: Dict, 
                                       existing_profile: Optional[UserPsychologicalProfile]) -> List[CognitiveBias]:
        """Identify user's dominant cognitive biases"""
        biases = []
        
        # Get biases from current analysis
        current_biases = enhanced_input.get('cognitive_biases', [])
        
        # Merge with historical biases if available
        if existing_profile:
            historical_biases = existing_profile.dominant_biases
            
            # Weight recent biases more heavily
            bias_weights = defaultdict(float)
            for bias in historical_biases:
                bias_weights[bias.bias_type] += 0.3
            
            for bias in current_biases:
                bias_weights[bias.bias_type] += 0.7
            
            # Select top biases
            top_bias_types = sorted(bias_weights.items(), key=lambda x: x[1], reverse=True)[:5]
            
            # Create bias objects
            for bias_type, weight in top_bias_types:
                # Find the bias object
                bias_obj = next((b for b in current_biases if b.bias_type == bias_type), None)
                if bias_obj:
                    biases.append(bias_obj)
        else:
            biases = current_biases[:5]  # Top 5 current biases
        
        return biases
    
    async def _identify_strengths(self, personality: PersonalityTraits,
                                 decision_style: DecisionStyle,
                                 risk_profile: RiskProfile) -> List[str]:
        """Identify psychological strengths"""
        strengths = []
        
        # Personality-based strengths
        if personality.conscientiousness > 0.7:
            strengths.append("disciplined_approach")
        if personality.openness > 0.7:
            strengths.append("innovation_adoption")
        if personality.neuroticism < 0.3:
            strengths.append("emotional_stability")
        
        # Decision-based strengths
        if decision_style.style_type == 'analytical':
            strengths.append("data_driven_decisions")
        if decision_style.confidence > 0.7:
            strengths.append("decisive_action")
        if decision_style.flexibility > 0.7:
            strengths.append("adaptability")
        
        # Risk-based strengths
        if 0.4 < risk_profile.risk_tolerance < 0.7:
            strengths.append("balanced_risk_approach")
        if risk_profile.portfolio_diversity_preference > 0.7:
            strengths.append("diversification_mindset")
        
        return strengths
    
    async def _identify_weaknesses(self, personality: PersonalityTraits,
                                  decision_style: DecisionStyle,
                                  risk_profile: RiskProfile,
                                  biases: List[CognitiveBias]) -> List[str]:
        """Identify psychological weaknesses"""
        weaknesses = []
        
        # Personality-based weaknesses
        if personality.neuroticism > 0.7:
            weaknesses.append("emotional_volatility")
        if personality.fomo_susceptibility > 0.7:
            weaknesses.append("fomo_vulnerability")
        if personality.agreeableness > 0.8:
            weaknesses.append("excessive_social_influence")
        
        # Decision-based weaknesses
        if decision_style.style_type == 'avoidant':
            weaknesses.append("decision_avoidance")
        if decision_style.speed > 0.8:
            weaknesses.append("impulsive_decisions")
        if decision_style.social_validation_need > 0.7:
            weaknesses.append("validation_dependency")
        
        # Risk-based weaknesses
        if risk_profile.risk_tolerance > 0.8:
            weaknesses.append("excessive_risk_taking")
        if risk_profile.risk_tolerance < 0.2:
            weaknesses.append("over_conservative")
        if risk_profile.loss_tolerance < 0.3:
            weaknesses.append("loss_aversion")
        
        # Bias-based weaknesses
        bias_types = [bias.bias_type.value for bias in biases]
        if 'confirmation_bias' in bias_types:
            weaknesses.append("confirmation_seeking")
        if 'herding_behavior' in bias_types:
            weaknesses.append("crowd_following")
        
        return weaknesses
    
    async def _generate_strategies(self, personality: PersonalityTraits,
                                  decision_style: DecisionStyle,
                                  risk_profile: RiskProfile,
                                  weaknesses: List[str]) -> List[str]:
        """Generate personalized trading strategies"""
        strategies = []
        
        # Personality-based strategies
        if personality.conscientiousness > 0.6:
            strategies.append("systematic_dca_strategy")  # Dollar-cost averaging
        else:
            strategies.append("automated_trading_rules")
        
        if personality.openness > 0.7:
            strategies.append("innovative_asset_exploration")
        else:
            strategies.append("blue_chip_focus")
        
        # Decision style strategies
        if decision_style.style_type == 'analytical':
            strategies.append("quantitative_analysis_framework")
        elif decision_style.style_type == 'intuitive':
            strategies.append("technical_pattern_recognition")
        else:
            strategies.append("hybrid_analysis_approach")
        
        # Risk-based strategies
        if risk_profile.risk_tolerance > 0.6:
            strategies.append("growth_oriented_portfolio")
        else:
            strategies.append("value_preservation_focus")
        
        # Weakness mitigation strategies
        if 'emotional_volatility' in weaknesses:
            strategies.append("emotion_regulation_protocols")
        if 'fomo_vulnerability' in weaknesses:
            strategies.append("cooling_off_periods")
        if 'decision_avoidance' in weaknesses:
            strategies.append("structured_decision_framework")
        
        return list(set(strategies))  # Remove duplicates
    
    async def _calculate_profile_confidence(self, existing_profile: Optional[UserPsychologicalProfile],
                                          enhanced_input: Dict) -> float:
        """Calculate confidence in profile accuracy"""
        confidence = 0.5  # Base confidence
        
        # More data points increase confidence
        if existing_profile:
            # Profile exists, add confidence based on history
            history_length = len(self.profile_history.get(existing_profile.user_id, []))
            confidence += min(history_length * 0.05, 0.3)
        
        # Quality of current data
        linguistic_features = enhanced_input.get('linguistic_features', {})
        word_count = linguistic_features.get('word_count', 0)
        if word_count > 100:
            confidence += 0.1
        if word_count > 300:
            confidence += 0.1
        
        return min(confidence, 0.95)  # Never 100% confident
    
    async def _determine_evolution_trajectory(self, existing_profile: Optional[UserPsychologicalProfile],
                                            personality: PersonalityTraits,
                                            decision_style: DecisionStyle) -> str:
        """Determine psychological evolution trajectory"""
        if not existing_profile:
            return 'establishing'  # New profile
        
        # Compare key metrics
        improvements = 0
        declines = 0
        
        # Emotional stability
        if personality.neuroticism < existing_profile.personality_traits.neuroticism:
            improvements += 1
        elif personality.neuroticism > existing_profile.personality_traits.neuroticism:
            declines += 1
        
        # Decision confidence
        if decision_style.confidence > existing_profile.decision_style.confidence:
            improvements += 1
        elif decision_style.confidence < existing_profile.decision_style.confidence:
            declines += 1
        
        # Learning rate
        if existing_profile.learning_profile.learning_rate > 0.5:
            improvements += 1
        
        # Determine trajectory
        if improvements > declines:
            return 'improving'
        elif declines > improvements:
            return 'declining'
        else:
            return 'stable'
    
    async def _convert_to_api_profile(self, complete_profile: UserPsychologicalProfile) -> PsychologicalProfile:
        """Convert internal profile to API model"""
        return PsychologicalProfile(
            risk_tolerance=complete_profile.risk_profile.risk_tolerance,
            decision_making_style=complete_profile.decision_style.style_type,
            emotional_stability=1.0 - complete_profile.personality_traits.neuroticism,
            dominant_biases=complete_profile.dominant_biases,
            decision_frameworks=complete_profile.recommended_strategies,
            social_influence_susceptibility=complete_profile.personality_traits.agreeableness,
            contrarian_tendency=1.0 - complete_profile.personality_traits.agreeableness,
            learning_rate=complete_profile.learning_profile.learning_rate,
            adaptability=complete_profile.decision_style.flexibility
        )
    
    async def _store_profile_history(self, profile: UserPsychologicalProfile):
        """Store profile in history for tracking evolution"""
        history_entry = {
            'timestamp': profile.last_updated,
            'personality_snapshot': {
                'openness': profile.personality_traits.openness,
                'conscientiousness': profile.personality_traits.conscientiousness,
                'neuroticism': profile.personality_traits.neuroticism
            },
            'risk_tolerance': profile.risk_profile.risk_tolerance,
            'confidence': profile.profile_confidence,
            'trajectory': profile.evolution_trajectory
        }
        
        self.profile_history[profile.user_id].append(history_entry)
        
        # Keep only recent history
        if len(self.profile_history[profile.user_id]) > 50:
            self.profile_history[profile.user_id] = self.profile_history[profile.user_id][-50:]
    
    def _generate_user_id(self, text: str) -> str:
        """Generate anonymous user ID"""
        return hashlib.md5(f"{text[:100]}_{datetime.utcnow()}".encode()).hexdigest()[:16]
    
    def _load_assessment_models(self) -> Dict:
        """Load psychological assessment models"""
        return {
            'personality': {
                'linguistic_markers': {
                    'openness': ['new', 'innovative', 'explore', 'creative', 'curious'],
                    'conscientiousness': ['plan', 'organize', 'systematic', 'careful', 'disciplined'],
                    'extraversion': ['social', 'share', 'community', 'discuss', 'engage'],
                    'agreeableness': ['agree', 'trust', 'help', 'cooperate', 'support'],
                    'neuroticism': ['worried', 'anxious', 'stressed', 'nervous', 'emotional']
                }
            },
            'decision_styles': {
                'analytical': ['analyze', 'data', 'research', 'study', 'evaluate'],
                'intuitive': ['feel', 'sense', 'gut', 'instinct', 'believe'],
                'dependent': ['others', 'advice', 'recommend', 'suggest', 'follow'],
                'avoidant': ['later', 'wait', 'unsure', 'maybe', 'postpone'],
                'spontaneous': ['now', 'quick', 'immediate', 'instant', 'fast']
            }
        }
    
    def _load_intervention_templates(self) -> Dict:
        """Load intervention templates"""
        return {
            'emotional_regulation': [
                "Take a 5-minute break before making this decision",
                "Practice box breathing: 4-4-4-4 pattern",
                "Write down your emotions before proceeding"
            ],
            'bias_mitigation': [
                "List 3 reasons this could be wrong",
                "Seek an opposing viewpoint",
                "Sleep on this decision"
            ],
            'risk_management': [
                "Calculate maximum acceptable loss",
                "Set stop-loss before entering",
                "Diversify this position"
            ]
        }
    
    def _get_default_config(self) -> Dict:
        """Get default configuration"""
        return {
            'learning_enabled': True,
            'adaptation_rate': 0.1,
            'profile_update_threshold': 0.3,
            'intervention_threshold': 0.7
        }


class PersonalityAssessor:
    """Assess personality traits"""
    
    async def assess(self, text: str, linguistic_features: Dict,
                    existing_profile: Optional[UserPsychologicalProfile]) -> PersonalityTraits:
        """Assess personality traits from text and behavior"""
        
        # Base assessment from linguistic analysis
        base_traits = await self._linguistic_personality_assessment(text, linguistic_features)
        
        # Adjust based on existing profile (learning)
        if existing_profile:
            traits = await self._adjust_with_history(base_traits, existing_profile)
        else:
            traits = base_traits
        
        # Add crypto-specific traits
        traits.risk_seeking = await self._assess_risk_seeking(text)
        traits.innovation_adoption = await self._assess_innovation_adoption(text)
        traits.hodl_tendency = await self._assess_hodl_tendency(text)
        traits.fomo_susceptibility = await self._assess_fomo_susceptibility(text)
        traits.technical_sophistication = await self._assess_technical_sophistication(text)
        
        return traits
    
    async def _linguistic_personality_assessment(self, text: str, 
                                                linguistic_features: Dict) -> PersonalityTraits:
        """Assess personality from linguistic patterns"""
        
        # Openness - creativity, abstract thinking
        openness_words = ['new', 'innovative', 'explore', 'creative', 'imagine', 'possibility']
        openness_score = sum(1 for word in openness_words if word in text.lower()) / 10
        
        # Conscientiousness - organization, discipline
        conscientious_words = ['plan', 'systematic', 'careful', 'organized', 'disciplined', 'methodical']
        conscientiousness_score = sum(1 for word in conscientious_words if word in text.lower()) / 10
        
        # Extraversion - social, energetic
        extraversion_words = ['share', 'discuss', 'community', 'together', 'social', 'engage']
        extraversion_score = sum(1 for word in extraversion_words if word in text.lower()) / 10
        
        # Agreeableness - cooperative, trusting
        agreeable_words = ['agree', 'trust', 'help', 'support', 'cooperate', 'kind']
        agreeableness_score = sum(1 for word in agreeable_words if word in text.lower()) / 10
        
        # Neuroticism - emotional instability
        neurotic_words = ['worried', 'anxious', 'stressed', 'panic', 'fear', 'nervous']
        neuroticism_score = sum(1 for word in neurotic_words if word in text.lower()) / 10
        
        # Adjust based on linguistic features
        if linguistic_features.get('exclamation_ratio', 0) > 0.1:
            neuroticism_score += 0.1
            extraversion_score += 0.1
        
        return PersonalityTraits(
            openness=min(openness_score + 0.4, 1.0),
            conscientiousness=min(conscientiousness_score + 0.4, 1.0),
            extraversion=min(extraversion_score + 0.4, 1.0),
            agreeableness=min(agreeableness_score + 0.4, 1.0),
            neuroticism=min(neuroticism_score + 0.3, 1.0),
            risk_seeking=0.5,  # Will be set later
            innovation_adoption=0.5,
            hodl_tendency=0.5,
            fomo_susceptibility=0.5,
            technical_sophistication=0.5
        )
    
    async def _adjust_with_history(self, base_traits: PersonalityTraits,
                                  existing_profile: UserPsychologicalProfile) -> PersonalityTraits:
        """Adjust traits based on historical profile"""
        # Weighted average: 70% historical, 30% current
        adjusted = PersonalityTraits(
            openness=existing_profile.personality_traits.openness * 0.7 + base_traits.openness * 0.3,
            conscientiousness=existing_profile.personality_traits.conscientiousness * 0.7 + base_traits.conscientiousness * 0.3,
            extraversion=existing_profile.personality_traits.extraversion * 0.7 + base_traits.extraversion * 0.3,
            agreeableness=existing_profile.personality_traits.agreeableness * 0.7 + base_traits.agreeableness * 0.3,
            neuroticism=existing_profile.personality_traits.neuroticism * 0.7 + base_traits.neuroticism * 0.3,
            risk_seeking=existing_profile.personality_traits.risk_seeking,
            innovation_adoption=existing_profile.personality_traits.innovation_adoption,
            hodl_tendency=existing_profile.personality_traits.hodl_tendency,
            fomo_susceptibility=existing_profile.personality_traits.fomo_susceptibility,
            technical_sophistication=existing_profile.personality_traits.technical_sophistication
        )
        
        return adjusted
    
    async def _assess_risk_seeking(self, text: str) -> float:
        """Assess risk-seeking tendency"""
        risk_words = ['yolo', 'all in', 'leverage', 'risky', 'gamble', 'bet']
        conservative_words = ['safe', 'careful', 'conservative', 'protect', 'preserve']
        
        risk_score = sum(1 for word in risk_words if word in text.lower())
        conservative_score = sum(1 for word in conservative_words if word in text.lower())
        
        return np.clip(0.5 + (risk_score - conservative_score) * 0.15, 0.0, 1.0)
    
    async def _assess_innovation_adoption(self, text: str) -> float:
        """Assess innovation adoption tendency"""
        innovation_words = ['new', 'innovative', 'cutting-edge', 'breakthrough', 'revolutionary', 'early']
        traditional_words = ['proven', 'established', 'traditional', 'classic', 'old']
        
        innovation_score = sum(1 for word in innovation_words if word in text.lower())
        traditional_score = sum(1 for word in traditional_words if word in text.lower())
        
        return np.clip(0.5 + (innovation_score - traditional_score) * 0.15, 0.0, 1.0)
    
    async def _assess_hodl_tendency(self, text: str) -> float:
        """Assess HODL tendency"""
        hodl_words = ['hodl', 'hold', 'long term', 'diamond hands', 'never sell']
        trade_words = ['trade', 'swing', 'scalp', 'flip', 'short term']
        
        hodl_score = sum(1 for word in hodl_words if word in text.lower())
        trade_score = sum(1 for word in trade_words if word in text.lower())
        
        return np.clip(0.5 + (hodl_score - trade_score) * 0.2, 0.0, 1.0)
    
    async def _assess_fomo_susceptibility(self, text: str) -> float:
        """Assess FOMO susceptibility"""
        fomo_words = ['fomo', 'missing out', 'everyone', 'late', 'hurry', 'quick']
        patient_words = ['patient', 'wait', 'time', 'research', 'careful']
        
        fomo_score = sum(1 for word in fomo_words if word in text.lower())
        patient_score = sum(1 for word in patient_words if word in text.lower())
        
        return np.clip(0.5 + (fomo_score - patient_score) * 0.15, 0.0, 1.0)
    
    async def _assess_technical_sophistication(self, text: str) -> float:
        """Assess technical sophistication"""
        technical_words = ['smart contract', 'defi', 'layer 2', 'consensus', 'hash', 'merkle', 'zk']
        basic_words = ['buy', 'sell', 'price', 'coin', 'token']
        
        technical_count = sum(1 for word in technical_words if word in text.lower())
        
        if technical_count > 3:
            return 0.8
        elif technical_count > 1:
            return 0.6
        else:
            return 0.4


class DecisionStyleAnalyzer:
    """Analyze decision-making style"""
    
    async def analyze(self, text: str, enhanced_input: Dict,
                     existing_profile: Optional[UserPsychologicalProfile]) -> DecisionStyle:
        """Analyze decision-making style"""
        
        # Identify style type
        style_type = await self._identify_style_type(text)
        
        # Analyze decision speed
        speed = await self._analyze_decision_speed(text, enhanced_input)
        
        # Analyze confidence
        confidence = await self._analyze_confidence(text)
        
        # Analyze flexibility
        flexibility = await self._analyze_flexibility(text)
        
        # Analyze information seeking
        information_seeking = await self._analyze_information_seeking(text)
        
        # Analyze social validation need
        social_validation = await self._analyze_social_validation(text)
        
        # Adjust based on history
        if existing_profile:
            return await self._adjust_with_history(
                DecisionStyle(
                    style_type=style_type,
                    speed=speed,
                    confidence=confidence,
                    flexibility=flexibility,
                    information_seeking=information_seeking,
                    social_validation_need=social_validation
                ),
                existing_profile
            )
        
        return DecisionStyle(
            style_type=style_type,
            speed=speed,
            confidence=confidence,
            flexibility=flexibility,
            information_seeking=information_seeking,
            social_validation_need=social_validation
        )
    
    async def _identify_style_type(self, text: str) -> str:
        """Identify decision-making style type"""
        styles = {
            'analytical': ['analyze', 'data', 'research', 'calculate', 'evaluate'],
            'intuitive': ['feel', 'gut', 'instinct', 'sense', 'believe'],
            'dependent': ['advice', 'recommend', 'others say', 'told me', 'suggested'],
            'avoidant': ['maybe', 'unsure', 'wait', 'later', 'postpone'],
            'spontaneous': ['now', 'immediately', 'quick', 'instant', 'yolo']
        }
        
        style_scores = {}
        for style, keywords in styles.items():
            score = sum(1 for keyword in keywords if keyword in text.lower())
            style_scores[style] = score
        
        if style_scores:
            return max(style_scores, key=style_scores.get)
        
        return 'balanced'
    
    async def _analyze_decision_speed(self, text: str, enhanced_input: Dict) -> float:
        """Analyze decision-making speed"""
        speed = 0.5
        
        # Fast decision indicators
        fast_words = ['now', 'quick', 'immediately', 'asap', 'urgent']
        fast_count = sum(1 for word in fast_words if word in text.lower())
        speed += fast_count * 0.1
        
        # Slow decision indicators
        slow_words = ['research', 'analyze', 'consider', 'evaluate', 'study']
        slow_count = sum(1 for word in slow_words if word in text.lower())
        speed -= slow_count * 0.1
        
        return np.clip(speed, 0.0, 1.0)
    
    async def _analyze_confidence(self, text: str) -> float:
        """Analyze decision confidence"""
        confidence = 0.5
        
        # High confidence indicators
        confident_words = ['certain', 'sure', 'definitely', 'absolutely', 'confident']
        confidence += sum(1 for word in confident_words if word in text.lower()) * 0.15
        
        # Low confidence indicators
        uncertain_words = ['maybe', 'perhaps', 'unsure', 'doubt', 'uncertain']
        confidence -= sum(1 for word in uncertain_words if word in text.lower()) * 0.15
        
        return np.clip(confidence, 0.0, 1.0)
    
    async def _analyze_flexibility(self, text: str) -> float:
        """Analyze decision flexibility"""
        flexibility = 0.5
        
        # Flexible indicators
        flexible_words = ['adapt', 'change', 'adjust', 'pivot', 'flexible']
        flexibility += sum(1 for word in flexible_words if word in text.lower()) * 0.15
        
        # Rigid indicators
        rigid_words = ['always', 'never', 'must', 'only', 'definitely']
        flexibility -= sum(1 for word in rigid_words if word in text.lower()) * 0.1
        
        return np.clip(flexibility, 0.0, 1.0)
    
    async def _analyze_information_seeking(self, text: str) -> float:
        """Analyze information-seeking behavior"""
        info_words = ['research', 'data', 'source', 'evidence', 'proof', 'study', 'analysis']
        info_count = sum(1 for word in info_words if word in text.lower())
        
        return min(0.3 + info_count * 0.15, 1.0)
    
    async def _analyze_social_validation(self, text: str) -> float:
        """Analyze need for social validation"""
        social_words = ['others', 'everyone', 'people say', 'recommended', 'popular', 'trending']
        social_count = sum(1 for word in social_words if word in text.lower())
        
        return min(0.3 + social_count * 0.15, 1.0)
    
    async def _adjust_with_history(self, current: DecisionStyle,
                                  existing_profile: UserPsychologicalProfile) -> DecisionStyle:
        """Adjust decision style based on history"""
        historical = existing_profile.decision_style
        
        return DecisionStyle(
            style_type=current.style_type,  # Keep current style type
            speed=historical.speed * 0.7 + current.speed * 0.3,
            confidence=historical.confidence * 0.7 + current.confidence * 0.3,
            flexibility=historical.flexibility * 0.7 + current.flexibility * 0.3,
            information_seeking=historical.information_seeking * 0.7 + current.information_seeking * 0.3,
            social_validation_need=historical.social_validation_need * 0.7 + current.social_validation_need * 0.3
        )


class RiskAssessor:
    """Assess risk profile"""
    
    async def assess(self, text: str, contextual_signals: Dict,
                    existing_profile: Optional[UserPsychologicalProfile]) -> RiskProfile:
        """Assess risk profile"""
        
        # Assess risk tolerance
        risk_tolerance = await self._assess_risk_tolerance(text)
        
        # Assess risk capacity (simplified - would need financial data)
        risk_capacity = await self._assess_risk_capacity(text)
        
        # Assess risk perception
        risk_perception = await self._assess_risk_perception(text)
        
        # Assess loss tolerance
        loss_tolerance = await self._assess_loss_tolerance(text)
        
        # Assess gain seeking
        gain_seeking = await self._assess_gain_seeking(text)
        
        # Assess portfolio diversity preference
        diversity_preference = await self._assess_diversity_preference(text)
        
        # Assess leverage comfort
        leverage_comfort = await self._assess_leverage_comfort(text)
        
        # Assess volatility tolerance
        volatility_tolerance = await self._assess_volatility_tolerance(text, contextual_signals)
        
        return RiskProfile(
            risk_tolerance=risk_tolerance,
            risk_capacity=risk_capacity,
            risk_perception=risk_perception,
            loss_tolerance=loss_tolerance,
            gain_seeking=gain_seeking,
            portfolio_diversity_preference=diversity_preference,
            leverage_comfort=leverage_comfort,
            volatility_tolerance=volatility_tolerance
        )
    
    async def _assess_risk_tolerance(self, text: str) -> float:
        """Assess risk tolerance"""
        high_risk_words = ['yolo', 'all in', 'risky', 'aggressive', 'leverage']
        low_risk_words = ['safe', 'conservative', 'careful', 'protect', 'stable']
        
        high_risk = sum(1 for word in high_risk_words if word in text.lower())
        low_risk = sum(1 for word in low_risk_words if word in text.lower())
        
        return np.clip(0.5 + (high_risk - low_risk) * 0.15, 0.0, 1.0)
    
    async def _assess_risk_capacity(self, text: str) -> float:
        """Assess financial capacity for risk"""
        # Simplified - would need actual financial data
        return 0.5
    
    async def _assess_risk_perception(self, text: str) -> float:
        """Assess how user perceives risk"""
        danger_words = ['dangerous', 'risky', 'volatile', 'unstable', 'uncertain']
        opportunity_words = ['opportunity', 'potential', 'upside', 'growth', 'gain']
        
        danger_count = sum(1 for word in danger_words if word in text.lower())
        opportunity_count = sum(1 for word in opportunity_words if word in text.lower())
        
        # Higher score = sees more opportunity than risk
        return np.clip(0.5 + (opportunity_count - danger_count) * 0.15, 0.0, 1.0)
    
    async def _assess_loss_tolerance(self, text: str) -> float:
        """Assess tolerance for losses"""
        loss_averse_words = ['can\'t lose', 'protect', 'safe', 'preserve', 'secure']
        loss_tolerant_words = ['risk it', 'acceptable loss', 'calculated risk', 'worth it']
        
        averse_count = sum(1 for word in loss_averse_words if word in text.lower())
        tolerant_count = sum(1 for word in loss_tolerant_words if word in text.lower())
        
        return np.clip(0.5 + (tolerant_count - averse_count) * 0.2, 0.0, 1.0)
    
    async def _assess_gain_seeking(self, text: str) -> float:
        """Assess gain-seeking behavior"""
        gain_words = ['profit', 'gains', 'moon', 'rich', 'wealth', '10x', '100x']
        gain_count = sum(1 for word in gain_words if word in text.lower())
        
        return min(0.4 + gain_count * 0.15, 1.0)
    
    async def _assess_diversity_preference(self, text: str) -> float:
        """Assess portfolio diversification preference"""
        diversity_words = ['diversify', 'spread', 'multiple', 'various', 'different']
        concentration_words = ['all in', 'focus', 'concentrate', 'single', 'one']
        
        diverse_count = sum(1 for word in diversity_words if word in text.lower())
        concentrated_count = sum(1 for word in concentration_words if word in text.lower())
        
        return np.clip(0.5 + (diverse_count - concentrated_count) * 0.2, 0.0, 1.0)
    
    async def _assess_leverage_comfort(self, text: str) -> float:
        """Assess comfort with leverage"""
        leverage_words = ['leverage', 'margin', 'borrow', 'futures', 'options']
        leverage_count = sum(1 for word in leverage_words if word in text.lower())
        
        if 'no leverage' in text.lower() or 'avoid leverage' in text.lower():
            return 0.1
        
        return min(0.2 + leverage_count * 0.25, 1.0)
    
    async def _assess_volatility_tolerance(self, text: str, contextual_signals: Dict) -> float:
        """Assess volatility tolerance"""
        volatility_comfort_words = ['volatility is normal', 'expect swings', 'ride it out']
        volatility_discomfort_words = ['too volatile', 'crazy swings', 'unstable', 'wild']
        
        comfort = sum(1 for phrase in volatility_comfort_words if phrase in text.lower())
        discomfort = sum(1 for phrase in volatility_discomfort_words if phrase in text.lower())
        
        base_tolerance = 0.5 + (comfort - discomfort) * 0.3
        
        # Adjust based on market conditions
        market_volatility = contextual_signals.get('market_volatility', 0.5)
        if market_volatility > 0.7:
            # In high volatility, their current behavior shows tolerance
            base_tolerance += 0.1
        
        return np.clip(base_tolerance, 0.0, 1.0)


class LearningAnalyzer:
    """Analyze learning patterns"""
    
    async def analyze(self, text: str, enhanced_input: Dict,
                     existing_profile: Optional[UserPsychologicalProfile]) -> LearningProfile:
        """Analyze learning profile"""
        
        # Identify learning style
        learning_style = await self._identify_learning_style(text)
        
        # Assess learning rate
        learning_rate = await self._assess_learning_rate(text, existing_profile)
        
        # Assess mistake recovery
        mistake_recovery = await self._assess_mistake_recovery(text)
        
        # Assess pattern recognition
        pattern_recognition = await self._assess_pattern_recognition(text)
        
        # Assess abstract thinking
        abstract_thinking = await self._assess_abstract_thinking(text)
        
        # Assess practical application
        practical_application = await self._assess_practical_application(text)
        
        # Assess knowledge retention
        knowledge_retention = await self._assess_knowledge_retention(existing_profile)
        
        return LearningProfile(
            learning_style=learning_style,
            learning_rate=learning_rate,
            mistake_recovery=mistake_recovery,
            pattern_recognition=pattern_recognition,
            abstract_thinking=abstract_thinking,
            practical_application=practical_application,
            knowledge_retention=knowledge_retention
        )
    
    async def _identify_learning_style(self, text: str) -> str:
        """Identify preferred learning style"""
        styles = {
            'visual': ['chart', 'graph', 'see', 'visualize', 'picture', 'diagram'],
            'reading': ['read', 'article', 'documentation', 'whitepaper', 'study'],
            'kinesthetic': ['try', 'experiment', 'hands-on', 'practice', 'do'],
            'auditory': ['listen', 'hear', 'podcast', 'video', 'explain']
        }
        
        style_scores = {}
        for style, keywords in styles.items():
            score = sum(1 for keyword in keywords if keyword in text.lower())
            style_scores[style] = score
        
        if style_scores:
            return max(style_scores, key=style_scores.get)
        
        return 'mixed'
    
    async def _assess_learning_rate(self, text: str, 
                                   existing_profile: Optional[UserPsychologicalProfile]) -> float:
        """Assess learning rate"""
        learning_indicators = ['learned', 'understand now', 'figured out', 'makes sense', 'got it']
        learning_count = sum(1 for phrase in learning_indicators if phrase in text.lower())
        
        base_rate = 0.5 + learning_count * 0.15
        
        # Adjust based on history
        if existing_profile and existing_profile.learning_profile:
            historical_rate = existing_profile.learning_profile.learning_rate
            base_rate = historical_rate * 0.7 + base_rate * 0.3
        
        return min(base_rate, 1.0)
    
    async def _assess_mistake_recovery(self, text: str) -> float:
        """Assess ability to recover from mistakes"""
        recovery_words = ['learned from', 'won\'t repeat', 'mistake taught', 'better now']
        recovery_count = sum(1 for phrase in recovery_words if phrase in text.lower())
        
        return min(0.4 + recovery_count * 0.2, 1.0)
    
    async def _assess_pattern_recognition(self, text: str) -> float:
        """Assess pattern recognition ability"""
        pattern_words = ['pattern', 'trend', 'similar', 'recurring', 'cycle', 'correlation']
        pattern_count = sum(1 for word in pattern_words if word in text.lower())
        
        return min(0.4 + pattern_count * 0.15, 1.0)
    
    async def _assess_abstract_thinking(self, text: str) -> float:
        """Assess abstract thinking ability"""
        abstract_words = ['concept', 'theory', 'principle', 'framework', 'model', 'paradigm']
        abstract_count = sum(1 for word in abstract_words if word in text.lower())
        
        return min(0.3 + abstract_count * 0.15, 1.0)
    
    async def _assess_practical_application(self, text: str) -> float:
        """Assess practical application ability"""
        practical_words = ['apply', 'use', 'implement', 'practice', 'real-world', 'actual']
        practical_count = sum(1 for word in practical_words if word in text.lower())
        
        return min(0.4 + practical_count * 0.15, 1.0)
    
    async def _assess_knowledge_retention(self, 
                                        existing_profile: Optional[UserPsychologicalProfile]) -> float:
        """Assess knowledge retention"""
        if not existing_profile:
            return 0.5
        
        # Check if profile shows consistent knowledge over time
        # Simplified - would track actual knowledge demonstrations
        return 0.6


class StressAnalyzer:
    """Analyze stress responses"""
    
    async def analyze(self, text: str, linguistic_features: Dict,
                     contextual_signals: Dict,
                     existing_profile: Optional[UserPsychologicalProfile]) -> StressProfile:
        """Analyze stress profile"""
        
        # Assess stress level
        stress_level = await self._assess_stress_level(text, linguistic_features)
        
        # Calculate stress threshold
        stress_threshold = await self._calculate_stress_threshold(stress_level, existing_profile)
        
        # Assess recovery rate
        recovery_rate = await self._assess_recovery_rate(text, existing_profile)
        
        # Identify coping mechanisms
        coping_mechanisms = await self._identify_coping_mechanisms(text)
        
        # Identify stress indicators
        stress_indicators = await self._identify_stress_indicators(text, linguistic_features)
        
        # Assess performance under pressure
        performance = await self._assess_performance_under_pressure(
            stress_level, contextual_signals
        )
        
        # Assess emotional regulation
        emotional_regulation = await self._assess_emotional_regulation(text, stress_level)
        
        return StressProfile(
            stress_threshold=stress_threshold,
            stress_recovery_rate=recovery_rate,
            coping_mechanisms=coping_mechanisms,
            stress_indicators=stress_indicators,
            performance_under_pressure=performance,
            emotional_regulation=emotional_regulation
        )
    
    async def _assess_stress_level(self, text: str, linguistic_features: Dict) -> float:
        """Assess current stress level"""
        stress_words = ['stressed', 'anxious', 'worried', 'panic', 'pressure', 'overwhelmed']
        stress_count = sum(1 for word in stress_words if word in text.lower())
        
        # Linguistic indicators
        exclamation_ratio = linguistic_features.get('exclamation_ratio', 0)
        caps_ratio = linguistic_features.get('caps_ratio', 0)
        
        stress_level = 0.3 + stress_count * 0.15 + exclamation_ratio + caps_ratio
        
        return min(stress_level, 1.0)
    
    async def _calculate_stress_threshold(self, current_stress: float,
                                         existing_profile: Optional[UserPsychologicalProfile]) -> float:
        """Calculate stress threshold"""
        if existing_profile and existing_profile.stress_profile:
            # Learn from history
            historical_threshold = existing_profile.stress_profile.stress_threshold
            
            # If handling current stress well, threshold might be higher
            if current_stress > 0.6:
                return min(historical_threshold * 1.1, 1.0)
            else:
                return historical_threshold
        
        # Default threshold
        return 0.6
    
    async def _assess_recovery_rate(self, text: str,
                                   existing_profile: Optional[UserPsychologicalProfile]) -> float:
        """Assess stress recovery rate"""
        recovery_words = ['calm', 'better', 'relaxed', 'okay now', 'recovered']
        recovery_count = sum(1 for word in recovery_words if word in text.lower())
        
        base_rate = 0.5 + recovery_count * 0.15
        
        if existing_profile and existing_profile.stress_profile:
            historical_rate = existing_profile.stress_profile.stress_recovery_rate
            base_rate = historical_rate * 0.7 + base_rate * 0.3
        
        return min(base_rate, 1.0)
    
    async def _identify_coping_mechanisms(self, text: str) -> List[str]:
        """Identify coping mechanisms"""
        mechanisms = []
        
        coping_patterns = {
            'analysis': ['analyze', 'research', 'understand'],
            'social_support': ['talk', 'discuss', 'share', 'community'],
            'avoidance': ['ignore', 'forget', 'distract'],
            'action': ['do something', 'take action', 'fix'],
            'acceptance': ['accept', 'okay with', 'fine'],
            'humor': ['lol', 'haha', 'funny', 'joke']
        }
        
        for mechanism, patterns in coping_patterns.items():
            if any(pattern in text.lower() for pattern in patterns):
                mechanisms.append(mechanism)
        
        return mechanisms if mechanisms else ['unknown']
    
    async def _identify_stress_indicators(self, text: str, linguistic_features: Dict) -> List[str]:
        """Identify stress indicators"""
        indicators = []
        
        # Linguistic indicators
        if linguistic_features.get('exclamation_ratio', 0) > 0.1:
            indicators.append('excessive_punctuation')
        
        if linguistic_features.get('caps_ratio', 0) > 0.1:
            indicators.append('shouting')
        
        # Content indicators
        if any(word in text.lower() for word in ['panic', 'freak out', 'losing it']):
            indicators.append('panic_language')
        
        if text.count('?') > 3:
            indicators.append('excessive_questioning')
        
        return indicators if indicators else ['none_detected']
    
    async def _assess_performance_under_pressure(self, stress_level: float,
                                                contextual_signals: Dict) -> float:
        """Assess performance under pressure"""
        # Inverse relationship - high stress usually means lower performance
        base_performance = 1.0 - (stress_level * 0.6)
        
        # Market volatility as pressure indicator
        volatility = contextual_signals.get('market_volatility', 0.5)
        if volatility > 0.7 and stress_level < 0.5:
            # Handling high volatility with low stress = good performance
            base_performance += 0.2
        
        return np.clip(base_performance, 0.0, 1.0)
    
    async def _assess_emotional_regulation(self, text: str, stress_level: float) -> float:
        """Assess emotional regulation ability"""
        regulation_words = ['calm', 'breathe', 'relax', 'control', 'manage']
        regulation_count = sum(1 for word in regulation_words if word in text.lower())
        
        # If using regulation words despite stress, good regulation
        if stress_level > 0.5 and regulation_count > 0:
            return 0.7
        
        # Low stress suggests good baseline regulation
        if stress_level < 0.3:
            return 0.8
        
        return 0.5


class InterventionGenerator:
    """Generate personalized interventions"""
    
    async def generate(self, personality: PersonalityTraits,
                      decision_style: DecisionStyle,
                      stress_profile: StressProfile,
                      biases: List[CognitiveBias]) -> List[str]:
        """Generate personalized interventions"""
        interventions = []
        
        # Personality-based interventions
        if personality.neuroticism > 0.7:
            interventions.append("🧘 Practice 5-minute meditation before trading decisions")
            interventions.append("📊 Use pre-defined trading rules to reduce emotional decisions")
        
        if personality.fomo_susceptibility > 0.7:
            interventions.append("⏰ Implement 24-hour cooling period for new investments")
            interventions.append("📝 Write down why you're investing before executing")
        
        # Decision style interventions
        if decision_style.style_type == 'impulsive':
            interventions.append("🛑 Set up approval delays on trading platforms")
            interventions.append("📋 Use decision checklists before trading")
        elif decision_style.style_type == 'avoidant':
            interventions.append("⏱️ Set decision deadlines to avoid paralysis")
            interventions.append("🎯 Start with small position sizes to build confidence")
        
        # Stress interventions
        if stress_profile.stress_threshold < 0.5:
            interventions.append("🌊 Practice stress-reduction techniques daily")
            interventions.append("📉 Reduce position sizes during high-stress periods")
        
        # Bias interventions
        bias_types = [bias.bias_type.value for bias in biases]
        if 'confirmation_bias' in bias_types:
            interventions.append("🔄 Actively seek opposing viewpoints before decisions")
        if 'fomo' in bias_types:
            interventions.append("📅 Schedule regular investment reviews, not reactive trades")
        
        return interventions[:5]  # Return top 5 interventions
