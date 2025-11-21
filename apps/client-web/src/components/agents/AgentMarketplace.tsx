import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/utils/haptics';
import {
  Search,
  Star,
  Download,
  TrendingUp,
  Users,
  CheckCircle2,
  Filter,
  SortAsc,
  Sparkles,
  Award,
  Zap,
  Bot,
  BarChart3,
  Newspaper,
} from 'lucide-react';
import { agentTemplates } from '@/data/agentTemplates';
import { AgentTemplate } from '@/types/agents';
import { toast } from 'sonner';

interface MarketplaceTemplate extends AgentTemplate {
  downloads: number;
  rating: number;
  reviews: number;
  author: string;
  isFeatured: boolean;
  isPro: boolean;
  tags: string[];
  lastUpdated: string;
}

const categoryIcons = {
  trading: Zap,
  research: Newspaper,
  defi: Bot,
  analysis: BarChart3,
  general: Sparkles,
};

// Enhanced marketplace templates with metadata
const marketplaceTemplates: MarketplaceTemplate[] = agentTemplates.map((template, index) => ({
  ...template,
  downloads: Math.floor(Math.random() * 10000) + 100,
  rating: 4 + Math.random(),
  reviews: Math.floor(Math.random() * 500) + 10,
  author: ['CoinetAI', 'TradeMaster', 'DeFiGuru', 'AlphaSeeker'][index % 4],
  isFeatured: index < 3,
  isPro: index % 3 === 0,
  tags: template.expertise.slice(0, 3),
  lastUpdated: '2 days ago',
}));

interface AgentMarketplaceProps {
  onInstallTemplate: (template: AgentTemplate) => void;
  className?: string;
}

