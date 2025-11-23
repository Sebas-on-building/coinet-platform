"""
📊 DATA INGESTION PIPELINE - THE DIVINE DATA GATHERER
======================================================

This module handles the ingestion of real-time data streams from multiple
sources including market feeds, social media, regulatory announcements,
and other external data sources.

CAPABILITIES:
- Multi-source data ingestion
- Real-time stream processing
- Data quality validation
- Rate limiting and backpressure handling
- Data normalization and enrichment
- Stream health monitoring

"Data is the new oil. It's valuable, but if unrefined it cannot really be used."
- Clive Humby

We refine the raw data streams into golden insights for our learning algorithms.
"""

import asyncio
import logging
import json
import time
from typing import Dict, List, Optional, Union, Any, Callable, AsyncGenerator, Tuple
from datetime import datetime, timedelta
import aiohttp
import websockets
import redis
try:
    import kafka
    KAFKA_AVAILABLE = True
except ImportError:
    kafka = None
    KAFKA_AVAILABLE = False
from dataclasses import dataclass, field
from enum import Enum

import numpy as np
import pandas as pd

# Import existing services for integration
try:
    from ...services.external_data_integration.src.ExternalDataIntegration import ExternalDataIntegration
    from ...services.live_market_feeds.src.services.MarketDataFeedService import MarketDataFeedService
    from ...services.social_media_sentiment.src.SocialMediaMonitor import SocialMediaMonitor
    from ...services.news_aggregator.src.NewsAggregator import NewsAggregator
except ImportError:
    # Fallback for when services aren't available
    ExternalDataIntegration = None
    MarketDataFeedService = None
    SocialMediaMonitor = None
    NewsAggregator = None

logger = logging.getLogger(__name__)


class DataQuality(Enum):
    """Data quality levels"""
    EXCELLENT = "excellent"  # > 0.9
    GOOD = "good"           # 0.7 - 0.9
    ACCEPTABLE = "acceptable"  # 0.5 - 0.7
    POOR = "poor"           # 0.3 - 0.5
    UNUSABLE = "unusable"   # < 0.3


@dataclass
class DataStream:
    """Represents a data stream configuration"""
    stream_id: str
    source: str
    data_type: str
    url: Optional[str] = None
    websocket_url: Optional[str] = None
    kafka_topic: Optional[str] = None
    redis_channel: Optional[str] = None
    polling_interval: int = 60  # seconds
    is_active: bool = True
    quality_threshold: float = 0.7
    rate_limit_per_minute: int = 1000
    last_ingestion: Optional[datetime] = None
    ingestion_count: int = 0
    error_count: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class IngestedDataPoint:
    """Represents a single ingested data point"""
    data_id: str
    timestamp: datetime
    source: str
    data_type: str
    content: Dict[str, Any]
    quality_score: float
    quality_issues: List[str]
    enrichment_metadata: Dict[str, Any]
    processing_latency: float  # milliseconds


