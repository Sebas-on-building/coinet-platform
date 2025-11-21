"""
🔍 MANIPULATION DETECTOR - DIVINE PROTECTION AGAINST DECEPTION
==============================================================

Revolutionary manipulation detection engine that identifies and neutralizes
sophisticated psychological manipulation tactics in cryptocurrency markets.

BREAKTHROUGH CAPABILITIES:
- Multi-layered manipulation detection
- Sophistication level assessment
- Real-time protection mechanisms
- Coordinated campaign identification
- Influence operation mapping
- Counter-manipulation strategies

"The greatest enemy of knowledge is not ignorance, it is the illusion of knowledge." - Stephen Hawking
We shatter illusions created by manipulators to reveal truth.
"""

import asyncio
import logging
import re
import numpy as np
from typing import Dict, List, Optional, Tuple, Any, Set
from datetime import datetime, timedelta
import json
from collections import defaultdict, Counter
import hashlib

from ..models.psychological_patterns import (
    ManipulationTactic,
    ManipulationTacticType
)

logger = logging.getLogger(__name__)

class ManipulationDetector:
    """
    🔍 DIVINE MANIPULATION DETECTOR
    
    This detector uses advanced pattern recognition, linguistic analysis,
    and behavioral modeling to identify sophisticated manipulation tactics
    with unprecedented accuracy.
    
    DIVINE PROTECTION MECHANISMS:
    - Real-time manipulation identification
    - Sophistication assessment
    - Coordinated campaign detection
    - Influence network mapping
    - Counter-strategy generation
    """
    
    def __init__(self, config: Optional[Dict] = None):
        """Initialize the manipulation detector"""
        self.config = config or self._get_default_config()
        
        # Manipulation pattern databases
        self.manipulation_patterns = self._load_manipulation_patterns()
        self.linguistic_indicators = self._load_linguistic_indicators()
        self.behavioral_signatures = self._load_behavioral_signatures()
        self.coordination_patterns = self._load_coordination_patterns()
        
        # Tracking systems
        self.campaign_tracker = CampaignTracker()
        self.influence_mapper = InfluenceMapper()
        self.sophistication_assessor = SophisticationAssessor()
        
        # Machine learning models (placeholders for now)
        self.manipulation_classifier = None  # Would load transformer model
        self.authenticity_model = None  # Would load authenticity detection model
        self.coordination_detector = None  # Would load coordination detection model
        
        logger.info("🔍 ManipulationDetector initialized with divine protection algorithms")
    
    async def detect(self, enhanced_input: Dict) -> List[ManipulationTactic]:
        """
        🎯 MASTER MANIPULATION DETECTION
        
        Performs comprehensive manipulation detection using multiple
        methodologies and protection mechanisms.
        """
        try:
            text = enhanced_input['processed_text']
            original_text = enhanced_input['original_text']
            linguistic_features = enhanced_input['linguistic_features']
            contextual_signals = enhanced_input['contextual_signals']
            social_features = enhanced_input.get('social_features', {})
            
            # Multi-layered detection approach
            detected_tactics = []
            
            # 1. Pattern-based detection
            pattern_tactics = await self._detect_pattern_based_manipulation(text, original_text)
            detected_tactics.extend(pattern_tactics)
            
            # 2. Linguistic analysis
            linguistic_tactics = await self._detect_linguistic_manipulation(text, linguistic_features)
            detected_tactics.extend(linguistic_tactics)
            
            # 3. Behavioral analysis
            behavioral_tactics = await self._detect_behavioral_manipulation(
                text, social_features, contextual_signals
            )
            detected_tactics.extend(behavioral_tactics)
            
            # 4. Coordination detection
            coordination_tactics = await self._detect_coordinated_manipulation(
                text, social_features, enhanced_input
            )
            detected_tactics.extend(coordination_tactics)
            
            # 5. Advanced sophistication assessment
            sophisticated_tactics = await self._assess_sophistication_levels(detected_tactics, enhanced_input)
            
            # 6. Generate counter-strategies
            for tactic in sophisticated_tactics:
                tactic.protection_strategies = await self._generate_protection_strategies(tactic)
            
            # 7. Remove duplicates and rank by confidence
            final_tactics = await self._deduplicate_and_rank(sophisticated_tactics)
            
            # 8. Store for learning and pattern tracking
            await self._store_for_learning(final_tactics, enhanced_input)
            
            logger.info(f"🔍 Manipulation detection completed: {len(final_tactics)} tactics detected")
            
            return final_tactics
            
        except Exception as e:
            logger.error(f"❌ Manipulation detection failed: {str(e)}")
            return []
    
    async def _detect_pattern_based_manipulation(self, text: str, original_text: str) -> List[ManipulationTactic]:
        """Detect manipulation using predefined patterns"""
        tactics = []
        text_lower = text.lower()
        
        for tactic_type, patterns in self.manipulation_patterns.items():
            for pattern_data in patterns:
                pattern = pattern_data['pattern']
                weight = pattern_data['weight']
                indicators = pattern_data['indicators']
                
                matches = re.findall(pattern, original_text, re.IGNORECASE | re.MULTILINE)
                if matches:
                    confidence = min(len(matches) * weight, 1.0)
                    
                    if confidence >= self.config['evidence_threshold']:
                        tactic = ManipulationTactic(
                            tactic_type=ManipulationTacticType(tactic_type),
                            sophistication_level=0.5,  # Will be assessed later
                            confidence=confidence,
                            evidence_strength=confidence,
                            manipulation_indicators=indicators,
                            behavioral_signatures=[f"pattern_match: {pattern}"],
                            target_audience=await self._identify_target_audience(text_lower),
                            intended_outcome=await self._infer_intended_outcome(tactic_type),
                            potential_impact=await self._assess_potential_impact(tactic_type, confidence),
                            detection_methods=[f"pattern_based: {tactic_type}"],
                            protection_strategies=[]  # Will be filled later
                        )
                        tactics.append(tactic)
        
        return tactics
    
    async def _detect_linguistic_manipulation(self, text: str, linguistic_features: Dict) -> List[ManipulationTactic]:
        """Detect manipulation through linguistic analysis"""
        tactics = []
        
        # False urgency detection
        urgency_score = await self._calculate_urgency_manipulation_score(text, linguistic_features)
        if urgency_score > 0.6:
            tactics.append(ManipulationTactic(
                tactic_type=ManipulationTacticType.FALSE_URGENCY,
                sophistication_level=urgency_score * 0.8,
                confidence=urgency_score,
                evidence_strength=urgency_score,
                manipulation_indicators=await self._extract_urgency_indicators(text),
                behavioral_signatures=[f"urgency_score: {urgency_score:.3f}"],
                target_audience=["impulsive_traders", "inexperienced_investors"],
                intended_outcome="prompt_immediate_action",
                potential_impact=urgency_score * 0.9,
                detection_methods=["linguistic_urgency_analysis"],
                protection_strategies=[]
            ))
        
        # Emotional hijacking detection
        hijacking_score = await self._calculate_emotional_hijacking_score(text, linguistic_features)
        if hijacking_score > 0.6:
            tactics.append(ManipulationTactic(
                tactic_type=ManipulationTacticType.EMOTIONAL_HIJACKING,
                sophistication_level=hijacking_score * 0.9,
                confidence=hijacking_score,
                evidence_strength=hijacking_score,
                manipulation_indicators=await self._extract_hijacking_indicators(text),
                behavioral_signatures=[f"hijacking_score: {hijacking_score:.3f}"],
                target_audience=["emotional_traders", "fear_driven_investors"],
                intended_outcome="bypass_rational_thinking",
                potential_impact=hijacking_score,
                detection_methods=["emotional_hijacking_analysis"],
                protection_strategies=[]
            ))
        
        # Misleading statistics detection
        statistics_manipulation = await self._detect_statistical_manipulation(text)
        if statistics_manipulation['score'] > 0.5:
            tactics.append(ManipulationTactic(
                tactic_type=ManipulationTacticType.MISLEADING_STATISTICS,
                sophistication_level=statistics_manipulation['sophistication'],
                confidence=statistics_manipulation['score'],
                evidence_strength=statistics_manipulation['score'],
                manipulation_indicators=statistics_manipulation['indicators'],
                behavioral_signatures=statistics_manipulation['signatures'],
                target_audience=["data_driven_investors", "technical_analysts"],
                intended_outcome="create_false_confidence",
                potential_impact=statistics_manipulation['score'] * 0.8,
                detection_methods=["statistical_analysis"],
                protection_strategies=[]
            ))
        
        return tactics
    
    async def _detect_behavioral_manipulation(self, text: str, social_features: Dict, contextual_signals: Dict) -> List[ManipulationTactic]:
        """Detect manipulation through behavioral analysis"""
        tactics = []
        
        # Authority manipulation detection
        authority_manipulation = await self._detect_authority_manipulation(text, social_features)
        if authority_manipulation['score'] > 0.5:
            tactics.append(ManipulationTactic(
                tactic_type=ManipulationTacticType.APPEAL_TO_AUTHORITY,
                sophistication_level=authority_manipulation['sophistication'],
                confidence=authority_manipulation['score'],
                evidence_strength=authority_manipulation['score'],
                manipulation_indicators=authority_manipulation['indicators'],
                behavioral_signatures=authority_manipulation['signatures'],
                target_audience=["authority_followers", "inexperienced_traders"],
                intended_outcome="gain_credibility_through_association",
                potential_impact=authority_manipulation['score'] * 0.7,
                detection_methods=["authority_analysis"],
                protection_strategies=[]
            ))
        
        # Social proof manipulation detection
        social_proof_manipulation = await self._detect_social_proof_manipulation(text, social_features)
        if social_proof_manipulation['score'] > 0.5:
            tactics.append(ManipulationTactic(
                tactic_type=ManipulationTacticType.SOCIAL_PROOF,
                sophistication_level=social_proof_manipulation['sophistication'],
                confidence=social_proof_manipulation['score'],
                evidence_strength=social_proof_manipulation['score'],
                manipulation_indicators=social_proof_manipulation['indicators'],
                behavioral_signatures=social_proof_manipulation['signatures'],
                target_audience=["social_followers", "herd_mentality_traders"],
                intended_outcome="create_bandwagon_effect",
                potential_impact=social_proof_manipulation['score'] * 0.8,
                detection_methods=["social_proof_analysis"],
                protection_strategies=[]
            ))
        
        return tactics
    
    async def _detect_coordinated_manipulation(self, text: str, social_features: Dict, enhanced_input: Dict) -> List[ManipulationTactic]:
        """Detect coordinated manipulation campaigns"""
        tactics = []
        
        # Check for coordination patterns
        coordination_score = await self.campaign_tracker.assess_coordination(text, social_features, enhanced_input)
        
        if coordination_score > 0.6:
            # Determine coordination type
            coordination_type = await self._determine_coordination_type(text, coordination_score)
            
            tactics.append(ManipulationTactic(
                tactic_type=coordination_type,
                sophistication_level=coordination_score,
                confidence=coordination_score,
                evidence_strength=coordination_score,
                manipulation_indicators=await self._extract_coordination_indicators(text, enhanced_input),
                behavioral_signatures=[f"coordination_score: {coordination_score:.3f}"],
                target_audience=["retail_investors", "social_media_users"],
                intended_outcome="amplify_message_through_coordination",
                potential_impact=coordination_score * 0.9,
                detection_methods=["coordination_analysis"],
                protection_strategies=[]
            ))
        
        return tactics
    
    async def _assess_sophistication_levels(self, tactics: List[ManipulationTactic], enhanced_input: Dict) -> List[ManipulationTactic]:
        """Assess sophistication levels of detected tactics"""
        for tactic in tactics:
            sophistication = await self.sophistication_assessor.assess(tactic, enhanced_input)
            tactic.sophistication_level = sophistication
        
        return tactics
    
    async def _generate_protection_strategies(self, tactic: ManipulationTactic) -> List[str]:
        """Generate protection strategies for specific manipulation tactics"""
        strategies = []
        
        # Universal strategies
        strategies.extend([
            "Seek independent verification from multiple sources",
            "Take time to research before making decisions",
            "Question the motivations behind the message"
        ])
        
        # Tactic-specific strategies
        if tactic.tactic_type == ManipulationTacticType.FALSE_URGENCY:
            strategies.extend([
                "Ignore artificial time pressure",
                "Legitimate opportunities don't require immediate action",
                "Take 24 hours to consider any 'urgent' investment decision"
            ])
        
        elif tactic.tactic_type == ManipulationTacticType.EMOTIONAL_HIJACKING:
            strategies.extend([
                "Recognize when emotions are being deliberately triggered",
                "Use cooling-off periods before making emotional decisions",
                "Focus on facts rather than feelings"
            ])
        
        elif tactic.tactic_type == ManipulationTacticType.MISLEADING_STATISTICS:
            strategies.extend([
                "Ask for source data and methodology",
                "Look for context and comparison baselines",
                "Verify statistics through independent sources"
            ])
        
        elif tactic.tactic_type == ManipulationTacticType.SOCIAL_PROOF:
            strategies.extend([
                "Question whether 'everyone' is really doing it",
                "Consider that popular opinion can be wrong",
                "Seek contrarian viewpoints for balance"
            ])
        
        elif tactic.tactic_type == ManipulationTacticType.APPEAL_TO_AUTHORITY:
            strategies.extend([
                "Verify the credentials and track record of authorities",
                "Consider potential conflicts of interest",
                "Remember that experts can be wrong or biased"
            ])
        
        elif tactic.tactic_type in [ManipulationTacticType.ASTROTURFING, ManipulationTacticType.COORDINATED_CAMPAIGNS]:
            strategies.extend([
                "Look for suspiciously similar messaging patterns",
                "Check account creation dates and activity patterns",
                "Be skeptical of sudden consensus around new topics"
            ])
        
        return list(set(strategies))  # Remove duplicates
    
    async def _calculate_urgency_manipulation_score(self, text: str, linguistic_features: Dict) -> float:
        """Calculate urgency manipulation score"""
        score = 0.0
        
        # Urgency words weight
        urgency_ratio = linguistic_features.get('urgency_words', 0) / max(linguistic_features.get('word_count', 1), 1)
        score += urgency_ratio * 0.4
        
        # Time pressure indicators
        time_patterns = [
            r'\b(now|immediately|asap|urgent|hurry|quick|fast|limited time|act now)\b',
            r'\b(expires|deadline|running out|last chance|final)\b',
            r'\b(only \d+ left|limited quantity|while supplies last)\b'
        ]
        
        for pattern in time_patterns:
            matches = len(re.findall(pattern, text, re.IGNORECASE))
            score += min(matches * 0.15, 0.3)
        
        # Punctuation intensity (multiple exclamation marks)
        exclamation_intensity = linguistic_features.get('exclamation_ratio', 0)
        if exclamation_intensity > 0.1:
            score += min(exclamation_intensity * 0.3, 0.3)
        
        return min(score, 1.0)
    
    async def _calculate_emotional_hijacking_score(self, text: str, linguistic_features: Dict) -> float:
        """Calculate emotional hijacking score"""
        score = 0.0
        
        # Extreme emotional language
        extreme_emotions = [
            r'\b(amazing|incredible|unbelievable|shocking|devastating|terrible|awful)\b',
            r'\b(revolutionary|game-changer|life-changing|disaster|catastrophe)\b',
            r'\b(guaranteed|never|always|impossible|certain|sure thing)\b'
        ]
        
        for pattern in extreme_emotions:
            matches = len(re.findall(pattern, text, re.IGNORECASE))
            score += min(matches * 0.1, 0.2)
        
        # Emotional intensifiers
        intensifiers = linguistic_features.get('caps_ratio', 0)
        score += min(intensifiers * 0.3, 0.3)
        
        # Fear/greed triggers
        fear_greed_patterns = [
            r'\b(miss out|lose money|regret|mistake|stupid|fool)\b',
            r'\b(rich|wealthy|millionaire|retire early|financial freedom)\b'
        ]
        
        for pattern in fear_greed_patterns:
            matches = len(re.findall(pattern, text, re.IGNORECASE))
            score += min(matches * 0.15, 0.25)
        
        return min(score, 1.0)
    
    async def _detect_statistical_manipulation(self, text: str) -> Dict:
        """Detect statistical manipulation patterns"""
        result = {
            'score': 0.0,
            'sophistication': 0.5,
            'indicators': [],
            'signatures': []
        }
        
        # Suspicious statistics patterns
        stat_patterns = [
            (r'\b(\d+)% guaranteed', 0.3, "guaranteed_percentage"),
            (r'\b(\d+)x return', 0.2, "promised_multiplier"),
            (r'\bup (\d+)% in (\d+) days', 0.2, "specific_gains_timeline"),
            (r'\b(\d+) out of (\d+) experts agree', 0.25, "expert_consensus_claim"),
            (r'\bhistorically returns (\d+)%', 0.15, "historical_return_claim")
        ]
        
        for pattern, weight, indicator in stat_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                result['score'] += weight
                result['indicators'].append(indicator)
                result['signatures'].append(f"{indicator}: {matches}")
        
        # Cherry-picking indicators
        cherry_pick_patterns = [
            r'\bbest performing',
            r'\btop \d+%',
            r'\brecord breaking',
            r'\bhighest ever'
        ]
        
        cherry_pick_count = sum(1 for pattern in cherry_pick_patterns 
                               if re.search(pattern, text, re.IGNORECASE))
        
        if cherry_pick_count > 1:
            result['score'] += 0.2
            result['indicators'].append("potential_cherry_picking")
        
        # Context manipulation
        if re.search(r'\bcompared to [^,]+, but', text, re.IGNORECASE):
            result['score'] += 0.15
            result['indicators'].append("selective_comparison")
        
        result['score'] = min(result['score'], 1.0)
        
        # Assess sophistication
        if len(result['indicators']) > 3:
            result['sophistication'] = 0.8
        elif len(result['indicators']) > 1:
            result['sophistication'] = 0.6
        
        return result
    
    async def _detect_authority_manipulation(self, text: str, social_features: Dict) -> Dict:
        """Detect authority manipulation"""
        result = {
            'score': 0.0,
            'sophistication': 0.5,
            'indicators': [],
            'signatures': []
        }
        
        # False credentials
        credential_patterns = [
            (r'\bexpert\b', 0.1),
            (r'\bprofessional\b', 0.1),
            (r'\bcertified\b', 0.15),
            (r'\blicensed\b', 0.15),
            (r'\b\d+ years experience\b', 0.2)
        ]
        
        for pattern, weight in credential_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                result['score'] += weight
                result['indicators'].append(f"credential_claim: {pattern}")
        
        # Unverifiable associations
        association_patterns = [
            r'\bworked with (major|top|leading)',
            r'\btrusted by (thousands|millions)',
            r'\bused by (professionals|experts)'
        ]
        
        for pattern in association_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                result['score'] += 0.2
                result['indicators'].append(f"unverifiable_association: {pattern}")
        
        # Social proof from authority
        if social_features.get('follower_count', 0) > 10000 and social_features.get('verification_status', False):
            result['score'] *= 0.7  # Reduce score if actually verified
        elif social_features.get('follower_count', 0) < 1000:
            result['score'] += 0.2  # Increase score for low follower accounts claiming authority
        
        result['score'] = min(result['score'], 1.0)
        return result
    
    async def _detect_social_proof_manipulation(self, text: str, social_features: Dict) -> Dict:
        """Detect social proof manipulation"""
        result = {
            'score': 0.0,
            'sophistication': 0.5,
            'indicators': [],
            'signatures': []
        }
        
        # Bandwagon language
        bandwagon_patterns = [
            (r'\beveryone is', 0.2),
            (r'\ball my friends', 0.15),
            (r'\bmost people', 0.15),
            (r'\beverybody knows', 0.2),
            (r'\bdon\'t be left out', 0.25)
        ]
        
        for pattern, weight in bandwagon_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                result['score'] += weight
                result['indicators'].append(f"bandwagon_language: {pattern}")
        
        # Fake testimonials
        testimonial_patterns = [
            r'\bmy friend made \$',
            r'\bi know someone who',
            r'\ba guy i know',
            r'\bpeople are saying'
        ]
        
        for pattern in testimonial_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                result['score'] += 0.2
                result['indicators'].append(f"questionable_testimonial: {pattern}")
        
        # Social pressure
        pressure_patterns = [
            r'\bjoin now',
            r'\bdon\'t miss out',
            r'\bwhile others',
            r'\bget in now'
        ]
        
        pressure_count = sum(1 for pattern in pressure_patterns 
                           if re.search(pattern, text, re.IGNORECASE))
        
        if pressure_count > 1:
            result['score'] += 0.3
            result['indicators'].append("social_pressure_language")
        
        result['score'] = min(result['score'], 1.0)
        return result
    
    async def _determine_coordination_type(self, text: str, coordination_score: float) -> ManipulationTacticType:
        """Determine the type of coordinated manipulation"""
        
        # Check for astroturfing indicators
        astroturf_patterns = [
            r'\borganic growth',
            r'\bgrassroots movement',
            r'\bnatural adoption'
        ]
        
        if any(re.search(pattern, text, re.IGNORECASE) for pattern in astroturf_patterns):
            return ManipulationTacticType.ASTROTURFING
        
        # Check for sock puppeting indicators
        if coordination_score > 0.8:
            return ManipulationTacticType.SOCK_PUPPETING
        
        # Default to coordinated campaigns
        return ManipulationTacticType.COORDINATED_CAMPAIGNS
    
    async def _extract_urgency_indicators(self, text: str) -> List[str]:
        """Extract specific urgency indicators"""
        indicators = []
        
        urgency_words = re.findall(r'\b(now|urgent|immediate|asap|hurry|quick|fast)\b', text, re.IGNORECASE)
        if urgency_words:
            indicators.append(f"urgency_words: {urgency_words}")
        
        time_pressure = re.findall(r'\b(limited time|expires|deadline|last chance)\b', text, re.IGNORECASE)
        if time_pressure:
            indicators.append(f"time_pressure: {time_pressure}")
        
        return indicators
    
    async def _extract_hijacking_indicators(self, text: str) -> List[str]:
        """Extract emotional hijacking indicators"""
        indicators = []
        
        extreme_words = re.findall(r'\b(amazing|incredible|shocking|devastating|guaranteed)\b', text, re.IGNORECASE)
        if extreme_words:
            indicators.append(f"extreme_language: {extreme_words}")
        
        fear_greed = re.findall(r'\b(miss out|regret|rich|wealthy|lose money)\b', text, re.IGNORECASE)
        if fear_greed:
            indicators.append(f"fear_greed_triggers: {fear_greed}")
        
        return indicators
    
    async def _extract_coordination_indicators(self, text: str, enhanced_input: Dict) -> List[str]:
        """Extract coordination indicators"""
        indicators = []
        
        # Timing coordination
        if enhanced_input.get('temporal_features', {}).get('is_coordinated_timing', False):
            indicators.append("coordinated_timing_detected")
        
        # Message similarity
        if enhanced_input.get('message_similarity_score', 0) > 0.8:
            indicators.append("high_message_similarity")
        
        return indicators
    
    async def _identify_target_audience(self, text: str) -> List[str]:
        """Identify the target audience of manipulation"""
        audiences = []
        
        # Inexperienced investors
        if any(word in text for word in ['beginner', 'new', 'first time', 'learn']):
            audiences.append("inexperienced_investors")
        
        # Emotional traders
        if any(word in text for word in ['excited', 'worried', 'scared', 'anxious']):
            audiences.append("emotional_traders")
        
        # FOMO susceptible
        if any(word in text for word in ['missing', 'late', 'opportunity', 'limited']):
            audiences.append("fomo_susceptible")
        
        # Authority followers
        if any(word in text for word in ['expert', 'professional', 'recommended']):
            audiences.append("authority_followers")
        
        return audiences if audiences else ["general_public"]
    
    async def _infer_intended_outcome(self, tactic_type: str) -> str:
        """Infer the intended outcome of manipulation"""
        outcomes = {
            'fear_mongering': 'create_panic_selling',
            'fomo_creation': 'prompt_impulsive_buying',
            'false_urgency': 'bypass_due_diligence',
            'emotional_hijacking': 'override_rational_thinking',
            'misleading_statistics': 'create_false_confidence',
            'appeal_to_authority': 'gain_unquestioned_credibility',
            'social_proof': 'create_bandwagon_effect',
            'astroturfing': 'simulate_organic_support',
            'coordinated_campaigns': 'amplify_message_artificially'
        }
        
        return outcomes.get(tactic_type, 'influence_behavior')
    
    async def _assess_potential_impact(self, tactic_type: str, confidence: float) -> float:
        """Assess potential impact of manipulation"""
        impact_multipliers = {
            'pump_and_dump': 0.9,
            'emotional_hijacking': 0.8,
            'false_urgency': 0.7,
            'coordinated_campaigns': 0.8,
            'misleading_statistics': 0.6,
            'social_proof': 0.6,
            'appeal_to_authority': 0.5
        }
        
        base_impact = impact_multipliers.get(tactic_type, 0.5)
        return min(base_impact * confidence, 1.0)
    
    async def _deduplicate_and_rank(self, tactics: List[ManipulationTactic]) -> List[ManipulationTactic]:
        """Remove duplicates and rank by confidence"""
        # Group by tactic type
        grouped = defaultdict(list)
        for tactic in tactics:
            grouped[tactic.tactic_type].append(tactic)
        
        # Keep highest confidence for each type
        deduplicated = []
        for tactic_type, tactic_list in grouped.items():
            best_tactic = max(tactic_list, key=lambda x: x.confidence)
            deduplicated.append(best_tactic)
        
        # Sort by confidence
        return sorted(deduplicated, key=lambda x: x.confidence, reverse=True)
    
    async def _store_for_learning(self, tactics: List[ManipulationTactic], enhanced_input: Dict):
        """Store detection results for learning and improvement"""
        # This would store to your learning database
        pass
    
    def _load_manipulation_patterns(self) -> Dict[str, List[Dict]]:
        """Load manipulation detection patterns"""
        return {
            'fear_mongering': [
                {
                    'pattern': r'\b(crash|dump|dead|scam|rug pull|going to zero)\b',
                    'weight': 0.3,
                    'indicators': ['catastrophic_language', 'fear_words']
                },
                {
                    'pattern': r'\b(everyone will lose|total collapse|disaster)\b',
                    'weight': 0.4,
                    'indicators': ['apocalyptic_predictions']
                }
            ],
            'fomo_creation': [
                {
                    'pattern': r'\b(last chance|final opportunity|limited time|act now)\b',
                    'weight': 0.3,
                    'indicators': ['urgency_language', 'scarcity_claims']
                },
                {
                    'pattern': r'\b(moon|100x|easy money|get rich)\b',
                    'weight': 0.4,
                    'indicators': ['unrealistic_promises']
                }
            ],
            'pump_and_dump': [
                {
                    'pattern': r'\b(buy now|pump|rocket|moon|lambo)\b',
                    'weight': 0.3,
                    'indicators': ['pump_language']
                },
                {
                    'pattern': r'\b(coordinated|together|all buy|group effort)\b',
                    'weight': 0.5,
                    'indicators': ['coordination_language']
                }
            ]
        }
    
    def _load_linguistic_indicators(self) -> Dict:
        """Load linguistic manipulation indicators"""
        return {
            'urgency_markers': [
                'now', 'urgent', 'immediate', 'asap', 'hurry', 'quick', 'fast',
                'limited time', 'expires', 'deadline', 'last chance'
            ],
            'emotional_intensifiers': [
                'amazing', 'incredible', 'unbelievable', 'shocking', 'devastating',
                'guaranteed', 'certain', 'sure thing', 'never fail'
            ],
            'authority_claims': [
                'expert', 'professional', 'certified', 'licensed', 'trusted',
                'recommended by', 'endorsed by', 'used by professionals'
            ]
        }
    
    def _load_behavioral_signatures(self) -> Dict:
        """Load behavioral manipulation signatures"""
        return {
            'account_patterns': {
                'new_account_authority_claims': 0.7,
                'low_follower_expert_claims': 0.6,
                'unverified_authority_claims': 0.8
            },
            'posting_patterns': {
                'coordinated_timing': 0.8,
                'identical_messages': 0.9,
                'rapid_amplification': 0.7
            }
        }
    
    def _load_coordination_patterns(self) -> Dict:
        """Load coordination detection patterns"""
        return {
            'timing_patterns': {
                'simultaneous_posting': 0.9,
                'coordinated_waves': 0.8,
                'synchronized_amplification': 0.7
            },
            'content_patterns': {
                'identical_messages': 0.9,
                'template_variations': 0.7,
                'keyword_coordination': 0.6
            }
        }
    
    def _get_default_config(self) -> Dict:
        """Get default configuration"""
        return {
            'sophistication_threshold': 0.5,
            'evidence_threshold': 0.6,
            'coordination_threshold': 0.7,
            'impact_threshold': 0.6
        }


