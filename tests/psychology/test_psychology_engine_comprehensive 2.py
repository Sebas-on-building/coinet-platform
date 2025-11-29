"""
🧪 COMPREHENSIVE PSYCHOLOGY ENGINE TESTING SUITE
===============================================

Testing the divine psychological analysis capabilities with real-world scenarios.
We'll validate every component to prove this beast actually works!
"""

import pytest
import asyncio
from datetime import datetime
import json
import numpy as np
from typing import Dict, List

# Import our divine components
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../ai-services/ml-service/src'))

from coinet_ai_ml.psychology.core.psychology_engine import CryptoPsychologyEngine
from coinet_ai_ml.psychology.models.psychological_patterns import (
    CognitiveBiasType, 
    ManipulationTacticType,
    EmotionalPolarity,
    CrowdBehaviorType
)

class TestCryptoPsychologyEngine:
    """🧠 Test the divine psychology engine with real scenarios"""
    
    @pytest.fixture
    async def engine(self):
        """Initialize the psychology engine"""
        return CryptoPsychologyEngine()
    
    @pytest.mark.asyncio
    async def test_manipulation_detection_pump_and_dump(self, engine):
        """🔍 Test detection of classic pump and dump manipulation"""
        
        # Classic pump and dump message
        manipulation_text = """
        🚀🚀🚀 URGENT ALERT! 🚀🚀🚀
        
        MASSIVE WHALE ACCUMULATION DETECTED ON $MOONSHOT! 
        
        📊 INSIDER INFO: Big announcement coming in 2 HOURS!
        💎 This will 100X - GUARANTEED!
        ⏰ LAST CHANCE before it MOONS!
        
        🔥 Buy NOW or regret FOREVER!
        💸 Easy 1000% gains - I've never been wrong!
        
        DM me for VIP signals! 💌
        """
        
        enhanced_input = {
            'processed_text': manipulation_text.lower(),
            'original_text': manipulation_text,
            'input_type': 'social',
            'linguistic_features': {
                'word_count': len(manipulation_text.split()),
                'exclamation_ratio': manipulation_text.count('!') / len(manipulation_text),
                'caps_ratio': sum(1 for c in manipulation_text if c.isupper()) / len(manipulation_text),
                'urgency_words': 5,
                'financial_terms': 8,
                'emotional_words': 6
            },
            'contextual_signals': {
                'market_volatility': 0.8,
                'price_change_24h': 0.15,
                'social_volume': 0.9
            },
            'social_features': {
                'follower_count': 50000,
                'engagement_rate': 0.12,
                'account_age': 30,  # New account
                'verification_status': False
            }
        }
        
        result = await engine.analyze_psychology(
            input_text=manipulation_text,
            input_type='social',
            context=enhanced_input
        )
        
        # Assertions
        assert result is not None, "Analysis should return results"
        assert len(result.manipulation_tactics) > 0, "Should detect manipulation tactics"
        
        # Check for specific manipulation types
        detected_types = [tactic.tactic_type for tactic in result.manipulation_tactics]
        assert ManipulationTacticType.FOMO_CREATION in detected_types, "Should detect FOMO creation"
        assert ManipulationTacticType.FALSE_URGENCY in detected_types, "Should detect false urgency"
        
        # Check severity
        max_sophistication = max(tactic.sophistication_level for tactic in result.manipulation_tactics)
        assert max_sophistication > 0.6, f"Should detect high sophistication: {max_sophistication}"
        
        # Check protection strategies
        assert any(tactic.protection_strategies for tactic in result.manipulation_tactics), \
            "Should provide protection strategies"
        
        print("✅ PUMP AND DUMP DETECTION: PASSED")
        print(f"   Detected {len(result.manipulation_tactics)} manipulation tactics")
        print(f"   Max sophistication: {max_sophistication:.2f}")
    
    @pytest.mark.asyncio
    async def test_cognitive_bias_detection_fomo(self, engine):
        """🧠 Test detection of FOMO and confirmation bias"""
        
        fomo_text = """
        I can't believe I missed Bitcoin at $20k again! Everyone is buying and I'm just 
        watching from the sidelines. All my friends are getting rich while I'm stuck 
        with my boring job. This time I won't miss out - I'm going all in on this new 
        altcoin that everyone's talking about. The community says it's going to 100x 
        for sure. I should have listened to my gut earlier, but now I need to act fast 
        before it's too late!
        """
        
        enhanced_input = {
            'processed_text': fomo_text.lower(),
            'original_text': fomo_text,
            'input_type': 'personal',
            'linguistic_features': {
                'word_count': len(fomo_text.split()),
                'exclamation_ratio': fomo_text.count('!') / len(fomo_text),
                'emotional_words': 8,
                'urgency_words': 3
            },
            'contextual_signals': {
                'price_change_24h': 0.25,  # Strong recent gains
                'social_volume': 0.8
            }
        }
        
        result = await engine.analyze_psychology(
            input_text=fomo_text,
            input_type='personal',
            context=enhanced_input
        )
        
        # Assertions
        assert result is not None, "Analysis should return results"
        assert len(result.cognitive_biases) > 0, "Should detect cognitive biases"
        
        # Check for specific biases
        detected_biases = [bias.bias_type for bias in result.cognitive_biases]
        assert CognitiveBiasType.FOMO in detected_biases, "Should detect FOMO bias"
        assert CognitiveBiasType.HERDING_BEHAVIOR in detected_biases, "Should detect herding behavior"
        
        # Check mitigation strategies
        fomo_bias = next(bias for bias in result.cognitive_biases if bias.bias_type == CognitiveBiasType.FOMO)
        assert len(fomo_bias.mitigation_strategies) > 0, "Should provide mitigation strategies"
        assert "cooling-off" in " ".join(fomo_bias.mitigation_strategies).lower(), \
            "Should suggest cooling-off period"
        
        print("✅ FOMO BIAS DETECTION: PASSED")
        print(f"   Detected {len(result.cognitive_biases)} cognitive biases")
        print(f"   FOMO strength: {fomo_bias.strength:.2f}")
    
    @pytest.mark.asyncio
    async def test_crowd_psychology_panic_selling(self, engine):
        """🌊 Test crowd psychology prediction during panic"""
        
        panic_text = """
        Market is crashing! Everyone is panic selling! 
        Bitcoin down 15% in 2 hours! Altcoins bleeding everywhere!
        Fear index at extreme levels! People are losing everything!
        This is it - the bear market is here! Sell everything now!
        """
        
        enhanced_input = {
            'processed_text': panic_text.lower(),
            'original_text': panic_text,
            'input_type': 'market',
            'linguistic_features': {
                'word_count': len(panic_text.split()),
                'exclamation_ratio': panic_text.count('!') / len(panic_text),
                'emotional_words': 10
            },
            'contextual_signals': {
                'market_volatility': 0.9,
                'price_change_24h': -0.15,
                'volume_change': 2.5,  # Massive volume spike
                'social_volume': 0.95
            },
            'social_features': {
                'engagement_rate': 0.15  # High engagement during panic
            }
        }
        
        result = await engine.analyze_psychology(
            input_text=panic_text,
            input_type='market',
            context=enhanced_input
        )
        
        # Assertions
        assert result is not None, "Analysis should return results"
        
        # Check emotional state
        assert result.emotional_state is not None, "Should detect emotional state"
        assert result.emotional_state.polarity == EmotionalPolarity.BEARISH_PANIC, \
            f"Should detect panic: {result.emotional_state.polarity}"
        
        # Check crowd behavior
        assert result.crowd_behavior is not None, "Should predict crowd behavior"
        assert result.crowd_behavior.behavior_type == CrowdBehaviorType.PANIC_SELLING, \
            f"Should predict panic selling: {result.crowd_behavior.behavior_type}"
        assert result.crowd_behavior.intensity > 0.7, \
            f"Should detect high intensity: {result.crowd_behavior.intensity}"
        
        print("✅ PANIC SELLING PREDICTION: PASSED")
        print(f"   Crowd behavior: {result.crowd_behavior.behavior_type.value}")
        print(f"   Intensity: {result.crowd_behavior.intensity:.2f}")
    
    @pytest.mark.asyncio
    async def test_emotional_analysis_authenticity(self, engine):
        """❤️ Test emotional authenticity detection"""
        
        # Fake emotional manipulation
        fake_emotion = """
        OMG!!!! This is AMAZING!!!! I'm SO EXCITED about this project!!!
        It's INCREDIBLE and REVOLUTIONARY!!!! Everyone should buy NOW!!!!
        This is the BEST opportunity EVER!!!! Don't miss out!!!!!
        GUARANTEED profits!!!! Act NOW!!!! LIMITED TIME!!!!
        """
        
        # Authentic emotional expression
        authentic_emotion = """
        I'm genuinely excited about this project. The technology seems promising
        and the team has a solid track record. I've done my research and decided
        to invest a small amount. The community is passionate but realistic about
        the challenges ahead. It's risky but I believe in the long-term vision.
        """
        
        # Test fake emotion
        fake_result = await engine.analyze_psychology(
            input_text=fake_emotion,
            input_type='social'
        )
        
        # Test authentic emotion
        authentic_result = await engine.analyze_psychology(
            input_text=authentic_emotion,
            input_type='social'
        )
        
        # Assertions
        assert fake_result.emotional_state.authenticity_score < 0.6, \
            f"Should detect fake emotion: {fake_result.emotional_state.authenticity_score}"
        
        assert authentic_result.emotional_state.authenticity_score > 0.7, \
            f"Should detect authentic emotion: {authentic_result.emotional_state.authenticity_score}"
        
        print("✅ EMOTIONAL AUTHENTICITY: PASSED")
        print(f"   Fake emotion authenticity: {fake_result.emotional_state.authenticity_score:.2f}")
        print(f"   Authentic emotion authenticity: {authentic_result.emotional_state.authenticity_score:.2f}")
    
    @pytest.mark.asyncio
    async def test_social_influence_mapping(self, engine):
        """👥 Test social influence and power dynamics detection"""
        
        influence_text = """
        As a certified financial advisor with 15 years of experience,
        I've analyzed over 1000 crypto projects. My followers know I've 
        called the last 3 major market moves correctly. This is my 
        professional recommendation based on thorough analysis.
        Trusted by thousands of investors worldwide.
        """
        
        enhanced_input = {
            'social_features': {
                'follower_count': 100000,
                'engagement_rate': 0.08,
                'verification_status': True,
                'account_age': 2000,  # Old account
                'influence_score': 0.8
            }
        }
        
        result = await engine.analyze_psychology(
            input_text=influence_text,
            input_type='social',
            context=enhanced_input
        )
        
        # Assertions
        assert result is not None, "Analysis should return results"
        assert len(result.social_influences) > 0, "Should detect social influences"
        
        # Check influence types
        influence = result.social_influences[0]
        assert influence.source_credibility > 0.6, \
            f"Should detect high credibility: {influence.source_credibility}"
        assert influence.influence_strength > 0.5, \
            f"Should detect influence strength: {influence.influence_strength}"
        
        print("✅ SOCIAL INFLUENCE MAPPING: PASSED")
        print(f"   Source credibility: {influence.source_credibility:.2f}")
        print(f"   Influence strength: {influence.influence_strength:.2f}")
    
    @pytest.mark.asyncio
    async def test_narrative_warfare_detection(self, engine):
        """📖 Test narrative analysis and story warfare detection"""
        
        narrative_text = """
        The corrupt banking system is finally crumbling. Traditional finance
        has oppressed the people for decades, but now cryptocurrency offers
        true freedom. We are the resistance against centralized control.
        Join the revolution or be left behind. This is our moment to overthrow
        the financial establishment and create a new world order.
        """
        
        result = await engine.analyze_psychology(
            input_text=narrative_text,
            input_type='political'
        )
        
        # Assertions
        assert result is not None, "Analysis should return results"
        assert len(result.narrative_patterns) > 0, "Should detect narrative patterns"
        
        # Check for revolution narrative
        narrative = result.narrative_patterns[0]
        assert 'revolution' in narrative.narrative_theme.lower(), \
            f"Should detect revolution theme: {narrative.narrative_theme}"
        assert narrative.emotional_resonance > 0.6, \
            f"Should have high emotional resonance: {narrative.emotional_resonance}"
        
        print("✅ NARRATIVE WARFARE DETECTION: PASSED")
        print(f"   Narrative theme: {narrative.narrative_theme}")
        print(f"   Emotional resonance: {narrative.emotional_resonance:.2f}")
    
    @pytest.mark.asyncio
    async def test_personalized_profiling(self, engine):
        """🎭 Test personalized psychological profiling"""
        
        # Conservative investor profile
        conservative_text = """
        I'm very careful with my investments. I prefer established projects
        with strong fundamentals and low volatility. I never invest more than
        I can afford to lose and always do extensive research. I'm not 
        interested in get-rich-quick schemes. Slow and steady wins the race.
        """
        
        # Aggressive trader profile  
        aggressive_text = """
        I'm all about high-risk, high-reward plays! I love volatile altcoins
        and leverage trading. YOLO! Life's too short to play it safe. I've
        made 10x on meme coins and I'm always looking for the next moonshot.
        Diamond hands baby! To the moon! 🚀
        """
        
        # Test both profiles
        conservative_result = await engine.analyze_psychology(
            input_text=conservative_text,
            input_type='personal'
        )
        
        aggressive_result = await engine.analyze_psychology(
            input_text=aggressive_text,
            input_type='personal'
        )
        
        # Assertions
        assert conservative_result.psychological_profile is not None, "Should create conservative profile"
        assert aggressive_result.psychological_profile is not None, "Should create aggressive profile"
        
        conservative_profile = conservative_result.psychological_profile
        aggressive_profile = aggressive_result.psychological_profile
        
        # Conservative should have lower risk tolerance
        assert conservative_profile.risk_tolerance < aggressive_profile.risk_tolerance, \
            "Conservative should have lower risk tolerance"
        
        # Aggressive should have higher social influence susceptibility
        assert aggressive_profile.social_influence_susceptibility > conservative_profile.social_influence_susceptibility, \
            "Aggressive trader should be more susceptible to social influence"
        
        print("✅ PERSONALIZED PROFILING: PASSED")
        print(f"   Conservative risk tolerance: {conservative_profile.risk_tolerance:.2f}")
        print(f"   Aggressive risk tolerance: {aggressive_profile.risk_tolerance:.2f}")

