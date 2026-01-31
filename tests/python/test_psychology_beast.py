#!/usr/bin/env python3
"""
🧪 PSYCHOLOGY BEAST TESTING - REAL WORLD VALIDATION
==================================================

Testing our divine psychology engine against real crypto scenarios
to prove it's actually as good as we claim!
"""

import asyncio
import json
import time
from datetime import datetime
from typing import Dict, List, Any
import requests

# Test data - Real crypto scenarios
TEST_SCENARIOS = {
    "pump_and_dump": {
        "text": """
        🚨🚨 URGENT WHALE ALERT 🚨🚨
        
        BREAKING: Major accumulation on $SAFEMOON detected!
        🔥 INSIDER INFO: Partnership announcement in 30 MINUTES!
        💎 This will 100X - GUARANTEED MOONSHOT!
        ⏰ LAST CHANCE before EXPLOSIVE PUMP!
        
        💰 Easy 1000% gains incoming!
        🚀 Buy NOW or cry later!
        
        DM for VIP signals! Limited spots! 💌
        """,
        "expected_manipulation": True,
        "expected_confidence": 0.8
    },
    
    "fomo_retail": {
        "text": """
        I can't take it anymore! Everyone is getting rich except me. 
        My cousin made 50k on Shiba Inu and I'm still broke. All my 
        Twitter feed is people showing their gains while I'm working 
        my 9-5 like a sucker. This time I'm not missing out - I'm 
        taking out a loan and going ALL IN on the next meme coin!
        """,
        "expected_biases": ["FOMO", "HERDING_BEHAVIOR"],
        "expected_risk": "high"
    },
    
    "panic_selling": {
        "text": """
        MARKET IS CRASHING! Bitcoin down 15%! Everything is bleeding red!
        This is the end! Bear market confirmed! Sell everything NOW before
        it goes to ZERO! Fed is going to ban crypto! China banning again!
        Everyone is panic selling! Get out while you still can! SAVE YOURSELF!
        """,
        "expected_crowd": "PANIC_SELLING",
        "expected_emotion": "BEARISH_PANIC"
    },
    
    "fake_expertise": {
        "text": """
        As a Harvard MBA and former Goldman Sachs analyst with 20 years 
        of experience in traditional finance, I can tell you that this 
        new altcoin represents the future of finance. My proprietary 
        algorithm gives it a 95% probability of 50x gains. Trust my 
        expertise - I've never been wrong about these opportunities.
        """,
        "expected_manipulation": True,
        "expected_type": "APPEAL_TO_AUTHORITY"
    },
    
    "rational_analysis": {
        "text": """
        Based on the recent quarterly report, the protocol shows healthy 
        growth in TVL and user adoption. However, the valuation seems 
        stretched compared to fundamentals. I'm maintaining a small 
        position while monitoring regulatory developments. Risk management 
        remains crucial in this volatile environment.
        """,
        "expected_manipulation": False,
        "expected_emotion": "NEUTRAL"
    },
    
    "crowd_euphoria": {
        "text": """
        WE'RE ALL GOING TO MAKE IT! 🚀🚀🚀
        Crypto summer is here! Everything pumping! New ATHs every day!
        My portfolio is up 300% this month! Everyone I know is buying!
        This time is different! Mass adoption happening! We're early!
        HODL TO VALHALLA! Diamond hands forever! 💎🙌
        """,
        "expected_crowd": "IRRATIONAL_EXUBERANCE",
        "expected_emotion": "BULLISH_EUPHORIA"
    }
}

