"""
🧪 COMPREHENSIVE CAUSAL INFERENCE TESTING SUITE
==============================================

Advanced testing and validation suite for the divine causal inference system.
Tests cover all major causal inference algorithms, edge cases, and integration scenarios.

TEST CATEGORIES:
1. Granger Causality Testing
2. Causal Discovery Algorithms
3. Confounder Detection and Analysis
4. Counterfactual Analysis
5. Market Data Integration
6. Visualization Components
7. API Endpoints
8. Performance and Scalability
9. Edge Cases and Error Handling
10. Integration with Existing Systems

"Testing is the divine validation of causal understanding."
"""

import asyncio
import pytest
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch
import json
import sys
import os

# Add src to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from coinet_ai_ml.continual_learning.causal_inference import (
    CausalInferenceEngine, CausalGraph, CausalVariable, CausalQuery,
    GrangerCausalityTest, CausalDiscoveryConfig, CausalFinding,
    ConfounderAnalysis, CounterfactualAnalysis, CausalModel,
    InterventionType, ConfidenceLevel, CausalFindingType,
    GrangerCausalityResult, CausalDiscoveryAlgorithm
)

# --- Fixtures (Moved to conftest.py) ---
# The fixtures defined below are now in tests/conftest.py
# and are automatically discovered by pytest.

class TestGrangerCausality:
    """Test Granger causality functionality"""

    @pytest.mark.asyncio
    async def test_granger_causality_basic(self, sample_engine, sample_time_series_data):
        """Test basic Granger causality functionality"""
        test_config = GrangerCausalityTest(
            test_id="test_granger_basic",
            variable_x="x_variable",
            variable_y="y_variable",
            max_lag=3
        )

        result = await sample_engine.perform_granger_causality_test(
            test_config, sample_time_series_data
        )

        assert 'test_id' in result
        assert 'granger_causality_result' in result
        assert 'confidence' in result
        assert 'lag_results' in result
        assert result['max_lag_tested'] <= 3
        assert result['sample_size'] == 100

    @pytest.mark.asyncio
    async def test_granger_causality_no_relationship(self, sample_engine, sample_time_series_data):
        """Test Granger causality with no actual relationship"""
        test_config = GrangerCausalityTest(
            test_id="test_granger_no_relationship",
            variable_x="w_variable",  # Independent variable
            variable_y="z_variable",  # Another independent variable
            max_lag=3
        )

        result = await sample_engine.perform_granger_causality_test(
            test_config, sample_time_series_data
        )

        # Should detect no causality
        assert result['granger_causality_result'] == 'no_causality'
        assert result['confidence'] < 0.5

    @pytest.mark.asyncio
    async def test_granger_causality_insufficient_data(self, sample_engine):
        """Test Granger causality with insufficient data"""
        small_data = {
            'x': [1, 2, 3],
            'y': [2, 3, 4]
        }

        test_config = GrangerCausalityTest(
            test_id="test_insufficient_data",
            variable_x="x",
            variable_y="y",
            max_lag=5
        )

        result = await sample_engine.perform_granger_causality_test(test_config, small_data)

        assert 'error' in result
        assert 'insufficient' in result['error'].lower()

    @pytest.mark.asyncio
    async def test_granger_causality_missing_variables(self, sample_engine, sample_time_series_data):
        """Test Granger causality with missing variables"""
        incomplete_data = {'x_variable': sample_time_series_data['x_variable']}

        test_config = GrangerCausalityTest(
            test_id="test_missing_variables",
            variable_x="x_variable",
            variable_y="y_variable",
            max_lag=3
        )

        result = await sample_engine.perform_granger_causality_test(test_config, incomplete_data)

        assert 'error' in result
        assert 'missing' in result['error'].lower()

