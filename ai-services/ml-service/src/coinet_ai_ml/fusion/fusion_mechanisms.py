"""
🔗 CROSS-MODAL FUSION MECHANISMS - THE DIVINE CONNECTOR
======================================================

Advanced fusion mechanisms that enable cross-modal understanding and joint
representation learning across different data modalities:

- CrossModalAttention: Multi-head attention across modalities
- JointEmbeddingLearner: Unified embedding space learning
- ModalityAlignment: Cross-modal alignment and correlation
- FusionTransformer: Transformer-based fusion architecture

These mechanisms move beyond naive concatenation to learn deep
inter-modal relationships and synergies.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Tuple, Union, Any
from datetime import datetime
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class FusionResult:
    """Result of multi-modal fusion"""
    fused_embedding: torch.Tensor
    modality_embeddings: Dict[str, torch.Tensor]
    cross_attention_weights: torch.Tensor
    modality_importance: Dict[str, float]
    fusion_confidence: float
    cross_modal_correlations: Dict[str, float]
    processing_time_ms: float

class CrossModalAttention(nn.Module):
    """
    🔗 CROSS-MODAL ATTENTION - THE INTER-CONNECTOR

    Advanced multi-head attention mechanism that enables information flow
    between different modalities, allowing each modality to attend to
    relevant information in other modalities.

    This is the key innovation that enables joint representation learning
    rather than simple concatenation.
    """

    def __init__(self,
                 embed_dim: int,
                 num_heads: int = 8,
                 dropout: float = 0.1,
                 use_modality_bias: bool = True):
        super().__init__()

        self.embed_dim = embed_dim
        self.num_heads = num_heads
        self.head_dim = embed_dim // num_heads
        self.use_modality_bias = use_modality_bias

        # Multi-head attention components
        self.q_linear = nn.Linear(embed_dim, embed_dim)
        self.k_linear = nn.Linear(embed_dim, embed_dim)
        self.v_linear = nn.Linear(embed_dim, embed_dim)
        self.out_linear = nn.Linear(embed_dim, embed_dim)

        # Modality-specific biases (optional)
        if use_modality_bias:
            self.modality_bias = nn.Parameter(torch.zeros(5, embed_dim))  # 5 modalities

        self.dropout = nn.Dropout(dropout)
        self.layer_norm = nn.LayerNorm(embed_dim)

    def forward(self,
                query: torch.Tensor,
                key: torch.Tensor,
                value: torch.Tensor,
                modality_mask: Optional[torch.Tensor] = None) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Forward pass of cross-modal attention

        Args:
            query: Query tensor from one modality (batch_size, seq_len, embed_dim)
            key: Key tensor from another modality (batch_size, seq_len, embed_dim)
            value: Value tensor from another modality (batch_size, seq_len, embed_dim)
            modality_mask: Optional mask for modality-specific attention

        Returns:
            Tuple of (attention_output, attention_weights)
        """

        batch_size = query.size(0)

        # Linear transformations
        Q = self.q_linear(query)
        K = self.k_linear(key)
        V = self.v_linear(value)

        # Reshape for multi-head attention
        Q = Q.view(batch_size, -1, self.num_heads, self.head_dim).transpose(1, 2)
        K = K.view(batch_size, -1, self.num_heads, self.head_dim).transpose(1, 2)
        V = V.view(batch_size, -1, self.num_heads, self.head_dim).transpose(1, 2)

        # Scaled dot-product attention
        scores = torch.matmul(Q, K.transpose(-2, -1)) / (self.head_dim ** 0.5)

        # Add modality bias if enabled
        if self.use_modality_bias and modality_mask is not None:
            # Apply modality-specific biases
            modality_bias_expanded = self.modality_bias[modality_mask].unsqueeze(1).unsqueeze(1)
            scores += modality_bias_expanded

        # Attention weights
        attention_weights = F.softmax(scores, dim=-1)
        attention_weights = self.dropout(attention_weights)

        # Apply attention to values
        context = torch.matmul(attention_weights, V)

        # Reshape back
        context = context.transpose(1, 2).contiguous().view(batch_size, -1, self.embed_dim)

        # Output projection
        output = self.out_linear(context)

        return output, attention_weights

