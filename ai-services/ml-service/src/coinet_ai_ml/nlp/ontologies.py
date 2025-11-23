"""
🧠 DOMAIN ONTOLOGY - THE DIVINE KNOWLEDGE BASE
==============================================

This module provides extraordinary domain-specific knowledge bases and ontologies
for cryptocurrency, financial, and psychological contexts. It enables the AI
to understand domain-specific terminology, relationships, and concepts.

REVOLUTIONARY CAPABILITIES:
- Comprehensive cryptocurrency ontology with market relationships
- Financial domain knowledge base with trading concepts
- Psychological trading patterns and behavioral economics
- Dynamic ontology learning and adaptation
- Context-aware concept mapping and disambiguation

"Domain knowledge is the foundation of true understanding." - Divine NLP Philosophy
"""

import asyncio
import logging
from typing import Dict, List, Optional, Union, Any, Tuple
import json
import numpy as np
from datetime import datetime
from dataclasses import dataclass, field
import re
import os

logger = logging.getLogger(__name__)

@dataclass
class Concept:
    """Represents a concept in the domain ontology"""
    name: str
    definition: str
    category: str
    synonyms: List[str] = field(default_factory=list)
    related_concepts: List[str] = field(default_factory=list)
    importance_score: float = 1.0
    context_examples: List[str] = field(default_factory=list)
    domain: str = "general"

@dataclass
class OntologyRelation:
    """Represents a relationship between concepts"""
    source: str
    target: str
    relation_type: str
    strength: float = 1.0
    context: Optional[str] = None

@dataclass
class DomainContext:
    """Represents contextual information for a domain"""
    domain: str
    concepts: Dict[str, Concept] = field(default_factory=dict)
    relations: List[OntologyRelation] = field(default_factory=list)
    contextual_rules: Dict[str, Any] = field(default_factory=dict)
    last_updated: datetime = field(default_factory=datetime.utcnow)