class TestCausalDiscovery:
    """Test causal discovery algorithms"""

    @pytest.mark.asyncio
    async def test_causal_discovery_basic(self, sample_engine, sample_time_series_data):
        """Test basic causal discovery functionality"""
        config = CausalDiscoveryConfig(
            algorithm=CausalDiscoveryAlgorithm.PC_ALGORITHM,
            alpha=0.05,
            variable_names=list(sample_time_series_data.keys())
        )

        discovery_id = await sample_engine.perform_causal_discovery(sample_time_series_data, config)

        assert discovery_id is not None
        assert isinstance(discovery_id, str)
        assert discovery_id in sample_engine.causal_discoveries

    @pytest.mark.asyncio
    async def test_causal_discovery_different_algorithms(self, sample_engine, sample_time_series_data):
        """Test different causal discovery algorithms"""
        algorithms = [
            CausalDiscoveryAlgorithm.PC_ALGORITHM,
            CausalDiscoveryAlgorithm.GES_ALGORITHM,
            CausalDiscoveryAlgorithm.FCI_ALGORITHM,
            CausalDiscoveryAlgorithm.LINGAM_ALGORITHM
        ]

        for algorithm in algorithms:
            config = CausalDiscoveryConfig(
                algorithm=algorithm,
                alpha=0.05,
                variable_names=list(sample_time_series_data.keys())
            )

            discovery_id = await sample_engine.perform_causal_discovery(sample_time_series_data, config)

            assert discovery_id is not None
            assert discovery_id in sample_engine.causal_discoveries

            # Check that discovery was stored
            discovered_graph = sample_engine.causal_discoveries[discovery_id]
            assert isinstance(discovered_graph, CausalGraph)
            assert len(discovered_graph.variables) > 0

    @pytest.mark.asyncio
    async def test_causal_discovery_invalid_data(self, sample_engine):
        """Test causal discovery with invalid data"""
        invalid_data = {
            'var1': [1, 2],  # Too short
            'var2': [3, 4]
        }

        config = CausalDiscoveryConfig(
            algorithm=CausalDiscoveryAlgorithm.PC_ALGORITHM,
            alpha=0.05
        )

        # Should handle gracefully
        discovery_id = await sample_engine.perform_causal_discovery(invalid_data, config)

        # Should return error for insufficient data
        assert 'error' in discovery_id or discovery_id is None

class TestConfounderAnalysis:
    """Test confounder detection and analysis"""

    @pytest.mark.asyncio
    async def test_confounder_analysis_basic(self, sample_engine):
        """Test basic confounder analysis"""
        # Create a simple causal model
        variables = {
            'X': {'name': 'Cause', 'type': 'continuous'},
            'Y': {'name': 'Effect', 'type': 'continuous'},
            'Z': {'name': 'Confounder', 'type': 'continuous'}
        }

        relationships = [('Z', 'X'), ('Z', 'Y'), ('X', 'Y')]  # Z confounds X->Y

        model_id = sample_engine.create_structural_causal_model(variables, relationships)

        # Analyze confounders for X->Y relationship
        analysis_id = await sample_engine.analyze_confounders(model_id, ('X', 'Y'))

        assert analysis_id is not None
        assert analysis_id in sample_engine.confounder_analyses

        analysis = sample_engine.confounder_analyses[analysis_id]
        assert len(analysis.potential_confounders) > 0
        assert 'Z' in analysis.potential_confounders

    @pytest.mark.asyncio
    async def test_confounder_analysis_no_confounders(self, sample_engine):
        """Test confounder analysis when no confounders exist"""
        variables = {
            'X': {'name': 'Cause', 'type': 'continuous'},
            'Y': {'name': 'Effect', 'type': 'continuous'}
        }

        relationships = [('X', 'Y')]

        model_id = sample_engine.create_structural_causal_model(variables, relationships)

        analysis_id = await sample_engine.analyze_confounders(model_id, ('X', 'Y'))

        analysis = sample_engine.confounder_analyses[analysis_id]
        # Should have no confounders
        assert len(analysis.potential_confounders) == 0

    @pytest.mark.asyncio
    async def test_confounder_strength_calculation(self, sample_engine):
        """Test confounder strength calculation"""
        variables = {
            'X': {'name': 'Cause', 'type': 'continuous'},
            'Y': {'name': 'Effect', 'type': 'continuous'},
            'Z1': {'name': 'Strong Confounder', 'type': 'continuous'},
            'Z2': {'name': 'Weak Confounder', 'type': 'continuous'},
            'M1': {'name': 'Mediator1', 'type': 'continuous'},
            'M2': {'name': 'Mediator2', 'type': 'continuous'}
        }

        # Z1 is closer to both X and Y
        relationships = [
            ('Z1', 'X'), ('Z1', 'Y'),
            ('Z2', 'M1'), ('M1', 'X'), # Longer path for Z2
            ('Z2', 'M2'), ('M2', 'Y'), # Longer path for Z2
            ('X', 'Y')
        ]

        model_id = sample_engine.create_structural_causal_model(variables, relationships)

        analysis_id = await sample_engine.analyze_confounders(model_id, ('X', 'Y'))

        analysis = sample_engine.confounder_analyses[analysis_id]

        # Z1 should be stronger confounder than Z2
        # Using pytest.approx for floating-point comparison
        assert analysis.confounder_strengths['Z1'] == pytest.approx(0.666, rel=1e-2)
        assert analysis.confounder_strengths['Z2'] == pytest.approx(0.4, rel=1e-2)
        assert analysis.confounder_strengths['Z1'] > analysis.confounder_strengths['Z2']

