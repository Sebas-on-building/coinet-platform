"""
⛓️ BLOCKCHAIN-NATIVE KNOWLEDGE GRAPHS - DECENTRALIZED KNOWLEDGE CONSENSUS

Revolutionary knowledge representation system that stores linguistic and semantic
knowledge directly on blockchain with decentralized consensus validation.
"""

import asyncio
import logging
from typing import Dict, List, Tuple, Any, Optional, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import numpy as np
import hashlib
import json
import base64
from collections import defaultdict

@dataclass
class KnowledgeNode:
    """Blockchain-native knowledge node with consensus validation"""
    node_id: str  # Unique hash-based identifier
    content: str  # Knowledge content (text, embeddings, etc.)
    node_type: str  # 'concept', 'entity', 'relationship', 'pattern'
    confidence: float  # Consensus confidence in this knowledge
    validators: List[str]  # List of validator addresses that confirmed this node
    validation_count: int  # Number of validations received
    creation_timestamp: datetime
    last_updated: datetime
    metadata: Dict[str, Any]  # Additional node-specific data

@dataclass
class KnowledgeEdge:
    """Relationship between knowledge nodes on blockchain"""
    edge_id: str  # Unique edge identifier
    source_node: str  # Source node ID
    target_node: str  # Target node ID
    relationship_type: str  # 'is_a', 'part_of', 'causes', 'influences', etc.
    strength: float  # Relationship strength (0-1)
    direction: str  # 'unidirectional', 'bidirectional'
    validators: List[str]  # Validators who confirmed this relationship
    validation_count: int
    creation_timestamp: datetime
    blockchain_proof: str  # Cryptographic proof of edge validity

@dataclass
class ConsensusValidation:
    """Blockchain consensus validation for knowledge"""
    validation_id: str
    node_id: str  # Which node/edge this validates
    validator_address: str  # Blockchain address of validator
    validation_score: float  # Validator's confidence score
    validation_timestamp: datetime
    proof_of_work: str  # Cryptographic proof of validation work
    stake_amount: float  # Amount staked on this validation

@dataclass
class KnowledgeGraphSnapshot:
    """Snapshot of knowledge graph state for blockchain storage"""
    snapshot_id: str  # Hash of snapshot content
    nodes: List[KnowledgeNode]
    edges: List[KnowledgeEdge]
    consensus_state: Dict[str, ConsensusValidation]
    snapshot_timestamp: datetime
    blockchain_height: int  # Block height when snapshot was taken
    merkle_root: str  # Merkle root of all knowledge in snapshot

