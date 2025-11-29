"""
🌊 TEMPORAL CONTEXT ENGINE - TRACKING LANGUAGE EVOLUTION THROUGH TIME

Revolutionary system for understanding how language and sentiment evolve over time
in cryptocurrency markets and social discourse.
"""

import asyncio
import logging
from typing import Dict, List, Tuple, Any, Optional, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import numpy as np
from collections import defaultdict, deque
import json
import hashlib

@dataclass
class TemporalSnapshot:
    """Snapshot of language state at a specific point in time"""
    timestamp: datetime
    vocabulary: Dict[str, float]  # Word frequency scores
    sentiment_distribution: Dict[str, float]  # Sentiment categories and their prevalence
    topic_clusters: List[Dict[str, Any]]  # Emerging topics and their evolution
    linguistic_patterns: Dict[str, Any]  # Grammar, syntax, and stylistic patterns
    market_context: Dict[str, Any]  # Market conditions at this time
    social_signals: Dict[str, float]  # Social media and community signals

@dataclass
class LanguageEvolution:
    """Tracks how language patterns evolve over time"""
    evolution_rate: float  # Rate of vocabulary change
    sentiment_drift: float  # How sentiment interpretations shift
    topic_emergence: List[str]  # New topics that emerged
    linguistic_shifts: List[str]  # Changes in communication patterns
    cultural_adaptation: float  # How language adapts to cultural changes

@dataclass
class MarketSentimentTimeline:
    """Timeline of sentiment evolution in crypto markets"""
    time_range: Tuple[datetime, datetime]
    sentiment_trajectory: List[Tuple[datetime, float]]  # Time -> sentiment score
    volatility_windows: List[Tuple[datetime, datetime]]  # Periods of high volatility
    trend_reversals: List[datetime]  # Points where sentiment direction changed
    predictive_signals: Dict[str, float]  # Signals that predict future sentiment