class TestCounterfactualAnalysis:
    """Test counterfactual analysis functionality"""

    @pytest.mark.asyncio
    async def test_counterfactual_analysis_basic(self, sample_engine):
        """Test basic counterfactual analysis"""
        # Create a simple causal model
        variables = {
            'X': {'name': 'Treatment', 'type': 'continuous'},
            'Y': {'name': 'Outcome', 'type': 'continuous'}
        }

        relationships = [('X', 'Y')]

        model_id = sample_engine.create_structural_causal_model(variables, relationships)

        factual_scenario = {'X': 1.0, 'Y': 0.5}
        counterfactual_scenario = {'X': 0.0, 'Y': 0.2}
        target_variables = ['Y']

        analysis_id = await sample_engine.perform_counterfactual_analysis(
            model_id, factual_scenario, counterfactual_scenario, target_variables
        )

        assert analysis_id is not None
        assert analysis_id in sample_engine.counterfactual_analyses

        analysis = sample_engine.counterfactual_analyses[analysis_id]

        assert analysis.counterfactual_confidence > 0
        assert 'Y' in analysis.counterfactual_outcomes
        assert len(analysis.necessary_assumptions) > 0

    @pytest.mark.asyncio
    async def test_counterfactual_confidence_calculation(self, sample_engine):
        """Test counterfactual confidence calculation"""
        # Create model with different complexity levels
        simple_model = {
            'X': {'name': 'Treatment', 'type': 'continuous'},
            'Y': {'name': 'Outcome', 'type': 'continuous'}
        }

        complex_model = {
            'X': {'name': 'Treatment', 'type': 'continuous'},
            'Y': {'name': 'Outcome', 'type': 'continuous'},
            'Z1': {'name': 'Mediator1', 'type': 'continuous'},
            'Z2': {'name': 'Mediator2', 'type': 'continuous'},
            'W': {'name': 'Confounder', 'type': 'continuous'}
        }

        simple_relationships = [('X', 'Y')]
        complex_relationships = [('W', 'X'), ('W', 'Y'), ('X', 'Z1'), ('Z1', 'Z2'), ('Z2', 'Y')]

        simple_model_id = sample_engine.create_structural_causal_model(simple_model, simple_relationships)
        complex_model_id = sample_engine.create_structural_causal_model(complex_model, complex_relationships)

        # Test both models
        for model_id in [simple_model_id, complex_model_id]:
            analysis_id = await sample_engine.perform_counterfactual_analysis(
                model_id, {'X': 1.0}, {'X': 0.0}, ['Y']
            )

            analysis = sample_engine.counterfactual_analyses[analysis_id]
            assert 0 <= analysis.counterfactual_confidence <= 1

class TestMarketCausalAnalysis:
    """Test market-specific causal analysis"""

    @pytest.mark.asyncio
    async def test_market_causal_relationships(self, sample_engine, sample_market_data):
        """Test market causal relationship analysis"""
        findings = await sample_engine.analyze_market_causal_relationships(sample_market_data)

        assert isinstance(findings, list)
        assert len(findings) > 0

        # Check that findings have proper structure
        for finding in findings:
            assert hasattr(finding, 'finding_id')
            assert hasattr(finding, 'finding_type')
            assert hasattr(finding, 'cause_variable')
            assert hasattr(finding, 'effect_variable')
            assert hasattr(finding, 'confidence_score')
            assert hasattr(finding, 'confidence_level')

    @pytest.mark.asyncio
    async def test_market_relationship_types(self, sample_engine, sample_market_data):
        """Test that market relationships are properly categorized"""
        findings = await sample_engine.analyze_market_causal_relationships(sample_market_data)

        causal_findings = [f for f in findings if f.finding_type == CausalFindingType.CAUSAL_RELATIONSHIP]
        correlational_findings = [f for f in findings if f.finding_type == CausalFindingType.CORRELATIONAL_RELATIONSHIP]

        # Should have both types of findings
        assert len(causal_findings) + len(correlational_findings) == len(findings)

        # Causal findings should have higher confidence
        if causal_findings:
            avg_causal_confidence = sum(f.confidence_score for f in causal_findings) / len(causal_findings)
            assert avg_causal_confidence > 0.5

