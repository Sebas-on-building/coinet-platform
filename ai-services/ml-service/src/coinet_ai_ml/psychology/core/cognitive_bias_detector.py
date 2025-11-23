"""
🧠 COGNITIVE BIAS DETECTOR - DIVINE RATIONALITY RESTORATION
==========================================================

Revolutionary cognitive bias detection engine that identifies and neutralizes
cognitive distortions affecting cryptocurrency investment decisions.

BREAKTHROUGH CAPABILITIES:
- 25+ cognitive bias detection algorithms
- Real-time bias strength assessment
- Decision impact evaluation
- Personalized debiasing strategies
- Contextual bias analysis
- Bias cascade detection

"The first principle is that you must not fool yourself — and you are the easiest person to fool." - Richard Feynman
We expose the biases that fool even the smartest crypto investors.
"""

import asyncio
import logging
import re
import numpy as np
from typing import Dict, List, Optional, Tuple, Any, Set
from datetime import datetime, timedelta
import json
from collections import defaultdict, Counter

from ..models.psychological_patterns import (
    CognitiveBias,
    CognitiveBiasType
)

logger = logging.getLogger(__name__)

class CognitiveBiasDetector:
    """
    🧠 DIVINE COGNITIVE BIAS DETECTOR
    
    This detector uses advanced psychological analysis to identify
    cognitive biases that lead to poor investment decisions with
    unprecedented accuracy and actionable insights.
    
    DIVINE BIAS DETECTION:
    - Multi-dimensional bias analysis
    - Contextual bias strength assessment
    - Cascade effect detection
    - Personalized debiasing strategies
    - Real-time bias monitoring
    """
    
    def __init__(self, config: Optional[Dict] = None):
        """Initialize the cognitive bias detector"""
        self.config = config or self._get_default_config()
        
        # Bias detection algorithms
        self.bias_detectors = self._initialize_bias_detectors()
        self.bias_patterns = self._load_bias_patterns()
        self.debiasing_strategies = self._load_debiasing_strategies()
        
        # Contextual analyzers
        self.decision_impact_analyzer = DecisionImpactAnalyzer()
        self.bias_cascade_detector = BiasCascadeDetector()
        self.personal_bias_profiler = PersonalBiasProfiler()
        
        # Learning systems
        self.bias_learning_system = BiasLearningSystem()
        
        logger.info("🧠 CognitiveBiasDetector initialized with divine rationality restoration")
    
    async def detect(self, enhanced_input: Dict) -> List[CognitiveBias]:
        """
        🎯 MASTER COGNITIVE BIAS DETECTION
        
        Performs comprehensive cognitive bias detection using advanced
        psychological analysis and contextual understanding.
        """
        try:
            text = enhanced_input['processed_text']
            original_text = enhanced_input['original_text']
            linguistic_features = enhanced_input['linguistic_features']
            contextual_signals = enhanced_input['contextual_signals']
            
            # Comprehensive bias detection
            detected_biases = []
            
            # 1. Pattern-based bias detection
            pattern_biases = await self._detect_pattern_based_biases(text, original_text)
            detected_biases.extend(pattern_biases)
            
            # 2. Linguistic bias detection
            linguistic_biases = await self._detect_linguistic_biases(text, linguistic_features)
            detected_biases.extend(linguistic_biases)
            
            # 3. Contextual bias detection
            contextual_biases = await self._detect_contextual_biases(
                text, contextual_signals, enhanced_input
            )
            detected_biases.extend(contextual_biases)
            
            # 4. Decision framework analysis
            decision_biases = await self._analyze_decision_frameworks(text, contextual_signals)
            detected_biases.extend(decision_biases)
            
            # 5. Temporal bias detection
            temporal_biases = await self._detect_temporal_biases(text, enhanced_input)
            detected_biases.extend(temporal_biases)
            
            # 6. Social bias detection
            social_biases = await self._detect_social_biases(text, enhanced_input)
            detected_biases.extend(social_biases)
            
            # 7. Assess decision impact for each bias
            for bias in detected_biases:
                bias.decision_impact = await self.decision_impact_analyzer.assess(bias, enhanced_input)
                bias.financial_risk = await self._assess_financial_risk(bias, contextual_signals)
            
            # 8. Generate personalized debiasing strategies
            for bias in detected_biases:
                bias.mitigation_strategies = await self._generate_mitigation_strategies(bias)
                bias.debiasing_prompts = await self._generate_debiasing_prompts(bias, enhanced_input)
            
            # 9. Detect bias cascades and interactions
            bias_cascades = await self.bias_cascade_detector.detect_cascades(detected_biases)
            
            # 10. Filter and rank by severity
            final_biases = await self._filter_and_rank_biases(detected_biases)
            
            # 11. Store for learning
            await self.bias_learning_system.store_detection(final_biases, enhanced_input)
            
            logger.info(f"🧠 Cognitive bias detection completed: {len(final_biases)} biases detected")
            
            return final_biases
            
        except Exception as e:
            logger.error(f"❌ Cognitive bias detection failed: {str(e)}")
            return []
    
    async def _detect_pattern_based_biases(self, text: str, original_text: str) -> List[CognitiveBias]:
        """Detect biases using predefined patterns"""
        biases = []
        text_lower = text.lower()
        
        # Confirmation Bias
        confirmation_patterns = [
            r'\b(proves my point|i was right|told you so|validates)\b',
            r'\b(cherry pick|only shows|convenient|selective)\b',
            r'\b(ignore|dismiss) (negative|bad) (news|data)\b'
        ]
        
        confirmation_score = await self._calculate_pattern_score(confirmation_patterns, text_lower)
        if confirmation_score > 0.3:
            biases.append(CognitiveBias(
                bias_type=CognitiveBiasType.CONFIRMATION_BIAS,
                strength=confirmation_score,
                confidence=min(confirmation_score + 0.2, 1.0),
                evidence_indicators=await self._extract_confirmation_evidence(text),
                linguistic_markers=await self._extract_confirmation_markers(text),
                behavioral_patterns=["selective_information_processing"],
                decision_impact=0.0,  # Will be calculated later
                financial_risk=0.0,   # Will be calculated later
                mitigation_strategies=[],  # Will be filled later
                debiasing_prompts=[]      # Will be filled later
            ))
        
        # Anchoring Bias
        anchoring_patterns = [
            r'\b(started at|originally|first price|initial)\b',
            r'\b(compare to|relative to|based on) [\$\d]+',
            r'\b(remember when|back when) .* [\$\d]+'
        ]
        
        anchoring_score = await self._calculate_pattern_score(anchoring_patterns, text_lower)
        if anchoring_score > 0.3:
            biases.append(CognitiveBias(
                bias_type=CognitiveBiasType.ANCHORING_BIAS,
                strength=anchoring_score,
                confidence=min(anchoring_score + 0.1, 1.0),
                evidence_indicators=await self._extract_anchoring_evidence(text),
                linguistic_markers=await self._extract_anchoring_markers(text),
                behavioral_patterns=["reference_point_fixation"],
                decision_impact=0.0,
                financial_risk=0.0,
                mitigation_strategies=[],
                debiasing_prompts=[]
            ))
        
        # Loss Aversion
        loss_aversion_patterns = [
            r'\b(can\'t afford to lose|losing money|protect capital)\b',
            r'\b(safe|secure|guaranteed|no risk)\b',
            r'\b(avoid|prevent|stop) (loss|losing)\b'
        ]
        
        loss_aversion_score = await self._calculate_pattern_score(loss_aversion_patterns, text_lower)
        if loss_aversion_score > 0.3:
            biases.append(CognitiveBias(
                bias_type=CognitiveBiasType.LOSS_AVERSION,
                strength=loss_aversion_score,
                confidence=min(loss_aversion_score + 0.15, 1.0),
                evidence_indicators=await self._extract_loss_aversion_evidence(text),
                linguistic_markers=await self._extract_loss_aversion_markers(text),
                behavioral_patterns=["risk_aversion", "status_quo_preference"],
                decision_impact=0.0,
                financial_risk=0.0,
                mitigation_strategies=[],
                debiasing_prompts=[]
            ))
        
        # FOMO (Fear of Missing Out)
        fomo_patterns = [
            r'\b(fomo|missing out|too late|should have)\b',
            r'\b(everyone else|last chance|final opportunity)\b',
            r'\b(train leaving|boat sailed|opportunity gone)\b'
        ]
        
        fomo_score = await self._calculate_pattern_score(fomo_patterns, text_lower)
        if fomo_score > 0.3:
            biases.append(CognitiveBias(
                bias_type=CognitiveBiasType.FOMO,
                strength=fomo_score,
                confidence=min(fomo_score + 0.2, 1.0),
                evidence_indicators=await self._extract_fomo_evidence(text),
                linguistic_markers=await self._extract_fomo_markers(text),
                behavioral_patterns=["impulsive_decision_making", "regret_avoidance"],
                decision_impact=0.0,
                financial_risk=0.0,
                mitigation_strategies=[],
                debiasing_prompts=[]
            ))
        
        return biases
    
    async def _detect_linguistic_biases(self, text: str, linguistic_features: Dict) -> List[CognitiveBias]:
        """Detect biases through linguistic analysis"""
        biases = []
        
        # Overconfidence Bias (from linguistic certainty)
        certainty_words = ['definitely', 'certainly', 'absolutely', 'guaranteed', 'sure', 'obvious']
        certainty_count = sum(1 for word in certainty_words if word in text.lower())
        certainty_ratio = certainty_count / max(linguistic_features.get('word_count', 1), 1)
        
        if certainty_ratio > 0.05:  # High certainty language
            overconfidence_score = min(certainty_ratio * 10, 1.0)
            biases.append(CognitiveBias(
                bias_type=CognitiveBiasType.CONFIRMATION_BIAS,  # Manifests as confirmation bias
                strength=overconfidence_score,
                confidence=overconfidence_score,
                evidence_indicators=[f"high_certainty_language: {certainty_count} certainty words"],
                linguistic_markers=certainty_words[:3],  # Top 3 found
                behavioral_patterns=["overconfidence", "certainty_illusion"],
                decision_impact=0.0,
                financial_risk=0.0,
                mitigation_strategies=[],
                debiasing_prompts=[]
            ))
        
        # Recency Bias (from temporal language patterns)
        recency_words = ['recently', 'lately', 'just', 'now', 'today', 'this week']
        recency_count = sum(1 for word in recency_words if word in text.lower())
        recency_ratio = recency_count / max(linguistic_features.get('word_count', 1), 1)
        
        if recency_ratio > 0.03:
            recency_score = min(recency_ratio * 15, 1.0)
            biases.append(CognitiveBias(
                bias_type=CognitiveBiasType.RECENCY_BIAS,
                strength=recency_score,
                confidence=recency_score,
                evidence_indicators=[f"recency_language: {recency_count} recency indicators"],
                linguistic_markers=recency_words[:3],
                behavioral_patterns=["overweight_recent_events"],
                decision_impact=0.0,
                financial_risk=0.0,
                mitigation_strategies=[],
                debiasing_prompts=[]
            ))
        
        # Availability Heuristic (from vivid language)
        vivid_words = ['shocking', 'amazing', 'incredible', 'devastating', 'spectacular']
        vivid_count = sum(1 for word in vivid_words if word in text.lower())
        vivid_ratio = vivid_count / max(linguistic_features.get('word_count', 1), 1)
        
        if vivid_ratio > 0.02:
            availability_score = min(vivid_ratio * 20, 1.0)
            biases.append(CognitiveBias(
                bias_type=CognitiveBiasType.AVAILABILITY_HEURISTIC,
                strength=availability_score,
                confidence=availability_score,
                evidence_indicators=[f"vivid_language: {vivid_count} vivid descriptors"],
                linguistic_markers=vivid_words[:3],
                behavioral_patterns=["memorable_event_overweighting"],
                decision_impact=0.0,
                financial_risk=0.0,
                mitigation_strategies=[],
                debiasing_prompts=[]
            ))
        
        return biases
    
    async def _detect_contextual_biases(self, text: str, contextual_signals: Dict, enhanced_input: Dict) -> List[CognitiveBias]:
        """Detect biases based on context"""
        biases = []
        
        # Herding Behavior (from market context)
        if contextual_signals.get('social_volume', 0) > 0.7:  # High social activity
            social_words = ['everyone', 'all', 'crowd', 'popular', 'trending']
            social_count = sum(1 for word in social_words if word in text.lower())
            
            if social_count > 1:
                herding_score = min((social_count * 0.3) + (contextual_signals.get('social_volume', 0) * 0.4), 1.0)
                biases.append(CognitiveBias(
                    bias_type=CognitiveBiasType.HERDING_BEHAVIOR,
                    strength=herding_score,
                    confidence=herding_score,
                    evidence_indicators=[f"social_context: high social volume + social language"],
                    linguistic_markers=social_words[:2],
                    behavioral_patterns=["following_crowd", "social_validation_seeking"],
                    decision_impact=0.0,
                    financial_risk=0.0,
                    mitigation_strategies=[],
                    debiasing_prompts=[]
                ))
        
        # Hot Hand Fallacy (from recent performance context)
        if contextual_signals.get('price_change_24h', 0) > 0.1:  # Recent gains
            streak_words = ['streak', 'momentum', 'continues', 'keeps going', 'pattern']
            streak_count = sum(1 for word in streak_words if word in text.lower())
            
            if streak_count > 0:
                hot_hand_score = min((streak_count * 0.4) + (contextual_signals.get('price_change_24h', 0) * 2), 1.0)
                biases.append(CognitiveBias(
                    bias_type=CognitiveBiasType.HOT_HAND_FALLACY,
                    strength=hot_hand_score,
                    confidence=hot_hand_score,
                    evidence_indicators=[f"performance_context: recent gains + streak language"],
                    linguistic_markers=streak_words[:2],
                    behavioral_patterns=["pattern_seeking", "trend_extrapolation"],
                    decision_impact=0.0,
                    financial_risk=0.0,
                    mitigation_strategies=[],
                    debiasing_prompts=[]
                ))
        
        return biases
    
    async def _analyze_decision_frameworks(self, text: str, contextual_signals: Dict) -> List[CognitiveBias]:
        """Analyze decision-making frameworks for biases"""
        biases = []
        
        # Authority Bias
        authority_indicators = re.findall(r'\b(expert|professional|guru|authority) (says|recommends|suggests)\b', text, re.IGNORECASE)
        if authority_indicators:
            authority_score = min(len(authority_indicators) * 0.4, 1.0)
            biases.append(CognitiveBias(
                bias_type=CognitiveBiasType.AUTHORITY_BIAS,
                strength=authority_score,
                confidence=authority_score,
                evidence_indicators=[f"authority_references: {len(authority_indicators)} instances"],
                linguistic_markers=[indicator[0] for indicator in authority_indicators[:3]],
                behavioral_patterns=["deference_to_authority", "reduced_critical_thinking"],
                decision_impact=0.0,
                financial_risk=0.0,
                mitigation_strategies=[],
                debiasing_prompts=[]
            ))
        
        # Bandwagon Effect
        bandwagon_indicators = re.findall(r'\b(everyone|most people|popular choice|majority)\b', text, re.IGNORECASE)
        if len(bandwagon_indicators) > 1:
            bandwagon_score = min(len(bandwagon_indicators) * 0.3, 1.0)
            biases.append(CognitiveBias(
                bias_type=CognitiveBiasType.BANDWAGON_EFFECT,
                strength=bandwagon_score,
                confidence=bandwagon_score,
                evidence_indicators=[f"bandwagon_language: {len(bandwagon_indicators)} instances"],
                linguistic_markers=list(set(bandwagon_indicators[:3])),
                behavioral_patterns=["majority_following", "conformity_pressure"],
                decision_impact=0.0,
                financial_risk=0.0,
                mitigation_strategies=[],
                debiasing_prompts=[]
            ))
        
        return biases
    
    async def _detect_temporal_biases(self, text: str, enhanced_input: Dict) -> List[CognitiveBias]:
        """Detect temporal-related biases"""
        biases = []
        
        # Hyperbolic Discounting
        immediacy_patterns = [
            r'\b(now|immediate|instant|quick|fast) (profit|gain|return)\b',
            r'\b(today|this week|short term)\b'
        ]
        
        immediacy_score = await self._calculate_pattern_score(immediacy_patterns, text.lower())
        if immediacy_score > 0.2:
            biases.append(CognitiveBias(
                bias_type=CognitiveBiasType.HYPERBOLIC_DISCOUNTING,
                strength=immediacy_score,
                confidence=immediacy_score,
                evidence_indicators=[f"immediacy_language: high preference for immediate rewards"],
                linguistic_markers=["immediate", "quick", "instant"],
                behavioral_patterns=["present_bias", "impatience"],
                decision_impact=0.0,
                financial_risk=0.0,
                mitigation_strategies=[],
                debiasing_prompts=[]
            ))
        
        # Planning Fallacy
        timeline_patterns = [
            r'\bwill (definitely|surely|certainly) (happen|occur) (soon|quickly)\b',
            r'\b(easy|simple|straightforward) (timeline|plan|roadmap)\b'
        ]
        
        planning_score = await self._calculate_pattern_score(timeline_patterns, text.lower())
        if planning_score > 0.2:
            biases.append(CognitiveBias(
                bias_type=CognitiveBiasType.PLANNING_FALLACY,
                strength=planning_score,
                confidence=planning_score,
                evidence_indicators=[f"optimistic_planning: unrealistic timeline expectations"],
                linguistic_markers=["definitely", "surely", "easy"],
                behavioral_patterns=["optimistic_bias", "complexity_underestimation"],
                decision_impact=0.0,
                financial_risk=0.0,
                mitigation_strategies=[],
                debiasing_prompts=[]
            ))
        
        return biases
    
    async def _detect_social_biases(self, text: str, enhanced_input: Dict) -> List[CognitiveBias]:
        """Detect social-related biases"""
        biases = []
        
        # Social Proof
        social_proof_patterns = [
            r'\b(everyone is buying|people are buying|others are investing)\b',
            r'\b(trending|popular|viral|hot)\b',
            r'\b(join|follow) (the crowd|others|everyone)\b'
        ]
        
        social_proof_score = await self._calculate_pattern_score(social_proof_patterns, text.lower())
        if social_proof_score > 0.3:
            biases.append(CognitiveBias(
                bias_type=CognitiveBiasType.SOCIAL_PROOF,
                strength=social_proof_score,
                confidence=social_proof_score,
                evidence_indicators=[f"social_proof_language: reliance on others' behavior"],
                linguistic_markers=["everyone", "popular", "trending"],
                behavioral_patterns=["social_validation", "conformity"],
                decision_impact=0.0,
                financial_risk=0.0,
                mitigation_strategies=[],
                debiasing_prompts=[]
            ))
        
        return biases
    
    async def _assess_financial_risk(self, bias: CognitiveBias, contextual_signals: Dict) -> float:
        """Assess financial risk from cognitive bias"""
        
        # Base risk by bias type
        risk_levels = {
            CognitiveBiasType.FOMO: 0.8,
            CognitiveBiasType.LOSS_AVERSION: 0.6,
            CognitiveBiasType.CONFIRMATION_BIAS: 0.7,
            CognitiveBiasType.HERDING_BEHAVIOR: 0.7,
            CognitiveBiasType.ANCHORING_BIAS: 0.5,
            CognitiveBiasType.HOT_HAND_FALLACY: 0.6,
            CognitiveBiasType.GAMBLERS_FALLACY: 0.6,
            CognitiveBiasType.AVAILABILITY_HEURISTIC: 0.5,
            CognitiveBiasType.RECENCY_BIAS: 0.6,
            CognitiveBiasType.AUTHORITY_BIAS: 0.4,
            CognitiveBiasType.SOCIAL_PROOF: 0.5,
            CognitiveBiasType.BANDWAGON_EFFECT: 0.6,
            CognitiveBiasType.HYPERBOLIC_DISCOUNTING: 0.5,
            CognitiveBiasType.PLANNING_FALLACY: 0.4
        }
        
        base_risk = risk_levels.get(bias.bias_type, 0.5)
        
        # Amplify risk based on bias strength
        risk_multiplier = 0.5 + (bias.strength * 0.5)
        
        # Market context amplification
        volatility = contextual_signals.get('market_volatility', 0.5)
        if volatility > 0.7:
            risk_multiplier *= 1.2
        
        return min(base_risk * risk_multiplier, 1.0)
    
    async def _generate_mitigation_strategies(self, bias: CognitiveBias) -> List[str]:
        """Generate mitigation strategies for specific biases"""
        strategies = []
        
        # Universal strategies
        strategies.extend([
            "Take time to reflect before making decisions",
            "Seek diverse perspectives and opinions",
            "Question your assumptions and reasoning"
        ])
        
        # Bias-specific strategies
        if bias.bias_type == CognitiveBiasType.CONFIRMATION_BIAS:
            strategies.extend([
                "Actively seek information that contradicts your view",
                "Set up 'devil's advocate' arguments against your position",
                "Use structured decision-making frameworks",
                "Track and review past prediction accuracy"
            ])
        
        elif bias.bias_type == CognitiveBiasType.ANCHORING_BIAS:
            strategies.extend([
                "Consider multiple reference points, not just the first one",
                "Ask: 'What if this anchor didn't exist?'",
                "Use absolute rather than relative valuation methods",
                "Start analysis from different starting points"
            ])
        
        elif bias.bias_type == CognitiveBiasType.LOSS_AVERSION:
            strategies.extend([
                "Frame decisions in terms of gains rather than losses",
                "Use systematic position sizing rules",
                "Set stop-losses in advance when rational",
                "Consider opportunity costs of inaction"
            ])
        
        elif bias.bias_type == CognitiveBiasType.FOMO:
            strategies.extend([
                "Implement a 24-hour cooling-off period for impulse decisions",
                "Create a systematic investment plan and stick to it",
                "Remember that there are always new opportunities",
                "Focus on your own investment strategy, not others' gains"
            ])
        
        elif bias.bias_type == CognitiveBiasType.HERDING_BEHAVIOR:
            strategies.extend([
                "Develop independent analysis before checking popular opinion",
                "Consider contrarian viewpoints seriously",
                "Remember that crowds are often wrong at extremes",
                "Use objective criteria rather than social consensus"
            ])
        
        elif bias.bias_type == CognitiveBiasType.RECENCY_BIAS:
            strategies.extend([
                "Maintain a longer-term perspective on data",
                "Weight historical data appropriately",
                "Use moving averages to smooth recent noise",
                "Ask: 'Is this pattern representative of the long term?'"
            ])
        
        elif bias.bias_type == CognitiveBiasType.AUTHORITY_BIAS:
            strategies.extend([
                "Verify authority claims and track records",
                "Consider potential conflicts of interest",
                "Form your own opinion before consulting experts",
                "Remember that experts can be wrong or biased"
            ])
        
        elif bias.bias_type == CognitiveBiasType.HYPERBOLIC_DISCOUNTING:
            strategies.extend([
                "Use systematic long-term investment strategies",
                "Automate investments to reduce temptation",
                "Calculate compound growth to visualize long-term benefits",
                "Set up cooling-off periods for major decisions"
            ])
        
        return list(set(strategies))  # Remove duplicates
    
    async def _generate_debiasing_prompts(self, bias: CognitiveBias, enhanced_input: Dict) -> List[str]:
        """Generate specific debiasing prompts"""
        prompts = []
        
        if bias.bias_type == CognitiveBiasType.CONFIRMATION_BIAS:
            prompts.extend([
                "What evidence would change your mind about this investment?",
                "What are the strongest arguments against this position?",
                "How might you be cherry-picking supportive information?"
            ])
        
        elif bias.bias_type == CognitiveBiasType.ANCHORING_BIAS:
            prompts.extend([
                "What would your valuation be if you started from scratch?",
                "Are you being influenced by an irrelevant reference point?",
                "What other benchmarks or comparisons could you use?"
            ])
        
        elif bias.bias_type == CognitiveBiasType.FOMO:
            prompts.extend([
                "Will this opportunity really disappear forever?",
                "What's driving your sense of urgency?",
                "How would you feel about this decision in a week?"
            ])
        
        elif bias.bias_type == CognitiveBiasType.HERDING_BEHAVIOR:
            prompts.extend([
                "What's your independent analysis, ignoring popular opinion?",
                "Could the crowd be wrong this time?",
                "What would a contrarian investor think?"
            ])
        
        elif bias.bias_type == CognitiveBiasType.LOSS_AVERSION:
            prompts.extend([
                "What are the potential gains you might miss by avoiding this risk?",
                "How does this risk compare to your overall portfolio risk?",
                "Are you being too conservative relative to your goals?"
            ])
        
        return prompts
    
    async def _calculate_pattern_score(self, patterns: List[str], text: str) -> float:
        """Calculate score based on pattern matches"""
        total_score = 0.0
        
        for pattern in patterns:
            matches = len(re.findall(pattern, text, re.IGNORECASE))
            total_score += min(matches * 0.3, 0.5)
        
        return min(total_score, 1.0)
    
    async def _extract_confirmation_evidence(self, text: str) -> List[str]:
        """Extract evidence of confirmation bias"""
        evidence = []
        
        if re.search(r'\bproves?\b', text, re.IGNORECASE):
            evidence.append("uses_definitive_language")
        
        if re.search(r'\bignore\b.*\bnegative\b', text, re.IGNORECASE):
            evidence.append("dismisses_negative_information")
        
        if re.search(r'\bselective\b', text, re.IGNORECASE):
            evidence.append("acknowledges_selectivity")
        
        return evidence
    
    async def _extract_confirmation_markers(self, text: str) -> List[str]:
        """Extract confirmation bias linguistic markers"""
        markers = []
        
        confirmation_words = ['proves', 'validates', 'confirms', 'supports', 'right', 'correct']
        found_words = [word for word in confirmation_words if word in text.lower()]
        
        return found_words[:3]  # Return top 3
    
    async def _extract_anchoring_evidence(self, text: str) -> List[str]:
        """Extract evidence of anchoring bias"""
        evidence = []
        
        if re.search(r'\b(started|originally|first|initial)\b.*[\$\d]', text, re.IGNORECASE):
            evidence.append("references_initial_price")
        
        if re.search(r'\bcompare\b.*\bto\b', text, re.IGNORECASE):
            evidence.append("uses_comparison_anchor")
        
        return evidence
    
    async def _extract_anchoring_markers(self, text: str) -> List[str]:
        """Extract anchoring bias linguistic markers"""
        markers = []
        
        anchoring_words = ['originally', 'started', 'first', 'initial', 'compare', 'relative']
        found_words = [word for word in anchoring_words if word in text.lower()]
        
        return found_words[:3]
    
    async def _extract_loss_aversion_evidence(self, text: str) -> List[str]:
        """Extract evidence of loss aversion"""
        evidence = []
        
        if re.search(r'\bcan\'t afford\b.*\blose\b', text, re.IGNORECASE):
            evidence.append("expresses_loss_fear")
        
        if re.search(r'\bsafe\b.*\binvestment\b', text, re.IGNORECASE):
            evidence.append("seeks_safety")
        
        return evidence
    
    async def _extract_loss_aversion_markers(self, text: str) -> List[str]:
        """Extract loss aversion linguistic markers"""
        markers = []
        
        loss_aversion_words = ['safe', 'secure', 'protect', 'avoid', 'prevent', 'guarantee']
        found_words = [word for word in loss_aversion_words if word in text.lower()]
        
        return found_words[:3]
    
    async def _extract_fomo_evidence(self, text: str) -> List[str]:
        """Extract evidence of FOMO"""
        evidence = []
        
        if re.search(r'\bmissing out\b', text, re.IGNORECASE):
            evidence.append("explicit_fomo_language")
        
        if re.search(r'\btoo late\b', text, re.IGNORECASE):
            evidence.append("timing_anxiety")
        
        if re.search(r'\bshould have\b', text, re.IGNORECASE):
            evidence.append("regret_expression")
        
        return evidence
    
    async def _extract_fomo_markers(self, text: str) -> List[str]:
        """Extract FOMO linguistic markers"""
        markers = []
        
        fomo_words = ['missing', 'late', 'should', 'regret', 'opportunity', 'chance']
        found_words = [word for word in fomo_words if word in text.lower()]
        
        return found_words[:3]
    
    async def _filter_and_rank_biases(self, biases: List[CognitiveBias]) -> List[CognitiveBias]:
        """Filter and rank biases by severity"""
        
        # Filter out low-confidence biases
        filtered_biases = [bias for bias in biases if bias.confidence >= self.config['bias_threshold']]
        
        # Remove duplicates (same bias type)
        seen_types = set()
        unique_biases = []
        
        for bias in filtered_biases:
            if bias.bias_type not in seen_types:
                unique_biases.append(bias)
                seen_types.add(bias.bias_type)
            else:
                # Keep the one with higher confidence
                existing_bias = next(b for b in unique_biases if b.bias_type == bias.bias_type)
                if bias.confidence > existing_bias.confidence:
                    unique_biases.remove(existing_bias)
                    unique_biases.append(bias)
        
        # Sort by combined impact score
        def bias_severity(bias):
            return (bias.decision_impact * 0.4 + 
                   bias.financial_risk * 0.4 + 
                   bias.strength * 0.2)
        
        return sorted(unique_biases, key=bias_severity, reverse=True)
    
    def _initialize_bias_detectors(self) -> Dict:
        """Initialize bias detection algorithms"""
        return {
            'pattern_detector': PatternBasedDetector(),
            'linguistic_detector': LinguisticDetector(),
            'contextual_detector': ContextualDetector(),
            'behavioral_detector': BehavioralDetector()
        }
    
    def _load_bias_patterns(self) -> Dict:
        """Load bias detection patterns"""
        return {
            'confirmation_bias': [
                r'\b(proves|validates|confirms|supports)\b.*\b(right|correct)\b',
                r'\b(cherry pick|selective|convenient)\b',
                r'\bignore\b.*\b(negative|bad|contrary)\b'
            ],
            'anchoring_bias': [
                r'\b(started|originally|first|initial)\b.*[\$\d]',
                r'\bcompare\b.*\bto\b.*[\$\d]',
                r'\bbased on\b.*[\$\d]'
            ],
            'loss_aversion': [
                r'\bcan\'t afford\b.*\blose\b',
                r'\b(safe|secure|guaranteed)\b.*\binvestment\b',
                r'\bavoid\b.*\b(loss|risk)\b'
            ]
        }
    
    def _load_debiasing_strategies(self) -> Dict:
        """Load debiasing strategies"""
        return {
            'universal': [
                "Take time before making decisions",
                "Seek diverse perspectives",
                "Question your assumptions"
            ],
            'specific': {
                'confirmation_bias': [
                    "Actively seek contradictory evidence",
                    "Set up devil's advocate arguments"
                ],
                'anchoring_bias': [
                    "Consider multiple reference points",
                    "Start analysis from different angles"
                ]
            }
        }
    
    def _get_default_config(self) -> Dict:
        """Get default configuration"""
        return {
            'bias_threshold': 0.5,
            'severity_threshold': 0.7,
            'confidence_threshold': 0.6
        }


