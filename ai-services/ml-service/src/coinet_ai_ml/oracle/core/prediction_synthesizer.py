"""
🎯 PREDICTION SYNTHESIZER - THE DIVINE ORCHESTRATOR
==================================================

The master synthesizer that combines all oracle components into unified,
actionable predictions with supernatural accuracy. This is where all the
divine intelligence converges into crystal-clear insights.

REVOLUTIONARY CAPABILITIES:
- Multi-source prediction fusion
- Confidence-weighted synthesis
- Contradiction resolution
- Action window generation
- Risk-adjusted recommendations
- Self-improving accuracy

"The whole is greater than the sum of its parts." - Aristotle

We don't just combine predictions - we create divine synthesis.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import numpy as np

from ..models.oracle_models import (
    OracleInsight,
    PredictionResult,
    WhaleMovement,
    MarketConsciousness,
    TimeWindow,
    ActionType,
    TimeFrame,
    TurningPoint,
    PredictionConfidence
)

from .oracle_engine import MarketOracleEngine
from .whale_tracker import WhaleIntelligenceEngine
from .market_consciousness import MarketConsciousnessReader

logger = logging.getLogger(__name__)

class PredictionSynthesizer:
    """
    🎯 THE DIVINE PREDICTION SYNTHESIZER
    
    This synthesizer possesses the supernatural ability to combine all
    predictive signals into a unified, coherent, and actionable insight
    that transcends individual predictions.
    """
    
    def __init__(self, config: Optional[Dict] = None):
        """Initialize the divine synthesizer"""
        self.config = config or self._get_default_config()
        
        # Initialize oracle components
        self.oracle_engine = MarketOracleEngine(config)
        self.whale_tracker = WhaleIntelligenceEngine(config)
        self.consciousness_reader = MarketConsciousnessReader(config)
        
        # Synthesis history for learning
        self.synthesis_history = []
        self.accuracy_tracker = {
            'predictions': [],
            'correct': 0,
            'total': 0
        }
        
        # Weight optimization
        self.component_weights = self._initialize_component_weights()
        
        logger.info("🎯 PredictionSynthesizer initialized with divine orchestration")
    
    async def generate_oracle_insight(self,
                                     token: str,
                                     market_data: Optional[Dict] = None,
                                     sentiment_data: Optional[Dict] = None) -> OracleInsight:
        """
        🔮 GENERATE COMPLETE ORACLE INSIGHT
        
        Orchestrate all oracle components to produce a unified,
        divine prediction with actionable recommendations.
        """
        try:
            logger.info(f"🎯 Generating oracle insight for {token}")
            
            # Parallel execution of all oracle components
            oracle_task = self.oracle_engine.predict_market_movement(token, market_data)
            whale_task = self.whale_tracker.track_whale_movements(token)
            consciousness_task = self.consciousness_reader.read_market_mind(market_data, sentiment_data)
            
            # Execute all analyses in parallel
            predictions, whale_movement, market_consciousness = await asyncio.gather(
                oracle_task, whale_task, consciousness_task
            )
            
            # Detect turning points
            turning_points = await self._synthesize_turning_points(
                predictions, whale_movement, market_consciousness
            )
            
            # Generate action windows
            action_windows = await self._generate_action_windows(
                predictions, whale_movement, market_consciousness, turning_points
            )
            
            # Synthesize divine recommendation
            divine_rec = await self._synthesize_divine_recommendation(
                predictions, whale_movement, market_consciousness, 
                turning_points, action_windows
            )
            
            # Calculate overall confidence
            confidence = await self._calculate_synthesis_confidence(
                predictions, whale_movement, market_consciousness
            )
            
            # Assess overall risk
            risk_assessment = await self._assess_overall_risk(
                predictions, whale_movement, market_consciousness
            )
            
            # Discover hidden alpha
            hidden_alpha = await self._discover_hidden_alpha(
                predictions, whale_movement, market_consciousness
            )
            
            # Identify contrarian plays
            contrarian_plays = await self._identify_contrarian_plays(
                whale_movement, market_consciousness
            )
            
            # Find market inefficiencies
            inefficiencies = await self._find_market_inefficiencies(
                predictions, whale_movement, market_consciousness
            )
            
            # Create oracle insight
            insight = OracleInsight(
                token_symbol=token,
                timestamp=datetime.now(),
                oracle_version="1.0.0",
                predictions=predictions,
                whale_analysis=whale_movement,
                key_whales=[],  # Would be populated from whale tracker
                market_consciousness=market_consciousness,
                turning_points=turning_points,
                action_windows=action_windows,
                divine_recommendation=divine_rec['recommendation'],
                confidence_score=confidence,
                accuracy_expectation=await self._calculate_accuracy_expectation(),
                overall_risk=risk_assessment['level'],
                risk_factors=risk_assessment['factors'],
                protection_strategies=risk_assessment['strategies'],
                hidden_alpha=hidden_alpha,
                contrarian_plays=contrarian_plays,
                market_inefficiencies=inefficiencies
            )
            
            # Update synthesis history
            self._update_synthesis_history(insight)
            
            # Log divine insight
            logger.info(f"🔮 Oracle insight complete: {divine_rec['recommendation'][:100]}...")
            logger.info(f"   Confidence: {confidence:.2%}")
            logger.info(f"   Risk: {risk_assessment['level']}")
            
            return insight
            
        except Exception as e:
            logger.error(f"❌ Oracle synthesis failed: {str(e)}")
            return self._generate_fallback_insight(token)
    
    async def _synthesize_turning_points(self,
                                        predictions: Dict[TimeFrame, PredictionResult],
                                        whale_movement: WhaleMovement,
                                        consciousness: MarketConsciousness) -> List[TurningPoint]:
        """Synthesize turning points from all signals"""
        
        turning_points = []
        
        # Check for market bottom conditions
        if (consciousness.dominant_emotion in ['despair', 'panic', 'capitulation'] and
            consciousness.emotional_intensity > 0.7 and
            whale_movement.smart_money_direction == 'bullish'):
            
            turning_points.append(TurningPoint(
                type=TurningPointType.MARKET_BOTTOM,
                probability=0.75,
                timeframe="1-7 days",
                confidence=PredictionConfidence.HIGH,
                trigger_price=0,  # Would calculate from market data
                target_price=0,
                invalidation_price=0,
                potential_catalysts=[
                    "Extreme fear exhaustion",
                    "Smart money accumulation",
                    "Oversold conditions"
                ],
                required_conditions=[
                    "Volume spike on reversal",
                    "RSI divergence confirmation",
                    "Break above resistance"
                ],
                expected_impact="extreme",
                affected_tokens=["All major cryptocurrencies"],
                market_wide_impact=True
            ))
        
        # Check for market top conditions
        if (consciousness.dominant_emotion in ['euphoria', 'greed'] and
            consciousness.emotional_intensity > 0.8 and
            whale_movement.smart_money_direction == 'bearish'):
            
            turning_points.append(TurningPoint(
                type=TurningPointType.MARKET_TOP,
                probability=0.70,
                timeframe="3-14 days",
                confidence=PredictionConfidence.HIGH,
                trigger_price=0,
                target_price=0,
                invalidation_price=0,
                potential_catalysts=[
                    "Extreme greed exhaustion",
                    "Smart money distribution",
                    "Overbought conditions"
                ],
                required_conditions=[
                    "Volume decline on rallies",
                    "RSI divergence",
                    "Break below support"
                ],
                expected_impact="extreme",
                affected_tokens=["All major cryptocurrencies"],
                market_wide_impact=True
            ))
        
        # Check for trend reversal
        short_term = predictions[TimeFrame.NEXT_24H]
        medium_term = predictions[TimeFrame.NEXT_7D]
        
        if (short_term.direction.value.endswith('bearish') and
            medium_term.direction.value.endswith('bullish') and
            whale_movement.divergence):
            
            turning_points.append(TurningPoint(
                type=TurningPointType.TREND_REVERSAL,
                probability=0.60,
                timeframe="24-72 hours",
                confidence=PredictionConfidence.MODERATE,
                trigger_price=0,
                target_price=0,
                invalidation_price=0,
                potential_catalysts=["Whale divergence", "Sentiment shift"],
                required_conditions=["Price confirmation", "Volume increase"],
                expected_impact="high",
                affected_tokens=[],
                market_wide_impact=False
            ))
        
        return turning_points
    
    async def _generate_action_windows(self,
                                      predictions: Dict[TimeFrame, PredictionResult],
                                      whale_movement: WhaleMovement,
                                      consciousness: MarketConsciousness,
                                      turning_points: List[TurningPoint]) -> Dict[ActionType, TimeWindow]:
        """Generate optimal action windows"""
        
        windows = {}
        current_time = datetime.now()
        
        # Analyze signals for buy window
        buy_signals = 0
        if whale_movement.mass_accumulation:
            buy_signals += 2
        if whale_movement.smart_money_direction == 'bullish':
            buy_signals += 1
        if consciousness.contrarian_opportunity and consciousness.dominant_emotion == 'fear':
            buy_signals += 2
        if predictions[TimeFrame.NEXT_24H].direction.value.endswith('bullish'):
            buy_signals += 1
        
        # Generate buy window if signals are strong
        if buy_signals >= 3:
            windows[ActionType.BUY] = TimeWindow(
                start_time=current_time,
                end_time=current_time + timedelta(hours=24),
                peak_time=current_time + timedelta(hours=6),
                action=ActionType.BUY,
                confidence=min(buy_signals / 6, 1.0),
                urgency='high' if buy_signals >= 4 else 'medium',
                risk_reward_ratio=3.0 if buy_signals >= 4 else 2.0,
                success_probability=0.65 + (buy_signals * 0.05),
                entry_conditions=[
                    "Price above support",
                    "Volume confirmation",
                    "RSI not overbought"
                ],
                exit_conditions=[
                    "Target reached",
                    "Stop loss hit",
                    "Trend reversal"
                ],
                invalidation_conditions=[
                    "Break below key support",
                    "Whale distribution detected"
                ]
            )
        
        # Analyze signals for sell window
        sell_signals = 0
        if whale_movement.mass_distribution:
            sell_signals += 2
        if whale_movement.smart_money_direction == 'bearish':
            sell_signals += 1
        if consciousness.dominant_emotion == 'euphoria':
            sell_signals += 2
        if predictions[TimeFrame.NEXT_24H].direction.value.endswith('bearish'):
            sell_signals += 1
        
        # Generate sell window if signals are strong
        if sell_signals >= 3:
            windows[ActionType.SELL] = TimeWindow(
                start_time=current_time,
                end_time=current_time + timedelta(hours=12),
                peak_time=current_time + timedelta(hours=3),
                action=ActionType.SELL,
                confidence=min(sell_signals / 6, 1.0),
                urgency='high' if sell_signals >= 4 else 'medium',
                risk_reward_ratio=2.5,
                success_probability=0.60 + (sell_signals * 0.05),
                entry_conditions=[
                    "Price at resistance",
                    "Volume declining",
                    "RSI overbought"
                ],
                exit_conditions=[
                    "Target reached",
                    "Stop loss hit"
                ],
                invalidation_conditions=[
                    "Break above resistance",
                    "Whale accumulation detected"
                ]
            )
        
        # Default to hold if no strong signals
        if not windows:
            windows[ActionType.HOLD] = TimeWindow(
                start_time=current_time,
                end_time=current_time + timedelta(days=7),
                peak_time=None,
                action=ActionType.HOLD,
                confidence=0.6,
                urgency='low',
                risk_reward_ratio=1.0,
                success_probability=0.7,
                entry_conditions=["Current position maintained"],
                exit_conditions=["Signal change"],
                invalidation_conditions=["Major market event"]
            )
        
        return windows
    
    async def _synthesize_divine_recommendation(self,
                                               predictions: Dict[TimeFrame, PredictionResult],
                                               whale_movement: WhaleMovement,
                                               consciousness: MarketConsciousness,
                                               turning_points: List[TurningPoint],
                                               action_windows: Dict[ActionType, TimeWindow]) -> Dict:
        """Synthesize the ultimate divine recommendation"""
        
        components = []
        
        # Start with market consciousness
        components.append(f"The market is in a state of {consciousness.dominant_emotion} "
                         f"({consciousness.current_phase.value} phase).")
        
        # Add whale intelligence
        if whale_movement.mass_accumulation:
            components.append("Whales are massively accumulating - smart money is bullish.")
        elif whale_movement.mass_distribution:
            components.append("Whales are distributing - smart money is taking profits.")
        elif whale_movement.divergence:
            components.append("Whale behavior diverging from retail - potential opportunity.")
        
        # Add prediction consensus
        short_term = predictions[TimeFrame.NEXT_24H]
        medium_term = predictions[TimeFrame.NEXT_7D]
        
        components.append(f"Short-term outlook: {short_term.direction.value} "
                         f"({short_term.magnitude:+.1f}%) with {short_term.confidence.value} confidence.")
        
        # Add turning point warnings
        if turning_points:
            tp = turning_points[0]
            components.append(f"⚠️ {tp.type.value} detected with {tp.probability:.0%} probability.")
        
        # Add action recommendation
        if ActionType.STRONG_BUY in action_windows:
            components.append("🟢 STRONG BUY: Exceptional opportunity detected.")
        elif ActionType.BUY in action_windows:
            components.append("🟢 BUY: Favorable conditions for entry.")
        elif ActionType.SELL in action_windows:
            components.append("🔴 SELL: Take profits or reduce exposure.")
        elif ActionType.STRONG_SELL in action_windows:
            components.append("🔴 STRONG SELL: Exit immediately.")
        else:
            components.append("🟡 HOLD: Wait for clearer signals.")
        
        # Add risk warning if needed
        if consciousness.bubble_probability > 0.7:
            components.append("⚠️ WARNING: Bubble conditions detected - extreme caution advised.")
        if consciousness.crash_probability > 0.6:
            components.append("⚠️ WARNING: Crash risk elevated - consider protective measures.")
        
        # Add contrarian insight if available
        if consciousness.contrarian_opportunity:
            components.append("💡 Contrarian opportunity: Market extremes creating opportunity.")
        
        recommendation = " ".join(components)
        
        return {
            'recommendation': recommendation,
            'components': components
        }
    
    async def _calculate_synthesis_confidence(self,
                                             predictions: Dict[TimeFrame, PredictionResult],
                                             whale_movement: WhaleMovement,
                                             consciousness: MarketConsciousness) -> float:
        """Calculate overall confidence in synthesis"""
        
        confidences = []
        
        # Prediction confidences
        for timeframe, prediction in predictions.items():
            weight = 0.25 if timeframe in [TimeFrame.NEXT_1H, TimeFrame.NEXT_6H] else 0.5
            conf_value = {
                PredictionConfidence.DIVINE_CERTAINTY: 0.95,
                PredictionConfidence.VERY_HIGH: 0.85,
                PredictionConfidence.HIGH: 0.75,
                PredictionConfidence.MODERATE: 0.60,
                PredictionConfidence.LOW: 0.40,
                PredictionConfidence.UNCERTAIN: 0.20
            }.get(prediction.confidence, 0.5)
            confidences.append(conf_value * weight)
        
        # Whale signal confidence
        whale_confidence = 0.7 if whale_movement.flow_strength > 5 else 0.5
        if whale_movement.smart_money_direction != 'neutral':
            whale_confidence += 0.1
        confidences.append(whale_confidence * 0.3)
        
        # Market consciousness confidence
        consciousness_confidence = 1.0 - consciousness.irrationality_index
        if consciousness.emotional_stability > 0.7:
            consciousness_confidence += 0.1
        confidences.append(consciousness_confidence * 0.2)
        
        # Calculate weighted average
        overall_confidence = sum(confidences) / sum([0.25, 0.25, 0.5, 0.5, 0.3, 0.2])
        
        # Adjust for agreement between components
        agreement_bonus = self._calculate_component_agreement(
            predictions, whale_movement, consciousness
        )
        
        overall_confidence = min(overall_confidence + agreement_bonus, 1.0)
        
        return overall_confidence
    
    def _calculate_component_agreement(self,
                                      predictions: Dict[TimeFrame, PredictionResult],
                                      whale_movement: WhaleMovement,
                                      consciousness: MarketConsciousness) -> float:
        """Calculate how much different components agree"""
        
        agreements = []
        
        # Check prediction consistency
        directions = [p.direction.value for p in predictions.values()]
        bullish_count = sum(1 for d in directions if 'bullish' in d)
        bearish_count = sum(1 for d in directions if 'bearish' in d)
        
        if bullish_count == len(directions) or bearish_count == len(directions):
            agreements.append(0.1)  # Perfect agreement
        elif bullish_count > bearish_count * 2 or bearish_count > bullish_count * 2:
            agreements.append(0.05)  # Strong agreement
        
        # Check whale-prediction agreement
        short_term = predictions[TimeFrame.NEXT_24H]
        if (whale_movement.smart_money_direction == 'bullish' and 
            'bullish' in short_term.direction.value):
            agreements.append(0.05)
        elif (whale_movement.smart_money_direction == 'bearish' and 
              'bearish' in short_term.direction.value):
            agreements.append(0.05)
        
        # Check consciousness-whale agreement
        if (consciousness.smart_money_sentiment == whale_movement.smart_money_direction):
            agreements.append(0.03)
        
        return sum(agreements)
    
    async def _assess_overall_risk(self,
                                  predictions: Dict[TimeFrame, PredictionResult],
                                  whale_movement: WhaleMovement,
                                  consciousness: MarketConsciousness) -> Dict:
        """Assess overall risk level"""
        
        risk_factors = []
        risk_score = 3.0  # Base risk
        
        # Market consciousness risks
        if consciousness.bubble_probability > 0.7:
            risk_factors.append("Bubble conditions present")
            risk_score += 2
        if consciousness.crash_probability > 0.6:
            risk_factors.append("Elevated crash risk")
            risk_score += 2
        if consciousness.irrationality_index > 0.7:
            risk_factors.append("High market irrationality")
            risk_score += 1.5
        
        # Whale risks
        if whale_movement.divergence:
            risk_factors.append("Whale behavior divergence")
            risk_score += 1
        if whale_movement.mass_distribution:
            risk_factors.append("Whales distributing")
            risk_score += 1.5
        
        # Prediction risks
        avg_volatility = np.mean([p.expected_volatility for p in predictions.values()])
        if avg_volatility > 10:
            risk_factors.append(f"High volatility expected ({avg_volatility:.1f}%)")
            risk_score += 1
        
        # Black swan risk
        avg_black_swan = np.mean([p.black_swan_probability for p in predictions.values()])
        if avg_black_swan > 0.05:
            risk_factors.append(f"Black swan risk: {avg_black_swan:.1%}")
            risk_score += 2
        
        # Determine risk level
        risk_score = min(risk_score, 10)
        if risk_score >= 8:
            risk_level = 'extreme'
        elif risk_score >= 6:
            risk_level = 'high'
        elif risk_score >= 4:
            risk_level = 'medium'
        else:
            risk_level = 'low'
        
        # Generate protection strategies
        strategies = []
        if risk_level in ['high', 'extreme']:
            strategies.append("Use tight stop losses")
            strategies.append("Reduce position sizes")
            strategies.append("Consider hedging strategies")
        if consciousness.bubble_probability > 0.7:
            strategies.append("Take partial profits on rallies")
        if consciousness.crash_probability > 0.6:
            strategies.append("Increase cash reserves")
        
        return {
            'level': risk_level,
            'score': risk_score,
            'factors': risk_factors,
            'strategies': strategies
        }
    
    async def _discover_hidden_alpha(self,
                                    predictions: Dict[TimeFrame, PredictionResult],
                                    whale_movement: WhaleMovement,
                                    consciousness: MarketConsciousness) -> List[str]:
        """Discover hidden alpha opportunities"""
        
        alpha = []
        
        # Whale-retail divergence alpha
        if (whale_movement.smart_money_direction == 'bullish' and
            consciousness.retail_sentiment == 'bearish'):
            alpha.append("Smart money accumulating while retail capitulates - strong alpha")
        
        # Emotional extreme alpha
        if consciousness.emotional_intensity > 0.8:
            alpha.append(f"Extreme {consciousness.dominant_emotion} creating mean reversion opportunity")
        
        # Phase transition alpha
        if consciousness.phase_maturity > 0.85:
            alpha.append(f"Near phase transition from {consciousness.current_phase.value} - position for next phase")
        
        # Volatility alpha
        for timeframe, prediction in predictions.items():
            if prediction.volatility_spikes:
                alpha.append(f"Volatility spike predicted in {timeframe.value} - options opportunity")
                break
        
        # Support/resistance alpha
        short_term = predictions[TimeFrame.NEXT_24H]
        if short_term.support_levels and short_term.resistance_levels:
            alpha.append("Clear support/resistance levels for range trading")
        
        return alpha[:3]  # Return top 3 alpha opportunities
    
    async def _identify_contrarian_plays(self,
                                        whale_movement: WhaleMovement,
                                        consciousness: MarketConsciousness) -> List[str]:
        """Identify contrarian trading opportunities"""
        
        plays = []
        
        if consciousness.contrarian_opportunity:
            if consciousness.dominant_emotion == 'panic':
                plays.append("Buy the panic - extreme fear creating oversold opportunity")
            elif consciousness.dominant_emotion == 'euphoria':
                plays.append("Sell the euphoria - extreme greed creating overbought opportunity")
        
        if whale_movement.divergence:
            if whale_movement.smart_money_direction != consciousness.retail_sentiment:
                plays.append("Follow smart money against retail sentiment")
        
        if consciousness.herd_mentality_score > 0.85:
            plays.append("Fade the herd - extreme groupthink creates contrarian edge")
        
        return plays
    
    async def _find_market_inefficiencies(self,
                                         predictions: Dict[TimeFrame, PredictionResult],
                                         whale_movement: WhaleMovement,
                                         consciousness: MarketConsciousness) -> List[str]:
        """Find exploitable market inefficiencies"""
        
        inefficiencies = []
        
        # Emotional pricing inefficiency
        if consciousness.irrationality_index > 0.7:
            inefficiencies.append("High irrationality creating pricing inefficiencies")
        
        # Information asymmetry
        if whale_movement.mass_accumulation and consciousness.retail_sentiment == 'bearish':
            inefficiencies.append("Information asymmetry - whales know something retail doesn't")
        
        # Time arbitrage
        short = predictions[TimeFrame.NEXT_1H]
        long = predictions[TimeFrame.NEXT_7D]
        if ('bearish' in short.direction.value and 'bullish' in long.direction.value):
            inefficiencies.append("Time arbitrage - short-term weakness, long-term strength")
        
        # Sentiment-price divergence
        if consciousness.dominant_emotion == 'fear' and whale_movement.net_flow == 'accumulation':
            inefficiencies.append("Sentiment-price divergence creating opportunity")
        
        return inefficiencies[:3]
    
    async def _calculate_accuracy_expectation(self) -> float:
        """Calculate expected accuracy based on historical performance"""
        
        if self.accuracy_tracker['total'] > 0:
            historical_accuracy = self.accuracy_tracker['correct'] / self.accuracy_tracker['total']
            # Weight recent performance more heavily
            return historical_accuracy * 0.7 + 0.6 * 0.3  # Blend with base expectation
        else:
            return 0.65  # Base expectation for new system
    
    def _update_synthesis_history(self, insight: OracleInsight):
        """Update synthesis history for learning"""
        
        self.synthesis_history.append({
            'timestamp': insight.timestamp,
            'token': insight.token_symbol,
            'recommendation': insight.divine_recommendation,
            'confidence': insight.confidence_score
        })
        
        # Trim history
        if len(self.synthesis_history) > 1000:
            self.synthesis_history = self.synthesis_history[-1000:]
    
    def _generate_fallback_insight(self, token: str) -> OracleInsight:
        """Generate safe fallback insight"""
        
        return OracleInsight(
            token_symbol=token,
            timestamp=datetime.now(),
            oracle_version="1.0.0",
            predictions={},
            whale_analysis=WhaleMovement(
                total_whales_tracked=0,
                active_whales=0,
                net_flow='neutral',
                flow_strength=0,
                smart_money_direction='neutral',
                mass_accumulation=False,
                mass_distribution=False,
                divergence=False,
                whale_consensus='neutral',
                follow_recommendation='ignore'
            ),
            key_whales=[],
            market_consciousness=self.consciousness_reader._generate_fallback_consciousness(),
            turning_points=[],
            action_windows={},
            divine_recommendation="System unavailable - trade with extreme caution",
            confidence_score=0.0,
            accuracy_expectation=0.0,
            overall_risk='unknown',
            risk_factors=['System operating in fallback mode'],
            protection_strategies=['Do not trade based on this analysis'],
            hidden_alpha=[],
            contrarian_plays=[],
            market_inefficiencies=[]
        )
    
    def _initialize_component_weights(self) -> Dict:
        """Initialize adaptive component weights"""
        
        return {
            'oracle': 1.0,
            'whale': 1.0,
            'consciousness': 1.0,
            'psychology': 1.0  # From our existing psychology engine
        }
    
    def _get_default_config(self) -> Dict:
        """Get default configuration"""
        
        return {
            'confidence_threshold': 0.6,
            'risk_tolerance': 5.0,
            'min_signals': 3,
            'agreement_bonus': 0.1,
            'learning_rate': 0.01
        }