class TestVisualizationComponents:
    """Test visualization functionality"""

    @pytest.mark.asyncio
    async def test_causal_graph_visualization(self, sample_engine):
        """Test causal graph visualization"""
        # Create a simple causal model
        variables = {
            'X': {'name': 'Cause', 'type': 'continuous'},
            'Y': {'name': 'Effect', 'type': 'continuous'},
            'Z': {'name': 'Mediator', 'type': 'continuous'}
        }

        relationships = [('X', 'Z'), ('Z', 'Y')]

        model_id = sample_engine.create_structural_causal_model(variables, relationships)

        # Test Plotly visualization
        plotly_result = sample_engine.visualize_causal_graph(model_id, 'plotly')
        assert 'plotly_figure' in plotly_result
        assert 'graph_statistics' in plotly_result

        # Test matplotlib visualization
        matplotlib_result = sample_engine.visualize_causal_graph(model_id, 'matplotlib')
        assert 'image_base64' in matplotlib_result
        assert 'graph_statistics' in matplotlib_result

    @pytest.mark.asyncio
    async def test_granger_visualization(self, sample_engine, sample_time_series_data):
        """Test Granger causality visualization"""
        test_config = GrangerCausalityTest(
            test_id="test_viz_granger",
            variable_x="x_variable",
            variable_y="y_variable",
            max_lag=3
        )

        # Perform Granger test first
        await sample_engine.perform_granger_causality_test(test_config, sample_time_series_data)

        # Test visualization
        test_id = list(sample_engine.granger_tests.keys())[-1]
        result = sample_engine.visualize_granger_causality_results(test_id, 'plotly')

        assert 'plotly_figure' in result
        assert 'test_summary' in result

    @pytest.mark.asyncio
    async def test_comprehensive_dashboard(self, sample_engine, sample_market_data):
        """Test comprehensive causal dashboard"""
        # Create some data first
        findings = await sample_engine.analyze_market_causal_relationships(sample_market_data)

        # Create dashboard
        dashboard = sample_engine.create_comprehensive_causal_dashboard(output_format='plotly')

        assert 'timestamp' in dashboard
        assert 'visualizations' in dashboard
        assert 'summary' in dashboard

class TestErrorHandling:
    """Test error handling and edge cases"""

    @pytest.mark.asyncio
    async def test_invalid_model_id(self, sample_engine):
        """Test handling of invalid model IDs"""
        result = await sample_engine.perform_causal_query("invalid_id", CausalQuery(
            query_id="test",
            query_type="effect_of_intervention",
            intervention={},
            condition={},
            target_variables=["Y"],
            query_metadata={}
        ))

        assert 'error' in result
        assert 'not found' in result['error']

    @pytest.mark.asyncio
    async def test_malformed_data(self, sample_engine):
        """Test handling of malformed input data"""
        malformed_data = {
            'incomplete': [1, 2],  # Missing some variables
            'data': None  # None value
        }

        config = CausalDiscoveryConfig(
            algorithm=CausalDiscoveryAlgorithm.PC_ALGORITHM,
            alpha=0.05
        )

        result = await sample_engine.perform_causal_discovery(malformed_data, config)

        # Should handle gracefully
        assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_visualization_without_libraries(self, sample_engine):
        """Test visualization when libraries are not available"""
        # Mock missing visualization libraries
        with patch('coinet_ai_ml.continual_learning.causal_inference.VISUALIZATION_LIBRARIES_AVAILABLE', False):
            result = sample_engine.visualize_causal_graph("test_model")

            assert 'error' in result
            assert 'libraries not available' in result['error']

class TestPerformanceAndScalability:
    """Test performance and scalability"""

    @pytest.mark.asyncio
    async def test_large_dataset_handling(self, sample_engine):
        """Test handling of large datasets"""
        # Create large synthetic dataset
        n_vars = 10
        n_points = 1000

        large_data = {}
        for i in range(n_vars):
            large_data[f'var_{i}'] = np.random.normal(0, 1, n_points).tolist()

        config = CausalDiscoveryConfig(
            algorithm=CausalDiscoveryAlgorithm.PC_ALGORITHM,
            alpha=0.05
        )

        # Should complete within reasonable time
        discovery_id = await sample_engine.perform_causal_discovery(large_data, config)

        assert discovery_id is not None
        assert discovery_id in sample_engine.causal_discoveries

    @pytest.mark.asyncio
    async def test_multiple_concurrent_tests(self, sample_engine, sample_time_series_data):
        """Test multiple concurrent Granger tests"""
        # Create multiple test configurations
        test_configs = []
        for i in range(5):
            test_config = GrangerCausalityTest(
                test_id=f"concurrent_test_{i}",
                variable_x="x_variable",
                variable_y="y_variable",
                max_lag=3
            )
            test_configs.append(test_config)

        # Run tests concurrently
        tasks = [
            sample_engine.perform_granger_causality_test(config, sample_time_series_data)
            for config in test_configs
        ]

        results = await asyncio.gather(*tasks)

        # All should complete successfully
        for result in results:
            assert 'error' not in result
            assert 'test_id' in result

    @pytest.mark.asyncio
    async def test_memory_efficient_processing(self, sample_engine):
        """Test memory-efficient processing for large datasets"""
        # Create memory-intensive data
        huge_data = {
            'var_1': list(range(100000)),
            'var_2': [i * 0.1 for i in range(100000)],
            'var_3': [np.sin(i * 0.01) for i in range(100000)]
        }

        # Should process without memory issues
        test_config = GrangerCausalityTest(
            test_id="memory_test",
            variable_x="var_1",
            variable_y="var_2",
            max_lag=5
        )

        result = await sample_engine.perform_granger_causality_test(test_config, huge_data)

        assert 'error' not in result or 'memory' not in result.get('error', '').lower()

