"""
🧠 CONTEXT MANAGER - THE DIVINE CONTEXT ARCHITECT
=================================================

This module provides extraordinary context management capabilities that feed
relevant background information into models during inference. It dynamically
assembles contextual information from multiple sources to enhance understanding.

REVOLUTIONARY CAPABILITIES:
- Dynamic context assembly from multiple knowledge sources
- Temporal context management with market data integration
- Domain-specific context injection and adaptation
- Multi-source context fusion and ranking
- Real-time context updates and relevance scoring

"Context is the bridge between information and understanding." - Divine NLP Philosophy
"""

import asyncio
import logging
from typing import Dict, List, Optional, Union, Any, Tuple
import numpy as np
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import json
import re

logger = logging.getLogger(__name__)

@dataclass
class ContextSource:
    """Represents a source of contextual information"""
    name: str
    type: str  # 'market', 'news', 'social', 'historical', 'domain'
    content: Dict[str, Any]
    relevance_score: float = 1.0
    timestamp: datetime = field(default_factory=datetime.utcnow)
    expiry_time: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ContextualInsight:
    """Represents a contextual insight derived from multiple sources"""
    insight_type: str  # 'market_sentiment', 'technical_pattern', 'psychological_state'
    content: str
    confidence: float
    sources: List[str]
    relevance_to_query: float
    temporal_validity: timedelta
    created_at: datetime = field(default_factory=datetime.utcnow)

@dataclass
class ContextAssembly:
    """Represents an assembled context for model inference"""
    query_text: str
    domain_context: str
    temporal_context: Dict[str, Any]
    market_context: Dict[str, Any]
    social_context: Dict[str, Any]
    domain_insights: List[ContextualInsight]
    assembled_context: str
    context_score: float
    metadata: Dict[str, Any]