class BlockchainKnowledgeGraph:
    """
    ⛓️ REVOLUTIONARY BLOCKCHAIN-NATIVE KNOWLEDGE GRAPH

    Stores linguistic and semantic knowledge directly on blockchain with
    decentralized consensus validation and cryptographic verification.
    """

    def __init__(self, config: Optional[Dict] = None):
        self.config = config or self._get_default_config()

        # Core blockchain integration
        self.blockchain_adapter = BlockchainAdapter(self.config.get('blockchain', {}))
        self.consensus_engine = ConsensusEngine(self.config.get('consensus', {}))
        self.cryptographic_prover = CryptographicProver(self.config.get('crypto', {}))

        # Knowledge storage
        self.nodes: Dict[str, KnowledgeNode] = {}
        self.edges: Dict[str, KnowledgeEdge] = {}
        self.consensus_validations: Dict[str, List[ConsensusValidation]] = defaultdict(list)

        # Local knowledge cache
        self.knowledge_cache = {}
        self.pending_validations: List[ConsensusValidation] = []

        # Blockchain state tracking
        self.current_block_height = 0
        self.last_sync_timestamp = datetime.utcnow()

    def _get_default_config(self) -> Dict:
        return {
            'blockchain': {
                'network': 'ethereum',
                'rpc_url': 'http://localhost:8545',
                'consensus_threshold': 0.7,
                'min_validators': 3,
                'validation_reward': 0.01
            },
            'consensus': {
                'algorithm': 'proof_of_stake',
                'min_stake': 100,
                'validation_period': 3600,  # 1 hour
                'consensus_timeout': 300  # 5 minutes
            },
            'crypto': {
                'hash_algorithm': 'sha256',
                'signature_scheme': 'ecdsa',
                'proof_of_work_difficulty': 4
            }
        }

    async def add_knowledge_node(self, content: str, node_type: str, metadata: Dict = None) -> str:
        """Add a new knowledge node to the blockchain knowledge graph"""
        # Generate unique node ID
        node_id = self._generate_node_id(content, node_type)

        # Create knowledge node
        node = KnowledgeNode(
            node_id=node_id,
            content=content,
            node_type=node_type,
            confidence=0.0,  # Initial confidence before consensus
            validators=[],
            validation_count=0,
            creation_timestamp=datetime.utcnow(),
            last_updated=datetime.utcnow(),
            metadata=metadata or {}
        )

        # Store locally
        self.nodes[node_id] = node

        # Submit to blockchain for consensus validation
        await self._submit_node_to_blockchain(node)

        return node_id

    async def add_knowledge_edge(self, source_node: str, target_node: str,
                               relationship_type: str, strength: float = 1.0) -> str:
        """Add a relationship edge between knowledge nodes"""
        # Verify nodes exist
        if source_node not in self.nodes or target_node not in self.nodes:
            raise ValueError(f"Nodes {source_node} or {target_node} not found")

        # Generate unique edge ID
        edge_id = self._generate_edge_id(source_node, target_node, relationship_type)

        # Create knowledge edge
        edge = KnowledgeEdge(
            edge_id=edge_id,
            source_node=source_node,
            target_node=target_node,
            relationship_type=relationship_type,
            strength=strength,
            direction='bidirectional',
            validators=[],
            validation_count=0,
            creation_timestamp=datetime.utcnow(),
            blockchain_proof=''  # Will be set after blockchain validation
        )

        # Store locally
        self.edges[edge_id] = edge

        # Submit to blockchain for consensus validation
        await self._submit_edge_to_blockchain(edge)

        return edge_id

    async def validate_knowledge(self, node_or_edge_id: str, validator_address: str,
                               validation_score: float, stake_amount: float = 100) -> str:
        """Submit validation for a knowledge node or edge"""
        # Create validation record
        validation = ConsensusValidation(
            validation_id=self._generate_validation_id(node_or_edge_id, validator_address),
            node_id=node_or_edge_id,
            validator_address=validator_address,
            validation_score=validation_score,
            validation_timestamp=datetime.utcnow(),
            proof_of_work=self._generate_proof_of_work(node_or_edge_id, validator_address),
            stake_amount=stake_amount
        )

        # Add to pending validations
        self.pending_validations.append(validation)

        # Submit to blockchain for consensus
        await self.blockchain_adapter.submit_validation(validation)

        return validation.validation_id

    async def get_knowledge_with_consensus(self, node_id: str) -> Tuple[KnowledgeNode, float]:
        """Get knowledge node with current consensus confidence"""
        if node_id not in self.nodes:
            raise ValueError(f"Node {node_id} not found")

        node = self.nodes[node_id]

        # Calculate current consensus confidence
        validations = self.consensus_validations.get(node_id, [])
        if not validations:
            return node, 0.0

        # Weighted average based on stake and validation score
        total_weight = sum(v.stake_amount * v.validation_score for v in validations)
        total_stake = sum(v.stake_amount for v in validations)

        if total_stake == 0:
            consensus_confidence = 0.0
        else:
            consensus_confidence = total_weight / total_stake

        # Update node confidence
        node.confidence = consensus_confidence
        node.last_updated = datetime.utcnow()

        return node, consensus_confidence

    async def query_knowledge_graph(self, query_type: str, **kwargs) -> List[Dict[str, Any]]:
        """Query the blockchain knowledge graph"""
        results = []

        if query_type == 'related_nodes':
            central_node = kwargs.get('node_id')
            if central_node:
                results = await self._find_related_nodes(central_node)

        elif query_type == 'consensus_validated':
            min_confidence = kwargs.get('min_confidence', 0.7)
            results = await self._find_high_confidence_nodes(min_confidence)

        elif query_type == 'temporal_evolution':
            time_range = kwargs.get('time_range')
            results = await self._track_temporal_evolution(time_range)

        return results

    async def create_knowledge_snapshot(self) -> KnowledgeGraphSnapshot:
        """Create blockchain-verifiable snapshot of current knowledge state"""
        # Get all current nodes and edges
        current_nodes = list(self.nodes.values())
        current_edges = list(self.edges.values())

        # Get consensus validations
        consensus_state = {}
        for node_id, validations in self.consensus_validations.items():
            consensus_state[node_id] = validations

        # Create snapshot
        snapshot = KnowledgeGraphSnapshot(
            snapshot_id=self._generate_snapshot_id(current_nodes, current_edges),
            nodes=current_nodes,
            edges=current_edges,
            consensus_state=consensus_state,
            snapshot_timestamp=datetime.utcnow(),
            blockchain_height=self.current_block_height,
            merkle_root=self._calculate_merkle_root(current_nodes, current_edges)
        )

        # Submit snapshot to blockchain
        await self.blockchain_adapter.submit_snapshot(snapshot)

        return snapshot

    def _generate_node_id(self, content: str, node_type: str) -> str:
        """Generate unique node ID using cryptographic hash"""
        content_hash = hashlib.sha256(f"{content}_{node_type}_{datetime.utcnow()}".encode()).hexdigest()
        return f"node_{content_hash[:16]}"

    def _generate_edge_id(self, source: str, target: str, relationship: str) -> str:
        """Generate unique edge ID"""
        edge_hash = hashlib.sha256(f"{source}_{target}_{relationship}".encode()).hexdigest()
        return f"edge_{edge_hash[:16]}"

    def _generate_validation_id(self, node_id: str, validator: str) -> str:
        """Generate unique validation ID"""
        val_hash = hashlib.sha256(f"{node_id}_{validator}_{datetime.utcnow()}".encode()).hexdigest()
        return f"val_{val_hash[:16]}"

    def _generate_snapshot_id(self, nodes: List[KnowledgeNode], edges: List[KnowledgeEdge]) -> str:
        """Generate snapshot ID from content"""
        content_str = json.dumps([
            {'id': n.node_id, 'content': n.content[:50]} for n in nodes
        ] + [
            {'id': e.edge_id, 'source': e.source_node, 'target': e.target_node} for e in edges
        ])

        snapshot_hash = hashlib.sha256(content_str.encode()).hexdigest()
        return f"snap_{snapshot_hash[:16]}"

    def _generate_proof_of_work(self, node_id: str, validator: str) -> str:
        """Generate proof of work for validation"""
        # Simple proof of work (in production, use proper mining)
        data = f"{node_id}_{validator}_{datetime.utcnow()}".encode()
        return hashlib.sha256(data).hexdigest()

    def _calculate_merkle_root(self, nodes: List[KnowledgeNode], edges: List[KnowledgeEdge]) -> str:
        """Calculate Merkle root of knowledge graph"""
        # Simple Merkle root calculation
        all_hashes = []

        for node in nodes:
            node_hash = hashlib.sha256(f"{node.node_id}_{node.content}".encode()).hexdigest()
            all_hashes.append(node_hash)

        for edge in edges:
            edge_hash = hashlib.sha256(f"{edge.edge_id}_{edge.source_node}_{edge.target_node}".encode()).hexdigest()
            all_hashes.append(edge_hash)

        # Build Merkle tree (simplified)
        while len(all_hashes) > 1:
            if len(all_hashes) % 2 == 1:
                all_hashes.append(all_hashes[-1])  # Duplicate last hash

            new_level = []
            for i in range(0, len(all_hashes), 2):
                combined = all_hashes[i] + all_hashes[i+1]
                new_hash = hashlib.sha256(combined.encode()).hexdigest()
                new_level.append(new_hash)

            all_hashes = new_level

        return all_hashes[0] if all_hashes else hashlib.sha256(b'empty').hexdigest()

    async def _submit_node_to_blockchain(self, node: KnowledgeNode):
        """Submit knowledge node to blockchain for consensus"""
        await self.blockchain_adapter.submit_knowledge_node(node)

    async def _submit_edge_to_blockchain(self, edge: KnowledgeEdge):
        """Submit knowledge edge to blockchain for consensus"""
        await self.blockchain_adapter.submit_knowledge_edge(edge)

    async def _find_related_nodes(self, node_id: str) -> List[Dict[str, Any]]:
        """Find nodes related to the given node"""
        if node_id not in self.nodes:
            return []

        related_nodes = []
        target_node = self.nodes[node_id]

        # Find edges connected to this node
        for edge in self.edges.values():
            if edge.source_node == node_id or edge.target_node == node_id:
                related_node_id = edge.target_node if edge.source_node == node_id else edge.source_node
                if related_node_id in self.nodes:
                    related_node, _ = await self.get_knowledge_with_consensus(related_node_id)
                    related_nodes.append({
                        'node': related_node,
                        'relationship': edge.relationship_type,
                        'strength': edge.strength
                    })

        return related_nodes

    async def _find_high_confidence_nodes(self, min_confidence: float) -> List[KnowledgeNode]:
        """Find nodes with high consensus confidence"""
        high_confidence_nodes = []

        for node in self.nodes.values():
            _, confidence = await self.get_knowledge_with_consensus(node.node_id)
            if confidence >= min_confidence:
                high_confidence_nodes.append(node)

        return high_confidence_nodes

    async def _track_temporal_evolution(self, time_range: Tuple[datetime, datetime]) -> List[Dict[str, Any]]:
        """Track how knowledge has evolved over time"""
        evolution_data = []

        for node in self.nodes.values():
            if time_range[0] <= node.creation_timestamp <= time_range[1]:
                evolution_data.append({
                    'node_id': node.node_id,
                    'node_type': node.node_type,
                    'creation_time': node.creation_timestamp,
                    'confidence_evolution': await self._get_confidence_evolution(node.node_id),
                    'validation_history': self.consensus_validations.get(node.node_id, [])
                })

        return evolution_data

    async def _get_confidence_evolution(self, node_id: str) -> List[Tuple[datetime, float]]:
        """Get confidence evolution for a node over time"""
        if node_id not in self.consensus_validations:
            return []

        validations = sorted(self.consensus_validations[node_id], key=lambda v: v.validation_timestamp)

        evolution = []
        for validation in validations:
            # Recalculate confidence at this point
            current_validations = [v for v in validations if v.validation_timestamp <= validation.validation_timestamp]
            confidence = self._calculate_consensus_confidence(current_validations)
            evolution.append((validation.validation_timestamp, confidence))

        return evolution

    def _calculate_consensus_confidence(self, validations: List[ConsensusValidation]) -> float:
        """Calculate consensus confidence from validations"""
        if not validations:
            return 0.0

        # Weighted average based on stake and validation score
        total_weight = sum(v.stake_amount * v.validation_score for v in validations)
        total_stake = sum(v.stake_amount for v in validations)

        if total_stake == 0:
            return 0.0

        return total_weight / total_stake

    async def sync_with_blockchain(self):
        """Sync local knowledge graph with blockchain state"""
        # Get latest blockchain state
        blockchain_state = await self.blockchain_adapter.get_latest_state()

        # Update local state
        self.current_block_height = blockchain_state['block_height']
        self.last_sync_timestamp = datetime.utcnow()

        # Process any new validations or updates
        await self._process_blockchain_updates(blockchain_state)

    async def _process_blockchain_updates(self, blockchain_state: Dict):
        """Process updates from blockchain"""
        # Update node/edge validations
        for update in blockchain_state.get('updates', []):
            if update['type'] == 'validation':
                await self._process_validation_update(update)
            elif update['type'] == 'node_update':
                await self._process_node_update(update)

    async def _process_validation_update(self, update: Dict):
        """Process new validation from blockchain"""
        validation = ConsensusValidation(
            validation_id=update['validation_id'],
            node_id=update['node_id'],
            validator_address=update['validator_address'],
            validation_score=update['validation_score'],
            validation_timestamp=datetime.fromisoformat(update['timestamp']),
            proof_of_work=update['proof_of_work'],
            stake_amount=update['stake_amount']
        )

        self.consensus_validations[update['node_id']].append(validation)

    async def _process_node_update(self, update: Dict):
        """Process node update from blockchain"""
        if update['node_id'] in self.nodes:
            node = self.nodes[update['node_id']]
            node.last_updated = datetime.fromisoformat(update['timestamp'])
            node.metadata.update(update.get('metadata', {}))

    async def get_knowledge_graph_statistics(self) -> Dict[str, Any]:
        """Get statistics about the knowledge graph"""
        total_nodes = len(self.nodes)
        total_edges = len(self.edges)

        # Calculate average confidence
        confidences = []
        for node in self.nodes.values():
            _, confidence = await self.get_knowledge_with_consensus(node.node_id)
            confidences.append(confidence)

        avg_confidence = np.mean(confidences) if confidences else 0.0

        # Node type distribution
        node_types = defaultdict(int)
        for node in self.nodes.values():
            node_types[node.node_type] += 1

        return {
            'total_nodes': total_nodes,
            'total_edges': total_edges,
            'average_consensus_confidence': avg_confidence,
            'node_type_distribution': dict(node_types),
            'blockchain_height': self.current_block_height,
            'last_sync': self.last_sync_timestamp.isoformat(),
            'pending_validations': len(self.pending_validations)
        }


