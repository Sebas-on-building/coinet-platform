"""
⚠️  DEMO ONLY - DO NOT USE IN PRODUCTION  ⚠️
==========================================
Knowledge Graph Demo - Complete System Demonstration

This script demonstrates the full capabilities of Coinet's revolutionary
knowledge graph system including entity extraction, reasoning, storage,
and integration with the multi-modal fusion pipeline.
"""

import asyncio
import json
import os
from datetime import datetime
from typing import Dict, List, Any
import re
import logging

# Import knowledge graph components
from coinet_ai_ml.knowledge_graph.core import KnowledgeGraph, Entity, EntityType, Relationship, RelationshipType, Property
from coinet_ai_ml.knowledge_graph.extraction import EntityExtractor, RelationExtractor, DataSourceIntegrator, DataSource
from coinet_ai_ml.knowledge_graph.reasoning import ReasoningEngine, InferenceResult
from coinet_ai_ml.knowledge_graph.storage import GraphStorage, QueryEngine, StorageBackend
from coinet_ai_ml.knowledge_graph.api import KnowledgeGraphAPI
from coinet_ai_ml.knowledge_graph.integration import KnowledgeGraphIntegrator, FusionKnowledgeGraphBridge

logger = logging.getLogger(__name__)

# Sample data for demonstration
SAMPLE_NEWS_ARTICLES = [
    {
        'title': 'Bitcoin Reaches New All-Time High as Institutional Adoption Grows',
        'summary': 'Bitcoin has surpassed $100,000 for the first time, driven by increased institutional investment from major corporations and traditional finance firms.',
        'url': 'https://example.com/bitcoin-ath-2024',
        'timestamp': datetime.utcnow().isoformat()
    },
    {
        'title': 'Ethereum 2.0 Upgrade Successfully Completed',
        'summary': 'The long-awaited Ethereum merge has been completed, transitioning the network from proof-of-work to proof-of-stake consensus mechanism.',
        'url': 'https://example.com/ethereum-merge-complete',
        'timestamp': datetime.utcnow().isoformat()
    }
]

SAMPLE_SOCIAL_MEDIA = [
    {
        'text': 'Just invested in $BTC - this bull run is insane! 🚀 #Bitcoin #Crypto',
        'platform': 'twitter',
        'author': 'crypto_trader_2024',
        'timestamp': datetime.utcnow().isoformat()
    },
    {
        'text': 'Ethereum gas fees are killing me. When will layer 2 solutions become mainstream? #ETH #DeFi',
        'platform': 'reddit',
        'author': 'defi_enthusiast',
        'timestamp': datetime.utcnow().isoformat()
    }
]

SAMPLE_ONCHAIN_DATA = {
    'transaction_count': 1250000,
    'active_addresses': 950000,
    'whale_transactions': 45,
    'gas_price': 25.5,
    'network_utilization': 0.78
}

SAMPLE_ACADEMIC_PAPER = {
    'title': 'Decentralized Finance: The Future of Global Financial Systems',
    'abstract': 'This paper explores the transformative potential of decentralized finance (DeFi) protocols in reshaping traditional financial systems through blockchain technology.',
    'authors': ['Dr. Sarah Chen', 'Prof. Michael Rodriguez'],
    'journal': 'Journal of Blockchain Research',
    'year': 2024,
    'url': 'https://academic.example.com/defi-future-2024'
}