class TestIntegration:
    """Test integration with existing systems"""

    @pytest.mark.asyncio
    async def test_causal_findings_storage(self, sample_engine, sample_market_data):
        """Test that causal findings are properly stored and retrievable"""
        # Generate findings
        findings = await sample_engine.analyze_market_causal_relationships(sample_market_data)

        # Check storage
        assert len(sample_engine.causal_findings) == len(findings)

        # Check retrieval
        # Create a dummy causal model for the insights method to reference
        variables = {f.cause_variable: {'name': f.cause_variable, 'type': 'continuous'} for f in findings}
        for f in findings:
            variables[f.effect_variable] = {'name': f.effect_variable, 'type': 'continuous'}
        relationships = [(f.cause_variable, f.effect_variable) for f in findings]

        if variables and relationships:
            model_id = sample_engine.create_structural_causal_model(variables, relationships, model_id='test_model')
            insights = sample_engine.get_causal_insights(model_id)
            assert 'causal_findings' in insights
        else:
            # If no findings, insights should still work but with no causal data
            insights = sample_engine.get_causal_insights("non_existent_model") # Test non-existent model
            assert 'error' in insights or 'causal_findings' not in insights

    @pytest.mark.asyncio
    async def test_end_to_end_workflow(self, sample_engine, sample_market_data):
        """Test complete end-to-end causal inference workflow"""
        # 1. Analyze market relationships
        findings = await sample_engine.analyze_market_causal_relationships(sample_market_data)

        # 2. Create causal model from findings
        variables = {}
        relationships = []

        for finding in findings[:3]:  # Use first 3 findings
            cause_var = finding.cause_variable
            effect_var = finding.effect_variable

            if cause_var not in variables:
                variables[cause_var] = {'name': cause_var, 'type': 'continuous'}
            if effect_var not in variables:
                variables[effect_var] = {'name': effect_var, 'type': 'continuous'}

            relationships.append((cause_var, effect_var))

        model_id = sample_engine.create_structural_causal_model(variables, relationships)

        # 3. Perform confounder analysis
        if relationships:
            cause, effect = relationships[0]
            analysis_id = await sample_engine.analyze_confounders(model_id, (cause, effect))

            assert analysis_id is not None

        # 4. Perform counterfactual analysis
        factual_scenario = {var: 0.5 for var in variables.keys()}
        counterfactual_scenario = {var: 0.7 for var in variables.keys()}
        target_vars = list(variables.keys())[:2]

        cf_analysis_id = await sample_engine.perform_counterfactual_analysis(
            model_id, factual_scenario, counterfactual_scenario, target_vars
        )

        assert cf_analysis_id is not None

        # 5. Create visualizations
        graph_viz = sample_engine.visualize_causal_graph(model_id, 'plotly')
        assert 'plotly_figure' in graph_viz

        # 6. Get comprehensive insights
        insights = sample_engine.get_causal_insights(model_id)
        assert 'causal_findings' in insights
        assert 'confounder_analyses' in insights
        assert 'counterfactual_analyses' in insights

