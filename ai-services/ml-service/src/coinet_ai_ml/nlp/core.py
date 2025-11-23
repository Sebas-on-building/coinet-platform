"""
🧠 ADVANCED NLP PROCESSOR - THE DIVINE CORE
==========================================

The central orchestrator for advanced natural language understanding.
This processor combines contextual embeddings, named entity recognition,
dependency parsing, and domain ontologies to achieve extraordinary
language comprehension.

DIVINE ARCHITECTURE:
- Multi-modal embedding fusion (ELMo, BERT, RoBERTa)
- Domain-aware named entity recognition
- Advanced dependency parsing with relationship extraction
- Ontology-driven context understanding
- Dynamic context management and synthesis
"""

import asyncio
import logging
from typing import Dict, List, Optional, Union, Any, Tuple
from dataclasses import dataclass, field
import numpy as np
from datetime import datetime
import json

from .embeddings import ContextualEmbeddingEngine
from .ner import NamedEntityRecognizer
from .parsing import DependencyParser
from .ontologies import CryptoDomainOntology
from .context import ContextManager
from .quantum_nlp import RevolutionaryNLPProcessor, QuantumContextResolver
from .temporal_engine import TemporalContextEngine

logger = logging.getLogger(__name__)

@dataclass
class NLPAnalysisResult:
    """Comprehensive NLP analysis result"""
    # Core text analysis
    original_text: str
    processed_text: str
    tokens: List[str]
    sentences: List[str]

    # Embedding results
    contextual_embeddings: Dict[str, np.ndarray]
    embedding_metadata: Dict[str, Any]

    # Named entity recognition
    entities: List[Dict[str, Any]]
    entity_relationships: List[Dict[str, Any]]

    # Dependency parsing
    dependency_tree: Dict[str, Any]
    syntactic_relations: List[Dict[str, Any]]
    semantic_relations: List[Dict[str, Any]]

    # Domain ontology integration
    domain_concepts: List[Dict[str, Any]]
    context_mappings: Dict[str, Any]

    # Context management
    contextual_insights: Dict[str, Any]
    domain_specific_insights: Dict[str, Any]

    # Quality metrics
    confidence_scores: Dict[str, float]
    processing_metadata: Dict[str, Any]

    # Timestamps
    processing_timestamp: datetime = field(default_factory=datetime.utcnow)
    analysis_id: str = field(default_factory=lambda: f"nlp_{int(datetime.utcnow().timestamp())}")

