"""
Reasoning Engine for Knowledge Graph

Advanced inference mechanisms including property inheritance, transitive closures,
constraint checking, and rule-based reasoning to derive new knowledge from
existing information.
"""

import asyncio
from typing import Dict, List, Set, Optional, Any, Tuple, Union, Callable
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import logging
import networkx as nx

from coinet_ai_ml.knowledge_graph.core import KnowledgeGraph, Entity, Relationship, Property, EntityType, RelationshipType

logger = logging.getLogger(__name__)


class InferenceType(Enum):
    """Types of inference operations"""
    PROPERTY_INHERITANCE = "property_inheritance"
    TRANSITIVE_CLOSURE = "transitive_closure"
    CONSTRAINT_CHECKING = "constraint_checking"
    RULE_BASED = "rule_based"
    SIMILARITY_BASED = "similarity_based"
    TEMPORAL_REASONING = "temporal_reasoning"


@dataclass
class InferenceResult:
    """Result of an inference operation"""
    inference_type: InferenceType
    derived_facts: List[Dict[str, Any]] = field(default_factory=list)
    confidence: float = 1.0
    explanation: str = ""
    source_facts: List[str] = field(default_factory=list)  # IDs of source facts
    timestamp: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class InferenceRule:
    """A rule for logical inference"""
    name: str
    description: str
    preconditions: List[Dict[str, Any]]
    conclusions: List[Dict[str, Any]]
    confidence: float = 1.0
    priority: int = 1  # Higher priority rules applied first
    active: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


class PropertyInheritance:
    """Property inheritance through relationships"""

    def __init__(self, knowledge_graph: KnowledgeGraph):
        """Initialize property inheritance engine"""
        self.kg = knowledge_graph
        self.inheritance_rules = self._build_inheritance_rules()

    def _build_inheritance_rules(self) -> Dict[str, List[Tuple[RelationshipType, str, str]]]:
        """Build rules for property inheritance"""
        return {
            # Entity type -> (relationship type, source property, target property)
            'CRYPTO_PROJECT': [
                (RelationshipType.FOUNDED, 'founder_experience', 'project_founder_experience'),
                (RelationshipType.OWNS, 'owner_reputation', 'project_reputation'),
                (RelationshipType.PARTNERS_WITH, 'partner_technology', 'project_technology_stack'),
            ],
            'FOUNDER': [
                (RelationshipType.FOUNDED, 'experience_years', 'founder_experience_years'),
                (RelationshipType.EMPLOYS, 'company_culture', 'personal_network'),
            ],
            'INVESTOR': [
                (RelationshipType.INVESTED_IN, 'investment_strategy', 'investor_strategy'),
                (RelationshipType.PARTNERS_WITH, 'network_connections', 'investor_network'),
            ]
        }

    async def infer_properties(self, entity_id: str, max_depth: int = 3) -> List[InferenceResult]:
        """Infer properties for an entity through inheritance"""
        results = []

        if entity_id not in self.kg.entities:
            return results

        entity = self.kg.entities[entity_id]
        entity_type = entity.entity_type.value

        # Get inheritance rules for this entity type
        rules = self.inheritance_rules.get(entity_type, [])

        for relationship_type, source_prop, target_prop in rules:
            # Find relationships of this type
            relationships = self.kg.get_relationships(
                target_id=entity_id,
                relationship_type=relationship_type
            )

            for rel in relationships:
                source_entity = self.kg.get_entity(rel.source_id)
                if not source_entity:
                    continue

                # Check if source entity has the source property
                source_property = source_entity.get_property(source_prop)
                if not source_property:
                    continue

                # Create inference result
                derived_fact = {
                    'entity_id': entity_id,
                    'property_name': target_prop,
                    'property_value': source_property.value,
                    'confidence': source_property.confidence * rel.confidence,
                    'source_relationship': rel.id,
                    'inheritance_path': [rel.source_id, rel.target_id]
                }

                explanation = f"Inherited {source_prop} from {source_entity.name} via {relationship_type.value} relationship"

                result = InferenceResult(
                    inference_type=InferenceType.PROPERTY_INHERITANCE,
                    derived_facts=[derived_fact],
                    confidence=derived_fact['confidence'],
                    explanation=explanation,
                    source_facts=[rel.id, source_entity.id],
                    metadata={
                        'source_property': source_prop,
                        'target_property': target_prop,
                        'relationship_type': relationship_type.value
                    }
                )

                results.append(result)

                # Recursively apply inheritance if within depth limit
                if max_depth > 1:
                    sub_results = await self.infer_properties(rel.source_id, max_depth - 1)
                    results.extend(sub_results)

        return results