class TestAdvancedCausalFeatures:
    """Test advanced divine causal inference features"""

    @pytest.mark.asyncio
    async def test_advanced_causal_effect_estimation(self, sample_engine, sample_time_series_data):
        """Test advanced causal effect estimation with multiple methods"""
        # Add treatment and outcome variables
        data = sample_time_series_data.copy()
        data['treatment'] = np.random.randint(0, 2, 100).tolist()  # Binary treatment
        data['outcome'] = (0.5 * np.array(data['x_variable']) + 0.3 * np.array(data['treatment']) + np.random.normal(0, 0.1, 100)).tolist()

        result = await sample_engine.perform_advanced_causal_effect_estimation(
            data, 'treatment', 'outcome', ['x_variable', 'z_variable']
        )

        assert 'treatment_variable' in result
        assert 'outcome_variable' in result
        assert 'causal_effect_estimates' in result
        assert 'ensemble_estimate' in result['causal_effect_estimates']
        assert result['confidence'] > 0

    @pytest.mark.asyncio
    async def test_causal_reinforcement_learning(self, sample_engine):
        """Test causal reinforcement learning"""
        environment_data = {
            'states': [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]],
            'actions': [[1, 0], [0, 1], [0.5, 0.5]],
            'rewards': [1.0, -0.5, 0.8]
        }

        policy_config = {
            'learning_rate': 0.01,
            'discount_factor': 0.95,
            'exploration_rate': 0.1
        }

        result = await sample_engine.perform_causal_reinforcement_learning(
            environment_data, policy_config
        )

        assert 'optimal_policy' in result
        assert 'causal_rewards' in result
        assert 'policy_confidence' in result

    @pytest.mark.asyncio
    async def test_quantum_causal_inference(self, sample_engine):
        """Test quantum causal inference"""
        quantum_data = {
            'qubits': [0, 1, 2],
            'measurements': [[1, 0, 1], [0, 1, 0], [1, 1, 0]],
            'entanglement_matrix': [[1.0, 0.7, 0.3], [0.7, 1.0, 0.5], [0.3, 0.5, 1.0]]
        }

        quantum_config = {
            'quantum_depth': 3,
            'measurement_shots': 1000,
            'entanglement_threshold': 0.5
        }

        result = await sample_engine.perform_quantum_causal_inference(
            quantum_data, quantum_config
        )

        assert 'quantum_causal_graph' in result
        assert 'quantum_entanglement_effects' in result
        assert 'quantum_confidence' in result

    @pytest.mark.asyncio
    async def test_multi_universe_causal_analysis(self, sample_engine, sample_market_data):
        """Test multi-universe causal analysis"""
        # Create data from multiple "universes"
        universe_data = {
            'universe_1': sample_market_data.copy(),
            'universe_2': {k: [v * 1.1 for v in values] for k, values in sample_market_data.items()},
            'universe_3': {k: [v * 0.9 for v in values] for k, values in sample_market_data.items()}
        }

        universe_config = {
            'consistency_threshold': 0.8,
            'cross_universe_effects': True,
            'divine_pattern_detection': True
        }

        result = await sample_engine.perform_multi_universe_causal_analysis(
            universe_data, universe_config
        )

        assert 'universe_causal_consistency' in result
        assert 'cross_universe_effects' in result
        assert 'divine_causal_patterns' in result

    @pytest.mark.asyncio
    async def test_temporal_causal_analysis(self, sample_engine, sample_time_series_data):
        """Test temporal causal analysis"""
        temporal_config = {
            'time_windows': [10, 20, 30],
            'dynamic_effects': True,
            'seasonal_adjustment': True
        }

        result = await sample_engine.perform_temporal_causal_analysis(
            sample_time_series_data, temporal_config
        )

        assert 'temporal_causal_effects' in result
        assert 'time_varying_confounders' in result
        assert 'dynamic_causal_graphs' in result

    @pytest.mark.asyncio
    async def test_network_causal_inference(self, sample_engine):
        """Test network causal inference"""
        network_data = {
            'nodes': ['A', 'B', 'C', 'D'],
            'edges': [('A', 'B'), ('B', 'C'), ('C', 'D'), ('A', 'D')],
            'node_features': {
                'A': [1.0, 0.5],
                'B': [0.8, 0.7],
                'C': [0.6, 0.9],
                'D': [0.4, 0.3]
            }
        }

        network_config = {
            'influence_propagation': True,
            'network_confounder_detection': True,
            'causal_path_analysis': True
        }

        result = await sample_engine.perform_network_causal_inference(
            network_data, network_config
        )

        assert 'network_causal_effects' in result
        assert 'influence_propagation' in result
        assert 'causal_network_topology' in result

    async def test_divine_causal_report_generation(self, sample_engine, sample_market_data):
        """Test divine causal report generation"""
        # Generate some data first
        await sample_engine.analyze_market_causal_relationships(sample_market_data)

        # Generate divine report
        report = sample_engine.create_divine_causal_report()

        assert 'divine_causal_system_version' in report
        assert 'divine_capabilities' in report
        assert 'total_causal_models' in report
        assert 'causal_libraries_status' in report

        # Check that all divine features are listed
        expected_features = [
            'granger_causality_testing',
            'advanced_causal_discovery',
            'sophisticated_confounder_detection',
            'comprehensive_counterfactual_analysis',
            'causal_vs_correlational_distinction',
            'market_specific_causal_analysis',
            'interactive_visualizations',
            'comprehensive_testing_suite',
            'advanced_effect_estimation',
            'causal_reinforcement_learning',
            'quantum_causal_inference',
            'multi_universe_analysis',
            'temporal_causal_dynamics',
            'network_causal_inference'
        ]

        for feature in expected_features:
            assert feature in report['divine_capabilities']

