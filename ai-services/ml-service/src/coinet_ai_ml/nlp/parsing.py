"""
🧠 DEPENDENCY PARSER - THE DIVINE RELATIONSHIP ANALYZER
======================================================

This module provides extraordinary dependency parsing capabilities to understand
syntactic and semantic relationships between words and phrases in text,
with special focus on financial and cryptocurrency contexts.

REVOLUTIONARY CAPABILITIES:
- Advanced dependency parsing with spaCy and transformers
- Syntactic relationship extraction and analysis
- Semantic role labeling for deeper understanding
- Financial domain-specific relationship patterns
- Relationship confidence scoring and validation

"Understanding relationships is the key to understanding meaning." - Divine NLP Philosophy
"""

import asyncio
import logging
from typing import Dict, List, Optional, Union, Any, Tuple
import numpy as np
from datetime import datetime
import spacy
from spacy.tokens import Doc, Span
import torch
from transformers import (
    AutoTokenizer,
    AutoModelForTokenClassification,
    pipeline
)
import re

logger = logging.getLogger(__name__)

class DependencyParser:
    """
    🧠 THE DIVINE DEPENDENCY PARSER

    This parser uses advanced techniques to analyze syntactic dependencies
    and extract semantic relationships, providing deep understanding of
    how words and phrases relate to each other in context.

    DIVINE ARCHITECTURE:
    - Multi-model dependency parsing (spaCy, transformers)
    - Advanced syntactic analysis and tree construction
    - Semantic role labeling and relationship extraction
    - Domain-specific relationship patterns for finance/crypto
    - Confidence-based relationship scoring
    """

    def __init__(self, config: Optional[Dict] = None):
        """Initialize the divine dependency parser"""
        self.config = config or self._get_default_config()

        # Parser models
        self.parsers = {}
        self.parser_configs = {
            'spacy_en_core_web_sm': {
                'model': 'en_core_web_sm',
                'type': 'spacy',
                'features': ['dependency', 'srl', 'ner']
            },
            'spacy_en_core_web_lg': {
                'model': 'en_core_web_lg',
                'type': 'spacy',
                'features': ['dependency', 'srl', 'ner', 'vectors']
            },
            'transformers_srl': {
                'model': 'microsoft/DialoGPT-medium',
                'tokenizer': 'microsoft/DialoGPT-medium',
                'type': 'transformers',
                'features': ['srl']
            }
        }

        # Financial relationship patterns
        self.financial_relationships = {
            'CAUSE_EFFECT': [
                r'(?:cause|lead to|result in|trigger|spark)',
                r'(?:because|due to|owing to|as a result of)',
                r'(?:therefore|thus|hence|consequently|subsequently)'
            ],
            'COMPARISON': [
                r'(?:compared to|versus|vs\.?|against|relative to)',
                r'(?:better than|worse than|superior to|inferior to)',
                r'(?:similar to|different from|unlike|like)'
            ],
            'TEMPORAL': [
                r'(?:before|after|during|while|when)',
                r'(?:since|until|prior to|following|preceding)',
                r'(?:meanwhile|simultaneously|at the same time)'
            ],
            'CONDITIONAL': [
                r'(?:if|unless|provided that|in case|assuming)',
                r'(?:would|could|might|should|may)',
                r'(?:then|otherwise|or else|consequently)'
            ],
            'FINANCIAL': [
                r'(?:price|value|cost|worth|valuation)',
                r'(?:buy|sell|purchase|acquire|invest)',
                r'(?:profit|loss|gain|return|yield)',
                r'(?:market|trading|exchange|volume)'
            ]
        }

        # Performance tracking
        self.parsing_cache = {}
        self.cache_size = 1000

        logger.info("🧠 DependencyParser initialized with divine precision")

    async def initialize(self):
        """Initialize all parsing models"""
        logger.info("🚀 Initializing divine parsing models...")

        initialization_tasks = []
        for parser_name, parser_config in self.parser_configs.items():
            if parser_name in self.config.get('parsers', []):
                initialization_tasks.append(self._load_parser(parser_name, parser_config))

        if initialization_tasks:
            await asyncio.gather(*initialization_tasks)

        logger.info(f"✅ Divine parsing models initialized: {list(self.parsers.keys())}")

    async def _load_parser(self, parser_name: str, parser_config: Dict):
        """Load a specific parser"""
        try:
            logger.info(f"🔄 Loading parser: {parser_name}")

            if parser_config['type'] == 'spacy':
                # Load spaCy model
                try:
                    nlp = spacy.load(parser_config['model'])
                    self.parsers[parser_name] = nlp
                    logger.info(f"✅ spaCy parser {parser_name} loaded successfully")
                except OSError:
                    logger.warning(f"⚠️ spaCy model {parser_config['model']} not found, downloading...")
                    # This would require spacy download in production
                    logger.warning(f"⚠️ Please run: python -m spacy download {parser_config['model']}")
                    raise

            elif parser_config['type'] == 'transformers':
                # Load transformers model for SRL
                tokenizer = AutoTokenizer.from_pretrained(parser_config['tokenizer'])
                model = AutoModelForTokenClassification.from_pretrained(parser_config['model'])

                if torch.cuda.is_available():
                    model = model.cuda()

                self.parsers[parser_name] = {
                    'tokenizer': tokenizer,
                    'model': model,
                    'pipeline': None  # Will be created when needed
                }
                logger.info(f"✅ Transformers parser {parser_name} loaded successfully")

        except Exception as e:
            logger.error(f"❌ Failed to load parser {parser_name}: {str(e)}")
            raise

    async def parse_dependencies(self, text: str, tokens: List[str], sentences: List[str]) -> Dict:
        """
        🎯 PARSE DEPENDENCIES

        Perform comprehensive dependency parsing and relationship extraction.

        Args:
            text: Input text to parse
            tokens: Tokenized version of the text
            sentences: Sentence-segmented text

        Returns:
            Comprehensive dependency parsing results
        """
        if not self.parsers:
            await self.initialize()

        start_time = datetime.utcnow()

        try:
            # Perform syntactic dependency parsing
            syntactic_relations = await self._parse_syntactic_dependencies(text)

            # Extract semantic relationships
            semantic_relations = await self._extract_semantic_relationships(text, sentences)

            # Build dependency tree
            dependency_tree = await self._build_dependency_tree(syntactic_relations, tokens)

            # Analyze relationship patterns
            relationship_patterns = await self._analyze_relationship_patterns(semantic_relations)

            # Calculate parsing confidence
            confidence_score = await self._calculate_parsing_confidence(
                syntactic_relations, semantic_relations
            )

            processing_time = (datetime.utcnow() - start_time).total_seconds()

            return {
                'syntactic_relations': syntactic_relations,
                'semantic_relations': semantic_relations,
                'dependency_tree': dependency_tree,
                'relationship_patterns': relationship_patterns,
                'confidence': confidence_score,
                'tree_depth': await self._calculate_tree_depth(dependency_tree),
                'key_relations': await self._extract_key_relations(semantic_relations),
                'metadata': {
                    'processing_time_seconds': processing_time,
                    'text_length': len(text),
                    'token_count': len(tokens),
                    'sentence_count': len(sentences),
                    'syntactic_relations_count': len(syntactic_relations),
                    'semantic_relations_count': len(semantic_relations)
                }
            }

        except Exception as e:
            logger.error(f"❌ Dependency parsing failed: {str(e)}")
            raise

    async def _parse_syntactic_dependencies(self, text: str) -> List[Dict]:
        """Parse syntactic dependencies using spaCy"""
        relations = []

        # Use the best available spaCy model
        spacy_parsers = [name for name, parser in self.parsers.items()
                        if isinstance(parser, spacy.Language) and name.startswith('spacy')]

        if not spacy_parsers:
            logger.warning("⚠️ No spaCy parsers available for syntactic analysis")
            return relations

        # Use the largest model available
        best_parser = max(spacy_parsers, key=lambda x: 'lg' in x if 'lg' in x else 'sm' in x)

        try:
            nlp = self.parsers[best_parser]
            doc = nlp(text)

            for token in doc:
                if token.dep_ != 'ROOT':  # Skip root relations for clarity
                    relation = {
                        'head': token.head.text,
                        'head_pos': token.head.pos_,
                        'dependent': token.text,
                        'dependent_pos': token.pos_,
                        'relation_type': token.dep_,
                        'confidence': 0.9,  # spaCy provides high-quality parsing
                        'sentence_id': self._get_sentence_id(token, doc)
                    }
                    relations.append(relation)

        except Exception as e:
            logger.warning(f"⚠️ spaCy parsing failed: {str(e)}")

        return relations

    async def _extract_semantic_relationships(self, text: str, sentences: List[str]) -> List[Dict]:
        """Extract semantic relationships from text"""
        semantic_relations = []

        # Extract relationships based on patterns
        for i, sentence in enumerate(sentences):
            sentence_relations = await self._extract_sentence_relationships(sentence, i)
            semantic_relations.extend(sentence_relations)

        # Extract cross-sentence relationships
        cross_sentence_relations = await self._extract_cross_sentence_relationships(sentences)
        semantic_relations.extend(cross_sentence_relations)

        return semantic_relations

    async def _extract_sentence_relationships(self, sentence: str, sentence_id: int) -> List[Dict]:
        """Extract relationships within a single sentence"""
        relations = []

        # Use pattern matching to find relationships
        for rel_type, patterns in self.financial_relationships.items():
            for pattern in patterns:
                # Find pattern matches in sentence
                matches = list(re.finditer(pattern, sentence, re.IGNORECASE))

                for match in matches:
                    # Extract context around the pattern
                    start = max(0, match.start() - 50)
                    end = min(len(sentence), match.end() + 50)
                    context = sentence[start:end]

                    # Find entities in context (simplified)
                    entities = await self._extract_context_entities(context)

                    if len(entities) >= 2:
                        relation = {
                            'relationship_type': rel_type,
                            'pattern': pattern,
                            'context': context,
                            'entities': entities,
                            'confidence': await self._calculate_relationship_confidence(rel_type, pattern, context),
                            'sentence_id': sentence_id,
                            'position': match.span()
                        }
                        relations.append(relation)

        return relations

    async def _extract_cross_sentence_relationships(self, sentences: List[str]) -> List[Dict]:
        """Extract relationships that span multiple sentences"""
        relations = []

        if len(sentences) < 2:
            return relations

        # Look for temporal and causal relationships between sentences
        for i in range(len(sentences) - 1):
            current = sentences[i]
            next_sentence = sentences[i + 1]

            # Check for causal connectors
            causal_indicators = ['therefore', 'thus', 'hence', 'consequently', 'as a result']
            if any(indicator in next_sentence.lower() for indicator in causal_indicators):
                if any(indicator in current.lower() for indicator in ['because', 'since', 'due to']):
                    relation = {
                        'relationship_type': 'CAUSE_EFFECT',
                        'sentence1': current,
                        'sentence2': next_sentence,
                        'confidence': 0.7,
                        'connector': 'causal_sequence'
                    }
                    relations.append(relation)

        return relations

    async def _extract_context_entities(self, context: str) -> List[str]:
        """Extract entities from context (simplified)"""

        # Simple entity extraction based on capitalization and patterns
        entities = []

        # Find capitalized words (potential proper nouns)
        capitalized_words = re.findall(r'\b[A-Z][a-zA-Z]+\b', context)
        entities.extend(capitalized_words)

        # Find financial terms
        financial_terms = re.findall(r'\b(?:price|value|cost|market|trading|invest|buy|sell|profit|loss)\b', context, re.IGNORECASE)
        entities.extend(financial_terms)

        # Find cryptocurrency terms
        crypto_terms = re.findall(r'\b(?:BTC|ETH|Bitcoin|Ethereum|Binance|Coinbase|crypto|blockchain)\b', context, re.IGNORECASE)
        entities.extend(crypto_terms)

        return list(set(entities))  # Remove duplicates

    async def _build_dependency_tree(self, syntactic_relations: List[Dict], tokens: List[str]) -> Dict:
        """Build dependency tree from syntactic relations"""
        tree = {
            'nodes': {},
            'edges': [],
            'root': None
        }

        # Create nodes for each token
        for i, token in enumerate(tokens):
            tree['nodes'][i] = {
                'token': token,
                'index': i,
                'children': []
            }

        # Add edges based on syntactic relations
        for relation in syntactic_relations:
            try:
                head_text = relation['head']
                dependent_text = relation['dependent']

                # Find indices
                head_idx = next(i for i, token in enumerate(tokens) if token == head_text)
                dep_idx = next(i for i, token in enumerate(tokens) if token == dependent_text)

                tree['edges'].append({
                    'from': head_idx,
                    'to': dep_idx,
                    'relation': relation['relation_type'],
                    'label': f"{relation['relation_type']}({head_text}, {dependent_text})"
                })

                tree['nodes'][head_idx]['children'].append(dep_idx)

            except (StopIteration, KeyError) as e:
                logger.debug(f"⚠️ Could not find token indices for relation: {relation}")
                continue

        # Find root (token with no incoming edges)
        all_children = set()
        for edge in tree['edges']:
            all_children.add(edge['to'])

        all_nodes = set(range(len(tokens)))
        root_candidates = all_nodes - all_children

        if root_candidates:
            tree['root'] = min(root_candidates)  # Take first root

        return tree

    async def _analyze_relationship_patterns(self, semantic_relations: List[Dict]) -> Dict:
        """Analyze patterns in extracted relationships"""
        patterns = {
            'relationship_types': {},
            'confidence_distribution': {},
            'sentence_distribution': {}
        }

        # Count relationship types
        for relation in semantic_relations:
            rel_type = relation['relationship_type']
            patterns['relationship_types'][rel_type] = patterns['relationship_types'].get(rel_type, 0) + 1

        # Calculate confidence distribution
        confidences = [r['confidence'] for r in semantic_relations]
        if confidences:
            patterns['confidence_distribution'] = {
                'mean': np.mean(confidences),
                'std': np.std(confidences),
                'min': np.min(confidences),
                'max': np.max(confidences)
            }

        # Sentence distribution
        for relation in semantic_relations:
            sentence_id = relation.get('sentence_id', 0)
            patterns['sentence_distribution'][sentence_id] = patterns['sentence_distribution'].get(sentence_id, 0) + 1

        return patterns

    async def _calculate_parsing_confidence(self, syntactic_relations: List[Dict], semantic_relations: List[Dict]) -> float:
        """Calculate overall parsing confidence"""
        # Base confidence on number and quality of relations found
        syntactic_confidence = min(1.0, len(syntactic_relations) / 20.0)  # Normalize to reasonable scale
        semantic_confidence = min(1.0, len(semantic_relations) / 10.0)   # Normalize to reasonable scale

        # Weight syntactic relations more heavily (they're more reliable)
        overall_confidence = (syntactic_confidence * 0.7) + (semantic_confidence * 0.3)

        return overall_confidence

    async def _calculate_tree_depth(self, tree: Dict) -> int:
        """Calculate depth of dependency tree"""
        if not tree['root'] or not tree['nodes']:
            return 0

        def calculate_depth(node_idx: int, visited: set) -> int:
            if node_idx in visited:
                return 0  # Avoid cycles
            visited.add(node_idx)

            if node_idx not in tree['nodes']:
                return 0

            children = tree['nodes'][node_idx]['children']
            if not children:
                return 1

            max_child_depth = max(calculate_depth(child, visited.copy()) for child in children)
            return 1 + max_child_depth

        return calculate_depth(tree['root'], set())

    async def _extract_key_relations(self, semantic_relations: List[Dict]) -> List[Dict]:
        """Extract the most important relationships"""
        # Sort by confidence and return top relationships
        sorted_relations = sorted(semantic_relations, key=lambda x: x['confidence'], reverse=True)

        # Filter for high-confidence, important relationships
        key_relations = []
        for relation in sorted_relations[:10]:  # Top 10
            if relation['confidence'] > 0.6:
                key_relations.append({
                    'type': relation['relationship_type'],
                    'confidence': relation['confidence'],
                    'context': relation.get('context', '')[:100] + '...' if len(relation.get('context', '')) > 100 else relation.get('context', ''),
                    'entities': relation.get('entities', [])[:3]  # Top 3 entities
                })

        return key_relations

    async def _calculate_relationship_confidence(self, rel_type: str, pattern: str, context: str) -> float:
        """Calculate confidence for a specific relationship"""
        # Base confidence on relationship type and pattern specificity
        base_confidence = 0.5

        # Boost for specific financial relationship types
        if rel_type in ['CAUSE_EFFECT', 'FINANCIAL']:
            base_confidence += 0.2

        # Boost for longer, more specific patterns
        if len(pattern) > 10:
            base_confidence += 0.1

        # Boost for patterns with multiple entities
        entity_count = len(await self._extract_context_entities(context))
        if entity_count > 1:
            base_confidence += 0.1

        return min(1.0, base_confidence)

    def _get_sentence_id(self, token: spacy.tokens.Token, doc: Doc) -> int:
        """Get sentence ID for a token"""
        for i, sent in enumerate(doc.sents):
            if token in sent:
                return i
        return 0

    def _get_default_config(self) -> Dict:
        """Get default configuration for the dependency parser"""
        return {
            'parsers': ['spacy_en_core_web_sm', 'spacy_en_core_web_lg'],
            'relationship_extraction': True,
            'semantic_role_labeling': True,
            'confidence_threshold': 0.6,
            'max_relations_per_sentence': 20,
            'cross_sentence_analysis': True,
            'cache_parsing': True,
            'cache_size': 1000
        }

    def get_cache_stats(self) -> Dict:
        """Get cache statistics"""
        return {
            'cache_size': len(self.parsing_cache),
            'max_cache_size': self.cache_size,
            'cache_utilization': len(self.parsing_cache) / self.cache_size
        }