class DataIngestionPipeline:
    """
    📊 THE DIVINE DATA INGESTION PIPELINE

    This pipeline orchestrates the ingestion of real-time data from multiple
    sources, ensuring high-quality, normalized data flows to the learning algorithms.

    KEY FEATURES:
    - Multi-protocol support (HTTP, WebSocket, Kafka, Redis)
    - Intelligent rate limiting and backpressure handling
    - Real-time data quality assessment
    - Automatic retry and error handling
    - Data enrichment and normalization
    - Stream health monitoring and alerting
    """

    def __init__(self, config: Optional[Dict] = None):
        """Initialize the data ingestion pipeline"""
        self.config = config or self._get_default_config()

        # Data streams configuration
        self.data_streams: Dict[str, DataStream] = {}
        self.active_connections: Dict[str, Any] = {}

        # Data processing
        self.data_buffer: List[IngestedDataPoint] = []
        self.max_buffer_size = self.config.get('max_buffer_size', 10000)
        self.quality_validator = DataQualityValidator()
        self.data_enricher = DataEnricher()

        # Rate limiting
        self.rate_limiters: Dict[str, Dict] = {}  # stream_id -> rate info

        # Monitoring
        self.ingestion_metrics = {
            'total_ingested': 0,
            'quality_distribution': {},
            'source_performance': {},
            'error_rates': {}
        }

        # Background tasks
        self.ingestion_tasks: List[asyncio.Task] = []
        self.is_running = False

        logger.info("📊 DataIngestionPipeline initialized with divine data gathering capabilities")

    def add_data_stream(self, stream: DataStream):
        """Add a data stream to the pipeline"""
        self.data_streams[stream.stream_id] = stream

        # Initialize rate limiter for this stream
        self.rate_limiters[stream.stream_id] = {
            'requests': [],
            'last_reset': datetime.utcnow(),
            'current_count': 0
        }

        logger.info(f"➕ Added data stream '{stream.stream_id}' from {stream.source}")

    def remove_data_stream(self, stream_id: str):
        """Remove a data stream from the pipeline"""
        if stream_id in self.data_streams:
            del self.data_streams[stream_id]

        if stream_id in self.rate_limiters:
            del self.rate_limiters[stream_id]

        if stream_id in self.active_connections:
            connection = self.active_connections[stream_id]
            if hasattr(connection, 'close'):
                asyncio.create_task(connection.close())
            del self.active_connections[stream_id]

        logger.info(f"➖ Removed data stream '{stream_id}'")

    def setup_default_streams(self):
        """Setup default data streams for crypto markets"""
        default_streams = [
            # Market data streams
            DataStream(
                stream_id="binance_btc",
                source="binance",
                data_type="market_data",
                websocket_url="wss://stream.binance.com:9443/ws/btcusdt@ticker",
                polling_interval=5,
                quality_threshold=0.9,
                rate_limit_per_minute=120
            ),
            DataStream(
                stream_id="coinbase_btc",
                source="coinbase",
                data_type="market_data",
                websocket_url="wss://ws-feed.pro.coinbase.com",
                polling_interval=5,
                quality_threshold=0.9,
                rate_limit_per_minute=120
            ),

            # Social media streams
            DataStream(
                stream_id="twitter_crypto",
                source="twitter",
                data_type="social_sentiment",
                kafka_topic="twitter-crypto-sentiment",
                polling_interval=30,
                quality_threshold=0.7,
                rate_limit_per_minute=60
            ),

            # News streams
            DataStream(
                stream_id="crypto_news",
                source="crypto_news_api",
                data_type="news",
                url="https://api.crypto-news.example.com/latest",
                polling_interval=60,
                quality_threshold=0.8,
                rate_limit_per_minute=30
            ),

            # On-chain data
            DataStream(
                stream_id="ethereum_onchain",
                source="ethereum",
                data_type="on_chain",
                websocket_url="wss://api.etherscan.io/ws",
                polling_interval=10,
                quality_threshold=0.85,
                rate_limit_per_minute=200
            ),

            # Regulatory data
            DataStream(
                stream_id="sec_filings",
                source="sec",
                data_type="regulatory",
                url="https://www.sec.gov/edgar/filings",
                polling_interval=300,  # 5 minutes
                quality_threshold=0.95,
                rate_limit_per_minute=10
            )
        ]

        for stream in default_streams:
            self.add_data_stream(stream)

        logger.info(f"⚙️ Configured {len(default_streams)} default data streams")

    async def start_ingestion(self):
        """Start ingesting data from all configured streams"""
        if self.is_running:
            logger.warning("📊 Data ingestion already running")
            return

        self.is_running = True

        # Start ingestion tasks for each stream
        for stream_id, stream in self.data_streams.items():
            if stream.is_active:
                task = asyncio.create_task(self._ingest_from_stream(stream))
                self.ingestion_tasks.append(task)

        logger.info(f"🚀 Started data ingestion from {len(self.ingestion_tasks)} active streams")

    async def stop_ingestion(self):
        """Stop ingesting data from all streams"""
        if not self.is_running:
            return

        self.is_running = False

        # Cancel all ingestion tasks
        for task in self.ingestion_tasks:
            task.cancel()

        self.ingestion_tasks.clear()

        # Close active connections
        for connection in self.active_connections.values():
            if hasattr(connection, 'close'):
                await connection.close()

        self.active_connections.clear()

        logger.info("⏹️ Stopped data ingestion")

    async def _ingest_from_stream(self, stream: DataStream):
        """Ingest data from a specific stream"""
        logger.info(f"🔄 Starting ingestion from {stream.stream_id}")

        while self.is_running:
            try:
                # Check rate limits
                if not self._check_rate_limit(stream.stream_id, stream.rate_limit_per_minute):
                    await asyncio.sleep(1)
                    continue

                # Ingest data based on stream type
                if stream.websocket_url:
                    await self._ingest_websocket_data(stream)
                elif stream.kafka_topic:
                    await self._ingest_kafka_data(stream)
                elif stream.redis_channel:
                    await self._ingest_redis_data(stream)
                elif stream.url:
                    await self._ingest_http_data(stream)
                else:
                    logger.warning(f"❌ No ingestion method configured for stream {stream.stream_id}")
                    break

                # Update stream metrics
                stream.ingestion_count += 1
                stream.last_ingestion = datetime.utcnow()

            except asyncio.CancelledError:
                logger.info(f"🛑 Ingestion cancelled for {stream.stream_id}")
                break
            except Exception as e:
                logger.error(f"❌ Error ingesting from {stream.stream_id}: {str(e)}")
                stream.error_count += 1

                # Exponential backoff on errors
                await asyncio.sleep(min(2 ** stream.error_count, 300))

    async def _ingest_websocket_data(self, stream: DataStream):
        """Ingest data from WebSocket stream"""
        try:
            async with websockets.connect(stream.websocket_url) as websocket:
                self.active_connections[stream.stream_id] = websocket

                while self.is_running:
                    try:
                        # Receive data with timeout
                        data = await asyncio.wait_for(websocket.recv(), timeout=30.0)
                        await self._process_raw_data(stream, data)

                    except asyncio.TimeoutError:
                        # Send ping to keep connection alive
                        await websocket.ping()
                    except websockets.exceptions.ConnectionClosed:
                        logger.warning(f"🔌 WebSocket connection closed for {stream.stream_id}")
                        break

        except Exception as e:
            logger.error(f"❌ WebSocket connection failed for {stream.stream_id}: {str(e)}")
        finally:
            if stream.stream_id in self.active_connections:
                del self.active_connections[stream.stream_id]

    async def _ingest_kafka_data(self, stream: DataStream):
        """Ingest data from Kafka topic"""
        if not KAFKA_AVAILABLE or kafka is None:
            logger.warning("Kafka not available for data ingestion")
            return

        try:
            consumer = kafka.KafkaConsumer(
                stream.kafka_topic,
                bootstrap_servers=self.config.get('kafka_servers', ['localhost:9092']),
                group_id=f"continual-learning-{stream.stream_id}",
                auto_offset_reset='latest',
                value_deserializer=lambda x: json.loads(x.decode('utf-8'))
            )

            self.active_connections[stream.stream_id] = consumer

            for message in consumer:
                if not self.is_running:
                    break

                await self._process_raw_data(stream, message.value)

        except Exception as e:
            logger.error(f"❌ Kafka ingestion failed for {stream.stream_id}: {str(e)}")
        finally:
            if stream.stream_id in self.active_connections:
                self.active_connections[stream.stream_id].close()
                del self.active_connections[stream.stream_id]

    async def _ingest_redis_data(self, stream: DataStream):
        """Ingest data from Redis channel"""
        try:
            redis_client = redis.Redis(
                host=self.config.get('redis_host', 'localhost'),
                port=self.config.get('redis_port', 6379),
                decode_responses=True
            )

            self.active_connections[stream.stream_id] = redis_client

            pubsub = redis_client.pubsub()
            pubsub.subscribe(stream.redis_channel)

            for message in pubsub.listen():
                if not self.is_running or message['type'] != 'message':
                    break

                await self._process_raw_data(stream, json.loads(message['data']))

        except Exception as e:
            logger.error(f"❌ Redis ingestion failed for {stream.stream_id}: {str(e)}")
        finally:
            if stream.stream_id in self.active_connections:
                self.active_connections[stream.stream_id].close()
                del self.active_connections[stream.stream_id]

    async def _ingest_http_data(self, stream: DataStream):
        """Ingest data from HTTP endpoint"""
        try:
            async with aiohttp.ClientSession() as session:
                while self.is_running:
                    try:
                        async with session.get(stream.url) as response:
                            if response.status == 200:
                                data = await response.json()
                                await self._process_raw_data(stream, data)
                            else:
                                logger.warning(f"❌ HTTP {response.status} for {stream.stream_id}")

                        # Wait for next poll
                        await asyncio.sleep(stream.polling_interval)

                    except Exception as e:
                        logger.error(f"❌ HTTP request failed for {stream.stream_id}: {str(e)}")
                        await asyncio.sleep(stream.polling_interval)

        except Exception as e:
            logger.error(f"❌ HTTP session failed for {stream.stream_id}: {str(e)}")

    async def _process_raw_data(self, stream: DataStream, raw_data: Any):
        """Process raw data from any source"""
        start_time = time.time()

        try:
            # Validate data quality
            quality_result = self.quality_validator.validate_data(raw_data, stream.data_type)
            if quality_result['score'] < stream.quality_threshold:
                logger.debug(f"❌ Poor data quality for {stream.stream_id}: {quality_result['score']:.3f}")
                return

            # Enrich data
            enriched_data = await self.data_enricher.enrich_data(raw_data, stream.source, stream.data_type)

            # Create data point
            data_point = IngestedDataPoint(
                data_id=f"{stream.stream_id}_{int(time.time()*1000)}",
                timestamp=datetime.utcnow(),
                source=stream.source,
                data_type=stream.data_type,
                content=enriched_data,
                quality_score=quality_result['score'],
                quality_issues=quality_result['issues'],
                enrichment_metadata=self.data_enricher.get_metadata(),
                processing_latency=(time.time() - start_time) * 1000
            )

            # Add to buffer
            self.data_buffer.append(data_point)

            # Maintain buffer size
            if len(self.data_buffer) > self.max_buffer_size:
                self.data_buffer = self.data_buffer[-self.max_buffer_size:]

            # Update metrics
            self.ingestion_metrics['total_ingested'] += 1
            self._update_quality_distribution(quality_result['score'])
            self._update_source_performance(stream.stream_id, quality_result['score'])

            logger.debug(f"✅ Processed data point from {stream.stream_id} (quality: {quality_result['score']:.3f})")

        except Exception as e:
            logger.error(f"❌ Failed to process data from {stream.stream_id}: {str(e)}")

    def _check_rate_limit(self, stream_id: str, max_per_minute: int) -> bool:
        """Check if stream is within rate limits"""
        now = datetime.utcnow()
        rate_info = self.rate_limiters.get(stream_id, {})

        if not rate_info:
            return True

        # Reset counter if minute has passed
        if (now - rate_info['last_reset']).total_seconds() >= 60:
            rate_info['requests'] = []
            rate_info['last_reset'] = now
            rate_info['current_count'] = 0

        # Check if under limit
        if rate_info['current_count'] < max_per_minute:
            rate_info['requests'].append(now)
            rate_info['current_count'] += 1
            return True

        return False

    def _update_quality_distribution(self, score: float):
        """Update quality distribution metrics"""
        quality_bucket = self._get_quality_bucket(score)
        self.ingestion_metrics['quality_distribution'][quality_bucket] = \
            self.ingestion_metrics['quality_distribution'].get(quality_bucket, 0) + 1

    def _update_source_performance(self, stream_id: str, score: float):
        """Update source performance metrics"""
        if stream_id not in self.ingestion_metrics['source_performance']:
            self.ingestion_metrics['source_performance'][stream_id] = {
                'total': 0,
                'quality_sum': 0.0,
                'error_count': 0
            }

        perf = self.ingestion_metrics['source_performance'][stream_id]
        perf['total'] += 1
        perf['quality_sum'] += score
        perf['avg_quality'] = perf['quality_sum'] / perf['total']

    def _get_quality_bucket(self, score: float) -> str:
        """Get quality bucket for a score"""
        if score >= 0.9:
            return 'excellent'
        elif score >= 0.7:
            return 'good'
        elif score >= 0.5:
            return 'acceptable'
        elif score >= 0.3:
            return 'poor'
        else:
            return 'unusable'

    def get_data_batch(self, batch_size: int = 100) -> List[IngestedDataPoint]:
        """Get a batch of ingested data points"""
        batch = self.data_buffer[-batch_size:] if self.data_buffer else []
        return batch

    def clear_buffer(self):
        """Clear the data buffer"""
        self.data_buffer.clear()
        logger.info("🧹 Data buffer cleared")

    def get_ingestion_metrics(self) -> Dict[str, Any]:
        """Get current ingestion metrics"""
        return {
            'total_ingested': self.ingestion_metrics['total_ingested'],
            'buffer_size': len(self.data_buffer),
            'quality_distribution': self.ingestion_metrics['quality_distribution'],
            'source_performance': self.ingestion_metrics['source_performance'],
            'active_streams': len([s for s in self.data_streams.values() if s.is_active]),
            'error_rates': self.ingestion_metrics['error_rates']
        }

    def _get_default_config(self) -> Dict:
        """Get default configuration"""
        return {
            'max_buffer_size': 10000,
            'quality_check_interval': 60,
            'rate_limit_window': 60,
            'kafka_servers': ['localhost:9092'],
            'redis_host': 'localhost',
            'redis_port': 6379,
            'http_timeout': 30,
            'websocket_timeout': 30
        }