class TestRealWorldScenarios:
    """🌍 Test with real-world crypto scenarios"""
    
    @pytest.fixture
    async def engine(self):
        return CryptoPsychologyEngine()
    
    @pytest.mark.asyncio
    async def test_elon_musk_tweet_scenario(self, engine):
        """🐕 Test analysis of influential figure crypto tweet"""
        
        elon_tweet = """
        Dogecoin is the people's crypto. No highs, no lows, only Doge. 
        Much wow. Very currency. 🐕
        """
        
        enhanced_input = {
            'social_features': {
                'follower_count': 150000000,  # Elon's follower count
                'verification_status': True,
                'influence_score': 0.95
            },
            'contextual_signals': {
                'social_volume': 0.95,  # Viral tweet
                'market_volatility': 0.6
            }
        }
        
        result = await engine.analyze_psychology(
            input_text=elon_tweet,
            input_type='social',
            context=enhanced_input
        )
        
        # Should detect massive influence potential
        assert result.social_influences[0].influence_strength > 0.8, \
            "Should detect massive influence from high-profile figure"
        
        # Should predict crowd behavior
        assert result.crowd_behavior is not None, "Should predict crowd reaction"
        
        print("✅ ELON MUSK SCENARIO: PASSED")
    
    @pytest.mark.asyncio 
    async def test_crypto_winter_sentiment(self, engine):
        """❄️ Test analysis during crypto winter sentiment"""
        
        bear_market_text = """
        This crypto winter feels endless. Down 80% from ATH and no signs of 
        recovery. Maybe it's time to accept that crypto was just a bubble.
        Everyone who said 'HODL' is now silent. Institutions are leaving.
        The party is over. Time to move on to real investments.
        """
        
        enhanced_input = {
            'contextual_signals': {
                'market_volatility': 0.3,  # Low volatility in bear
                'price_change_24h': -0.05,
                'volume_change': 0.3  # Low volume
            }
        }
        
        result = await engine.analyze_psychology(
            input_text=bear_market_text,
            input_type='market',
            context=enhanced_input
        )
        
        # Should detect despair/capitulation
        assert result.emotional_state.polarity == EmotionalPolarity.BEARISH_PANIC, \
            "Should detect bearish sentiment"
        
        # Might be contrarian opportunity
        assert "contrarian" in " ".join(result.opportunities).lower() or \
               "opportunity" in " ".join(result.opportunities).lower(), \
            "Should identify potential contrarian opportunity"
        
        print("✅ CRYPTO WINTER SCENARIO: PASSED")