class PsychologyBeastTester:
    """🧪 Test the psychology beast with real scenarios"""
    
    def __init__(self, api_url: str = "http://localhost:8000"):
        self.api_url = api_url
        self.test_results = []
        
    async def test_scenario(self, name: str, scenario: Dict) -> Dict:
        """Test a single scenario"""
        print(f"\n🧪 Testing: {name}")
        print("=" * 50)
        
        start_time = time.time()
        
        try:
            # Make API request
            response = requests.post(
                f"{self.api_url}/analyze",
                json={
                    "input_text": scenario["text"],
                    "input_type": "general",
                    "context": {
                        "market": {
                            "price_change_24h": 0.1 if "pump" in name else -0.1,
                            "volume_change": 0.5,
                            "market_volatility": 0.7
                        }
                    }
                },
                timeout=30
            )
            
            if response.status_code != 200:
                print(f"❌ API Error: {response.status_code}")
                return {"status": "failed", "error": f"HTTP {response.status_code}"}
            
            result = response.json()
            processing_time = time.time() - start_time
            
            # Analyze results
            analysis = await self._analyze_results(name, scenario, result, processing_time)
            self.test_results.append(analysis)
            
            return analysis
            
        except Exception as e:
            print(f"❌ Test failed: {str(e)}")
            return {"status": "failed", "error": str(e)}
    
    async def _analyze_results(self, name: str, scenario: Dict, result: Dict, processing_time: float) -> Dict:
        """Analyze test results against expectations"""
        
        analysis = {
            "scenario": name,
            "processing_time": processing_time,
            "status": "passed",
            "checks": {},
            "insights": result.get("insights", []),
            "warnings": result.get("warnings", []),
            "recommendations": result.get("recommendations", [])
        }
        
        pattern = result.get("psychological_pattern", {})
        
        # Check manipulation detection
        if "expected_manipulation" in scenario:
            manipulation_detected = len(pattern.get("manipulation_tactics", [])) > 0
            expected = scenario["expected_manipulation"]
            
            analysis["checks"]["manipulation_detection"] = {
                "expected": expected,
                "actual": manipulation_detected,
                "passed": manipulation_detected == expected
            }
            
            if manipulation_detected:
                tactics = pattern.get("manipulation_tactics", [])
                print(f"🔍 Manipulation detected: {len(tactics)} tactics")
                for tactic in tactics:
                    print(f"   - {tactic.get('tactic_type', 'unknown')}: {tactic.get('confidence', 0):.2f}")
            else:
                print("✅ No manipulation detected")
        
        # Check cognitive biases
        if "expected_biases" in scenario:
            detected_biases = [bias.get("bias_type") for bias in pattern.get("cognitive_biases", [])]
            expected_biases = scenario["expected_biases"]
            
            bias_match = any(expected in detected_biases for expected in expected_biases)
            analysis["checks"]["bias_detection"] = {
                "expected": expected_biases,
                "actual": detected_biases,
                "passed": bias_match
            }
            
            if detected_biases:
                print(f"🧠 Biases detected: {detected_biases}")
            else:
                print("✅ No significant biases detected")
        
        # Check crowd behavior
        if "expected_crowd" in scenario:
            crowd_behavior = pattern.get("crowd_behavior")
            expected_crowd = scenario["expected_crowd"]
            
            if crowd_behavior:
                actual_crowd = crowd_behavior.get("behavior_type")
                crowd_match = actual_crowd == expected_crowd
                
                analysis["checks"]["crowd_prediction"] = {
                    "expected": expected_crowd,
                    "actual": actual_crowd,
                    "passed": crowd_match
                }
                
                print(f"🌊 Crowd behavior: {actual_crowd} (intensity: {crowd_behavior.get('intensity', 0):.2f})")
            else:
                analysis["checks"]["crowd_prediction"] = {
                    "expected": expected_crowd,
                    "actual": None,
                    "passed": False
                }
                print("❌ No crowd behavior detected")
        
        # Check emotional state
        if "expected_emotion" in scenario:
            emotional_state = pattern.get("emotional_state")
            expected_emotion = scenario["expected_emotion"]
            
            if emotional_state:
                actual_emotion = emotional_state.get("polarity")
                emotion_match = actual_emotion == expected_emotion
                
                analysis["checks"]["emotion_detection"] = {
                    "expected": expected_emotion,
                    "actual": actual_emotion,
                    "passed": emotion_match
                }
                
                print(f"❤️ Emotion: {actual_emotion} (intensity: {emotional_state.get('intensity', 'unknown')})")
            else:
                analysis["checks"]["emotion_detection"] = {
                    "expected": expected_emotion,
                    "actual": None,
                    "passed": False
                }
        
        # Overall confidence check
        confidence = result.get("confidence_score", 0)
        expected_confidence = scenario.get("expected_confidence", 0.5)
        
        analysis["checks"]["confidence"] = {
            "expected": f">= {expected_confidence}",
            "actual": confidence,
            "passed": confidence >= expected_confidence
        }
        
        print(f"🎯 Confidence: {confidence:.3f}")
        print(f"⏱️ Processing time: {processing_time:.3f}s")
        
        # Check if any test failed
        failed_checks = [check for check in analysis["checks"].values() if not check["passed"]]
        if failed_checks:
            analysis["status"] = "failed"
            print(f"❌ {len(failed_checks)} checks failed")
        else:
            print("✅ All checks passed!")
        
        return analysis
    
    async def run_all_tests(self) -> Dict:
        """Run all test scenarios"""
        print("🧠" * 20)
        print("🧪 PSYCHOLOGY BEAST TESTING INITIATED")
        print("🧠" * 20)
        
        start_time = time.time()
        
        # Test API availability
        try:
            health_response = requests.get(f"{self.api_url}/health", timeout=10)
            if health_response.status_code != 200:
                print(f"❌ API not available: {health_response.status_code}")
                return {"status": "failed", "error": "API not available"}
        except Exception as e:
            print(f"❌ Cannot connect to API: {str(e)}")
            return {"status": "failed", "error": str(e)}
        
        print("✅ API is healthy and responding")
        
        # Run all scenarios
        for name, scenario in TEST_SCENARIOS.items():
            await self.test_scenario(name, scenario)
            await asyncio.sleep(0.5)  # Small delay between tests
        
        total_time = time.time() - start_time
        
        # Generate summary
        summary = self._generate_summary(total_time)
        
        print("\n" + "🏆" * 20)
        print("🏆 TESTING COMPLETE - RESULTS SUMMARY")
        print("🏆" * 20)
        
        self._print_summary(summary)
        
        return summary
    
    def _generate_summary(self, total_time: float) -> Dict:
        """Generate test summary"""
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["status"] == "passed"])
        failed_tests = total_tests - passed_tests
        
        # Calculate check statistics
        all_checks = []
        for result in self.test_results:
            all_checks.extend(result["checks"].values())
        
        passed_checks = len([c for c in all_checks if c["passed"]])
        total_checks = len(all_checks)
        
        # Performance statistics
        processing_times = [r["processing_time"] for r in self.test_results if "processing_time" in r]
        avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0
        max_processing_time = max(processing_times) if processing_times else 0
        
        return {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "success_rate": (passed_tests / total_tests * 100) if total_tests > 0 else 0,
            "total_checks": total_checks,
            "passed_checks": passed_checks,
            "check_success_rate": (passed_checks / total_checks * 100) if total_checks > 0 else 0,
            "total_time": total_time,
            "avg_processing_time": avg_processing_time,
            "max_processing_time": max_processing_time,
            "detailed_results": self.test_results
        }
    
    def _print_summary(self, summary: Dict):
        """Print test summary"""
        print(f"\n📊 OVERALL RESULTS:")
        print(f"   Tests: {summary['passed_tests']}/{summary['total_tests']} passed ({summary['success_rate']:.1f}%)")
        print(f"   Checks: {summary['passed_checks']}/{summary['total_checks']} passed ({summary['check_success_rate']:.1f}%)")
        
        print(f"\n⚡ PERFORMANCE:")
        print(f"   Total time: {summary['total_time']:.2f}s")
        print(f"   Average processing: {summary['avg_processing_time']:.3f}s per analysis")
        print(f"   Max processing: {summary['max_processing_time']:.3f}s")
        
        print(f"\n🎯 DETAILED RESULTS:")
        for result in summary['detailed_results']:
            status_emoji = "✅" if result['status'] == 'passed' else "❌"
            print(f"   {status_emoji} {result['scenario']}: {result['status']}")
            
            # Show failed checks
            if result['status'] == 'failed':
                failed_checks = [name for name, check in result['checks'].items() if not check['passed']]
                if failed_checks:
                    print(f"      Failed: {', '.join(failed_checks)}")
        
        # Overall assessment
        if summary['success_rate'] >= 80:
            print(f"\n🏆 ASSESSMENT: DIVINE PERFORMANCE!")
            print(f"   The Psychology Beast is working as designed!")
        elif summary['success_rate'] >= 60:
            print(f"\n⚠️ ASSESSMENT: Good performance with room for improvement")
        else:
            print(f"\n❌ ASSESSMENT: Needs significant improvements")
        
        print(f"\n💪 COMPETITIVE ADVANTAGE:")
        if summary['success_rate'] >= 70:
            print(f"   ✅ Market domination confirmed!")
            print(f"   ✅ No competitor has this capability!")
            print(f"   ✅ Users will be amazed by the insights!")
        
        print("\n🚀 The beast has been tested - results speak for themselves!")

async def main():
    """Run the beast testing"""
    tester = PsychologyBeastTester()
    
    # Test locally first (if API is running)
    try:
        summary = await tester.run_all_tests()
        
        # Save results
        with open('psychology_test_results.json', 'w') as f:
            json.dump(summary, f, indent=2, default=str)
        
        print(f"\n💾 Results saved to: psychology_test_results.json")
        
    except KeyboardInterrupt:
        print("\n⏹️ Testing interrupted by user")
    except Exception as e:
        print(f"\n❌ Testing failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())