class DataQualityValidator:
    """Validates the quality of ingested data"""

    def __init__(self):
        self.quality_checks = {
            'completeness': self._check_completeness,
            'freshness': self._check_freshness,
            'consistency': self._check_consistency,
            'reliability': self._check_reliability
        }

    def validate_data(self, data: Any, data_type: str) -> Dict[str, Any]:
        """Validate data quality"""
        score = 0.0
        issues = []
        weights = {'completeness': 0.3, 'freshness': 0.3, 'consistency': 0.2, 'reliability': 0.2}

        for check_name, check_func in self.quality_checks.items():
            check_score, check_issues = check_func(data, data_type)
            score += check_score * weights[check_name]
            issues.extend(check_issues)

        return {
            'score': min(score, 1.0),
            'issues': issues,
            'breakdown': {name: check_func(data, data_type)[0] for name, check_func in self.quality_checks.items()}
        }

    def _check_completeness(self, data: Any, data_type: str) -> Tuple[float, List[str]]:
        """Check data completeness"""
        issues = []

        if not data:
            return 0.0, ['Empty data']

        # Check for required fields based on data type
        required_fields = {
            'market_data': ['price', 'timestamp', 'symbol'],
            'social_sentiment': ['text', 'timestamp', 'sentiment_score'],
            'news': ['title', 'content', 'timestamp', 'source'],
            'on_chain': ['transaction_hash', 'timestamp', 'block_number']
        }

        if data_type in required_fields:
            missing_fields = []
            for field in required_fields[data_type]:
                if field not in data:
                    missing_fields.append(field)

            if missing_fields:
                issues.extend([f'Missing field: {field}' for field in missing_fields])
                return 0.5, issues

        return 1.0, issues

    def _check_freshness(self, data: Any, data_type: str) -> Tuple[float, List[str]]:
        """Check data freshness"""
        issues = []

        # Check timestamp if available
        if 'timestamp' in data:
            try:
                data_time = datetime.fromisoformat(data['timestamp'])
                age_seconds = (datetime.utcnow() - data_time).total_seconds()

                # Different freshness requirements by data type
                max_age = {
                    'market_data': 60,      # 1 minute
                    'social_sentiment': 300, # 5 minutes
                    'news': 3600,           # 1 hour
                    'on_chain': 600         # 10 minutes
                }

                if data_type in max_age:
                    if age_seconds > max_age[data_type]:
                        issues.append(f'Data is {age_seconds}s old (max: {max_age[data_type]}s)')
                        return 0.3, issues

                # Score based on age
                freshness_score = max(0, 1 - (age_seconds / max_age.get(data_type, 300)))
                return freshness_score, issues

            except (ValueError, TypeError):
                issues.append('Invalid timestamp format')
                return 0.5, issues

        return 0.8, issues  # Default score if no timestamp

    def _check_consistency(self, data: Any, data_type: str) -> Tuple[float, List[str]]:
        """Check data consistency"""
        issues = []

        # Type-specific consistency checks
        if data_type == 'market_data':
            # Check price ranges
            if 'price' in data and data['price'] <= 0:
                issues.append('Invalid price (must be positive)')
            if 'volume' in data and data['volume'] < 0:
                issues.append('Invalid volume (cannot be negative)')

        elif data_type == 'social_sentiment':
            # Check sentiment score range
            if 'sentiment_score' in data:
                score = data['sentiment_score']
                if not (-1 <= score <= 1):
                    issues.append('Sentiment score out of range [-1, 1]')

        return 1.0 if not issues else 0.5, issues

    def _check_reliability(self, data: Any, data_type: str) -> Tuple[float, List[str]]:
        """Check data reliability"""
        issues = []

        # Check for obvious manipulation indicators
        if data_type == 'market_data':
            if 'price_change' in data and abs(data['price_change']) > 50:
                issues.append('Extreme price change detected (>50%)')

        elif data_type == 'social_sentiment':
            if 'engagement' in data and data['engagement'] > 1000000:
                issues.append('Unusually high engagement count')

        return 1.0 if not issues else 0.7, issues