# Performance and stress tests
class TestPerformanceValidation:
    """⚡ Test performance and scalability"""
    
    @pytest.fixture
    async def engine(self):
        return CryptoPsychologyEngine()
    
    @pytest.mark.asyncio
    async def test_batch_analysis_performance(self, engine):
        """🚀 Test batch processing performance"""
        
        test_texts = [
            "Bitcoin to the moon! 🚀",
            "This is a scam, don't buy!",
            "Careful analysis suggests moderate upside potential",
            "FOMO buying everything right now!",
            "Market looking bearish, time to DCA",
        ] * 20  # 100 texts total
        
        start_time = datetime.now()
        
        # Process all texts
        tasks = [
            engine.analyze_psychology(text, 'general')
            for text in test_texts
        ]
        
        results = await asyncio.gather(*tasks)
        
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        
        # Performance assertions
        assert processing_time < 30, f"Should process 100 texts in under 30s: {processing_time}s"
        assert all(r is not None for r in results), "All analyses should succeed"
        
        avg_time = processing_time / len(test_texts)
        print(f"✅ BATCH PERFORMANCE: PASSED")
        print(f"   Processed {len(test_texts)} texts in {processing_time:.2f}s")
        print(f"   Average time per text: {avg_time:.3f}s")


if __name__ == "__main__":
    # Run the divine tests
    pytest.main([__file__, "-v", "--tb=short"])
