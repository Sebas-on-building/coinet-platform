"""
🚀 PSYCHOLOGY ENGINE API - PRODUCTION READY
==========================================

FastAPI service for the CryptoPsychologyEngine.
Ready to handle millions of requests and dominate the market.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime
import asyncio
import logging
import json
from prometheus_client import Counter, Histogram, generate_latest
from fastapi.responses import PlainTextResponse
import time

from .core.psychology_engine import CryptoPsychologyEngine
from .models.psychological_patterns import (
    PsychologicalPattern,
    EmotionalState,
    CognitiveBias,
    ManipulationTactic,
    SocialInfluence,
    NarrativePattern,
    CrowdBehavior,
    PsychologicalProfile
)

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the divine engine
psychology_engine = CryptoPsychologyEngine()

# Prometheus metrics
analysis_counter = Counter('psychology_analysis_total', 'Total psychological analyses performed')
analysis_duration = Histogram('psychology_analysis_duration_seconds', 'Duration of psychological analysis')
manipulation_detected = Counter('manipulation_detected_total', 'Total manipulation attempts detected')
bias_detected = Counter('cognitive_bias_detected_total', 'Total cognitive biases detected')

# Create FastAPI app
app = FastAPI(
    title="🧠 Coinet AI Psychology Engine",
    description="Divine psychological analysis for cryptocurrency markets",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class AnalysisRequest(BaseModel):
    """Request model for psychological analysis"""
    input_text: str = Field(..., description="Text to analyze (tweet, article, ticker, etc.)")
    input_type: str = Field("general", description="Type of input: ticker, thread, link, question, news")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context (market data, social data)")
    user_profile: Optional[Dict[str, Any]] = Field(None, description="User profile for personalization")
    
class AnalysisResponse(BaseModel):
    """Response model for psychological analysis"""
    success: bool
    analysis_id: str
    timestamp: datetime
    psychological_pattern: Dict[str, Any]
    insights: List[str]
    warnings: List[str]
    recommendations: List[str]
    confidence_score: float
    processing_time: float

class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    uptime: float
    analyses_performed: int

# API Endpoints

@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint - API information"""
    return {
        "name": "Coinet AI Psychology Engine",
        "status": "DOMINATING",
        "message": "The most advanced psychological analysis in crypto",
        "version": "1.0.0"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        uptime=time.time(),  # Would track actual uptime
        analyses_performed=int(analysis_counter._value.get())
    )

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_psychology(
    request: AnalysisRequest,
    background_tasks: BackgroundTasks
):
    """
    🧠 MASTER PSYCHOLOGICAL ANALYSIS ENDPOINT
    
    Performs comprehensive psychological analysis on any crypto-related input.
    Returns deep insights, warnings, and personalized recommendations.
    """
    start_time = time.time()
    analysis_id = f"psy_{int(start_time)}_{hash(request.input_text) % 10000}"
    
    try:
        # Track metrics
        analysis_counter.inc()
        
        # Perform divine analysis
        with analysis_duration.time():
            result = await psychology_engine.analyze_psychology(
                input_text=request.input_text,
                input_type=request.input_type,
                context=request.context,
                user_profile=request.user_profile
            )
        
        # Extract insights
        insights = result.key_insights if result else []
        warnings = result.risk_factors if result else []
        recommendations = result.recommendations if result else []
        
        # Track detected threats
        if result and result.manipulation_tactics:
            manipulation_detected.inc(len(result.manipulation_tactics))
        if result and result.cognitive_biases:
            bias_detected.inc(len(result.cognitive_biases))
        
        # Prepare response
        processing_time = time.time() - start_time
        
        # Convert result to dict for JSON serialization
        pattern_dict = {
            "emotional_state": result.emotional_state.dict() if result and result.emotional_state else None,
            "cognitive_biases": [bias.dict() for bias in result.cognitive_biases] if result else [],
            "manipulation_tactics": [tactic.dict() for tactic in result.manipulation_tactics] if result else [],
            "social_influences": [inf.dict() for inf in result.social_influences] if result else [],
            "narrative_patterns": [pattern.dict() for pattern in result.narrative_patterns] if result else [],
            "crowd_behavior": result.crowd_behavior.dict() if result and result.crowd_behavior else None,
            "psychological_profile": result.psychological_profile.dict() if result and result.psychological_profile else None,
            "confidence_score": result.confidence_score if result else 0.0,
            "psychological_trajectory": result.psychological_trajectory if result else "unknown",
            "stability_assessment": result.stability_assessment if result else 0.5,
            "intervention_needs": result.intervention_needs if result else []
        }
        
        # Log successful analysis
        logger.info(f"✅ Analysis {analysis_id} completed in {processing_time:.2f}s")
        
        return AnalysisResponse(
            success=True,
            analysis_id=analysis_id,
            timestamp=datetime.utcnow(),
            psychological_pattern=pattern_dict,
            insights=insights,
            warnings=warnings,
            recommendations=recommendations,
            confidence_score=result.confidence_score if result else 0.0,
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"❌ Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/detect/manipulation")
async def detect_manipulation(request: AnalysisRequest):
    """
    🔍 MANIPULATION DETECTION ENDPOINT
    
    Specialized endpoint for detecting manipulation tactics.
    """
    try:
        result = await psychology_engine.analyze_psychology(
            input_text=request.input_text,
            input_type=request.input_type,
            context=request.context
        )
        
        if result and result.manipulation_tactics:
            tactics = [
                {
                    "type": tactic.tactic_type.value,
                    "sophistication": tactic.sophistication_level,
                    "confidence": tactic.confidence,
                    "impact": tactic.potential_impact,
                    "protection": tactic.protection_strategies
                }
                for tactic in result.manipulation_tactics
            ]
            
            return {
                "manipulation_detected": True,
                "tactics": tactics,
                "severity": max(t["sophistication"] for t in tactics),
                "recommendations": list(set(sum([t["protection"] for t in tactics], [])))
            }
        
        return {
            "manipulation_detected": False,
            "tactics": [],
            "severity": 0.0,
            "recommendations": []
        }
        
    except Exception as e:
        logger.error(f"❌ Manipulation detection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect/bias")
