"""
🧠 CONTEXTUAL EMBEDDING ENGINE - THE DIVINE EMBEDDING SYSTEM
============================================================

This module provides extraordinary contextual embedding capabilities using
multiple state-of-the-art models including BERT, RoBERTa, and domain-specific
fine-tuned models for cryptocurrency and financial contexts.

REVOLUTIONARY CAPABILITIES:
- Multi-model contextual embeddings (BERT, RoBERTa, FinBERT)
- Domain-specific embeddings for crypto/finance
- Advanced pooling strategies and similarity calculations
- Contextual coherence analysis
- Dynamic embedding fusion and synthesis

"Context is everything in understanding language." - Divine NLP Philosophy
"""

import asyncio
import logging
from typing import Dict, List, Optional, Union, Any, Tuple
import numpy as np
from datetime import datetime
import torch
import torch.nn.functional as F
from transformers import (
    AutoTokenizer,
    AutoModel,
    BertTokenizer,
    BertModel,
    RobertaTokenizer,
    RobertaModel,
    pipeline
)

logger = logging.getLogger(__name__)

class ContextualEmbeddingEngine:
    """
    🧠 THE DIVINE EMBEDDING ENGINE

    This engine combines multiple contextual embedding models to achieve
    extraordinary understanding of text meaning through context-aware
    representations.

    DIVINE ARCHITECTURE:
    - Multi-model ensemble (BERT, RoBERTa, FinBERT)
    - Advanced pooling strategies
    - Contextual similarity analysis
    - Domain-specific embeddings
    - Dynamic fusion and synthesis
    """

    def __init__(self, config: Optional[Dict] = None):
        """Initialize the divine embedding engine"""
        self.config = config or self._get_default_config()

        # Model configurations
        self.models = {}
        self.tokenizers = {}
        self.model_configs = {
            'bert-base-uncased': {
                'tokenizer': 'bert-base-uncased',
                'model': 'bert-base-uncased',
                'pooling': 'mean',
                'max_length': 512
            },
            'roberta-base': {
                'tokenizer': 'roberta-base',
                'model': 'roberta-base',
                'pooling': 'mean',
                'max_length': 512
            },
            'finbert-base': {
                'tokenizer': 'ProsusAI/finbert',
                'model': 'ProsusAI/finbert',
                'pooling': 'mean',
                'max_length': 512,
                'domain': 'finance'
            }
        }

        # Performance tracking
        self.embedding_cache = {}
        self.cache_size = 1000

        logger.info("🧠 ContextualEmbeddingEngine initialized with divine precision")

    async def initialize(self):
        """Initialize all embedding models"""
        logger.info("🚀 Initializing divine embedding models...")

        initialization_tasks = []
        for model_name, model_config in self.model_configs.items():
            if model_name in self.config.get('models', []):
                initialization_tasks.append(self._load_model(model_name, model_config))

        if initialization_tasks:
            await asyncio.gather(*initialization_tasks)

        logger.info(f"✅ Divine embedding models initialized: {list(self.models.keys())}")

    async def _load_model(self, model_name: str, model_config: Dict):
        """Load a specific embedding model"""
        try:
            logger.info(f"🔄 Loading model: {model_name}")

            # Load tokenizer and model
            tokenizer = AutoTokenizer.from_pretrained(model_config['tokenizer'])
            model = AutoModel.from_pretrained(model_config['model'])

            # Move to GPU if available
            if torch.cuda.is_available():
                model = model.cuda()

            self.tokenizers[model_name] = tokenizer
            self.models[model_name] = model

            logger.info(f"✅ Model {model_name} loaded successfully")

        except Exception as e:
            logger.error(f"❌ Failed to load model {model_name}: {str(e)}")
            raise

    async def generate_embeddings(self, text: str, tokens: List[str]) -> Dict:
        """
        🎯 GENERATE CONTEXTUAL EMBEDDINGS

        Generate embeddings using multiple models and synthesize results.

        Args:
            text: Input text to embed
            tokens: Tokenized version of the text

        Returns:
            Comprehensive embedding analysis results
        """
        if not self.models:
            await self.initialize()

        start_time = datetime.utcnow()

        try:
            # Generate embeddings from all available models
            embedding_tasks = []
            for model_name in self.models.keys():
                embedding_tasks.append(self._generate_single_model_embeddings(text, model_name))

            # Execute all embedding generations in parallel
            model_results = await asyncio.gather(*embedding_tasks, return_exceptions=True)

            # Filter successful results
            successful_results = []
            for i, result in enumerate(model_results):
                if not isinstance(result, Exception):
                    successful_results.append(result)
                else:
                    model_name = list(self.models.keys())[i]
                    logger.warning(f"⚠️ Model {model_name} embedding failed: {str(result)}")

            if not successful_results:
                raise Exception("All embedding models failed")

            # Synthesize embeddings
            synthesized_embeddings = await self._synthesize_embeddings(successful_results, text, tokens)

            # Calculate contextual coherence
            coherence_score = await self._calculate_contextual_coherence(synthesized_embeddings)

            # Extract key concepts
            key_concepts = await self._extract_key_concepts(synthesized_embeddings, tokens)

            processing_time = (datetime.utcnow() - start_time).total_seconds()

            return {
                'embeddings': synthesized_embeddings,
                'models_used': [r['model_name'] for r in successful_results],
                'dimensions': {name: emb.shape for name, emb in synthesized_embeddings.items()},
                'confidence': np.mean([r['confidence'] for r in successful_results]),
                'similarity_score': await self._calculate_similarity_score(synthesized_embeddings),
                'coherence_score': coherence_score,
                'key_concepts': key_concepts,
                'metadata': {
                    'processing_time_seconds': processing_time,
                    'text_length': len(text),
                    'token_count': len(tokens),
                    'models_count': len(successful_results)
                }
            }

        except Exception as e:
            logger.error(f"❌ Embedding generation failed: {str(e)}")
            raise

    async def _generate_single_model_embeddings(self, text: str, model_name: str) -> Dict:
        """Generate embeddings using a single model"""
        try:
            model = self.models[model_name]
            tokenizer = self.tokenizers[model_name]
            model_config = self.model_configs[model_name]

            # Tokenize input
            inputs = tokenizer(
                text,
                return_tensors='pt',
                truncation=True,
                max_length=model_config['max_length'],
                padding=True
            )

            # Move to GPU if available
            if torch.cuda.is_available():
                inputs = {k: v.cuda() for k, v in inputs.items()}

            # Generate embeddings
            with torch.no_grad():
                outputs = model(**inputs)

            # Apply pooling strategy
            embeddings = self._apply_pooling_strategy(
                outputs.last_hidden_state,
                inputs['attention_mask'],
                model_config['pooling']
            )

            # Calculate confidence based on attention patterns
            confidence = await self._calculate_embedding_confidence(
                outputs.attentions, inputs['attention_mask']
            )

            return {
                'model_name': model_name,
                'embeddings': embeddings.cpu().numpy(),
                'confidence': confidence,
                'tokens_used': len(inputs['input_ids'][0]),
                'domain': model_config.get('domain', 'general')
            }

        except Exception as e:
            logger.error(f"❌ Single model embedding failed for {model_name}: {str(e)}")
            raise

    def _apply_pooling_strategy(self, hidden_states: torch.Tensor, attention_mask: torch.Tensor, strategy: str) -> torch.Tensor:
        """Apply pooling strategy to get sentence-level embeddings"""
        if strategy == 'mean':
            # Mean pooling with attention mask
            masked_embeddings = hidden_states * attention_mask.unsqueeze(-1)
            summed = masked_embeddings.sum(dim=1)
            counts = attention_mask.sum(dim=1, keepdim=True)
            return summed / counts

        elif strategy == 'max':
            # Max pooling
            masked_embeddings = hidden_states * attention_mask.unsqueeze(-1)
            masked_embeddings[masked_embeddings == 0] = float('-inf')
            return masked_embeddings.max(dim=1)[0]

        elif strategy == 'cls':
            # CLS token pooling (for BERT-like models)
            return hidden_states[:, 0, :]

        else:
            # Default to mean pooling
            return self._apply_pooling_strategy(hidden_states, attention_mask, 'mean')

    async def _calculate_embedding_confidence(self, attentions: torch.Tensor, attention_mask: torch.Tensor) -> float:
        """Calculate confidence score based on attention patterns"""
        if attentions is None:
            return 0.5

        try:
            # Calculate attention entropy as a proxy for confidence
            # Lower entropy = more focused attention = higher confidence
            attention_weights = attentions[-1]  # Use last layer attention

            # Average across heads and batch
            avg_attention = attention_weights.mean(dim=1)  # [batch_size, seq_len, seq_len]
            avg_attention = avg_attention.mean(dim=0)     # [seq_len, seq_len]

            # Apply attention mask
            mask = attention_mask[0]  # [seq_len]
            masked_attention = avg_attention * mask.unsqueeze(0)
            masked_attention = masked_attention[mask.bool()]

            if len(masked_attention) == 0:
                return 0.5

            # Normalize to probabilities
            attention_probs = F.softmax(masked_attention, dim=0)

            # Calculate entropy
            entropy = -torch.sum(attention_probs * torch.log(attention_probs + 1e-12))

            # Convert entropy to confidence (lower entropy = higher confidence)
            confidence = float(1.0 / (1.0 + entropy.item()))

            return min(1.0, max(0.0, confidence))

        except Exception as e:
            logger.warning(f"⚠️ Confidence calculation failed: {str(e)}")
            return 0.5

    async def _synthesize_embeddings(self, model_results: List[Dict], text: str, tokens: List[str]) -> Dict[str, np.ndarray]:
        """Synthesize embeddings from multiple models"""
        embeddings_dict = {}

        for result in model_results:
            model_name = result['model_name']
            embeddings = result['embeddings']

            # Store individual model embeddings
            embeddings_dict[f"{model_name}_embeddings"] = embeddings

            # Apply domain-specific weighting
            domain = result.get('domain', 'general')
            if domain == 'finance':
                # Boost finance model confidence
                weight = 1.2
            else:
                weight = 1.0

            embeddings_dict[f"{model_name}_weighted"] = embeddings * weight

        # Create ensemble embedding (weighted average)
        if len(model_results) > 1:
            weighted_embeddings = []
            weights = []

            for result in model_results:
                model_name = result['model_name']
                confidence = result['confidence']
                domain = result.get('domain', 'general')

                # Calculate final weight
                base_weight = confidence
                if domain == 'finance':
                    base_weight *= 1.2

                weighted_embeddings.append(result['embeddings'] * base_weight)
                weights.append(base_weight)

            # Normalize weights
            total_weight = sum(weights)
            if total_weight > 0:
                ensemble_embedding = sum(weighted_embeddings) / total_weight
                embeddings_dict['ensemble_embedding'] = ensemble_embedding

        # Cache embeddings for future use
        cache_key = hash(text) % self.cache_size
        self.embedding_cache[cache_key] = {
            'text': text,
            'embeddings': embeddings_dict,
            'timestamp': datetime.utcnow()
        }

        return embeddings_dict

    async def _calculate_contextual_coherence(self, embeddings: Dict[str, np.ndarray]) -> float:
        """Calculate contextual coherence between different embedding models"""
        if len(embeddings) < 2:
            return 1.0

        coherence_scores = []

        # Calculate pairwise similarities between different model embeddings
        embedding_values = list(embeddings.values())
        embedding_names = list(embeddings.keys())

        for i in range(len(embedding_values)):
            for j in range(i + 1, len(embedding_values)):
                emb1 = embedding_values[i]
                emb2 = embedding_values[j]

                # Calculate cosine similarity
                similarity = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))

                # Handle NaN values
                if np.isnan(similarity):
                    similarity = 0.0

                coherence_scores.append(abs(similarity))

        return np.mean(coherence_scores) if coherence_scores else 0.5

    async def _calculate_similarity_score(self, embeddings: Dict[str, np.ndarray]) -> float:
        """Calculate overall similarity score for the embeddings"""
        if 'ensemble_embedding' not in embeddings:
            return 0.5

        ensemble_emb = embeddings['ensemble_embedding']

        # Compare with individual model embeddings
        similarities = []

        for key, emb in embeddings.items():
            if not key.endswith('_embeddings'):
                continue

            similarity = np.dot(ensemble_emb, emb) / (np.linalg.norm(ensemble_emb) * np.linalg.norm(emb))

            if not np.isnan(similarity):
                similarities.append(abs(similarity))

        return np.mean(similarities) if similarities else 0.5

    async def _extract_key_concepts(self, embeddings: Dict[str, np.ndarray], tokens: List[str]) -> List[str]:
        """Extract key concepts from embeddings and tokens"""
        key_concepts = []

        # Simple concept extraction based on token frequency and embedding analysis
        if len(tokens) > 0:
            # Filter tokens that might be concepts
            concept_candidates = [token for token in tokens if len(token) > 3]

            # Prioritize crypto/finance related tokens
            crypto_terms = ['CRYPTO', 'FINANCIAL', 'BTC', 'ETH', 'BLOCKCHAIN', 'DEFI']
            prioritized_concepts = [token for token in concept_candidates if any(term in token for term in crypto_terms)]

            key_concepts = prioritized_concepts[:5]  # Top 5 concepts

        return key_concepts

    def _get_default_config(self) -> Dict:
        """Get default configuration for the embedding engine"""
        return {
            'models': [
                'bert-base-uncased',
                'roberta-base',
                'finbert-base'
            ],
            'pooling_strategy': 'mean',
            'max_sequence_length': 512,
            'similarity_threshold': 0.8,
            'cache_embeddings': True,
            'cache_size': 1000,
            'confidence_threshold': 0.6
        }

    def get_cache_stats(self) -> Dict:
        """Get cache statistics"""
        return {
            'cache_size': len(self.embedding_cache),
            'max_cache_size': self.cache_size,
            'cache_utilization': len(self.embedding_cache) / self.cache_size
        }