class TemporalContextEngine:
    """
    🕰️ REVOLUTIONARY TEMPORAL CONTEXT ENGINE

    Tracks the evolution of language, sentiment, and cultural patterns over time
    to provide unprecedented temporal context for current analysis.
    """

    def __init__(self, config: Optional[Dict] = None):
        self.config = config or self._get_default_config()
        self.temporal_snapshots: deque = deque(maxlen=self.config['max_snapshots'])
        self.evolution_tracker = LanguageEvolutionTracker(self.config.get('evolution', {}))
        self.sentiment_analyzer = MarketSentimentTracker(self.config.get('sentiment', {}))
        self.pattern_recognizer = LinguisticPatternRecognizer(self.config.get('patterns', {}))
        self.predictive_model = TemporalPredictionEngine(self.config.get('prediction', {}))

        # Historical data storage
        self.vocabulary_history: Dict[str, List[Tuple[datetime, float]]] = defaultdict(list)
        self.sentiment_history: List[Tuple[datetime, Dict[str, float]]] = []
        self.topic_evolution: Dict[str, List[Tuple[datetime, float]]] = defaultdict(list)

    def _get_default_config(self) -> Dict:
        return {
            'max_snapshots': 1000,
            'snapshot_interval': 3600,  # 1 hour
            'evolution_window': 86400 * 7,  # 7 days for evolution tracking
            'prediction_horizon': 86400 * 30,  # 30 days prediction
            'sentiment_granularity': 'hourly',
            'vocabulary_decay': 0.95,
            'cultural_sensitivity': 0.8
        }

    async def capture_temporal_snapshot(self, text_data: List[str], market_data: Dict, social_data: Dict) -> TemporalSnapshot:
        """Capture current state of language and market conditions"""
        timestamp = datetime.utcnow()

        # Analyze current vocabulary
        vocabulary = await self._analyze_vocabulary(text_data)

        # Track sentiment distribution
        sentiment_distribution = await self._analyze_sentiment_distribution(text_data)

        # Identify emerging topics
        topic_clusters = await self._identify_topic_clusters(text_data)

        # Analyze linguistic patterns
        linguistic_patterns = await self._analyze_linguistic_patterns(text_data)

        # Capture market context
        market_context = await self._capture_market_context(market_data)

        # Process social signals
        social_signals = await self._process_social_signals(social_data)

        snapshot = TemporalSnapshot(
            timestamp=timestamp,
            vocabulary=vocabulary,
            sentiment_distribution=sentiment_distribution,
            topic_clusters=topic_clusters,
            linguistic_patterns=linguistic_patterns,
            market_context=market_context,
            social_signals=social_signals
        )

        # Store for temporal analysis
        self.temporal_snapshots.append(snapshot)

        # Update evolution tracking
        await self.evolution_tracker.update_evolution(snapshot)

        return snapshot

    async def _analyze_vocabulary(self, text_data: List[str]) -> Dict[str, float]:
        """Analyze current vocabulary usage patterns"""
        vocabulary = defaultdict(float)

        for text in text_data:
            words = self._tokenize_and_normalize(text)
            for word in words:
                if len(word) > 2:  # Filter out very short words
                    vocabulary[word] += 1

        # Normalize frequencies
        total_words = sum(vocabulary.values())
        if total_words > 0:
            vocabulary = {word: freq / total_words for word, freq in vocabulary.items()}

        return dict(vocabulary)

    async def _analyze_sentiment_distribution(self, text_data: List[str]) -> Dict[str, float]:
        """Analyze distribution of sentiment across different categories"""
        sentiment_scores = []

        for text in text_data:
            # Basic sentiment analysis (would integrate with advanced sentiment models)
            score = self._calculate_sentiment_score(text)
            sentiment_scores.append(score)

        # Categorize sentiments
        bullish = sum(1 for s in sentiment_scores if s > 0.6)
        bearish = sum(1 for s in sentiment_scores if s < 0.4)
        neutral = len(sentiment_scores) - bullish - bearish

        total = len(sentiment_scores)
        if total == 0:
            return {'bullish': 0, 'bearish': 0, 'neutral': 0}

        return {
            'bullish': bullish / total,
            'bearish': bearish / total,
            'neutral': neutral / total
        }

    async def _identify_topic_clusters(self, text_data: List[str]) -> List[Dict[str, Any]]:
        """Identify emerging topics and their characteristics"""
        # Simple topic clustering based on keyword co-occurrence
        topics = []

        # Crypto-specific topic detection
        crypto_keywords = {
            'defi': ['defi', 'decentralized', 'finance', 'yield', 'farming'],
            'nft': ['nft', 'non-fungible', 'token', 'digital', 'art'],
            'web3': ['web3', 'decentralized', 'web', 'future', 'internet'],
            'regulation': ['regulation', 'sec', 'government', 'law', 'compliance']
        }

        for topic_name, keywords in crypto_keywords.items():
            relevance_score = 0
            for text in text_data:
                text_lower = text.lower()
                matches = sum(1 for keyword in keywords if keyword in text_lower)
                relevance_score += matches / len(keywords)

            if relevance_score > 0.1:  # Threshold for topic relevance
                topics.append({
                    'topic': topic_name,
                    'relevance_score': relevance_score,
                    'keyword_matches': [k for k in keywords if any(k in t.lower() for t in text_data)],
                    'emergence_timestamp': datetime.utcnow()
                })

        return topics

    async def _analyze_linguistic_patterns(self, text_data: List[str]) -> Dict[str, Any]:
        """Analyze linguistic patterns and communication styles"""
        patterns = {
            'formality_level': self._calculate_formality(text_data),
            'technical_complexity': self._calculate_technical_complexity(text_data),
            'emoji_usage': self._analyze_emoji_usage(text_data),
            'slang_prevalence': self._analyze_slang_usage(text_data),
            'sentence_structure': self._analyze_sentence_structure(text_data)
        }

        return patterns

    async def _capture_market_context(self, market_data: Dict) -> Dict[str, Any]:
        """Capture current market conditions and trends"""
        return {
            'price_volatility': market_data.get('volatility', 0),
            'trading_volume': market_data.get('volume', 0),
            'market_cap': market_data.get('market_cap', 0),
            'dominant_sentiment': market_data.get('dominant_sentiment', 'neutral'),
            'fear_greed_index': market_data.get('fear_greed', 50),
            'timestamp': datetime.utcnow()
        }

    async def _process_social_signals(self, social_data: Dict) -> Dict[str, float]:
        """Process social media and community signals"""
        signals = {
            'twitter_volume': social_data.get('twitter_mentions', 0),
            'reddit_activity': social_data.get('reddit_posts', 0),
            'telegram_signals': social_data.get('telegram_activity', 0),
            'discord_engagement': social_data.get('discord_messages', 0),
            'influencer_impact': social_data.get('influencer_score', 0)
        }

        return signals

    def _tokenize_and_normalize(self, text: str) -> List[str]:
        """Simple tokenization and normalization"""
        import re
        # Remove punctuation and convert to lowercase
        text = re.sub(r'[^\w\s]', '', text.lower())
        return text.split()

    def _calculate_sentiment_score(self, text: str) -> float:
        """Simple sentiment calculation (would use advanced models)"""
        positive_words = {'bullish', 'moon', 'pump', 'hodl', 'diamond', 'gains', 'profit'}
        negative_words = {'bearish', 'dump', 'crash', 'rekt', 'loss', 'bear', 'panic'}

        words = set(self._tokenize_and_normalize(text))
        positive_count = len(words & positive_words)
        negative_count = len(words & negative_words)

        total_sentiment_words = positive_count + negative_count
        if total_sentiment_words == 0:
            return 0.5

        return positive_count / total_sentiment_words

    def _calculate_formality(self, text_data: List[str]) -> float:
        """Calculate formality level of communication"""
        # Simple heuristic: formal language uses longer words and complex sentences
        avg_word_length = np.mean([len(word) for text in text_data for word in self._tokenize_and_normalize(text)])
        return min(avg_word_length / 8.0, 1.0)  # Normalize to 0-1

    def _calculate_technical_complexity(self, text_data: List[str]) -> float:
        """Calculate technical complexity of language"""
        technical_terms = {'blockchain', 'consensus', 'protocol', 'smart', 'contract', 'defi', 'dao', 'gas', 'fee'}
        complexity_score = 0

        for text in text_data:
            words = set(self._tokenize_and_normalize(text))
            complexity_score += len(words & technical_terms) / len(words) if words else 0

        return complexity_score / len(text_data) if text_data else 0

    def _analyze_emoji_usage(self, text_data: List[str]) -> float:
        """Analyze emoji usage patterns"""
        emoji_count = sum(text.count('😀') + text.count('🚀') + text.count('📈') + text.count('📉') for text in text_data)
        total_chars = sum(len(text) for text in text_data)
        return emoji_count / total_chars if total_chars > 0 else 0

    def _analyze_slang_usage(self, text_data: List[str]) -> float:
        """Analyze crypto slang usage"""
        slang_terms = {'hodl', 'rekt', 'fomo', 'fud', 'moon', 'diamond', 'hands', 'ape', 'paper', 'bag'}
        slang_count = 0

        for text in text_data:
            words = set(self._tokenize_and_normalize(text))
            slang_count += len(words & slang_terms)

        total_words = sum(len(self._tokenize_and_normalize(text)) for text in text_data)
        return slang_count / total_words if total_words > 0 else 0

    def _analyze_sentence_structure(self, text_data: List[str]) -> Dict[str, float]:
        """Analyze sentence structure patterns"""
        # Placeholder for more sophisticated analysis
        return {
            'avg_sentence_length': 15.0,
            'complexity_ratio': 0.3,
            'imperative_usage': 0.1
        }

    async def get_temporal_context(self, current_time: datetime, lookback_hours: int = 24) -> Dict:
        """Get temporal context for current analysis"""
        cutoff_time = current_time - timedelta(hours=lookback_hours)

        # Filter relevant snapshots
        relevant_snapshots = [s for s in self.temporal_snapshots if s.timestamp >= cutoff_time]

        if not relevant_snapshots:
            return {'temporal_context_available': False}

        # Calculate evolution metrics
        evolution = await self.evolution_tracker.calculate_evolution(relevant_snapshots)

        # Analyze sentiment trajectory
        sentiment_timeline = await self.sentiment_analyzer.analyze_sentiment_trajectory(relevant_snapshots)

        # Identify pattern changes
        pattern_changes = await self.pattern_recognizer.detect_pattern_changes(relevant_snapshots)

        return {
            'temporal_context_available': True,
            'lookback_period': lookback_hours,
            'snapshots_analyzed': len(relevant_snapshots),
            'language_evolution': evolution,
            'sentiment_trajectory': sentiment_timeline,
            'pattern_changes': pattern_changes,
            'predictive_insights': await self.predictive_model.generate_insights(relevant_snapshots)
        }

    async def predict_language_evolution(self, prediction_horizon_days: int = 7) -> Dict:
        """Predict how language will evolve in the future"""
        if len(self.temporal_snapshots) < 10:
            return {'prediction_available': False, 'reason': 'insufficient_historical_data'}

        # Use recent snapshots for prediction
        recent_snapshots = list(self.temporal_snapshots)[-10:]

        return await self.predictive_model.predict_evolution(recent_snapshots, prediction_horizon_days)

    async def detect_emerging_trends(self) -> List[Dict[str, Any]]:
        """Detect emerging trends in language and sentiment"""
        if len(self.temporal_snapshots) < 5:
            return []

        recent_snapshots = list(self.temporal_snapshots)[-5:]
        return await self.evolution_tracker.detect_emerging_trends(recent_snapshots)

    async def get_cultural_context(self, time_range: Tuple[datetime, datetime]) -> Dict:
        """Get cultural context for a specific time period"""
        relevant_snapshots = [s for s in self.temporal_snapshots
                            if time_range[0] <= s.timestamp <= time_range[1]]

        if not relevant_snapshots:
            return {'cultural_context': 'insufficient_data'}

        # Aggregate cultural indicators
        cultural_indicators = {
            'dominant_sentiment': self._aggregate_sentiment(relevant_snapshots),
            'communication_style': self._aggregate_communication_style(relevant_snapshots),
            'cultural_markers': self._identify_cultural_markers(relevant_snapshots),
            'social_cohesion': self._calculate_social_cohesion(relevant_snapshots)
        }

        return cultural_indicators

    def _aggregate_sentiment(self, snapshots: List[TemporalSnapshot]) -> str:
        """Aggregate sentiment across snapshots"""
        sentiments = [s.sentiment_distribution for s in snapshots]
        avg_bullish = np.mean([s.get('bullish', 0) for s in sentiments])
        avg_bearish = np.mean([s.get('bearish', 0) for s in sentiments])

        if avg_bullish > avg_bearish + 0.2:
            return 'bullish'
        elif avg_bearish > avg_bullish + 0.2:
            return 'bearish'
        else:
            return 'neutral'

    def _aggregate_communication_style(self, snapshots: List[TemporalSnapshot]) -> Dict:
        """Aggregate communication style patterns"""
        styles = defaultdict(list)

        for snapshot in snapshots:
            patterns = snapshot.linguistic_patterns
            styles['formality'].append(patterns.get('formality_level', 0.5))
            styles['technical'].append(patterns.get('technical_complexity', 0.5))
            styles['emoji'].append(patterns.get('emoji_usage', 0))

        return {
            'avg_formality': np.mean(styles['formality']),
            'avg_technical_complexity': np.mean(styles['technical']),
            'avg_emoji_usage': np.mean(styles['emoji'])
        }

    def _identify_cultural_markers(self, snapshots: List[TemporalSnapshot]) -> List[str]:
        """Identify key cultural markers from the period"""
        markers = set()

        for snapshot in snapshots:
            # Extract cultural markers from vocabulary and topics
            vocab = snapshot.vocabulary
            topics = snapshot.topic_clusters

            # High-frequency crypto-specific terms as cultural markers
            for word, freq in vocab.items():
                if freq > 0.01 and word in ['hodl', 'rekt', 'moon', 'diamond']:
                    markers.add(word)

            # Topic-based markers
            for topic in topics:
                if topic.get('relevance_score', 0) > 0.3:
                    markers.add(topic['topic'])

        return list(markers)

    def _calculate_social_cohesion(self, snapshots: List[TemporalSnapshot]) -> float:
        """Calculate social cohesion based on language consistency"""
        if len(snapshots) < 2:
            return 0.5

        # Measure consistency in vocabulary and sentiment
        vocab_consistency = self._calculate_vocab_consistency(snapshots)
        sentiment_consistency = self._calculate_sentiment_consistency(snapshots)

        return (vocab_consistency + sentiment_consistency) / 2

    def _calculate_vocab_consistency(self, snapshots: List[TemporalSnapshot]) -> float:
        """Calculate vocabulary consistency over time"""
        if len(snapshots) < 2:
            return 1.0

        vocabularies = [set(s.vocabulary.keys()) for s in snapshots]
        intersection = set.intersection(*vocabularies)
        union = set.union(*vocabularies)

        return len(intersection) / len(union) if union else 1.0

    def _calculate_sentiment_consistency(self, snapshots: List[TemporalSnapshot]) -> float:
        """Calculate sentiment consistency over time"""
        sentiments = [s.sentiment_distribution.get('neutral', 0) for s in snapshots]
        return 1.0 - np.std(sentiments)  # Lower variance = higher consistency