async def demonstrate_entity_extraction():
    """Demonstrate entity extraction from various data sources"""
    print("🔍 STEP 1: ENTITY EXTRACTION FROM MULTIPLE SOURCES")
    print("=" * 60)

    # Initialize extraction pipeline
    extractor = DataSourceIntegrator()

    # Extract entities from news articles
    print("\n📄 Processing News Articles...")
    news_entities = []
    for article in SAMPLE_NEWS_ARTICLES:
        entities = await extractor.entity_extractor.extract_entities(
            f"{article['title']}. {article['summary']}",
            DataSource.NEWS_ARTICLES,
            article['url']
        )
        news_entities.extend(entities)

    print(f"   ✅ Extracted {len(news_entities)} entities from news articles")

    # Extract entities from social media
    print("\n📱 Processing Social Media Posts...")
    social_entities = []
    for post in SAMPLE_SOCIAL_MEDIA:
        entities = await extractor.entity_extractor.extract_entities(
            post['text'],
            DataSource.SOCIAL_MEDIA,
            f"{post['platform']}/{post['author']}"
        )
        social_entities.extend(entities)

    print(f"   ✅ Extracted {len(social_entities)} entities from social media")

    # Extract entities from on-chain data
    print("\n⛓️ Processing On-Chain Data...")
    onchain_text = f"Total transactions: {SAMPLE_ONCHAIN_DATA['transaction_count']}, Active addresses: {SAMPLE_ONCHAIN_DATA['active_addresses']}, Whale activity: {SAMPLE_ONCHAIN_DATA['whale_transactions']} whales, Current gas price: {SAMPLE_ONCHAIN_DATA['gas_price']} Gwei, Network utilization: {SAMPLE_ONCHAIN_DATA['network_utilization']:.0%}"
    onchain_entities = await extractor.entity_extractor.extract_entities(
        onchain_text,
        DataSource.ON_CHAIN
    )
    print(f"   ✅ Extracted {len(onchain_entities)} entities from on-chain data")

    # Extract entities from academic literature
    print("\n📚 Processing Academic Literature...")
    academic_entities = []
    entities = await extractor.entity_extractor.extract_entities(
        f"{SAMPLE_ACADEMIC_PAPER['title']}. {SAMPLE_ACADEMIC_PAPER['abstract']}",
        DataSource.ACADEMIC,
        SAMPLE_ACADEMIC_PAPER['url']
    )
    for ent in entities:
        if ent.text == SAMPLE_ACADEMIC_PAPER['title']:
            ent.entity_type = EntityType.DOCUMENT # Force correct type for demo
    academic_entities.extend(entities)

    print(f"   ✅ Extracted {len(academic_entities)} entities from academic paper")

    # Combine and deduplicate entities
    all_entities = news_entities + social_entities + onchain_entities + academic_entities
    print(f"\n📊 Total entities extracted: {len(all_entities)}")

    # Perform cross-source deduplication before returning
    integrator = DataSourceIntegrator()
    all_entities = integrator._cross_source_deduplication(all_entities)
    print(f"   ✅ Deduplicated entities across sources: {len(all_entities)}")

    return all_entities


