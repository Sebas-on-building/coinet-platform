import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Star, 
  TrendingUp, 
  Users, 
  Download, 
  Search, 
  Filter,
  Crown,
  Zap,
  Shield,
  Target,
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import { killerAlertTemplates, getFeaturedTemplates, getTopPerformingTemplates, getMostPopularTemplates } from '@/data/killerAlertTemplatesSimple';
import { useAdvancedAlerts } from '@/hooks/useAdvancedAlerts';
import type { AlertTemplate } from '@/types/advancedAlerts';

interface AlertTemplatesMarketplaceProps {
  onCreateFromTemplate?: (templateId: string) => void;
}

export function AlertTemplatesMarketplace({ onCreateFromTemplate }: AlertTemplatesMarketplaceProps) {
  const { createFromTemplate } = useAdvancedAlerts();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popularity' | 'success_rate' | 'newest'>('popularity');

  const categories = [
    { id: 'all', label: 'All Templates', icon: <Target className="w-4 h-4" /> },
    { id: 'whale_intelligence', label: 'Whale Intelligence', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'derivatives', label: 'Derivatives', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'risk_management', label: 'Risk Management', icon: <Shield className="w-4 h-4" /> },
    { id: 'defi', label: 'DeFi', icon: <Zap className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <AlertTriangle className="w-4 h-4" /> }
  ];

  const getCategoryIcon = (category: string) => {
    const categoryInfo = categories.find(cat => cat.id === category);
    return categoryInfo?.icon || <Target className="w-4 h-4" />;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'whale_intelligence': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'derivatives': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'risk_management': return 'bg-red-500/10 text-red-600 border-red-200';
      case 'defi': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'security': return 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'tokenomics': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  const handleCreateFromTemplate = async (template: AlertTemplate) => {
    try {
      const alert = await createFromTemplate(template.id);
      if (alert && onCreateFromTemplate) {
        onCreateFromTemplate(template.id);
      }
    } catch (error) {
      console.error('Failed to create alert from template:', error);
    }
  };

  const filteredTemplates = killerAlertTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    switch (sortBy) {
      case 'popularity':
        return (b.popularity_score || 0) - (a.popularity_score || 0);
      case 'success_rate':
        return (b.success_rate || 0) - (a.success_rate || 0);
      case 'newest':
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Star className="w-6 h-6" />
          Alert Templates Marketplace
        </h2>
        <p className="text-muted-foreground">
          Professional-grade alert templates with proven track records
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search templates by name, description, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={sortBy === 'popularity' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('popularity')}
                >
                  <Users className="w-4 h-4 mr-1" />
                  Popular
                </Button>
                <Button
                  variant={sortBy === 'success_rate' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('success_rate')}
                >
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Best
                </Button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center gap-1"
                >
                  {category.icon}
                  {category.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Templates</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
          <TabsTrigger value="top">Top Performing</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedTemplates.map((template, index) => (
              <Card 
                key={template.id} 
                className="relative overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-border/50 hover:border-primary/30 group animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getCategoryIcon(template.category)}
                        {template.name}
                        {template.is_featured && (
                          <Crown className="w-4 h-4 text-yellow-500" />
                        )}
                      </CardTitle>
                      <Badge className={getCategoryColor(template.category)}>
                        {template.category.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-green-600">
                        {((template.success_rate || 0) * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Success Rate</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-lg font-bold">
                        {template.usage_count?.toLocaleString() || '0'}
                      </div>
                      <div className="text-xs text-muted-foreground">Uses</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-lg font-bold flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        {((template.popularity_score || 0) * 5).toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">Rating</div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Signals</div>
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 4).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag.replace('_', ' ')}
                        </Badge>
                      ))}
                      {template.tags.length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{template.tags.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Configuration Preview */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Configuration</div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Priority: {template.template_config.priority}</div>
                      <div>Signals: {template.template_config.signals.length}</div>
                      <div>Confidence: {((template.template_config.confidence_threshold || 0.7) * 100).toFixed(0)}%</div>
                    </div>
                  </div>

                  {/* Action */}
                  <Button
                    onClick={() => handleCreateFromTemplate(template)}
                    className="w-full transition-all duration-300 hover:scale-[1.02] shadow-md hover:shadow-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2 group-hover:animate-bounce" />
                    Use Template
                  </Button>
                </CardContent>

                {/* Feature badges */}
                <div className="absolute top-2 right-2 flex flex-col gap-1">
                  {template.is_featured && (
                    <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200 text-xs">
                      Featured
                    </Badge>
                  )}
                  {(template.success_rate || 0) > 0.8 && (
                    <Badge className="bg-green-500/10 text-green-600 border-green-200 text-xs">
                      High Success
                    </Badge>
                  )}
                  {(template.usage_count || 0) > 2000 && (
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-xs">
                      Popular
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="featured" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getFeaturedTemplates().map((template) => (
              <Card key={template.id} className="relative overflow-hidden border-2 border-yellow-200 hover:shadow-lg transition-shadow">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 to-yellow-600" />
                <CardHeader className="pb-3 pt-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Crown className="w-5 h-5 text-yellow-500" />
                        {template.name}
                      </CardTitle>
                      <Badge className={getCategoryColor(template.category)}>
                        {template.category.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="space-y-1">
                      <div className="text-xl font-bold text-green-600">
                        {((template.success_rate || 0) * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Success Rate</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xl font-bold">
                        {template.usage_count?.toLocaleString() || '0'}
                      </div>
                      <div className="text-xs text-muted-foreground">Uses</div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleCreateFromTemplate(template)}
                    className="w-full bg-yellow-600 hover:bg-yellow-700"
                    size="sm"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Use Featured Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="top" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getTopPerformingTemplates().map((template, index) => (
              <Card key={template.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                <div className="absolute top-2 left-2">
                  <Badge className="bg-green-500/10 text-green-600 border-green-200">
                    #{index + 1} Top Performer
                  </Badge>
                </div>
                
                <CardHeader className="pb-3 pt-12">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    {template.name}
                  </CardTitle>
                  <Badge className={getCategoryColor(template.category)}>
                    {template.category.replace('_', ' ')}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {((template.success_rate || 0) * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </div>

                  <Button
                    onClick={() => handleCreateFromTemplate(template)}
                    className="w-full"
                    size="sm"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Use High-Performance Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}