class LanguageEvolutionTracker:
    """Tracks evolution of language patterns over time"""

    def __init__(self, config: Dict):
        self.config = config
        self.evolution_history = []

    async def update_evolution(self, snapshot: TemporalSnapshot):
        """Update evolution tracking with new snapshot"""
        if len(self.evolution_history) > 0:
            prev_snapshot = self.evolution_history[-1]
            evolution = self._calculate_evolution_between_snapshots(prev_snapshot, snapshot)
            self.evolution_history.append(evolution)

    def _calculate_evolution_between_snapshots(self, prev: TemporalSnapshot, current: TemporalSnapshot) -> LanguageEvolution:
        """Calculate evolution between two snapshots"""
        # Vocabulary evolution rate
        vocab_overlap = self._calculate_vocab_overlap(prev.vocabulary, current.vocabulary)
        evolution_rate = 1.0 - vocab_overlap

        # Sentiment drift
        sentiment_drift = self._calculate_sentiment_drift(prev.sentiment_distribution, current.sentiment_distribution)

        # Topic emergence
        topic_emergence = self._identify_new_topics(prev.topic_clusters, current.topic_clusters)

        # Linguistic shifts
        linguistic_shifts = self._identify_linguistic_shifts(prev.linguistic_patterns, current.linguistic_patterns)

        # Cultural adaptation
        cultural_adaptation = self._calculate_cultural_adaptation(prev, current)

        return LanguageEvolution(
            evolution_rate=evolution_rate,
            sentiment_drift=sentiment_drift,
            topic_emergence=topic_emergence,
            linguistic_shifts=linguistic_shifts,
            cultural_adaptation=cultural_adaptation
        )

    def _calculate_vocab_overlap(self, vocab1: Dict[str, float], vocab2: Dict[str, float]) -> float:
        """Calculate overlap between two vocabularies"""
        common_words = set(vocab1.keys()) & set(vocab2.keys())
        if not common_words:
            return 0.0

        overlap_score = 0
        for word in common_words:
            overlap_score += min(vocab1[word], vocab2[word])

        return overlap_score

    def _calculate_sentiment_drift(self, sent1: Dict[str, float], sent2: Dict[str, float]) -> float:
        """Calculate how much sentiment distribution has drifted"""
        drift = 0
        for category in ['bullish', 'bearish', 'neutral']:
            drift += abs(sent1.get(category, 0) - sent2.get(category, 0))

        return drift / 2  # Normalize to 0-1

    def _identify_new_topics(self, prev_topics: List[Dict], current_topics: List[Dict]) -> List[str]:
        """Identify newly emerged topics"""
        prev_topic_names = {t['topic'] for t in prev_topics}
        current_topic_names = {t['topic'] for t in current_topics}

        return list(current_topic_names - prev_topic_names)

    def _identify_linguistic_shifts(self, prev_patterns: Dict, current_patterns: Dict) -> List[str]:
        """Identify significant changes in linguistic patterns"""
        shifts = []

        # Check for significant changes in key patterns
        for pattern in ['formality_level', 'technical_complexity', 'emoji_usage']:
            prev_val = prev_patterns.get(pattern, 0.5)
            curr_val = current_patterns.get(pattern, 0.5)
            if abs(curr_val - prev_val) > 0.2:
                shifts.append(f"{pattern}_shift_from_{prev_val:.2f}_to_{curr_val:.2f}")

        return shifts

    def _calculate_cultural_adaptation(self, prev: TemporalSnapshot, current: TemporalSnapshot) -> float:
        """Calculate how much language has adapted to cultural changes"""
        # Measure changes in social signals and market context
        social_change = self._calculate_social_change(prev.social_signals, current.social_signals)
        market_change = self._calculate_market_change(prev.market_context, current.market_context)

        return (social_change + market_change) / 2

    def _calculate_social_change(self, prev_signals: Dict[str, float], curr_signals: Dict[str, float]) -> float:
        """Calculate change in social signals"""
        change = 0
        for signal in prev_signals:
            if signal in curr_signals:
                change += abs(curr_signals[signal] - prev_signals[signal])

        return min(change, 1.0)

    def _calculate_market_change(self, prev_context: Dict, curr_context: Dict) -> float:
        """Calculate change in market context"""
        change = 0
        for metric in ['price_volatility', 'trading_volume', 'fear_greed_index']:
            if metric in prev_context and metric in curr_context:
                change += abs(curr_context[metric] - prev_context[metric])

        return min(change / 100, 1.0)  # Normalize

    async def calculate_evolution(self, snapshots: List[TemporalSnapshot]) -> LanguageEvolution:
        """Calculate overall evolution from snapshots"""
        if len(snapshots) < 2:
            return LanguageEvolution(0, 0, [], [], 0)

        # Use the most recent evolution calculation
        if self.evolution_history:
            return self.evolution_history[-1]

        # Fallback: calculate from snapshots directly
        return self._calculate_evolution_between_snapshots(snapshots[0], snapshots[-1])

    async def detect_emerging_trends(self, recent_snapshots: List[TemporalSnapshot]) -> List[Dict[str, Any]]:
        """Detect emerging trends in language evolution"""
        trends = []

        if len(recent_snapshots) < 3:
            return trends

        # Analyze vocabulary trends
        vocab_trends = self._analyze_vocabulary_trends(recent_snapshots)
        trends.extend(vocab_trends)

        # Analyze sentiment trends
        sentiment_trends = self._analyze_sentiment_trends(recent_snapshots)
        trends.extend(sentiment_trends)

        return trends

    def _analyze_vocabulary_trends(self, snapshots: List[TemporalSnapshot]) -> List[Dict[str, Any]]:
        """Analyze trends in vocabulary evolution"""
        trends = []

        # Track word frequency changes
        word_frequencies = {}
        for snapshot in snapshots:
            for word, freq in snapshot.vocabulary.items():
                if word not in word_frequencies:
                    word_frequencies[word] = []
                word_frequencies[word].append(freq)

        # Identify rapidly growing or declining words
        for word, freqs in word_frequencies.items():
            if len(freqs) >= 3:
                trend = np.polyfit(range(len(freqs)), freqs, 1)[0]
                if abs(trend) > 0.01:  # Significant trend
                    trends.append({
                        'type': 'vocabulary_trend',
                        'word': word,
                        'trend_direction': 'growing' if trend > 0 else 'declining',
                        'trend_strength': abs(trend),
                        'significance': 'high' if abs(trend) > 0.05 else 'medium'
                    })

        return trends

    def _analyze_sentiment_trends(self, snapshots: List[TemporalSnapshot]) -> List[Dict[str, Any]]:
        """Analyze trends in sentiment evolution"""
        trends = []

        # Track sentiment changes
        sentiments = [s.sentiment_distribution for s in snapshots]
        bullish_trend = np.polyfit(range(len(sentiments)), [s.get('bullish', 0) for s in sentiments], 1)[0]

        if abs(bullish_trend) > 0.02:
            trends.append({
                'type': 'sentiment_trend',
                'sentiment': 'bullish',
                'trend_direction': 'increasing' if bullish_trend > 0 else 'decreasing',
                'trend_strength': abs(bullish_trend),
                'significance': 'high' if abs(bullish_trend) > 0.1 else 'medium'
            })

        return trends


