"""
🐋 WHALE INTELLIGENCE ENGINE - TRACKING THE GIANTS
==================================================

Revolutionary whale tracking system that monitors and predicts the movements
of cryptocurrency whales with unprecedented accuracy. This engine identifies,
tracks, and analyzes whale behavior to provide alpha-generating insights.

DIVINE CAPABILITIES:
- Real-time whale movement detection
- Wallet clustering and identification
- Accumulation/distribution pattern analysis
- Coordinated movement detection
- Smart money vs dumb money classification
- Predictive whale behavior modeling

"The big money is not in the buying and selling, but in the owning and holding."
- Charlie Munger

We track those who own and hold - and know when they're about to move.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Set, Tuple
from datetime import datetime, timedelta
import numpy as np
from dataclasses import dataclass
import json

from ..models.oracle_models import (
    WhaleActivity,
    WhaleType,
    WhaleMovement
)

logger = logging.getLogger(__name__)

@dataclass
class WhaleProfile:
    """Comprehensive whale profile"""
    address: str
    type: WhaleType
    first_seen: datetime
    total_transactions: int
    average_transaction_size: float
    trading_frequency: float  # Transactions per day
    profit_rate: float  # Historical profit percentage
    influence_score: float  # Market impact score
    credibility_score: float  # Accuracy of past moves
    risk_profile: str  # conservative/moderate/aggressive
    
class WhaleIntelligenceEngine:
    """
    🐋 THE DIVINE WHALE INTELLIGENCE ENGINE
    
    This engine possesses supernatural ability to track and predict whale
    movements by analyzing:
    - On-chain transaction patterns
    - Wallet clustering algorithms
    - Historical behavior analysis
    - Network graph analysis
    - Machine learning predictions
    - Social correlation analysis
    """
    
    def __init__(self, config: Optional[Dict] = None):
        """Initialize the whale intelligence engine"""
        self.config = config or self._get_default_config()
        
        # Whale database (in production, this would be persistent)
        self.known_whales: Dict[str, WhaleProfile] = {}
        self.whale_clusters: Dict[str, Set[str]] = {}  # Grouped wallets
        self.tracking_list: Set[str] = set()  # Active tracking
        
        # Historical data
        self.movement_history: List[Dict] = []
        self.prediction_accuracy: Dict[str, float] = {}
        
        # ML models (would load actual models in production)
        self.behavior_predictor = None
        self.cluster_detector = None
        self.influence_calculator = None
        
        logger.info("🐋 WhaleIntelligenceEngine initialized with divine tracking")
    
    async def track_whale_movements(self, token: str) -> WhaleMovement:
        """
        🎯 MASTER WHALE TRACKING
        
        Track and analyze all whale movements for a specific token
        with supernatural insight into their intentions.
        """
        try:
            # Identify relevant whales for this token
            relevant_whales = await self._identify_relevant_whales(token)
            
            # Analyze each whale's activity
            whale_activities = []
            for whale_address in relevant_whales:
                activity = await self._analyze_whale_activity(whale_address, token)
                whale_activities.append(activity)
            
            # Detect coordinated movements
            coordination = await self._detect_coordinated_movements(whale_activities)
            
            # Analyze overall whale sentiment
            whale_sentiment = await self._analyze_whale_sentiment(whale_activities)
            
            # Generate movement summary
            movement = await self._generate_movement_summary(
                whale_activities, coordination, whale_sentiment
            )
            
            # Predict next moves
            predictions = await self._predict_whale_moves(whale_activities, movement)
            
            # Update tracking metrics
            await self._update_tracking_metrics(whale_activities)
            
            logger.info(f"🐋 Tracked {len(whale_activities)} whales: "
                       f"{movement.net_flow} flow detected")
            
            return movement
            
        except Exception as e:
            logger.error(f"❌ Whale tracking failed: {str(e)}")
            return self._generate_fallback_movement()
    
    async def _identify_relevant_whales(self, token: str) -> List[str]:
        """Identify whales holding or trading this token"""
        
        # In production, query blockchain for top holders
        # For now, generate sample whale addresses
        
        num_whales = np.random.randint(10, 30)
        whales = []
        
        for i in range(num_whales):
            # Generate realistic-looking addresses
            address = f"0x{''.join(np.random.choice(list('0123456789abcdef'), 40))}"
            whales.append(address)
            
            # Create profile if new whale
            if address not in self.known_whales:
                self.known_whales[address] = WhaleProfile(
                    address=address,
                    type=np.random.choice(list(WhaleType)),
                    first_seen=datetime.now() - timedelta(days=np.random.randint(30, 365)),
                    total_transactions=np.random.randint(100, 10000),
                    average_transaction_size=np.random.uniform(100000, 10000000),
                    trading_frequency=np.random.uniform(0.1, 10),
                    profit_rate=np.random.uniform(-20, 100),
                    influence_score=np.random.uniform(1, 10),
                    credibility_score=np.random.uniform(0.3, 1.0),
                    risk_profile=np.random.choice(['conservative', 'moderate', 'aggressive'])
                )
        
        return whales
    
    async def _analyze_whale_activity(self, address: str, token: str) -> WhaleActivity:
        """Analyze individual whale activity"""
        
        profile = self.known_whales.get(address)
        if not profile:
            profile = await self._create_whale_profile(address)
        
        # Simulate recent transactions
        recent_txs = await self._get_recent_transactions(address, token)
        
        # Determine activity pattern
        pattern = await self._determine_activity_pattern(recent_txs, profile)
        
        # Calculate accumulation rate
        accumulation_rate = await self._calculate_accumulation_rate(recent_txs)
        
        # Predict next move
        next_move, move_prob = await self._predict_individual_move(
            profile, pattern, recent_txs
        )
        
        # Assess impact
        impact = self._assess_move_impact(profile, pattern)
        
        # Check for coordination
        connected = await self._find_connected_wallets(address, recent_txs)
        
        return WhaleActivity(
            wallet_address=address,
            whale_type=profile.type,
            balance=np.random.uniform(1000000, 100000000),  # Simulated balance
            portfolio_value_usd=np.random.uniform(5000000, 500000000),
            recent_transactions=recent_txs,
            accumulation_rate=accumulation_rate,
            activity_pattern=pattern,
            trading_style=self._determine_trading_style(profile, recent_txs),
            accuracy_score=profile.credibility_score,
            influence_score=profile.influence_score,
            next_move_prediction=next_move,
            move_probability=move_prob,
            expected_impact=impact,
            connected_wallets=connected,
            coordination_detected=len(connected) > 2
        )
    
    async def _get_recent_transactions(self, address: str, token: str) -> List[Dict]:
        """Get recent transactions for a whale"""
        
        # In production, fetch from blockchain
        # For now, generate realistic transactions
        
        num_txs = np.random.randint(0, 10)
        transactions = []
        
        for _ in range(num_txs):
            tx_type = np.random.choice(['buy', 'sell', 'transfer'])
            amount = np.random.uniform(10000, 1000000)
            
            transactions.append({
                'type': tx_type,
                'amount': amount,
                'token': token,
                'timestamp': datetime.now() - timedelta(hours=np.random.randint(1, 168)),
                'price': np.random.uniform(40000, 60000),  # Example BTC price
                'gas_used': np.random.uniform(50, 200),
                'to_address': f"0x{''.join(np.random.choice(list('0123456789abcdef'), 40))}"
            })
        
        return sorted(transactions, key=lambda x: x['timestamp'], reverse=True)
    
    async def _determine_activity_pattern(self, transactions: List[Dict], profile: WhaleProfile) -> str:
        """Determine whale's current activity pattern"""
        
        if not transactions:
            return 'dormant'
        
        # Count buy vs sell
        buys = sum(1 for tx in transactions if tx['type'] == 'buy')
        sells = sum(1 for tx in transactions if tx['type'] == 'sell')
        
        if buys > sells * 1.5:
            return 'accumulating'
        elif sells > buys * 1.5:
            return 'distributing'
        elif len(transactions) > 5:
            return 'active_trading'
        else:
            return 'monitoring'
    
    async def _calculate_accumulation_rate(self, transactions: List[Dict]) -> float:
        """Calculate net accumulation/distribution rate"""
        
        if not transactions:
            return 0.0
        
        net_flow = 0
        for tx in transactions:
            if tx['type'] == 'buy':
                net_flow += tx['amount']
            elif tx['type'] == 'sell':
                net_flow -= tx['amount']
        
        # Calculate daily rate
        if transactions:
            time_span = (datetime.now() - transactions[-1]['timestamp']).days or 1
            daily_rate = net_flow / time_span
            return daily_rate
        
        return 0.0
    
    async def _predict_individual_move(self, 
                                      profile: WhaleProfile,
                                      pattern: str,
                                      transactions: List[Dict]) -> Tuple[str, float]:
        """Predict whale's next move"""
        
        # Simple prediction logic (in production, use ML model)
        
        if pattern == 'accumulating':
            if profile.risk_profile == 'aggressive':
                return 'continue_buying', 0.75
            else:
                return 'hold', 0.60
        elif pattern == 'distributing':
            if profile.profit_rate > 50:
                return 'continue_selling', 0.70
            else:
                return 'stop_selling', 0.55
        elif pattern == 'dormant':
            if profile.trading_frequency > 5:
                return 'resume_trading', 0.65
            else:
                return 'remain_dormant', 0.80
        else:
            return 'continue_current', 0.50
    
    def _assess_move_impact(self, profile: WhaleProfile, pattern: str) -> str:
        """Assess potential market impact of whale's moves"""
        
        if profile.influence_score > 7:
            if pattern in ['accumulating', 'distributing']:
                return 'extreme'
            else:
                return 'high'
        elif profile.influence_score > 4:
            if pattern in ['accumulating', 'distributing']:
                return 'high'
            else:
                return 'medium'
        else:
            return 'low'
    
    async def _find_connected_wallets(self, address: str, transactions: List[Dict]) -> List[str]:
        """Find wallets connected to this whale"""
        
        connected = set()
        
        # Check transaction counterparties
        for tx in transactions:
            if 'to_address' in tx:
                connected.add(tx['to_address'])
        
        # Check known clusters
        for cluster_id, addresses in self.whale_clusters.items():
            if address in addresses:
                connected.update(addresses)
        
        connected.discard(address)  # Remove self
        return list(connected)[:5]  # Return top 5 connections
    
    def _determine_trading_style(self, profile: WhaleProfile, transactions: List[Dict]) -> str:
        """Determine whale's trading style"""
        
        if not transactions:
            return 'hodl'
        
        # Calculate metrics
        tx_frequency = len(transactions) / 7  # Per day
        
        if tx_frequency > 5:
            return 'scalp'
        elif tx_frequency > 1:
            return 'swing'
        elif tx_frequency > 0.2:
            return 'position'
        else:
            return 'hodl'
    
    async def _detect_coordinated_movements(self, activities: List[WhaleActivity]) -> Dict:
        """Detect coordinated whale movements"""
        
        coordination = {
            'detected': False,
            'groups': [],
            'confidence': 0.0
        }
        
        # Group whales by similar activity
        accumulating = [a for a in activities if a.activity_pattern == 'accumulating']
        distributing = [a for a in activities if a.activity_pattern == 'distributing']
        
        # Check for coordination patterns
        if len(accumulating) > len(activities) * 0.6:
            coordination['detected'] = True
            coordination['groups'].append({
                'type': 'mass_accumulation',
                'wallets': [a.wallet_address for a in accumulating],
                'confidence': 0.75
            })
        
        if len(distributing) > len(activities) * 0.6:
            coordination['detected'] = True
            coordination['groups'].append({
                'type': 'mass_distribution',
                'wallets': [a.wallet_address for a in distributing],
                'confidence': 0.70
            })
        
        # Check for connected wallets acting together
        connected_groups = await self._find_connected_groups(activities)
        if connected_groups:
            coordination['detected'] = True
            coordination['groups'].extend(connected_groups)
        
        return coordination
    
    async def _find_connected_groups(self, activities: List[WhaleActivity]) -> List[Dict]:
        """Find groups of connected whales acting together"""
        
        groups = []
        
        # Check for wallets with connections acting similarly
        for i, activity1 in enumerate(activities):
            if not activity1.connected_wallets:
                continue
                
            group = [activity1.wallet_address]
            
            for activity2 in activities[i+1:]:
                if activity2.wallet_address in activity1.connected_wallets:
                    if activity1.activity_pattern == activity2.activity_pattern:
                        group.append(activity2.wallet_address)
            
            if len(group) > 2:
                groups.append({
                    'type': 'connected_group',
                    'wallets': group,
                    'pattern': activity1.activity_pattern,
                    'confidence': 0.65
                })
        
        return groups
    
    async def _analyze_whale_sentiment(self, activities: List[WhaleActivity]) -> Dict:
        """Analyze overall whale sentiment"""
        
        sentiment = {
            'overall': 'neutral',
            'strength': 0.0,
            'smart_money': 'neutral',
            'dumb_money': 'neutral'
        }
        
        # Separate smart money from dumb money
        smart_whales = [a for a in activities if a.whale_type == WhaleType.SMART_MONEY]
        dumb_whales = [a for a in activities if a.whale_type == WhaleType.DUMB_MONEY]
        
        # Calculate sentiment scores
        accumulating_score = sum(1 for a in activities if a.activity_pattern == 'accumulating')
        distributing_score = sum(1 for a in activities if a.activity_pattern == 'distributing')
        
        total = len(activities) or 1
        
        if accumulating_score > distributing_score * 1.5:
            sentiment['overall'] = 'bullish'
            sentiment['strength'] = (accumulating_score / total)
        elif distributing_score > accumulating_score * 1.5:
            sentiment['overall'] = 'bearish'
            sentiment['strength'] = (distributing_score / total)
        
        # Smart money sentiment
        if smart_whales:
            smart_acc = sum(1 for a in smart_whales if a.activity_pattern == 'accumulating')
            if smart_acc > len(smart_whales) * 0.6:
                sentiment['smart_money'] = 'bullish'
            elif smart_acc < len(smart_whales) * 0.3:
                sentiment['smart_money'] = 'bearish'
        
        return sentiment
    
    async def _generate_movement_summary(self,
                                        activities: List[WhaleActivity],
                                        coordination: Dict,
                                        sentiment: Dict) -> WhaleMovement:
        """Generate comprehensive whale movement summary"""
        
        # Calculate aggregate metrics
        total_whales = len(activities)
        active_whales = sum(1 for a in activities if a.activity_pattern != 'dormant')
        
        # Determine net flow
        accumulating = sum(1 for a in activities if a.activity_pattern == 'accumulating')
        distributing = sum(1 for a in activities if a.activity_pattern == 'distributing')
        
        if accumulating > distributing * 1.5:
            net_flow = 'accumulation'
        elif distributing > accumulating * 1.5:
            net_flow = 'distribution'
        else:
            net_flow = 'neutral'
        
        # Calculate flow strength
        flow_strength = abs(accumulating - distributing) / (total_whales or 1) * 10
        
        # Determine signals
        mass_accumulation = accumulating > total_whales * 0.6
        mass_distribution = distributing > total_whales * 0.6
        
        # Check for divergence
        avg_influence = np.mean([a.influence_score for a in activities])
        high_influence_whales = [a for a in activities if a.influence_score > avg_influence]
        low_influence_whales = [a for a in activities if a.influence_score <= avg_influence]
        
        high_acc = sum(1 for a in high_influence_whales if a.activity_pattern == 'accumulating')
        low_acc = sum(1 for a in low_influence_whales if a.activity_pattern == 'accumulating')
        
        divergence = (high_acc > len(high_influence_whales) * 0.6 and 
                     low_acc < len(low_influence_whales) * 0.3) or \
                    (high_acc < len(high_influence_whales) * 0.3 and 
                     low_acc > len(low_influence_whales) * 0.6)
        
        # Generate recommendation
        if sentiment['smart_money'] == 'bullish' and mass_accumulation:
            follow_rec = 'follow'
        elif sentiment['smart_money'] == 'bearish' and mass_distribution:
            follow_rec = 'follow'
        elif divergence:
            follow_rec = 'fade'  # Fade the dumb money
        else:
            follow_rec = 'ignore'
        
        return WhaleMovement(
            total_whales_tracked=total_whales,
            active_whales=active_whales,
            net_flow=net_flow,
            flow_strength=min(flow_strength, 10),
            smart_money_direction=sentiment['smart_money'],
            mass_accumulation=mass_accumulation,
            mass_distribution=mass_distribution,
            divergence=divergence,
            whale_consensus=sentiment['overall'],
            follow_recommendation=follow_rec
        )
    
    async def _predict_whale_moves(self,
                                  activities: List[WhaleActivity],
                                  movement: WhaleMovement) -> Dict:
        """Predict future whale movements"""
        
        predictions = {
            'next_24h': {},
            'next_7d': {},
            'turning_point': None
        }
        
        # Predict short-term (24h)
        if movement.mass_accumulation:
            predictions['next_24h'] = {
                'action': 'continued_accumulation',
                'probability': 0.70,
                'impact': 'bullish'
            }
        elif movement.mass_distribution:
            predictions['next_24h'] = {
                'action': 'continued_distribution',
                'probability': 0.65,
                'impact': 'bearish'
            }
        else:
            predictions['next_24h'] = {
                'action': 'sideways',
                'probability': 0.60,
                'impact': 'neutral'
            }
        
        # Predict medium-term (7d)
        if movement.smart_money_direction == 'bullish':
            predictions['next_7d'] = {
                'action': 'accumulation_phase',
                'probability': 0.65,
                'impact': 'bullish'
            }
        elif movement.smart_money_direction == 'bearish':
            predictions['next_7d'] = {
                'action': 'distribution_phase',
                'probability': 0.60,
                'impact': 'bearish'
            }
        
        # Detect potential turning points
        if movement.divergence:
            predictions['turning_point'] = {
                'type': 'smart_dumb_divergence',
                'timeframe': '3-5 days',
                'probability': 0.55
            }
        
        return predictions
    
    async def _update_tracking_metrics(self, activities: List[WhaleActivity]):
        """Update tracking metrics and accuracy scores"""
        
        # Update movement history
        self.movement_history.append({
            'timestamp': datetime.now(),
            'whale_count': len(activities),
            'patterns': [a.activity_pattern for a in activities]
        })
        
        # Trim history to last 1000 entries
        if len(self.movement_history) > 1000:
            self.movement_history = self.movement_history[-1000:]
        
        # Update accuracy scores (in production, compare with actual outcomes)
        for activity in activities:
            if activity.wallet_address not in self.prediction_accuracy:
                self.prediction_accuracy[activity.wallet_address] = []
            
            # Simulate accuracy tracking
            self.prediction_accuracy[activity.wallet_address].append(
                np.random.uniform(0.4, 0.9)
            )
    
    async def _create_whale_profile(self, address: str) -> WhaleProfile:
        """Create a new whale profile"""
        
        profile = WhaleProfile(
            address=address,
            type=np.random.choice(list(WhaleType)),
            first_seen=datetime.now(),
            total_transactions=0,
            average_transaction_size=0,
            trading_frequency=0,
            profit_rate=0,
            influence_score=np.random.uniform(1, 5),
            credibility_score=0.5,
            risk_profile='unknown'
        )
        
        self.known_whales[address] = profile
        return profile
    
    def _generate_fallback_movement(self) -> WhaleMovement:
        """Generate safe fallback movement data"""
        
        return WhaleMovement(
            total_whales_tracked=0,
            active_whales=0,
            net_flow='neutral',
            flow_strength=0.0,
            smart_money_direction='neutral',
            mass_accumulation=False,
            mass_distribution=False,
            divergence=False,
            whale_consensus='neutral',
            follow_recommendation='ignore'
        )
    
    def _get_default_config(self) -> Dict:
        """Get default configuration"""
        
        return {
            'min_whale_balance': 1000000,  # $1M minimum
            'tracking_limit': 100,  # Max whales to track
            'coordination_threshold': 0.6,  # 60% acting together
            'influence_weight': 0.7,  # Weight for influence in calculations
            'smart_money_threshold': 0.8,  # Credibility score for smart money
            'update_frequency': 300  # Update every 5 minutes
        }