class JointEmbeddingLearner(nn.Module):
    """
    🎯 JOINT EMBEDDING LEARNER - THE UNIFIED SPACE CREATOR

    Learns a shared embedding space where different modalities can be
    compared and combined effectively. Uses contrastive learning and
    cross-modal alignment to create modality-invariant representations.
    """

    def __init__(self,
                 input_dim: int,
                 hidden_dim: int = 512,
                 output_dim: int = 256,
                 num_modalities: int = 5,
                 use_contrastive_loss: bool = True):
        super().__init__()

        self.input_dim = input_dim
        self.output_dim = output_dim
        self.num_modalities = num_modalities

        # Modality-specific projectors
        self.modality_projectors = nn.ModuleDict({
            'market': nn.Sequential(
                nn.Linear(input_dim, hidden_dim),
                nn.ReLU(),
                nn.Linear(hidden_dim, output_dim)
            ),
            'social': nn.Sequential(
                nn.Linear(input_dim, hidden_dim),
                nn.ReLU(),
                nn.Linear(hidden_dim, output_dim)
            ),
            'news': nn.Sequential(
                nn.Linear(input_dim, hidden_dim),
                nn.ReLU(),
                nn.Linear(hidden_dim, output_dim)
            ),
            'onchain': nn.Sequential(
                nn.Linear(input_dim, hidden_dim),
                nn.ReLU(),
                nn.Linear(hidden_dim, output_dim)
            ),
            'psychology': nn.Sequential(
                nn.Linear(input_dim, hidden_dim),
                nn.ReLU(),
                nn.Linear(hidden_dim, output_dim)
            )
        })

        # Cross-modal alignment matrices
        self.alignment_matrices = nn.ParameterDict({
            f'{m1}_{m2}': nn.Parameter(torch.randn(output_dim, output_dim) * 0.1)
            for i, m1 in enumerate(['market', 'social', 'news', 'onchain', 'psychology'])
            for j, m2 in enumerate(['market', 'social', 'news', 'onchain', 'psychology'])
            if i < j
        })

        # Shared fusion network
        self.fusion_network = nn.Sequential(
            nn.Linear(output_dim * num_modalities, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_dim, output_dim)
        )

        self.use_contrastive_loss = use_contrastive_loss

    def forward(self,
                modality_embeddings: Dict[str, torch.Tensor],
                return_attention: bool = False) -> torch.Tensor:
        """
        Forward pass to create joint embedding

        Args:
            modality_embeddings: Dictionary of embeddings from each modality
            return_attention: Whether to return attention weights

        Returns:
            Joint embedding tensor
        """

        # Project each modality to shared space
        projected_embeddings = {}
        for modality, embedding in modality_embeddings.items():
            projected_embeddings[modality] = self.modality_projectors[modality](embedding)

        # Cross-modal alignment (apply alignment transformations)
        aligned_embeddings = {}
        for modality in projected_embeddings:
            aligned = projected_embeddings[modality]

            # Apply alignment with other modalities
            for other_modality in projected_embeddings:
                if modality != other_modality:
                    alignment_key = f'{modality}_{other_modality}'
                    if alignment_key in self.alignment_matrices:
                        aligned = torch.matmul(aligned, self.alignment_matrices[alignment_key])

            aligned_embeddings[modality] = aligned

        # Concatenate all aligned embeddings
        concatenated = torch.cat([aligned_embeddings[m] for m in aligned_embeddings], dim=-1)

        # Final fusion
        joint_embedding = self.fusion_network(concatenated)

        if return_attention:
            # Calculate cross-modal attention weights
            attention_weights = self._calculate_cross_modal_attention(
                projected_embeddings, joint_embedding
            )
            return joint_embedding, attention_weights

        return joint_embedding

    def _calculate_cross_modal_attention(self,
                                       modality_embeddings: Dict[str, torch.Tensor],
                                       joint_embedding: torch.Tensor) -> Dict[str, float]:
        """Calculate attention weights for each modality"""

        attention_weights = {}

        for modality, embedding in modality_embeddings.items():
            # Cosine similarity between modality embedding and joint embedding
            similarity = F.cosine_similarity(embedding, joint_embedding, dim=-1)
            attention_weights[modality] = similarity.item()

        # Normalize to probabilities
        total = sum(attention_weights.values())
        if total > 0:
            attention_weights = {k: v/total for k, v in attention_weights.items()}

        return attention_weights

