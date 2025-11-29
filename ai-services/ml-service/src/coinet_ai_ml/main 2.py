"""
Main FastAPI application for Coinet AI ML Service
"""

import logging
from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import structlog
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
import uvicorn

from .config import settings
from .routes import multimodal_fusion
from .nlp.core import AdvancedNLPProcessor

# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer() if settings.DEBUG else structlog.processors.JSONRenderer(),
    ],
    logger_factory=structlog.WriteLoggerFactory(),
    wrapper_class=structlog.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Starting Coinet AI ML Service")

    # Initialize fusion engine
    await multimodal_fusion.fusion_engine.initialize()

    # Initialize advanced NLP processor
    global nlp_processor
    nlp_processor = AdvancedNLPProcessor()
    assert nlp_processor is not None, "NLP Processor failed to initialize."

    logger.info("Fusion engine and NLP processor initialized successfully")
    yield

    # Cleanup
    logger.info("Shutting down Coinet AI ML Service")
    logger.info("ML Service shutdown complete")


# Global NLP processor instance
nlp_processor = None

# Create FastAPI application
app = FastAPI(
    title="Coinet AI ML Service",
    description="AI/ML microservice for cryptocurrency analysis and prediction with advanced NLP",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_HOSTS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS,
)

# Middleware removed - not needed for basic functionality

# Include routers
app.include_router(multimodal_fusion.router, prefix="/fusion", tags=["multi-modal-fusion"])

# NLP routes
@app.post("/nlp/analyze")
async def analyze_text_nlp(request: dict):
    """Analyze text using advanced NLP techniques"""
    if nlp_processor is None:
        raise HTTPException(status_code=503, detail="NLP Processor is not initialized")
    try:
        text = request.get('text', '')
        context = request.get('context', {})
        domain_focus = request.get('domain_focus')

        if not text:
            raise HTTPException(status_code=400, detail="Text is required")

        # Perform NLP analysis
        result = await nlp_processor.analyze_text(text, context, domain_focus)

        return {
            "status": "success",
            "result": result,
            "message": "Text analyzed successfully with advanced NLP"
        }

    except Exception as e:
        logger.error(f"NLP analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"NLP analysis failed: {str(e)}")

@app.get("/nlp/capabilities")
async def get_nlp_capabilities():
    """Get NLP processing capabilities"""
    if nlp_processor is None:
        raise HTTPException(status_code=503, detail="NLP Processor is not initialized")
    return {
        "status": "success",
        "capabilities": {
            "contextual_embeddings": True,
            "named_entity_recognition": True,
            "dependency_parsing": True,
            "domain_ontologies": True,
            "context_management": True,
            "supported_domains": ["cryptocurrency", "finance", "psychology", "general"],
            "models": ["bert-base-uncased", "roberta-base", "finbert-base"],
            "features": [
                "Multi-model contextual embeddings",
                "Domain-aware named entity recognition",
                "Advanced dependency parsing",
                "Ontology-driven context understanding",
                "Dynamic context management"
            ]
        }
    }

@app.get("/nlp/health")
async def nlp_health():
    """Check NLP processor health"""
    if nlp_processor is None:
        raise HTTPException(status_code=503, detail="NLP Processor is not initialized")
    return {
        "status": "healthy",
        "nlp_processor_initialized": nlp_processor is not None,
        "cache_stats": nlp_processor.get_cache_stats() if nlp_processor else {},
        "components_active": nlp_processor._get_active_components() if nlp_processor else []
    }


@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error("Unhandled exception", exc_info=exc, request=str(request.url))
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred",
            "request_id": getattr(request.state, "request_id", None),
        },
    )


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Coinet AI ML Service",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs" if settings.DEBUG else "disabled",
    }


def main():
    """Main entry point for CLI"""
    
    uvicorn.run(
        "coinet_ai_ml.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=True,
    )


if __name__ == "__main__":
    main() 