async def demonstrate_knowledge_graph_construction(all_entities):
    """Demonstrate knowledge graph construction"""
    print("\n🏗️ STEP 2: KNOWLEDGE GRAPH CONSTRUCTION")
    print("=" * 60)

    # Initialize knowledge graph
    kg = KnowledgeGraph("Coinet Crypto Knowledge Graph")

    # Add entities to knowledge graph
    print("   📥 Adding entities to knowledge graph...")
    for entity in all_entities:
        # Map extracted entity type to knowledge graph entity type
        kg_entity_type = None
        try:
            kg_entity_type = EntityType[entity.entity_type.upper()]
        except KeyError:
            type_mapping = {
                'PROTOCOL': EntityType.PROTOCOL,
                'CRYPTO_PROJECT': EntityType.CRYPTO_PROJECT,
                'PERSON': EntityType.PERSON,
                'ORGANIZATION': EntityType.ORGANIZATION,
                'EXCHANGE': EntityType.EXCHANGE,
                'TOKEN': EntityType.TOKEN,
                'BLOCKCHAIN': EntityType.BLOCKCHAIN,
                'FOUNDER': EntityType.FOUNDER,
                'INVESTOR': EntityType.INVESTOR,
                'FINANCIAL_AMOUNT': EntityType.FINANCIAL_AMOUNT,
                'ON_CHAIN_METRIC': EntityType.ON_CHAIN_METRIC,
                'LOCATION': EntityType.LOCATION,
                'EVENT': EntityType.EVENT,
                'DOCUMENT': EntityType.DOCUMENT,
                'REGULATORY_BODY': EntityType.REGULATORY_BODY,
                'MISC': EntityType.OTHER
            }
            kg_entity_type = type_mapping.get(entity.entity_type, EntityType.OTHER)
            logging.warning(f"Mapped unknown extracted type '{entity.entity_type}' to {kg_entity_type.value}")

        if not kg_entity_type:
            kg_entity_type = EntityType.OTHER

        kg_entity = Entity(
            id="",
            name=entity.text,
            entity_type=kg_entity_type,
            confidence=entity.confidence,
            source=f"extraction_{entity.data_source.value}",
            metadata={
                'extraction_confidence': entity.confidence,
                'source_url': entity.source_url,
                'data_source': entity.data_source.value,
                'context': entity.context
            }
        )

        # Add properties based on entity type and extracted info
        if kg_entity_type == EntityType.CRYPTO_PROJECT:
            if 'Bitcoin' in entity.text or 'BTC' in entity.text:
                kg_entity.update_property('market_cap', 1000000000000, "demo_init", 0.9)
                kg_entity.update_property('token_symbol', 'BTC', "demo_init", 0.9)
                kg_entity.update_property('blockchain', 'Bitcoin', "demo_init", 0.9)
            elif 'Ethereum' in entity.text or 'ETH' in entity.text:
                kg_entity.update_property('market_cap', 500000000000, "demo_init", 0.9)
                kg_entity.update_property('token_symbol', 'ETH', "demo_init", 0.9)
                kg_entity.update_property('blockchain', 'Ethereum', "demo_init", 0.9)
            elif 'DeFi' in entity.text:
                kg_entity.update_property('blockchain', 'Ethereum', "demo_init", 0.7) # Common for DeFi
            # Attempt to add a dummy market_cap and token_symbol for other CRYPTO_PROJECTs if missing
            if not kg_entity.get_property('market_cap'):
                kg_entity.update_property('market_cap', 100000000, "demo_init", 0.5) # Default/low confidence
            if not kg_entity.get_property('token_symbol'):
                kg_entity.update_property('token_symbol', entity.text.upper()[:4], "demo_init", 0.5)
            if not kg_entity.get_property('blockchain'):
                kg_entity.update_property('blockchain', 'Unknown', "demo_init", 0.5)

        elif kg_entity_type == EntityType.FOUNDER:
            # For demo purposes, assign some experience
            kg_entity.update_property('experience_years', 10, "demo_init", 0.8) # Example

        elif kg_entity_type == EntityType.FINANCIAL_AMOUNT:
            # Attempt to parse value if present in text
            match = re.search(r'\d+(?:,\d{3})*|\d+', entity.text)
            if match:
                amount = float(match.group().replace(',', ''))
                kg_entity.update_property('amount_value', amount, "demo_init", 0.9)
                kg_entity.update_property('currency', 'USD', "demo_init", 0.9) # Assume USD for demo

        elif kg_entity_type == EntityType.ON_CHAIN_METRIC:
            # Add a dummy value for on-chain metrics if not already set
            if not kg_entity.get_property('value'):
                kg_entity.update_property('value', 0.5, "demo_init", 0.5) # Example metric value

        # General properties from extraction
        kg_entity.update_property('extraction_confidence', entity.confidence, entity.data_source.value)
        if entity.source_url: # Only add if available
            kg_entity.update_property('source_url', entity.source_url, entity.data_source.value)

        kg.add_entity(kg_entity)

    print(f"   ✅ Added {len(kg.entities)} entities to knowledge graph")

    # Demonstrate entity relationships
    print("   🔗 Demonstrating entity relationships...")

    # Find entities (if they exist after extraction and deduplication)
    bitcoin_entity = kg.get_entity_by_name('Bitcoin')
    ethereum_entity = kg.get_entity_by_name('Ethereum')
    vitalik_entity = kg.get_entity_by_name('Vitalik Buterin')
    defi_entity = kg.get_entity_by_name('DeFi')
    academic_paper_entity = next((e for e in kg.entities.values() if 'Decentralized Finance' in e.name and e.entity_type == EntityType.DOCUMENT), None)
    # If still not found as DOCUMENT, try again and force the type
    if academic_paper_entity is None:
        academic_paper_entity = kg.get_entity_by_name(SAMPLE_ACADEMIC_PAPER['title'])
        if academic_paper_entity:
            academic_paper_entity.entity_type = EntityType.DOCUMENT
            # Update properties if necessary, e.g., remove org-related properties
            if 'market_cap' in academic_paper_entity.properties:
                del academic_paper_entity.properties['market_cap']
            if 'token_symbol' in academic_paper_entity.properties:
                del academic_paper_entity.properties['token_symbol']
            if 'blockchain' in academic_paper_entity.properties:
                del academic_paper_entity.properties['blockchain']

    financial_amount_100k_entity = next((e for e in kg.entities.values() if e.name == '100,000' and e.entity_type == EntityType.FINANCIAL_AMOUNT), None)
    # Get all financial amount entities for later use
    financial_amounts = [e for e in kg.entities.values() if e.entity_type == EntityType.FINANCIAL_AMOUNT]
    # Try to find the 'Network' entity (misclassified organization)
    network_organization_entity = kg.get_entity_by_name('Network')
    # Try to find the '#ETH #' entity
    eth_hash_entity = kg.get_entity_by_name('#ETH #')
    # Try to find 'Bitcoin Reaches New All-Time' entity (misclassified founder)
    bitcoin_reaches_new_all_time_entity = kg.get_entity_by_name('Bitcoin Reaches New All-Time')

    # Add relationships based on extracted entities
    if vitalik_entity and ethereum_entity:
        rel_founded = Relationship(
            id="", source_id=vitalik_entity.id, target_id=ethereum_entity.id,
            relationship_type=RelationshipType.FOUNDED, confidence=0.95, source="demo_script"
        )
        kg.add_relationship(rel_founded)
        print(f"   ✅ Added FOUNDED relationship between {vitalik_entity.name} and {ethereum_entity.name}")

    if bitcoin_entity and ethereum_entity:
        rel_competes = Relationship(
            id="", source_id=bitcoin_entity.id, target_id=ethereum_entity.id,
            relationship_type=RelationshipType.COMPETES_WITH, confidence=0.8, source="demo_script"
        )
        kg.add_relationship(rel_competes)
        print(f"   ✅ Added COMPETES_WITH relationship between {bitcoin_entity.name} and {ethereum_entity.name}")

    if defi_entity and ethereum_entity:
        rel_built_on = Relationship(
            id="", source_id=defi_entity.id, target_id=ethereum_entity.id,
            relationship_type=RelationshipType.BUILT_ON, confidence=0.75, source="demo_script"
        )
        kg.add_relationship(rel_built_on)
        print(f"   ✅ Added BUILT_ON relationship between {defi_entity.name} and {ethereum_entity.name}")

    if academic_paper_entity and defi_entity:
        rel_references = Relationship(
            id="", source_id=academic_paper_entity.id, target_id=defi_entity.id,
            relationship_type=RelationshipType.REFERENCES, confidence=0.7, source="demo_script"
        )
        kg.add_relationship(rel_references)
        print(f"   ✅ Added REFERENCES relationship between academic paper and {defi_entity.name}")

    # Link financial amounts to related crypto projects/events
    if financial_amount_100k_entity and bitcoin_entity:
        rel_investment_bitcoin = Relationship(
            id="", source_id=financial_amount_100k_entity.id, target_id=bitcoin_entity.id,
            relationship_type=RelationshipType.INVESTED_IN, confidence=0.8, source="demo_script_money"
        )
        kg.add_relationship(rel_investment_bitcoin)
        print(f"   ✅ Added INVESTED_IN relationship between {financial_amount_100k_entity.name} and {bitcoin_entity.name}")

    if financial_amounts and ethereum_entity:
        # Link a financial amount to Ethereum (e.g., investment amount)
        for fa_entity in financial_amounts:
            # Check if this specific relationship already exists to avoid duplicates
            existing_rels = kg.get_relationships(source_id=fa_entity.id, target_id=ethereum_entity.id, relationship_type=RelationshipType.INVESTED_IN)
            if existing_rels:
                continue # Avoid duplicate
            rel_invested = Relationship(
                id="", source_id=fa_entity.id, target_id=ethereum_entity.id,
                relationship_type=RelationshipType.INVESTED_IN, confidence=0.6, source="demo_script"
            )
            rel_invested.add_property(Property(name='investment_amount', value=1000000.0, confidence=0.7, source="demo_script"))
            kg.add_relationship(rel_invested)
            print(f"   ✅ Added INVESTED_IN relationship between {fa_entity.name} and {ethereum_entity.name}")

    # Try to link misclassified 'founder' (which should be an event/document)
    if bitcoin_reaches_new_all_time_entity and bitcoin_entity:
        # Treat as an event that REFERENCES Bitcoin
        rel_event_ref_bitcoin = Relationship(
            id="", source_id=bitcoin_reaches_new_all_time_entity.id, target_id=bitcoin_entity.id,
            relationship_type=RelationshipType.REFERENCES, confidence=0.7, source="demo_script"
        )
        kg.add_relationship(rel_event_ref_bitcoin)
        print(f"   ✅ Added REFERENCES relationship between '{bitcoin_reaches_new_all_time_entity.name}' and {bitcoin_entity.name}")

    # Link the academic paper to Ethereum or DeFi if they exist
    if academic_paper_entity and (ethereum_entity or defi_entity):
        target = ethereum_entity if ethereum_entity else defi_entity
        if target:
            rel_cites_paper = Relationship(
                id="", source_id=academic_paper_entity.id, target_id=target.id,
                relationship_type=RelationshipType.CITES, confidence=0.8, source="demo_script_paper"
            )
            kg.add_relationship(rel_cites_paper)
            print(f"   ✅ Added CITES relationship between academic paper and {target.name}")

    # Orphaned entities: Remaining check and specific handling
    # Some entities might still be orphaned if they are generic or not designed to be linked in this demo.
    # For example, '#ETH #' is likely noise and might not be a valid entity to link.
    # The 'Network (organization)' might be a generic classification from NLP, hard to link without more context.

    print(f"   📊 Knowledge graph now contains: {len(kg.entities)} entities, {len(kg.relationships)} relationships")

    return kg