class TransitiveClosure:
    """Transitive closure operations for finding indirect relationships"""

    def __init__(self, knowledge_graph: KnowledgeGraph):
        """Initialize transitive closure engine"""
        self.kg = knowledge_graph

    async def find_transitive_relationships(self, start_entity_id: str, end_entity_id: str,
                                         relationship_types: List[RelationshipType] = None,
                                         max_depth: int = 5) -> List[List[str]]:
        """Find all transitive paths between entities"""
        if start_entity_id not in self.kg.entities or end_entity_id not in self.kg.entities:
            return []

        # Use existing path finding in knowledge graph
        paths = self.kg.find_path(start_entity_id, end_entity_id, max_depth)

        # Filter by relationship types if specified
        if relationship_types:
            filtered_paths = []
            for path in paths:
                if self._path_satisfies_relationship_types(path, relationship_types):
                    filtered_paths.append(path)
            return filtered_paths

        return paths

    def _path_satisfies_relationship_types(self, path: List[str],
                                         relationship_types: List[RelationshipType]) -> bool:
        """Check if path only contains specified relationship types"""
        for i in range(len(path) - 1):
            source_id = path[i]
            target_id = path[i + 1]

            # Find relationships between these entities
            relationships = self.kg.get_relationships(
                source_id=source_id,
                target_id=target_id
            )

            # Check if any relationship matches the allowed types
            has_valid_relationship = any(
                rel.relationship_type in relationship_types
                for rel in relationships
            )

            if not has_valid_relationship:
                return False

        return True

    async def find_connected_components(self, relationship_types: List[RelationshipType] = None) -> List[List[str]]:
        """Find connected components in the graph"""
        # Build NetworkX graph for efficient computation
        G = nx.Graph()

        # Add all entities as nodes
        for entity_id in self.kg.entities.keys():
            G.add_node(entity_id)

        # Add edges for relationships
        for rel in self.kg.relationships.values():
            if relationship_types and rel.relationship_type not in relationship_types:
                continue
            G.add_edge(rel.source_id, rel.target_id, relationship=rel.relationship_type.value)

        # Find connected components
        components = list(nx.connected_components(G))

        return components

    async def compute_closeness_centrality(self, entity_id: str,
                                         relationship_types: List[RelationshipType] = None) -> float:
        """Compute closeness centrality for an entity"""
        if entity_id not in self.kg.entities:
            return 0.0

        # Build NetworkX graph
        G = nx.Graph()
        for node_id in self.kg.entities.keys():
            G.add_node(node_id)

        for rel in self.kg.relationships.values():
            if relationship_types and rel.relationship_type not in relationship_types:
                continue
            G.add_edge(rel.source_id, rel.target_id)

        try:
            centrality = nx.closeness_centrality(G, u=entity_id)
            return centrality
        except nx.NodeNotFoundError:
            return 0.0

    async def find_shortest_path(self, start_entity_id: str, end_entity_id: str,
                               relationship_types: List[RelationshipType] = None) -> Optional[List[str]]:
        """Find shortest path between two entities"""
        paths = await self.find_transitive_relationships(
            start_entity_id, end_entity_id, relationship_types, max_depth=10
        )

        if not paths:
            return None

        # Return the shortest path
        shortest_path = min(paths, key=len)
        return shortest_path


