"""
👥 SOCIAL INFLUENCE MAPPER - DIVINE POWER DYNAMICS ANALYSIS
==========================================================

Revolutionary social influence mapping engine that decodes power structures,
influence networks, and social dynamics in cryptocurrency markets with
unprecedented precision and insight.

BREAKTHROUGH CAPABILITIES:
- Multi-dimensional influence network mapping
- Power dynamics quantification
- Influence cascade prediction
- Hidden influencer detection
- Social manipulation identification
- Tribal psychology analysis
- Echo chamber detection
- Influence monetization tracking

"The key to successful leadership is influence, not authority." - Ken Blanchard
We decode the hidden influence networks that truly move crypto markets.
"""

import asyncio
import logging
import re
import numpy as np
from typing import Dict, List, Optional, Tuple, Any, Set
from datetime import datetime, timedelta
import json
from collections import defaultdict, Counter
import networkx as nx
from dataclasses import dataclass
import hashlib

from ..models.psychological_patterns import (
    SocialInfluence,
    InfluenceType
)

logger = logging.getLogger(__name__)

@dataclass
class InfluenceNode:
    """Represents an entity in the influence network"""
    id: str
    name: str
    influence_score: float
    follower_count: int
    engagement_rate: float
    credibility_score: float
    influence_type: InfluenceType
    network_position: str
    connections: List[str]
    influence_reach: int
    authenticity_score: float
    monetization_indicators: List[str]

@dataclass
class InfluenceEdge:
    """Represents influence relationship between nodes"""
    source: str
    target: str
    influence_strength: float
    relationship_type: str
    interaction_frequency: float
    sentiment: float
    amplification_factor: float

