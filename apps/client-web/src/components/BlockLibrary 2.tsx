import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { 
  Search, 
  X, 
  Zap, 
  BarChart3, 
  Settings, 
  Database, 
  Brain,
  TrendingUp,
  Shield,
  Bell,
  DollarSign,
  Activity,
  Clock,
  Target,
  Filter,
  Plus
} from 'lucide-react';

interface BlockTemplate {
  id: string;
  name: string;
  description: string;
  category: 'trigger' | 'condition' | 'action' | 'data' | 'ai';
  icon: React.ReactNode;
  complexity: 'basic' | 'intermediate' | 'advanced';
  tags: string[];
  data: any;
}

const blockTemplates: BlockTemplate[] = [
  // Trigger Blocks
  {
    id: 'price-trigger',
    name: 'Price Movement',
    description: 'Triggers on price changes above threshold',
    category: 'trigger',
    icon: <TrendingUp className="h-4 w-4" />,
    complexity: 'basic',
    tags: ['price', 'movement', 'threshold'],
    data: {
      label: 'Price Movement Trigger',
      inputs: ['Asset Selection', 'Price Threshold', 'Direction'],
      thresholdType: 'percentage',
      defaultThreshold: 5
    }
  },
  {
    id: 'volume-trigger',
    name: 'Volume Spike',
    description: 'Activates on unusual volume activity',
    category: 'trigger',
    icon: <Activity className="h-4 w-4" />,
    complexity: 'basic',
    tags: ['volume', 'spike', 'activity'],
    data: {
      label: 'Volume Spike Trigger',
      inputs: ['Volume Multiplier', 'Time Window', 'Asset'],
      defaultMultiplier: 3
    }
  },
  {
    id: 'time-trigger',
    name: 'Time Schedule',
    description: 'Executes at specific times or intervals',
    category: 'trigger',
    icon: <Clock className="h-4 w-4" />,
    complexity: 'basic',
    tags: ['time', 'schedule', 'cron'],
    data: {
      label: 'Time Schedule Trigger',
      inputs: ['Schedule Type', 'Time/Interval', 'Timezone'],
      scheduleTypes: ['daily', 'weekly', 'monthly', 'custom']
    }
  },
  
  // Condition Blocks
  {
    id: 'technical-indicator',
    name: 'Technical Indicator',
    description: 'Evaluates technical analysis indicators',
    category: 'condition',
    icon: <BarChart3 className="h-4 w-4" />,
    complexity: 'intermediate',
    tags: ['technical', 'indicator', 'analysis'],
    data: {
      label: 'Technical Indicator',
      parameters: ['Indicator Type', 'Period', 'Threshold'],
      indicators: ['RSI', 'MACD', 'Bollinger Bands', 'Moving Average']
    }
  },
  {
    id: 'risk-check',
    name: 'Risk Assessment',
    description: 'Validates risk parameters before execution',
    category: 'condition',
    icon: <Shield className="h-4 w-4" />,
    complexity: 'advanced',
    tags: ['risk', 'safety', 'validation'],
    data: {
      label: 'Risk Assessment',
      parameters: ['Max Position Size', 'Portfolio Exposure', 'VaR Limit'],
      riskTypes: ['position', 'portfolio', 'market']
    }
  },
  {
    id: 'market-condition',
    name: 'Market Condition',
    description: 'Checks overall market state and sentiment',
    category: 'condition',
    icon: <Filter className="h-4 w-4" />,
    complexity: 'intermediate',
    tags: ['market', 'sentiment', 'condition'],
    data: {
      label: 'Market Condition',
      parameters: ['Market Phase', 'Volatility Level', 'Sentiment Score'],
      conditions: ['bullish', 'bearish', 'sideways', 'volatile']
    }
  },
  
  // Action Blocks
  {
    id: 'trade-execution',
    name: 'Execute Trade',
    description: 'Places buy/sell orders with specified parameters',
    category: 'action',
    icon: <DollarSign className="h-4 w-4" />,
    complexity: 'basic',
    tags: ['trade', 'order', 'execution'],
    data: {
      label: 'Execute Trade',
      outputs: ['Order Type', 'Quantity', 'Price Strategy'],
      orderTypes: ['market', 'limit', 'stop', 'stop-limit']
    }
  },
  {
    id: 'notification',
    name: 'Send Notification',
    description: 'Sends alerts via email, SMS, or push',
    category: 'action',
    icon: <Bell className="h-4 w-4" />,
    complexity: 'basic',
    tags: ['notification', 'alert', 'message'],
    data: {
      label: 'Send Notification',
      outputs: ['Channel', 'Message Template', 'Recipients'],
      channels: ['email', 'sms', 'push', 'webhook']
    }
  },
  {
    id: 'position-management',
    name: 'Manage Position',
    description: 'Adjusts existing positions (stop-loss, take-profit)',
    category: 'action',
    icon: <Target className="h-4 w-4" />,
    complexity: 'intermediate',
    tags: ['position', 'management', 'adjustment'],
    data: {
      label: 'Manage Position',
      outputs: ['Action Type', 'Target Price', 'Percentage'],
      actions: ['set-stop-loss', 'set-take-profit', 'scale-out', 'close']
    }
  },
  
  // Data Blocks
  {
    id: 'market-data',
    name: 'Market Data',
    description: 'Real-time price and volume data',
    category: 'data',
    icon: <Database className="h-4 w-4" />,
    complexity: 'basic',
    tags: ['market', 'price', 'realtime'],
    data: {
      label: 'Market Data Feed',
      updateRate: '100ms',
      cost: 'Free',
      dataTypes: ['price', 'volume', 'orderbook', 'trades']
    }
  },
  {
    id: 'social-sentiment',
    name: 'Social Sentiment',
    description: 'Aggregated sentiment from social media',
    category: 'data',
    icon: <Database className="h-4 w-4" />,
    complexity: 'intermediate',
    tags: ['sentiment', 'social', 'analysis'],
    data: {
      label: 'Social Sentiment Data',
      updateRate: '1m',
      cost: '$0.01/call',
      sources: ['twitter', 'reddit', 'telegram', 'news']
    }
  },
  
  // AI Blocks
  {
    id: 'sentiment-analysis',
    name: 'AI Sentiment Analysis',
    description: 'Advanced sentiment scoring using AI',
    category: 'ai',
    icon: <Brain className="h-4 w-4" />,
    complexity: 'advanced',
    tags: ['ai', 'sentiment', 'nlp'],
    data: {
      label: 'AI Sentiment Analysis',
      model: 'GPT-4',
      confidence: '95%',
      features: ['emotion-detection', 'entity-sentiment', 'trend-analysis']
    }
  },
  {
    id: 'pattern-recognition',
    name: 'Pattern Recognition',
    description: 'Identifies chart patterns and formations',
    category: 'ai',
    icon: <Brain className="h-4 w-4" />,
    complexity: 'advanced',
    tags: ['ai', 'pattern', 'technical'],
    data: {
      label: 'Pattern Recognition',
      model: 'Custom CNN',
      confidence: '87%',
      patterns: ['head-shoulders', 'triangles', 'flags', 'cups']
    }
  }
];