class AdvancedNLPProcessor:
    """
    🧠 THE DIVINE NLP PROCESSOR

    This is the crown jewel of natural language understanding - an unprecedented
    system that combines multiple advanced techniques to achieve extraordinary
    language comprehension.

    DIVINE CAPABILITIES:
    - Multi-modal contextual embeddings
    - Domain-aware named entity recognition
    - Advanced dependency parsing with relationship extraction
    - Ontology-driven context understanding
    - Dynamic context synthesis and management
    """

    def __init__(self, config: Optional[Dict] = None):
        """Initialize the divine NLP processor"""
        self.config = config or self._get_default_config()

        # Initialize divine components
        self.embedding_engine = ContextualEmbeddingEngine(self.config.get('embeddings', {}))
        self.ner_engine = NamedEntityRecognizer(self.config.get('ner', {}))
        self.dependency_parser = DependencyParser(self.config.get('parsing', {}))
        self.domain_ontology = CryptoDomainOntology(self.config.get('ontology', {}))
        self.context_manager = ContextManager(self.config.get('context', {}))
        self.quantum_processor = RevolutionaryNLPProcessor(self.config.get('quantum', {}))
        self.temporal_engine = TemporalContextEngine(self.config.get('temporal', {}))

        # Performance tracking
        self.analysis_history = []
        self.performance_metrics = {}

        logger.info("🧠 AdvancedNLPProcessor initialized with divine precision")

    async def analyze_text(self,
                          text: str,
                          context: Optional[Dict] = None,
                          domain_focus: Optional[str] = None) -> NLPAnalysisResult:
        """
        🎯 MASTER TEXT ANALYSIS

        Perform comprehensive NLP analysis combining all divine techniques.

        Args:
            text: Input text to analyze
            context: Additional context information
            domain_focus: Specific domain to focus on (crypto, finance, etc.)

        Returns:
            Comprehensive NLP analysis result
        """
        start_time = datetime.utcnow()

        try:
            logger.info(f"🔬 Starting divine NLP analysis for text length: {len(text)}")

            # Step 1: Preprocessing and basic tokenization
            preprocessed = await self._preprocess_text(text)
            tokens = await self._tokenize_text(preprocessed)
            sentences = await self._segment_sentences(preprocessed)

            # Step 2: Parallel processing of core NLP tasks
            analysis_tasks = [
                self._generate_contextual_embeddings(preprocessed, tokens),
                self._perform_named_entity_recognition(preprocessed, tokens),
                self._perform_dependency_parsing(preprocessed, tokens, sentences),
                self._apply_domain_ontology(preprocessed, tokens, sentences, domain_focus),
                self._manage_contextual_insights(preprocessed, context, domain_focus),
                self._perform_quantum_analysis(preprocessed, context, domain_focus),
                self._perform_temporal_analysis(preprocessed, context, domain_focus, [preprocessed])
            ]

            # Execute all analyses in parallel for maximum speed
            results = await asyncio.gather(*analysis_tasks, return_exceptions=True)

            # Extract results with error handling
            embedding_result = results[0] if not isinstance(results[0], Exception) else {}
            ner_result = results[1] if not isinstance(results[1], Exception) else {'entities': [], 'relationships': []}
            parsing_result = results[2] if not isinstance(results[2], Exception) else {'tree': {}, 'relations': []}
            ontology_result = results[3] if not isinstance(results[3], Exception) else {'concepts': [], 'mappings': {}}
            context_result = results[4] if not isinstance(results[4], Exception) else {'insights': {}, 'domain_insights': {}}
            quantum_result = results[5] if not isinstance(results[5], Exception) else {'method': 'classical', 'confidence': 0.5}
            temporal_result = results[6] if not isinstance(results[6], Exception) else {'temporal_context_available': False}

            # Step 3: Synthesize all insights
            synthesis_result = await self._synthesize_analysis(
                text, preprocessed, tokens, sentences,
                embedding_result, ner_result, parsing_result,
                ontology_result, context_result, quantum_result, temporal_result
            )

            # Step 4: Calculate quality metrics
            confidence_scores = await self._calculate_confidence_scores(
                embedding_result, ner_result, parsing_result, ontology_result, quantum_result, temporal_result
            )

            # Step 5: Create comprehensive result
            final_result = NLPAnalysisResult(
                original_text=text,
                processed_text=preprocessed,
                tokens=tokens,
                sentences=sentences,
                contextual_embeddings=embedding_result.get('embeddings', {}),
                embedding_metadata=embedding_result.get('metadata', {}),
                entities=ner_result.get('entities', []),
                entity_relationships=ner_result.get('relationships', []),
                dependency_tree=parsing_result.get('tree', {}),
                syntactic_relations=parsing_result.get('syntactic_relations', []),
                semantic_relations=parsing_result.get('semantic_relations', []),
                domain_concepts=ontology_result.get('concepts', []),
                context_mappings=ontology_result.get('mappings', {}),
                contextual_insights=context_result.get('insights', {}),
                domain_specific_insights=context_result.get('domain_insights', {}),
                confidence_scores=confidence_scores,
                processing_metadata={
                    'processing_time_seconds': (datetime.utcnow() - start_time).total_seconds(),
                    'text_length': len(text),
                    'token_count': len(tokens),
                    'sentence_count': len(sentences),
                    'domain_focus': domain_focus,
                    'components_used': list(self._get_active_components())
                }
            )

            # Store for learning and optimization
            await self._store_analysis_for_learning(final_result)

            logger.info(f"✅ Divine NLP analysis completed in {(datetime.utcnow() - start_time).total_seconds():.3f}s")
            return final_result

        except Exception as e:
            logger.error(f"❌ Divine NLP analysis failed: {str(e)}")
            raise

    async def _preprocess_text(self, text: str) -> str:
        """Advanced text preprocessing for divine understanding"""
        processed = text.lower().strip()

        # Normalize crypto-specific terms
        crypto_normalizations = {
            r'\$([a-zA-Z]+)': r'CRYPTO_SYMBOL_\1',  # $BTC -> CRYPTO_SYMBOL_BTC
            r'bitcoin': 'CRYPTO_BTC',
            r'ethereum': 'CRYPTO_ETH',
            r'binance coin': 'CRYPTO_BNB',
            r'cardano': 'CRYPTO_ADA',
            r'solana': 'CRYPTO_SOL',
            r'polygon': 'CRYPTO_MATIC',
            r'chainlink': 'CRYPTO_LINK',
            r'uniswap': 'CRYPTO_UNI',
            r'aave': 'CRYPTO_AAVE',
            r'compound': 'CRYPTO_COMP',
            r'makerdao': 'CRYPTO_MKR',
            r'sushiswap': 'CRYPTO_SUSHI',
            r'yearn finance': 'CRYPTO_YFI',
            r'curve dao': 'CRYPTO_CRV',
        }

        for pattern, replacement in crypto_normalizations.items():
            processed = processed.replace(pattern, replacement)

        # Normalize financial terms
        financial_terms = {
            'bullish': 'FINANCIAL_BULLISH',
            'bearish': 'FINANCIAL_BEARISH',
            'pump': 'FINANCIAL_PUMP',
            'dump': 'FINANCIAL_DUMP',
            'hodl': 'FINANCIAL_HODL',
            'rekt': 'FINANCIAL_REKT',
            'fomo': 'PSYCHOLOGICAL_FOMO',
            'fud': 'PSYCHOLOGICAL_FUD',
            'moon': 'FINANCIAL_MOON',
            'lambo': 'FINANCIAL_LAMBO',
            'diamond hands': 'PSYCHOLOGICAL_DIAMOND_HANDS',
            'paper hands': 'PSYCHOLOGICAL_PAPER_HANDS'
        }

        for term, normalized in financial_terms.items():
            processed = processed.replace(term, normalized)

        return processed

    async def _tokenize_text(self, text: str) -> List[str]:
        """Advanced tokenization with domain awareness"""
        # This would integrate with spaCy or transformers for proper tokenization
        # For now, using simple word-level tokenization
        import re

        # Remove punctuation but preserve financial symbols
        tokens = re.findall(r'\b\w+\b|\$[A-Z]+|#[A-Z]+|@\w+', text)

        # Filter out very short tokens and normalize
        filtered_tokens = [token.upper() for token in tokens if len(token) > 1]

        return filtered_tokens

    async def _segment_sentences(self, text: str) -> List[str]:
        """Advanced sentence segmentation"""
        import re

        # Split on sentence boundaries but preserve crypto-specific punctuation
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)

        # Filter out very short sentences and clean up
        filtered_sentences = [s.strip() for s in sentences if len(s.strip()) > 10]

        return filtered_sentences

    async def _generate_contextual_embeddings(self, text: str, tokens: List[str]) -> Dict:
        """Generate contextual embeddings using multiple models"""
        return await self.embedding_engine.generate_embeddings(text, tokens)

    async def _perform_named_entity_recognition(self, text: str, tokens: List[str]) -> Dict:
        """Perform named entity recognition with domain awareness"""
        return await self.ner_engine.recognize_entities(text, tokens)

    async def _perform_dependency_parsing(self, text: str, tokens: List[str], sentences: List[str]) -> Dict:
        """Perform dependency parsing and relationship extraction"""
        return await self.dependency_parser.parse_dependencies(text, tokens, sentences)

    async def _apply_domain_ontology(self, text: str, tokens: List[str], sentences: List[str], domain_focus: Optional[str]) -> Dict:
        """Apply domain ontology for enhanced understanding"""
        return await self.domain_ontology.apply_ontology(text, tokens, sentences, domain_focus)

    async def _manage_contextual_insights(self, text: str, context: Optional[Dict], domain_focus: Optional[str]) -> Dict:
        """Manage contextual insights and domain-specific understanding"""
        return await self.context_manager.generate_insights(text, context, domain_focus)

    async def _perform_temporal_analysis(self, text: str, context: Optional[Dict], domain_focus: Optional[str], text_data: List[str]) -> Dict:
        """Perform revolutionary temporal context analysis"""
        try:
            # Create market and social context for temporal analysis
            market_context = context.get('market_data', {}) if context else {}
            social_context = context.get('social_data', {}) if context else {}

            # Capture temporal snapshot
            snapshot = await self.temporal_engine.capture_temporal_snapshot(
                text_data, market_context, social_context
            )

            # Get temporal context for current analysis
            current_time = snapshot.timestamp
            temporal_context = await self.temporal_engine.get_temporal_context(current_time, lookback_hours=24)

            return {
                'snapshot': snapshot,
                'temporal_context': temporal_context,
                'evolution_rate': temporal_context.get('language_evolution', {}).get('evolution_rate', 0),
                'sentiment_trajectory': temporal_context.get('sentiment_trajectory', {}),
                'cultural_markers': temporal_context.get('cultural_markers', [])
            }
        except Exception as e:
            logger.warning(f"Temporal analysis failed: {e}")
            return {'temporal_context_available': False}

    async def _perform_quantum_analysis(self, text: str, context: Optional[Dict], domain_focus: Optional[str]) -> Dict:
        """Perform revolutionary quantum-inspired context analysis"""
        try:
            quantum_context = {
                'domain': domain_focus or 'general',
                'keywords': context.get('keywords', []) if context else [],
                'distance': context.get('distance', 1) if context else 1
            }
            return await self.quantum_processor.process_text(text, quantum_context)
        except Exception as e:
            logger.warning(f"Quantum analysis failed: {e}")
            return {'method': 'classical', 'confidence': 0.5}

    async def _synthesize_analysis(self,
                                  original_text: str,
                                  processed_text: str,
                                  tokens: List[str],
                                  sentences: List[str],
                                  embedding_result: Dict,
                                  ner_result: Dict,
                                  parsing_result: Dict,
                                  ontology_result: Dict,
                                  context_result: Dict,
                                  quantum_result: Dict,
                                  temporal_result: Dict) -> Dict:
        """Synthesize all analysis components into unified understanding"""
        synthesis = {
            'text_analysis': {
                'original_text': original_text,
                'processed_text': processed_text,
                'token_count': len(tokens),
                'sentence_count': len(sentences),
                'complexity_score': await self._calculate_text_complexity(tokens, sentences)
            },
            'embedding_synthesis': await self._synthesize_embeddings(embedding_result),
            'entity_synthesis': await self._synthesize_entities(ner_result),
            'parsing_synthesis': await self._synthesize_parsing(parsing_result),
            'ontology_synthesis': await self._synthesize_ontology(ontology_result),
            'context_synthesis': await self._synthesize_context(context_result),
            'quantum_synthesis': await self._synthesize_quantum(quantum_result),
            'temporal_synthesis': await self._synthesize_temporal(temporal_result),
            'unified_understanding': await self._generate_unified_understanding(
                embedding_result, ner_result, parsing_result, ontology_result, context_result, quantum_result, temporal_result
            )
        }

        return synthesis

    async def _calculate_text_complexity(self, tokens: List[str], sentences: List[str]) -> float:
        """Calculate text complexity score"""
        if not tokens or not sentences:
            return 0.0

        # Simple complexity metrics
        avg_tokens_per_sentence = len(tokens) / max(len(sentences), 1)
        unique_tokens_ratio = len(set(tokens)) / max(len(tokens), 1)

        # Combine metrics (0-1 scale)
        complexity = min(1.0, (avg_tokens_per_sentence * 0.1 + unique_tokens_ratio * 0.9))

        return complexity

    async def _synthesize_embeddings(self, embedding_result: Dict) -> Dict:
        """Synthesize embedding analysis results"""
        return {
            'embedding_models_used': embedding_result.get('models_used', []),
            'embedding_dimensions': embedding_result.get('dimensions', {}),
            'semantic_similarity_score': embedding_result.get('similarity_score', 0.0),
            'contextual_coherence': embedding_result.get('coherence_score', 0.0),
            'key_concepts': embedding_result.get('key_concepts', [])
        }

    async def _synthesize_entities(self, ner_result: Dict) -> Dict:
        """Synthesize named entity recognition results"""
        entities = ner_result.get('entities', [])

        return {
            'total_entities': len(entities),
            'entity_types': list(set(e.get('type', 'UNKNOWN') for e in entities)),
            'entity_confidence': np.mean([e.get('confidence', 0.0) for e in entities]) if entities else 0.0,
            'key_entities': [e for e in entities if e.get('confidence', 0) > 0.8],
            'entity_relationships': ner_result.get('relationships', [])
        }

    async def _synthesize_parsing(self, parsing_result: Dict) -> Dict:
        """Synthesize dependency parsing results"""
        return {
            'syntactic_relations_count': len(parsing_result.get('syntactic_relations', [])),
            'semantic_relations_count': len(parsing_result.get('semantic_relations', [])),
            'dependency_tree_depth': parsing_result.get('tree_depth', 0),
            'key_relations': parsing_result.get('key_relations', []),
            'parsing_confidence': parsing_result.get('confidence', 0.0)
        }

    async def _synthesize_ontology(self, ontology_result: Dict) -> Dict:
        """Synthesize ontology application results"""
        return {
            'domain_concepts_found': len(ontology_result.get('concepts', [])),
            'ontology_confidence': ontology_result.get('confidence', 0.0),
            'domain_mappings': ontology_result.get('mappings', {}),
            'contextual_enhancements': ontology_result.get('enhancements', [])
        }

    async def _synthesize_context(self, context_result: Dict) -> Dict:
        """Synthesize contextual insights"""
        return {
            'contextual_insights': context_result.get('insights', {}),
            'domain_specific_insights': context_result.get('domain_insights', {}),
            'context_confidence': context_result.get('confidence', 0.0),
            'context_breadth': len(context_result.get('insights', {}))
        }

    async def _synthesize_quantum(self, quantum_result: Dict) -> Dict:
        """Synthesize quantum analysis results"""
        return {
            'quantum_method': quantum_result.get('method', 'classical'),
            'quantum_confidence': quantum_result.get('confidence', 0.5),
            'quantum_entropy': quantum_result.get('result', {}).get('superposition_result', {}).get('quantum_entropy', 0.0),
            'ambiguity_score': quantum_result.get('result', {}).get('superposition_result', {}).get('ambiguity_score', 0.0),
            'context_confidence': quantum_result.get('result', {}).get('superposition_result', {}).get('context_confidence', 0.0),
            'primary_interpretation': quantum_result.get('result', {}).get('superposition_result', {}).get('primary_interpretation', ''),
            'alternative_interpretations': quantum_result.get('result', {}).get('superposition_result', {}).get('alternative_interpretations', [])
        }

    async def _synthesize_temporal(self, temporal_result: Dict) -> Dict:
        """Synthesize temporal analysis results"""
        return {
            'temporal_context_available': temporal_result.get('temporal_context_available', False),
            'evolution_rate': temporal_result.get('evolution_rate', 0),
            'cultural_markers': temporal_result.get('cultural_markers', []),
            'sentiment_trend': temporal_result.get('sentiment_trajectory', {}).get('sentiment_trajectory', []),
            'language_evolution': temporal_result.get('temporal_context', {}).get('language_evolution', {}),
            'predictive_insights': temporal_result.get('temporal_context', {}).get('predictive_insights', {})
        }

    async def _generate_unified_understanding(self,
                                            embedding_result: Dict,
                                            ner_result: Dict,
                                            parsing_result: Dict,
                                            ontology_result: Dict,
                                            context_result: Dict,
                                            quantum_result: Dict,
                                            temporal_result: Dict) -> Dict:
        """Generate unified understanding from all analysis components"""
        # Calculate overall understanding score
        component_scores = [
            embedding_result.get('confidence', 0.0),
            ner_result.get('confidence', 0.0),
            parsing_result.get('confidence', 0.0),
            ontology_result.get('confidence', 0.0),
            context_result.get('confidence', 0.0),
            quantum_result.get('confidence', 0.5),
            temporal_result.get('evolution_rate', 0.0)  # Temporal evolution as confidence proxy
        ]

        overall_understanding = np.mean(component_scores)

        # Generate key insights
        key_insights = await self._extract_key_insights(
            embedding_result, ner_result, parsing_result, ontology_result, context_result
        )

        return {
            'overall_understanding_score': overall_understanding,
            'key_insights': key_insights,
            'confidence_by_component': {
                'embeddings': embedding_result.get('confidence', 0.0),
                'entities': ner_result.get('confidence', 0.0),
                'parsing': parsing_result.get('confidence', 0.0),
                'ontology': ontology_result.get('confidence', 0.0),
                'context': context_result.get('confidence', 0.0)
            },
            'understanding_breadth': len(key_insights),
            'understanding_depth': await self._calculate_understanding_depth(key_insights)
        }

    async def _extract_key_insights(self, *results) -> List[str]:
        """Extract key insights from all analysis components"""
        insights = []

        embedding_result, ner_result, parsing_result, ontology_result, context_result = results

        # Entity insights
        entities = ner_result.get('entities', [])
        if entities:
            crypto_entities = [e for e in entities if e.get('type') == 'CRYPTOCURRENCY']
            if crypto_entities:
                insights.append(f"🔍 Identified {len(crypto_entities)} cryptocurrency entities")

        # Parsing insights
        relations = parsing_result.get('semantic_relations', [])
        if relations:
            financial_relations = [r for r in relations if 'FINANCIAL' in str(r)]
            if financial_relations:
                insights.append(f"🔗 Found {len(financial_relations)} financial relationship(s)")

        # Ontology insights
        concepts = ontology_result.get('concepts', [])
        if concepts:
            insights.append(f"🧠 Mapped to {len(concepts)} domain concepts")

        # Context insights
        contextual_insights = context_result.get('insights', {})
        if contextual_insights:
            insights.extend(list(contextual_insights.keys())[:3])  # Top 3 insights

        return insights[:5]  # Limit to top 5 insights

    async def _calculate_understanding_depth(self, insights: List[str]) -> float:
        """Calculate understanding depth based on insights"""
        if not insights:
            return 0.0

        # Simple depth calculation based on insight specificity
        specific_terms = ['CRYPTOCURRENCY', 'FINANCIAL', 'PSYCHOLOGICAL', 'TECHNICAL']
        depth_score = sum(1 for insight in insights if any(term in insight.upper() for term in specific_terms))

        return min(1.0, depth_score / len(insights))

    async def _calculate_confidence_scores(self,
                                         embedding_result: Dict,
                                         ner_result: Dict,
                                         parsing_result: Dict,
                                         ontology_result: Dict,
                                         quantum_result: Dict,
                                         temporal_result: Dict) -> Dict[str, float]:
        """Calculate confidence scores for each component"""
        return {
            'embeddings': embedding_result.get('confidence', 0.0),
            'named_entity_recognition': ner_result.get('confidence', 0.0),
            'dependency_parsing': parsing_result.get('confidence', 0.0),
            'ontology_application': ontology_result.get('confidence', 0.0),
            'quantum_analysis': quantum_result.get('confidence', 0.5),
            'temporal_analysis': temporal_result.get('evolution_rate', 0.0),
            'overall': np.mean([
                embedding_result.get('confidence', 0.0),
                ner_result.get('confidence', 0.0),
                parsing_result.get('confidence', 0.0),
                ontology_result.get('confidence', 0.0),
                quantum_result.get('confidence', 0.5),
                temporal_result.get('evolution_rate', 0.0)
            ])
        }

    async def _store_analysis_for_learning(self, result: NLPAnalysisResult):
        """Store analysis for continuous learning"""
        self.analysis_history.append({
            'timestamp': result.processing_timestamp,
            'analysis_id': result.analysis_id,
            'text_length': len(result.original_text),
            'confidence': result.confidence_scores.get('overall', 0.0),
            'processing_time': result.processing_metadata.get('processing_time_seconds', 0.0)
        })

        # Keep only recent history
        if len(self.analysis_history) > 1000:
            self.analysis_history = self.analysis_history[-1000:]

    def _get_active_components(self) -> List[str]:
        """Get list of currently active components"""
        components = []
        if hasattr(self.embedding_engine, 'models') and self.embedding_engine.models:
            components.append('embeddings')
        if hasattr(self.ner_engine, 'models') and self.ner_engine.models:
            components.append('ner')
        if hasattr(self.dependency_parser, 'parser') and self.dependency_parser.parser:
            components.append('parsing')
        if hasattr(self.domain_ontology, 'ontologies') and self.domain_ontology.ontologies:
            components.append('ontology')
        if hasattr(self.context_manager, 'contexts') and self.context_manager.contexts:
            components.append('context')
        return components

    def _get_default_config(self) -> Dict:
        """Get default configuration for the NLP processor"""
        return {
            'embeddings': {
                'models': ['bert-base-uncased', 'roberta-base'],
                'pooling_strategy': 'mean',
                'max_sequence_length': 512,
                'similarity_threshold': 0.8
            },
            'ner': {
                'model': 'dbmdz/bert-large-cased-finetuned-conll03-english',
                'confidence_threshold': 0.7,
                'custom_entities': ['CRYPTOCURRENCY', 'EXCHANGE', 'DEFI_PROTOCOL']
            },
            'parsing': {
                'model': 'en_core_web_sm',
                'relationship_extraction': True,
                'semantic_role_labeling': True
            },
            'ontology': {
                'domains': ['cryptocurrency', 'finance', 'psychology'],
                'similarity_threshold': 0.6,
                'context_window': 3
            },
            'context': {
                'max_context_length': 1000,
                'temporal_window': 24,
                'similarity_threshold': 0.7
            }
        }