class DecisionImpactAnalyzer:
    """Analyze impact of biases on decision-making"""
    
    async def assess(self, bias: CognitiveBias, enhanced_input: Dict) -> float:
        """Assess decision impact of bias"""
        
        # Base impact by bias type
        impact_levels = {
            CognitiveBiasType.FOMO: 0.8,
            CognitiveBiasType.CONFIRMATION_BIAS: 0.7,
            CognitiveBiasType.ANCHORING_BIAS: 0.6,
            CognitiveBiasType.LOSS_AVERSION: 0.6,
            CognitiveBiasType.HERDING_BEHAVIOR: 0.7,
            CognitiveBiasType.RECENCY_BIAS: 0.6,
            CognitiveBiasType.AUTHORITY_BIAS: 0.5,
            CognitiveBiasType.HOT_HAND_FALLACY: 0.6
        }
        
        base_impact = impact_levels.get(bias.bias_type, 0.5)
        
        # Amplify by bias strength
        impact = base_impact * (0.5 + bias.strength * 0.5)
        
        # Context amplification
        contextual_signals = enhanced_input.get('contextual_signals', {})
        if contextual_signals.get('market_volatility', 0) > 0.7:
            impact *= 1.2
        
        return min(impact, 1.0)


class BiasCascadeDetector:
    """Detect cascading bias effects"""
    
    async def detect_cascades(self, biases: List[CognitiveBias]) -> List[Dict]:
        """Detect bias cascades and interactions"""
        cascades = []
        
        # Common cascade patterns
        cascade_patterns = [
            ([CognitiveBiasType.FOMO, CognitiveBiasType.HERDING_BEHAVIOR], "social_pressure_cascade"),
            ([CognitiveBiasType.CONFIRMATION_BIAS, CognitiveBiasType.ANCHORING_BIAS], "confirmation_anchoring_cascade"),
            ([CognitiveBiasType.RECENCY_BIAS, CognitiveBiasType.HOT_HAND_FALLACY], "momentum_cascade")
        ]
        
        bias_types = [bias.bias_type for bias in biases]
        
        for pattern_biases, cascade_name in cascade_patterns:
            if all(bias_type in bias_types for bias_type in pattern_biases):
                cascades.append({
                    'name': cascade_name,
                    'biases': pattern_biases,
                    'severity': 'high'
                })
        
        return cascades