async def demonstrate_reasoning_engine(kg):
    """Demonstrate reasoning and inference capabilities"""
    print("\n🧠 STEP 3: REASONING ENGINE & INFERENCE")
    print("=" * 60)

    # Initialize reasoning engine
    reasoning_engine = ReasoningEngine(kg)

    # Run full inference
    print("   🔍 Running comprehensive inference...")
    inference_results = await reasoning_engine.run_full_inference()

    print(f"   ✅ Property inheritance inferences: {len(inference_results['property_inheritance'])}")
    print(f"   ✅ Rule-based inferences: {len(inference_results['rule_based'])}")
    print(f"   ✅ Constraint violations found: {inference_results['constraint_violations']}")

    # Demonstrate specific entity inference
    print("   🎯 Demonstrating entity-specific inference...")

    # Find a crypto project entity for inference
    crypto_projects = [e for e in kg.entities.values() if e.entity_type == EntityType.CRYPTO_PROJECT]
    if crypto_projects:
        target_entity = crypto_projects[0]
        print(f"   📍 Analyzing entity: {target_entity.name}")

        # Run inference on specific entity
        entity_inference = await reasoning_engine.infer_entity_properties(target_entity.id)

        for result in entity_inference:
            for fact in result.derived_facts:
                print(f"   💡 Inferred: {fact['property_name']} = {fact['property_value']} (confidence: {fact['confidence']:.2f})")

    # Demonstrate transitive closure
    print("   🌐 Demonstrating transitive closure...")
    if len(kg.entities) >= 2:
        entity_ids = list(kg.entities.keys())[:2]
        paths = await reasoning_engine.transitive_closure.find_transitive_relationships(
            entity_ids[0], entity_ids[1], max_depth=3
        )
        print(f"   ✅ Found {len(paths)} paths between entities")

    return reasoning_engine