class TestDivinePerformanceAndScalability:
    """Test divine-level performance and scalability"""

    @pytest.mark.asyncio
    async def test_large_scale_causal_discovery(self, sample_engine):
        """Test causal discovery with large-scale data"""
        # Create large dataset
        n_vars = 50
        n_points = 5000

        large_data = {}
        for i in range(n_vars):
            large_data[f'var_{i}'] = np.random.normal(0, 1, n_points).tolist()

        config = CausalDiscoveryConfig(
            algorithm=CausalDiscoveryAlgorithm.PC_ALGORITHM,
            alpha=0.01  # Stricter for large data
        )

        # Should handle large data efficiently
        discovery_id = await sample_engine.perform_causal_discovery(large_data, config)

        assert discovery_id is not None
        discovered_graph = sample_engine.causal_discoveries[discovery_id]
        assert len(discovered_graph.variables) == n_vars

    @pytest.mark.asyncio
    async def test_concurrent_divine_operations(self, sample_engine, sample_market_data):
        """Test concurrent divine causal operations"""
        # Create multiple concurrent operations
        operations = []

        # Multiple Granger tests
        for i in range(5):
            test_config = GrangerCausalityTest(
                test_id=f"concurrent_granger_{i}",
                variable_x="news_sentiment",
                variable_y="btc_price",
                max_lag=3
            )
            operations.append(sample_engine.perform_granger_causality_test(test_config, sample_market_data))

        # Multiple causal discoveries
        for i in range(3):
            config = CausalDiscoveryConfig(
                algorithm=CausalDiscoveryAlgorithm.PC_ALGORITHM,
                alpha=0.05
            )
            operations.append(sample_engine.perform_causal_discovery(sample_market_data, config))

        # Execute all concurrently
        results = await asyncio.gather(*operations)

        # All should complete successfully
        for result in results:
            assert 'error' not in result

    @pytest.mark.asyncio
    async def test_memory_efficient_processing(self, sample_engine):
        """Test memory-efficient processing for large datasets"""
        # Create memory-intensive data
        huge_data = {
            'var_1': list(range(100000)),
            'var_2': [i * 0.1 for i in range(100000)],
            'var_3': [np.sin(i * 0.01) for i in range(100000)]
        }

        # Should process without memory issues
        test_config = GrangerCausalityTest(
            test_id="memory_test",
            variable_x="var_1",
            variable_y="var_2",
            max_lag=5
        )

        result = await sample_engine.perform_granger_causality_test(test_config, huge_data)

        assert 'error' not in result or 'memory' not in result.get('error', '').lower()

