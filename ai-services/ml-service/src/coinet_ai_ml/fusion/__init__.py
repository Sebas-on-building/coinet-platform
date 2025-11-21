"""
🔥 MULTI-MODAL FUSION PIPELINE - THE DIVINE INTEGRATION
=======================================================

This is the crown jewel of Coinet AI - a revolutionary multi-modal fusion system
that integrates market data, social sentiment, news articles, on-chain analytics,
and user psychological profiles into a unified, intelligent prediction system.

REVOLUTIONARY ARCHITECTURE:
- Separate encoders for each modality (CNN, Transformer, GNN, Psychology)
- Cross-modal attention mechanisms for joint representation learning
- Temporal alignment for real-time signal synchronization
- Advanced fusion strategies beyond naive concatenation

"The whole is greater than the sum of its parts." - Aristotle
We make this literally true through intelligent multi-modal fusion.
"""

from .multimodal_fusion import MultiModalFusionEngine
from .encoders import CNNEncoder, TransformerEncoder, GNNEncoder, PsychologyEncoder
from .temporal_alignment import TemporalAligner
from .fusion_mechanisms import CrossModalAttention, JointEmbeddingLearner

# Test utilities and mock data
from .test_utils import MockDataGenerator, TestMetricsCollector, FusionValidator, AccuracyBenchmark

__all__ = [
    'MultiModalFusionEngine',
    'CNNEncoder',
    'TransformerEncoder',
    'GNNEncoder',
    'PsychologyEncoder',
    'TemporalAligner',
    'CrossModalAttention',
    'JointEmbeddingLearner',
    'MockDataGenerator',
    'TestMetricsCollector',
    'FusionValidator',
    'AccuracyBenchmark'
]
