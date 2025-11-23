"""
🔗 CAUSAL INFERENCE API - THE DIVINE CAUSE-EFFECT INTERFACE
===========================================================

FastAPI router that provides the unified interface for the causal inference engine,
enabling advanced causal analysis of market data, news, psychology, and on-chain activity.

This API serves as the central hub for:
- Granger causality testing between time series
- Causal discovery from observational data
- Confounder analysis and bias detection
- Counterfactual analysis and what-if scenarios
- Market-specific causal relationship analysis

All causal inference capabilities are exposed through a comprehensive REST API.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import json

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field

from ..continual_learning.causal_inference import (
    CausalInferenceEngine, CausalQuery, GrangerCausalityTest,
    CausalDiscoveryConfig, CausalFinding, CausalModel,
    InterventionType, ConfidenceLevel, CausalFindingType
)

logger = logging.getLogger(__name__)

# Initialize the causal inference engine
causal_engine = CausalInferenceEngine()

# API Router
router = APIRouter(
    prefix="/causal",
    tags=["causal-inference"],
    responses={404: {"description": "Not found"}},
)

# Request/Response Models
class GrangerCausalityRequest(BaseModel):
    """Request model for Granger causality testing"""
    variable_x: str = Field(..., description="Potential cause variable")
    variable_y: str = Field(..., description="Potential effect variable")
    time_series_data: Dict[str, List[float]] = Field(..., description="Time series data for variables")
    max_lag: Optional[int] = Field(5, description="Maximum lag to test")
    significance_level: Optional[float] = Field(0.05, description="Statistical significance level")

class GrangerCausalityResponse(BaseModel):
    """Response model for Granger causality results"""
    test_id: str
    granger_causality_result: str
    confidence: float
    lag_results: Dict[str, Any]
    max_lag_tested: int
    sample_size: int
    test_type: str
    significance_level: float

class CausalDiscoveryRequest(BaseModel):
    """Request model for causal discovery"""
    data: Dict[str, List[float]] = Field(..., description="Observational data for causal discovery")
    algorithm: str = Field("pc", description="Causal discovery algorithm (pc, ges, fci, lingam)")
    alpha: Optional[float] = Field(0.05, description="Significance level for independence tests")
    variable_names: Optional[List[str]] = Field(None, description="Names of variables in data")

class CausalDiscoveryResponse(BaseModel):
    """Response model for causal discovery results"""
    discovery_id: str
    algorithm_used: str
    variables_discovered: int
    directed_edges: int
    undirected_edges: int
    causal_graph_summary: Dict[str, Any]

class ConfounderAnalysisRequest(BaseModel):
    """Request model for confounder analysis"""
    model_id: str = Field(..., description="ID of the causal model to analyze")
    cause_variable: str = Field(..., description="Cause variable in the relationship")
    effect_variable: str = Field(..., description="Effect variable in the relationship")

class ConfounderAnalysisResponse(BaseModel):
    """Response model for confounder analysis results"""
    analysis_id: str
    potential_confounders: List[str]
    confounder_strengths: Dict[str, float]
    backdoor_paths: List[List[str]]
    frontdoor_paths: List[List[str]]
    collider_bias_risk: float
    adjustment_recommendations: List[str]

class CounterfactualAnalysisRequest(BaseModel):
    """Request model for counterfactual analysis"""
    model_id: str = Field(..., description="ID of the causal model for analysis")
    factual_scenario: Dict[str, Any] = Field(..., description="Current factual scenario")
    counterfactual_scenario: Dict[str, Any] = Field(..., description="Hypothetical scenario to analyze")
    target_variables: List[str] = Field(..., description="Variables to analyze in counterfactual")

class CounterfactualAnalysisResponse(BaseModel):
    """Response model for counterfactual analysis results"""
    analysis_id: str
    factual_scenario: Dict[str, Any]
    counterfactual_scenario: Dict[str, Any]
    counterfactual_outcomes: Dict[str, Any]
    counterfactual_confidence: float
    necessary_assumptions: List[str]
    robustness_checks: Dict[str, Any]

class MarketCausalAnalysisRequest(BaseModel):
    """Request model for market causal analysis"""
    market_data: Dict[str, List[float]] = Field(..., description="Market time series data")
    relationships_to_test: Optional[List[tuple]] = Field(None, description="Specific relationships to test")

class MarketCausalAnalysisResponse(BaseModel):
    """Response model for market causal analysis"""
    findings: List[Dict[str, Any]]
    total_relationships_tested: int
    causal_relationships_found: int
    correlational_relationships_found: int
    average_confidence: float

class CausalQueryRequest(BaseModel):
    """Request model for general causal queries"""
    model_id: str = Field(..., description="ID of the causal model")
    query_type: str = Field(..., description="Type of causal query")
    intervention: Optional[Dict[str, Any]] = Field(None, description="Intervention variables")
    condition: Optional[Dict[str, Any]] = Field(None, description="Conditioning variables")
    target_variables: List[str] = Field(..., description="Target variables for query")

class CausalQueryResponse(BaseModel):
    """Response model for causal query results"""
    query_id: str
    query_type: str
    causal_effects: Dict[str, Any]
    intervention_applied: Dict[str, Any]
    conditions_applied: Dict[str, Any]
    confidence: float

@router.post("/granger-test", response_model=GrangerCausalityResponse)
async def perform_granger_causality_test(request: GrangerCausalityRequest):
    """
    🔗 GRANGER CAUSALITY TEST

    Test whether one time series Granger-causes another using statistical methods.
    This is particularly useful for analyzing temporal relationships in market data.

    Args:
        variable_x: Potential cause variable (e.g., 'news_sentiment')
        variable_y: Potential effect variable (e.g., 'price_movement')
        time_series_data: Time series data for both variables
        max_lag: Maximum lag to test (default: 5)
        significance_level: Statistical significance threshold (default: 0.05)

    Returns:
        Detailed Granger causality test results with confidence scores
    """

    try:
        # Create test configuration
        test_config = GrangerCausalityTest(
            test_id=f"api_test_{int(time.time())}",
            variable_x=request.variable_x,
            variable_y=request.variable_y,
            max_lag=request.max_lag,
            significance_level=request.significance_level
        )

        # Perform the test
        result = await causal_engine.perform_granger_causality_test(test_config, request.time_series_data)

        if 'error' in result:
            raise HTTPException(status_code=400, detail=result['error'])

        logger.info(f"✅ Granger causality test completed: {request.variable_x} -> {request.variable_y}")

        return GrangerCausalityResponse(**result)

    except Exception as e:
        logger.error(f"❌ Granger causality test failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Granger causality test failed: {str(e)}")

@router.post("/discover-causal-structure", response_model=CausalDiscoveryResponse)
async def discover_causal_structure(request: CausalDiscoveryRequest):
    """
    🔍 CAUSAL DISCOVERY

    Discover causal relationships from observational data using advanced algorithms
    like PC, GES, FCI, or LiNGAM.

    Args:
        data: Observational data for causal discovery
        algorithm: Causal discovery algorithm to use
        alpha: Significance level for independence tests
        variable_names: Names of variables (optional)

    Returns:
        Discovered causal structure and relationships
    """

    try:
        # Create discovery configuration
        from ..continual_learning.causal_inference import CausalDiscoveryAlgorithm

        algorithm_enum = CausalDiscoveryAlgorithm(request.algorithm.lower())

        config = CausalDiscoveryConfig(
            algorithm=algorithm_enum,
            alpha=request.alpha,
            variable_names=request.variable_names
        )

        # Perform causal discovery
        discovery_id = await causal_engine.perform_causal_discovery(request.data, config)

        if 'error' in discovery_id:
            raise HTTPException(status_code=400, detail=discovery_id['error'])

        # Get discovery results
        if discovery_id in causal_engine.causal_discoveries:
            cg = causal_engine.causal_discoveries[discovery_id]

            response = CausalDiscoveryResponse(
                discovery_id=discovery_id,
                algorithm_used=request.algorithm,
                variables_discovered=len(cg.variables),
                directed_edges=len(cg.directed_edges),
                undirected_edges=len(cg.undirected_edges),
                causal_graph_summary={
                    'confounding_factors': len(cg.confounding_factors),
                    'instrumental_variables': len(cg.instrumental_variables),
                    'graph_complexity': causal_engine._calculate_causal_complexity(cg)
                }
            )

            logger.info(f"✅ Causal discovery completed using {request.algorithm} algorithm")

            return response
        else:
            raise HTTPException(status_code=404, detail=f"Causal discovery {discovery_id} not found")

    except Exception as e:
        logger.error(f"❌ Causal discovery failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Causal discovery failed: {str(e)}")

@router.post("/analyze-confounders", response_model=ConfounderAnalysisResponse)
async def analyze_confounders(request: ConfounderAnalysisRequest):
    """
    🎯 CONFOUNDER ANALYSIS

    Analyze potential confounders that might bias causal relationships in your model.

    Args:
        model_id: ID of the causal model to analyze
        cause_variable: Variable that might be causing the effect
        effect_variable: Variable that might be the effect

    Returns:
        Comprehensive confounder analysis with adjustment recommendations
    """

    try:
        # Perform confounder analysis
        analysis_id = await causal_engine.analyze_confounders(
            request.model_id,
            (request.cause_variable, request.effect_variable)
        )

        if 'error' in analysis_id:
            raise HTTPException(status_code=400, detail=analysis_id['error'])

        # Get analysis results
        if analysis_id in causal_engine.confounder_analyses:
            analysis = causal_engine.confounder_analyses[analysis_id]

            response = ConfounderAnalysisResponse(
                analysis_id=analysis.analysis_id,
                potential_confounders=analysis.potential_confounders,
                confounder_strengths=analysis.confounder_strengths,
                backdoor_paths=analysis.backdoor_paths,
                frontdoor_paths=analysis.frontdoor_paths,
                collider_bias_risk=analysis.collider_bias_risk,
                adjustment_recommendations=analysis.confounder_adjustment_recommendations
            )

            logger.info(f"✅ Confounder analysis completed for {request.cause_variable} -> {request.effect_variable}")

            return response
        else:
            raise HTTPException(status_code=404, detail=f"Confounder analysis {analysis_id} not found")

    except Exception as e:
        logger.error(f"❌ Confounder analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Confounder analysis failed: {str(e)}")

@router.post("/counterfactual-analysis", response_model=CounterfactualAnalysisResponse)
async def perform_counterfactual_analysis(request: CounterfactualAnalysisRequest):
    """
    🔮 COUNTERFACTUAL ANALYSIS

    Analyze what would have happened under different hypothetical scenarios.

    Args:
        model_id: ID of the causal model for analysis
        factual_scenario: Current factual scenario
        counterfactual_scenario: Hypothetical scenario to analyze
        target_variables: Variables to analyze in counterfactual

    Returns:
        Counterfactual outcomes with confidence scores and assumptions
    """

    try:
        # Perform counterfactual analysis
        analysis_id = await causal_engine.perform_counterfactual_analysis(
            request.model_id,
            request.factual_scenario,
            request.counterfactual_scenario,
            request.target_variables
        )

        if 'error' in analysis_id:
            raise HTTPException(status_code=400, detail=analysis_id['error'])

        # Get analysis results
        if analysis_id in causal_engine.counterfactual_analyses:
            analysis = causal_engine.counterfactual_analyses[analysis_id]

            response = CounterfactualAnalysisResponse(
                analysis_id=analysis.analysis_id,
                factual_scenario=analysis.factual_scenario,
                counterfactual_scenario=analysis.counterfactual_scenario,
                counterfactual_outcomes=analysis.counterfactual_outcomes,
                counterfactual_confidence=analysis.counterfactual_confidence,
                necessary_assumptions=analysis.necessary_assumptions,
                robustness_checks=analysis.robustness_checks
            )

            logger.info(f"✅ Counterfactual analysis completed with confidence {analysis.counterfactual_confidence:.3f}")

            return response
        else:
            raise HTTPException(status_code=404, detail=f"Counterfactual analysis {analysis_id} not found")

    except Exception as e:
        logger.error(f"❌ Counterfactual analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Counterfactual analysis failed: {str(e)}")

@router.post("/analyze-market-causal-relationships", response_model=MarketCausalAnalysisResponse)
async def analyze_market_causal_relationships(request: MarketCausalAnalysisRequest):
    """
    📈 MARKET CAUSAL RELATIONSHIPS

    Analyze causal relationships in cryptocurrency market data, including:
    - News sentiment → Price movements
    - Trading volume → Price movements
    - Social media activity → Price movements
    - On-chain activity → Price movements
    - Fear & greed index → Price movements

    Args:
        market_data: Market time series data for analysis
        relationships_to_test: Specific relationships to test (optional)

    Returns:
        Comprehensive causal findings for market relationships
    """

    try:
        # Perform market causal analysis
        findings = causal_engine.analyze_market_causal_relationships(request.market_data)

        # Calculate summary statistics
        causal_findings = [f for f in findings if f.finding_type == CausalFindingType.CAUSAL_RELATIONSHIP]
        correlational_findings = [f for f in findings if f.finding_type == CausalFindingType.CORRELATIONAL_RELATIONSHIP]

        average_confidence = sum(f.confidence_score for f in findings) / len(findings) if findings else 0.0

        response = MarketCausalAnalysisResponse(
            findings=[{
                'finding_id': f.finding_id,
                'finding_type': f.finding_type.value,
                'cause_variable': f.cause_variable,
                'effect_variable': f.effect_variable,
                'relationship_strength': f.relationship_strength,
                'confidence_score': f.confidence_score,
                'confidence_level': f.confidence_level.value,
                'evidence_sources': f.evidence_sources,
                'causal_chain': f.causal_chain,
                'timestamp': f.timestamp.isoformat()
            } for f in findings],
            total_relationships_tested=len(findings),
            causal_relationships_found=len(causal_findings),
            correlational_relationships_found=len(correlational_findings),
            average_confidence=average_confidence
        )

        logger.info(f"✅ Market causal analysis completed: {len(findings)} relationships analyzed")

        return response

    except Exception as e:
        logger.error(f"❌ Market causal analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Market causal analysis failed: {str(e)}")

@router.post("/causal-query", response_model=CausalQueryResponse)
async def perform_causal_query(request: CausalQueryRequest):
    """
    🔍 GENERAL CAUSAL QUERY

    Perform various types of causal queries including:
    - Effect of interventions
    - Counterfactual queries
    - Transportability analysis

    Args:
        model_id: ID of the causal model
        query_type: Type of causal query to perform
        intervention: Intervention variables (optional)
        condition: Conditioning variables (optional)
        target_variables: Target variables for the query

    Returns:
        Causal query results with confidence scores
    """

    try:
        # Create causal query
        query = CausalQuery(
            query_id=f"api_query_{int(time.time())}",
            query_type=request.query_type,
            intervention=request.intervention or {},
            condition=request.condition or {},
            target_variables=request.target_variables,
            query_metadata={}
        )

        # Perform the query
        result = await causal_engine.perform_causal_query(request.model_id, query)

        if 'error' in result:
            raise HTTPException(status_code=400, detail=result['error'])

        logger.info(f"✅ Causal query completed: {request.query_type}")

        return CausalQueryResponse(**result)

    except Exception as e:
        logger.error(f"❌ Causal query failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Causal query failed: {str(e)}")

@router.get("/models")
async def list_causal_models():
    """List all available causal models"""

    models = []
    for model_id, causal_graph in causal_engine.causal_graphs.items():
        models.append({
            'model_id': model_id,
            'num_variables': len(causal_graph.variables),
            'num_edges': len(causal_graph.directed_edges) + len(causal_graph.undirected_edges),
            'created_at': getattr(causal_graph, 'created_at', datetime.now().isoformat())
        })

    return {
        'models': models,
        'total_models': len(models),
        'timestamp': datetime.now().isoformat()
    }

@router.get("/models/{model_id}")
async def get_causal_model(model_id: str):
    """Get detailed information about a specific causal model"""

    if model_id not in causal_engine.causal_graphs:
        raise HTTPException(status_code=404, detail=f"Causal model {model_id} not found")

    causal_graph = causal_engine.causal_graphs[model_id]

    # Get comprehensive insights
    insights = causal_engine.get_causal_insights(model_id)

    return {
        'model_id': model_id,
        'variables': list(causal_graph.variables.keys()),
        'directed_edges': causal_graph.directed_edges,
        'undirected_edges': causal_graph.undirected_edges,
        'confounding_factors': causal_graph.confounding_factors,
        'instrumental_variables': causal_graph.instrumental_variables,
        'insights': insights,
        'timestamp': datetime.now().isoformat()
    }

@router.get("/health")
async def causal_inference_health_check():
    """Health check endpoint for the causal inference service"""

    try:
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'engine_initialized': True,
            'models_loaded': len(causal_engine.causal_graphs),
            'causal_libraries_available': hasattr(causal_engine, '_check_libraries') and causal_engine._check_libraries(),
            'supported_algorithms': ['granger_causality', 'pc_algorithm', 'ges_algorithm', 'fci_algorithm', 'lingam_algorithm'],
            'supported_query_types': ['effect_of_intervention', 'counterfactual', 'transportability']
        }

        return health_status

    except Exception as e:
        logger.error(f"❌ Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Causal inference health check failed")

@router.get("/performance")
async def get_causal_performance_metrics():
    """Get performance metrics for the causal inference engine"""

    # Calculate performance metrics
    total_models = len(causal_engine.causal_graphs)
    total_granger_tests = len(causal_engine.granger_tests)
    total_confounder_analyses = len(causal_engine.confounder_analyses)
    total_counterfactual_analyses = len(causal_engine.counterfactual_analyses)
    total_causal_findings = len(causal_engine.causal_findings)

    # Calculate average confidence across all findings
    if causal_engine.causal_findings:
        avg_confidence = sum(f.confidence_score for f in causal_engine.causal_findings.values()) / len(causal_engine.causal_findings)
    else:
        avg_confidence = 0.0

    return {
        'performance_metrics': {
            'total_causal_models': total_models,
            'total_granger_tests': total_granger_tests,
            'total_confounder_analyses': total_confounder_analyses,
            'total_counterfactual_analyses': total_counterfactual_analyses,
            'total_causal_findings': total_causal_findings,
            'average_confidence_score': avg_confidence,
            'engine_uptime_seconds': getattr(causal_engine, 'uptime_seconds', 0)
        },
        'engine_status': 'operational',
        'supported_features': [
            'granger_causality_testing',
            'causal_discovery',
            'confounder_analysis',
            'counterfactual_analysis',
            'market_causal_relationships'
        ],
        'last_updated': datetime.now().isoformat()
    }

@router.get("/visualize/causal-graph/{model_id}")
async def visualize_causal_graph(model_id: str, output_format: str = 'plotly'):
    """
    📊 VISUALIZE CAUSAL GRAPH

    Create interactive visualizations of causal graphs showing:
    - Directed edges representing causal relationships
    - Node sizes based on influence (number of children)
    - Node colors based on causal importance (number of parents)
    - Interactive hover information

    Args:
        model_id: ID of the causal model to visualize
        output_format: Visualization format ('plotly' or 'matplotlib')

    Returns:
        Interactive causal graph visualization data
    """

    try:
        result = causal_engine.visualize_causal_graph(model_id, output_format)

        if 'error' in result:
            raise HTTPException(status_code=400, detail=result['error'])

        logger.info(f"✅ Causal graph visualization created for model {model_id}")

        return result

    except Exception as e:
        logger.error(f"❌ Causal graph visualization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Causal graph visualization failed: {str(e)}")

@router.get("/visualize/granger-test/{test_id}")
async def visualize_granger_test(test_id: str, output_format: str = 'plotly'):
    """
    📈 VISUALIZE GRANGER CAUSALITY TEST

    Create comprehensive visualizations of Granger causality test results including:
    - Time series plots of cause and effect variables
    - Granger causality statistics by lag
    - P-value significance plots
    - Test confidence intervals

    Args:
        test_id: ID of the Granger test to visualize
        output_format: Visualization format ('plotly' or 'matplotlib')

    Returns:
        Granger causality test visualization data
    """

    try:
        result = causal_engine.visualize_granger_causality_results(test_id, output_format)

        if 'error' in result:
            raise HTTPException(status_code=400, detail=result['error'])

        logger.info(f"✅ Granger test visualization created for test {test_id}")

        return result

    except Exception as e:
        logger.error(f"❌ Granger test visualization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Granger test visualization failed: {str(e)}")

@router.get("/visualize/confounder-analysis/{analysis_id}")
async def visualize_confounder_analysis(analysis_id: str, output_format: str = 'plotly'):
    """
    🎯 VISUALIZE CONFOUNDER ANALYSIS

    Create visualizations of confounder analysis results showing:
    - Confounder strength bar charts
    - Backdoor and frontdoor path diagrams
    - Collider bias risk assessments
    - Adjustment recommendation summaries

    Args:
        analysis_id: ID of the confounder analysis to visualize
        output_format: Visualization format ('plotly' or 'matplotlib')

    Returns:
        Confounder analysis visualization data
    """

    try:
        result = causal_engine.visualize_confounder_analysis(analysis_id, output_format)

        if 'error' in result:
            raise HTTPException(status_code=400, detail=result['error'])

        logger.info(f"✅ Confounder analysis visualization created for analysis {analysis_id}")

        return result

    except Exception as e:
        logger.error(f"❌ Confounder analysis visualization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Confounder analysis visualization failed: {str(e)}")

@router.get("/visualize/counterfactual-analysis/{analysis_id}")
async def visualize_counterfactual_analysis(analysis_id: str, output_format: str = 'plotly'):
    """
    🔮 VISUALIZE COUNTERFACTUAL ANALYSIS

    Create visualizations of counterfactual analysis results showing:
    - Factual vs counterfactual outcome comparisons
    - Confidence interval plots
    - Sensitivity analysis results
    - Robustness check summaries

    Args:
        analysis_id: ID of the counterfactual analysis to visualize
        output_format: Visualization format ('plotly' or 'matplotlib')

    Returns:
        Counterfactual analysis visualization data
    """

    try:
        result = causal_engine.visualize_counterfactual_analysis(analysis_id, output_format)

        if 'error' in result:
            raise HTTPException(status_code=400, detail=result['error'])

        logger.info(f"✅ Counterfactual analysis visualization created for analysis {analysis_id}")

        return result

    except Exception as e:
        logger.error(f"❌ Counterfactual analysis visualization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Counterfactual analysis visualization failed: {str(e)}")

@router.get("/dashboard")
async def create_causal_dashboard(model_id: str = None, output_format: str = 'plotly'):
    """
    🎛️ COMPREHENSIVE CAUSAL DASHBOARD

    Create a comprehensive dashboard with all causal inference visualizations:
    - Causal graph visualization
    - Granger causality test results
    - Confounder analysis results
    - Counterfactual analysis results
    - Summary statistics and metrics

    Args:
        model_id: Optional specific model ID to focus on
        output_format: Visualization format ('plotly' or 'matplotlib')

    Returns:
        Complete causal inference dashboard data
    """

    try:
        result = causal_engine.create_comprehensive_causal_dashboard(model_id, output_format)

        if 'error' in result:
            raise HTTPException(status_code=400, detail=result['error'])

        logger.info(f"✅ Comprehensive causal dashboard created")

        return result

    except Exception as e:
        logger.error(f"❌ Causal dashboard creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Causal dashboard creation failed: {str(e)}")

@router.get("/visualization-formats")
async def get_supported_visualization_formats():
    """Get list of supported visualization formats and their capabilities"""

    return {
        'supported_formats': ['plotly', 'matplotlib'],
        'format_capabilities': {
            'plotly': {
                'interactive': True,
                'web_ready': True,
                'supports_hover': True,
                'supports_zoom': True,
                'file_size': 'larger',
                'recommended_use': 'web dashboards, interactive exploration'
            },
            'matplotlib': {
                'interactive': False,
                'web_ready': False,
                'supports_hover': False,
                'supports_zoom': False,
                'file_size': 'smaller',
                'recommended_use': 'static reports, publications, base64 images'
            }
        },
        'available_visualizations': [
            'causal_graph',
            'granger_causality_tests',
            'confounder_analysis',
            'counterfactual_analysis',
            'comprehensive_dashboard'
        ],
        'timestamp': datetime.now().isoformat()
    }

@router.post("/advanced-causal-effect-estimation")
async def perform_advanced_causal_effect_estimation(
    treatment_var: str,
    outcome_var: str,
    data: Dict[str, List[float]],
    confounder_vars: List[str] = None
):
    """
    🔬 ADVANCED CAUSAL EFFECT ESTIMATION

    Perform sophisticated causal effect estimation using multiple state-of-the-art methods:
    - Propensity Score Matching (PSM)
    - Inverse Probability Weighting (IPW)
    - Double Machine Learning (DML)
    - Targeted Maximum Likelihood Estimation (TMLE)

    Args:
        treatment_var: Treatment variable name
        outcome_var: Outcome variable name
        data: Complete dataset for analysis
        confounder_vars: List of confounder variables (optional)

    Returns:
        Ensemble causal effect estimates with confidence scores
    """

    try:
        result = await causal_engine.perform_advanced_causal_effect_estimation(
            data, treatment_var, outcome_var, confounder_vars
        )

        if 'error' in result:
            raise HTTPException(status_code=400, detail=result['error'])

        logger.info(f"✅ Advanced causal effect estimation completed for {treatment_var} -> {outcome_var}")

        return result

    except Exception as e:
        logger.error(f"❌ Advanced causal effect estimation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Advanced causal effect estimation failed: {str(e)}")

@router.post("/causal-reinforcement-learning")
async def perform_causal_reinforcement_learning(
    environment_data: Dict[str, Any],
    policy_config: Dict[str, Any]
):
    """
    🧠 CAUSAL REINFORCEMENT LEARNING

    Discover optimal policies using causal reinforcement learning that incorporates
    causal knowledge into the learning process for more efficient policy discovery.

    Args:
        environment_data: Environment dynamics and observations
        policy_config: Policy learning configuration

    Returns:
        Optimal causal policy with confidence scores
    """

    try:
        result = await causal_engine.perform_causal_reinforcement_learning(
            environment_data, policy_config
        )

        logger.info(f"✅ Causal reinforcement learning completed")

        return result

    except Exception as e:
        logger.error(f"❌ Causal reinforcement learning failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Causal reinforcement learning failed: {str(e)}")

@router.post("/quantum-causal-inference")
async def perform_quantum_causal_inference(
    quantum_data: Dict[str, Any],
    quantum_config: Dict[str, Any]
):
    """
    ⚛️ QUANTUM CAUSAL INFERENCE

    Perform quantum causal inference leveraging quantum principles for enhanced
    causal discovery and analysis beyond classical limitations.

    Args:
        quantum_data: Quantum measurement data
        quantum_config: Quantum analysis configuration

    Returns:
        Quantum causal insights with entanglement effects
    """

    try:
        result = await causal_engine.perform_quantum_causal_inference(
            quantum_data, quantum_config
        )

        logger.info(f"✅ Quantum causal inference completed")

        return result

    except Exception as e:
        logger.error(f"❌ Quantum causal inference failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Quantum causal inference failed: {str(e)}")

@router.post("/multi-universe-causal-analysis")
async def perform_multi_universe_causal_analysis(
    universe_data: Dict[str, Dict[str, List[float]]],
    universe_config: Dict[str, Any]
):
    """
    🌌 MULTI-UNIVERSE CAUSAL ANALYSIS

    Analyze causal relationships across multiple parallel universes to discover
    divine causal patterns that transcend individual universe limitations.

    Args:
        universe_data: Data from multiple parallel universes
        universe_config: Multi-universe analysis configuration

    Returns:
        Cross-universe causal insights and meta-patterns
    """

    try:
        result = await causal_engine.perform_multi_universe_causal_analysis(
            universe_data, universe_config
        )

        logger.info(f"✅ Multi-universe causal analysis completed")

        return result

    except Exception as e:
        logger.error(f"❌ Multi-universe causal analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Multi-universe causal analysis failed: {str(e)}")

@router.post("/temporal-causal-analysis")
async def perform_temporal_causal_analysis(
    time_series_data: Dict[str, List[float]],
    temporal_config: Dict[str, Any]
):
    """
    ⏰ TEMPORAL CAUSAL ANALYSIS

    Analyze time-varying causal effects and dynamic relationships that evolve
    over time, providing insights into temporal causal dynamics.

    Args:
        time_series_data: Time series data for temporal analysis
        temporal_config: Temporal analysis configuration

    Returns:
        Time-varying causal effects and dynamic insights
    """

    try:
        result = await causal_engine.perform_temporal_causal_analysis(
            time_series_data, temporal_config
        )

        logger.info(f"✅ Temporal causal analysis completed")

        return result

    except Exception as e:
        logger.error(f"❌ Temporal causal analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Temporal causal analysis failed: {str(e)}")

@router.post("/network-causal-inference")
async def perform_network_causal_inference(
    network_data: Dict[str, Any],
    network_config: Dict[str, Any]
):
    """
    🕸️ NETWORK CAUSAL INFERENCE

    Perform causal inference on network and graph data, analyzing how
    causal effects propagate through interconnected systems.

    Args:
        network_data: Network structure and node data
        network_config: Network causal analysis configuration

    Returns:
        Network causal effects and influence propagation patterns
    """

    try:
        result = await causal_engine.perform_network_causal_inference(
            network_data, network_config
        )

        logger.info(f"✅ Network causal inference completed")

        return result

    except Exception as e:
        logger.error(f"❌ Network causal inference failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Network causal inference failed: {str(e)}")

@router.get("/divine-causal-report")
async def get_divine_causal_report(model_id: str = None):
    """
    📋 DIVINE CAUSAL REPORT

    Generate a comprehensive divine causal analysis report showcasing
    the full capabilities of the causal inference system.

    Args:
        model_id: Optional specific model ID for focused analysis

    Returns:
        Complete divine causal system report
    """

    try:
        result = causal_engine.create_divine_causal_report(model_id)

        logger.info(f"✅ Divine causal report generated")

        return result

    except Exception as e:
        logger.error(f"❌ Divine causal report generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Divine causal report generation failed: {str(e)}")

@router.get("/causal-algorithms")
async def get_supported_causal_algorithms():
    """Get list of all supported causal discovery and inference algorithms"""

    return {
        'causal_discovery_algorithms': [
            'pc_algorithm',
            'fci_algorithm',
            'ges_algorithm',
            'lingam',
            'fast_ica',
            'direct_lingam',
            'icam',
            'bpc',
            'granger_causality_discovery',
            'bayesian_network_learning',
            'dynamic_bayesian_network'
        ],
        'causal_effect_estimation_methods': [
            'propensity_score_matching',
            'inverse_probability_weighting',
            'double_machine_learning',
            'targeted_maximum_likelihood_estimation'
        ],
        'advanced_algorithms': [
            'causal_reinforcement_learning',
            'quantum_causal_inference',
            'multi_universe_analysis',
            'temporal_causal_dynamics',
            'network_causal_inference'
        ],
        'supported_visualization_formats': ['plotly', 'matplotlib'],
        'divine_features': [
            'granger_causality_testing',
            'advanced_causal_discovery',
            'sophisticated_confounder_detection',
            'comprehensive_counterfactual_analysis',
            'causal_vs_correlational_distinction',
            'market_specific_causal_analysis',
            'interactive_visualizations',
            'comprehensive_testing_suite'
        ],
        'timestamp': datetime.now().isoformat()
    }