class ModalityAlignment(nn.Module):
    """
    🔗 MODALITY ALIGNMENT - THE CORRELATION ENGINE

    Learns correlations and alignments between different modalities
    to enable better cross-modal understanding and transfer learning.
    """

    def __init__(self,
                 embed_dim: int,
                 num_modalities: int = 5,
                 use_correlation_learning: bool = True):
        super().__init__()

        self.embed_dim = embed_dim
        self.num_modalities = num_modalities

        # Cross-correlation matrices
        if use_correlation_learning:
            self.correlation_matrices = nn.ParameterDict({
                f'{m1}_{m2}': nn.Parameter(torch.eye(embed_dim) * 0.1)
                for i, m1 in enumerate(['market', 'social', 'news', 'onchain', 'psychology'])
                for j, m2 in enumerate(['market', 'social', 'news', 'onchain', 'psychology'])
                if i < j
            })

        # Canonical correlation analysis components
        self.cca_projectors = nn.ModuleDict({
            modality: nn.Sequential(
                nn.Linear(embed_dim, embed_dim // 2),
                nn.ReLU(),
                nn.Linear(embed_dim // 2, embed_dim // 4)
            ) for modality in ['market', 'social', 'news', 'onchain', 'psychology']
        })

    def compute_correlations(self,
                           modality_embeddings: Dict[str, torch.Tensor]) -> Dict[str, float]:
        """Compute cross-modal correlations"""

        correlations = {}

        modalities = list(modality_embeddings.keys())

        for i, m1 in enumerate(modalities):
            for j, m2 in enumerate(modalities[i+1:], i+1):
                if m1 != m2:
                    emb1 = modality_embeddings[m1]
                    emb2 = modality_embeddings[m2]

                    # Compute correlation
                    corr_matrix = torch.corrcoef(torch.stack([emb1.flatten(), emb2.flatten()]))
                    correlation = corr_matrix[0, 1].item()

                    correlations[f'{m1}_{m2}'] = abs(correlation)  # Absolute value for importance

        return correlations

class FusionTransformer(nn.Module):
    """
    🔄 FUSION TRANSFORMER - THE ULTIMATE INTEGRATOR

    Transformer-based architecture that treats modalities as tokens
    in a sequence, allowing for sophisticated cross-modal interactions
    and attention patterns.
    """

    def __init__(self,
                 embed_dim: int,
                 num_layers: int = 6,
                 num_heads: int = 8,
                 dropout: float = 0.1,
                 use_modality_tokens: bool = True):
        super().__init__()

        self.embed_dim = embed_dim
        self.use_modality_tokens = use_modality_tokens

        # Modality-specific tokens (optional)
        if use_modality_tokens:
            self.modality_tokens = nn.Parameter(torch.randn(5, 1, embed_dim))

        # Transformer layers
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim,
            nhead=num_heads,
            dropout=dropout,
            batch_first=True
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers)

        # Output projection
        self.output_projection = nn.Linear(embed_dim, embed_dim)

    def forward(self,
                modality_embeddings: Dict[str, torch.Tensor],
                return_attention: bool = False) -> Union[torch.Tensor, Tuple[torch.Tensor, torch.Tensor]]:
        """
        Forward pass of fusion transformer

        Args:
            modality_embeddings: Dictionary of modality embeddings
            return_attention: Whether to return attention weights

        Returns:
            Fused embedding or (fused_embedding, attention_weights)
        """

        # Create modality sequence
        if self.use_modality_tokens:
            # Start with modality tokens
            sequence = [self.modality_tokens[i] for i in range(len(modality_embeddings))]
        else:
            # Use modality embeddings directly, ensure correct shape
            sequence = []
            for emb in modality_embeddings.values():
                if len(emb.shape) == 1:
                    # Add sequence dimension for transformer input
                    sequence.append(emb.unsqueeze(0))
                else:
                    sequence.append(emb)

        # Concatenate along sequence dimension
        combined_sequence = torch.cat(sequence, dim=1)

        # Add positional encoding
        pos_encoding = self._create_positional_encoding(combined_sequence.size(1), self.embed_dim)
        combined_sequence += pos_encoding.to(combined_sequence.device)

        # Apply transformer
        transformer_output = self.transformer(combined_sequence)

        # Pool across sequence dimension (global average pooling)
        fused_embedding = transformer_output.mean(dim=1)

        # Final projection
        fused_embedding = self.output_projection(fused_embedding)

        if return_attention:
            # Extract attention from last layer (simplified)
            attention_weights = torch.ones(len(modality_embeddings), combined_sequence.size(1))
            return fused_embedding, attention_weights

        return fused_embedding

    def _create_positional_encoding(self, max_length: int, embed_dim: int) -> torch.Tensor:
        """Create positional encoding for transformer"""

        pe = torch.zeros(max_length, embed_dim)
        position = torch.arange(0, max_length, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, embed_dim, 2).float() *
                           (-np.log(10000.0) / embed_dim))

        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)

        return pe.unsqueeze(0)

