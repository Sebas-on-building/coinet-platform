import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Shield, 
  MessageSquare, 
  Zap,
  Activity,
  AlertTriangle,
  Eye,
  Clock,
  Target,
  Layers,
  Network
} from 'lucide-react';

interface EventCoverageProps {
  onCreateAlert?: (eventType: string) => void;
}

export function AdvancedEventCoverage({ onCreateAlert }: EventCoverageProps) {
  const [selectedCategory, setSelectedCategory] = useState<'microstructure' | 'onchain' | 'tokenomics' | 'risk' | 'social'>('microstructure');

  const eventCategories = {
    microstructure: {
      name: 'Market Microstructure',
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'bg-blue-500/10 text-blue-600 border-blue-200',
      description: 'Deep market structure anomalies and trading patterns',
      events: [
        {
          id: 'spread_shock',
          name: 'Spread/Depth Shock',
          description: 'Sudden widening of bid-ask spreads or depth collapse',
          coverage: 95,
          avgLatency: '450ms',
          falsePositiveRate: 0.08,
          status: 'active',
          signals: ['orderbook_imbalance', 'spread_volatility', 'depth_ratio']
        },
        {
          id: 'abnormal_slippage',
          name: 'Abnormal Slippage',
          description: 'Execution slippage significantly above historical norms',
          coverage: 87,
          avgLatency: '650ms',
          falsePositiveRate: 0.12,
          status: 'active',
          signals: ['execution_cost', 'market_impact', 'liquidity_depth']
        },
        {
          id: 'iceberg_detection',
          name: 'Iceberg Order Detection',
          description: 'Hidden large orders detected through pattern analysis',
          coverage: 73,
          avgLatency: '1.2s',
          falsePositiveRate: 0.15,
          status: 'beta',
          signals: ['order_flow_imbalance', 'size_distribution', 'time_clustering']
        },
        {
          id: 'quote_stuffing',
          name: 'Quote Stuffing',
          description: 'Excessive quote updates designed to slow down competitors',
          coverage: 91,
          avgLatency: '200ms',
          falsePositiveRate: 0.05,
          status: 'active',
          signals: ['quote_velocity', 'cancel_ratio', 'message_burst']
        },
        {
          id: 'cross_venue_divergence',
          name: 'Cross-Venue Price Divergence',
          description: 'Significant price differences across exchanges',
          coverage: 98,
          avgLatency: '300ms',
          falsePositiveRate: 0.03,
          status: 'active',
          signals: ['price_spread', 'arbitrage_opportunity', 'volume_weighted_deviation']
        }
      ]
    },
    onchain: {
      name: 'On-Chain Intelligence',
      icon: <Network className="w-5 h-5" />,
      color: 'bg-green-500/10 text-green-600 border-green-200',
      description: 'Blockchain transaction patterns and whale movements',
      events: [
        {
          id: 'whale_clustering',
          name: 'Whale Address Clustering',
          description: 'Smart money wallets acting in coordination',
          coverage: 85,
          avgLatency: '2.1s',
          falsePositiveRate: 0.09,
          status: 'active',
          signals: ['address_correlation', 'timing_synchronization', 'amount_clustering']
        },
        {
          id: 'fresh_wallet_patterns',
          name: 'Fresh Wallet Buying Patterns',
          description: 'New wallets with significant buying activity',
          coverage: 79,
          avgLatency: '1.5s',
          falsePositiveRate: 0.18,
          status: 'active',
          signals: ['wallet_age', 'initial_funding', 'purchase_velocity']
        },
        {
          id: 'cex_flow_analysis',
          name: 'CEX Inflow/Outflow Analysis',
          description: 'Large movements to/from centralized exchanges',
          coverage: 94,
          avgLatency: '800ms',
          falsePositiveRate: 0.06,
          status: 'active',
          signals: ['exchange_netflow', 'whale_deposits', 'timing_analysis']
        },
        {
          id: 'dex_liquidity_events',
          name: 'DEX Liquidity Events',
          description: 'Major liquidity additions or removals from AMMs',
          coverage: 88,
          avgLatency: '1.0s',
          falsePositiveRate: 0.11,
          status: 'active',
          signals: ['liquidity_delta', 'lp_token_supply', 'pool_composition']
        },
        {
          id: 'bridge_flow_monitoring',
          name: 'Bridge Flow Monitoring',
          description: 'Cross-chain asset movements and anomalies',
          coverage: 71,
          avgLatency: '3.2s',
          falsePositiveRate: 0.22,
          status: 'experimental',
          signals: ['bridge_volume', 'cross_chain_arbitrage', 'settlement_time']
        }
      ]
    },
    tokenomics: {
      name: 'Tokenomics & Governance',
      icon: <Target className="w-5 h-5" />,
      color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
      description: 'Token supply dynamics and governance activity',
      events: [
        {
          id: 'unlock_monitoring',
          name: 'Token Unlock Monitoring',
          description: 'Upcoming vesting and unlock events with impact analysis',
          coverage: 96,
          avgLatency: '5m',
          falsePositiveRate: 0.02,
          status: 'active',
          signals: ['vesting_schedule', 'historical_impact', 'holder_distribution']
        },
        {
          id: 'emissions_changes',
          name: 'Emissions Rate Changes',
          description: 'Changes in token inflation or reward rates',
          coverage: 83,
          avgLatency: '10m',
          falsePositiveRate: 0.07,
          status: 'active',
          signals: ['emission_rate', 'staking_rewards', 'governance_proposals']
        },
        {
          id: 'governance_activity',
          name: 'Governance Activity Spikes',
          description: 'Unusual voting activity or proposal submissions',
          coverage: 77,
          avgLatency: '15m',
          falsePositiveRate: 0.13,
          status: 'active',
          signals: ['voting_turnout', 'proposal_frequency', 'delegate_activity']
        },
        {
          id: 'treasury_movements',
          name: 'Treasury/Multisig Movements',
          description: 'Large movements from project treasury wallets',
          coverage: 89,
          avgLatency: '2m',
          falsePositiveRate: 0.08,
          status: 'active',
          signals: ['treasury_balance', 'multisig_activity', 'spending_velocity']
        }
      ]
    },
    risk: {
      name: 'Risk & Security',
      icon: <Shield className="w-5 h-5" />,
      color: 'bg-red-500/10 text-red-600 border-red-200',
      description: 'Security threats and risk management signals',
      events: [
        {
          id: 'oracle_deviations',
          name: 'Oracle Price Deviations',
          description: 'Price feed anomalies and manipulation attempts',
          coverage: 99,
          avgLatency: '100ms',
          falsePositiveRate: 0.01,
          status: 'active',
          signals: ['price_deviation', 'feed_staleness', 'source_divergence']
        },
        {
          id: 'depeg_proximity',
          name: 'Stablecoin Depeg Risk',
          description: 'Early warning system for stablecoin depegging',
          coverage: 97,
          avgLatency: '250ms',
          falsePositiveRate: 0.03,
          status: 'active',
          signals: ['peg_deviation', 'redemption_pressure', 'backing_ratio']
        },
        {
          id: 'contract_upgrades',
          name: 'Risky Contract Upgrades',
          description: 'Smart contract upgrades with security implications',
          coverage: 74,
          avgLatency: '5m',
          falsePositiveRate: 0.16,
          status: 'beta',
          signals: ['code_diff_analysis', 'permission_changes', 'upgrade_timelock']
        },
        {
          id: 'exploit_patterns',
          name: 'Exploit Pattern Detection',
          description: 'Transaction patterns consistent with known exploits',
          coverage: 68,
          avgLatency: '2.5s',
          falsePositiveRate: 0.25,
          status: 'experimental',
          signals: ['tx_pattern_matching', 'reentrancy_detection', 'flash_loan_abuse']
        }
      ]
    },
    social: {
      name: 'Social & Development',
      icon: <MessageSquare className="w-5 h-5" />,
      color: 'bg-purple-500/10 text-purple-600 border-purple-200',
      description: 'Social sentiment and development activity monitoring',
      events: [
        {
          id: 'mention_velocity',
          name: 'Social Mention Velocity',
          description: 'Rapid acceleration in social media mentions',
          coverage: 82,
          avgLatency: '30s',
          falsePositiveRate: 0.19,
          status: 'active',
          signals: ['mention_count', 'velocity_change', 'platform_distribution']
        },
        {
          id: 'sentiment_inflection',
          name: 'Sentiment Inflection Points',
          description: 'Sharp changes in overall sentiment direction',
          coverage: 76,
          avgLatency: '1m',
          falsePositiveRate: 0.23,
          status: 'active',
          signals: ['sentiment_score', 'momentum_shift', 'influence_weighted']
        },
        {
          id: 'dev_activity_bursts',
          name: 'Development Activity Bursts',
          description: 'Unusual spikes in repository commits and releases',
          coverage: 71,
          avgLatency: '10m',
          falsePositiveRate: 0.14,
          status: 'active',
          signals: ['commit_frequency', 'contributor_activity', 'release_cadence']
        },
        {
          id: 'rumor_clustering',
          name: 'Credible Rumor Clustering',
          description: 'Correlation of rumors across multiple credible sources',
          coverage: 63,
          avgLatency: '5m',
          falsePositiveRate: 0.31,
          status: 'experimental',
          signals: ['source_credibility', 'rumor_correlation', 'verification_score']
        }
      ]
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'beta': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
      case 'experimental': return 'bg-red-500/10 text-red-600 border-red-200';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="w-3 h-3" />;
      case 'beta': return <Clock className="w-3 h-3" />;
      case 'experimental': return <AlertTriangle className="w-3 h-3" />;
      default: return <Eye className="w-3 h-3" />;
    }
  };

  const currentCategory = eventCategories[selectedCategory];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="w-6 h-6" />
          Advanced Event Coverage
        </h2>
        <p className="text-muted-foreground">
          Comprehensive monitoring across all crypto market dimensions
        </p>
      </div>

      {/* Category Selector */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(eventCategories).map(([key, category]) => (
          <Button
            key={key}
            variant={selectedCategory === key ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(key as any)}
            className="flex items-center gap-2"
          >
            {category.icon}
            {category.name}
          </Button>
        ))}
      </div>

      {/* Current Category Overview */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${currentCategory.color}`}>
                {currentCategory.icon}
              </div>
              <div>
                <CardTitle className="text-xl">{currentCategory.name}</CardTitle>
                <p className="text-muted-foreground">{currentCategory.description}</p>
              </div>
            </div>
            <Badge className={currentCategory.color}>
              {currentCategory.events.length} Events
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Event Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {currentCategory.events.map((event) => (
          <Card key={event.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-lg">{event.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                </div>
                <Badge className={getStatusColor(event.status)}>
                  {getStatusIcon(event.status)}
                  {event.status}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Performance Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold">{event.coverage}%</div>
                  <div className="text-xs text-muted-foreground">Coverage</div>
                  <Progress value={event.coverage} className="h-1 mt-1" />
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{event.avgLatency}</div>
                  <div className="text-xs text-muted-foreground">Avg Latency</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{(event.falsePositiveRate * 100).toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">False Positive</div>
                </div>
              </div>

              {/* Signal Sources */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Signal Sources</div>
                <div className="flex flex-wrap gap-1">
                  {event.signals.map((signal, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {signal.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Action */}
              <Button
                onClick={() => onCreateAlert?.(event.id)}
                className="w-full"
                size="sm"
                disabled={event.status === 'experimental'}
              >
                <Zap className="w-4 h-4 mr-2" />
                Create Alert
              </Button>
            </CardContent>

            {/* Quality indicator */}
            {event.coverage > 90 && event.falsePositiveRate < 0.1 && (
              <div className="absolute top-2 right-2">
                <Badge className="bg-green-500/10 text-green-600 border-green-200 text-xs">
                  High Quality
                </Badge>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Event Coverage Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold">
                {Object.values(eventCategories).reduce((sum, cat) => sum + cat.events.length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Events</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(eventCategories).reduce((sum, cat) => 
                  sum + cat.events.filter(e => e.status === 'active').length, 0
                )}
              </div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-yellow-600">
                {Object.values(eventCategories).reduce((sum, cat) => 
                  sum + cat.events.filter(e => e.status === 'beta').length, 0
                )}
              </div>
              <div className="text-sm text-muted-foreground">Beta</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold">
                {(Object.values(eventCategories).reduce((sum, cat) => 
                  sum + cat.events.reduce((catSum, event) => catSum + event.coverage, 0), 0
                ) / Object.values(eventCategories).reduce((sum, cat) => sum + cat.events.length, 0)).toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Coverage</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}