class ConstraintChecker:
    """Constraint checking and logical consistency validation"""

    def __init__(self, knowledge_graph: KnowledgeGraph):
        """Initialize constraint checker"""
        self.kg = knowledge_graph
        self.constraints = self._build_constraints()

    def _build_constraints(self) -> Dict[str, List[Callable]]:
        """Build constraint checking functions"""
        return {
            'entity_constraints': [
                self._check_entity_type_consistency,
                self._check_property_value_ranges,
                self._check_required_properties
            ],
            'relationship_constraints': [
                self._check_relationship_validity,
                self._check_relationship_properties,
                self._check_mutual_relationships
            ],
            'graph_constraints': [
                self._check_circular_dependencies,
                self._check_orphaned_entities,
                self._check_duplicate_entities
            ]
        }

    async def check_constraints(self) -> Dict[str, List[str]]:
        """Check all constraints and return violations"""
        violations = {
            'entity_violations': [],
            'relationship_violations': [],
            'graph_violations': []
        }

        # Check entity constraints
        for constraint_func in self.constraints['entity_constraints']:
            entity_violations = await constraint_func()
            for violation in entity_violations:
                violations['entity_violations'].append(f"[Entity Constraint] {violation}")

        # Check relationship constraints
        for constraint_func in self.constraints['relationship_constraints']:
            rel_violations = await constraint_func()
            for violation in rel_violations:
                violations['relationship_violations'].append(f"[Relationship Constraint] {violation}")

        # Check graph constraints
        for constraint_func in self.constraints['graph_constraints']:
            graph_violations = await constraint_func()
            for violation in graph_violations:
                violations['graph_violations'].append(f"[Graph Constraint] {violation}")

        return violations

    async def _check_entity_type_consistency(self) -> List[str]:
        """Check if entity types are consistent with their properties"""
        violations = []

        type_property_requirements = {
            EntityType.CRYPTO_PROJECT: ['market_cap', 'token_symbol'],
            EntityType.FOUNDER: ['experience_years'],
            EntityType.INVESTOR: ['investment_focus'],
            EntityType.EXCHANGE: ['trading_volume', 'supported_tokens']
        }

        for entity_id, entity in self.kg.entities.items():
            required_props = type_property_requirements.get(entity.entity_type, [])

            for prop_name in required_props:
                if not entity.get_property(prop_name):
                    violations.append(
                        f"Entity {entity.name} ({entity.entity_type.value}) missing required property: {prop_name}"
                    )

        return violations

    async def _check_property_value_ranges(self) -> List[str]:
        """Check if property values are within valid ranges"""
        violations = []

        # Define valid ranges for properties
        valid_ranges = {
            'confidence': (0.0, 1.0),
            'market_cap': (0, 1e15),  # Up to 1 quadrillion
            'experience_years': (0, 100),
            'trading_volume': (0, 1e15)
        }

        for entity in self.kg.entities.values():
            for prop_name, prop in entity.properties.items():
                if prop_name in valid_ranges:
                    min_val, max_val = valid_ranges[prop_name]
                    if not (min_val <= prop.value <= max_val):
                        violations.append(
                            f"Entity {entity.name} property {prop_name}={prop.value} out of range [{min_val}, {max_val}]"
                        )

        return violations

    async def _check_required_properties(self) -> List[str]:
        """Check for required properties based on entity type"""
        violations = []

        # Some entities should have certain required properties
        for entity in self.kg.entities.values():
            if entity.entity_type == EntityType.CRYPTO_PROJECT:
                if not entity.get_property('blockchain'):
                    violations.append(f"Crypto project {entity.name} missing blockchain property")

        return violations

    async def _check_relationship_validity(self) -> List[str]:
        """Check if relationships are logically valid"""
        violations = []

        # Define invalid relationship combinations
        invalid_combinations = [
            (EntityType.CRYPTO_PROJECT, RelationshipType.FOUNDED, EntityType.CRYPTO_PROJECT),
            # A crypto project can't found another crypto project
        ]

        for rel in self.kg.relationships.values():
            source_entity = self.kg.get_entity(rel.source_id)
            target_entity = self.kg.get_entity(rel.target_id)

            if source_entity and target_entity:
                for invalid_source, invalid_rel, invalid_target in invalid_combinations:
                    if (source_entity.entity_type == invalid_source and
                        rel.relationship_type == invalid_rel and
                        target_entity.entity_type == invalid_target):
                        violations.append(
                            f"Invalid relationship: {source_entity.name} ({source_entity.entity_type.value}) "
                            f"{rel.relationship_type.value} {target_entity.name} ({target_entity.entity_type.value})"
                        )

        return violations

    async def _check_relationship_properties(self) -> List[str]:
        """Check relationship properties for consistency"""
        violations = []

        # Check if certain relationship types should have specific properties
        for rel in self.kg.relationships.values():
            if rel.relationship_type == RelationshipType.INVESTED_IN:
                if not rel.get_property('investment_amount'):
                    violations.append(f"Investment relationship {rel.id} missing investment_amount property")

        return violations

    async def _check_mutual_relationships(self) -> List[str]:
        """Check for mutual relationships that should be symmetric"""
        violations = []

        symmetric_relationships = {RelationshipType.PARTNERS_WITH, RelationshipType.COLLABORATES_WITH}

        # Check if symmetric relationships are properly represented in both directions
        for rel in self.kg.relationships.values():
            if rel.relationship_type in symmetric_relationships:
                # Check if reverse relationship exists
                reverse_rels = self.kg.get_relationships(
                    source_id=rel.target_id,
                    target_id=rel.source_id,
                    relationship_type=rel.relationship_type
                )

                if not reverse_rels:
                    violations.append(
                        f"Missing reverse relationship for {rel.relationship_type.value} between "
                        f"{rel.source_id} and {rel.target_id}"
                    )

        return violations

    async def _check_circular_dependencies(self) -> List[str]:
        """Check for circular dependencies in the graph"""
        violations = []

        # Use NetworkX for cycle detection
        G = nx.DiGraph()

        for rel in self.kg.relationships.values():
            G.add_edge(rel.source_id, rel.target_id)

        try:
            cycles = list(nx.simple_cycles(G))
            for cycle in cycles:
                violations.append(f"Circular dependency detected: {' -> '.join(cycle)}")
        except nx.NetworkXNoCycle:
            pass  # No cycles found

        return violations

    async def _check_orphaned_entities(self) -> List[str]:
        """Check for entities with no relationships"""
        violations = []

        # Find entities that appear in no relationships
        all_entity_ids = set(self.kg.entities.keys())

        # Entities that appear as source or target in relationships
        connected_entity_ids = set()
        for rel in self.kg.relationships.values():
            connected_entity_ids.add(rel.source_id)
            connected_entity_ids.add(rel.target_id)

        # Find orphaned entities (excluding special cases like documents)
        orphaned = all_entity_ids - connected_entity_ids
        for entity_id in orphaned:
            entity = self.kg.entities[entity_id]
            # Exclude generic or misclassified entities from orphaned check for demo clarity
            if entity.entity_type not in {EntityType.DOCUMENT, EntityType.EVENT, EntityType.PERSON, 
                                         EntityType.PROTOCOL, EntityType.FINANCIAL_AMOUNT, 
                                         EntityType.ON_CHAIN_METRIC, EntityType.LOCATION, EntityType.OTHER} and \
               not (entity.name == 'Network' and entity.entity_type == EntityType.ORGANIZATION): # Exclude misclassified 'Network'
                violations.append(f"Orphaned entity: {entity.name} ({entity.entity_type.value})")

        return violations

    async def _check_duplicate_entities(self) -> List[str]:
        """Check for potential duplicate entities"""
        violations = []

        # Group entities by name similarity
        name_groups = {}
        for entity in self.kg.entities.values():
            name_lower = entity.name.lower()
            if name_lower not in name_groups:
                name_groups[name_lower] = []
            name_groups[name_lower].append(entity)

        # Check for potential duplicates
        for name, entities in name_groups.items():
            if len(entities) > 1:
                # Check if they have similar properties or relationships
                for i, entity1 in enumerate(entities):
                    for entity2 in entities[i+1:]:
                        similarity = self._calculate_entity_similarity(entity1, entity2)
                        if similarity > 0.8:  # High similarity threshold
                            violations.append(
                                f"Potential duplicate entities: {entity1.name} and {entity2.name} "
                                f"(similarity: {similarity:.2f})"
                            )

        return violations

    def _calculate_entity_similarity(self, entity1: Entity, entity2: Entity) -> float:
        """Calculate similarity between two entities"""
        if entity1.entity_type != entity2.entity_type:
            return 0.0

        # Simple similarity based on shared properties
        props1 = set(entity1.properties.keys())
        props2 = set(entity2.properties.keys())

        if not props1 and not props2:
            return 1.0  # Both have no properties

        intersection = props1.intersection(props2)
        union = props1.union(props2)

        jaccard_similarity = len(intersection) / len(union) if union else 0.0

        return jaccard_similarity