class MarketSentimentTracker:
    """Tracks market sentiment evolution over time"""

    def __init__(self, config: Dict):
        self.config = config
        self.sentiment_timeline = []

    async def analyze_sentiment_trajectory(self, snapshots: List[TemporalSnapshot]) -> MarketSentimentTimeline:
        """Analyze how sentiment has evolved"""
        if len(snapshots) < 2:
            return MarketSentimentTimeline(
                time_range=(datetime.utcnow(), datetime.utcnow()),
                sentiment_trajectory=[],
                volatility_windows=[],
                trend_reversals=[],
                predictive_signals={}
            )

        # Extract sentiment trajectory
        trajectory = [(s.timestamp, self._calculate_overall_sentiment(s.sentiment_distribution))
                     for s in snapshots]

        # Identify volatility windows
        volatility_windows = self._identify_volatility_windows(trajectory)

        # Find trend reversals
        trend_reversals = self._find_trend_reversals(trajectory)

        # Generate predictive signals
        predictive_signals = await self._generate_predictive_signals(trajectory)

        return MarketSentimentTimeline(
            time_range=(snapshots[0].timestamp, snapshots[-1].timestamp),
            sentiment_trajectory=trajectory,
            volatility_windows=volatility_windows,
            trend_reversals=trend_reversals,
            predictive_signals=predictive_signals
        )

    def _calculate_overall_sentiment(self, sentiment_dist: Dict[str, float]) -> float:
        """Calculate overall sentiment score (-1 to 1)"""
        bullish = sentiment_dist.get('bullish', 0)
        bearish = sentiment_dist.get('bearish', 0)
        neutral = sentiment_dist.get('neutral', 0)

        return bullish - bearish  # -1 (bearish) to 1 (bullish)

    def _identify_volatility_windows(self, trajectory: List[Tuple[datetime, float]]) -> List[Tuple[datetime, datetime]]:
        """Identify periods of high sentiment volatility"""
        windows = []

        if len(trajectory) < 5:
            return windows

        # Calculate rolling volatility
        sentiments = [s for _, s in trajectory]
        for i in range(len(sentiments) - 4):
            window = sentiments[i:i+5]
            volatility = np.std(window)
            if volatility > 0.3:  # High volatility threshold
                start_time = trajectory[i][0]
                end_time = trajectory[i+4][0]
                windows.append((start_time, end_time))

        return windows

    def _find_trend_reversals(self, trajectory: List[Tuple[datetime, float]]) -> List[datetime]:
        """Find points where sentiment trend reversed"""
        reversals = []

        if len(trajectory) < 5:
            return reversals

        sentiments = [s for _, s in trajectory]

        # Look for trend changes
        for i in range(2, len(sentiments) - 2):
            # Check if trend changed direction
            prev_trend = sentiments[i] - sentiments[i-2]
            next_trend = sentiments[i+2] - sentiments[i]

            if (prev_trend > 0 and next_trend < 0) or (prev_trend < 0 and next_trend > 0):
                if abs(sentiments[i]) > 0.2:  # Significant sentiment level
                    reversals.append(trajectory[i][0])

        return reversals

    async def _generate_predictive_signals(self, trajectory: List[Tuple[datetime, float]]) -> Dict[str, float]:
        """Generate signals for predicting future sentiment"""
        if len(trajectory) < 10:
            return {}

        # Simple predictive signals based on recent trends
        recent_sentiments = [s for _, s in trajectory[-10:]]
        trend = np.polyfit(range(10), recent_sentiments, 1)[0]

        # Momentum signal
        momentum = recent_sentiments[-1] - recent_sentiments[0]

        # Volatility signal
        volatility = np.std(recent_sentiments)

        return {
            'trend_signal': trend,
            'momentum_signal': momentum,
            'volatility_signal': volatility,
            'prediction_confidence': min(0.8, len(trajectory) / 20)  # Higher confidence with more data
        }


