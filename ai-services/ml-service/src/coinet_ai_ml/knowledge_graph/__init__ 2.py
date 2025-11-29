"""
Coinet AI Knowledge Graph - Dynamic Reasoning Engine

A revolutionary knowledge graph system that captures crypto ecosystem entities
and relationships, with advanced reasoning capabilities for logical inference.
"""

from coinet_ai_ml.knowledge_graph.core import KnowledgeGraph, Entity, Relationship, Property
from coinet_ai_ml.knowledge_graph.extraction import EntityExtractor, RelationExtractor, DataSourceIntegrator
from coinet_ai_ml.knowledge_graph.reasoning import ReasoningEngine, PropertyInheritance, TransitiveClosure, ConstraintChecker
from coinet_ai_ml.knowledge_graph.storage import GraphStorage, QueryEngine
from coinet_ai_ml.knowledge_graph.api import KnowledgeGraphAPI

__version__ = "1.0.0"
__all__ = [
    'KnowledgeGraph',
    'Entity',
    'Relationship',
    'Property',
    'EntityExtractor',
    'RelationExtractor',
    'DataSourceIntegrator',
    'ReasoningEngine',
    'PropertyInheritance',
    'TransitiveClosure',
    'ConstraintChecker',
    'GraphStorage',
    'QueryEngine',
    'KnowledgeGraphAPI'
]