class SocialInfluenceMapper:
    """
    👥 DIVINE SOCIAL INFLUENCE MAPPER
    
    This mapper uses advanced network analysis, behavioral modeling,
    and psychological profiling to decode the hidden power structures
    and influence dynamics in crypto markets.
    
    DIVINE CAPABILITIES:
    - Real-time influence network construction
    - Power dynamics quantification
    - Hidden influencer identification
    - Influence cascade prediction
    - Tribal boundary detection
    - Echo chamber analysis
    """
    
    def __init__(self, config: Optional[Dict] = None):
        """Initialize the social influence mapper"""
        self.config = config or self._get_default_config()
        
        # Network analysis systems
        self.influence_network = nx.DiGraph()
        self.power_analyzer = PowerDynamicsAnalyzer()
        self.cascade_predictor = InfluenceCascadePredictor()
        self.tribal_analyzer = TribalPsychologyAnalyzer()
        self.echo_chamber_detector = EchoChamberDetector()
        self.hidden_influencer_detector = HiddenInfluencerDetector()
        
        # Tracking systems
        self.influence_history = defaultdict(list)
        self.network_evolution = []
        self.influence_patterns = defaultdict(dict)
        
        logger.info("👥 SocialInfluenceMapper initialized with divine network analysis")
    
    async def map(self, enhanced_input: Dict) -> List[SocialInfluence]:
        """
        🎯 MASTER SOCIAL INFLUENCE MAPPING
        
        Performs comprehensive social influence analysis to decode
        power structures and influence dynamics.
        """
        try:
            text = enhanced_input['processed_text']
            social_features = enhanced_input.get('social_features', {})
            contextual_signals = enhanced_input.get('contextual_signals', {})
            
            # Build influence network
            network_data = await self._build_influence_network(text, social_features)
            
            # Analyze influence patterns
            influence_patterns = []
            
            # 1. Direct influence analysis
            direct_influences = await self._analyze_direct_influence(
                text, social_features, network_data
            )
            influence_patterns.extend(direct_influences)
            
            # 2. Network influence analysis
            network_influences = await self._analyze_network_influence(
                network_data, contextual_signals
            )
            influence_patterns.extend(network_influences)
            
            # 3. Power dynamics analysis
            power_influences = await self._analyze_power_dynamics(
                text, network_data, social_features
            )
            influence_patterns.extend(power_influences)
            
            # 4. Tribal influence analysis
            tribal_influences = await self._analyze_tribal_influence(
                text, network_data, enhanced_input
            )
            influence_patterns.extend(tribal_influences)
            
            # 5. Hidden influence detection
            hidden_influences = await self._detect_hidden_influence(
                text, network_data, social_features
            )
            influence_patterns.extend(hidden_influences)
            
            # 6. Influence cascade prediction
            for influence in influence_patterns:
                influence.influence_cascade_potential = await self.cascade_predictor.predict(
                    influence, network_data
                )
            
            # 7. Echo chamber detection
            echo_chamber_effects = await self.echo_chamber_detector.detect(
                text, network_data, influence_patterns
            )
            
            # 8. Counter-influence analysis
            for influence in influence_patterns:
                influence.counter_influences = await self._identify_counter_influences(
                    influence, network_data
                )
            
            # 9. Audience skepticism assessment
            for influence in influence_patterns:
                influence.audience_skepticism = await self._assess_audience_skepticism(
                    influence, contextual_signals
                )
            
            # 10. Filter and rank influences
            final_influences = await self._filter_and_rank_influences(influence_patterns)
            
            # Store for learning
            await self._store_influence_mapping(final_influences, network_data)
            
            logger.info(f"👥 Social influence mapping completed: {len(final_influences)} influences detected")
            
            return final_influences
            
        except Exception as e:
            logger.error(f"❌ Social influence mapping failed: {str(e)}")
            return []
    
    async def _build_influence_network(self, text: str, social_features: Dict) -> Dict:
        """Build the influence network from available data"""
        network_data = {
            'nodes': [],
            'edges': [],
            'metrics': {}
        }
        
        # Create primary node (author/source)
        primary_node = await self._create_influence_node(social_features, text)
        network_data['nodes'].append(primary_node)
        self.influence_network.add_node(primary_node.id, **primary_node.__dict__)
        
        # Extract mentioned entities and create nodes
        mentioned_entities = await self._extract_mentioned_entities(text)
        for entity in mentioned_entities:
            node = await self._create_entity_node(entity)
            network_data['nodes'].append(node)
            self.influence_network.add_node(node.id, **node.__dict__)
            
            # Create edge between primary and mentioned
            edge = InfluenceEdge(
                source=primary_node.id,
                target=node.id,
                influence_strength=0.5,
                relationship_type='mention',
                interaction_frequency=1.0,
                sentiment=0.0,
                amplification_factor=1.0
            )
            network_data['edges'].append(edge)
            self.influence_network.add_edge(
                edge.source, edge.target,
                weight=edge.influence_strength
            )
        
        # Calculate network metrics
        if self.influence_network.number_of_nodes() > 0:
            network_data['metrics'] = {
                'density': nx.density(self.influence_network),
                'centralization': await self._calculate_centralization(),
                'clustering': nx.average_clustering(self.influence_network.to_undirected()),
                'diameter': await self._calculate_diameter()
            }
        
        return network_data
    
    async def _analyze_direct_influence(self, text: str, social_features: Dict, network_data: Dict) -> List[SocialInfluence]:
        """Analyze direct influence from the source"""
        influences = []
        
        # Assess influence type based on social features
        influence_type = await self._determine_influence_type(text, social_features)
        
        # Calculate influence strength
        influence_strength = await self._calculate_influence_strength(
            social_features, network_data
        )
        
        # Assess credibility
        source_credibility = await self._assess_source_credibility(
            text, social_features
        )
        
        # Calculate network reach
        network_reach = await self._calculate_network_reach(
            social_features, network_data
        )
        
        if influence_strength > self.config['influence_threshold']:
            influence = SocialInfluence(
                influence_type=influence_type,
                source_credibility=source_credibility,
                influence_strength=influence_strength,
                network_reach=network_reach,
                influence_cascade_potential=0.0,  # Will be calculated later
                audience_skepticism=0.0,  # Will be calculated later
                counter_influences=[]  # Will be filled later
            )
            influences.append(influence)
        
        return influences
    
    async def _analyze_network_influence(self, network_data: Dict, contextual_signals: Dict) -> List[SocialInfluence]:
        """Analyze influence through network effects"""
        influences = []
        
        # Identify key influencers in network
        if self.influence_network.number_of_nodes() > 1:
            # Calculate centrality measures
            betweenness = nx.betweenness_centrality(self.influence_network)
            eigenvector = nx.eigenvector_centrality_numpy(self.influence_network, max_iter=100)
            pagerank = nx.pagerank(self.influence_network)
            
            # Find high-centrality nodes
            for node_id in self.influence_network.nodes():
                combined_centrality = (
                    betweenness.get(node_id, 0) * 0.3 +
                    eigenvector.get(node_id, 0) * 0.4 +
                    pagerank.get(node_id, 0) * 0.3
                )
                
                if combined_centrality > 0.3:
                    node_data = self.influence_network.nodes[node_id]
                    
                    influence = SocialInfluence(
                        influence_type=InfluenceType.POSITIONAL,
                        source_credibility=node_data.get('credibility_score', 0.5),
                        influence_strength=combined_centrality,
                        network_reach=node_data.get('influence_reach', 100),
                        influence_cascade_potential=0.0,
                        audience_skepticism=0.0,
                        counter_influences=[]
                    )
                    influences.append(influence)
        
        return influences
    
    async def _analyze_power_dynamics(self, text: str, network_data: Dict, social_features: Dict) -> List[SocialInfluence]:
        """Analyze power dynamics in the influence network"""
        influences = []
        
        # Analyze power structures
        power_analysis = await self.power_analyzer.analyze(
            text, network_data, social_features
        )
        
        if power_analysis['power_score'] > 0.5:
            influence = SocialInfluence(
                influence_type=self._map_power_to_influence_type(power_analysis['power_type']),
                source_credibility=power_analysis['credibility'],
                influence_strength=power_analysis['power_score'],
                network_reach=power_analysis['reach'],
                influence_cascade_potential=0.0,
                audience_skepticism=0.0,
                counter_influences=[]
            )
            influences.append(influence)
        
        return influences
    
    async def _analyze_tribal_influence(self, text: str, network_data: Dict, enhanced_input: Dict) -> List[SocialInfluence]:
        """Analyze tribal and group influence dynamics"""
        influences = []
        
        # Detect tribal affiliations
        tribal_analysis = await self.tribal_analyzer.analyze(text, network_data)
        
        if tribal_analysis['tribal_strength'] > 0.4:
            influence = SocialInfluence(
                influence_type=InfluenceType.NORMATIVE,  # Tribal influence is normative
                source_credibility=tribal_analysis['in_group_credibility'],
                influence_strength=tribal_analysis['tribal_strength'],
                network_reach=tribal_analysis['tribe_size'],
                influence_cascade_potential=tribal_analysis['viral_potential'],
                audience_skepticism=tribal_analysis['out_group_skepticism'],
                counter_influences=tribal_analysis['opposing_tribes']
            )
            influences.append(influence)
        
        return influences
    
    async def _detect_hidden_influence(self, text: str, network_data: Dict, social_features: Dict) -> List[SocialInfluence]:
        """Detect hidden or indirect influence"""
        influences = []
        
        # Detect hidden influencers
        hidden_analysis = await self.hidden_influencer_detector.detect(
            text, network_data, social_features
        )
        
        for hidden_influencer in hidden_analysis['hidden_influencers']:
            influence = SocialInfluence(
                influence_type=InfluenceType.COERCIVE,  # Hidden influence often coercive
                source_credibility=hidden_influencer['estimated_credibility'],
                influence_strength=hidden_influencer['influence_strength'],
                network_reach=hidden_influencer['estimated_reach'],
                influence_cascade_potential=hidden_influencer['cascade_potential'],
                audience_skepticism=0.3,  # Higher skepticism for hidden influence
                counter_influences=[]
            )
            influences.append(influence)
        
        return influences
    
    async def _determine_influence_type(self, text: str, social_features: Dict) -> InfluenceType:
        """Determine the type of influence being exerted"""
        text_lower = text.lower()
        
        # Check for different influence types
        if re.search(r'\b(expert|analysis|data|research)\b', text_lower):
            return InfluenceType.INFORMATIONAL
        
        elif re.search(r'\b(everyone|community|together|join)\b', text_lower):
            return InfluenceType.NORMATIVE
        
        elif re.search(r'\b(must|have to|required|forced)\b', text_lower):
            return InfluenceType.COERCIVE
        
        elif social_features.get('follower_count', 0) > 100000:
            return InfluenceType.CHARISMATIC
        
        elif re.search(r'\b(professional|certified|qualified)\b', text_lower):
            return InfluenceType.EXPERTISE
        
        elif social_features.get('verification_status', False):
            return InfluenceType.POSITIONAL
        
        return InfluenceType.INFORMATIONAL  # Default
    
    async def _calculate_influence_strength(self, social_features: Dict, network_data: Dict) -> float:
        """Calculate overall influence strength"""
        strength_factors = []
        
        # Social metrics
        if social_features.get('follower_count', 0) > 0:
            follower_score = min(np.log10(social_features['follower_count'] + 1) / 6, 1.0)
            strength_factors.append(follower_score)
        
        # Engagement metrics
        engagement_rate = social_features.get('engagement_rate', 0)
        strength_factors.append(min(engagement_rate * 10, 1.0))
        
        # Network position
        if network_data['metrics']:
            centralization = network_data['metrics'].get('centralization', 0)
            strength_factors.append(centralization)
        
        # Account credibility
        if social_features.get('verification_status', False):
            strength_factors.append(0.8)
        
        if social_features.get('account_age', 0) > 365:
            strength_factors.append(0.6)
        
        return np.mean(strength_factors) if strength_factors else 0.5
    
    async def _assess_source_credibility(self, text: str, social_features: Dict) -> float:
        """Assess credibility of the influence source"""
        credibility_score = 0.5  # Base credibility
        
        # Verification status
        if social_features.get('verification_status', False):
            credibility_score += 0.2
        
        # Account age
        account_age = social_features.get('account_age', 0)
        if account_age > 730:  # 2+ years
            credibility_score += 0.15
        elif account_age > 365:  # 1+ year
            credibility_score += 0.1
        elif account_age < 30:  # New account
            credibility_score -= 0.2
        
        # Follower/following ratio
        followers = social_features.get('follower_count', 0)
        following = social_features.get('following_count', 1)
        if followers > following * 10:
            credibility_score += 0.1
        
        # Content quality indicators
        if not re.search(r'[!]{3,}|[A-Z]{5,}', text):  # No excessive punctuation/caps
            credibility_score += 0.05
        
        # Suspicious patterns
        suspicious_patterns = [
            r'\b(guaranteed|100%|risk.?free)\b',
            r'\b(get rich quick|easy money)\b',
            r'\b(dm me|private message)\b'
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                credibility_score -= 0.15
        
        return max(min(credibility_score, 1.0), 0.0)
    
    async def _calculate_network_reach(self, social_features: Dict, network_data: Dict) -> int:
        """Calculate potential network reach"""
        direct_reach = social_features.get('follower_count', 0)
        
        # Estimate secondary reach (followers of followers)
        engagement_rate = social_features.get('engagement_rate', 0.01)
        secondary_reach = int(direct_reach * engagement_rate * 100)  # Rough estimate
        
        # Network amplification
        if network_data['nodes']:
            network_amplification = len(network_data['nodes']) * 1000  # Rough estimate
            secondary_reach += network_amplification
        
        return direct_reach + secondary_reach
    
    async def _identify_counter_influences(self, influence: SocialInfluence, network_data: Dict) -> List[str]:
        """Identify counter-influences to this influence"""
        counter_influences = []
        
        # Look for opposing viewpoints in network
        if influence.influence_type == InfluenceType.NORMATIVE:
            counter_influences.append("contrarian_voices")
        
        if influence.influence_strength > 0.7:
            counter_influences.append("skeptical_analysts")
        
        if influence.source_credibility < 0.5:
            counter_influences.append("fact_checkers")
        
        return counter_influences
    
    async def _assess_audience_skepticism(self, influence: SocialInfluence, contextual_signals: Dict) -> float:
        """Assess level of audience skepticism"""
        skepticism = 0.3  # Base skepticism
        
        # Low credibility increases skepticism
        if influence.source_credibility < 0.4:
            skepticism += 0.3
        
        # High influence strength can reduce skepticism (bandwagon)
        if influence.influence_strength > 0.8:
            skepticism -= 0.2
        
        # Market conditions affect skepticism
        if contextual_signals.get('market_volatility', 0) > 0.7:
            skepticism += 0.2  # More skeptical in volatile markets
        
        # Coercive influence increases skepticism
        if influence.influence_type == InfluenceType.COERCIVE:
            skepticism += 0.25
        
        return max(min(skepticism, 1.0), 0.0)
    
    async def _filter_and_rank_influences(self, influences: List[SocialInfluence]) -> List[SocialInfluence]:
        """Filter and rank influences by importance"""
        # Filter out weak influences
        filtered = [inf for inf in influences if inf.influence_strength >= self.config['influence_threshold']]
        
        # Remove duplicates
        seen = set()
        unique_influences = []
        for influence in filtered:
            key = (influence.influence_type, round(influence.influence_strength, 1))
            if key not in seen:
                unique_influences.append(influence)
                seen.add(key)
        
        # Sort by combined impact score
        def influence_impact(inf):
            return (
                inf.influence_strength * 0.4 +
                inf.source_credibility * 0.3 +
                (1.0 - inf.audience_skepticism) * 0.2 +
                min(inf.network_reach / 100000, 1.0) * 0.1
            )
        
        return sorted(unique_influences, key=influence_impact, reverse=True)
    
    async def _create_influence_node(self, social_features: Dict, text: str) -> InfluenceNode:
        """Create an influence node from social features"""
        node_id = hashlib.md5(f"{social_features.get('user_id', 'unknown')}_{datetime.utcnow()}".encode()).hexdigest()[:8]
        
        return InfluenceNode(
            id=node_id,
            name=social_features.get('username', 'unknown'),
            influence_score=await self._calculate_influence_score(social_features),
            follower_count=social_features.get('follower_count', 0),
            engagement_rate=social_features.get('engagement_rate', 0),
            credibility_score=await self._assess_source_credibility(text, social_features),
            influence_type=await self._determine_influence_type(text, social_features),
            network_position=await self._determine_network_position(social_features),
            connections=[],
            influence_reach=social_features.get('follower_count', 0),
            authenticity_score=await self._assess_authenticity(text, social_features),
            monetization_indicators=await self._detect_monetization(text)
        )
    
    async def _create_entity_node(self, entity: str) -> InfluenceNode:
        """Create a node for a mentioned entity"""
        node_id = hashlib.md5(entity.encode()).hexdigest()[:8]
        
        return InfluenceNode(
            id=node_id,
            name=entity,
            influence_score=0.3,  # Default for mentioned entities
            follower_count=0,
            engagement_rate=0,
            credibility_score=0.5,
            influence_type=InfluenceType.INFORMATIONAL,
            network_position='peripheral',
            connections=[],
            influence_reach=0,
            authenticity_score=0.5,
            monetization_indicators=[]
        )
    
    async def _extract_mentioned_entities(self, text: str) -> List[str]:
        """Extract mentioned entities from text"""
        entities = []
        
        # Extract @mentions
        mentions = re.findall(r'@(\w+)', text)
        entities.extend(mentions)
        
        # Extract crypto symbols
        symbols = re.findall(r'\$([A-Z]{2,10})', text)
        entities.extend(symbols)
        
        # Extract quoted sources
        quotes = re.findall(r'"([^"]+)" (?:said|says|stated)', text)
        entities.extend(quotes)
        
        return list(set(entities))[:10]  # Limit to 10 entities
    
    async def _calculate_influence_score(self, social_features: Dict) -> float:
        """Calculate overall influence score"""
        factors = []
        
        # Follower count (logarithmic scale)
        if social_features.get('follower_count', 0) > 0:
            follower_score = min(np.log10(social_features['follower_count'] + 1) / 7, 1.0)
            factors.append(follower_score)
        
        # Engagement rate
        factors.append(min(social_features.get('engagement_rate', 0) * 20, 1.0))
        
        # Verification status
        if social_features.get('verification_status', False):
            factors.append(0.9)
        
        return np.mean(factors) if factors else 0.3
    
    async def _determine_network_position(self, social_features: Dict) -> str:
        """Determine position in influence network"""
        followers = social_features.get('follower_count', 0)
        
        if followers > 1000000:
            return 'mega_influencer'
        elif followers > 100000:
            return 'macro_influencer'
        elif followers > 10000:
            return 'micro_influencer'
        elif followers > 1000:
            return 'nano_influencer'
        else:
            return 'regular_user'
    
    async def _assess_authenticity(self, text: str, social_features: Dict) -> float:
        """Assess authenticity of the influence source"""
        authenticity = 0.7  # Base authenticity
        
        # Check for bot-like patterns
        bot_patterns = [
            r'\b(follow back|f4f|followforfollow)\b',
            r'\b(retweet|rt) to win\b',
            r'check my bio',
            r'link in bio'
        ]
        
        for pattern in bot_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                authenticity -= 0.2
        
        # Account age factor
        if social_features.get('account_age', 365) < 30:
            authenticity -= 0.1
        
        # Engagement quality
        if social_features.get('engagement_rate', 0) > 0.2:  # Suspiciously high
            authenticity -= 0.15
        
        return max(authenticity, 0.0)
    
    async def _detect_monetization(self, text: str) -> List[str]:
        """Detect monetization indicators"""
        indicators = []
        
        monetization_patterns = {
            'affiliate': r'\b(affiliate|commission|referral)\b',
            'sponsored': r'\b(sponsored|paid|partnership|ad)\b',
            'course': r'\b(course|masterclass|training|webinar)\b',
            'subscription': r'\b(subscribe|premium|vip|exclusive)\b',
            'donation': r'\b(donate|tip|support|patreon)\b'
        }
        
        for indicator, pattern in monetization_patterns.items():
            if re.search(pattern, text, re.IGNORECASE):
                indicators.append(indicator)
        
        return indicators
    
    async def _calculate_centralization(self) -> float:
        """Calculate network centralization"""
        if self.influence_network.number_of_nodes() < 2:
            return 0.0
        
        degree_centrality = nx.degree_centrality(self.influence_network)
        max_centrality = max(degree_centrality.values()) if degree_centrality else 0
        
        return max_centrality
    
    async def _calculate_diameter(self) -> int:
        """Calculate network diameter"""
        try:
            if nx.is_strongly_connected(self.influence_network):
                return nx.diameter(self.influence_network)
            else:
                # Use largest strongly connected component
                largest_scc = max(nx.strongly_connected_components(self.influence_network), key=len)
                subgraph = self.influence_network.subgraph(largest_scc)
                return nx.diameter(subgraph) if len(subgraph) > 1 else 0
        except:
            return 0
    
    def _map_power_to_influence_type(self, power_type: str) -> InfluenceType:
        """Map power type to influence type"""
        mapping = {
            'expert_power': InfluenceType.EXPERTISE,
            'referent_power': InfluenceType.CHARISMATIC,
            'legitimate_power': InfluenceType.POSITIONAL,
            'coercive_power': InfluenceType.COERCIVE,
            'reward_power': InfluenceType.NORMATIVE,
            'information_power': InfluenceType.INFORMATIONAL
        }
        
        return mapping.get(power_type, InfluenceType.INFORMATIONAL)
    
    async def _store_influence_mapping(self, influences: List[SocialInfluence], network_data: Dict):
        """Store influence mapping for learning"""
        mapping_record = {
            'timestamp': datetime.utcnow(),
            'influences': [(inf.influence_type.value, inf.influence_strength) for inf in influences],
            'network_metrics': network_data['metrics'],
            'node_count': len(network_data['nodes']),
            'edge_count': len(network_data['edges'])
        }
        
        self.network_evolution.append(mapping_record)
        
        # Keep only recent history
        if len(self.network_evolution) > 100:
            self.network_evolution = self.network_evolution[-100:]
    
    def _get_default_config(self) -> Dict:
        """Get default configuration"""
        return {
            'influence_threshold': 0.6,
            'network_analysis': True,
            'cascade_prediction': True,
            'tribal_analysis': True
        }


class PowerDynamicsAnalyzer:
    """Analyze power dynamics in social networks"""
    
    async def analyze(self, text: str, network_data: Dict, social_features: Dict) -> Dict:
        """Analyze power dynamics"""
        power_analysis = {
            'power_score': 0.0,
            'power_type': 'information_power',
            'credibility': 0.5,
            'reach': 0
        }
        
        # Analyze different power bases
        power_scores = {
            'expert_power': await self._assess_expert_power(text, social_features),
            'referent_power': await self._assess_referent_power(social_features),
            'legitimate_power': await self._assess_legitimate_power(social_features),
            'coercive_power': await self._assess_coercive_power(text),
            'reward_power': await self._assess_reward_power(text),
            'information_power': await self._assess_information_power(text)
        }
        
        # Find dominant power type
        max_power = max(power_scores.items(), key=lambda x: x[1])
        power_analysis['power_type'] = max_power[0]
        power_analysis['power_score'] = max_power[1]
        
        # Assess credibility based on power type
        power_analysis['credibility'] = await self._assess_power_credibility(
            max_power[0], social_features
        )
        
        # Calculate reach
        power_analysis['reach'] = social_features.get('follower_count', 0)
        
        return power_analysis
    
    async def _assess_expert_power(self, text: str, social_features: Dict) -> float:
        """Assess expert power"""
        score = 0.0
        
        # Check for expertise indicators
        expertise_patterns = [
            r'\b(analysis|research|study|data)\b',
            r'\b(technical|fundamental|quantitative)\b',
            r'\b(phd|professor|researcher|analyst)\b'
        ]
        
        for pattern in expertise_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                score += 0.2
        
        # Verification adds to expert power
        if social_features.get('verification_status', False):
            score += 0.2
        
        return min(score, 1.0)
    
    async def _assess_referent_power(self, social_features: Dict) -> float:
        """Assess referent/charismatic power"""
        score = 0.0
        
        # High follower count indicates referent power
        followers = social_features.get('follower_count', 0)
        if followers > 100000:
            score += 0.5
        elif followers > 10000:
            score += 0.3
        
        # High engagement indicates charisma
        if social_features.get('engagement_rate', 0) > 0.05:
            score += 0.3
        
        return min(score, 1.0)
    
    async def _assess_legitimate_power(self, social_features: Dict) -> float:
        """Assess legitimate/positional power"""
        score = 0.0
        
        # Verification indicates legitimate position
        if social_features.get('verification_status', False):
            score += 0.5
        
        # Account age adds legitimacy
        if social_features.get('account_age', 0) > 730:
            score += 0.2
        
        return score
    
    async def _assess_coercive_power(self, text: str) -> float:
        """Assess coercive power"""
        score = 0.0
        
        coercive_patterns = [
            r'\b(must|have to|required|forced)\b',
            r'\b(or else|otherwise|consequences)\b',
            r'\b(warning|alert|urgent)\b'
        ]
        
        for pattern in coercive_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                score += 0.25
        
        return min(score, 1.0)
    
    async def _assess_reward_power(self, text: str) -> float:
        """Assess reward power"""
        score = 0.0
        
        reward_patterns = [
            r'\b(giveaway|prize|reward|bonus)\b',
            r'\b(exclusive|vip|premium access)\b',
            r'\b(opportunity|benefit|advantage)\b'
        ]
        
        for pattern in reward_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                score += 0.3
        
        return min(score, 1.0)
    
    async def _assess_information_power(self, text: str) -> float:
        """Assess information power"""
        score = 0.0
        
        info_patterns = [
            r'\b(exclusive|insider|leaked)\b',
            r'\b(breaking|news|announcement)\b',
            r'\b(source|information|intel)\b'
        ]
        
        for pattern in info_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                score += 0.3
        
        return min(score, 1.0)
    
    async def _assess_power_credibility(self, power_type: str, social_features: Dict) -> float:
        """Assess credibility based on power type"""
        base_credibility = 0.5
        
        if power_type == 'expert_power':
            if social_features.get('verification_status', False):
                base_credibility += 0.3
        
        elif power_type == 'legitimate_power':
            base_credibility += 0.2
        
        elif power_type == 'coercive_power':
            base_credibility -= 0.2
        
        return max(min(base_credibility, 1.0), 0.0)


class InfluenceCascadePredictor:
    """Predict influence cascade potential"""
    
    async def predict(self, influence: SocialInfluence, network_data: Dict) -> float:
        """Predict cascade potential"""
        cascade_factors = []
        
        # Network reach factor
        if influence.network_reach > 10000:
            cascade_factors.append(0.7)
        elif influence.network_reach > 1000:
            cascade_factors.append(0.4)
        
        # Influence strength factor
        cascade_factors.append(influence.influence_strength * 0.8)
        
        # Low skepticism increases cascade potential
        cascade_factors.append((1.0 - influence.audience_skepticism) * 0.6)
        
        # Network density affects cascade
        if network_data.get('metrics', {}).get('density', 0) > 0.3:
            cascade_factors.append(0.5)
        
        return np.mean(cascade_factors) if cascade_factors else 0.3


class TribalPsychologyAnalyzer:
    """Analyze tribal psychology and group dynamics"""
    
    async def analyze(self, text: str, network_data: Dict) -> Dict:
        """Analyze tribal dynamics"""
        tribal_analysis = {
            'tribal_strength': 0.0,
            'in_group_credibility': 0.5,
            'tribe_size': 0,
            'viral_potential': 0.0,
            'out_group_skepticism': 0.5,
            'opposing_tribes': []
        }
        
        # Detect tribal language
        tribal_patterns = [
            r'\b(we|us|our)\b',
            r'\b(they|them|their)\b',
            r'\b(community|family|army)\b',
            r'\b(together|united|strong)\b'
        ]
        
        tribal_score = 0.0
        for pattern in tribal_patterns:
            matches = len(re.findall(pattern, text, re.IGNORECASE))
            tribal_score += min(matches * 0.1, 0.3)
        
        tribal_analysis['tribal_strength'] = min(tribal_score, 1.0)
        
        # In-group credibility is higher with tribal language
        if tribal_score > 0.5:
            tribal_analysis['in_group_credibility'] = 0.8
            tribal_analysis['out_group_skepticism'] = 0.7
        
        # Detect opposing tribes
        if re.search(r'\b(vs|versus|against)\b', text, re.IGNORECASE):
            tribal_analysis['opposing_tribes'].append('identified_opposition')
        
        # Viral potential increases with tribal strength
        tribal_analysis['viral_potential'] = tribal_score * 0.7
        
        # Estimate tribe size from network
        tribal_analysis['tribe_size'] = len(network_data.get('nodes', [])) * 1000
        
        return tribal_analysis


class EchoChamberDetector:
    """Detect echo chamber effects"""
    
    async def detect(self, text: str, network_data: Dict, influences: List[SocialInfluence]) -> Dict:
        """Detect echo chamber effects"""
        echo_chamber_analysis = {
            'echo_strength': 0.0,
            'diversity_index': 1.0,
            'amplification_factor': 1.0,
            'reality_distortion': 0.0
        }
        
        # Check for echo chamber indicators
        echo_patterns = [
            r'\b(everyone agrees|consensus|obvious)\b',
            r'\b(no debate|settled|clear)\b',
            r'\b(only idiots|anyone who disagrees)\b'
        ]
        
        echo_score = 0.0
        for pattern in echo_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                echo_score += 0.3
        
        echo_chamber_analysis['echo_strength'] = min(echo_score, 1.0)
        
        # Low diversity in influence types indicates echo chamber
        influence_types = set(inf.influence_type for inf in influences)
        diversity = len(influence_types) / 6.0  # 6 possible types
        echo_chamber_analysis['diversity_index'] = diversity
        
        # Amplification increases in echo chambers
        if echo_score > 0.5:
            echo_chamber_analysis['amplification_factor'] = 1.5
            echo_chamber_analysis['reality_distortion'] = 0.6
        
        return echo_chamber_analysis


class HiddenInfluencerDetector:
    """Detect hidden or indirect influencers"""
    
    async def detect(self, text: str, network_data: Dict, social_features: Dict) -> Dict:
        """Detect hidden influencers"""
        hidden_analysis = {
            'hidden_influencers': [],
            'detection_confidence': 0.0
        }
        
        # Check for indirect influence patterns
        indirect_patterns = [
            r'\b(heard from|someone told me|sources say)\b',
            r'\b(rumor|whisper|insider)\b',
            r'\b(anonymous|undisclosed|confidential)\b'
        ]
        
        indirect_score = 0.0
        for pattern in indirect_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                indirect_score += 0.3
        
        if indirect_score > 0.3:
            hidden_influencer = {
                'estimated_credibility': 0.4,
                'influence_strength': indirect_score,
                'estimated_reach': 10000,
                'cascade_potential': indirect_score * 0.5
            }
            hidden_analysis['hidden_influencers'].append(hidden_influencer)
            hidden_analysis['detection_confidence'] = indirect_score
        
        return hidden_analysis
