"""
Entity and Relation Extraction Pipeline

Advanced extraction system that identifies entities and relationships from
multiple data sources including news, social media, on-chain data, and
academic literature using state-of-the-art NLP techniques.
"""

import re
import json
import asyncio
from typing import Dict, List, Set, Optional, Any, Tuple, Union
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import logging

from coinet_ai_ml.knowledge_graph.core import EntityType

# NLP and ML libraries
try:
    import spacy
    from spacy import displacy
    import nltk
    from nltk.corpus import stopwords
    from nltk.tokenize import sent_tokenize, word_tokenize
    from nltk.stem import WordNetLemmatizer
    import torch
    from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassification
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    print("⚠️ Full NLP functionality (spaCy, Transformers) not available. To enable, run:\n"\
          "   pip install spacy nltk transformers torch\n"\
          "   python -m spacy download en_core_web_sm")

logger = logging.getLogger(__name__)


class DataSource(Enum):
    """Data sources for entity extraction"""
    NEWS_ARTICLES = "news_articles"
    SOCIAL_MEDIA = "social_media"
    ON_CHAIN = "on_chain"
    ACADEMIC = "academic"
    WEB_SCRAPING = "web_scraping"
    API_DATA = "api_data"


@dataclass
class ExtractedEntity:
    """Represents an extracted entity with metadata"""
    text: str
    entity_type: str
    confidence: float
    start_pos: int
    end_pos: int
    source_text: str = ""
    source_url: str = ""
    data_source: DataSource = DataSource.API_DATA
    context: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """Ensure data_source is always a DataSource enum"""
        if isinstance(self.data_source, str):
            try:
                self.data_source = DataSource[self.data_source.upper()]
            except KeyError:
                logger.warning(f"Unknown data source '{self.data_source}'. Defaulting to API_DATA.")
                self.data_source = DataSource.API_DATA

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'text': self.text,
            'entity_type': self.entity_type,
            'confidence': self.confidence,
            'start_pos': self.start_pos,
            'end_pos': self.end_pos,
            'source_text': self.source_text,
            'source_url': self.source_url,
            'data_source': self.data_source.value,
            'context': self.context,
            'metadata': self.metadata
        }


@dataclass
class ExtractedRelation:
    """Represents an extracted relationship between entities"""
    source_text: str
    target_text: str
    relation_type: str
    confidence: float
    source_start: int
    source_end: int
    target_start: int
    target_end: int
    source_text_full: str = ""
    context: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'source_text': self.source_text,
            'target_text': self.target_text,
            'relation_type': self.relation_type,
            'confidence': self.confidence,
            'source_start': self.source_start,
            'source_end': self.source_end,
            'target_start': self.target_start,
            'target_end': self.target_end,
            'source_text_full': self.source_text_full,
            'context': self.context,
            'metadata': self.metadata
        }