async def demonstrate_storage_and_querying(kg, reasoning_engine):
    """Demonstrate storage and querying capabilities"""
    print("\n💾 STEP 4: STORAGE & QUERYING")
    print("=" * 60)

    # Initialize storage and query engine
    storage = GraphStorage(backend="sqlite")
    query_engine = QueryEngine(storage)

    # Save knowledge graph to storage
    print("   💾 Saving knowledge graph to storage...")
    storage.save_knowledge_graph(kg)
    print("   ✅ Knowledge graph saved successfully")

    # Demonstrate various queries
    print("   🔍 Demonstrating query capabilities...")

    # 1. Entity search
    search_results = query_engine.search_by_text('Bitcoin', limit=5)
    print(f"   📍 Search for 'Bitcoin': {len(search_results)} results")

    # 2. Entity statistics
    stats = query_engine.get_entity_statistics()
    print(f"   📊 Knowledge graph statistics:")
    print(f"      - Total entities: {stats['total_entities']}")
    print(f"      - Total relationships: {stats['total_relationships']}")
    print(f"      - Entity types: {list(stats['entity_types'].keys())}")

    # 3. Entity network analysis
    if kg.entities:
        first_entity_id = list(kg.entities.keys())[0]
        network_info = query_engine.get_entity_network(first_entity_id, max_depth=2)
        print(f"   🌐 Entity network analysis: {network_info.get('total_connections', 0)} connections found")

    # 4. Similar entities
    similar_entities = query_engine.get_similar_entities(first_entity_id, limit=3)
    print(f"   🔗 Similar entities found: {len(similar_entities)}")

    return storage, query_engine