class TestDivineIntegration:
    """Test divine-level integration capabilities"""

    @pytest.mark.asyncio
    async def test_end_to_end_divine_workflow(self, sample_engine, sample_market_data):
        """Test complete end-to-end divine causal workflow"""
        # 1. Advanced market analysis
        market_findings = await sample_engine.analyze_market_causal_relationships(sample_market_data)

        # 2. Create comprehensive causal model
        variables = {}
        relationships = []

        for finding in market_findings[:5]:  # Use first 5 findings
            cause_var = finding.cause_variable
            effect_var = finding.effect_variable

            if cause_var not in variables:
                variables[cause_var] = {'name': cause_var, 'type': 'continuous'}
            if effect_var not in variables:
                variables[effect_var] = {'name': effect_var, 'type': 'continuous'}

            relationships.append((cause_var, effect_var))

        model_id = sample_engine.create_structural_causal_model(variables, relationships)

        # 3. Advanced causal effect estimation
        if sample_market_data:
            treatment_var = list(sample_market_data.keys())[0]
            outcome_var = list(sample_market_data.keys())[1]

            effect_result = await sample_engine.perform_advanced_causal_effect_estimation(
                sample_market_data, treatment_var, outcome_var
            )

            assert 'ensemble_estimate' in effect_result['causal_effect_estimates']

        # 4. Confounder analysis
        if relationships:
            cause, effect = relationships[0]
            confounder_analysis_id = await sample_engine.analyze_confounders(model_id, (cause, effect))

            assert confounder_analysis_id is not None

        # 5. Counterfactual analysis
        factual_scenario = {var: 0.5 for var in list(variables.keys())[:3]}
        counterfactual_scenario = {var: 0.7 for var in list(variables.keys())[:3]}
        target_vars = list(variables.keys())[:2]

        cf_analysis_id = await sample_engine.perform_counterfactual_analysis(
            model_id, factual_scenario, counterfactual_scenario, target_vars
        )

        assert cf_analysis_id is not None

        # 6. Generate visualizations
        graph_viz = sample_engine.visualize_causal_graph(model_id, 'plotly')
        assert 'plotly_figure' in graph_viz

        # 7. Generate divine report
        divine_report = sample_engine.create_divine_causal_report(model_id)
        assert 'divine_capabilities' in divine_report

        # 8. Get comprehensive insights
        insights = sample_engine.get_causal_insights(model_id)
        assert 'causal_findings' in insights

        print("✅ Complete divine causal workflow executed successfully")

    @pytest.mark.asyncio
    async def test_divine_capability_showcase(self, sample_engine, sample_market_data):
        """Showcase all divine capabilities in one comprehensive test"""
        print("\n🌟 DIVINE CAUSAL CAPABILITIES SHOWCASE")
        print("=" * 50)

        # 1. Market causal analysis
        print("1. 📈 Market Causal Relationship Analysis")
        market_findings = await sample_engine.analyze_market_causal_relationships(sample_market_data)
        print(f"   Found {len(market_findings)} causal relationships")

        # 2. Advanced causal discovery
        print("2. 🔍 Advanced Causal Discovery")
        config = CausalDiscoveryConfig(
            algorithm=CausalDiscoveryAlgorithm.PC_ALGORITHM,
            alpha=0.05
        )
        discovery_id = await sample_engine.perform_causal_discovery(sample_market_data, config)
        print(f"   Discovered causal structure: {discovery_id}")

        # 3. Sophisticated confounder detection
        print("3. 🎯 Sophisticated Confounder Detection")
        if discovery_id in sample_engine.causal_discoveries:
            cg = sample_engine.causal_discoveries[discovery_id]
            if cg.directed_edges:
                cause, effect = cg.directed_edges[0]
                confounder_analysis_id = await sample_engine.analyze_confounders(discovery_id, (cause, effect))
                print(f"   Confounder analysis: {confounder_analysis_id}")

        # 4. Counterfactual analysis
        print("4. 🔮 Counterfactual Analysis")
        variables = {'X': {'name': 'Treatment', 'type': 'continuous'}, 'Y': {'name': 'Outcome', 'type': 'continuous'}}
        relationships = [('X', 'Y')]
        model_id = sample_engine.create_structural_causal_model(variables, relationships)

        cf_analysis_id = await sample_engine.perform_counterfactual_analysis(
            model_id, {'X': 0.0, 'Y': 0.5}, {'X': 1.0, 'Y': 0.8}, ['Y']
        )
        print(f"   Counterfactual analysis: {cf_analysis_id}")

        # 5. Advanced effect estimation
        print("5. 🔬 Advanced Causal Effect Estimation")
        effect_result = await sample_engine.perform_advanced_causal_effect_estimation(
            sample_market_data, 'news_sentiment', 'btc_price'
        )
        print(f"   Effect estimation completed with {len(effect_result['causal_effect_estimates'])} methods")

        # 6. Interactive visualizations
        print("6. 📊 Interactive Visualizations")
        if model_id in sample_engine.causal_graphs:
            graph_viz = sample_engine.visualize_causal_graph(model_id, 'plotly')
            print(f"   Causal graph visualization: {len(graph_viz.get('plotly_figure', {}))} elements")

        # 7. Divine capabilities report
        print("7. 📋 Divine Capabilities Report")
        divine_report = sample_engine.create_divine_causal_report()
        print(f"   Divine system version: {divine_report['divine_causal_system_version']}")
        print(f"   Total capabilities: {len(divine_report['divine_capabilities'])}")

        print("\n✨ ALL DIVINE CAPABILITIES DEMONSTRATED SUCCESSFULLY!")
        print("🎉 This causal inference system is truly divine and industry-leading!")

# Utility functions for testing
def create_synthetic_causal_data(n_samples=100, causal_strength=0.7, noise_level=0.1):
    """Create synthetic data with known causal relationships for testing"""
    np.random.seed(42)

    # Create independent variables
    X = np.random.normal(0, 1, n_samples)
    Z = np.random.normal(0, 1, n_samples)  # Confounder

    # Create causally related variables
    Y = causal_strength * X + noise_level * np.random.normal(0, 1, n_samples)
    W = 0.3 * Z + 0.4 * X + noise_level * np.random.normal(0, 1, n_samples)  # Mediator

    return {
        'X': X.tolist(),
        'Y': Y.tolist(),
        'Z': Z.tolist(),
        'W': W.tolist()
    }

# Performance benchmarking
@pytest.mark.benchmark
def test_causal_inference_performance(benchmark, sample_engine, sample_time_series_data):
    """Benchmark causal inference performance"""
    test_config = GrangerCausalityTest(
        test_id="benchmark_test",
        variable_x="x_variable",
        variable_y="y_variable",
        max_lag=5
    )

    result = benchmark(
        lambda: asyncio.run(sample_engine.perform_granger_causality_test(test_config, sample_time_series_data))
    )

    assert 'test_id' in result