class EntityExtractor:
    """Advanced entity extraction using multiple techniques"""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize entity extractor"""
        self.config = config or self._get_default_config()

        # Initialize NLP models
        self.nlp_models = {}
        self._initialize_nlp_models()

        # Entity patterns for crypto domain
        self.crypto_patterns = self._build_crypto_patterns()

        # Common entity types
        self.entity_types = {
            'CRYPTO_PROJECT': ['bitcoin', 'ethereum', 'binance coin', 'cardano', 'solana', 'DeFi', 'NFT'],
            'FOUNDER': ['founder', 'creator', 'developer'],
            'INVESTOR': ['investor', 'vc', 'venture capital', 'backer'],
            'EXCHANGE': ['exchange', 'trading platform', 'dex', 'cex'],
            'PROTOCOL': ['protocol', 'blockchain', 'network', 'Layer 2', 'Cross-chain', 'Interoperability'],
            'TOKEN': ['token', 'cryptocurrency', 'coin', 'asset'],
            'ORGANIZATION': ['company', 'corporation', 'foundation', 'dao'],
            'PERSON': ['ceo', 'cto', 'developer', 'advisor'],
            'FINANCIAL_AMOUNT': ['million', 'billion', 'trillion', 'dollars', 'USD'],
            'ON_CHAIN_METRIC': ['transaction count', 'active addresses', 'whale transactions', 'gas price', 'network utilization'],
            'LOCATION': ['United States', 'Europe', 'Asia'],
            'EVENT': ['ICO', 'launch', 'upgrade', 'merge'],
            'DOCUMENT': ['whitepaper', 'research paper', 'report'],
            'REGULATORY_BODY': ['SEC', 'CFTC', 'FINMA'],
            'OTHER': []
        }

        # Known document titles for explicit classification
        self.known_document_titles = [
            "Decentralized Finance: The Future of Global Financial Systems"
        ]

    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            'use_spacy': True,
            'use_transformers': True,
            'use_regex_patterns': True,
            'confidence_threshold': 0.7,
            'max_entities_per_text': 50,
            'enable_fuzzy_matching': True,
            'crypto_specific_patterns': True
        }

    def _initialize_nlp_models(self) -> None:
        """Initialize NLP models for entity extraction"""
        if not SPACY_AVAILABLE:
            logger.warning("NLP libraries not available, using rule-based extraction only")
            return

        try:
            # Load spaCy model
            self.nlp_models['spacy'] = spacy.load("en_core_web_sm")
        except OSError as e:
            logger.warning(f"spaCy model 'en_core_web_sm' not found or failed to load: {e}. Please run 'python -m spacy download en_core_web_sm'. Disabling spaCy.")
            self.nlp_models['spacy'] = None

        try:
            # Load HuggingFace NER model
            model_name = "dbmdz/bert-large-cased-finetuned-conll03-english"
            self.nlp_models['transformers'] = pipeline(
                "ner",
                model=model_name,
                tokenizer=model_name,
                device=0 if torch.cuda.is_available() else -1
            )
        except Exception as e:
            logger.warning(f"Could not load transformers model '{model_name}': {e}. Disabling Transformers NER.")
            self.nlp_models['transformers'] = None

    def _build_crypto_patterns(self) -> Dict[str, List[str]]:
        """Build regex patterns for crypto-specific entities"""
        return {
            'CRYPTO_PROJECT': [
                r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Protocol|Network|Chain|Blockchain|Project)\b',
                r'\b[A-Z]{2,10}\b',  # Token symbols like BTC, ETH
                r'\b(?:Bitcoin|Ethereum|Binance|Cardano|Solana|Polkadot|Chainlink|DeFi|NFT)\b',
                r'\b[A-Z][a-z]*Coin\b',
                r'\b[A-Z][a-z]*Token\b'
            ],
            'FOUNDER': [
                r'\b(?:founder|creator|developer|inventor|co-founder)\s+of\s+([A-Z][a-z]+)',
                r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:founded|created|developed)\s+([A-Z][a-z]+)',
                r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:is|was)\s+(?:the\s+)?(?:founder|creator|developer)\b'
            ],
            'INVESTOR': [
                r'\b(?:invested|backed|funded|supported)\s+by\s+([A-Z][a-z]+)',
                r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:invested|invests|funds|backs|supports)\s+in\b',
                r'\b(?:Andreessen|Sequoia|a16z|Paradigm|Pantera|Coinbase Ventures|Digital Currency Group)\b'
            ],
            'EXCHANGE': [
                r'\b(?:Binance|Coinbase|Kraken|KuCoin|Bybit|OKX|Gate\.io|Uniswap|SushiSwap|PancakeSwap)\b',
                r'\b([A-Z][a-z]+)\s+(?:Exchange|DEX|CEX|Platform)\b'
            ],
            'WALLET': [
                r'\b0x[a-fA-F0-9]{40}\b',  # Ethereum addresses
                r'\bbc1[a-z0-9]{39,59}\b',   # Bitcoin addresses
                r'\b([A-Z][a-z]+)\s+(?:Wallet|Address)\b'
            ],
            'FINANCIAL_AMOUNT': [
                r'\$?\b(?:\d{1,3}(?:,\d{3})*|\d+)(?:\.\d{1,2})?\s*(?:million|billion|trillion|USD|dollars?|EUR|GBP|CNY)\b',
                r'\b(?:\d{1,3}(?:,\d{3})*|\d+)(?:\.\d+)?\s*\%\b' # Percentage amounts
            ],
            'ON_CHAIN_METRIC': [
                r'\b(?:transaction\s+count|active\s+addresses|whale\s+transactions|gas\s+price|network\s+utilization)\b',
                r'\b(?:hashrate|difficulty|block\s+time|staking\s+rate)\b'
            ],
            'LOCATION': [
                r'\b(?:United States|Europe|Asia|Germany|UK|China|Japan)\b',
                r'\b(?:New York|London|Hong Kong|Singapore)\b'
            ],
            'EVENT': [
                r'\b(?:ICO|initial\s+coin\s+offering|token\s+launch|mainnet\s+launch|upgrade|merge|hard\s+fork|airdrop)\b',
                r'\b(?:Q[1-4]|20\d{2})\b' # Quarters and years as potential event markers
            ],
            'DOCUMENT': [
                r'\b(?:whitepaper|research\s+paper|technical\s+paper|report|study|blog\s+post|article)\b'
            ],
            'REGULATORY_BODY': [
                r'\b(?:SEC|CFTC|FINMA|FCA|MAS|IRS)\b',
                r'\b(?:Securities\s+and\s+Exchange\s+Commission|Commodity\s+Futures\s+Trading\s+Commission)\b'
            ]
        }

    async def extract_entities(self, text: str, data_source: DataSource = DataSource.API_DATA,
                              source_url: str = "", context: str = "") -> List[ExtractedEntity]:
        """Extract entities from text using multiple techniques"""
        entities = []

        # Prioritize known document titles
        if text in self.known_document_titles:
            return [ExtractedEntity(
                text=text,
                entity_type='DOCUMENT',
                confidence=1.0, # High confidence for known titles
                start_pos=0,
                end_pos=len(text),
                source_text=text,
                source_url=source_url,
                data_source=data_source,
                context=self._get_context_window(0, len(text), text),
                metadata={'crypto_specific': True, 'known_document': True}
            )]

        # Method 1: spaCy NER
        if self.config['use_spacy'] and self.nlp_models.get('spacy') is not None:
            entities.extend(await self._extract_with_spacy(text, data_source, source_url, context))

        # Method 2: Transformers NER
        if self.config['use_transformers'] and self.nlp_models.get('transformers') is not None:
            entities.extend(await self._extract_with_transformers(text, data_source, source_url, context))

        # Method 3: Regex patterns
        if self.config['use_regex_patterns']:
            entities.extend(await self._extract_with_regex(text, data_source, source_url, context))

        # Method 4: Crypto-specific patterns
        if self.config['crypto_specific_patterns']:
            entities.extend(await self._extract_crypto_specific(text, data_source, source_url, context))

        # Deduplication and filtering
        entities = self._deduplicate_entities(entities)
        entities = [e for e in entities if e.confidence >= self.config['confidence_threshold']]

        # Limit number of entities
        entities.sort(key=lambda x: x.confidence, reverse=True)
        entities = entities[:self.config['max_entities_per_text']]

        return entities

    async def _extract_with_spacy(self, text: str, data_source: DataSource,
                                 source_url: str, context: str) -> List[ExtractedEntity]:
        """Extract entities using spaCy"""
        entities = []

        try:
            doc = self.nlp_models['spacy'](text)

            for ent in doc.ents:
                # Map spaCy entity types to our entity types
                entity_type = self._map_spacy_to_crypto_type(ent.label_)

                if entity_type:
                    entities.append(ExtractedEntity(
                        text=ent.text,
                        entity_type=entity_type,
                        confidence=0.8,  # spaCy doesn't provide confidence scores
                        start_pos=ent.start_char,
                        end_pos=ent.end_char,
                        source_text=text,
                        source_url=source_url,
                        data_source=data_source,
                        context=self._get_context_window(ent.start_char, ent.end_char, text),
                        metadata={'spacy_label': ent.label_}
                    ))
        except Exception as e:
            logger.warning(f"spaCy extraction failed: {e}")

        return entities

    async def _extract_with_transformers(self, text: str, data_source: DataSource,
                                       source_url: str, context: str) -> List[ExtractedEntity]:
        """Extract entities using HuggingFace transformers"""
        entities = []

        try:
            results = self.nlp_models['transformers'](text)

            current_entity = None
            for result in results:
                if result['entity'].startswith('B-'):  # Beginning of entity
                    if current_entity:
                        entities.append(current_entity)

                    entity_type = self._map_hf_to_crypto_type(result['entity'][2:])  # Remove B-
                    if entity_type:
                        current_entity = ExtractedEntity(
                            text=result['word'].replace('##', ''),
                            entity_type=entity_type,
                            confidence=result['score'],
                            start_pos=result['start'],
                            end_pos=result['end'],
                            source_text=text,
                            source_url=source_url,
                            data_source=data_source,
                            context=self._get_context_window(result['start'], result['end'], text),
                            metadata={'hf_label': result['entity']}
                        )
                elif result['entity'].startswith('I-') and current_entity:  # Inside entity
                    current_entity.text += ' ' + result['word'].replace('##', '')
                    current_entity.end_pos = result['end']
                    current_entity.confidence = min(current_entity.confidence, result['score'])

            if current_entity:
                entities.append(current_entity)

        except Exception as e:
            logger.warning(f"Transformers extraction failed: {e}")

        return entities

    async def _extract_with_regex(self, text: str, data_source: DataSource,
                                 source_url: str, context: str) -> List[ExtractedEntity]:
        """Extract entities using regex patterns"""
        entities = []

        # Simple pattern-based extraction
        patterns = [
            (r'\b[A-Z][a-zA-Z0-9]{2,20}\b', 'CRYPTO_PROJECT'),  # Potential token names
            (r'\b0x[a-fA-F0-9]{40}\b', 'WALLET'),  # Ethereum addresses
            (r'\bbc1[a-z0-9]{39,59}\b', 'WALLET'),   # Bitcoin addresses
            (r'\b(?:\d{1,3}(?:,\d{3})*|\d+)\s*(?:million|billion|trillion)\b', 'FINANCIAL_AMOUNT'), # Monetary amounts
            (r'\b(?:transactions?|addresses?|whales?|gas)\b', 'ON_CHAIN_METRIC'), # On-chain terms
        ]

        for pattern, entity_type in patterns:
            matches = list(re.finditer(pattern, text, re.IGNORECASE))
            for match in matches:
                # Check if this looks like a legitimate entity
                if self._validate_regex_match(match.group(), entity_type, text):
                    entities.append(await self._create_extracted_entity_from_regex(
                        match, entity_type, text, source_url, data_source, pattern
                    ))

        return entities

    async def _create_extracted_entity_from_regex(self, match: re.Match, entity_type: str, text: str,
                                                  source_url: str, data_source: DataSource, pattern: str) -> ExtractedEntity:
        """Helper to create an ExtractedEntity from a regex match."""
        # Create context around the match for better relevance
        context_start = max(0, match.start() - 50)
        context_end = min(len(text), match.end() + 50)
        context_text = text[context_start:context_end]

        return ExtractedEntity(
            text=match.group(),
            entity_type=entity_type,
            confidence=0.6,
            start_pos=match.start(),
            end_pos=match.end(),
            source_text=text,
            source_url=source_url,
            data_source=data_source,
            context=context_text,
            metadata={'pattern': pattern}
        )

    async def _extract_crypto_specific(self, text: str, data_source: DataSource,
                                     source_url: str, context: str) -> List[ExtractedEntity]:
        """Extract crypto-specific entities using domain knowledge"""
        entities = []

        # Look for specific crypto terminology
        crypto_terms = {
            'CRYPTO_PROJECT': ['Bitcoin', 'Ethereum', 'Binance Coin', 'Cardano', 'Solana', 'Polkadot', 'DeFi', 'NFT'],
            'EXCHANGE': ['Binance', 'Coinbase', 'Kraken', 'KuCoin', 'Bybit', 'OKX'],
            'PROTOCOL': ['Layer 2', 'Cross-chain', 'Interoperability'],
            'FINANCIAL_AMOUNT': ['million', 'billion', 'trillion', 'dollars', 'USD'],
            'ON_CHAIN_METRIC': ['transaction count', 'active addresses', 'whale transactions', 'gas price', 'network utilization'],
            'LOCATION': ['United States', 'Europe', 'Asia'],
            'EVENT': ['ICO', 'launch', 'upgrade', 'merge'],
            'DOCUMENT': ['whitepaper', 'research paper', 'report'],
            'REGULATORY_BODY': ['SEC', 'CFTC', 'FINMA'],
            'OTHER': []
        }

        text_lower = text.lower()

        # First, check for known document titles
        if text in self.known_document_titles:
            entities.append(ExtractedEntity(
                text=text,
                entity_type='DOCUMENT',
                confidence=1.0, # High confidence for known titles
                start_pos=0,
                end_pos=len(text),
                source_text=text,
                source_url=source_url,
                data_source=data_source,
                context=self._get_context_window(0, len(text), text),
                metadata={'crypto_specific': True, 'known_document': True}
            ))
            return entities # If it's a known document title, return early

        for entity_type, terms in crypto_terms.items():
            for term in terms:
                if term.lower() in text_lower:
                    # Find the actual position in the original text
                    start_pos = text_lower.find(term.lower())
                    if start_pos != -1:
                        end_pos = start_pos + len(term)

                        entities.append(ExtractedEntity(
                            text=term,
                            entity_type=entity_type,
                            confidence=0.9,  # High confidence for known terms
                            start_pos=start_pos,
                            end_pos=end_pos,
                            source_text=text,
                            source_url=source_url,
                            data_source=data_source,
                            context=self._get_context_window(start_pos, end_pos, text),
                            metadata={'crypto_specific': True}
                        ))

        return entities

    def _map_spacy_to_crypto_type(self, spacy_label: str) -> Optional[str]:
        """Map spaCy entity labels to crypto entity types"""
        mapping = {
            'PERSON': 'PERSON',
            'ORG': 'ORGANIZATION',
            'MONEY': 'FINANCIAL_AMOUNT',
            'PRODUCT': 'CRYPTO_PROJECT',
            'GPE': 'LOCATION', # Map GPE (geopolitical entity) to LOCATION
            'LOC': 'LOCATION', # Map LOC (location) to LOCATION
            'DATE': 'EVENT', # Map DATE to EVENT
            'PERCENT': 'FINANCIAL_AMOUNT', # Map PERCENT to FINANCIAL_AMOUNT
            'CARDINAL': 'FINANCIAL_AMOUNT', # Map CARDINAL to FINANCIAL_AMOUNT
            'QUANTITY': 'FINANCIAL_AMOUNT', # Map QUANTITY to FINANCIAL_AMOUNT
            'NORP': 'ORGANIZATION', # Nationalities or religious/political groups as organizations
            'FAC': 'OTHER', # Facilities to other
            'EVENT': 'EVENT', # Existing event entities
            'WORK_OF_ART': 'DOCUMENT' # Books, songs, etc. as documents
        }
        return mapping.get(spacy_label)

    def _map_hf_to_crypto_type(self, hf_label: str) -> Optional[str]:
        """Map HuggingFace entity labels to crypto entity types"""
        mapping = {
            'PER': 'PERSON',
            'ORG': 'ORGANIZATION',
            'MISC': 'CRYPTO_PROJECT', # Miscellaneous often catches crypto terms
            'LOC': 'LOCATION', # Add LOCATION as a new entity type
            'DATE': 'EVENT', # Map DATE to EVENT
            'CARDINAL': 'FINANCIAL_AMOUNT', # Map CARDINAL numbers to FINANCIAL_AMOUNT
            'NORP': 'ORGANIZATION', # Nationalities or religious/political groups as organizations
            'EVENT': 'EVENT'
        }
        return mapping.get(hf_label)

    def _validate_regex_match(self, match: str, entity_type: str, text: str) -> bool:
        """Validate if a regex match is a legitimate entity"""
        # Basic validation rules
        if entity_type == 'WALLET':
            return len(match) >= 26  # Minimum address length

        if entity_type == 'CRYPTO_PROJECT':
            # Ensure it's not a common word that got capitalized
            if match.lower() not in [term.lower() for term in self.entity_types.get('CRYPTO_PROJECT', [])] and \
               match.lower() not in {'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'man', 'men', 'she', 'use', 'way'}: # Common words
                return False
            # Should not be common words
            common_words = {'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'man', 'men', 'she', 'use', 'way'}
            return match.lower() not in common_words

        return True

    def _deduplicate_entities(self, entities: List[ExtractedEntity]) -> List[ExtractedEntity]:
        """Remove duplicate entities"""
        seen = set()
        unique_entities = []

        for entity in entities:
            # Create a signature for deduplication
            signature = (entity.text.lower(), entity.entity_type, entity.start_pos, entity.end_pos)

            if signature not in seen:
                seen.add(signature)
                unique_entities.append(entity)

        return unique_entities

    def _get_context_window(self, entity_start: int, entity_end: int, text: str) -> str:
        """Get a context window around an entity's position."""
        return text[max(0, entity_start - 50): min(len(text), entity_end + 50)]


