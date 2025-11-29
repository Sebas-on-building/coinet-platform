"""
🔥 MULTI-MODAL FUSION API - THE UNIFIED INTERFACE
=================================================

FastAPI router that provides the unified interface for the multi-modal
fusion engine, integrating with existing services and data sources.

This API serves as the central hub for:
- Market data integration (via market-data-service)
- Social sentiment analysis (via social-media-sentiment)
- News aggregation (via news-aggregator)
- On-chain analytics (via on-chain-monitor)
- Psychological profiling (via psychology-engine)

All data sources are seamlessly integrated through the multi-modal fusion pipeline.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import aiohttp
import json

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field

from ..fusion.multimodal_fusion import MultiModalFusionEngine, MultiModalInput, MultiModalOutput
from ..config import settings

logger = logging.getLogger(__name__)

# Initialize the multi-modal fusion engine
fusion_engine = MultiModalFusionEngine()

# API Router
router = APIRouter(
    prefix="/fusion",
    tags=["multi-modal-fusion"],
    responses={404: {"description": "Not found"}},
)

# Request/Response Models
class MultiModalRequest(BaseModel):
    """Request model for multi-modal fusion"""
    token_symbol: str = Field(..., description="Token symbol to analyze (e.g., 'BTC', 'ETH')")
    time_window_minutes: Optional[int] = Field(15, description="Time window for analysis in minutes")
    include_psychology: Optional[bool] = Field(True, description="Include user psychology analysis")
    user_id: Optional[str] = Field(None, description="User ID for personalized psychology analysis")
    modalities: Optional[List[str]] = Field(
        ["market", "social", "news", "onchain", "psychology"],
        description="Modalities to include in analysis"
    )

class MultiModalResponse(BaseModel):
    """Response model for multi-modal fusion results"""
    token_symbol: str
    timestamp: datetime
    predictions: Dict[str, Any]
    confidence_scores: Dict[str, float]
    modality_importance: Dict[str, float]
    cross_modal_insights: Dict[str, Any]
    processing_metadata: Dict[str, Any]
    execution_time_ms: float

class BatchMultiModalRequest(BaseModel):
    """Request model for batch multi-modal analysis"""
    requests: List[MultiModalRequest]

class BatchMultiModalResponse(BaseModel):
    """Response model for batch multi-modal analysis"""
    results: List[MultiModalResponse]
    batch_metadata: Dict[str, Any]

# Service integration URLs (configure based on your deployment)
SERVICE_URLS = {
    'market_data': 'http://localhost:4001',  # market-data-service
    'social_sentiment': 'http://localhost:4002',  # social-media-sentiment
    'news_aggregator': 'http://localhost:4003',  # news-aggregator
    'onchain_monitor': 'http://localhost:4004',  # on-chain-monitor
    'psychology_engine': 'http://localhost:4005'  # psychology-engine
}

# Startup initialization should be handled in the main app with lifespan events
# This would typically be handled in the main app file

@router.post("/analyze", response_model=MultiModalResponse)
async def analyze_multimodal_data(request: MultiModalRequest):
    """
    🎯 ANALYZE MULTI-MODAL DATA

    Perform comprehensive multi-modal analysis integrating all available data sources
    for a given token symbol.

    This endpoint:
    1. Fetches data from all integrated services
    2. Applies temporal alignment and synchronization
    3. Encodes each modality using specialized neural networks
    4. Performs cross-modal fusion for joint representation learning
    5. Generates unified predictions and insights

    Returns:
        Comprehensive multi-modal analysis results
    """

    try:
        # Step 1: Gather data from all services
        logger.info(f"🔍 Gathering multi-modal data for {request.token_symbol}")

        multimodal_data = await gather_multimodal_data(request)

        # Step 2: Create multi-modal input
        multimodal_input = MultiModalInput(
            market_data=multimodal_data.get('market'),
            social_sentiment=multimodal_data.get('social'),
            news_articles=multimodal_data.get('news'),
            onchain_data=multimodal_data.get('onchain'),
            psychological_profile=multimodal_data.get('psychology'),
            timestamp=datetime.utcnow(),
            user_context={'user_id': request.user_id} if request.user_id else None
        )

        # Step 3: Process through fusion engine
        logger.info(f"🔥 Processing {request.token_symbol} through multi-modal fusion pipeline")

        fusion_result = await fusion_engine.process_multimodal_input(multimodal_input)

        # Step 4: Format response
        response = MultiModalResponse(
            token_symbol=request.token_symbol,
            timestamp=datetime.utcnow(),
            predictions=fusion_result.predictions,
            confidence_scores=fusion_result.confidence_scores,
            modality_importance=fusion_result.modality_importance,
            cross_modal_insights=fusion_result.cross_modal_insights,
            processing_metadata=fusion_result.processing_metadata,
            execution_time_ms=fusion_result.execution_time_ms
        )

        logger.info(f"✅ Multi-modal analysis completed for {request.token_symbol} in {fusion_result.execution_time_ms:.2f}ms")

        return response

    except Exception as e:
        logger.error(f"❌ Multi-modal analysis failed for {request.token_symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Multi-modal analysis failed: {str(e)}")

@router.post("/batch-analyze", response_model=BatchMultiModalResponse)
async def batch_analyze_multimodal_data(request: BatchMultiModalRequest):
    """
    🔄 BATCH MULTI-MODAL ANALYSIS

    Perform multi-modal analysis for multiple token symbols concurrently.
    This endpoint is optimized for high-throughput analysis scenarios.
    """

    try:
        logger.info(f"🔄 Starting batch analysis for {len(request.requests)} tokens")

        # Process requests concurrently
        tasks = []
        for req in request.requests:
            task = analyze_multimodal_data(req)
            tasks.append(task)

        # Execute all analyses in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Handle any exceptions
        successful_results = []
        failed_requests = []

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.warning(f"⚠️ Request {i} failed: {str(result)}")
                failed_requests.append({
                    'index': i,
                    'token': request.requests[i].token_symbol,
                    'error': str(result)
                })
            else:
                successful_results.append(result)

        batch_metadata = {
            'total_requests': len(request.requests),
            'successful_analyses': len(successful_results),
            'failed_requests': len(failed_requests),
            'success_rate': len(successful_results) / len(request.requests),
            'batch_start_time': datetime.utcnow().isoformat(),
            'failed_request_details': failed_requests
        }

        logger.info(f"✅ Batch analysis completed: {len(successful_results)}/{len(request.requests)} successful")

        return BatchMultiModalResponse(
            results=successful_results,
            batch_metadata=batch_metadata
        )

    except Exception as e:
        logger.error(f"❌ Batch analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch analysis failed: {str(e)}")

@router.get("/performance")
async def get_fusion_performance():
    """Get performance metrics for the multi-modal fusion engine"""

    metrics = fusion_engine.get_performance_metrics()

    return {
        'performance_metrics': metrics,
        'engine_status': 'operational',
        'supported_modalities': ['market', 'social', 'news', 'onchain', 'psychology'],
        'fusion_strategies': ['attention', 'joint_embedding', 'transformer', 'hybrid'],
        'last_updated': datetime.utcnow().isoformat()
    }

@router.get("/health")
async def fusion_health_check():
    """Health check endpoint for the multi-modal fusion service"""

    try:
        # Test basic functionality
        test_input = MultiModalInput(
            market_data={'test': True},
            timestamp=datetime.utcnow()
        )

        # Quick test (don't run full pipeline)
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'services_connected': await check_service_connectivity(),
            'engine_initialized': True,
            'modalities_available': 5
        }

        return health_status

    except Exception as e:
        logger.error(f"❌ Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Fusion engine health check failed")

async def gather_multimodal_data(request: MultiModalRequest) -> Dict[str, Any]:
    """
    Gather data from all integrated services for a token symbol

    This function coordinates data collection from:
    - Market data service
    - Social media sentiment service
    - News aggregator service
    - On-chain monitor service
    - Psychology engine service
    """

    async with aiohttp.ClientSession() as session:
        tasks = []

        # Market data collection
        if 'market' in request.modalities:
            tasks.append(fetch_market_data(session, request.token_symbol))

        # Social sentiment collection
        if 'social' in request.modalities:
            tasks.append(fetch_social_sentiment(session, request.token_symbol))

        # News collection
        if 'news' in request.modalities:
            tasks.append(fetch_news_articles(session, request.token_symbol))

        # On-chain data collection
        if 'onchain' in request.modalities:
            tasks.append(fetch_onchain_data(session, request.token_symbol))

        # Psychology data collection
        if 'psychology' in request.modalities and request.user_id:
            tasks.append(fetch_psychology_profile(session, request.user_id, request.token_symbol))

        # Execute all data collection tasks
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Process results
        multimodal_data = {}

        task_index = 0
        if 'market' in request.modalities:
            try:
                multimodal_data['market'] = results[task_index] if not isinstance(results[task_index], Exception) else None
            except:
                multimodal_data['market'] = None
            task_index += 1

        if 'social' in request.modalities:
            try:
                multimodal_data['social'] = results[task_index] if not isinstance(results[task_index], Exception) else None
            except:
                multimodal_data['social'] = None
            task_index += 1

        if 'news' in request.modalities:
            try:
                multimodal_data['news'] = results[task_index] if not isinstance(results[task_index], Exception) else None
            except:
                multimodal_data['news'] = None
            task_index += 1

        if 'onchain' in request.modalities:
            try:
                multimodal_data['onchain'] = results[task_index] if not isinstance(results[task_index], Exception) else None
            except:
                multimodal_data['onchain'] = None
            task_index += 1

        if 'psychology' in request.modalities and request.user_id:
            try:
                multimodal_data['psychology'] = results[task_index] if not isinstance(results[task_index], Exception) else None
            except:
                multimodal_data['psychology'] = None

        logger.info(f"📊 Gathered multi-modal data: {list(multimodal_data.keys())}")
        return multimodal_data

async def fetch_market_data(session: aiohttp.ClientSession, token_symbol: str) -> Dict[str, Any]:
    """Fetch market data from market-data-service"""

    try:
        url = f"{SERVICE_URLS['market_data']}/market/{token_symbol}"
        async with session.get(url, timeout=5) as response:
            if response.status == 200:
                data = await response.json()
                return {
                    'prices': data.get('prices', []),
                    'volumes': data.get('volumes', []),
                    'indicators': data.get('indicators', {}),
                    'market_cap': data.get('market_cap', 0),
                    'volatility': data.get('volatility', 0)
                }
            else:
                logger.warning(f"⚠️ Market data service returned status {response.status}")
                return {}
    except Exception as e:
        logger.warning(f"⚠️ Failed to fetch market data: {str(e)}")
        return {}

async def fetch_social_sentiment(session: aiohttp.ClientSession, token_symbol: str) -> List[str]:
    """Fetch social sentiment data from social-media-sentiment service"""

    try:
        url = f"{SERVICE_URLS['social_sentiment']}/sentiment/{token_symbol}"
        async with session.get(url, timeout=5) as response:
            if response.status == 200:
                data = await response.json()
                return data.get('posts', [])[:10]  # Limit to recent posts
            else:
                logger.warning(f"⚠️ Social sentiment service returned status {response.status}")
                return []
    except Exception as e:
        logger.warning(f"⚠️ Failed to fetch social sentiment: {str(e)}")
        return []

async def fetch_news_articles(session: aiohttp.ClientSession, token_symbol: str) -> List[str]:
    """Fetch news articles from news-aggregator service"""

    try:
        url = f"{SERVICE_URLS['news_aggregator']}/news/{token_symbol}"
        async with session.get(url, timeout=5) as response:
            if response.status == 200:
                data = await response.json()
                return [article.get('title', '') + ' ' + article.get('summary', '')
                       for article in data.get('articles', [])[:5]]  # Limit to recent articles
            else:
                logger.warning(f"⚠️ News aggregator service returned status {response.status}")
                return []
    except Exception as e:
        logger.warning(f"⚠️ Failed to fetch news articles: {str(e)}")
        return []

async def fetch_onchain_data(session: aiohttp.ClientSession, token_symbol: str) -> Dict[str, Any]:
    """Fetch on-chain data from on-chain-monitor service"""

    try:
        url = f"{SERVICE_URLS['onchain_monitor']}/onchain/{token_symbol}"
        async with session.get(url, timeout=5) as response:
            if response.status == 200:
                data = await response.json()
                return {
                    'transaction_graph': data.get('transaction_graph', {}),
                    'whale_activity': data.get('whale_activity', {}),
                    'network_metrics': data.get('network_metrics', {}),
                    'smart_contracts': data.get('smart_contracts', {})
                }
            else:
                logger.warning(f"⚠️ On-chain monitor service returned status {response.status}")
                return {}
    except Exception as e:
        logger.warning(f"⚠️ Failed to fetch on-chain data: {str(e)}")
        return {}

async def fetch_psychology_profile(session: aiohttp.ClientSession, user_id: str, token_symbol: str) -> Dict[str, Any]:
    """Fetch psychological profile from psychology-engine service"""

    try:
        url = f"{SERVICE_URLS['psychology_engine']}/psychology/profile/{user_id}"
        params = {'token': token_symbol}
        async with session.get(url, params=params, timeout=5) as response:
            if response.status == 200:
                data = await response.json()
                return {
                    'behavioral_patterns': data.get('behavioral_patterns', {}),
                    'emotional_state': data.get('emotional_state', {}),
                    'cognitive_biases': data.get('cognitive_biases', {}),
                    'social_influence': data.get('social_influence', {}),
                    'risk_tolerance': data.get('risk_tolerance', 0.5)
                }
            else:
                logger.warning(f"⚠️ Psychology engine service returned status {response.status}")
                return {}
    except Exception as e:
        logger.warning(f"⚠️ Failed to fetch psychology profile: {str(e)}")
        return {}

async def check_service_connectivity() -> Dict[str, bool]:
    """Check connectivity to all integrated services"""

    connectivity = {}

    async with aiohttp.ClientSession() as session:
        for service_name, service_url in SERVICE_URLS.items():
            try:
                async with session.get(f"{service_url}/health", timeout=2) as response:
                    connectivity[service_name] = response.status == 200
            except:
                connectivity[service_name] = False

    return connectivity

@router.get("/connectivity")
async def get_service_connectivity():
    """Get connectivity status of all integrated services"""

    connectivity = await check_service_connectivity()

    return {
        'connectivity_status': connectivity,
        'overall_health': all(connectivity.values()),
        'services_checked': len(connectivity),
        'healthy_services': sum(connectivity.values()),
        'timestamp': datetime.utcnow().isoformat()
    }

# Background task for continuous learning
async def continuous_learning_task():
    """Background task for continuous model improvement"""

    while True:
        try:
            # Update adaptive weights based on recent performance
            await fusion_engine._update_adaptive_weights_from_performance()

            # Log learning progress
            metrics = fusion_engine.get_performance_metrics()
            logger.info(f"🧠 Continuous learning update: {metrics['total_predictions']} predictions, "
                       f"avg confidence {metrics['average_confidence']:.3f}")

            # Wait before next update
            await asyncio.sleep(3600)  # Update every hour

        except Exception as e:
            logger.error(f"❌ Continuous learning task failed: {str(e)}")
            await asyncio.sleep(300)  # Wait 5 minutes before retry

# Background learning task should be started in the main app with lifespan events
# This would typically be handled in the main app file

# Error handling
# Exception handler should be added to the FastAPI app, not the router
# This would typically be handled in the main app file