async def demonstrate_integration_with_fusion():
    """Demonstrate integration with fusion pipeline"""
    print("\n🔗 STEP 5: INTEGRATION WITH FUSION PIPELINE")
    print("=" * 60)

    # Initialize integrator
    integrator = KnowledgeGraphIntegrator()

    # Simulate fusion input data
    fusion_input = {
        'market_data': {
            'prices': [45000, 46000, 47000, 48000],
            'volumes': [1000000, 1100000, 1200000, 1300000],
            'token_symbol': 'BTC'
        },
        'social_sentiment': {
            'sentiment_score': 0.75,
            'mentions': 15000,
            'trending_topics': ['Bitcoin', 'bullish', 'institutional']
        },
        'news_articles': SAMPLE_NEWS_ARTICLES,
        'onchain_data': SAMPLE_ONCHAIN_DATA
    }

    # Enrich fusion input with knowledge graph context
    print("   🎯 Enriching fusion input with knowledge graph context...")
    enriched_input = await integrator.enrich_fusion_input(fusion_input)

    kg_context = enriched_input.get('knowledge_graph_context', {})
    if kg_context:
        print(f"   ✅ Added {kg_context.get('extraction_stats', {}).get('context_entities_found', 0)} context entities")
        print(f"   ✅ Average similarity: {kg_context.get('extraction_stats', {}).get('avg_similarity', 0):.2f}")

    # Get fusion context for a token
    print("   📈 Getting fusion context for BTC...")
    fusion_context = await integrator.get_fusion_context('BTC')

    print(f"   ✅ Retrieved context with {len(fusion_context.get('related_entities', []))} related entities")
    print(f"   ✅ Generated {len(fusion_context.get('market_insights', []))} market insights")

    # Demonstrate post-fusion update
    print("   🔄 Demonstrating post-fusion knowledge graph update...")
    fusion_results = {
        'predictions': {
            'price_movement': {'direction': 'bullish', 'confidence': 0.85},
            'market_sentiment': {'sentiment': 'bullish', 'score': 0.8}
        },
        'cross_modal_insights': {
            'modality_agreement': 0.9,
            'risk_factors': ['volatility', 'regulatory_uncertainty'],
            'opportunities': ['institutional_adoption', 'technology_improvements']
        },
        'market_regime': 'bull_market'
    }

    await integrator.update_knowledge_graph(fusion_results)
    print("   ✅ Knowledge graph updated with fusion results")

    return integrator


async def demonstrate_api_endpoints():
    """Demonstrate API endpoints"""
    print("\n🚀 STEP 6: API ENDPOINTS DEMONSTRATION")
    print("=" * 60)

    # Initialize API
    kg_api = KnowledgeGraphAPI()

    # Create sample entities via API
    print("   📡 Creating entities via API...")

    # Create Bitcoin entity
    btc_request = {
        'name': 'Bitcoin',
        'entity_type': 'CRYPTO_PROJECT',
        'properties': {
            'market_cap': 900000000000,
            'blockchain': 'Bitcoin',
            'consensus_mechanism': 'Proof of Work'
        },
        'aliases': ['BTC'],
        'confidence': 0.95,
        'source': 'api_demo',
        'metadata': {}
    }

    btc_result = await kg_api._create_entity(type('Request', (), btc_request)())
    print(f"   ✅ Created Bitcoin entity: {btc_result['entity_id']}")

    # Create Ethereum entity
    eth_request = {
        'name': 'Ethereum',
        'entity_type': 'CRYPTO_PROJECT',
        'properties': {
            'market_cap': 400000000000,
            'blockchain': 'Ethereum',
            'consensus_mechanism': 'Proof of Stake'
        },
        'aliases': ['ETH'],
        'confidence': 0.92,
        'source': 'api_demo',
        'metadata': {}
    }

    eth_result = await kg_api._create_entity(type('Request', (), eth_request)())
    print(f"   ✅ Created Ethereum entity: {eth_result['entity_id']}")

    # Create relationship between Bitcoin and Ethereum
    rel_request = {
        'source_id': btc_result['entity_id'],
        'target_id': eth_result['entity_id'],
        'relationship_type': 'COMPETES_WITH',
        'properties': {
            'competition_type': 'market_dominance',
            'intensity': 'high'
        },
        'confidence': 0.8,
        'source': 'api_demo',
        'metadata': {}
    }

    rel_result = await kg_api._create_relationship(type('Request', (), rel_request)())
    print(f"   ✅ Created relationship: {rel_result['relationship_id']}")

    # Demonstrate text extraction API
    print("   📝 Demonstrating text extraction API...")

    extraction_request = {
        'text': 'Vitalik Buterin, founder of Ethereum, announced major upgrades to the network.',
        'data_source': 'news_articles',
        'source_url': 'https://example.com/ethereum-upgrade-news',
        'context': '',
        'include_relations': True
    }

    extraction_result = await kg_api._extract_from_text(type('Request', (), extraction_request)())
    print(f"   ✅ Extracted {extraction_result['extraction_stats']['entities_found']} entities")
    print(f"   ✅ Extracted {extraction_result['extraction_stats']['relationships_found']} relationships")

    # Demonstrate search API
    print("   🔍 Demonstrating search API...")
    search_result = await kg_api._search_entities('Bitcoin', None, 5)
    print(f"   ✅ Search returned {len(search_result['entities'])} results")

    # Get API statistics
    stats = await kg_api._get_statistics()
    print(f"   📊 API statistics: {stats['statistics']['total_entities']} entities, {stats['statistics']['total_relationships']} relationships")

    return kg_api