async def detect_cognitive_bias(request: AnalysisRequest):
    """
    🧠 COGNITIVE BIAS DETECTION ENDPOINT
    
    Specialized endpoint for detecting cognitive biases.
    """
    try:
        result = await psychology_engine.analyze_psychology(
            input_text=request.input_text,
            input_type=request.input_type,
            context=request.context
        )
        
        if result and result.cognitive_biases:
            biases = [
                {
                    "type": bias.bias_type.value,
                    "strength": bias.strength,
                    "confidence": bias.confidence,
                    "decision_impact": bias.decision_impact,
                    "financial_risk": bias.financial_risk,
                    "mitigation": bias.mitigation_strategies[:3]  # Top 3 strategies
                }
                for bias in result.cognitive_biases
            ]
            
            return {
                "biases_detected": True,
                "biases": biases,
                "total_risk": sum(b["financial_risk"] for b in biases) / len(biases),
                "interventions": list(set(sum([b["mitigation"] for b in biases], [])))[:5]
            }
        
        return {
            "biases_detected": False,
            "biases": [],
            "total_risk": 0.0,
            "interventions": []
        }
        
    except Exception as e:
        logger.error(f"❌ Bias detection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/crowd")
async def predict_crowd_behavior(request: AnalysisRequest):
    """
    🌊 CROWD PSYCHOLOGY PREDICTION ENDPOINT
    
    Predicts crowd behavior and mass psychology movements.
    """
    try:
        result = await psychology_engine.analyze_psychology(
            input_text=request.input_text,
            input_type=request.input_type,
            context=request.context
        )
        
        if result and result.crowd_behavior:
            crowd = result.crowd_behavior
            return {
                "crowd_detected": True,
                "behavior_type": crowd.behavior_type.value,
                "intensity": crowd.intensity,
                "participation_rate": crowd.participation_rate,
                "momentum": crowd.momentum,
                "stability": crowd.stability,
                "duration_prediction": crowd.duration_prediction,
                "outcome_probabilities": crowd.outcome_probability,
                "tipping_point_proximity": getattr(crowd, 'tipping_point_proximity', 0.0)
            }
        
        return {
            "crowd_detected": False,
            "behavior_type": "none",
            "intensity": 0.0,
            "participation_rate": 0.0,
            "momentum": 0.0,
            "stability": 1.0,
            "duration_prediction": 0,
            "outcome_probabilities": {},
            "tipping_point_proximity": 0.0
        }
        
    except Exception as e:
        logger.error(f"❌ Crowd prediction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/profile/user")