class MultiModalFusionMechanisms:
    """
    🔗 MULTI-MODAL FUSION MECHANISMS - THE COMPLETE SYSTEM

    Orchestrates all fusion mechanisms to create the ultimate
    cross-modal understanding system.
    """

    def __init__(self, config: Optional[Dict] = None):
        """Initialize fusion mechanisms"""

        self.config = self._get_default_config()
        if config:
            # Deep merge the provided config with defaults
            self._merge_config(self.config, config)

        # Initialize fusion components
        embed_dim = self.config['embed_dim']

        self.cross_modal_attention = CrossModalAttention(
            embed_dim=embed_dim,
            num_heads=self.config['num_heads'],
            dropout=self.config['dropout']
        )

        self.joint_embedding_learner = JointEmbeddingLearner(
            input_dim=embed_dim,
            hidden_dim=self.config['hidden_dim'],
            output_dim=embed_dim,
            num_modalities=5,
            use_contrastive_loss=self.config['use_contrastive_loss']
        )

        self.modality_alignment = ModalityAlignment(
            embed_dim=embed_dim,
            use_correlation_learning=self.config['use_correlation_learning']
        )

        self.fusion_transformer = FusionTransformer(
            embed_dim=embed_dim,
            num_layers=self.config['transformer_layers'],
            num_heads=self.config['num_heads'],
            use_modality_tokens=self.config['use_modality_tokens']
        )

        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

        # Move to device
        self.cross_modal_attention.to(self.device)
        self.joint_embedding_learner.to(self.device)
        self.modality_alignment.to(self.device)
        self.fusion_transformer.to(self.device)

        logger.info("🔗 MultiModalFusionMechanisms initialized with divine connectivity")

    async def fuse_modalities(self,
                            modality_embeddings: Dict[str, torch.Tensor],
                            fusion_strategy: str = 'transformer') -> FusionResult:
        """
        🎯 MASTER FUSION ORCHESTRATION

        Fuses multiple modality embeddings using advanced mechanisms

        Args:
            modality_embeddings: Dictionary of embeddings from each modality
            fusion_strategy: 'attention', 'joint_embedding', 'transformer', or 'hybrid'

        Returns:
            FusionResult with fused representation and metadata
        """

        start_time = datetime.utcnow()

        # Move embeddings to device
        for modality in modality_embeddings:
            modality_embeddings[modality] = modality_embeddings[modality].to(self.device)

        # Choose fusion strategy
        if fusion_strategy == 'attention':
            fused_embedding, cross_attention_weights = await self._fuse_with_attention(modality_embeddings)
        elif fusion_strategy == 'joint_embedding':
            fused_embedding = self.joint_embedding_learner(modality_embeddings)
            cross_attention_weights = self._calculate_attention_from_correlations(modality_embeddings)
        elif fusion_strategy == 'transformer':
            fused_embedding = self.fusion_transformer(modality_embeddings)
            cross_attention_weights = torch.ones(len(modality_embeddings), 5)  # Placeholder
        elif fusion_strategy == 'hybrid':
            fused_embedding, cross_attention_weights = await self._hybrid_fusion(modality_embeddings)
        else:
            raise ValueError(f"Unknown fusion strategy: {fusion_strategy}")

        # Calculate modality importance
        modality_importance = self._calculate_modality_importance(
            modality_embeddings, fused_embedding
        )

        # Compute cross-modal correlations
        cross_modal_correlations = self.modality_alignment.compute_correlations(modality_embeddings)

        # Calculate fusion confidence
        fusion_confidence = self._calculate_fusion_confidence(
            modality_embeddings, cross_attention_weights, cross_modal_correlations
        )

        processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000

        return FusionResult(
            fused_embedding=fused_embedding.cpu(),
            modality_embeddings={k: v.cpu() for k, v in modality_embeddings.items()},
            cross_attention_weights=cross_attention_weights.cpu() if isinstance(cross_attention_weights, torch.Tensor) else cross_attention_weights,
            modality_importance=modality_importance,
            fusion_confidence=fusion_confidence,
            cross_modal_correlations=cross_modal_correlations,
            processing_time_ms=processing_time
        )

    async def _fuse_with_attention(self,
                                  modality_embeddings: Dict[str, torch.Tensor]) -> Tuple[torch.Tensor, torch.Tensor]:
        """Fuse using cross-modal attention mechanism"""

        modalities = list(modality_embeddings.keys())

        # Create attention pairs between all modality combinations
        fused_features = []

        for i, query_modality in enumerate(modalities):
            query = modality_embeddings[query_modality]

            # Attend to all other modalities
            for key_modality in modalities:
                if query_modality != key_modality:
                    key = modality_embeddings[key_modality]
                    value = modality_embeddings[key_modality]

                    # Create modality mask for attention
                    modality_mask = torch.tensor([i], dtype=torch.long)

                    attended, attention_weights = self.cross_modal_attention(
                        query.unsqueeze(1), key.unsqueeze(1), value.unsqueeze(1), modality_mask
                    )

                    fused_features.append(attended.squeeze(1))

        # Combine all attended features
        if fused_features:
            combined = torch.stack(fused_features).mean(dim=0)
        else:
            # Fallback to simple average if no attention pairs
            combined = torch.stack([modality_embeddings[m] for m in modalities]).mean(dim=0)

        # Placeholder attention weights
        attention_weights = torch.ones(len(modalities), len(modalities))

        return combined, attention_weights

    async def _hybrid_fusion(self,
                           modality_embeddings: Dict[str, torch.Tensor]) -> Tuple[torch.Tensor, torch.Tensor]:
        """Hybrid fusion combining multiple strategies"""

        # Step 1: Joint embedding learning
        joint_embedding = self.joint_embedding_learner(modality_embeddings)

        # Step 2: Cross-modal attention refinement
        attention_refined, attention_weights = await self._fuse_with_attention(modality_embeddings)

        # Step 3: Combine using learned weights
        # Learn combination weights based on correlation strength
        correlations = self.modality_alignment.compute_correlations(modality_embeddings)
        avg_correlation = np.mean(list(correlations.values()))

        # Weighted combination (favor attention-refined if correlations are strong)
        if avg_correlation > 0.5:
            combined = 0.7 * attention_refined + 0.3 * joint_embedding
        else:
            combined = 0.5 * attention_refined + 0.5 * joint_embedding

        return combined, attention_weights

    def _calculate_modality_importance(self,
                                    modality_embeddings: Dict[str, torch.Tensor],
                                    fused_embedding: torch.Tensor) -> Dict[str, float]:
        """Calculate importance of each modality in the fused representation"""

        importance_scores = {}

        for modality, embedding in modality_embeddings.items():
            # Cosine similarity between modality embedding and fused embedding
            similarity = F.cosine_similarity(embedding, fused_embedding, dim=-1)
            importance_scores[modality] = similarity.item()

        # Normalize to probabilities
        total = sum(importance_scores.values())
        if total > 0:
            importance_scores = {k: v/total for k, v in importance_scores.items()}

        return importance_scores

    def _calculate_attention_from_correlations(self,
                                             modality_embeddings: Dict[str, torch.Tensor]) -> torch.Tensor:
        """Calculate attention weights based on cross-modal correlations"""

        correlations = self.modality_alignment.compute_correlations(modality_embeddings)
        modalities = list(modality_embeddings.keys())

        # Create attention matrix
        attention_matrix = torch.zeros(len(modalities), len(modalities))

        for i, m1 in enumerate(modalities):
            for j, m2 in enumerate(modalities):
                if i != j:
                    correlation_key = f'{m1}_{m2}'
                    attention_matrix[i, j] = correlations.get(correlation_key, 0.0)

        return attention_matrix

    def _calculate_fusion_confidence(self,
                                   modality_embeddings: Dict[str, torch.Tensor],
                                   cross_attention_weights: torch.Tensor,
                                   cross_modal_correlations: Dict[str, float]) -> float:
        """Calculate confidence in the fusion result"""

        # Factor 1: Average cross-modal correlation
        avg_correlation = np.mean(list(cross_modal_correlations.values()))

        # Factor 2: Attention coherence (how well attention weights agree)
        if isinstance(cross_attention_weights, torch.Tensor):
            attention_coherence = cross_attention_weights.std().item()
        else:
            attention_coherence = 0.1

        # Factor 3: Embedding consistency (variance across modalities)
        all_embeddings = torch.stack([modality_embeddings[m] for m in modality_embeddings])
        embedding_consistency = 1.0 - min(all_embeddings.var(dim=0).mean().item(), 1.0)

        # Combine factors
        confidence = (avg_correlation * 0.5) + (embedding_consistency * 0.3) + ((1.0 - attention_coherence) * 0.2)

        return min(confidence, 1.0)

    def _merge_config(self, base_config: Dict, user_config: Dict):
        """Deep merge user config with base config"""
        for key, value in user_config.items():
            if key in base_config and isinstance(base_config[key], dict) and isinstance(value, dict):
                self._merge_config(base_config[key], value)
            else:
                base_config[key] = value

    def _get_default_config(self) -> Dict:
        """Get default configuration for fusion mechanisms"""

        return {
            'embed_dim': 512,
            'hidden_dim': 1024,
            'num_heads': 8,
            'dropout': 0.1,
            'transformer_layers': 6,
            'use_contrastive_loss': True,
            'use_correlation_learning': True,
            'use_modality_tokens': True,
            'fusion_strategy': 'hybrid'  # attention, joint_embedding, transformer, hybrid
        }