export function AgentMarketplace({ onInstallTemplate, className }: AgentMarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'recent'>('popular');
  const [selectedTemplate, setSelectedTemplate] = useState<MarketplaceTemplate | null>(null);

  const filteredTemplates = useMemo(() => {
    let filtered = marketplaceTemplates;

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'popular') return b.downloads - a.downloads;
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0; // recent
    });

    return filtered;
  }, [searchQuery, selectedCategory, sortBy]);

  const handleInstall = (template: MarketplaceTemplate) => {
    triggerHaptic('success');
    onInstallTemplate(template);
    toast.success(`${template.name} installed successfully!`);
    setSelectedTemplate(null);
  };

  const categories = [
    { id: 'all', label: 'All Templates', count: marketplaceTemplates.length },
    { id: 'trading', label: 'Trading', count: marketplaceTemplates.filter((t) => t.category === 'trading').length },
    { id: 'analysis', label: 'Analysis', count: marketplaceTemplates.filter((t) => t.category === 'analysis').length },
    { id: 'research', label: 'Research', count: marketplaceTemplates.filter((t) => t.category === 'research').length },
    { id: 'defi', label: 'DeFi', count: marketplaceTemplates.filter((t) => t.category === 'defi').length },
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Agent Marketplace</h2>
        <p className="text-muted-foreground">
          Discover and install pre-built AI agents for trading, research, and analysis
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              const next = sortBy === 'popular' ? 'rating' : sortBy === 'rating' ? 'recent' : 'popular';
              setSortBy(next);
            }}
          >
            <SortAsc className="w-4 h-4" />
            {sortBy === 'popular' ? 'Popular' : sortBy === 'rating' ? 'Rating' : 'Recent'}
          </Button>
        </div>
      </div>

      {/* Categories */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {categories.map((category) => (
            <TabsTrigger key={category.id} value={category.id} className="gap-2">
              {category.label}
              <Badge variant="secondary" className="text-xs">
                {category.count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Featured Templates */}
      {selectedCategory === 'all' && filteredTemplates.some((t) => t.isFeatured) && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Featured Templates</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredTemplates
              .filter((t) => t.isFeatured)
              .map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={setSelectedTemplate}
                  featured
                />
              ))}
          </div>
        </div>
      )}

      {/* All Templates */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {selectedCategory === 'all' ? 'All Templates' : `${selectedCategory} Templates`}
        </h3>
        <ScrollArea className="h-[600px] pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} onSelect={setSelectedTemplate} />
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No templates found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Template Details Dialog */}
      {selectedTemplate && (
        <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${selectedTemplate.color}20` }}
                  >
                    {(() => {
                      const Icon = categoryIcons[selectedTemplate.category];
                      return <Icon className="w-6 h-6" style={{ color: selectedTemplate.color }} />;
                    })()}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedTemplate.name}</DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{selectedTemplate.category}</Badge>
                      {selectedTemplate.isPro && (
                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500">PRO</Badge>
                      )}
                      {selectedTemplate.isFeatured && <Badge variant="outline">Featured</Badge>}
                    </div>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Download className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-semibold">{selectedTemplate.downloads.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Downloads</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Star className="w-4 h-4 mx-auto mb-1 text-yellow-500" />
                  <div className="font-semibold">{selectedTemplate.rating.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">Rating</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Users className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-semibold">{selectedTemplate.reviews}</div>
                  <div className="text-xs text-muted-foreground">Reviews</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <TrendingUp className="w-4 h-4 mx-auto mb-1 text-green-500" />
                  <div className="font-semibold">{selectedTemplate.lastUpdated}</div>
                  <div className="text-xs text-muted-foreground">Updated</div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-muted-foreground">{selectedTemplate.description}</p>
              </div>

              {/* Personality */}
              <div>
                <h4 className="font-semibold mb-2">Personality</h4>
                <p className="text-sm text-muted-foreground">{selectedTemplate.personality}</p>
              </div>

              {/* Expertise */}
              <div>
                <h4 className="font-semibold mb-2">Expertise</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.expertise.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* System Prompt Preview */}
              <div>
                <h4 className="font-semibold mb-2">System Prompt</h4>
                <ScrollArea className="h-32 rounded-lg border border-border p-3">
                  <p className="text-sm text-muted-foreground font-mono">{selectedTemplate.systemPrompt}</p>
                </ScrollArea>
              </div>

              {/* Author */}
              <div>
                <h4 className="font-semibold mb-2">Author</h4>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{selectedTemplate.author}</div>
                    <div className="text-xs text-muted-foreground">Verified Creator</div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-blue-500 ml-auto" />
                </div>
              </div>

              {/* Install Button */}
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => handleInstall(selectedTemplate)}>
                  <Download className="w-4 h-4 mr-2" />
                  Install Template
                </Button>
                <Button variant="outline">Preview</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface TemplateCardProps {
  template: MarketplaceTemplate;
  onSelect: (template: MarketplaceTemplate) => void;
  featured?: boolean;
}

function TemplateCard({ template, onSelect, featured }: TemplateCardProps) {
  const Icon = categoryIcons[template.category];

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1',
        featured && 'border-primary/50 shadow-md'
      )}
      onClick={() => {
        triggerHaptic('light');
        onSelect(template);
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${template.color}20` }}
          >
            <Icon className="w-5 h-5" style={{ color: template.color }} />
          </div>
          <div className="flex gap-1">
            {template.isPro && <Badge className="text-xs bg-gradient-to-r from-yellow-500 to-orange-500">PRO</Badge>}
            {template.isFeatured && <Badge variant="outline" className="text-xs">Featured</Badge>}
          </div>
        </div>
        <CardTitle className="text-base mt-3">{template.name}</CardTitle>
        <CardDescription className="text-sm line-clamp-2">{template.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{template.tags.length - 2}
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Download className="w-3 h-3" />
            {template.downloads > 1000
              ? `${(template.downloads / 1000).toFixed(1)}K`
              : template.downloads}
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
            <span className="font-medium">{template.rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({template.reviews})</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