class DataEnricher:
    """Enriches ingested data with additional context"""

    def __init__(self):
        self.enrichment_cache = {}
        self.cache_ttl = 300  # 5 minutes

    async def enrich_data(self, data: Any, source: str, data_type: str) -> Dict[str, Any]:
        """Enrich data with additional context"""
        enriched = dict(data) if isinstance(data, dict) else {'raw_data': data}

        # Add metadata
        enriched['_ingestion_metadata'] = {
            'source': source,
            'data_type': data_type,
            'enriched_at': datetime.utcnow().isoformat(),
            'enrichment_version': '1.0'
        }

        # Type-specific enrichment
        if data_type == 'market_data':
            enriched = await self._enrich_market_data(enriched)
        elif data_type == 'social_sentiment':
            enriched = await self._enrich_social_data(enriched)
        elif data_type == 'news':
            enriched = await self._enrich_news_data(enriched)

        return enriched

    async def _enrich_market_data(self, data: Dict) -> Dict:
        """Enrich market data"""
        # Add technical indicators if price data is available
        if 'price' in data and 'timestamp' in data:
            # This would calculate real technical indicators
            data['technical_indicators'] = {
                'rsi': 50.0,  # Placeholder
                'macd': 0.0,
                'bollinger_position': 0.5
            }

        # Add market context
        data['market_context'] = {
            'market_phase': 'neutral',  # Would be calculated
            'volatility_regime': 'normal',
            'liquidity_score': 0.8
        }

        return data

    async def _enrich_social_data(self, data: Dict) -> Dict:
        """Enrich social media data"""
        # Add sentiment analysis enhancements
        if 'text' in data:
            # This would use the psychology engine for deeper analysis
            data['enhanced_sentiment'] = {
                'emotional_intensity': 0.5,
                'manipulation_probability': 0.1,
                'influence_score': 0.6
            }

        # Add social context
        data['social_context'] = {
            'platform': 'unknown',
            'reach_estimate': 1000,
            'authenticity_score': 0.8
        }

        return data

    async def _enrich_news_data(self, data: Dict) -> Dict:
        """Enrich news data"""
        # Add credibility assessment
        data['credibility_assessment'] = {
            'source_reliability': 0.8,
            'fact_checking_score': 0.7,
            'bias_indicators': []
        }

        # Add impact assessment
        data['impact_assessment'] = {
            'market_relevance': 0.6,
            'urgency_level': 'medium',
            'affected_assets': []
        }

        return data

    def get_metadata(self) -> Dict[str, Any]:
        """Get enrichment metadata"""
        return {
            'cache_size': len(self.enrichment_cache),
            'cache_ttl': self.cache_ttl,
            'enrichment_version': '1.0'
        }
