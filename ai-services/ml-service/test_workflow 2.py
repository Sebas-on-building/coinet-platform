#!/usr/bin/env python3

import asyncio
import sys
import os

# Add src to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from coinet_ai_ml.continual_learning.causal_inference import CausalInferenceEngine

async def test_workflow():
    divine_engine = CausalInferenceEngine()

    # Test market data
    market_data = {
        'btc_price': [40000, 41000, 42000],
        'news_sentiment': [0.1, 0.2, 0.3],
        'trading_volume': [1000000, 1100000, 1200000],
        'fear_greed_index': [50, 60, 70],
        'social_media_activity': [100, 120, 140]
    }

    print("Testing market analysis...")
    market_findings = divine_engine.analyze_market_causal_relationships(market_data)
    print(f"Market findings: {len(market_findings)}")

    print("Testing causal discovery...")
    discovery_config = {
        'algorithm': 'pc_algorithm',
        'alpha': 0.05,
        'variable_names': list(market_data.keys())
    }
    discovery_result = await divine_engine.perform_causal_discovery(market_data, discovery_config)
    print(f"Discovery result type: {type(discovery_result)}")
    print(f"Discovery result: {discovery_result}")

    if isinstance(discovery_result, dict) and 'error' in discovery_result:
        discovery_id = None
        print("Discovery failed")
    else:
        discovery_id = discovery_result
        print(f"Discovery ID: {discovery_id}")

    print("Testing counterfactual analysis...")
    variables = {'treatment': {'name': 'Treatment', 'type': 'continuous'}, 'outcome': {'name': 'Outcome', 'type': 'continuous'}}
    relationships = [('treatment', 'outcome')]
    model_id = divine_engine.create_structural_causal_model(variables, relationships)
    print(f"Model created: {model_id}")

    cf_result = await divine_engine.perform_counterfactual_analysis(
        model_id, {'treatment': 0.0}, {'treatment': 1.0}, ['outcome']
    )
    print(f"Counterfactual result type: {type(cf_result)}")
    print(f"Counterfactual result: {cf_result}")

    if isinstance(cf_result, dict) and 'error' in cf_result:
        cf_id = None
        print("Counterfactual failed")
    else:
        cf_id = cf_result
        print(f"Counterfactual ID: {cf_id}")

    print("Testing divine report...")
    divine_report = divine_engine.create_divine_causal_report()
    print(f"Divine report version: {divine_report['divine_causal_system_version']}")

    print("Creating workflow result...")
    workflow_result = {
        'workflow_completed': True,
        'market_findings': len(market_findings),
        'discovery_id': discovery_id,
        'confounder_analysis_id': None,
        'counterfactual_analysis_id': cf_id,
        'effect_estimation_completed': False,
        'visualization_created': False,
        'divine_report_version': divine_report['divine_causal_system_version']
    }

    print(f"Workflow result: {workflow_result}")
    return workflow_result

if __name__ == "__main__":
    result = asyncio.run(test_workflow())
    print("Test completed successfully!")
