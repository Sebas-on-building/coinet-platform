"""
🧠 COINET AI PSYCHOLOGY ENGINE - DIVINE PERFECTION
=================================================

Revolutionary psychological analysis for cryptocurrency markets.
This module provides unprecedented insights into market psychology,
emotional manipulation, and cognitive biases affecting crypto decisions.

BREAKTHROUGH FEATURES:
- Multi-dimensional psychological pattern detection
- Emotional manipulation identification
- Cognitive bias analysis and mitigation
- Social influence mapping
- Narrative warfare detection
- Crowd psychology prediction
- Real-time psychological profiling

"If you know the enemy and know yourself, you need not fear the result of a hundred battles." - Sun Tzu
Applied to crypto: If you understand market psychology and your own biases, you'll dominate.
"""

from .core.psychology_engine import CryptoPsychologyEngine
from .core.emotional_analyzer import EmotionalAnalyzer
from .core.manipulation_detector import ManipulationDetector
from .core.cognitive_bias_detector import CognitiveBiasDetector
from .core.social_influence_mapper import SocialInfluenceMapper
from .core.narrative_analyzer import NarrativeAnalyzer
from .core.crowd_psychology_predictor import CrowdPsychologyPredictor
from .core.psychological_profiler import PsychologicalProfiler

from .models.psychological_patterns import (
    PsychologicalPattern,
    EmotionalState,
    CognitiveBias,
    SocialInfluence,
    ManipulationTactic,
    NarrativePattern,
    CrowdBehavior,
    PsychologicalProfile
)

# Note: utils.psychology_helpers not yet implemented
# These functions would be implemented in a separate utils module

__version__ = "1.0.0"
__author__ = "Coinet AI Psychology Team"

# The Divine Trinity of Crypto Psychology
__divine_principles__ = [
    "UNDERSTAND_THE_MIND_BEHIND_THE_MONEY",
    "DETECT_MANIPULATION_BEFORE_IT_SUCCEEDS", 
    "PREDICT_CROWD_BEHAVIOR_WITH_PRECISION"
]

__all__ = [
    # Core Engine
    "CryptoPsychologyEngine",
    
    # Analyzers
    "EmotionalAnalyzer",
    "ManipulationDetector", 
    "CognitiveBiasDetector",
    "SocialInfluenceMapper",
    "NarrativeAnalyzer",
    "CrowdPsychologyPredictor",
    "PsychologicalProfiler",
    
    # Models
    "PsychologicalPattern",
    "EmotionalState",
    "CognitiveBias", 
    "SocialInfluence",
    "ManipulationTactic",
    "NarrativePattern",
    "CrowdBehavior",
    "PsychologicalProfile",
    
    # Utilities (to be implemented)
    # "analyze_linguistic_patterns",
    # "detect_emotional_triggers",
    # "identify_cognitive_distortions",
    # "map_social_connections",
    # "extract_narrative_elements"
]