class CampaignTracker:
    """Track coordinated manipulation campaigns"""
    
    def __init__(self):
        self.active_campaigns = {}
        self.message_hashes = defaultdict(list)
        self.timing_patterns = defaultdict(list)
    
    async def assess_coordination(self, text: str, social_features: Dict, enhanced_input: Dict) -> float:
        """Assess coordination likelihood"""
        coordination_score = 0.0
        
        # Message similarity tracking
        message_hash = self._hash_message(text)
        self.message_hashes[message_hash].append(datetime.utcnow())
        
        # Check for similar messages in time window
        recent_similar = sum(1 for timestamp in self.message_hashes[message_hash] 
                           if (datetime.utcnow() - timestamp).total_seconds() < 3600)
        
        if recent_similar > 3:
            coordination_score += 0.4
        
        # Timing pattern analysis
        current_hour = datetime.utcnow().hour
        self.timing_patterns[current_hour].append(text)
        
        # Check for unusual activity in time slot
        if len(self.timing_patterns[current_hour]) > 10:
            coordination_score += 0.3
        
        # Account creation pattern (would check if multiple new accounts)
        if social_features.get('account_age', 365) < 30:  # New account
            coordination_score += 0.2
        
        return min(coordination_score, 1.0)
    
    def _hash_message(self, text: str) -> str:
        """Create hash for message similarity detection"""
        # Normalize text for comparison
        normalized = re.sub(r'[^\w\s]', '', text.lower())
        normalized = ' '.join(normalized.split())  # Normalize whitespace
        return hashlib.md5(normalized.encode()).hexdigest()