class ContextManager:
    """
    🧠 THE DIVINE CONTEXT MANAGER

    This manager dynamically assembles and manages contextual information
    from multiple sources to provide rich, relevant context for model
    inference and understanding.

    DIVINE ARCHITECTURE:
    - Multi-source context aggregation
    - Dynamic context relevance scoring
    - Temporal context management
    - Domain-aware context injection
    - Real-time context updates and adaptation
    """

    def __init__(self, config: Optional[Dict] = None):
        """Initialize the divine context manager"""
        self.config = config or self._get_default_config()

        # Context sources and storage
        self.context_sources = {}
        self.insights_cache = {}
        self.assembled_contexts = {}

        # Context scoring and ranking
        self.relevance_threshold = self.config.get('relevance_threshold', 0.6)
        self.max_context_length = self.config.get('max_context_length', 1000)
        self.temporal_window = self.config.get('temporal_window', 24)  # hours

        # Initialize context providers
        self._initialize_context_providers()

        logger.info("🧠 ContextManager initialized with divine precision")

    def _initialize_context_providers(self):
        """Initialize context providers for different data sources"""
        self.providers = {
            'market': self._get_market_context,
            'social': self._get_social_context,
            'news': self._get_news_context,
            'historical': self._get_historical_context,
            'domain': self._get_domain_context,
            'psychological': self._get_psychological_context
        }

        logger.info(f"✅ Context providers initialized: {list(self.providers.keys())}")

    async def generate_insights(self, text: str, context: Optional[Dict] = None, domain_focus: Optional[str] = None) -> Dict:
        """
        🎯 GENERATE CONTEXTUAL INSIGHTS

        Generate comprehensive contextual insights for the given text.

        Args:
            text: Input text to generate context for
            context: Additional context information
            domain_focus: Specific domain to focus on

        Returns:
            Comprehensive contextual insights
        """
        start_time = datetime.utcnow()

        try:
            # Extract query characteristics
            query_characteristics = await self._analyze_query_characteristics(text)

            # Gather context from all sources
            context_sources = await self._gather_context_sources(text, context, domain_focus)

            # Generate domain-specific insights
            domain_insights = await self._generate_domain_insights(text, context_sources, domain_focus)

            # Assemble comprehensive context
            assembled_context = await self._assemble_context(
                text, query_characteristics, context_sources, domain_insights
            )

            # Calculate context quality score
            context_score = await self._calculate_context_quality(
                assembled_context, domain_insights, context_sources
            )

            processing_time = (datetime.utcnow() - start_time).total_seconds()

            return {
                'insights': {
                    'query_characteristics': query_characteristics,
                    'context_sources': context_sources,
                    'domain_insights': domain_insights,
                    'assembled_context': assembled_context
                },
                'domain_insights': domain_insights,
                'context_score': context_score,
                'metadata': {
                    'processing_time_seconds': processing_time,
                    'query_length': len(text),
                    'context_sources_count': len(context_sources),
                    'domain_insights_count': len(domain_insights),
                    'assembled_context_length': len(assembled_context)
                }
            }

        except Exception as e:
            logger.error(f"❌ Context generation failed: {str(e)}")
            raise

    async def _analyze_query_characteristics(self, text: str) -> Dict:
        """Analyze characteristics of the query text"""
        characteristics = {
            'length': len(text),
            'complexity': await self._calculate_text_complexity(text),
            'domain_indicators': await self._extract_domain_indicators(text),
            'urgency_indicators': await self._extract_urgency_indicators(text),
            'temporal_references': await self._extract_temporal_references(text),
            'sentiment_indicators': await self._extract_sentiment_indicators(text)
        }

        return characteristics

    async def _calculate_text_complexity(self, text: str) -> float:
        """Calculate text complexity score"""
        # Simple complexity metrics
        words = text.split()
        sentences = re.split(r'[.!?]+', text)

        if not words or not sentences:
            return 0.0

        avg_words_per_sentence = len(words) / max(len(sentences), 1)
        unique_words_ratio = len(set(words)) / max(len(words), 1)

        # Technical terms (crypto/finance specific)
        technical_terms = ['bitcoin', 'ethereum', 'blockchain', 'defi', 'nft', 'volatility',
                          'market', 'trading', 'price', 'analysis', 'technical', 'fundamental']
        technical_count = sum(1 for term in technical_terms if term in text.lower())

        technical_ratio = technical_count / max(len(words), 1)

        # Combine metrics
        complexity = (avg_words_per_sentence * 0.1 +
                     unique_words_ratio * 0.3 +
                     technical_ratio * 0.6)

        return min(1.0, complexity)

    async def _extract_domain_indicators(self, text: str) -> List[str]:
        """Extract domain-specific indicators from text"""
        indicators = []

        # Cryptocurrency indicators
        crypto_terms = ['bitcoin', 'ethereum', 'btc', 'eth', 'crypto', 'blockchain', 'defi', 'nft', 'web3']
        if any(term in text.lower() for term in crypto_terms):
            indicators.append('cryptocurrency')

        # Financial indicators
        finance_terms = ['market', 'trading', 'price', 'volatility', 'analysis', 'technical', 'fundamental']
        if any(term in text.lower() for term in finance_terms):
            indicators.append('finance')

        # Psychological indicators
        psych_terms = ['fomo', 'fud', 'sentiment', 'psychology', 'behavior', 'emotion', 'bias']
        if any(term in text.lower() for term in psych_terms):
            indicators.append('psychology')

        return indicators

    async def _extract_urgency_indicators(self, text: str) -> List[str]:
        """Extract urgency indicators from text"""
        indicators = []

        urgency_words = ['urgent', 'now', 'immediately', 'quickly', 'asap', 'hurry', 'rush', 'fast', 'breaking']
        if any(word in text.lower() for word in urgency_words):
            indicators.append('high_urgency')

        # Check for time-sensitive terms
        time_sensitive = ['today', 'current', 'latest', 'recent', 'update', 'news']
        if any(term in text.lower() for term in time_sensitive):
            indicators.append('time_sensitive')

        return indicators

    async def _extract_temporal_references(self, text: str) -> Dict:
        """Extract temporal references from text"""
        temporal = {}

        # Time period references
        time_patterns = {
            'short_term': ['hour', 'minute', 'today', 'now', 'current'],
            'medium_term': ['day', 'week', 'recent', 'latest'],
            'long_term': ['month', 'year', 'historical', 'trend']
        }

        for period, patterns in time_patterns.items():
            if any(pattern in text.lower() for pattern in patterns):
                temporal[period] = True

        return temporal

    async def _extract_sentiment_indicators(self, text: str) -> Dict:
        """Extract sentiment indicators from text"""
        sentiment = {
            'positive_words': 0,
            'negative_words': 0,
            'neutral_words': 0
        }

        positive_terms = ['bullish', 'positive', 'good', 'great', 'excellent', 'amazing', 'optimistic']
        negative_terms = ['bearish', 'negative', 'bad', 'terrible', 'awful', 'pessimistic', 'worried']
        neutral_terms = ['sideways', 'neutral', 'flat', 'stable', 'consolidation']

        for term in positive_terms:
            sentiment['positive_words'] += text.lower().count(term)

        for term in negative_terms:
            sentiment['negative_words'] += text.lower().count(term)

        for term in neutral_terms:
            sentiment['neutral_words'] += text.lower().count(term)

        return sentiment

    async def _gather_context_sources(self, text: str, context: Optional[Dict] = None, domain_focus: Optional[str] = None) -> List[ContextSource]:
        """Gather context from all available sources"""
        sources = []

        # Gather from each provider
        for provider_name, provider_func in self.providers.items():
            try:
                provider_context = await provider_func(text, context, domain_focus)
                if provider_context:
                    source = ContextSource(
                        name=provider_name,
                        type=provider_name,
                        content=provider_context,
                        relevance_score=await self._calculate_source_relevance(provider_context, text)
                    )
                    sources.append(source)

            except Exception as e:
                logger.warning(f"⚠️ Context provider {provider_name} failed: {str(e)}")
                continue

        # Sort by relevance score
        sources.sort(key=lambda x: x.relevance_score, reverse=True)

        return sources

    async def _get_market_context(self, text: str, context: Optional[Dict] = None, domain_focus: Optional[str] = None) -> Optional[Dict]:
        """Get market context information"""
        market_context = {}

        # Extract market-related terms from text
        market_terms = ['price', 'market', 'trading', 'volume', 'volatility', 'cap', 'valuation']
        market_relevant = any(term in text.lower() for term in market_terms)

        if market_relevant:
            market_context = {
                'market_sentiment': 'neutral',  # This would come from actual market data
                'volatility_level': 'medium',
                'trading_volume': 'normal',
                'price_trend': 'sideways',
                'key_levels': {
                    'support': [],
                    'resistance': []
                },
                'market_phase': 'consolidation'
            }

        return market_context if market_context else None

    async def _get_social_context(self, text: str, context: Optional[Dict] = None, domain_focus: Optional[str] = None) -> Optional[Dict]:
        """Get social context information"""
        social_context = {}

        # Check for social sentiment terms
        social_terms = ['twitter', 'reddit', 'social', 'community', 'sentiment', 'mood']
        social_relevant = any(term in text.lower() for term in social_terms)

        if social_relevant:
            social_context = {
                'social_sentiment': 'mixed',
                'social_volume': 'moderate',
                'influencer_activity': 'normal',
                'trending_topics': [],
                'community_mood': 'neutral'
            }

        return social_context if social_context else None

    async def _get_news_context(self, text: str, context: Optional[Dict] = None, domain_focus: Optional[str] = None) -> Optional[Dict]:
        """Get news context information"""
        news_context = {}

        # Check for news-related terms
        news_terms = ['news', 'announcement', 'update', 'report', 'article', 'media']
        news_relevant = any(term in text.lower() for term in news_terms)

        if news_relevant:
            news_context = {
                'news_volume': 'normal',
                'sentiment_bias': 'neutral',
                'key_topics': [],
                'recency': 'recent',
                'reliability': 'medium'
            }

        return news_context if news_context else None

    async def _get_historical_context(self, text: str, context: Optional[Dict] = None, domain_focus: Optional[str] = None) -> Optional[Dict]:
        """Get historical context information"""
        historical_context = {}

        # Check for historical references
        historical_terms = ['history', 'historical', 'past', 'previous', 'before', 'trend']
        historical_relevant = any(term in text.lower() for term in historical_terms)

        if historical_relevant:
            historical_context = {
                'historical_period': 'medium_term',
                'trend_direction': 'sideways',
                'volatility_pattern': 'normal',
                'seasonal_factors': 'none',
                'comparable_periods': []
            }

        return historical_context if historical_context else None

    async def _get_domain_context(self, text: str, context: Optional[Dict] = None, domain_focus: Optional[str] = None) -> Optional[Dict]:
        """Get domain-specific context information"""
        domain_context = {}

        # Extract domain indicators
        domain_indicators = await self._extract_domain_indicators(text)

        if domain_indicators:
            domain_context = {
                'primary_domain': domain_indicators[0] if domain_indicators else 'general',
                'domain_confidence': 0.8,
                'domain_specific_terms': await self._extract_domain_terms(text),
                'domain_relationships': []
            }

        return domain_context if domain_context else None

    async def _get_psychological_context(self, text: str, context: Optional[Dict] = None, domain_focus: Optional[str] = None) -> Optional[Dict]:
        """Get psychological context information"""
        psych_context = {}

        # Check for psychological terms
        psych_terms = ['psychology', 'behavior', 'emotion', 'sentiment', 'bias', 'fomo', 'fud']
        psych_relevant = any(term in text.lower() for term in psych_terms)

        if psych_relevant:
            psych_context = {
                'emotional_state': 'neutral',
                'cognitive_biases': [],
                'social_influence': 'medium',
                'risk_tolerance': 'moderate',
                'decision_making_style': 'analytical'
            }

        return psych_context if psych_context else None

    async def _generate_domain_insights(self, text: str, context_sources: List[ContextSource], domain_focus: Optional[str] = None) -> List[ContextualInsight]:
        """Generate domain-specific insights from context sources"""
        insights = []

        # Generate insights for each relevant domain
        for source in context_sources:
            if source.relevance_score < self.relevance_threshold:
                continue

            # Generate insight based on source type
            insight = await self._generate_insight_from_source(source, text)
            if insight:
                insights.append(insight)

        # Sort by relevance
        insights.sort(key=lambda x: x.relevance_to_query, reverse=True)

        return insights

    async def _generate_insight_from_source(self, source: ContextSource, text: str) -> Optional[ContextualInsight]:
        """Generate insight from a specific context source"""
        try:
            # Calculate relevance to query
            relevance = await self._calculate_source_relevance(source.content, text)

            if relevance < self.relevance_threshold:
                return None

            # Generate insight content based on source type
            if source.type == 'market':
                insight_content = await self._generate_market_insight(source.content, text)
                insight_type = 'market_sentiment'

            elif source.type == 'social':
                insight_content = await self._generate_social_insight(source.content, text)
                insight_type = 'social_dynamics'

            elif source.type == 'domain':
                insight_content = await self._generate_domain_insight(source.content, text)
                insight_type = 'domain_knowledge'

            elif source.type == 'psychological':
                insight_content = await self._generate_psychological_insight(source.content, text)
                insight_type = 'psychological_state'

            else:
                insight_content = f"Context from {source.type}: {json.dumps(source.content)[:200]}..."
                insight_type = 'general_context'

            # Create insight object
            insight = ContextualInsight(
                insight_type=insight_type,
                content=insight_content,
                confidence=source.relevance_score,
                sources=[source.name],
                relevance_to_query=relevance,
                temporal_validity=timedelta(hours=self.temporal_window)
            )

            return insight

        except Exception as e:
            logger.warning(f"⚠️ Failed to generate insight from source {source.name}: {str(e)}")
            return None

    async def _generate_market_insight(self, market_context: Dict, text: str) -> str:
        """Generate market-specific insight"""
        sentiment = market_context.get('market_sentiment', 'neutral')
        volatility = market_context.get('volatility_level', 'medium')

        return f"Current market sentiment is {sentiment} with {volatility} volatility levels."

    async def _generate_social_insight(self, social_context: Dict, text: str) -> str:
        """Generate social-specific insight"""
        sentiment = social_context.get('social_sentiment', 'mixed')
        volume = social_context.get('social_volume', 'moderate')

        return f"Social sentiment is currently {sentiment} with {volume} activity levels."

    async def _generate_domain_insight(self, domain_context: Dict, text: str) -> str:
        """Generate domain-specific insight"""
        domain = domain_context.get('primary_domain', 'general')
        confidence = domain_context.get('domain_confidence', 0.5)

        return f"Analysis in {domain} domain with {confidence:.1%} confidence."

    async def _generate_psychological_insight(self, psych_context: Dict, text: str) -> str:
        """Generate psychological insight"""
        emotional_state = psych_context.get('emotional_state', 'neutral')
        risk_tolerance = psych_context.get('risk_tolerance', 'moderate')

        return f"Psychological state is {emotional_state} with {risk_tolerance} risk tolerance."

    async def _assemble_context(self,
                               text: str,
                               query_characteristics: Dict,
                               context_sources: List[ContextSource],
                               domain_insights: List[ContextualInsight]) -> str:
        """Assemble comprehensive context for model inference"""
        context_parts = []

        # Add domain context header
        primary_domain = query_characteristics.get('domain_indicators', ['general'])[0]
        context_parts.append(f"DOMAIN: {primary_domain.upper()}")

        # Add temporal context
        temporal_refs = query_characteristics.get('temporal_references', {})
        if temporal_refs:
            context_parts.append(f"TEMPORAL_CONTEXT: {', '.join(temporal_refs.keys())}")

        # Add key insights
        top_insights = domain_insights[:3]  # Top 3 insights
        for insight in top_insights:
            context_parts.append(f"{insight.insight_type.upper()}: {insight.content}")

        # Add market context if relevant
        market_source = next((s for s in context_sources if s.type == 'market'), None)
        if market_source and market_source.relevance_score > 0.7:
            context_parts.append(f"MARKET_CONTEXT: {json.dumps(market_source.content)[:200]}...")

        # Add social context if relevant
        social_source = next((s for s in context_sources if s.type == 'social'), None)
        if social_source and social_source.relevance_score > 0.7:
            context_parts.append(f"SOCIAL_CONTEXT: {json.dumps(social_source.content)[:200]}...")

        # Combine all parts
        assembled = "\n".join(context_parts)

        # Truncate if too long
        if len(assembled) > self.max_context_length:
            assembled = assembled[:self.max_context_length] + "..."

        return assembled

    async def _calculate_source_relevance(self, source_content: Dict, text: str) -> float:
        """Calculate relevance of a context source to the query text"""
        if not source_content:
            return 0.0

        relevance_score = 0.0
        text_lower = text.lower()

        # Simple relevance calculation based on keyword overlap
        for key, value in source_content.items():
            if isinstance(value, str):
                # Check if key or value appears in text
                if key.lower() in text_lower or value.lower() in text_lower:
                    relevance_score += 0.3

            elif isinstance(value, (int, float)):
                # Numeric values get moderate relevance
                relevance_score += 0.1

            elif isinstance(value, list):
                # Lists get relevance based on content overlap
                for item in value:
                    if str(item).lower() in text_lower:
                        relevance_score += 0.2

            elif isinstance(value, dict):
                # Nested dicts get recursive relevance
                nested_relevance = await self._calculate_source_relevance(value, text)
                relevance_score += nested_relevance * 0.5

        return min(1.0, relevance_score)

    async def _calculate_context_quality(self,
                                       assembled_context: str,
                                       domain_insights: List[ContextualInsight],
                                       context_sources: List[ContextSource]) -> float:
        """Calculate overall quality score of assembled context"""
        # Base quality on multiple factors
        factors = []

        # Length factor (prefer moderate length)
        length_score = 1.0 - abs(len(assembled_context) - 500) / 1000  # Optimal around 500 chars
        factors.append(length_score)

        # Insight diversity factor
        insight_types = set(i.insight_type for i in domain_insights)
        diversity_score = len(insight_types) / 5.0  # Normalize to 5 possible types
        factors.append(diversity_score)

        # Source relevance factor
        if context_sources:
            avg_relevance = np.mean([s.relevance_score for s in context_sources])
            factors.append(avg_relevance)

        # Insight confidence factor
        if domain_insights:
            avg_confidence = np.mean([i.confidence for i in domain_insights])
            factors.append(avg_confidence)

        return np.mean(factors) if factors else 0.0

    async def _extract_domain_terms(self, text: str) -> List[str]:
        """Extract domain-specific terms from text"""
        terms = []

        # Cryptocurrency terms
        crypto_patterns = [
            r'\b[A-Z]{2,10}(?=\s|$)',  # BTC, ETH, etc.
            r'\$[A-Z]{2,10}',  # $BTC, $ETH, etc.
            r'\bBitcoin\b', r'\bEthereum\b', r'\bBinance\b', r'\bDeFi\b', r'\bNFT\b'
        ]

        for pattern in crypto_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            terms.extend(matches)

        return list(set(terms))  # Remove duplicates

    def _get_default_config(self) -> Dict:
        """Get default configuration for the context manager"""
        return {
            'relevance_threshold': 0.6,
            'max_context_length': 1000,
            'temporal_window': 24,
            'insight_types': ['market_sentiment', 'social_dynamics', 'domain_knowledge', 'psychological_state'],
            'max_context_sources': 10,
            'cache_insights': True,
            'cache_size': 1000,
            'enable_real_time_updates': True
        }

    def get_cache_stats(self) -> Dict:
        """Get cache statistics"""
        return {
            'insights_cache_size': len(self.insights_cache),
            'assembled_contexts_size': len(self.assembled_contexts),
            'max_cache_size': self.config.get('cache_size', 1000),
            'cache_utilization': (len(self.insights_cache) + len(self.assembled_contexts)) / (2 * self.config.get('cache_size', 1000))
        }
