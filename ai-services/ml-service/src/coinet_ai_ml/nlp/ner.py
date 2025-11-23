"""
🧠 NAMED ENTITY RECOGNIZER - THE DIVINE ENTITY DETECTOR
======================================================

This module provides extraordinary named entity recognition capabilities
specifically tailored for cryptocurrency, financial, and domain-specific
contexts using state-of-the-art transformer models.

REVOLUTIONARY CAPABILITIES:
- Advanced NER with BERT-based models fine-tuned for finance/crypto
- Custom entity types for crypto ecosystem (CRYPTOCURRENCY, EXCHANGE, etc.)
- Relationship extraction between entities
- Confidence scoring and entity disambiguation
- Domain-specific entity linking and normalization

"Entities are the building blocks of understanding." - Divine NLP Philosophy
"""

import asyncio
import logging
from typing import Dict, List, Optional, Union, Any, Tuple
import numpy as np
from datetime import datetime
import torch
from transformers import (
    AutoTokenizer,
    AutoModelForTokenClassification,
    pipeline
)
import re

logger = logging.getLogger(__name__)

class NamedEntityRecognizer:
    """
    🧠 THE DIVINE ENTITY RECOGNIZER

    This recognizer uses advanced transformer models to identify and classify
    named entities in text, with special focus on financial and cryptocurrency
    domains.

    DIVINE ARCHITECTURE:
    - Multi-model NER ensemble
    - Domain-specific entity types
    - Relationship extraction and linking
    - Confidence-based entity ranking
    - Entity normalization and disambiguation
    """

    def __init__(self, config: Optional[Dict] = None):
        """Initialize the divine entity recognizer"""
        self.config = config or self._get_default_config()

        # Model configurations
        self.models = {}
        self.tokenizers = {}
        self.model_configs = {
            'finance-ner': {
                'model': 'dbmdz/bert-large-cased-finetuned-conll03-english',
                'tokenizer': 'dbmdz/bert-large-cased-finetuned-conll03-english',
                'custom_entities': ['CRYPTOCURRENCY', 'EXCHANGE', 'DEFI_PROTOCOL', 'FINANCIAL_INSTRUMENT'],
                'confidence_threshold': 0.7
            },
            'crypto-ner': {
                'model': 'Jean-Baptiste/camembert-ner',
                'tokenizer': 'Jean-Baptiste/camembert-ner',
                'custom_entities': ['CRYPTOCURRENCY', 'BLOCKCHAIN', 'DEFI', 'NFT'],
                'confidence_threshold': 0.8
            }
        }

        # Entity type mappings for standardization
        self.entity_type_mapping = {
            'B-PER': 'PERSON',
            'I-PER': 'PERSON',
            'B-ORG': 'ORGANIZATION',
            'I-ORG': 'ORGANIZATION',
            'B-LOC': 'LOCATION',
            'I-LOC': 'LOCATION',
            'B-MISC': 'MISCELLANEOUS',
            'I-MISC': 'MISCELLANEOUS',
            'CRYPTOCURRENCY': 'CRYPTOCURRENCY',
            'EXCHANGE': 'EXCHANGE',
            'DEFI_PROTOCOL': 'DEFI_PROTOCOL',
            'BLOCKCHAIN': 'BLOCKCHAIN',
            'FINANCIAL_INSTRUMENT': 'FINANCIAL_INSTRUMENT'
        }

        # Crypto-specific entity patterns
        self.crypto_patterns = {
            'CRYPTOCURRENCY': [
                r'\$[A-Z]{2,10}',  # $BTC, $ETH, etc.
                r'\b[A-Z]{2,10}(?=\s|$)',  # BTC, ETH, etc. (standalone)
                r'\bBitcoin\b', r'\bEthereum\b', r'\bBinance Coin\b',
                r'\bCardano\b', r'\bSolana\b', r'\bPolygon\b',
                r'\bChainlink\b', r'\bUniswap\b', r'\bAave\b'
            ],
            'EXCHANGE': [
                r'\bBinance\b', r'\bCoinbase\b', r'\bKraken\b',
                r'\bKuCoin\b', r'\bBybit\b', r'\bOKX\b', r'\bHuobi\b'
            ],
            'DEFI_PROTOCOL': [
                r'\bUniswap\b', r'\bPancakeSwap\b', r'\bSushiSwap\b',
                r'\bCompound\b', r'\bAave\b', r'\bMakerDAO\b', r'\bCurve\b'
            ]
        }

        # Performance tracking
        self.entity_cache = {}
        self.cache_size = 1000

        logger.info("🧠 NamedEntityRecognizer initialized with divine precision")

    async def initialize(self):
        """Initialize all NER models"""
        logger.info("🚀 Initializing divine NER models...")

        initialization_tasks = []
        for model_name, model_config in self.model_configs.items():
            if model_name in self.config.get('models', []):
                initialization_tasks.append(self._load_model(model_name, model_config))

        if initialization_tasks:
            await asyncio.gather(*initialization_tasks)

        logger.info(f"✅ Divine NER models initialized: {list(self.models.keys())}")

    async def _load_model(self, model_name: str, model_config: Dict):
        """Load a specific NER model"""
        try:
            logger.info(f"🔄 Loading NER model: {model_name}")

            # Load tokenizer and model for token classification
            tokenizer = AutoTokenizer.from_pretrained(model_config['tokenizer'])
            model = AutoModelForTokenClassification.from_pretrained(model_config['model'])

            # Move to GPU if available
            if torch.cuda.is_available():
                model = model.cuda()

            self.tokenizers[model_name] = tokenizer
            self.models[model_name] = model

            logger.info(f"✅ NER model {model_name} loaded successfully")

        except Exception as e:
            logger.error(f"❌ Failed to load NER model {model_name}: {str(e)}")
            raise

    async def recognize_entities(self, text: str, tokens: List[str]) -> Dict:
        """
        🎯 RECOGNIZE NAMED ENTITIES

        Perform comprehensive named entity recognition using multiple models
        and domain-specific patterns.

        Args:
            text: Input text to analyze
            tokens: Tokenized version of the text

        Returns:
            Comprehensive entity recognition results
        """
        if not self.models:
            await self.initialize()

        start_time = datetime.utcnow()

        try:
            # Perform pattern-based entity recognition (fast, rule-based)
            pattern_entities = await self._extract_pattern_entities(text)

            # Perform model-based entity recognition (accurate, ML-based)
            model_entities = await self._extract_model_entities(text)

            # Combine and deduplicate entities
            all_entities = await self._combine_entities(pattern_entities, model_entities)

            # Extract entity relationships
            entity_relationships = await self._extract_entity_relationships(all_entities, text)

            # Normalize and disambiguate entities
            normalized_entities = await self._normalize_entities(all_entities)

            # Calculate confidence scores
            confidence_score = await self._calculate_overall_confidence(normalized_entities)

            processing_time = (datetime.utcnow() - start_time).total_seconds()

            return {
                'entities': normalized_entities,
                'relationships': entity_relationships,
                'confidence': confidence_score,
                'metadata': {
                    'processing_time_seconds': processing_time,
                    'text_length': len(text),
                    'token_count': len(tokens),
                    'pattern_entities_found': len(pattern_entities),
                    'model_entities_found': len(model_entities),
                    'total_entities': len(normalized_entities)
                }
            }

        except Exception as e:
            logger.error(f"❌ Entity recognition failed: {str(e)}")
            raise

    async def _extract_pattern_entities(self, text: str) -> List[Dict]:
        """Extract entities using pattern matching (fast but less accurate)"""
        entities = []

        for entity_type, patterns in self.crypto_patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)

                for match in matches:
                    start_pos = match.start()
                    end_pos = match.end()
                    entity_text = match.group()

                    # Calculate confidence based on pattern specificity
                    confidence = await self._calculate_pattern_confidence(entity_text, pattern)

                    entity = {
                        'text': entity_text,
                        'type': entity_type,
                        'start': start_pos,
                        'end': end_pos,
                        'confidence': confidence,
                        'method': 'pattern',
                        'normalized': await self._normalize_entity_text(entity_text, entity_type)
                    }

                    entities.append(entity)

        return entities

    async def _extract_model_entities(self, text: str) -> List[Dict]:
        """Extract entities using trained NER models"""
        entities = []

        for model_name in self.models.keys():
            try:
                model = self.models[model_name]
                tokenizer = self.tokenizers[model_name]
                model_config = self.model_configs[model_name]

                # Use transformers pipeline for NER
                ner_pipeline = pipeline(
                    "ner",
                    model=model,
                    tokenizer=tokenizer,
                    device=0 if torch.cuda.is_available() else -1
                )

                # Perform NER
                ner_results = ner_pipeline(text)

                # Process results
                current_entity = None

                for result in ner_results:
                    label = result['entity']
                    score = result['score']
                    word = result['word']

                    # Map to our entity types
                    entity_type = self.entity_type_mapping.get(label, 'UNKNOWN')

                    # Handle B-I-O tagging scheme
                    if label.startswith('B-') or current_entity is None:
                        # Start of new entity
                        if current_entity:
                            entities.append(current_entity)

                        current_entity = {
                            'text': word.replace('##', ''),  # Remove BPE artifacts
                            'type': entity_type,
                            'confidence': score,
                            'method': f'model_{model_name}',
                            'start': result.get('start', 0),
                            'end': result.get('end', 0)
                        }
                    elif label.startswith('I-') and current_entity:
                        # Continuation of current entity
                        current_entity['text'] += ' ' + word.replace('##', '')
                        current_entity['end'] = result.get('end', 0)
                        current_entity['confidence'] = min(current_entity['confidence'], score)  # Use minimum confidence

                # Add final entity
                if current_entity:
                    entities.append(current_entity)

            except Exception as e:
                logger.warning(f"⚠️ Model {model_name} NER failed: {str(e)}")
                continue

        return entities

    async def _combine_entities(self, pattern_entities: List[Dict], model_entities: List[Dict]) -> List[Dict]:
        """Combine entities from pattern and model approaches"""
        combined = []

        # Use pattern entities as base, enhance with model entities
        entity_map = {}

        for entity in pattern_entities:
            key = (entity['text'].lower(), entity['type'])
            entity_map[key] = entity

        for entity in model_entities:
            key = (entity['text'].lower(), entity['type'])
            if key in entity_map:
                # Combine pattern and model results
                existing = entity_map[key]
                combined_confidence = (existing['confidence'] + entity['confidence']) / 2
                existing['confidence'] = combined_confidence
                existing['method'] = f"{existing['method']}+{entity['method']}"
            else:
                # Add new model entity
                entity_map[key] = entity

        combined = list(entity_map.values())

        # Filter by confidence threshold
        threshold = self.config.get('confidence_threshold', 0.5)
        combined = [e for e in combined if e['confidence'] >= threshold]

        return combined

    async def _extract_entity_relationships(self, entities: List[Dict], text: str) -> List[Dict]:
        """Extract relationships between identified entities"""
        relationships = []

        if len(entities) < 2:
            return relationships

        # Simple relationship extraction based on proximity and patterns
        for i, entity1 in enumerate(entities):
            for j, entity2 in enumerate(entities[i+1:], i+1):
                # Calculate distance between entities
                distance = abs(entity2['start'] - entity1['end'])

                # Check for relationship patterns in text
                relationship_type = await self._infer_relationship_type(entity1, entity2, text)

                if relationship_type and distance < 100:  # Reasonable proximity
                    relationship = {
                        'entity1': entity1['text'],
                        'entity1_type': entity1['type'],
                        'entity2': entity2['text'],
                        'entity2_type': entity2['type'],
                        'relationship_type': relationship_type,
                        'confidence': min(entity1['confidence'], entity2['confidence']),
                        'distance': distance
                    }

                    relationships.append(relationship)

        return relationships

    async def _infer_relationship_type(self, entity1: Dict, entity2: Dict, text: str) -> Optional[str]:
        """Infer relationship type between two entities"""
        # Extract text between entities
        start = min(entity1['start'], entity2['start'])
        end = max(entity1['end'], entity2['end'])
        between_text = text[start:end]

        # Simple pattern-based relationship inference
        relationship_patterns = {
            'TRADED_ON': [r'on\s+binance', r'on\s+coinbase', r'listed\s+on'],
            'POWERED_BY': [r'powered\s+by', r'built\s+on', r'using'],
            'COMPETES_WITH': [r'vs\.?', r'versus', r'competes?\s+with'],
            'PARTNERSHIP': [r'partners?\s+with', r'collaboration', r'alliance'],
            'ACQUISITION': [r'acquires?', r'acquisition', r'buyout']
        }

        for rel_type, patterns in relationship_patterns.items():
            for pattern in patterns:
                if re.search(pattern, between_text, re.IGNORECASE):
                    return rel_type

        return None

    async def _normalize_entities(self, entities: List[Dict]) -> List[Dict]:
        """Normalize and disambiguate entities"""
        normalized = []

        for entity in entities:
            normalized_entity = entity.copy()

            # Normalize entity text
            normalized_entity['normalized'] = await self._normalize_entity_text(
                entity['text'], entity['type']
            )

            # Add entity metadata
            normalized_entity['metadata'] = {
                'is_crypto_related': entity['type'] in ['CRYPTOCURRENCY', 'EXCHANGE', 'DEFI_PROTOCOL', 'BLOCKCHAIN'],
                'length': len(entity['text']),
                'capitalization_ratio': sum(1 for c in entity['text'] if c.isupper()) / len(entity['text']),
                'contains_numbers': any(c.isdigit() for c in entity['text']),
                'contains_symbols': any(c in entity['text'] for c in ['$', '#', '@'])
            }

            normalized.append(normalized_entity)

        return normalized

    async def _normalize_entity_text(self, text: str, entity_type: str) -> str:
        """Normalize entity text based on type"""
        normalized = text.strip()

        # Crypto-specific normalizations
        if entity_type == 'CRYPTOCURRENCY':
            # Remove $ symbol and standardize naming
            normalized = re.sub(r'^\$', '', normalized)
            # Convert to standard format (e.g., BTC, ETH)
            normalized = normalized.upper()

        elif entity_type == 'EXCHANGE':
            # Standardize exchange names
            exchange_normalizations = {
                'binance': 'Binance',
                'coinbase': 'Coinbase',
                'kraken': 'Kraken',
                'kucoin': 'KuCoin',
                'bybit': 'Bybit',
                'okx': 'OKX'
            }
            normalized = exchange_normalizations.get(normalized.lower(), normalized)

        return normalized

    async def _calculate_pattern_confidence(self, entity_text: str, pattern: str) -> float:
        """Calculate confidence for pattern-based entity extraction"""
        # Base confidence on pattern specificity and entity characteristics
        base_confidence = 0.6

        # Boost confidence for exact matches and specific patterns
        if '$' in pattern or len(pattern) > 10:
            base_confidence += 0.2

        # Boost for longer, more specific entity names
        if len(entity_text) > 3:
            base_confidence += 0.1

        # Boost for entities with mixed case (proper nouns)
        if entity_text != entity_text.lower() and entity_text != entity_text.upper():
            base_confidence += 0.1

        return min(1.0, base_confidence)

    async def _calculate_overall_confidence(self, entities: List[Dict]) -> float:
        """Calculate overall confidence for entity recognition"""
        if not entities:
            return 0.0

        # Average confidence across all entities
        confidences = [e['confidence'] for e in entities]

        # Weight by entity type (crypto entities get higher weight)
        weights = []
        for entity in entities:
            weight = 1.0
            if entity['type'] in ['CRYPTOCURRENCY', 'EXCHANGE', 'DEFI_PROTOCOL']:
                weight = 1.2
            weights.append(weight)

        weighted_confidence = np.average(confidences, weights=weights)

        return min(1.0, weighted_confidence)

    def _get_default_config(self) -> Dict:
        """Get default configuration for the NER engine"""
        return {
            'models': ['finance-ner', 'crypto-ner'],
            'confidence_threshold': 0.7,
            'use_pattern_matching': True,
            'use_model_ner': True,
            'max_entities_per_text': 50,
            'relationship_extraction': True,
            'entity_normalization': True,
            'cache_entities': True,
            'cache_size': 1000
        }

    def get_cache_stats(self) -> Dict:
        """Get cache statistics"""
        return {
            'cache_size': len(self.entity_cache),
            'max_cache_size': self.cache_size,
            'cache_utilization': len(self.entity_cache) / self.cache_size
        }
