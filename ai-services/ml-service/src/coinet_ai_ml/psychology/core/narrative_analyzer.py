"""
📖 NARRATIVE ANALYZER - DIVINE STORY WARFARE DETECTION
=====================================================

Revolutionary narrative analysis engine that decodes story patterns,
narrative warfare tactics, and information manipulation through
storytelling in cryptocurrency markets.

BREAKTHROUGH CAPABILITIES:
- Narrative pattern recognition
- Story arc analysis
- Memetic warfare detection
- Frame manipulation identification
- Competing narrative tracking
- Viral story prediction
- Counter-narrative generation
- Reality construction analysis

"Those who tell the stories rule society." - Plato
We decode the stories that move billions in crypto markets.
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
from dataclasses import dataclass

from ..models.psychological_patterns import NarrativePattern

logger = logging.getLogger(__name__)

@dataclass
class StoryElement:
    """Elements of a narrative structure"""
    element_type: str  # hero, villain, conflict, resolution, etc.
    content: str
    emotional_charge: float
    credibility: float
    virality_score: float

@dataclass
class NarrativeFrame:
    """How a story is framed"""
    frame_type: str  # victim, hero, underdog, revolution, etc.
    perspective: str
    emotional_appeal: str
    target_audience: List[str]
    persuasion_tactics: List[str]

@dataclass
class CompetingNarrative:
    """Competing narrative in the ecosystem"""
    narrative_id: str
    theme: str
    strength: float
    momentum: float
    supporters: int
    counter_narrative_to: Optional[str]

class NarrativeAnalyzer:
    """
    📖 DIVINE NARRATIVE ANALYZER
    
    This analyzer uses advanced story analysis, memetic theory,
    and narrative psychology to decode the stories that drive
    crypto market movements and investor behavior.
    
    DIVINE CAPABILITIES:
    - Story structure analysis
    - Narrative warfare detection
    - Memetic propagation prediction
    - Frame manipulation identification
    - Counter-narrative generation
    - Reality construction decoding
    """
    
    def __init__(self, config: Optional[Dict] = None):
        """Initialize the narrative analyzer"""
        self.config = config or self._get_default_config()
        
        # Narrative analysis systems
        self.story_decoder = StoryDecoder()
        self.frame_analyzer = FrameAnalyzer()
        self.memetic_analyzer = MemeticWarfareAnalyzer()
        self.narrative_tracker = NarrativeTracker()
        self.virality_predictor = ViralityPredictor()
        self.counter_narrative_generator = CounterNarrativeGenerator()
        
        # Pattern databases
        self.narrative_archetypes = self._load_narrative_archetypes()
        self.frame_patterns = self._load_frame_patterns()
        self.memetic_patterns = self._load_memetic_patterns()
        
        # Tracking systems
        self.narrative_history = defaultdict(list)
        self.competing_narratives = {}
        self.narrative_evolution = []
        
        logger.info("📖 NarrativeAnalyzer initialized with divine story detection")
    
    async def analyze(self, enhanced_input: Dict) -> List[NarrativePattern]:
        """
        🎯 MASTER NARRATIVE ANALYSIS
        
        Performs comprehensive narrative analysis to decode the stories
        and frames that influence crypto market psychology.
        """
        try:
            text = enhanced_input['processed_text']
            original_text = enhanced_input['original_text']
            contextual_signals = enhanced_input.get('contextual_signals', {})
            
            narrative_patterns = []
            
            # 1. Decode story structure
            story_elements = await self.story_decoder.decode(text, original_text)
            
            # 2. Analyze narrative frames
            frames = await self.frame_analyzer.analyze(text, story_elements)
            
            # 3. Detect narrative warfare
            warfare_patterns = await self.memetic_analyzer.detect_warfare(
                text, frames, contextual_signals
            )
            
            # 4. Track competing narratives
            competing = await self.narrative_tracker.track_narratives(
                text, story_elements, enhanced_input
            )
            
            # 5. Predict virality
            for story in story_elements:
                virality = await self.virality_predictor.predict(
                    story, frames, contextual_signals
                )
                
                if virality['potential'] > self.config['virality_threshold']:
                    pattern = NarrativePattern(
                        narrative_theme=story.element_type,
                        narrative_strength=await self._calculate_narrative_strength(
                            story, frames, competing
                        ),
                        emotional_resonance=await self._calculate_emotional_resonance(
                            story, frames
                        ),
                        story_elements=await self._extract_story_elements(story_elements),
                        framing_techniques=[frame.frame_type for frame in frames],
                        virality_potential=virality['potential'],
                        memetic_strength=virality['memetic_strength']
                    )
                    narrative_patterns.append(pattern)
            
            # 6. Detect meta-narratives
            meta_narratives = await self._detect_meta_narratives(
                narrative_patterns, competing
            )
            narrative_patterns.extend(meta_narratives)
            
            # 7. Generate counter-narratives
            for pattern in narrative_patterns:
                if pattern.narrative_strength > 0.7:
                    counter = await self.counter_narrative_generator.generate(pattern)
                    # Store counter-narratives for reference
                    self.narrative_history['counter_narratives'].append(counter)
            
            # 8. Assess reality construction
            reality_construction = await self._assess_reality_construction(
                narrative_patterns, frames
            )
            
            # 9. Filter and rank narratives
            final_narratives = await self._filter_and_rank_narratives(narrative_patterns)
            
            # Store for learning
            await self._store_narrative_analysis(final_narratives, enhanced_input)
            
            logger.info(f"📖 Narrative analysis completed: {len(final_narratives)} narratives detected")
            
            return final_narratives
            
        except Exception as e:
            logger.error(f"❌ Narrative analysis failed: {str(e)}")
            return []
    
    async def _calculate_narrative_strength(self, story: StoryElement, 
                                          frames: List[NarrativeFrame],
                                          competing: List[CompetingNarrative]) -> float:
        """Calculate the strength of a narrative"""
        strength_factors = []
        
        # Story credibility
        strength_factors.append(story.credibility)
        
        # Emotional charge
        strength_factors.append(min(story.emotional_charge * 1.5, 1.0))
        
        # Frame effectiveness
        if frames:
            avg_frame_effectiveness = np.mean([
                await self._assess_frame_effectiveness(frame) for frame in frames
            ])
            strength_factors.append(avg_frame_effectiveness)
        
        # Competition factor
        if competing:
            # Stronger if few competing narratives
            competition_factor = 1.0 - (len(competing) / 10.0)
            strength_factors.append(max(competition_factor, 0.3))
        
        return np.mean(strength_factors) if strength_factors else 0.5
    
    async def _calculate_emotional_resonance(self, story: StoryElement,
                                           frames: List[NarrativeFrame]) -> float:
        """Calculate emotional resonance of narrative"""
        resonance = story.emotional_charge
        
        # Amplify based on frame emotional appeals
        for frame in frames:
            if frame.emotional_appeal in ['fear', 'greed', 'hope', 'anger']:
                resonance *= 1.2
        
        return min(resonance, 1.0)
    
    async def _extract_story_elements(self, elements: List[StoryElement]) -> Dict[str, str]:
        """Extract story elements into structured format"""
        story_dict = {}
        
        for element in elements:
            if element.element_type == 'hero':
                story_dict['hero'] = element.content
            elif element.element_type == 'villain':
                story_dict['villain'] = element.content
            elif element.element_type == 'conflict':
                story_dict['conflict'] = element.content
            elif element.element_type == 'resolution':
                story_dict['resolution'] = element.content
        
        return story_dict
    
    async def _detect_meta_narratives(self, patterns: List[NarrativePattern],
                                     competing: List[CompetingNarrative]) -> List[NarrativePattern]:
        """Detect overarching meta-narratives"""
        meta_narratives = []
        
        # Look for common themes across narratives
        themes = [p.narrative_theme for p in patterns]
        theme_counter = Counter(themes)
        
        for theme, count in theme_counter.items():
            if count > 2:  # Multiple narratives with same theme
                meta_pattern = NarrativePattern(
                    narrative_theme=f"meta_{theme}",
                    narrative_strength=0.8,
                    emotional_resonance=0.7,
                    story_elements={'meta_theme': theme, 'instance_count': str(count)},
                    framing_techniques=['meta_framing'],
                    virality_potential=0.6,
                    memetic_strength=0.7
                )
                meta_narratives.append(meta_pattern)
        
        return meta_narratives
    
    async def _assess_reality_construction(self, patterns: List[NarrativePattern],
                                         frames: List[NarrativeFrame]) -> Dict:
        """Assess how narratives construct reality"""
        reality_construction = {
            'construction_strength': 0.0,
            'dominant_reality': '',
            'alternative_realities': [],
            'consensus_level': 0.0
        }
        
        if not patterns:
            return reality_construction
        
        # Find dominant narrative
        dominant = max(patterns, key=lambda p: p.narrative_strength)
        reality_construction['dominant_reality'] = dominant.narrative_theme
        reality_construction['construction_strength'] = dominant.narrative_strength
        
        # Find alternative realities
        alternatives = [p.narrative_theme for p in patterns 
                       if p.narrative_theme != dominant.narrative_theme]
        reality_construction['alternative_realities'] = alternatives
        
        # Assess consensus
        if len(patterns) == 1:
            reality_construction['consensus_level'] = 0.9
        else:
            strength_variance = np.var([p.narrative_strength for p in patterns])
            reality_construction['consensus_level'] = max(1.0 - strength_variance, 0.0)
        
        return reality_construction
    
    async def _assess_frame_effectiveness(self, frame: NarrativeFrame) -> float:
        """Assess effectiveness of a narrative frame"""
        effectiveness = 0.5
        
        # Emotional frames are more effective
        if frame.emotional_appeal in ['fear', 'hope', 'anger']:
            effectiveness += 0.2
        
        # Victim/underdog frames resonate
        if frame.frame_type in ['victim', 'underdog', 'david_vs_goliath']:
            effectiveness += 0.15
        
        # Revolutionary frames in crypto
        if frame.frame_type in ['revolution', 'disruption', 'new_paradigm']:
            effectiveness += 0.2
        
        return min(effectiveness, 1.0)
    
    async def _filter_and_rank_narratives(self, patterns: List[NarrativePattern]) -> List[NarrativePattern]:
        """Filter and rank narratives by importance"""
        # Filter weak narratives
        filtered = [p for p in patterns if p.narrative_strength >= self.config['strength_threshold']]
        
        # Remove duplicates
        seen_themes = set()
        unique_patterns = []
        for pattern in filtered:
            if pattern.narrative_theme not in seen_themes:
                unique_patterns.append(pattern)
                seen_themes.add(pattern.narrative_theme)
        
        # Sort by combined impact
        def narrative_impact(pattern):
            return (
                pattern.narrative_strength * 0.3 +
                pattern.emotional_resonance * 0.3 +
                pattern.virality_potential * 0.2 +
                pattern.memetic_strength * 0.2
            )
        
        return sorted(unique_patterns, key=narrative_impact, reverse=True)
    
    async def _store_narrative_analysis(self, patterns: List[NarrativePattern], enhanced_input: Dict):
        """Store narrative analysis for learning"""
        analysis_record = {
            'timestamp': datetime.utcnow(),
            'narratives': [(p.narrative_theme, p.narrative_strength) for p in patterns],
            'context': enhanced_input.get('contextual_signals', {})
        }
        
        self.narrative_evolution.append(analysis_record)
        
        # Keep only recent history
        if len(self.narrative_evolution) > 100:
            self.narrative_evolution = self.narrative_evolution[-100:]
    
    def _load_narrative_archetypes(self) -> Dict:
        """Load narrative archetype patterns"""
        return {
            'hero_journey': {
                'elements': ['hero', 'call_to_action', 'challenges', 'transformation', 'return'],
                'emotional_arc': 'rising',
                'examples': ['satoshi_vision', 'early_adopter_success']
            },
            'david_vs_goliath': {
                'elements': ['underdog', 'giant', 'battle', 'unlikely_victory'],
                'emotional_arc': 'tension_release',
                'examples': ['defi_vs_banks', 'retail_vs_institutions']
            },
            'revolution': {
                'elements': ['old_system', 'problems', 'new_solution', 'transformation'],
                'emotional_arc': 'inspirational',
                'examples': ['financial_revolution', 'decentralization']
            },
            'apocalypse': {
                'elements': ['warning_signs', 'catastrophe', 'aftermath', 'rebuilding'],
                'emotional_arc': 'fear_based',
                'examples': ['market_crash', 'regulation_doom']
            },
            'promised_land': {
                'elements': ['current_struggle', 'vision', 'journey', 'arrival'],
                'emotional_arc': 'hopeful',
                'examples': ['mass_adoption', 'financial_freedom']
            }
        }
    
    def _load_frame_patterns(self) -> Dict:
        """Load narrative frame patterns"""
        return {
            'victim': ['attacked', 'targeted', 'persecuted', 'suffering'],
            'hero': ['saving', 'protecting', 'fighting', 'leading'],
            'villain': ['manipulating', 'destroying', 'attacking', 'corrupting'],
            'underdog': ['small', 'overlooked', 'disadvantaged', 'struggling'],
            'revolution': ['changing', 'disrupting', 'overthrowing', 'transforming'],
            'opportunity': ['chance', 'window', 'moment', 'possibility'],
            'threat': ['danger', 'risk', 'warning', 'crisis']
        }
    
    def _load_memetic_patterns(self) -> Dict:
        """Load memetic warfare patterns"""
        return {
            'viral_hooks': ['breaking', 'exclusive', 'leaked', 'shocking'],
            'emotional_triggers': ['outrage', 'fear', 'hope', 'greed'],
            'cognitive_exploits': ['simplification', 'false_dichotomy', 'scapegoating'],
            'propagation_tactics': ['hashtags', 'catchphrases', 'visual_memes']
        }
    
    def _get_default_config(self) -> Dict:
        """Get default configuration"""
        return {
            'virality_threshold': 0.5,
            'strength_threshold': 0.4,
            'memetic_detection': True,
            'counter_narrative_generation': True
        }


class StoryDecoder:
    """Decode story structures and elements"""
    
    async def decode(self, text: str, original_text: str) -> List[StoryElement]:
        """Decode story elements from text"""
        elements = []
        
        # Detect hero elements
        hero = await self._detect_hero(text)
        if hero:
            elements.append(StoryElement(
                element_type='hero',
                content=hero,
                emotional_charge=0.7,
                credibility=0.6,
                virality_score=0.5
            ))
        
        # Detect villain elements
        villain = await self._detect_villain(text)
        if villain:
            elements.append(StoryElement(
                element_type='villain',
                content=villain,
                emotional_charge=0.8,
                credibility=0.5,
                virality_score=0.6
            ))
        
        # Detect conflict
        conflict = await self._detect_conflict(text)
        if conflict:
            elements.append(StoryElement(
                element_type='conflict',
                content=conflict,
                emotional_charge=0.9,
                credibility=0.7,
                virality_score=0.7
            ))
        
        # Detect resolution/vision
        resolution = await self._detect_resolution(text)
        if resolution:
            elements.append(StoryElement(
                element_type='resolution',
                content=resolution,
                emotional_charge=0.6,
                credibility=0.5,
                virality_score=0.4
            ))
        
        return elements
    
    async def _detect_hero(self, text: str) -> Optional[str]:
        """Detect hero in narrative"""
        hero_patterns = [
            r'\b(\w+) (?:is|are) (?:saving|protecting|fighting for|leading)',
            r'\b(\w+) (?:will|can) (?:save|protect|help|lead)',
            r'thanks to (\w+)',
            r'(\w+) is the solution'
        ]
        
        for pattern in hero_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        
        # Check for crypto-specific heroes
        if 'satoshi' in text.lower():
            return 'satoshi'
        if 'defi' in text.lower() and 'liberation' in text.lower():
            return 'defi'
        
        return None
    
    async def _detect_villain(self, text: str) -> Optional[str]:
        """Detect villain in narrative"""
        villain_patterns = [
            r'\b(\w+) (?:is|are) (?:destroying|attacking|manipulating|corrupting)',
            r'(?:stop|fight|resist) (\w+)',
            r'(\w+) (?:wants to|will) (?:control|destroy|manipulate)',
            r'evil (\w+)'
        ]
        
        for pattern in villain_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        
        # Check for crypto-specific villains
        if 'banks' in text.lower() and any(word in text.lower() for word in ['evil', 'corrupt', 'control']):
            return 'traditional_banks'
        if 'government' in text.lower() and 'control' in text.lower():
            return 'government_control'
        
        return None
    
    async def _detect_conflict(self, text: str) -> Optional[str]:
        """Detect conflict in narrative"""
        conflict_patterns = [
            r'(?:battle|fight|war|struggle) (?:between|against|for) (.*?)(?:\.|,|!)',
            r'(\w+) vs\.? (\w+)',
            r'(?:conflict|tension|problem) (?:is|with) (.*?)(?:\.|,|!)'
        ]
        
        for pattern in conflict_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(0)
        
        # Check for implied conflicts
        if 'centralized' in text.lower() and 'decentralized' in text.lower():
            return 'centralization_vs_decentralization'
        
        return None
    
    async def _detect_resolution(self, text: str) -> Optional[str]:
        """Detect resolution or vision in narrative"""
        resolution_patterns = [
            r'(?:solution is|answer is|future is) (.*?)(?:\.|!)',
            r'(?:will lead to|results in|creates) (.*?)(?:\.|!)',
            r'(?:vision|goal|objective) (?:is|of) (.*?)(?:\.|!)'
        ]
        
        for pattern in resolution_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        
        # Check for crypto-specific resolutions
        if 'mass adoption' in text.lower():
            return 'mass_adoption'
        if 'financial freedom' in text.lower():
            return 'financial_freedom'
        
        return None


class FrameAnalyzer:
    """Analyze narrative framing techniques"""
    
    async def analyze(self, text: str, story_elements: List[StoryElement]) -> List[NarrativeFrame]:
        """Analyze narrative frames"""
        frames = []
        
        # Detect victim frame
        if await self._detect_victim_frame(text):
            frames.append(NarrativeFrame(
                frame_type='victim',
                perspective='persecuted',
                emotional_appeal='sympathy',
                target_audience=['supporters', 'undecided'],
                persuasion_tactics=['emotional_appeal', 'injustice_highlighting']
            ))
        
        # Detect hero frame
        if await self._detect_hero_frame(text, story_elements):
            frames.append(NarrativeFrame(
                frame_type='hero',
                perspective='savior',
                emotional_appeal='admiration',
                target_audience=['followers', 'believers'],
                persuasion_tactics=['inspiration', 'leadership_appeal']
            ))
        
        # Detect revolution frame
        if await self._detect_revolution_frame(text):
            frames.append(NarrativeFrame(
                frame_type='revolution',
                perspective='change_agent',
                emotional_appeal='excitement',
                target_audience=['innovators', 'risk_takers'],
                persuasion_tactics=['future_vision', 'disruption_narrative']
            ))
        
        # Detect threat frame
        if await self._detect_threat_frame(text):
            frames.append(NarrativeFrame(
                frame_type='threat',
                perspective='warner',
                emotional_appeal='fear',
                target_audience=['risk_averse', 'cautious'],
                persuasion_tactics=['fear_appeal', 'urgency_creation']
            ))
        
        return frames
    
    async def _detect_victim_frame(self, text: str) -> bool:
        """Detect victim framing"""
        victim_indicators = [
            'attacked', 'targeted', 'persecuted', 'unfair',
            'discriminated', 'oppressed', 'suffering', 'victim'
        ]
        
        return sum(1 for word in victim_indicators if word in text.lower()) >= 2
    
    async def _detect_hero_frame(self, text: str, story_elements: List[StoryElement]) -> bool:
        """Detect hero framing"""
        hero_indicators = [
            'saving', 'protecting', 'fighting for', 'leading',
            'champion', 'defender', 'pioneer', 'visionary'
        ]
        
        has_hero_language = sum(1 for word in hero_indicators if word in text.lower()) >= 2
        has_hero_element = any(e.element_type == 'hero' for e in story_elements)
        
        return has_hero_language or has_hero_element
    
    async def _detect_revolution_frame(self, text: str) -> bool:
        """Detect revolution framing"""
        revolution_indicators = [
            'revolution', 'disruption', 'paradigm shift', 'new era',
            'transformation', 'overthrow', 'radical change', 'breakthrough'
        ]
        
        return any(phrase in text.lower() for phrase in revolution_indicators)
    
    async def _detect_threat_frame(self, text: str) -> bool:
        """Detect threat framing"""
        threat_indicators = [
            'danger', 'threat', 'risk', 'warning',
            'crisis', 'catastrophe', 'disaster', 'collapse'
        ]
        
        return sum(1 for word in threat_indicators if word in text.lower()) >= 2


class MemeticWarfareAnalyzer:
    """Analyze memetic warfare and information operations"""
    
    async def detect_warfare(self, text: str, frames: List[NarrativeFrame], 
                            contextual_signals: Dict) -> List[Dict]:
        """Detect memetic warfare patterns"""
        warfare_patterns = []
        
        # Check for emotional exploitation
        emotional_exploitation = await self._detect_emotional_exploitation(text)
        if emotional_exploitation['score'] > 0.5:
            warfare_patterns.append({
                'type': 'emotional_exploitation',
                'severity': emotional_exploitation['score'],
                'tactics': emotional_exploitation['tactics']
            })
        
        # Check for reality hacking
        reality_hacking = await self._detect_reality_hacking(text, frames)
        if reality_hacking['score'] > 0.5:
            warfare_patterns.append({
                'type': 'reality_hacking',
                'severity': reality_hacking['score'],
                'tactics': reality_hacking['tactics']
            })
        
        # Check for cognitive infiltration
        cognitive_infiltration = await self._detect_cognitive_infiltration(text)
        if cognitive_infiltration['score'] > 0.5:
            warfare_patterns.append({
                'type': 'cognitive_infiltration',
                'severity': cognitive_infiltration['score'],
                'tactics': cognitive_infiltration['tactics']
            })
        
        return warfare_patterns
    
    async def _detect_emotional_exploitation(self, text: str) -> Dict:
        """Detect emotional exploitation tactics"""
        exploitation = {
            'score': 0.0,
            'tactics': []
        }
        
        # Fear exploitation
        fear_words = ['catastrophe', 'disaster', 'collapse', 'death', 'destruction']
        fear_count = sum(1 for word in fear_words if word in text.lower())
        if fear_count > 2:
            exploitation['score'] += 0.3
            exploitation['tactics'].append('fear_exploitation')
        
        # Greed exploitation
        greed_words = ['rich', 'millionaire', 'lambo', '100x', '1000x', 'moon']
        greed_count = sum(1 for word in greed_words if word in text.lower())
        if greed_count > 2:
            exploitation['score'] += 0.3
            exploitation['tactics'].append('greed_exploitation')
        
        # Outrage exploitation
        outrage_words = ['scandal', 'shocking', 'outrageous', 'unbelievable', 'corrupt']
        outrage_count = sum(1 for word in outrage_words if word in text.lower())
        if outrage_count > 1:
            exploitation['score'] += 0.2
            exploitation['tactics'].append('outrage_exploitation')
        
        return exploitation
    
    async def _detect_reality_hacking(self, text: str, frames: List[NarrativeFrame]) -> Dict:
        """Detect reality hacking attempts"""
        hacking = {
            'score': 0.0,
            'tactics': []
        }
        
        # False dichotomy
        if re.search(r'\b(either|only two|must choose)\b.*\b(or)\b', text, re.IGNORECASE):
            hacking['score'] += 0.3
            hacking['tactics'].append('false_dichotomy')
        
        # Manufactured consensus
        consensus_phrases = ['everyone knows', 'obviously', 'undeniable', 'proven fact']
        if any(phrase in text.lower() for phrase in consensus_phrases):
            hacking['score'] += 0.3
            hacking['tactics'].append('manufactured_consensus')
        
        # Reality distortion through framing
        if len(frames) > 2:  # Multiple frames = reality manipulation
            hacking['score'] += 0.2
            hacking['tactics'].append('multi_frame_distortion')
        
        return hacking
    
    async def _detect_cognitive_infiltration(self, text: str) -> Dict:
        """Detect cognitive infiltration tactics"""
        infiltration = {
            'score': 0.0,
            'tactics': []
        }
        
        # Thought-terminating clichés
        cliches = ['diamond hands', 'paper hands', 'hodl', 'fud', 'to the moon']
        cliche_count = sum(1 for cliche in cliches if cliche in text.lower())
        if cliche_count > 2:
            infiltration['score'] += 0.3
            infiltration['tactics'].append('thought_terminating_cliches')
        
        # Semantic infiltration
        redefinitions = ['real', 'true', 'actual', 'genuine']
        if any(f"the {word}" in text.lower() for word in redefinitions):
            infiltration['score'] += 0.2
            infiltration['tactics'].append('semantic_infiltration')
        
        # Cognitive overload
        if len(text.split()) > 500:  # Long, complex narratives
            infiltration['score'] += 0.2
            infiltration['tactics'].append('cognitive_overload')
        
        return infiltration


class NarrativeTracker:
    """Track competing narratives in the ecosystem"""
    
    def __init__(self):
        self.active_narratives = {}
        self.narrative_genealogy = defaultdict(list)
    
    async def track_narratives(self, text: str, story_elements: List[StoryElement], 
                              enhanced_input: Dict) -> List[CompetingNarrative]:
        """Track competing narratives"""
        competing = []
        
        # Generate narrative ID
        narrative_id = self._generate_narrative_id(text)
        
        # Identify narrative theme
        theme = await self._identify_theme(text, story_elements)
        
        # Check for counter-narratives
        counter_to = await self._identify_counter_narrative(text)
        
        # Calculate narrative metrics
        narrative = CompetingNarrative(
            narrative_id=narrative_id,
            theme=theme,
            strength=await self._calculate_strength(text, enhanced_input),
            momentum=await self._calculate_momentum(theme),
            supporters=await self._estimate_supporters(enhanced_input),
            counter_narrative_to=counter_to
        )
        
        # Update tracking
        self.active_narratives[narrative_id] = narrative
        if counter_to:
            self.narrative_genealogy[counter_to].append(narrative_id)
        
        # Find competing narratives
        for existing_id, existing in self.active_narratives.items():
            if existing_id != narrative_id and existing.theme == theme:
                competing.append(existing)
        
        return competing
    
    def _generate_narrative_id(self, text: str) -> str:
        """Generate unique narrative ID"""
        return hashlib.md5(text.encode()).hexdigest()[:8]
    
    async def _identify_theme(self, text: str, story_elements: List[StoryElement]) -> str:
        """Identify narrative theme"""
        # Check for common crypto themes
        themes = {
            'decentralization': ['decentralized', 'distributed', 'peer-to-peer'],
            'financial_freedom': ['freedom', 'liberation', 'independence'],
            'innovation': ['innovation', 'technology', 'breakthrough'],
            'adoption': ['adoption', 'mainstream', 'acceptance'],
            'regulation': ['regulation', 'government', 'compliance'],
            'scam': ['scam', 'fraud', 'ponzi', 'rugpull']
        }
        
        for theme, keywords in themes.items():
            if any(keyword in text.lower() for keyword in keywords):
                return theme
        
        # Default to first story element type
        if story_elements:
            return story_elements[0].element_type
        
        return 'unknown'
    
    async def _identify_counter_narrative(self, text: str) -> Optional[str]:
        """Identify if this counters another narrative"""
        counter_phrases = [
            'contrary to', 'despite what', 'not true that',
            'myth that', 'false narrative', 'real story'
        ]
        
        for phrase in counter_phrases:
            if phrase in text.lower():
                # Generate ID of potential target narrative
                return 'counter_narrative_detected'
        
        return None
    
    async def _calculate_strength(self, text: str, enhanced_input: Dict) -> float:
        """Calculate narrative strength"""
        strength = 0.5
        
        # Length and detail add strength
        word_count = len(text.split())
        if word_count > 100:
            strength += 0.1
        if word_count > 300:
            strength += 0.1
        
        # Social signals add strength
        social_features = enhanced_input.get('social_features', {})
        if social_features.get('engagement_rate', 0) > 0.05:
            strength += 0.2
        
        return min(strength, 1.0)
    
    async def _calculate_momentum(self, theme: str) -> float:
        """Calculate narrative momentum"""
        # Check if theme is trending
        trending_themes = ['defi', 'nft', 'metaverse', 'ai']
        if any(trend in theme.lower() for trend in trending_themes):
            return 0.7
        
        return 0.4
    
    async def _estimate_supporters(self, enhanced_input: Dict) -> int:
        """Estimate number of supporters"""
        social_features = enhanced_input.get('social_features', {})
        base_supporters = social_features.get('follower_count', 100)
        engagement = social_features.get('engagement_rate', 0.01)
        
        return int(base_supporters * engagement * 10)  # Rough estimate


class ViralityPredictor:
    """Predict viral potential of narratives"""
    
    async def predict(self, story: StoryElement, frames: List[NarrativeFrame], 
                     contextual_signals: Dict) -> Dict:
        """Predict virality potential"""
        virality = {
            'potential': 0.0,
            'memetic_strength': 0.0,
            'propagation_speed': 0.0
        }
        
        # Emotional charge drives virality
        virality['potential'] += story.emotional_charge * 0.4
        
        # Simplicity increases virality
        if len(story.content.split()) < 20:  # Simple story
            virality['potential'] += 0.2
        
        # Controversial frames increase virality
        controversial_frames = ['revolution', 'threat', 'victim']
        if any(frame.frame_type in controversial_frames for frame in frames):
            virality['potential'] += 0.2
        
        # Market conditions affect virality
        if contextual_signals.get('market_volatility', 0) > 0.7:
            virality['potential'] += 0.1
        
        # Calculate memetic strength
        virality['memetic_strength'] = await self._calculate_memetic_strength(story, frames)
        
        # Calculate propagation speed
        virality['propagation_speed'] = virality['potential'] * virality['memetic_strength']
        
        # Cap at 1.0
        virality['potential'] = min(virality['potential'], 1.0)
        virality['memetic_strength'] = min(virality['memetic_strength'], 1.0)
        
        return virality
    
    async def _calculate_memetic_strength(self, story: StoryElement, frames: List[NarrativeFrame]) -> float:
        """Calculate memetic strength"""
        strength = 0.3
        
        # Memorable elements
        if story.element_type in ['hero', 'villain']:
            strength += 0.2
        
        # Strong frames
        if frames and frames[0].emotional_appeal in ['fear', 'hope', 'anger']:
            strength += 0.3
        
        # High credibility
        if story.credibility > 0.7:
            strength += 0.2
        
        return min(strength, 1.0)


class CounterNarrativeGenerator:
    """Generate counter-narratives to combat manipulation"""
    
    async def generate(self, pattern: NarrativePattern) -> Dict:
        """Generate counter-narrative"""
        counter = {
            'theme': f"counter_{pattern.narrative_theme}",
            'key_points': [],
            'framing': [],
            'evidence_needed': []
        }
        
        # Generate key counter-points
        if pattern.narrative_theme == 'revolution':
            counter['key_points'] = [
                'Evolution not revolution',
                'Building on existing systems',
                'Gradual improvement'
            ]
        elif pattern.narrative_theme == 'threat':
            counter['key_points'] = [
                'Opportunity not threat',
                'Manageable challenges',
                'Historical perspective'
            ]
        elif 'hero' in pattern.story_elements:
            counter['key_points'] = [
                'No single savior',
                'Community effort',
                'Distributed responsibility'
            ]
        
        # Suggest counter-framing
        if 'victim' in pattern.framing_techniques:
            counter['framing'].append('empowerment_frame')
        if 'revolution' in pattern.framing_techniques:
            counter['framing'].append('evolution_frame')
        
        # Identify evidence needed
        counter['evidence_needed'] = [
            'Historical data',
            'Expert opinions',
            'Factual corrections'
        ]
        
        return counter