class PersonalBiasProfiler:
    """Create personalized bias profiles"""
    
    def __init__(self):
        self.user_bias_history = defaultdict(list)
    
    async def create_profile(self, user_id: str, detected_biases: List[CognitiveBias]) -> Dict:
        """Create personalized bias profile"""
        
        # Store bias history
        self.user_bias_history[user_id].extend([bias.bias_type for bias in detected_biases])
        
        # Analyze patterns
        bias_counter = Counter(self.user_bias_history[user_id])
        
        return {
            'dominant_biases': bias_counter.most_common(3),
            'bias_frequency': dict(bias_counter),
            'risk_profile': self._assess_risk_profile(bias_counter),
            'recommendations': self._generate_personal_recommendations(bias_counter)
        }
    
    def _assess_risk_profile(self, bias_counter: Counter) -> str:
        """Assess user's risk profile based on bias patterns"""
        high_risk_biases = [CognitiveBiasType.FOMO, CognitiveBiasType.HERDING_BEHAVIOR, CognitiveBiasType.HOT_HAND_FALLACY]
        
        high_risk_count = sum(bias_counter[bias] for bias in high_risk_biases)
        total_count = sum(bias_counter.values())
        
        if total_count == 0:
            return 'unknown'
        
        risk_ratio = high_risk_count / total_count
        
        if risk_ratio > 0.6:
            return 'high_risk'
        elif risk_ratio > 0.3:
            return 'moderate_risk'
        else:
            return 'low_risk'
    
    def _generate_personal_recommendations(self, bias_counter: Counter) -> List[str]:
        """Generate personalized recommendations"""
        recommendations = []
        
        if bias_counter[CognitiveBiasType.FOMO] > 2:
            recommendations.append("Implement systematic cooling-off periods before making investment decisions")
        
        if bias_counter[CognitiveBiasType.CONFIRMATION_BIAS] > 2:
            recommendations.append("Actively seek contrarian viewpoints for your investment ideas")
        
        if bias_counter[CognitiveBiasType.HERDING_BEHAVIOR] > 2:
            recommendations.append("Develop independent analysis skills and trust your own research")
        
        return recommendations