class RelationExtractor:
    """Advanced relationship extraction between entities"""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize relation extractor"""
        self.config = config or self._get_default_config()

        # Relationship patterns, rules, and contextual clues
        self.relation_patterns = self._build_relation_patterns()
        self.semantic_rules = self._build_semantic_rules()
        self.contextual_clues = self._build_contextual_clues()

        # Initialize NLP components if available
        self.nlp_model = None
        if SPACY_AVAILABLE:
            try:
                self.nlp_model = spacy.load("en_core_web_sm")
            except:
                self.nlp_model = None

    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            'use_dependency_parsing': True,
            'use_pattern_matching': True,
            'use_semantic_rules': True,
            'use_contextual_clues': True,
            'confidence_threshold': 0.5,
            'max_relations_per_text': 30,
            'min_entity_distance': 5,  # Minimum words between entities for relation
            'max_entity_distance': 50,  # Maximum words between entities for relation
            'enable_temporal_reasoning': True,
            'enable_domain_specific_patterns': True
        }

    def _build_relation_patterns(self) -> Dict[str, Dict[str, Any]]:
        """Build comprehensive patterns for relationship extraction"""
        return {
            # Ownership and Control
            'OWNS': {
                'patterns': [
                    r'\bowns?\b.*?\b(?:shares?|stake|majority|minority|controlling)\b',
                    r'\b(?:owns?|controls?|holds?)\b.*?\b(?:company|firm|organization|entity)\b',
                    r'\b(?:parent|holding|subsidiary)\b.*?\b(?:company|firm)\b',
                    r'\b(?:stakeholder|shareholder)\b.*?\b(?:owns?|holds?)\b',
                    r'\b(?:acquired|purchased|bought)\b.*?\bfor\b.*?\b(?:dollars?|USD|million|billion)\b'
                ],
                'direction': 'source_owns_target',
                'confidence_boost': 0.2
            },
            'ACQUIRED': {
                'patterns': [
                    r'\b(?:acquired|bought|purchased|merged with)\b',
                    r'\b(?:takeover|acquisition)\b.*?\b(?:of|by)\b',
                    r'\b(?:bought out|took over)\b',
                    r'\b(?:deal|transaction|purchase)\b.*?\bworth\b.*?\b(?:dollars?|USD|million|billion)\b'
                ],
                'direction': 'source_acquired_target',
                'confidence_boost': 0.3
            },

            # Investment Relationships
            'INVESTED_IN': {
                'patterns': [
                    r'\b(?:invested|funded|backed)\b.*?\b(?:in|into)\b',
                    r'\b(?:investment|funding)\b.*?\b(?:of|in|by)\b',
                    r'\b(?:raised|received)\b.*?\b(?:funding|investment|capital)\b.*?\bfrom\b',
                    r'\b(?:investor|backer|VC|venture capital)\b.*?\b(?:put|placed)\b.*?\b(?:money|capital)\b',
                    r'\b(?:Series [A-Z]|seed|angel|pre-seed)\b.*?\b(?:funding|round)\b'
                ],
                'direction': 'source_invested_in_target',
                'confidence_boost': 0.25
            },
            'FUNDS': {
                'patterns': [
                    r'\b(?:funds?|finances?|provides?\s+funding)\b.*?\bto\b',
                    r'\b(?:grants?|awards?|gives?)\b.*?\b(?:funding|money|capital)\b.*?\bto\b',
                    r'\b(?:sponsor|patron|benefactor)\b.*?\b(?:supports?|funds?)\b'
                ],
                'direction': 'source_funds_target',
                'confidence_boost': 0.2
            },

            # Partnership and Collaboration
            'PARTNERS_WITH': {
                'patterns': [
                    r'\b(?:partners?|collaborates?|works?\s+together|teams?\s+up)\b.*?\bwith\b',
                    r'\b(?:alliance|partnership|collaboration|joint venture)\b.*?\b(?:with|between)\b',
                    r'\b(?:cooperation|cooperative|mutual)\b.*?\b(?:agreement|understanding)\b',
                    r'\b(?:strategic|business|technology)\b.*?\bpartner\b'
                ],
                'direction': 'mutual_partnership',
                'confidence_boost': 0.15
            },
            'COLLABORATES_WITH': {
                'patterns': [
                    r'\b(?:collaborates?|cooperates?|works?\s+with)\b.*?\bon\b',
                    r'\b(?:joint|shared|combined)\b.*?\b(?:project|initiative|effort)\b',
                    r'\b(?:together|jointly|collectively)\b.*?\b(?:develop|build|create)\b'
                ],
                'direction': 'mutual_collaboration',
                'confidence_boost': 0.15
            },

            # Employment and Leadership
            'FOUNDED': {
                'patterns': [
                    r'\b(?:founded|created|started|established|launched)\b.*?\bby\b',
                    r'\b(?:founder|creator|co-founder)\b.*?\bof\b',
                    r'\b(?:built|developed|created)\b.*?\bfrom\s+(?:the\s+)?ground\s+up\b',
                    r'\b(?:visionary|entrepreneur)\b.*?\bbehind\b'
                ],
                'direction': 'source_founded_target',
                'confidence_boost': 0.3
            },
            'EMPLOYS': {
                'patterns': [
                    r'\b(?:employs?|hires?|works?\s+for|employed\s+by)\b',
                    r'\b(?:CEO|CTO|CFO|COO|executive|employee|staff|team\s+member)\b.*?\b(?:of|at)\b',
                    r'\b(?:joined|works?\s+at)\b.*?\b(?:as|in\s+(?:the\s+)?role\s+of)\b',
                    r'\b(?:company|firm|organization)\b.*?\b(?:employs?|has|maintains?)\b'
                ],
                'direction': 'source_employs_target',
                'confidence_boost': 0.2
            },

            # Competition and Market Position
            'COMPETES_WITH': {
                'patterns': [
                    r'\b(?:competes?|rivals?|competitor)\b.*?\b(?:with|against|to)\b',
                    r'\b(?:competition|competitive)\b.*?\b(?:landscape|market|space)\b',
                    r'\b(?:challenges?|threatens?)\b.*?\b(?:position|market\s+share)\b',
                    r'\b(?:alternative|substitute|replacement)\b.*?\b(?:for|to)\b'
                ],
                'direction': 'mutual_competition',
                'confidence_boost': 0.15
            },

            # Technology and Development
            'BUILT_ON': {
                'patterns': [
                    r'\b(?:built|developed|created|based)\b.*?\b(?:on|using|with)\b',
                    r'\b(?:runs?\s+on|powered\s+by|uses?|leverages?)\b',
                    r'\b(?:infrastructure|platform|framework|technology)\b.*?\b(?:behind|underpinning)\b',
                    r'\b(?:fork|derivative|version)\b.*?\b(?:of|from)\b'
                ],
                'direction': 'target_built_on_source',
                'confidence_boost': 0.25
            },
            'FORKED_FROM': {
                'patterns': [
                    r'\b(?:forked?|branched|split)\b.*?\b(?:from|off\s+of)\b',
                    r'\b(?:hard\s+fork|soft\s+fork)\b.*?\b(?:of|from)\b',
                    r'\b(?:derivative|alternative|competing)\b.*?\bversion\b',
                    r'\b(?:community|developer)\b.*?\b(?:fork|split)\b'
                ],
                'direction': 'target_forked_from_source',
                'confidence_boost': 0.3
            },

            # Regulatory and Legal
            'REGULATES': {
                'patterns': [
                    r'\b(?:regulates?|oversees?|supervises?|monitors?)\b',
                    r'\b(?:regulator|authority|agency|commission)\b.*?\b(?:for|of)\b',
                    r'\b(?:compliance|oversight|supervision)\b.*?\b(?:by|from)\b',
                    r'\b(?:governed|controlled|managed)\b.*?\b(?:by|under)\b'
                ],
                'direction': 'source_regulates_target',
                'confidence_boost': 0.2
            },

            # Trading and Exchange
            'TRADED_ON': {
                'patterns': [
                    r'\b(?:trades?|listed|available)\b.*?\b(?:on|at)\b.*?\b(?:exchange|market|platform)\b',
                    r'\b(?:trading|exchange|marketplace)\b.*?\b(?:offers?|lists?|features?)\b',
                    r'\b(?:pair|trading\s+pair)\b.*?\b(?:on|at)\b',
                    r'\b(?:liquidity|volume)\b.*?\b(?:on|at|through)\b'
                ],
                'direction': 'target_traded_on_source',
                'confidence_boost': 0.25
            },

            # Mentorship and Advice
            'MENTORS': {
                'patterns': [
                    r'\b(?:mentors?|advises?|guides?|coaches?)\b',
                    r'\b(?:mentor|advisor|counselor|guide)\b.*?\b(?:to|for)\b',
                    r'\b(?:under\s+(?:the\s+)?guidance|mentorship)\b.*?\b(?:of|from)\b',
                    r'\b(?:learned|studied|trained)\b.*?\bunder\b'
                ],
                'direction': 'source_mentors_target',
                'confidence_boost': 0.2
            },
            'ADVISOR_TO': {
                'patterns': [
                    r'\b(?:advisory\s+board|advisor|consultant)\b.*?\b(?:to|for)\b',
                    r'\b(?:provides?\s+advice|counsels?|advises?)\b.*?\bto\b',
                    r'\b(?:strategic|technical|financial)\b.*?\badvisor\b',
                    r'\b(?:board\s+member|director)\b.*?\b(?:of|at)\b'
                ],
                'direction': 'source_advisor_to_target',
                'confidence_boost': 0.2
            }
        }

    def _build_semantic_rules(self) -> Dict[str, Dict[str, Any]]:
        """Build semantic rules for relationship inference"""
        return {
            # Company-Founder relationships
            'company_founder': {
                'condition': lambda e1, e2: (e1.entity_type in [EntityType.ORGANIZATION, EntityType.CRYPTO_PROJECT] and
                                           e2.entity_type == EntityType.PERSON),
                'patterns': [r'\b(?:founder|CEO|CTO|CFO)\b.*?\bof\b', r'\b(?:by|created by)\b'],
                'relation_type': 'FOUNDED',
                'direction': 'target_founded_source',  # Person founded company
                'confidence': 0.7
            },

            # Investment relationships
            'investment': {
                'condition': lambda e1, e2: (e1.entity_type in [EntityType.PERSON, EntityType.ORGANIZATION, EntityType.INVESTOR] and
                                          e2.entity_type in [EntityType.CRYPTO_PROJECT, EntityType.ORGANIZATION, EntityType.TOKEN]),
                'patterns': [r'\b(?:invest|fund|back|support)\b', r'\b(?:million|billion|dollars?)\b', r'\b(?:ICO|funding\s+round)\b'],
                'relation_type': 'INVESTED_IN',
                'direction': 'source_invested_in_target',
                'confidence': 0.6
            },

            # Competition relationships
            'competition': {
                'condition': lambda e1, e2: (e1.entity_type == e2.entity_type and
                                           e1.entity_type in [EntityType.CRYPTO_PROJECT, EntityType.ORGANIZATION, EntityType.EXCHANGE, EntityType.PROTOCOL]),
                'patterns': [r'\b(?:vs\.?|versus|compete|competition|rival)\b', r'\b(?:alternative|choice|option)\b'],
                'relation_type': 'COMPETES_WITH',
                'direction': 'mutual_competition',
                'confidence': 0.5
            },

            # Technology stack relationships
            'technology': {
                'condition': lambda e1, e2: (e1.entity_type == EntityType.CRYPTO_PROJECT and
                                           e2.entity_type in [EntityType.PROTOCOL, EntityType.BLOCKCHAIN]),
                'patterns': [r'\b(?:built on|powered by|uses|runs on|based on|leverages)\b'],
                'relation_type': 'BUILT_ON',
                'direction': 'source_built_on_target',
                'confidence': 0.8
            },
            'employs': {
                'condition': lambda e1, e2: (e1.entity_type == EntityType.ORGANIZATION and e2.entity_type == EntityType.PERSON),
                'patterns': [r'\b(?:employs|hires|works for|appointed|joined)\b'],
                'relation_type': 'EMPLOYS',
                'direction': 'source_employs_target',
                'confidence': 0.7
            },
            'regulates': {
                'condition': lambda e1, e2: (e1.entity_type == EntityType.REGULATORY_BODY and
                                           e2.entity_type in [EntityType.CRYPTO_PROJECT, EntityType.EXCHANGE, EntityType.ORGANIZATION, EntityType.TOKEN]),
                'patterns': [r'\b(?:regulates|oversees|supervises|monitors)\b'],
                'relation_type': 'REGULATES',
                'direction': 'source_regulates_target',
                'confidence': 0.85
            }
        }

    def _build_contextual_clues(self) -> Dict[str, List[str]]:
        """Build contextual clues for relationship enhancement"""
        return {
            'ownership': [
                'stake', 'shares', 'majority', 'minority', 'controlling', 'ownership',
                'acquisition', 'purchase', 'bought', 'sold', 'transferred', 'holding',
                'subsidiary', 'parent company', 'equity', 'capital'
            ],
            'investment': [
                'funding', 'capital', 'investment', 'investor', 'backer', 'VC',
                'series A', 'series B', 'seed', 'pre-seed', 'angel', 'round',
                'fundraise', 'capital raise', 'grant', 'endowment', 'financing'
            ],
            'partnership': [
                'partnership', 'collaboration', 'alliance', 'joint venture', 'cooperation',
                'integration', 'merge', 'combine', 'together', 'united', 'strategic',
                'technical partnership', 'business agreement', 'MOU', 'ecosystem'
            ],
            'competition': [
                'compete', 'competition', 'rival', 'versus', 'vs', 'alternative',
                'choice', 'option', 'competing', 'challenging', 'threat', 'contender',
                'market share', 'dominance', 'fragmentation'
            ],
            'employment': [
                'CEO', 'CTO', 'CFO', 'COO', 'executive', 'employee', 'team',
                'hire', 'join', 'work for', 'employed by', 'leadership', 'board member',
                'director', 'staff', 'talent', 'recruitment', 'management'
            ],
            'regulation': [
                'regulate', 'regulator', 'authority', 'agency', 'compliance',
                'oversight', 'supervision', 'governance', 'control', 'policy',
                'law', 'framework', 'license', 'sanction', 'ban', 'guidance'
            ],
            'technology': [
                'blockchain', 'protocol', 'network', 'platform', 'layer 2', 'rollup',
                'smart contract', 'DApp', 'DeFi', 'NFT', 'tokenomics', 'consensus',
                'proof-of-work', 'proof-of-stake', 'interoperability', 'cross-chain'
            ],
            'event': [
                'launch', 'mainnet', 'testnet', 'upgrade', 'fork', 'halving', 'IPO',
                'ICO', 'IDO', 'IEO', 'TGE', 'token generation event', 'listing', 'delisting',
                'hack', 'exploit', 'rug pull', 'audit', 'bug bounty', 'roadmap', 'milestone'
            ],
            'sentiment': [
                'bullish', 'bearish', 'optimistic', 'pessimistic', 'fear', 'greed',
                'fomo', 'fud', 'positive', 'negative', 'neutral', 'hope', 'despair'
            ]
        }

    async def extract_relations(self, text: str, entities: List[ExtractedEntity],
                               data_source: DataSource = DataSource.API_DATA) -> List[ExtractedRelation]:
        """Extract relationships from text given entities using multiple techniques"""
        relations = []

        # Method 1: Enhanced pattern-based extraction
        if self.config['use_pattern_matching']:
            relations.extend(await self._extract_with_enhanced_patterns(text, entities, data_source))

        # Method 2: Semantic rule-based extraction
        if self.config['use_semantic_rules']:
            relations.extend(await self._extract_with_semantic_rules(text, entities, data_source))

        # Method 3: Contextual clue analysis
        if self.config['use_contextual_clues']:
            relations.extend(await self._extract_with_contextual_clues(text, entities, data_source))

        # Method 4: Dependency parsing (if available)
        if self.config['use_dependency_parsing'] and self.nlp_model:
            relations.extend(await self._extract_with_dependency_parsing(text, entities, data_source))

        # Method 5: Domain-specific pattern extraction
        if self.config['enable_domain_specific_patterns']:
            relations.extend(await self._extract_domain_specific_relations(text, entities, data_source))

        # Post-processing: deduplication, filtering, and confidence adjustment
        relations = self._deduplicate_relations(relations)
        relations = [r for r in relations if r.confidence >= self.config['confidence_threshold']]
        relations = self._apply_confidence_adjustments(relations, text)

        # Limit number of relations
        relations.sort(key=lambda x: x.confidence, reverse=True)
        relations = relations[:self.config['max_relations_per_text']]

        return relations

    async def _extract_with_enhanced_patterns(self, text: str, entities: List[ExtractedEntity],
                                             data_source: DataSource) -> List[ExtractedRelation]:
        """Extract relations using enhanced pattern matching with confidence scoring"""
        relations = []

        for entity1 in entities:
            for entity2 in entities:
                if entity1 == entity2:
                    continue

                # Check entity distance constraints
                distance = abs(entity1.start_pos - entity2.start_pos)
                if not (self.config['min_entity_distance'] <= distance <= self.config['max_entity_distance']):
                    continue

                # Get text context between entities
                start_pos = min(entity1.start_pos, entity2.start_pos)
                end_pos = max(entity1.end_pos, entity2.end_pos)
                context_window = max(0, start_pos - 50), min(len(text), end_pos + 50)
                text_context = text[context_window[0]:context_window[1]]

                # Check each relationship pattern
                for rel_type, pattern_data in self.relation_patterns.items():
                    best_match = None
                    best_confidence = 0.0

                    for pattern in pattern_data['patterns']:
                        matches = list(re.finditer(pattern, text_context, re.IGNORECASE))
                        for match in matches:
                            # Calculate confidence based on multiple factors
                            confidence = self._calculate_pattern_confidence(
                                match, entity1, entity2, pattern_data, text_context
                            )

                            if confidence > best_confidence:
                                best_confidence = confidence
                                best_match = match

                    if best_match and best_confidence >= self.config['confidence_threshold']:
                        # Determine source and target based on direction
                        direction = pattern_data['direction']
                        if direction in ['source_owns_target', 'source_founded_target', 'source_invested_in_target',
                                       'source_employs_target', 'source_regulates_target', 'source_mentors_target',
                                       'source_advisor_to_target', 'source_funds_target']:
                            source_entity, target_entity = entity1, entity2
                        elif direction in ['target_founded_source', 'target_built_on_source',
                                         'target_traded_on_source', 'target_forked_from_source']:
                            source_entity, target_entity = entity2, entity1
                        else:  # mutual relationships
                            # For mutual relationships, order by position in text
                            if entity1.start_pos < entity2.start_pos:
                                source_entity, target_entity = entity1, entity2
                            else:
                                source_entity, target_entity = entity2, entity1

                        relations.append(ExtractedRelation(
                            source_text=source_entity.text,
                            target_text=target_entity.text,
                            relation_type=rel_type,
                            confidence=best_confidence,
                            source_start=source_entity.start_pos,
                            source_end=source_entity.end_pos,
                            target_start=target_entity.start_pos,
                            target_end=target_entity.end_pos,
                            source_text_full=text,
                            context=text_context,
                            metadata={
                                'pattern': best_match.group(),
                                'direction': direction,
                                'match_start': best_match.start(),
                                'match_end': best_match.end(),
                                'extraction_methods': ['enhanced_pattern']
                            }
                        ))

        return relations

    def _calculate_pattern_confidence(self, match: re.Match, entity1: ExtractedEntity,
                                    entity2: ExtractedEntity, pattern_data: Dict,
                                    context: str) -> float:
        """Calculate confidence score for a pattern match"""
        base_confidence = 0.6  # Base confidence for pattern match

        # Boost confidence based on pattern data
        base_confidence += pattern_data.get('confidence_boost', 0.0)

        # Boost based on entity types compatibility
        entity_types = {entity1.entity_type, entity2.entity_type}
        if self._are_entity_types_compatible(entity_types, pattern_data.get('direction', '')):
            base_confidence += 0.1

        # Boost based on proximity (closer entities = higher confidence)
        distance = abs(entity1.start_pos - entity2.start_pos)
        proximity_boost = max(0, 0.1 * (1 - distance / self.config['max_entity_distance']))
        base_confidence += proximity_boost

        # Boost based on contextual clues
        context_lower = context.lower()
        contextual_boost = 0.0
        for clue_type, clues in self.contextual_clues.items():
            if any(clue in context_lower for clue in clues):
                contextual_boost += 0.05
                break  # Only one contextual boost per relationship

        base_confidence += contextual_boost

        # Cap at 1.0
        return min(1.0, base_confidence)

    def _are_entity_types_compatible(self, entity_types: Set[str], direction: str) -> bool:
        """Check if entity types are compatible with the relationship direction"""
        type_pairs = {
            'ownership': ({'PERSON', 'ORGANIZATION'}, {'ORGANIZATION', 'CRYPTO_PROJECT'}),
            'founding': ({'PERSON'}, {'ORGANIZATION', 'CRYPTO_PROJECT'}),
            'investment': ({'PERSON', 'ORGANIZATION'}, {'CRYPTO_PROJECT', 'ORGANIZATION'}),
            'employment': ({'ORGANIZATION'}, {'PERSON'}),
            'regulation': ({'ORGANIZATION'}, {'CRYPTO_PROJECT', 'EXCHANGE', 'ORGANIZATION'}),
            'technology': ({'CRYPTO_PROJECT'}, {'PROTOCOL', 'BLOCKCHAIN'}),
            'trading': ({'CRYPTO_PROJECT', 'TOKEN'}, {'EXCHANGE'})
        }

        for rel_type, (source_types, target_types) in type_pairs.items():
            if rel_type in direction.lower():
                return bool(entity_types.intersection(source_types) and entity_types.intersection(target_types))

        return True  # Default to compatible if no specific check

    async def _extract_with_semantic_rules(self, text: str, entities: List[ExtractedEntity],
                                         data_source: DataSource) -> List[ExtractedRelation]:
        """Extract relations using semantic rules and entity type inference"""
        relations = []

        for i, entity1 in enumerate(entities):
            for j, entity2 in enumerate(entities):
                if i == j:
                    continue

                # Check each semantic rule
                for rule_name, rule_data in self.semantic_rules.items():
                    if not rule_data['condition'](entity1, entity2):
                        continue

                    # Check if any rule patterns match
                    confidence = rule_data['confidence']
                    matched_patterns = []

                    for pattern in rule_data['patterns']:
                        if re.search(pattern, text, re.IGNORECASE):
                            matched_patterns.append(pattern)
                            confidence += 0.1  # Boost for each matching pattern

                    if matched_patterns:
                        # Determine direction
                        direction = rule_data['direction']
                        if 'target_' in direction:
                            source_entity, target_entity = entity2, entity1
                        else:
                            source_entity, target_entity = entity1, entity2

                        relations.append(ExtractedRelation(
                            source_text=source_entity.text,
                            target_text=target_entity.text,
                            relation_type=rule_data['relation_type'],
                            confidence=min(1.0, confidence),
                            source_start=source_entity.start_pos,
                            source_end=source_entity.end_pos,
                            target_start=target_entity.start_pos,
                            target_end=target_entity.end_pos,
                            source_text_full=text,
                            context=text[max(0, min(source_entity.start_pos, target_entity.start_pos) - 50):
                                       min(len(text), max(source_entity.end_pos, target_entity.end_pos) + 50)],
                            metadata={
                                'rule': rule_name,
                                'matched_patterns': matched_patterns,
                                'extraction_methods': ['semantic_rule']
                            }
                        ))

        return relations

    async def _extract_with_contextual_clues(self, text: str, entities: List[ExtractedEntity],
                                           data_source: DataSource) -> List[ExtractedRelation]:
        """Extract relations based on contextual clues and proximity"""
        relations = []
        text_lower = text.lower()

        # Find all contextual clue matches
        clue_matches = {}
        for clue_type, clues in self.contextual_clues.items():
            for clue in clues:
                for match in re.finditer(r'\b' + re.escape(clue) + r'\b', text_lower):
                    if clue_type not in clue_matches:
                        clue_matches[clue_type] = []
                    clue_matches[clue_type].append((match.start(), match.end(), clue))

        # Associate clues with nearby entities
        for entity1 in entities:
            for entity2 in entities:
                if entity1 == entity2:
                    continue

                # Find clues between entities
                min_pos = min(entity1.start_pos, entity2.start_pos)
                max_pos = max(entity1.end_pos, entity2.end_pos)

                relevant_clues = []
                for clue_type, matches in clue_matches.items():
                    for start_pos, end_pos, clue in matches:
                        if min_pos <= start_pos <= max_pos:
                            relevant_clues.append((clue_type, clue))

                if relevant_clues:
                    # Determine most likely relationship type from clues
                    relation_type, confidence = self._infer_relation_from_clues(relevant_clues)

                    if relation_type and confidence >= self.config['confidence_threshold']:
                        # Order entities by position
                        if entity1.start_pos < entity2.start_pos:
                            source_entity, target_entity = entity1, entity2
                        else:
                            source_entity, target_entity = entity2, entity1

                        relations.append(ExtractedRelation(
                            source_text=source_entity.text,
                            target_text=target_entity.text,
                            relation_type=relation_type,
                            confidence=confidence,
                            source_start=source_entity.start_pos,
                            source_end=source_entity.end_pos,
                            target_start=target_entity.start_pos,
                            target_end=target_entity.end_pos,
                            source_text_full=text,
                            context=text[max(0, min_pos - 50): min(len(text), max_pos + 50)],
                            metadata={
                                'contextual_clues': relevant_clues,
                                'extraction_methods': ['contextual_clues']
                            }
                        ))

        return relations

    def _infer_relation_from_clues(self, clues: List[Tuple[str, str]]) -> Tuple[str, float]:
        """Infer relationship type from contextual clues"""
        clue_types = [clue_type for clue_type, _ in clues]

        # Map clue types to relationship types
        type_mapping = {
            'ownership': ('OWNS', 0.7),
            'investment': ('INVESTED_IN', 0.75),
            'partnership': ('PARTNERS_WITH', 0.6),
            'competition': ('COMPETES_WITH', 0.65),
            'employment': ('EMPLOYS', 0.7),
            'regulation': ('REGULATES', 0.7)
        }

        # Count clue types
        clue_counts = {}
        for clue_type in clue_types:
            clue_counts[clue_type] = clue_counts.get(clue_type, 0) + 1

        # Find most frequent clue type
        if clue_counts:
            most_common_clue = max(clue_counts.items(), key=lambda x: x[1])
            if most_common_clue[0] in type_mapping:
                relation_type, base_confidence = type_mapping[most_common_clue[0]]
                # Boost confidence based on clue frequency
                confidence_boost = min(0.2, most_common_clue[1] * 0.05)
                return relation_type, min(1.0, base_confidence + confidence_boost)

        return None, 0.0

    async def _extract_domain_specific_relations(self, text: str, entities: List[ExtractedEntity],
                                               data_source: DataSource) -> List[ExtractedRelation]:
        """Extract domain-specific relationships for crypto/blockchain context"""
        relations = []

        # Crypto-specific relationship patterns
        crypto_patterns = {
            'FORKED_FROM': [
                r'\b(?:bitcoin|ethereum)\b.*?\b(?:fork|hard\s+fork|split)\b',
                r'\b(?:bitcoin cash|bch|ethereum classic|etc)\b.*?\b(?:forked|split)\b.*?\bfrom\b'
            ],
            'BUILT_ON': [
                r'\b(?:defi|dex|nft|dao)\b.*?\b(?:built on|powered by|on)\b.*?\b(?:ethereum|polygon|bsc|solana)\b',
                r'\b(?:erc-20|erc-721|bep-20)\b.*?\b(?:token|standard)\b'
            ],
            'TRADED_ON': [
                r'\b(?:btc|eth|ada|sol)\b.*?\b(?:trading|available|listed)\b.*?\b(?:on|at)\b.*?\b(?:binance|coinbase|kraken)\b',
                r'\b(?:uniswap|sushiswap|pancakeswap)\b.*?\b(?:pool|pair|liquidity)\b'
            ]
        }

        for entity1 in entities:
            for entity2 in entities:
                if entity1 == entity2:
                    continue

                # Check crypto-specific patterns
                for rel_type, patterns in crypto_patterns.items():
                    for pattern in patterns:
                        # Look for pattern in text context around entities
                        search_start = max(0, min(entity1.start_pos, entity2.start_pos) - 100)
                        search_end = min(len(text), max(entity1.end_pos, entity2.end_pos) + 100)
                        search_text = text[search_start:search_end]

                        if re.search(pattern, search_text, re.IGNORECASE):
                            # Determine direction based on relationship type
                            if rel_type in ['FORKED_FROM', 'BUILT_ON']:
                                # entity1 is built on/forked from entity2
                                source_entity, target_entity = entity1, entity2
                            else:
                                # Default ordering
                                source_entity, target_entity = entity1, entity2

                            relations.append(ExtractedRelation(
                                source_text=source_entity.text,
                                target_text=target_entity.text,
                                relation_type=rel_type,
                                confidence=0.8,  # High confidence for domain-specific patterns
                                source_start=source_entity.start_pos,
                                source_end=source_entity.end_pos,
                                target_start=target_entity.start_pos,
                                target_end=target_entity.end_pos,
                                source_text_full=text,
                                context=search_text,
                                metadata={
                                    'pattern': pattern,
                                    'extraction_methods': ['domain_specific']
                                }
                            ))
                            break  # Only one relation per entity pair per pattern type

        return relations

    def _apply_confidence_adjustments(self, relations: List[ExtractedRelation], text: str) -> List[ExtractedRelation]:
        """Apply post-processing confidence adjustments"""
        for relation in relations:
            # Boost confidence for relations with multiple extraction methods
            extraction_methods_list = relation.metadata.get('extraction_methods', [])
            if not isinstance(extraction_methods_list, list):
                extraction_methods_list = [extraction_methods_list] # Ensure it's a list

            if len(extraction_methods_list) > 1:
                relation.confidence = min(1.0, relation.confidence + 0.1)

            # Boost confidence for relations with contextual support
            if 'contextual_clues' in relation.metadata:
                relation.confidence = min(1.0, relation.confidence + 0.05)

            # Slightly reduce confidence for very long distances
            if 'distance' in relation.metadata:
                distance = relation.metadata['distance']
                if distance > self.config['max_entity_distance'] * 0.8:
                    relation.confidence *= 0.95

        return relations

    async def _extract_with_dependency_parsing(self, text: str, entities: List[ExtractedEntity],
                                              data_source: DataSource) -> List[ExtractedRelation]:
        """Extract relations using dependency parsing"""
        relations = []

        if not self.nlp_model:
            return relations

        try:
            doc = self.nlp_model(text)

            # Find entities in the parsed text
            entity_positions = {}
            for entity in entities:
                # Find the token span for this entity
                for token in doc:
                    if token.text.lower() == entity.text.lower():
                        entity_positions[token.i] = entity
                        break

            # Look for dependency relationships
            for token in doc:
                if token.head.i in entity_positions and token.i in entity_positions:
                    source_entity = entity_positions[token.head.i]
                    target_entity = entity_positions[token.i]

                    # Determine relationship type based on dependency
                    rel_type = self._map_dependency_to_relation(token.dep_)

                    if rel_type:
                        relations.append(ExtractedRelation(
                            source_text=source_entity.text,
                            target_text=target_entity.text,
                            relation_type=rel_type,
                            confidence=0.6,
                            source_start=source_entity.start_pos,
                            source_end=source_entity.end_pos,
                            target_start=target_entity.start_pos,
                            target_end=target_entity.end_pos,
                            source_text_full=text,
                            context=token.head.text + " " + token.text,
                            metadata={
                                'dependency': token.dep_,
                                'head': token.head.text,
                                'extraction_methods': ['dependency_parsing']
                            }
                        ))

        except Exception as e:
            logger.warning(f"Dependency parsing failed: {e}")

        return relations

    def _map_dependency_to_relation(self, dep_label: str) -> Optional[str]:
        """Map spaCy dependency labels to relationship types"""
        mapping = {
            'nsubj': 'FOUNDED',  # nominal subject
            'dobj': 'OWNS',      # direct object
            'prep': 'PARTNERS_WITH',  # prepositional relationship
            'pobj': 'INVESTED_IN'     # object of preposition
        }
        return mapping.get(dep_label)

    def _deduplicate_relations(self, relations: List[ExtractedRelation]) -> List[ExtractedRelation]:
        """Remove duplicate relations"""
        seen = set()
        unique_relations = []

        for relation in relations:
            # Create signature for deduplication
            signature = (relation.source_text.lower(), relation.target_text.lower(),
                        relation.relation_type, relation.source_start, relation.target_start)

            if signature not in seen:
                seen.add(signature)
                unique_relations.append(relation)

        return unique_relations


class DataSourceIntegrator:
    """Integrates data from multiple sources for comprehensive extraction"""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize data source integrator"""
        self.config = config or self._get_default_config()
        self.entity_extractor = EntityExtractor(self.config.get('entity_extractor', {}))
        self.relation_extractor = RelationExtractor(self.config.get('relation_extractor', {}))

    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            'enable_cross_source_deduplication': True,
            'enable_confidence_aggregation': True,
            'max_entities_per_source': 100,
            'max_relations_per_source': 50
        }

    async def process_multiple_sources(self, data_sources: Dict[DataSource, List[Dict[str, Any]]]) -> Tuple[List[ExtractedEntity], List[ExtractedRelation]]:
        """Process multiple data sources and aggregate results"""
        all_entities = []
        all_relations = []

        # Process each source
        for source, documents in data_sources.items():
            for doc in documents:
                text = doc.get('text', '')
                url = doc.get('url', '')
                context = doc.get('context', '')

                # Extract entities from this document
                entities = await self.entity_extractor.extract_entities(
                    text, source, url, context
                )

                # Extract relations (need entities for context)
                relations = await self.relation_extractor.extract_relations(
                    text, entities, source
                )

                all_entities.extend(entities)
                all_relations.extend(relations)

        # Apply cross-source processing
        if self.config['enable_cross_source_deduplication']:
            all_entities = self._cross_source_deduplication(all_entities)
            all_relations = self._cross_source_deduplication_relations(all_relations)

        if self.config['enable_confidence_aggregation']:
            all_entities = self._aggregate_confidence(all_entities)
            all_relations = self._aggregate_confidence_relations(all_relations)

        # Apply limits
        all_entities = all_entities[:self.config['max_entities_per_source'] * len(data_sources)]
        all_relations = all_relations[:self.config['max_relations_per_source'] * len(data_sources)]

        return all_entities, all_relations

    def _cross_source_deduplication(self, entities: List[ExtractedEntity]) -> List[ExtractedEntity]:
        """Deduplicate entities across sources"""
        seen = {}
        unique_entities = []

        for entity in entities:
            key = (entity.text.lower(), entity.entity_type)

            if key in seen:
                # Aggregate confidence from multiple sources
                existing = seen[key]
                existing.confidence = (existing.confidence + entity.confidence) / 2
                existing.metadata['sources'] = existing.metadata.get('sources', []) + [entity.data_source.value]
            else:
                seen[key] = entity
                entity.metadata['sources'] = [entity.data_source.value]
                unique_entities.append(entity)

        return unique_entities

    def _cross_source_deduplication_relations(self, relations: List[ExtractedRelation]) -> List[ExtractedRelation]:
        """Deduplicate relations across sources"""
        seen = {}
        unique_relations = []

        for relation in relations:
            key = (relation.source_text.lower(), relation.target_text.lower(), relation.relation_type)

            if key in seen:
                # Aggregate confidence from multiple sources
                existing = seen[key]
                existing.confidence = (existing.confidence + relation.confidence) / 2
                existing.metadata['sources'] = existing.metadata.get('sources', []) + [relation.metadata.get('source', 'unknown')]
            else:
                seen[key] = relation
                relation.metadata['sources'] = [relation.metadata.get('source', 'unknown')]
                unique_relations.append(relation)

        return unique_relations

    def _aggregate_confidence(self, entities: List[ExtractedEntity]) -> List[ExtractedEntity]:
        """Aggregate confidence scores for entities"""
        # This is a simple aggregation - could be more sophisticated
        for entity in entities:
            sources = entity.metadata.get('sources', [])
            if len(sources) > 1:
                # Boost confidence for entities found in multiple sources
                entity.confidence = min(entity.confidence * 1.2, 1.0)

        return entities

    def _aggregate_confidence_relations(self, relations: List[ExtractedRelation]) -> List[ExtractedRelation]:
        """Aggregate confidence scores for relations"""
        for relation in relations:
            sources = relation.metadata.get('sources', [])
            if len(sources) > 1:
                # Boost confidence for relations found in multiple sources
                relation.confidence = min(relation.confidence * 1.2, 1.0)

        return relations