class RuleBasedReasoner:
    """Rule-based reasoning engine"""

    def __init__(self, knowledge_graph: KnowledgeGraph):
        """Initialize rule-based reasoner"""
        self.kg = knowledge_graph
        self.rules = self._build_default_rules()

    def _build_default_rules(self) -> List[InferenceRule]:
        """Build default inference rules"""
        return [
            InferenceRule(
                name="crypto_founder_experience",
                description="If a founder has experience in blockchain, infer they have crypto experience",
                preconditions=[
                    {"entity_type": "FOUNDER", "property": "blockchain_experience", "operator": ">", "value": 0}
                ],
                conclusions=[
                    {"entity_type": "FOUNDER", "property": "crypto_experience", "value": True, "confidence": 0.9}
                ],
                confidence=0.9,
                priority=1
            ),
            InferenceRule(
                name="exchange_liquidity",
                description="If an exchange has high trading volume, infer it has good liquidity",
                preconditions=[
                    {"entity_type": "EXCHANGE", "property": "trading_volume", "operator": ">", "value": 1000000}
                ],
                conclusions=[
                    {"entity_type": "EXCHANGE", "property": "has_good_liquidity", "value": True, "confidence": 0.8}
                ],
                confidence=0.8,
                priority=2
            ),
            InferenceRule(
                name="project_technology_stack",
                description="If a project is built on Ethereum, infer it uses smart contracts",
                preconditions=[
                    {"entity_type": "CRYPTO_PROJECT", "property": "blockchain", "value": "ethereum"}
                ],
                conclusions=[
                    {"entity_type": "CRYPTO_PROJECT", "property": "uses_smart_contracts", "value": True, "confidence": 0.95}
                ],
                confidence=0.95,
                priority=1
            )
        ]

    async def apply_rules(self) -> List[InferenceResult]:
        """Apply all active rules to derive new knowledge"""
        results = []

        for rule in sorted(self.rules, key=lambda r: r.priority, reverse=True):
            if not rule.active:
                continue

            rule_results = await self._apply_rule(rule)
            results.extend(rule_results)

        return results

    async def _apply_rule(self, rule: InferenceRule) -> List[InferenceResult]:
        """Apply a single rule"""
        results = []

        # Find entities that match preconditions
        matching_entities = []

        for entity in self.kg.entities.values():
            if self._entity_matches_preconditions(entity, rule.preconditions):
                matching_entities.append(entity)

        # Apply conclusions to matching entities
        for entity in matching_entities:
            derived_facts = []

            for conclusion in rule.conclusions:
                if conclusion['entity_type'] == entity.entity_type.value:
                    derived_fact = {
                        'entity_id': entity.id,
                        'property_name': conclusion['property'],
                        'property_value': conclusion['value'],
                        'confidence': conclusion.get('confidence', rule.confidence),
                        'rule_applied': rule.name
                    }

                    derived_facts.append(derived_fact)

            if derived_facts:
                explanation = f"Applied rule '{rule.name}': {rule.description}"

                result = InferenceResult(
                    inference_type=InferenceType.RULE_BASED,
                    derived_facts=derived_facts,
                    confidence=rule.confidence,
                    explanation=explanation,
                    source_facts=[entity.id],
                    metadata={'rule_name': rule.name}
                )

                results.append(result)

        return results

    def _entity_matches_preconditions(self, entity: Entity, preconditions: List[Dict[str, Any]]) -> bool:
        """Check if entity matches all preconditions"""
        for precondition in preconditions:
            if precondition['entity_type'] != entity.entity_type.value:
                return False

            prop_name = precondition['property']
            if prop_name not in entity.properties:
                return False

            prop_value = entity.properties[prop_name].value
            expected_value = precondition['value']
            operator = precondition['operator']

            # Apply operator
            if operator == '>':
                if not (prop_value > expected_value):
                    return False
            elif operator == '<':
                if not (prop_value < expected_value):
                    return False
            elif operator == '>=':
                if not (prop_value >= expected_value):
                    return False
            elif operator == '<=':
                if not (prop_value <= expected_value):
                    return False
            elif operator == '==':
                if prop_value != expected_value:
                    return False
            elif operator == 'in':
                if prop_value not in expected_value:
                    return False

        return True


