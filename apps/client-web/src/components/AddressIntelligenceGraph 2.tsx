import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  Eye, 
  Filter,
  Search,
  Network,
  Star,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import type { WhaleAddress, WhaleActivity } from '@/types/advancedAlerts';

interface AddressIntelligenceGraphProps {
  addresses?: WhaleAddress[];
  activities?: WhaleActivity[];
  onAddressSelect?: (address: WhaleAddress) => void;
  onCreateAlert?: (clusterId: string) => void;
}

export function AddressIntelligenceGraph({ 
  addresses = [], 
  activities = [], 
  onAddressSelect,
  onCreateAlert 
}: AddressIntelligenceGraphProps) {
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  // Mock data for demonstration
  const mockClusters = [
    {
      id: 'smart_money_1',
      name: 'Ethereum Whales Cluster',
      description: 'High-conviction ETH accumulation addresses',
      addresses: 47,
      totalVolume: 125400000,
      successRate: 0.78,
      averageHoldTime: '45d',
      confidence: 0.92,
      category: 'smart_money',
      recentActivity: 'Accumulating ETH & stETH',
      lastActive: '2h ago',
      riskLevel: 'low' as const,
      topHoldings: ['ETH', 'stETH', 'WBTC', 'USDC'],
      performance7d: 0.12,
      performance30d: 0.34
    },
    {
      id: 'defi_yield_farmers',
      name: 'DeFi Yield Farmers',
      description: 'Active yield farming and liquidity provision',
      addresses: 23,
      totalVolume: 67800000,
      successRate: 0.65,
      averageHoldTime: '12d',
      confidence: 0.84,
      category: 'defi_native',
      recentActivity: 'Rotating between protocols',
      lastActive: '15m ago',
      riskLevel: 'medium' as const,
      topHoldings: ['CRV', 'CVX', 'LDO', 'AURA'],
      performance7d: 0.08,
      performance30d: 0.19
    },
    {
      id: 'arbitrage_bots',
      name: 'MEV/Arbitrage Operators',
      description: 'Automated arbitrage and MEV extraction',
      addresses: 12,
      totalVolume: 234500000,
      successRate: 0.89,
      averageHoldTime: '3h',
      confidence: 0.96,
      category: 'mev_operator',
      recentActivity: 'CEX-DEX arbitrage',
      lastActive: '5m ago',
      riskLevel: 'low' as const,
      topHoldings: ['ETH', 'USDC', 'WETH', 'DAI'],
      performance7d: 0.03,
      performance30d: 0.15
    },
    {
      id: 'insider_trading',
      name: 'Potential Insider Activity',
      description: 'Suspicious pre-announcement accumulation',
      addresses: 8,
      totalVolume: 45200000,
      successRate: 0.94,
      averageHoldTime: '7d',
      confidence: 0.71,
      category: 'suspicious',
      recentActivity: 'Pre-listing accumulation',
      lastActive: '1h ago',
      riskLevel: 'high' as const,
      topHoldings: ['Various altcoins'],
      performance7d: 0.45,
      performance30d: 0.78
    }
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'smart_money': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'defi_native': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'mev_operator': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'suspicious': return 'bg-red-500/10 text-red-600 border-red-200';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low': return <CheckCircle className="w-4 h-4" />;
      case 'medium': return <Clock className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    }
    return `$${(volume / 1000).toFixed(0)}K`;
  };

  const formatPerformance = (perf: number) => {
    return `${perf > 0 ? '+' : ''}${(perf * 100).toFixed(1)}%`;
  };

  const filteredClusters = mockClusters.filter(cluster => {
    const matchesSearch = cluster.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cluster.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || cluster.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Network className="w-6 h-6" />
          Address Intelligence Graph
        </h2>
        <p className="text-muted-foreground">
          Live clustering of smart money and whale addresses with behavioral analysis
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search clusters, addresses, or patterns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                All
              </Button>
              <Button
                variant={selectedCategory === 'smart_money' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('smart_money')}
              >
                Smart Money
              </Button>
              <Button
                variant={selectedCategory === 'defi_native' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('defi_native')}
              >
                DeFi
              </Button>
              <Button
                variant={selectedCategory === 'mev_operator' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('mev_operator')}
              >
                MEV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="clusters" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="clusters">Smart Clusters</TabsTrigger>
          <TabsTrigger value="activity">Live Activity</TabsTrigger>
          <TabsTrigger value="analytics">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="clusters" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredClusters.map((cluster) => (
              <Card key={cluster.id} className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {cluster.name}
                        <Badge className={getCategoryColor(cluster.category)}>
                          {cluster.category.replace('_', ' ')}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {cluster.description}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1 ${getRiskColor(cluster.riskLevel)}`}>
                      {getRiskIcon(cluster.riskLevel)}
                      <span className="text-xs font-medium">{cluster.riskLevel}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        Addresses
                      </div>
                      <div className="text-2xl font-bold">{cluster.addresses}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <DollarSign className="w-4 h-4" />
                        Volume
                      </div>
                      <div className="text-2xl font-bold">{formatVolume(cluster.totalVolume)}</div>
                    </div>
                  </div>

                  {/* Confidence & Success Rate */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Confidence Score</span>
                        <span className="font-medium">{(cluster.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={cluster.confidence * 100} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Success Rate</span>
                        <span className="font-medium">{(cluster.successRate * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={cluster.successRate * 100} className="h-2" />
                    </div>
                  </div>

                  {/* Performance */}
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">7d Performance</div>
                      <div className={`text-lg font-bold flex items-center gap-1 ${
                        cluster.performance7d > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {cluster.performance7d > 0 ? 
                          <TrendingUp className="w-4 h-4" /> : 
                          <TrendingDown className="w-4 h-4" />
                        }
                        {formatPerformance(cluster.performance7d)}
                      </div>
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="text-sm text-muted-foreground">30d Performance</div>
                      <div className={`text-lg font-bold flex items-center gap-1 ${
                        cluster.performance30d > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {cluster.performance30d > 0 ? 
                          <TrendingUp className="w-4 h-4" /> : 
                          <TrendingDown className="w-4 h-4" />
                        }
                        {formatPerformance(cluster.performance30d)}
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Recent Activity</div>
                    <div className="text-sm text-muted-foreground">{cluster.recentActivity}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last active: {cluster.lastActive}
                    </div>
                  </div>

                  {/* Top Holdings */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Top Holdings</div>
                    <div className="flex flex-wrap gap-1">
                      {cluster.topHoldings.map((holding, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {holding}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => onCreateAlert?.(cluster.id)}
                      className="flex-1"
                    >
                      Create Alert
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedCluster(cluster.id)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>

                {/* Feature indicator */}
                {cluster.confidence > 0.9 && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
                      <Star className="w-3 h-3 mr-1" />
                      High Confidence
                    </Badge>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Live Whale Activity Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Live activity feed coming soon</p>
                  <p className="text-sm">Real-time whale transactions and cluster movements</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Total Clusters</div>
                  <div className="text-2xl font-bold">{mockClusters.length}</div>
                  <div className="text-xs text-green-600">+2 this week</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Tracked Addresses</div>
                  <div className="text-2xl font-bold">
                    {mockClusters.reduce((sum, cluster) => sum + cluster.addresses, 0)}
                  </div>
                  <div className="text-xs text-green-600">+12 this week</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Avg Success Rate</div>
                  <div className="text-2xl font-bold">
                    {((mockClusters.reduce((sum, cluster) => sum + cluster.successRate, 0) / mockClusters.length) * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-green-600">+3.2% this month</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Total Volume</div>
                  <div className="text-2xl font-bold">
                    {formatVolume(mockClusters.reduce((sum, cluster) => sum + cluster.totalVolume, 0))}
                  </div>
                  <div className="text-xs text-green-600">+15% this week</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}