class InfluenceMapper:
    """Map influence networks and relationships"""
    
    def __init__(self):
        self.influence_graph = {}
        self.authority_claims = defaultdict(list)
    
    async def map_influence(self, text: str, social_features: Dict) -> Dict:
        """Map influence patterns"""
        influence_data = {
            'network_position': self._assess_network_position(social_features),
            'authority_claims': self._extract_authority_claims(text),
            'influence_tactics': self._identify_influence_tactics(text)
        }
        
        return influence_data
    
    def _assess_network_position(self, social_features: Dict) -> str:
        """Assess position in influence network"""
        followers = social_features.get('follower_count', 0)
        
        if followers > 100000:
            return 'macro_influencer'
        elif followers > 10000:
            return 'micro_influencer'
        elif followers > 1000:
            return 'nano_influencer'
        else:
            return 'regular_user'
    
    def _extract_authority_claims(self, text: str) -> List[str]:
        """Extract authority claims from text"""
        claims = []
        
        authority_patterns = [
            r'i am a (\w+)',
            r'as a (\w+)',
            r'with my (\d+) years',
            r'i work for (\w+)'
        ]
        
        for pattern in authority_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            claims.extend(matches)
        
        return claims
    
    def _identify_influence_tactics(self, text: str) -> List[str]:
        """Identify influence tactics used"""
        tactics = []
        
        if re.search(r'\btrust me\b', text, re.IGNORECASE):
            tactics.append('trust_appeal')
        
        if re.search(r'\beveryone is\b', text, re.IGNORECASE):
            tactics.append('bandwagon')
        
        if re.search(r'\bexpert\b', text, re.IGNORECASE):
            tactics.append('authority')
        
        return tactics


class SophisticationAssessor:
    """Assess sophistication level of manipulation tactics"""
    
    async def assess(self, tactic: ManipulationTactic, enhanced_input: Dict) -> float:
        """Assess sophistication level"""
        sophistication = 0.5  # Base level
        
        # Language sophistication
        linguistic_features = enhanced_input.get('linguistic_features', {})
        avg_sentence_length = linguistic_features.get('avg_sentence_length', 10)
        
        if avg_sentence_length > 20:
            sophistication += 0.1
        
        # Evidence strength impact
        if tactic.evidence_strength > 0.8:
            sophistication += 0.2
        
        # Multiple indicators
        if len(tactic.manipulation_indicators) > 3:
            sophistication += 0.1
        
        # Coordination sophistication
        if tactic.tactic_type in [ManipulationTacticType.ASTROTURFING, ManipulationTacticType.COORDINATED_CAMPAIGNS]:
            sophistication += 0.2
        
        return min(sophistication, 1.0)