interface BlockLibraryProps {
  onAddBlock: (blockType: string, blockData: any) => void;
  onClose: () => void;
}

export const BlockLibrary: React.FC<BlockLibraryProps> = ({ onAddBlock, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedComplexity, setSelectedComplexity] = useState<string | null>(null);

  const filteredBlocks = blockTemplates.filter(block => {
    const matchesSearch = block.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         block.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         block.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesComplexity = !selectedComplexity || block.complexity === selectedComplexity;
    
    return matchesSearch && matchesComplexity;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'trigger': return 'bg-blue-500';
      case 'condition': return 'bg-orange-500';
      case 'action': return 'bg-green-500';
      case 'data': return 'bg-purple-500';
      case 'ai': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'basic': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="h-full rounded-none border-0 border-r">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Block Library</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search blocks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={selectedComplexity === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedComplexity(null)}
            >
              All
            </Button>
            <Button
              variant={selectedComplexity === 'basic' ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedComplexity('basic')}
            >
              Basic
            </Button>
            <Button
              variant={selectedComplexity === 'intermediate' ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedComplexity('intermediate')}
            >
              Inter
            </Button>
            <Button
              variant={selectedComplexity === 'advanced' ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedComplexity('advanced')}
            >
              Adv
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs defaultValue="all" className="h-full">
          <TabsList className="grid grid-cols-6 mx-4 mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="trigger">
              <Zap className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="condition">
              <BarChart3 className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="action">
              <Settings className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="data">
              <Database className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Brain className="h-3 w-3" />
            </TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <TabsContent value="all" className="px-4 mt-0">
              <div className="space-y-3">
                {filteredBlocks.map((block) => (
                  <BlockItem
                    key={block.id}
                    block={block}
                    onAdd={onAddBlock}
                    getCategoryColor={getCategoryColor}
                    getComplexityColor={getComplexityColor}
                  />
                ))}
              </div>
            </TabsContent>
            
            {['trigger', 'condition', 'action', 'data', 'ai'].map((category) => (
              <TabsContent key={category} value={category} className="px-4 mt-0">
                <div className="space-y-3">
                  {filteredBlocks
                    .filter(block => block.category === category)
                    .map((block) => (
                      <BlockItem
                        key={block.id}
                        block={block}
                        onAdd={onAddBlock}
                        getCategoryColor={getCategoryColor}
                        getComplexityColor={getComplexityColor}
                      />
                    ))}
                </div>
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
};

interface BlockItemProps {
  block: BlockTemplate;
  onAdd: (blockType: string, blockData: any) => void;
  getCategoryColor: (category: string) => string;
  getComplexityColor: (complexity: string) => string;
}

const BlockItem: React.FC<BlockItemProps> = ({ block, onAdd, getCategoryColor, getComplexityColor }) => {
  return (
    <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer group">
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded ${getCategoryColor(block.category)} text-white`}>
              {block.icon}
            </div>
            <div>
              <div className="font-medium text-sm">{block.name}</div>
              <div className="text-xs text-muted-foreground">{block.description}</div>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAdd(block.category, block.data)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <Badge className={`text-xs ${getComplexityColor(block.complexity)}`}>
            {block.complexity}
          </Badge>
          <div className="flex flex-wrap gap-1">
            {block.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};