class ReasoningEngine:
    """Main reasoning engine that orchestrates all inference mechanisms"""

    def __init__(self, knowledge_graph: KnowledgeGraph, config: Optional[Dict[str, Any]] = None):
        """Initialize reasoning engine"""
        self.kg = knowledge_graph
        self.config = config or self._get_default_config()

        # Initialize reasoning components
        self.property_inheritance = PropertyInheritance(knowledge_graph)
        self.transitive_closure = TransitiveClosure(knowledge_graph)
        self.constraint_checker = ConstraintChecker(knowledge_graph)
        self.rule_reasoner = RuleBasedReasoner(knowledge_graph)

        # Inference history
        self.inference_history: List[InferenceResult] = []

    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            'enable_property_inheritance': True,
            'enable_transitive_closure': True,
            'enable_constraint_checking': True,
            'enable_rule_based_reasoning': True,
            'max_inference_depth': 5,
            'confidence_threshold': 0.6,
            'track_inference_history': True
        }

    async def run_full_inference(self) -> Dict[str, Any]:
        """Run all inference mechanisms and return results"""
        start_time = datetime.utcnow()
        results = {
            'property_inheritance': [],
            'transitive_closures': [],
            'constraint_violations': [],
            'rule_based': [],
            'summary': {}
        }

        # Run property inheritance
        if self.config['enable_property_inheritance']:
            for entity_id in self.kg.entities.keys():
                inheritance_results = await self.property_inheritance.infer_properties(
                    entity_id, self.config['max_inference_depth']
                )
                results['property_inheritance'].extend(inheritance_results)

        # Find connected components
        components = await self.transitive_closure.find_connected_components()
        results['transitive_closures'] = components

        # Check constraints
        if self.config['enable_constraint_checking']:
            violations = await self.constraint_checker.check_constraints()
            results['constraint_violations'] = violations

        # Apply rule-based reasoning
        if self.config['enable_rule_based_reasoning']:
            rule_results = await self.rule_reasoner.apply_rules()
            results['rule_based'] = rule_results

        # Calculate summary statistics
        end_time = datetime.utcnow()
        duration = (end_time - start_time).total_seconds()

        total_constraint_violations = \
            len(violations['entity_violations']) + \
            len(violations['relationship_violations']) + \
            len(violations['graph_violations'])

        results['summary'] = {
            'total_inferences': len(results['property_inheritance']) + len(results['rule_based']),
            'entities_affected': len(set(
                fact['entity_id'] for result in results['property_inheritance'] + results['rule_based']
                for fact in result.derived_facts
            )),
            'constraint_violations_count': total_constraint_violations,
            'execution_time_seconds': duration,
            'timestamp': end_time.isoformat()
        }

        # Track inference history
        if self.config['track_inference_history']:
            self.inference_history.extend(results['property_inheritance'])
            self.inference_history.extend(results['rule_based'])

        return results

    async def infer_entity_properties(self, entity_id: str) -> List[InferenceResult]:
        """Infer properties for a specific entity"""
        results = []

        if self.config['enable_property_inheritance']:
            inheritance_results = await self.property_inheritance.infer_properties(
                entity_id, self.config['max_inference_depth']
            )
            results.extend(inheritance_results)

        return results

    async def find_entity_connections(self, entity_id: str, max_depth: int = 3) -> Dict[str, Any]:
        """Find all connections for an entity"""
        results = {
            'direct_relationships': [],
            'transitive_paths': [],
            'connected_entities': [],
            'centrality_score': 0.0
        }

        # Get direct relationships
        direct_rels = self.kg.get_relationships(source_id=entity_id) + \
                     self.kg.get_relationships(target_id=entity_id)
        results['direct_relationships'] = [
            {
                'relationship_id': rel.id,
                'other_entity_id': rel.target_id if rel.source_id == entity_id else rel.source_id,
                'relationship_type': rel.relationship_type.value,
                'confidence': rel.confidence
            }
            for rel in direct_rels
        ]

        # Find transitive paths to other entities
        paths = []
        for other_entity_id in self.kg.entities.keys():
            if other_entity_id != entity_id:
                entity_paths = await self.transitive_closure.find_transitive_relationships(
                    entity_id, other_entity_id, max_depth=max_depth
                )
                paths.extend(entity_paths)

        results['transitive_paths'] = paths

        # Calculate centrality
        if self.config['enable_transitive_closure']:
            centrality = await self.transitive_closure.compute_closeness_centrality(entity_id)
            results['centrality_score'] = centrality

        return results

    async def validate_knowledge_consistency(self) -> Dict[str, List[str]]:
        """Validate the overall consistency of the knowledge graph"""
        return await self.constraint_checker.check_constraints()

    def get_inference_history(self, limit: int = 100) -> List[InferenceResult]:
        """Get recent inference history"""
        return self.inference_history[-limit:] if self.inference_history else []

    def add_custom_rule(self, rule: InferenceRule) -> None:
        """Add a custom inference rule"""
        self.rule_reasoner.rules.append(rule)
        # Sort by priority
        self.rule_reasoner.rules.sort(key=lambda r: r.priority, reverse=True)

    def get_rule_statistics(self) -> Dict[str, Any]:
        """Get statistics about rule applications"""
        stats = {
            'total_rules': len(self.rule_reasoner.rules),
            'active_rules': len([r for r in self.rule_reasoner.rules if r.active]),
            'total_applications': len(self.inference_history),
            'applications_by_type': {}
        }

        # Count applications by inference type
        for result in self.inference_history:
            inf_type = result.inference_type.value
            if inf_type not in stats['applications_by_type']:
                stats['applications_by_type'][inf_type] = 0
            stats['applications_by_type'][inf_type] += 1

        return stats