class BlockchainAdapter:
    """Adapter for blockchain operations"""

    def __init__(self, config: Dict):
        self.config = config
        self.connected = False

    async def submit_knowledge_node(self, node: KnowledgeNode):
        """Submit knowledge node to blockchain"""
        # In production, this would interact with smart contracts
        pass

    async def submit_knowledge_edge(self, edge: KnowledgeEdge):
        """Submit knowledge edge to blockchain"""
        # In production, this would interact with smart contracts
        pass

    async def submit_validation(self, validation: ConsensusValidation):
        """Submit validation to blockchain"""
        # In production, this would interact with smart contracts
        pass

    async def submit_snapshot(self, snapshot: KnowledgeGraphSnapshot):
        """Submit knowledge graph snapshot to blockchain"""
        # In production, this would interact with smart contracts
        pass

    async def get_latest_state(self) -> Dict:
        """Get latest blockchain state"""
        # In production, this would query blockchain
        return {
            'block_height': 1000,
            'updates': [],
            'timestamp': datetime.utcnow()
        }


class ConsensusEngine:
    """Manages consensus validation for knowledge"""

    def __init__(self, config: Dict):
        self.config = config

    async def validate_knowledge(self, knowledge_item: Union[KnowledgeNode, KnowledgeEdge],
                               validator_address: str, validation_score: float) -> bool:
        """Validate knowledge through consensus mechanism"""
        # Simple consensus check (would use full blockchain consensus in production)
        if validation_score >= self.config['consensus_threshold']:
            return True
        return False


class CryptographicProver:
    """Provides cryptographic proofs for knowledge validation"""

    def __init__(self, config: Dict):
        self.config = config

    def generate_proof(self, data: str) -> str:
        """Generate cryptographic proof for data"""
        return hashlib.sha256(data.encode()).hexdigest()

    def verify_proof(self, data: str, proof: str) -> bool:
        """Verify cryptographic proof"""
        return self.generate_proof(data) == proof
