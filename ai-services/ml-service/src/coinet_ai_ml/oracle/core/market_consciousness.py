"""
🌌 MARKET CONSCIOUSNESS READER - THE COLLECTIVE MIND
====================================================

Revolutionary system that reads the collective consciousness of cryptocurrency
markets, understanding the mass psychology, emotional states, and hidden
dynamics that drive market movements.

DIVINE CAPABILITIES:
- Collective emotion detection
- Market phase identification
- Herd mentality measurement
- Bubble/crash probability calculation
- Irrationality index tracking
- Hidden opportunity detection

"The market is never wrong, but opinions often are." - Jesse Livermore

We don't just read opinions - we read the market's collective soul.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import numpy as np
from enum import Enum

from ..models.oracle_models import (
    MarketConsciousness,
    MarketPhase
)

logger = logging.getLogger(__name__)

class MarketConsciousnessReader:
    """
    🌌 THE DIVINE MARKET CONSCIOUSNESS READER
    
    This reader possesses the supernatural ability to tap into the collective
    consciousness of all market participants, understanding:
    - The dominant emotions driving the market
    - The phase of the market cycle
    - The level of irrationality and groupthink
    - Hidden opportunities invisible to most
    - System-wide risks building beneath the surface
    """
    
    def __init__(self, config: Optional[Dict] = None):
        """Initialize the consciousness reader"""
        self.config = config or self._get_default_config()
        
        # Historical consciousness states
        self.consciousness_history = []
        self.phase_history = []
        
        # Pattern recognition models (would load actual models)
        self.emotion_detector = None
        self.phase_classifier = None
        self.risk_assessor = None
        
        # Wisdom accumulator
        self.market_wisdom = []
        self.hidden_opportunities = []
        
        logger.info("🌌 MarketConsciousnessReader initialized with divine awareness")
    
    async def read_market_mind(self, 
                               market_data: Optional[Dict] = None,
                               sentiment_data: Optional[Dict] = None) -> MarketConsciousness:
        """
        🧠 READ THE COLLECTIVE MARKET CONSCIOUSNESS
        
        Tap into the market's collective mind to understand its
        emotional state, phase, and hidden dynamics.
        """
        try:
            # Detect dominant emotion
            emotional_state = await self._detect_market_emotion(market_data, sentiment_data)
            
            # Identify market phase
            market_phase = await self._identify_market_phase(market_data, emotional_state)
            
            # Analyze crowd behavior
            crowd_analysis = await self._analyze_crowd_behavior(sentiment_data, market_data)
            
            # Assess system risks
            system_risks = await self._assess_system_risks(
                market_data, emotional_state, crowd_analysis
            )
            
            # Discover hidden opportunities
            opportunities = await self._discover_hidden_opportunities(
                market_phase, crowd_analysis, system_risks
            )
            
            # Extract market wisdom
            wisdom = await self._extract_market_wisdom(
                emotional_state, market_phase, crowd_analysis
            )
            
            # Generate consciousness state
            consciousness = MarketConsciousness(
                # Emotional state
                dominant_emotion=emotional_state['dominant'],
                emotional_intensity=emotional_state['intensity'],
                emotional_stability=emotional_state['stability'],
                emotional_trajectory=emotional_state['trajectory'],
                
                # Market phase
                current_phase=market_phase['current'],
                phase_duration=market_phase['duration'],
                phase_maturity=market_phase['maturity'],
                next_phase=market_phase['next'],
                phase_transition_eta=market_phase['transition_eta'],
                
                # Crowd behavior
                herd_mentality_score=crowd_analysis['herd_mentality'],
                contrarian_opportunity=crowd_analysis['contrarian_opportunity'],
                retail_sentiment=crowd_analysis['retail'],
                institutional_sentiment=crowd_analysis['institutional'],
                smart_money_sentiment=crowd_analysis['smart_money'],
                
                # System risks
                bubble_probability=system_risks['bubble'],
                crash_probability=system_risks['crash'],
                manipulation_level=system_risks['manipulation'],
                irrationality_index=system_risks['irrationality'],
                
                # Wisdom signals
                market_message=wisdom['message'],
                hidden_opportunities=opportunities,
                warning_signs=wisdom['warnings']
            )
            
            # Update history
            self._update_consciousness_history(consciousness)
            
            logger.info(f"🌌 Market consciousness: {consciousness.dominant_emotion} "
                       f"in {consciousness.current_phase.value} phase")
            
            return consciousness
            
        except Exception as e:
            logger.error(f"❌ Consciousness reading failed: {str(e)}")
            return self._generate_fallback_consciousness()
    
    async def _detect_market_emotion(self, 
                                    market_data: Optional[Dict],
                                    sentiment_data: Optional[Dict]) -> Dict:
        """Detect the dominant market emotion"""
        
        emotions = {
            'fear': 0.0,
            'greed': 0.0,
            'hope': 0.0,
            'despair': 0.0,
            'euphoria': 0.0,
            'anxiety': 0.0,
            'complacency': 0.0,
            'panic': 0.0
        }
        
        # Analyze price action for emotional signals
        if market_data:
            price_change = market_data.get('price_change_24h', 0)
            volatility = market_data.get('volatility', 0)
            volume = market_data.get('volume_ratio', 1)  # vs average
            
            # Fear indicators
            if price_change < -0.1 and volatility > 0.5:
                emotions['fear'] += 0.4
                if price_change < -0.2:
                    emotions['panic'] += 0.3
            
            # Greed indicators
            if price_change > 0.1 and volume > 1.5:
                emotions['greed'] += 0.4
                if price_change > 0.2:
                    emotions['euphoria'] += 0.3
            
            # Hope indicators
            if price_change > 0 and price_change < 0.05:
                emotions['hope'] += 0.3
            
            # Despair indicators
            if price_change < -0.15 and volume < 0.5:
                emotions['despair'] += 0.35
            
            # Anxiety indicators
            if volatility > 0.7:
                emotions['anxiety'] += 0.3
            
            # Complacency indicators
            if abs(price_change) < 0.02 and volatility < 0.2:
                emotions['complacency'] += 0.4
        
        # Analyze sentiment for emotional signals
        if sentiment_data:
            fear_greed = sentiment_data.get('fear_greed_index', 50)
            
            if fear_greed < 20:
                emotions['fear'] += 0.5
                emotions['panic'] += 0.2
            elif fear_greed < 40:
                emotions['fear'] += 0.3
                emotions['anxiety'] += 0.2
            elif fear_greed > 80:
                emotions['greed'] += 0.5
                emotions['euphoria'] += 0.2
            elif fear_greed > 60:
                emotions['greed'] += 0.3
                emotions['complacency'] += 0.1
        
        # Determine dominant emotion
        dominant = max(emotions, key=emotions.get)
        intensity = min(emotions[dominant], 1.0)
        
        # Calculate stability (how mixed emotions are)
        emotion_variance = np.var(list(emotions.values()))
        stability = 1.0 - min(emotion_variance * 10, 1.0)
        
        # Determine trajectory
        if self.consciousness_history:
            last_intensity = self.consciousness_history[-1].get('emotional_intensity', 0.5)
            if intensity > last_intensity + 0.1:
                trajectory = 'rising'
            elif intensity < last_intensity - 0.1:
                trajectory = 'falling'
            else:
                trajectory = 'stable'
        else:
            trajectory = 'stable'
        
        return {
            'dominant': dominant,
            'intensity': intensity,
            'stability': stability,
            'trajectory': trajectory,
            'all_emotions': emotions
        }
    
    async def _identify_market_phase(self, 
                                    market_data: Optional[Dict],
                                    emotional_state: Dict) -> Dict:
        """Identify current market cycle phase"""
        
        # Map emotions to typical cycle phases
        emotion_phase_map = {
            'despair': MarketPhase.DEPRESSION,
            'hope': MarketPhase.HOPE,
            'optimism': MarketPhase.OPTIMISM,
            'belief': MarketPhase.BELIEF,
            'thrill': MarketPhase.THRILL,
            'euphoria': MarketPhase.EUPHORIA,
            'complacency': MarketPhase.COMPLACENCY,
            'anxiety': MarketPhase.ANXIETY,
            'denial': MarketPhase.DENIAL,
            'panic': MarketPhase.PANIC,
            'capitulation': MarketPhase.CAPITULATION,
            'anger': MarketPhase.ANGER,
            'depression': MarketPhase.DEPRESSION
        }
        
        # Get phase from dominant emotion
        dominant_emotion = emotional_state['dominant']
        
        # Map fear to panic/capitulation based on intensity
        if dominant_emotion == 'fear':
            if emotional_state['intensity'] > 0.7:
                current_phase = MarketPhase.PANIC
            elif emotional_state['intensity'] > 0.5:
                current_phase = MarketPhase.ANXIETY
            else:
                current_phase = MarketPhase.DENIAL
        elif dominant_emotion == 'greed':
            if emotional_state['intensity'] > 0.7:
                current_phase = MarketPhase.EUPHORIA
            elif emotional_state['intensity'] > 0.5:
                current_phase = MarketPhase.THRILL
            else:
                current_phase = MarketPhase.BELIEF
        else:
            current_phase = emotion_phase_map.get(dominant_emotion, MarketPhase.HOPE)
        
        # Calculate phase duration and maturity
        if self.phase_history and self.phase_history[-1] == current_phase:
            duration = len([p for p in self.phase_history[-30:] if p == current_phase])
        else:
            duration = 1
        
        # Estimate phase maturity (how far through the phase)
        typical_durations = {
            MarketPhase.ACCUMULATION: 60,
            MarketPhase.MARKUP: 90,
            MarketPhase.DISTRIBUTION: 45,
            MarketPhase.MARKDOWN: 30,
            MarketPhase.EUPHORIA: 14,
            MarketPhase.PANIC: 7,
            MarketPhase.DEPRESSION: 30
        }
        
        typical_duration = typical_durations.get(current_phase, 30)
        maturity = min(duration / typical_duration, 1.0)
        
        # Predict next phase
        next_phase = self._predict_next_phase(current_phase, maturity)
        
        # Estimate transition timing
        if maturity > 0.8:
            transition_eta = np.random.randint(1, 7)
        elif maturity > 0.6:
            transition_eta = np.random.randint(7, 14)
        else:
            transition_eta = np.random.randint(14, 30)
        
        return {
            'current': current_phase,
            'duration': duration,
            'maturity': maturity,
            'next': next_phase,
            'transition_eta': transition_eta
        }
    
    def _predict_next_phase(self, current: MarketPhase, maturity: float) -> MarketPhase:
        """Predict the next market phase"""
        
        # Define phase transitions
        transitions = {
            MarketPhase.DEPRESSION: MarketPhase.DISBELIEF,
            MarketPhase.DISBELIEF: MarketPhase.HOPE,
            MarketPhase.HOPE: MarketPhase.OPTIMISM,
            MarketPhase.OPTIMISM: MarketPhase.BELIEF,
            MarketPhase.BELIEF: MarketPhase.THRILL,
            MarketPhase.THRILL: MarketPhase.EUPHORIA,
            MarketPhase.EUPHORIA: MarketPhase.COMPLACENCY,
            MarketPhase.COMPLACENCY: MarketPhase.ANXIETY,
            MarketPhase.ANXIETY: MarketPhase.DENIAL,
            MarketPhase.DENIAL: MarketPhase.PANIC,
            MarketPhase.PANIC: MarketPhase.CAPITULATION,
            MarketPhase.CAPITULATION: MarketPhase.ANGER,
            MarketPhase.ANGER: MarketPhase.DEPRESSION,
            MarketPhase.ACCUMULATION: MarketPhase.MARKUP,
            MarketPhase.MARKUP: MarketPhase.DISTRIBUTION,
            MarketPhase.DISTRIBUTION: MarketPhase.MARKDOWN,
            MarketPhase.MARKDOWN: MarketPhase.ACCUMULATION
        }
        
        return transitions.get(current, MarketPhase.HOPE)
    
    async def _analyze_crowd_behavior(self, 
                                     sentiment_data: Optional[Dict],
                                     market_data: Optional[Dict]) -> Dict:
        """Analyze crowd psychology and behavior"""
        
        analysis = {
            'herd_mentality': 0.5,
            'contrarian_opportunity': False,
            'retail': 'neutral',
            'institutional': 'neutral',
            'smart_money': 'neutral'
        }
        
        if sentiment_data:
            # Calculate herd mentality (groupthink level)
            social_volume = sentiment_data.get('social_volume', 0.5)
            sentiment_variance = sentiment_data.get('sentiment_variance', 0.5)
            
            # High volume + low variance = high herd mentality
            analysis['herd_mentality'] = social_volume * (1 - sentiment_variance)
            
            # Detect contrarian opportunities
            fear_greed = sentiment_data.get('fear_greed_index', 50)
            if fear_greed < 20 or fear_greed > 80:
                analysis['contrarian_opportunity'] = True
            
            # Analyze different participant sentiments
            analysis['retail'] = self._classify_sentiment(
                sentiment_data.get('retail_sentiment', 0)
            )
            analysis['institutional'] = self._classify_sentiment(
                sentiment_data.get('institutional_sentiment', 0)
            )
            analysis['smart_money'] = self._classify_sentiment(
                sentiment_data.get('smart_money_sentiment', 0)
            )
        
        # Check for divergences
        if market_data:
            price_trend = market_data.get('trend', 'neutral')
            
            # If price up but sentiment down = bearish divergence
            if price_trend == 'up' and analysis['retail'] == 'bearish':
                analysis['contrarian_opportunity'] = True
            # If price down but smart money bullish = bullish divergence
            elif price_trend == 'down' and analysis['smart_money'] == 'bullish':
                analysis['contrarian_opportunity'] = True
        
        return analysis
    
    def _classify_sentiment(self, score: float) -> str:
        """Classify sentiment score into categories"""
        
        if score > 0.3:
            return 'bullish'
        elif score < -0.3:
            return 'bearish'
        else:
            return 'neutral'
    
    async def _assess_system_risks(self,
                                  market_data: Optional[Dict],
                                  emotional_state: Dict,
                                  crowd_analysis: Dict) -> Dict:
        """Assess systemic market risks"""
        
        risks = {
            'bubble': 0.1,  # Base probability
            'crash': 0.1,
            'manipulation': 0.0,
            'irrationality': 0.0
        }
        
        # Bubble risk factors
        if emotional_state['dominant'] == 'euphoria':
            risks['bubble'] += 0.3
        if emotional_state['dominant'] == 'greed' and emotional_state['intensity'] > 0.7:
            risks['bubble'] += 0.2
        if crowd_analysis['herd_mentality'] > 0.8:
            risks['bubble'] += 0.15
        
        # Crash risk factors
        if emotional_state['dominant'] == 'panic':
            risks['crash'] += 0.35
        if emotional_state['dominant'] == 'fear' and emotional_state['intensity'] > 0.7:
            risks['crash'] += 0.25
        if market_data and market_data.get('volatility', 0) > 0.8:
            risks['crash'] += 0.15
        
        # Manipulation risk
        if market_data:
            volume_anomaly = market_data.get('volume_anomaly', 0)
            price_anomaly = market_data.get('price_anomaly', 0)
            
            risks['manipulation'] = (volume_anomaly + price_anomaly) / 2
        
        # Irrationality index
        emotion_intensity = emotional_state['intensity']
        herd_mentality = crowd_analysis['herd_mentality']
        
        risks['irrationality'] = (emotion_intensity + herd_mentality) / 2
        
        # Cap all risks at 1.0
        for key in risks:
            risks[key] = min(risks[key], 1.0)
        
        return risks
    
    async def _discover_hidden_opportunities(self,
                                           market_phase: Dict,
                                           crowd_analysis: Dict,
                                           system_risks: Dict) -> List[str]:
        """Discover hidden market opportunities"""
        
        opportunities = []
        
        # Contrarian opportunities
        if crowd_analysis['contrarian_opportunity']:
            if crowd_analysis['herd_mentality'] > 0.8:
                opportunities.append("Extreme herd behavior - consider contrarian position")
            if market_phase['current'] == MarketPhase.PANIC:
                opportunities.append("Panic selling creating oversold opportunities")
            if market_phase['current'] == MarketPhase.EUPHORIA:
                opportunities.append("Euphoric top - consider taking profits")
        
        # Phase transition opportunities
        if market_phase['maturity'] > 0.8:
            opportunities.append(f"Near phase transition to {market_phase['next'].value}")
        
        # Smart money divergence
        if crowd_analysis['smart_money'] != crowd_analysis['retail']:
            if crowd_analysis['smart_money'] == 'bullish' and crowd_analysis['retail'] == 'bearish':
                opportunities.append("Smart money accumulating while retail sells")
            elif crowd_analysis['smart_money'] == 'bearish' and crowd_analysis['retail'] == 'bullish':
                opportunities.append("Smart money distributing to retail")
        
        # Risk-based opportunities
        if system_risks['crash'] > 0.6:
            opportunities.append("High crash risk - hedging opportunity")
        if system_risks['bubble'] > 0.7:
            opportunities.append("Bubble conditions - consider protective stops")
        
        # Irrationality opportunities
        if system_risks['irrationality'] > 0.7:
            opportunities.append("High irrationality - volatility trading opportunity")
        
        return opportunities[:5]  # Return top 5 opportunities
    
    async def _extract_market_wisdom(self,
                                    emotional_state: Dict,
                                    market_phase: Dict,
                                    crowd_analysis: Dict) -> Dict:
        """Extract wisdom from market consciousness"""
        
        wisdom = {
            'message': '',
            'warnings': []
        }
        
        # Generate market message based on conditions
        if emotional_state['dominant'] == 'fear' and emotional_state['intensity'] > 0.7:
            wisdom['message'] = "Fear dominates - but remember: be greedy when others are fearful"
        elif emotional_state['dominant'] == 'greed' and emotional_state['intensity'] > 0.7:
            wisdom['message'] = "Greed dominates - but remember: be fearful when others are greedy"
        elif market_phase['current'] == MarketPhase.ACCUMULATION:
            wisdom['message'] = "Smart money accumulating - patience rewards the prepared"
        elif market_phase['current'] == MarketPhase.DISTRIBUTION:
            wisdom['message'] = "Distribution phase - smart money taking profits"
        elif crowd_analysis['herd_mentality'] > 0.8:
            wisdom['message'] = "Extreme herd mentality - the crowd is rarely right at extremes"
        else:
            wisdom['message'] = "Market seeking equilibrium - follow the trend with caution"
        
        # Generate warnings
        if emotional_state['intensity'] > 0.8:
            wisdom['warnings'].append(f"Extreme {emotional_state['dominant']} - emotions at dangerous levels")
        
        if market_phase['maturity'] > 0.9:
            wisdom['warnings'].append(f"Phase change imminent - prepare for shift to {market_phase['next'].value}")
        
        if crowd_analysis['herd_mentality'] > 0.85:
            wisdom['warnings'].append("Dangerous herd mentality - independent thinking crucial")
        
        if emotional_state['stability'] < 0.3:
            wisdom['warnings'].append("Highly unstable emotional state - expect volatility")
        
        return wisdom
    
    def _update_consciousness_history(self, consciousness: MarketConsciousness):
        """Update historical consciousness tracking"""
        
        # Add to history
        self.consciousness_history.append({
            'timestamp': datetime.now(),
            'dominant_emotion': consciousness.dominant_emotion,
            'emotional_intensity': consciousness.emotional_intensity,
            'phase': consciousness.current_phase,
            'herd_mentality': consciousness.herd_mentality_score
        })
        
        # Update phase history
        self.phase_history.append(consciousness.current_phase)
        
        # Trim history to last 1000 entries
        if len(self.consciousness_history) > 1000:
            self.consciousness_history = self.consciousness_history[-1000:]
        if len(self.phase_history) > 1000:
            self.phase_history = self.phase_history[-1000:]
    
    def _generate_fallback_consciousness(self) -> MarketConsciousness:
        """Generate safe fallback consciousness state"""
        
        return MarketConsciousness(
            dominant_emotion='neutral',
            emotional_intensity=0.5,
            emotional_stability=0.5,
            emotional_trajectory='stable',
            current_phase=MarketPhase.HOPE,
            phase_duration=1,
            phase_maturity=0.5,
            next_phase=MarketPhase.OPTIMISM,
            phase_transition_eta=14,
            herd_mentality_score=0.5,
            contrarian_opportunity=False,
            retail_sentiment='neutral',
            institutional_sentiment='neutral',
            smart_money_sentiment='neutral',
            bubble_probability=0.1,
            crash_probability=0.1,
            manipulation_level=0.0,
            irrationality_index=0.5,
            market_message='Market data unavailable - trade with caution',
            hidden_opportunities=[],
            warning_signs=['System operating in fallback mode']
        )
    
    def _get_default_config(self) -> Dict:
        """Get default configuration"""
        
        return {
            'emotion_threshold': 0.3,  # Minimum emotion score to consider
            'phase_duration_window': 30,  # Days to track phase duration
            'herd_threshold': 0.7,  # Herd mentality threshold
            'risk_threshold': 0.6,  # Risk warning threshold
            'wisdom_depth': 5,  # Number of wisdom signals to generate
            'update_frequency': 60  # Update every minute
        }