class LinguisticPatternRecognizer:
    """Recognizes and tracks linguistic pattern changes"""

    def __init__(self, config: Dict):
        self.config = config
        self.pattern_history = []

    async def detect_pattern_changes(self, snapshots: List[TemporalSnapshot]) -> Dict[str, Any]:
        """Detect significant changes in linguistic patterns"""
        if len(snapshots) < 2:
            return {'changes_detected': False}

        current = snapshots[-1]
        previous = snapshots[-2]

        changes = {
            'vocabulary_changes': self._detect_vocabulary_changes(previous.vocabulary, current.vocabulary),
            'sentiment_changes': self._detect_sentiment_changes(previous.sentiment_distribution, current.sentiment_distribution),
            'style_changes': self._detect_style_changes(previous.linguistic_patterns, current.linguistic_patterns),
            'topic_changes': self._detect_topic_changes(previous.topic_clusters, current.topic_clusters)
        }

        return {
            'changes_detected': any(changes.values()),
            'change_details': changes,
            'change_magnitude': self._calculate_overall_change_magnitude(changes)
        }

    def _detect_vocabulary_changes(self, prev_vocab: Dict[str, float], curr_vocab: Dict[str, float]) -> List[str]:
        """Detect vocabulary changes"""
        changes = []

        # Find new words
        new_words = set(curr_vocab.keys()) - set(prev_vocab.keys())
        if new_words:
            changes.append(f"new_words_emerged: {len(new_words)}")

        # Find declining words
        declining_words = [word for word in prev_vocab if word in curr_vocab and curr_vocab[word] < prev_vocab[word] * 0.5]
        if declining_words:
            changes.append(f"declining_words: {len(declining_words)}")

        return changes

    def _detect_sentiment_changes(self, prev_sent: Dict[str, float], curr_sent: Dict[str, float]) -> List[str]:
        """Detect sentiment distribution changes"""
        changes = []

        for category in ['bullish', 'bearish', 'neutral']:
            prev_val = prev_sent.get(category, 0)
            curr_val = curr_sent.get(category, 0)
            change = curr_val - prev_val

            if abs(change) > 0.2:
                direction = 'increased' if change > 0 else 'decreased'
                changes.append(f"{category}_sentiment_{direction}_by_{abs(change):.2f}")

        return changes

    def _detect_style_changes(self, prev_patterns: Dict, curr_patterns: Dict) -> List[str]:
        """Detect changes in communication style"""
        changes = []

        for pattern in ['formality_level', 'technical_complexity', 'emoji_usage']:
            prev_val = prev_patterns.get(pattern, 0.5)
            curr_val = curr_patterns.get(pattern, 0.5)
            change = curr_val - prev_val

            if abs(change) > 0.15:
                direction = 'increased' if change > 0 else 'decreased'
                changes.append(f"{pattern}_{direction}_by_{abs(change):.2f}")

        return changes

    def _detect_topic_changes(self, prev_topics: List[Dict], curr_topics: List[Dict]) -> List[str]:
        """Detect changes in topic prevalence"""
        changes = []

        prev_topic_scores = {t['topic']: t.get('relevance_score', 0) for t in prev_topics}
        curr_topic_scores = {t['topic']: t.get('relevance_score', 0) for t in curr_topics}

        # Find emerging topics
        for topic, score in curr_topic_scores.items():
            if topic not in prev_topic_scores and score > 0.2:
                changes.append(f"emerging_topic: {topic} (score: {score:.2f})")

        # Find declining topics
        for topic, prev_score in prev_topic_scores.items():
            if topic in curr_topic_scores:
                curr_score = curr_topic_scores[topic]
                if curr_score < prev_score * 0.5:
                    changes.append(f"declining_topic: {topic} (score: {prev_score:.2f} -> {curr_score:.2f})")

        return changes

    def _calculate_overall_change_magnitude(self, changes: Dict[str, List]) -> float:
        """Calculate overall magnitude of detected changes"""
        total_changes = sum(len(changes_list) for changes_list in changes.values())
        return min(total_changes / 10.0, 1.0)  # Normalize to 0-1