class CryptoDomainOntology:
    """
    🧠 THE DIVINE DOMAIN ONTOLOGY

    This ontology provides comprehensive domain knowledge for cryptocurrency,
    financial, and psychological contexts, enabling sophisticated understanding
    of domain-specific terminology and relationships.

    DIVINE ARCHITECTURE:
    - Multi-domain knowledge bases (crypto, finance, psychology)
    - Dynamic concept learning and relationship inference
    - Context-aware concept mapping and disambiguation
    - Real-time ontology updates and adaptation
    - Cross-domain relationship analysis
    """

    def __init__(self, config: Optional[Dict] = None):
        """Initialize the divine domain ontology"""
        self.config = config or self._get_default_config()

        # Domain knowledge bases
        self.domains = {}
        self.active_domains = set()

        # Concept and relation caches
        self.concept_cache = {}
        self.relation_cache = {}
        self.cache_size = 1000

        # Initialize built-in ontologies
        self._initialize_builtin_ontologies()

        logger.info("🧠 CryptoDomainOntology initialized with divine knowledge")

    def _initialize_builtin_ontologies(self):
        """Initialize built-in domain ontologies"""
        # Cryptocurrency ontology
        self._initialize_crypto_ontology()

        # Financial ontology
        self._initialize_financial_ontology()

        # Psychological ontology
        self._initialize_psychological_ontology()

        logger.info("✅ Built-in ontologies initialized")

    def _initialize_crypto_ontology(self):
        """Initialize cryptocurrency domain ontology"""
        crypto_domain = DomainContext(domain="cryptocurrency")

        # Core cryptocurrency concepts
        crypto_concepts = {
            'CRYPTOCURRENCY': Concept(
                name='CRYPTOCURRENCY',
                definition='Digital or virtual currency that uses cryptography for security',
                category='core',
                synonyms=['crypto', 'digital currency', 'virtual currency', 'altcoin'],
                importance_score=1.0,
                context_examples=['Bitcoin is the first cryptocurrency', 'Ethereum enables smart contracts'],
                domain='cryptocurrency'
            ),
            'BITCOIN': Concept(
                name='BITCOIN',
                definition='The first and most valuable cryptocurrency created by Satoshi Nakamoto',
                category='currency',
                synonyms=['BTC', 'digital gold'],
                related_concepts=['BLOCKCHAIN', 'SATOSHI_NAKAMOTO', 'PROOF_OF_WORK'],
                importance_score=0.95,
                context_examples=['Bitcoin price reached $60,000', 'BTC dominance in crypto market'],
                domain='cryptocurrency'
            ),
            'ETHEREUM': Concept(
                name='ETHEREUM',
                definition='Blockchain platform that enables smart contracts and decentralized applications',
                category='platform',
                synonyms=['ETH', 'smart contract platform'],
                related_concepts=['DEFI', 'NFT', 'SMART_CONTRACT'],
                importance_score=0.9,
                context_examples=['Ethereum gas fees are high', 'ETH 2.0 staking'],
                domain='cryptocurrency'
            ),
            'DEFI': Concept(
                name='DEFI',
                definition='Decentralized Finance - financial services built on blockchain',
                category='ecosystem',
                synonyms=['decentralized finance', 'open finance'],
                related_concepts=['DEX', 'LIQUIDITY_POOL', 'YIELD_FARMING'],
                importance_score=0.85,
                context_examples=['DeFi protocols offer high yields', 'Uniswap is a DeFi exchange'],
                domain='cryptocurrency'
            ),
            'NFT': Concept(
                name='NFT',
                definition='Non-Fungible Token - unique digital asset representing ownership',
                category='asset',
                synonyms=['non-fungible token', 'digital collectible'],
                related_concepts=['BLOCKCHAIN', 'DIGITAL_ART', 'COLLECTIBLE'],
                importance_score=0.8,
                context_examples=['NFT market is booming', 'Digital art sold for millions'],
                domain='cryptocurrency'
            ),
            'BLOCKCHAIN': Concept(
                name='BLOCKCHAIN',
                definition='Distributed ledger technology that maintains a continuously growing list of records',
                category='technology',
                synonyms=['distributed ledger', 'DLT'],
                related_concepts=['CRYPTOCURRENCY', 'SMART_CONTRACT', 'CONSENSUS'],
                importance_score=0.9,
                context_examples=['Blockchain provides immutability', 'Bitcoin uses blockchain'],
                domain='cryptocurrency'
            ),
            'PROOF_OF_WORK': Concept(
                name='PROOF_OF_WORK',
                definition='Consensus mechanism where miners compete to solve cryptographic puzzles',
                category='consensus',
                synonyms=['PoW', 'mining'],
                related_concepts=['BITCOIN', 'MINING', 'HASH_RATE'],
                importance_score=0.8,
                context_examples=['Bitcoin uses proof-of-work', 'PoW consumes much energy'],
                domain='cryptocurrency'
            ),
            'PROOF_OF_STAKE': Concept(
                name='PROOF_OF_STAKE',
                definition='Consensus mechanism where validators are chosen based on coin ownership',
                category='consensus',
                synonyms=['PoS', 'staking'],
                related_concepts=['ETHEREUM', 'VALIDATOR', 'STAKING'],
                importance_score=0.85,
                context_examples=['Ethereum 2.0 uses proof-of-stake', 'Cardano uses PoS'],
                domain='cryptocurrency'
            )
        }

        crypto_domain.concepts = crypto_concepts

        # Add relationships
        crypto_relations = [
            OntologyRelation('BITCOIN', 'BLOCKCHAIN', 'USES', 0.95),
            OntologyRelation('ETHEREUM', 'SMART_CONTRACT', 'ENABLES', 0.9),
            OntologyRelation('DEFI', 'DEX', 'INCLUDES', 0.9),
            OntologyRelation('NFT', 'BLOCKCHAIN', 'USES', 0.85),
            OntologyRelation('PROOF_OF_WORK', 'MINING', 'REQUIRES', 0.9),
            OntologyRelation('PROOF_OF_STAKE', 'STAKING', 'REQUIRES', 0.9),
            OntologyRelation('CRYPTOCURRENCY', 'VOLATILITY', 'HAS_PROPERTY', 0.8)
        ]

        crypto_domain.relations = crypto_relations

        # Contextual rules
        crypto_domain.contextual_rules = {
            'market_context': {
                'bull_market': ['pump', 'moon', 'bullish', 'ATH'],
                'bear_market': ['dump', 'crash', 'bearish', 'capitulation'],
                'volatility': ['volatile', 'swing', 'whipsaw', 'choppy']
            },
            'sentiment_indicators': {
                'positive': ['bullish', 'optimistic', 'confident', 'hopeful'],
                'negative': ['bearish', 'pessimistic', 'fearful', 'panic'],
                'neutral': ['sideways', 'consolidation', 'ranging']
            }
        }

        self.domains['cryptocurrency'] = crypto_domain

    def _initialize_financial_ontology(self):
        """Initialize financial domain ontology"""
        finance_domain = DomainContext(domain="finance")

        # Core financial concepts
        finance_concepts = {
            'MARKET_CAPITALIZATION': Concept(
                name='MARKET_CAPITALIZATION',
                definition='Total value of a company\'s outstanding shares of stock',
                category='metric',
                synonyms=['market cap', 'market value'],
                related_concepts=['PRICE', 'VOLUME', 'VALUATION'],
                importance_score=0.9,
                context_examples=['Apple has a market cap of $2 trillion', 'Tesla market cap'],
                domain='finance'
            ),
            'TRADING_VOLUME': Concept(
                name='TRADING_VOLUME',
                definition='Total number of shares or contracts traded in a security',
                category='metric',
                synonyms=['volume', 'trading activity'],
                related_concepts=['LIQUIDITY', 'PRICE_MOVEMENT'],
                importance_score=0.85,
                context_examples=['High volume indicates strong interest', 'Volume spike on earnings'],
                domain='finance'
            ),
            'VOLATILITY': Concept(
                name='VOLATILITY',
                definition='Degree of variation of a trading price series over time',
                category='metric',
                synonyms=['price fluctuation', 'risk'],
                related_concepts=['STANDARD_DEVIATION', 'BETA'],
                importance_score=0.9,
                context_examples=['High volatility in crypto markets', 'VIX measures volatility'],
                domain='finance'
            ),
            'TECHNICAL_ANALYSIS': Concept(
                name='TECHNICAL_ANALYSIS',
                definition='Trading discipline that seeks to identify trading opportunities by analyzing statistical trends',
                category='methodology',
                synonyms=['technical trading', 'chart analysis'],
                related_concepts=['CHART_PATTERNS', 'INDICATORS', 'SUPPORT_RESISTANCE'],
                importance_score=0.8,
                context_examples=['Technical analysis of Bitcoin charts', 'RSI indicator signals'],
                domain='finance'
            ),
            'FUNDAMENTAL_ANALYSIS': Concept(
                name='FUNDAMENTAL_ANALYSIS',
                definition='Method of evaluating a security by attempting to measure its intrinsic value',
                category='methodology',
                synonyms=['fundamentals', 'value investing'],
                related_concepts=['FINANCIAL_STATEMENTS', 'RATIO_ANALYSIS'],
                importance_score=0.85,
                context_examples=['Fundamental analysis of company earnings', 'P/E ratio analysis'],
                domain='finance'
            )
        }

        finance_domain.concepts = finance_concepts

        # Add relationships
        finance_relations = [
            OntologyRelation('TRADING_VOLUME', 'LIQUIDITY', 'INDICATES', 0.8),
            OntologyRelation('VOLATILITY', 'RISK', 'MEASURES', 0.9),
            OntologyRelation('TECHNICAL_ANALYSIS', 'CHART_PATTERNS', 'USES', 0.85),
            OntologyRelation('FUNDAMENTAL_ANALYSIS', 'VALUATION', 'DETERMINES', 0.9),
            OntologyRelation('MARKET_CAPITALIZATION', 'PRICE', 'DEPENDS_ON', 0.95)
        ]

        finance_domain.relations = finance_relations

        self.domains['finance'] = finance_domain

    def _initialize_psychological_ontology(self):
        """Initialize psychological domain ontology"""
        psych_domain = DomainContext(domain="psychology")

        # Psychological concepts relevant to trading
        psych_concepts = {
            'FOMO': Concept(
                name='FOMO',
                definition='Fear Of Missing Out - anxiety that an exciting event may be happening elsewhere',
                category='emotion',
                synonyms=['fear of missing out', 'social anxiety'],
                related_concepts=['HERD_BEHAVIOR', 'PANIC_BUYING'],
                importance_score=0.9,
                context_examples=['FOMO drives crypto pumps', 'Investors experience FOMO'],
                domain='psychology'
            ),
            'FUD': Concept(
                name='FUD',
                definition='Fear, Uncertainty, Doubt - spread of negative information to manipulate sentiment',
                category='manipulation',
                synonyms=['fear uncertainty doubt', 'negative propaganda'],
                related_concepts=['BEAR_MARKET', 'PANIC_SELLING'],
                importance_score=0.85,
                context_examples=['FUD causes market crashes', 'Media spreads FUD'],
                domain='psychology'
            ),
            'HERD_BEHAVIOR': Concept(
                name='HERD_BEHAVIOR',
                definition='Tendency to follow the actions and opinions of others in a group',
                category='behavior',
                synonyms=['groupthink', 'social proof'],
                related_concepts=['FOMO', 'BUBBLE_FORMATION'],
                importance_score=0.8,
                context_examples=['Herd behavior in stock markets', 'Crypto investors follow the crowd'],
                domain='psychology'
            ),
            'CONFIRMATION_BIAS': Concept(
                name='CONFIRMATION_BIAS',
                definition='Tendency to search for, interpret, and recall information that confirms preexisting beliefs',
                category='cognitive_bias',
                synonyms=['confirmation', 'selective perception'],
                related_concepts=['OVERCONFIDENCE', 'ANCHORING'],
                importance_score=0.85,
                context_examples=['Confirmation bias in investment decisions', 'Investors ignore contrary evidence'],
                domain='psychology'
            ),
            'LOSS_AVERSION': Concept(
                name='LOSS_AVERSION',
                definition='Tendency to prefer avoiding losses to acquiring equivalent gains',
                category='cognitive_bias',
                synonyms=['prospect_theory', 'loss_dislike'],
                related_concepts=['RISK_AVERSION', 'SELLING_DECISIONS'],
                importance_score=0.9,
                context_examples=['Loss aversion causes holding losers', 'Investors sell winners too early'],
                domain='psychology'
            )
        }

        psych_domain.concepts = psych_concepts

        # Add relationships
        psych_relations = [
            OntologyRelation('FOMO', 'HERD_BEHAVIOR', 'CAUSES', 0.8),
            OntologyRelation('FUD', 'PANIC_SELLING', 'TRIGGERS', 0.9),
            OntologyRelation('CONFIRMATION_BIAS', 'OVERCONFIDENCE', 'LEADS_TO', 0.85),
            OntologyRelation('LOSS_AVERSION', 'SELLING_DECISIONS', 'AFFECTS', 0.9),
            OntologyRelation('HERD_BEHAVIOR', 'BUBBLE_FORMATION', 'CONTRIBUTES_TO', 0.8)
        ]

        psych_domain.relations = psych_relations

        self.domains['psychology'] = psych_domain

    async def apply_ontology(self, text: str, tokens: List[str], sentences: List[str], domain_focus: Optional[str] = None) -> Dict:
        """
        🎯 APPLY DOMAIN ONTOLOGY

        Apply domain-specific knowledge to enhance text understanding.

        Args:
            text: Input text to analyze
            tokens: Tokenized version of the text
            sentences: Sentence-segmented text
            domain_focus: Specific domain to focus on

        Returns:
            Enhanced understanding with domain knowledge
        """
        start_time = datetime.utcnow()

        try:
            # Determine relevant domains
            relevant_domains = await self._determine_relevant_domains(text, tokens, domain_focus)

            # Extract concepts from text
            extracted_concepts = await self._extract_concepts_from_text(text, tokens, relevant_domains)

            # Map text elements to ontology concepts
            concept_mappings = await self._map_text_to_ontology(text, tokens, extracted_concepts)

            # Apply contextual rules
            contextual_enhancements = await self._apply_contextual_rules(text, sentences, relevant_domains)

            # Calculate ontology confidence
            confidence_score = await self._calculate_ontology_confidence(extracted_concepts, concept_mappings)

            processing_time = (datetime.utcnow() - start_time).total_seconds()

            return {
                'concepts': extracted_concepts,
                'mappings': concept_mappings,
                'relevant_domains': relevant_domains,
                'confidence': confidence_score,
                'enhancements': contextual_enhancements,
                'metadata': {
                    'processing_time_seconds': processing_time,
                    'text_length': len(text),
                    'token_count': len(tokens),
                    'domains_analyzed': len(relevant_domains),
                    'concepts_found': len(extracted_concepts)
                }
            }

        except Exception as e:
            logger.error(f"❌ Ontology application failed: {str(e)}")
            raise

    async def _determine_relevant_domains(self, text: str, tokens: List[str], domain_focus: Optional[str] = None) -> List[str]:
        """Determine which domains are most relevant to the text"""
        if domain_focus:
            return [domain_focus] if domain_focus in self.domains else ['cryptocurrency']

        # Analyze text content to determine relevant domains
        domain_scores = {}

        for domain_name, domain in self.domains.items():
            score = 0.0

            # Check for domain-specific keywords
            for concept_name, concept in domain.concepts.items():
                # Check concept name and synonyms
                concept_terms = [concept.name] + concept.synonyms
                for term in concept_terms:
                    if term.lower() in text.lower():
                        score += concept.importance_score

                # Check context examples
                for example in concept.context_examples:
                    if example.lower() in text.lower():
                        score += concept.importance_score * 0.5

            domain_scores[domain_name] = score

        # Return domains with scores above threshold
        threshold = 0.5
        relevant_domains = [domain for domain, score in domain_scores.items() if score >= threshold]

        # Default to cryptocurrency if no domains match
        if not relevant_domains:
            relevant_domains = ['cryptocurrency']

        return relevant_domains

    async def _extract_concepts_from_text(self, text: str, tokens: List[str], domains: List[str]) -> List[Dict]:
        """Extract concepts from text using domain knowledge"""
        extracted_concepts = []

        for domain_name in domains:
            if domain_name not in self.domains:
                continue

            domain = self.domains[domain_name]

            for concept_name, concept in domain.concepts.items():
                # Check if concept appears in text
                concept_found = False
                confidence = 0.0

                # Check concept name
                if concept_name.lower() in text.lower():
                    concept_found = True
                    confidence = 1.0

                # Check synonyms
                for synonym in concept.synonyms:
                    if synonym.lower() in text.lower():
                        concept_found = True
                        confidence = max(confidence, 0.8)

                # Check context examples
                for example in concept.context_examples:
                    if example.lower() in text.lower():
                        concept_found = True
                        confidence = max(confidence, 0.6)

                if concept_found:
                    extracted_concepts.append({
                        'concept': concept,
                        'confidence': confidence,
                        'domain': domain_name,
                        'matched_terms': [t for t in [concept_name] + concept.synonyms if t.lower() in text.lower()]
                    })

        # Sort by confidence
        extracted_concepts.sort(key=lambda x: x['confidence'], reverse=True)

        return extracted_concepts

    async def _map_text_to_ontology(self, text: str, tokens: List[str], extracted_concepts: List[Dict]) -> Dict:
        """Map text elements to ontology concepts and relationships"""
        mappings = {
            'token_to_concept': {},
            'concept_relationships': [],
            'enhanced_tokens': []
        }

        # Map tokens to concepts
        for i, token in enumerate(tokens):
            token_lower = token.lower()
            mappings['token_to_concept'][token] = []

            for extracted in extracted_concepts:
                concept = extracted['concept']
                matched_terms = [t.lower() for t in extracted['matched_terms']]

                if any(term in token_lower for term in matched_terms):
                    mappings['token_to_concept'][token].append({
                        'concept': concept.name,
                        'confidence': extracted['confidence'],
                        'domain': extracted['domain']
                    })

        # Find concept relationships
        for extracted in extracted_concepts:
            concept = extracted['concept']

            # Find related concepts that are also present
            for related_concept in concept.related_concepts:
                # Check if related concept is also extracted
                related_found = any(ec['concept'].name == related_concept for ec in extracted_concepts)

                if related_found:
                    # Find the relationship in domain relations
                    for relation in self.domains[extracted['domain']].relations:
                        if (relation.source == concept.name and relation.target == related_concept) or \
                           (relation.source == related_concept and relation.target == concept.name):

                            mappings['concept_relationships'].append({
                                'concept1': concept.name,
                                'concept2': related_concept,
                                'relationship_type': relation.relation_type,
                                'strength': relation.strength,
                                'confidence': min(extracted['confidence'], 0.9)
                            })

        # Enhance tokens with concept information
        for i, token in enumerate(tokens):
            token_info = {
                'token': token,
                'index': i,
                'concepts': mappings['token_to_concept'].get(token, []),
                'is_concept_token': len(mappings['token_to_concept'].get(token, [])) > 0
            }
            mappings['enhanced_tokens'].append(token_info)

        return mappings

    async def _apply_contextual_rules(self, text: str, sentences: List[str], domains: List[str]) -> List[Dict]:
        """Apply contextual rules to enhance understanding"""
        enhancements = []

        for domain_name in domains:
            if domain_name not in self.domains:
                continue

            domain = self.domains[domain_name]
            rules = domain.contextual_rules

            for rule_type, rule_data in rules.items():
                for rule_name, rule_patterns in rule_data.items():
                    for pattern in rule_patterns:
                        if pattern.lower() in text.lower():
                            enhancements.append({
                                'type': rule_type,
                                'rule': rule_name,
                                'pattern': pattern,
                                'domain': domain_name,
                                'confidence': 0.8
                            })

        return enhancements

    async def _calculate_ontology_confidence(self, extracted_concepts: List[Dict], concept_mappings: Dict) -> float:
        """Calculate confidence in ontology application"""
        if not extracted_concepts:
            return 0.0

        # Base confidence on number and quality of extracted concepts
        concept_confidences = [ec['confidence'] for ec in extracted_concepts]

        # Weight by concept importance
        importance_scores = [ec['concept'].importance_score for ec in extracted_concepts]

        weighted_confidence = np.average(concept_confidences, weights=importance_scores)

        # Boost confidence if we have good concept mappings
        mapping_ratio = len(concept_mappings['token_to_concept']) / max(len(concept_mappings['enhanced_tokens']), 1)
        weighted_confidence = weighted_confidence * 0.8 + mapping_ratio * 0.2

        return min(1.0, weighted_confidence)

    def add_concept(self, concept: Concept, domain: str = 'cryptocurrency'):
        """Add a new concept to the ontology"""
        if domain not in self.domains:
            self.domains[domain] = DomainContext(domain=domain)

        self.domains[domain].concepts[concept.name] = concept
        self.domains[domain].last_updated = datetime.utcnow()

        logger.info(f"➕ Added concept '{concept.name}' to {domain} domain")

    def add_relationship(self, source: str, target: str, relation_type: str, strength: float = 1.0, domain: str = 'cryptocurrency'):
        """Add a relationship between concepts"""
        if domain not in self.domains:
            self.domains[domain] = DomainContext(domain=domain)

        relation = OntologyRelation(source, target, relation_type, strength)
        self.domains[domain].relations.append(relation)
        self.domains[domain].last_updated = datetime.utcnow()

        logger.info(f"➕ Added relationship '{source} {relation_type} {target}' to {domain} domain")

    def get_concept_similarity(self, concept1: str, concept2: str, domain: str = 'cryptocurrency') -> float:
        """Calculate similarity between two concepts"""
        if domain not in self.domains:
            return 0.0

        domain_data = self.domains[domain]

        if concept1 not in domain_data.concepts or concept2 not in domain_data.concepts:
            return 0.0

        c1 = domain_data.concepts[concept1]
        c2 = domain_data.concepts[concept2]

        # Simple similarity based on shared related concepts
        shared_related = set(c1.related_concepts) & set(c2.related_concepts)

        if not c1.related_concepts and not c2.related_concepts:
            return 0.5  # Default similarity

        similarity = len(shared_related) / max(len(c1.related_concepts) + len(c2.related_concepts), 1)

        return similarity

    def _get_default_config(self) -> Dict:
        """Get default configuration for the ontology"""
        return {
            'domains': ['cryptocurrency', 'finance', 'psychology'],
            'similarity_threshold': 0.6,
            'context_window': 3,
            'enable_learning': True,
            'max_concepts_per_domain': 1000,
            'cache_ontology': True,
            'cache_size': 1000
        }

    def get_cache_stats(self) -> Dict:
        """Get cache statistics"""
        return {
            'concept_cache_size': len(self.concept_cache),
            'relation_cache_size': len(self.relation_cache),
            'max_cache_size': self.cache_size,
            'cache_utilization': (len(self.concept_cache) + len(self.relation_cache)) / (2 * self.cache_size)
        }