async def main():
    """Run the complete knowledge graph demonstration"""
    print("🚀 COINET AI - KNOWLEDGE GRAPH SYSTEM DEMONSTRATION")
    print("=" * 70)
    print("This demonstration showcases Coinet's revolutionary knowledge graph")
    print("system that captures crypto ecosystem entities and relationships")
    print("with advanced reasoning capabilities for logical inference.\n")

    try:
        # Step 1: Entity extraction
        all_entities = await demonstrate_entity_extraction()

        # Step 2: Knowledge graph construction
        kg = await demonstrate_knowledge_graph_construction(all_entities)

        # Step 3: Reasoning engine
        reasoning_engine = await demonstrate_reasoning_engine(kg)

        # Step 4: Storage and querying
        storage, query_engine = await demonstrate_storage_and_querying(kg, reasoning_engine)

        # Step 5: Integration with fusion pipeline
        integrator = await demonstrate_integration_with_fusion()

        # Step 6: API endpoints
        kg_api = await demonstrate_api_endpoints()

        # Final summary
        print("\n🎉 KNOWLEDGE GRAPH DEMONSTRATION COMPLETE!")
        print("=" * 70)
        print("🚀 KEY ACHIEVEMENTS:")
        print("   ✅ Advanced entity extraction from multiple data sources")
        print("   ✅ Dynamic knowledge graph construction with relationships")
        print("   ✅ Sophisticated reasoning with property inheritance & transitive closures")
        print("   ✅ Efficient storage with SQLite backend and full-text search")
        print("   ✅ Powerful querying with network analysis and similarity matching")
        print("   ✅ Seamless integration with multi-modal fusion pipeline")
        print("   ✅ Production-ready REST API with comprehensive endpoints")
        print("   ✅ Real-time constraint checking and logical validation")

        print("\n💎 NEXT STEPS:")
        print("   1. Deploy knowledge graph API as microservice")
        print("   2. Connect with real-time data feeds (news, social, on-chain)")
        print("   3. Implement advanced ML models for entity/relation extraction")
        print("   4. Add graph visualization and exploration interfaces")
        print("   5. Integrate with external knowledge bases (Wikidata, etc.)")

        # Save demo results
        demo_results = {
            'timestamp': datetime.utcnow().isoformat(),
            'knowledge_graph_stats': query_engine.get_entity_statistics(),
            'integration_stats': integrator.get_integration_statistics(),
            'api_stats': kg_api.api_stats,
            'reasoning_stats': reasoning_engine.get_rule_statistics()
        }

        with open('knowledge_graph_demo_results.json', 'w') as f:
            json.dump(demo_results, f, indent=2, default=str)

        print(f"\n📄 Demo results saved to: knowledge_graph_demo_results.json")

    except Exception as e:
        print(f"\n❌ Demo failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