async def create_user_profile(request: AnalysisRequest):
    """
    🎭 USER PROFILING ENDPOINT
    
    Creates deep psychological profile for personalization.
    """
    try:
        result = await psychology_engine.analyze_psychology(
            input_text=request.input_text,
            input_type=request.input_type,
            context=request.context,
            user_profile=request.user_profile
        )
        
        if result and result.psychological_profile:
            profile = result.psychological_profile
            return {
                "profile_created": True,
                "risk_tolerance": profile.risk_tolerance,
                "decision_style": profile.decision_making_style,
                "emotional_stability": profile.emotional_stability,
                "dominant_biases": [bias.bias_type.value for bias in profile.dominant_biases],
                "learning_rate": profile.learning_rate,
                "adaptability": profile.adaptability,
                "personalized_strategies": profile.decision_frameworks,
                "profile_confidence": getattr(profile, 'confidence', 0.7)
            }
        
        return {
            "profile_created": False,
            "message": "Insufficient data for profiling"
        }
        
    except Exception as e:
        logger.error(f"❌ User profiling failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint"""
    return PlainTextResponse(generate_latest())

@app.post("/batch/analyze")
async def batch_analysis(requests: List[AnalysisRequest]):
    """
    🚀 BATCH ANALYSIS ENDPOINT
    
    Analyze multiple inputs simultaneously for maximum efficiency.
    """
    try:
        tasks = [
            psychology_engine.analyze_psychology(
                input_text=req.input_text,
                input_type=req.input_type,
                context=req.context,
                user_profile=req.user_profile
            )
            for req in requests
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        responses = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                responses.append({
                    "success": False,
                    "error": str(result),
                    "index": i
                })
            else:
                responses.append({
                    "success": True,
                    "confidence": result.confidence_score if result else 0.0,
                    "insights": result.key_insights if result else [],
                    "warnings": result.risk_factors if result else [],
                    "index": i
                })
        
        return {
            "batch_size": len(requests),
            "successful": sum(1 for r in responses if r["success"]),
            "failed": sum(1 for r in responses if not r["success"]),
            "results": responses
        }
        
    except Exception as e:
        logger.error(f"❌ Batch analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket support for real-time analysis
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws/analyze")
async def websocket_analysis(websocket: WebSocket):
    """
    🔌 WEBSOCKET ENDPOINT FOR REAL-TIME ANALYSIS
    
    Stream psychological insights in real-time.
    """
    await websocket.accept()
    try:
        while True:
            # Receive data
            data = await websocket.receive_json()
            
            # Perform analysis
            result = await psychology_engine.analyze_psychology(
                input_text=data.get("text", ""),
                input_type=data.get("type", "general"),
                context=data.get("context"),
                user_profile=data.get("user_profile")
            )
            
            # Send results
            if result:
                await websocket.send_json({
                    "timestamp": datetime.utcnow().isoformat(),
                    "emotional_intensity": result.emotional_state.intensity.value if result.emotional_state else 0,
                    "manipulation_detected": len(result.manipulation_tactics) > 0,
                    "bias_count": len(result.cognitive_biases),
                    "crowd_behavior": result.crowd_behavior.behavior_type.value if result.crowd_behavior else None,
                    "confidence": result.confidence_score,
                    "insights": result.key_insights[:3]  # Top 3 insights
                })
            else:
                await websocket.send_json({
                    "error": "Analysis failed",
                    "timestamp": datetime.utcnow().isoformat()
                })
                
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