class TemporalPredictionEngine:
    """Predicts future language and sentiment evolution"""

    def __init__(self, config: Dict):
        self.config = config
        self.prediction_models = {}

    async def generate_insights(self, snapshots: List[TemporalSnapshot]) -> Dict[str, Any]:
        """Generate predictive insights from recent temporal data"""
        if len(snapshots) < 5:
            return {'insights_available': False}

        # Analyze recent trends
        sentiment_trend = self._analyze_sentiment_trend(snapshots)
        vocabulary_trend = self._analyze_vocabulary_trend(snapshots)
        topic_trend = self._analyze_topic_trend(snapshots)

        return {
            'insights_available': True,
            'sentiment_prediction': sentiment_trend,
            'vocabulary_prediction': vocabulary_trend,
            'topic_prediction': topic_trend,
            'confidence': self._calculate_prediction_confidence(snapshots)
        }

    async def predict_evolution(self, snapshots: List[TemporalSnapshot], horizon_days: int) -> Dict:
        """Predict language evolution over specified horizon"""
        if len(snapshots) < 3:
            return {'prediction_available': False}

        # Simple linear extrapolation (would use ML models in production)
        recent_snapshots = snapshots[-5:]

        # Predict vocabulary evolution
        vocab_prediction = self._predict_vocabulary_evolution(recent_snapshots, horizon_days)

        # Predict sentiment evolution
        sentiment_prediction = self._predict_sentiment_evolution(recent_snapshots, horizon_days)

        # Predict topic evolution
        topic_prediction = self._predict_topic_evolution(recent_snapshots, horizon_days)

        return {
            'prediction_available': True,
            'prediction_horizon_days': horizon_days,
            'vocabulary_evolution': vocab_prediction,
            'sentiment_evolution': sentiment_prediction,
            'topic_evolution': topic_prediction,
            'prediction_confidence': self._calculate_prediction_confidence(snapshots)
        }

    def _analyze_sentiment_trend(self, snapshots: List[TemporalSnapshot]) -> Dict:
        """Analyze recent sentiment trend"""
        sentiments = [self._calculate_overall_sentiment(s.sentiment_distribution) for s in snapshots]

        if len(sentiments) < 3:
            return {'trend': 'insufficient_data'}

        trend = np.polyfit(range(len(sentiments)), sentiments, 1)[0]

        return {
            'trend': 'bullish' if trend > 0.02 else 'bearish' if trend < -0.02 else 'neutral',
            'strength': abs(trend),
            'confidence': min(len(sentiments) / 10, 1.0)
        }

    def _analyze_vocabulary_trend(self, snapshots: List[TemporalSnapshot]) -> Dict:
        """Analyze recent vocabulary trend"""
        # Count unique words across recent snapshots
        vocab_sizes = [len(s.vocabulary) for s in snapshots]

        if len(vocab_sizes) < 3:
            return {'trend': 'insufficient_data'}

        trend = np.polyfit(range(len(vocab_sizes)), vocab_sizes, 1)[0]

        return {
            'trend': 'expanding' if trend > 1 else 'contracting' if trend < -1 else 'stable',
            'rate': trend,
            'confidence': min(len(vocab_sizes) / 5, 1.0)
        }

    def _analyze_topic_trend(self, snapshots: List[TemporalSnapshot]) -> Dict:
        """Analyze recent topic evolution"""
        topic_counts = [len(s.topic_clusters) for s in snapshots]

        if len(topic_counts) < 3:
            return {'trend': 'insufficient_data'}

        trend = np.polyfit(range(len(topic_counts)), topic_counts, 1)[0]

        return {
            'trend': 'diversifying' if trend > 0.5 else 'focusing' if trend < -0.5 else 'stable',
            'rate': trend,
            'confidence': min(len(topic_counts) / 5, 1.0)
        }

    def _predict_vocabulary_evolution(self, snapshots: List[TemporalSnapshot], horizon_days: int) -> Dict:
        """Predict how vocabulary will evolve"""
        vocab_sizes = [len(s.vocabulary) for s in snapshots]
        times = [(s.timestamp - snapshots[0].timestamp).total_seconds() / 86400 for s in snapshots]

        if len(vocab_sizes) < 3:
            return {'prediction': 'insufficient_data'}

        # Linear fit
        slope, intercept = np.polyfit(times, vocab_sizes, 1)

        # Predict future size
        future_days = horizon_days
        predicted_size = slope * future_days + intercept

        return {
            'current_size': vocab_sizes[-1],
            'predicted_size': predicted_size,
            'growth_rate': slope,
            'prediction': 'growing' if slope > 0 else 'shrinking'
        }

    def _predict_sentiment_evolution(self, snapshots: List[TemporalSnapshot], horizon_days: int) -> Dict:
        """Predict sentiment evolution"""
        sentiments = [self._calculate_overall_sentiment(s.sentiment_distribution) for s in snapshots]
        times = [(s.timestamp - snapshots[0].timestamp).total_seconds() / 86400 for s in snapshots]

        if len(sentiments) < 3:
            return {'prediction': 'insufficient_data'}

        slope, intercept = np.polyfit(times, sentiments, 1)
        predicted_sentiment = slope * horizon_days + intercept

        return {
            'current_sentiment': sentiments[-1],
            'predicted_sentiment': predicted_sentiment,
            'trend': 'improving' if slope > 0 else 'declining',
            'confidence': min(len(sentiments) / 10, 1.0)
        }

    def _predict_topic_evolution(self, snapshots: List[TemporalSnapshot], horizon_days: int) -> Dict:
        """Predict topic evolution"""
        topic_counts = [len(s.topic_clusters) for s in snapshots]
        times = [(s.timestamp - snapshots[0].timestamp).total_seconds() / 86400 for s in snapshots]

        if len(topic_counts) < 3:
            return {'prediction': 'insufficient_data'}

        slope, intercept = np.polyfit(times, topic_counts, 1)
        predicted_count = slope * horizon_days + intercept

        return {
            'current_topics': topic_counts[-1],
            'predicted_topics': predicted_count,
            'trend': 'increasing' if slope > 0 else 'decreasing'
        }

    def _calculate_overall_sentiment(self, sentiment_dist: Dict[str, float]) -> float:
        """Calculate overall sentiment score"""
        return sentiment_dist.get('bullish', 0) - sentiment_dist.get('bearish', 0)

    def _calculate_prediction_confidence(self, snapshots: List[TemporalSnapshot]) -> float:
        """Calculate confidence in predictions based on data quality"""
        if len(snapshots) < 3:
            return 0.0

        # Confidence increases with more data and recent activity
        data_points = len(snapshots)
        time_span = (snapshots[-1].timestamp - snapshots[0].timestamp).total_seconds() / 86400

        confidence = min(data_points / 10 + time_span / 30, 1.0)
        return confidence