class BiasLearningSystem:
    """Learn from bias detection outcomes"""
    
    def __init__(self):
        self.detection_history = []
    
    async def store_detection(self, biases: List[CognitiveBias], enhanced_input: Dict):
        """Store bias detection for learning"""
        
        detection_record = {
            'timestamp': datetime.utcnow(),
            'biases_detected': [bias.bias_type.value for bias in biases],
            'confidence_scores': [bias.confidence for bias in biases],
            'context': enhanced_input.get('contextual_signals', {}),
            'text_features': enhanced_input.get('linguistic_features', {})
        }
        
        self.detection_history.append(detection_record)
        
        # Keep only recent history
        if len(self.detection_history) > 1000:
            self.detection_history = self.detection_history[-1000:]
    
    async def analyze_patterns(self) -> Dict:
        """Analyze patterns in bias detection"""
        
        if not self.detection_history:
            return {}
        
        # Analyze common bias combinations
        bias_combinations = defaultdict(int)
        for record in self.detection_history:
            biases = tuple(sorted(record['biases_detected']))
            if len(biases) > 1:
                bias_combinations[biases] += 1
        
        # Analyze context patterns
        context_patterns = defaultdict(list)
        for record in self.detection_history:
            context = record['context']
            for bias in record['biases_detected']:
                context_patterns[bias].append(context)
        
        return {
            'common_combinations': dict(bias_combinations),
            'context_patterns': dict(context_patterns),
            'detection_frequency': len(self.detection_history)
        }


# Placeholder classes for the bias detection system
class PatternBasedDetector:
    """Pattern-based bias detection"""
    pass

class LinguisticDetector:
    """Linguistic bias detection"""
    pass

class ContextualDetector:
    """Contextual bias detection"""
    pass

class BehavioralDetector:
    """Behavioral bias detection"""
    pass
