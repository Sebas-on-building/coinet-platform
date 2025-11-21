import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useGlobalSearch, SearchResult, SearchResultType } from '@/hooks/useGlobalSearch';
import { 
  Search, 
  Loader2, 
  Zap, 
  Bell, 
  MessageSquare, 
  Settings, 
  ArrowRight,
  Sparkles,
  Clock,
  TrendingUp
} from 'lucide-react';
import { triggerHaptic } from '@/utils/haptics';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  searchIndex?: any;
  onResultClick?: (result: SearchResult) => void;
}

const typeIcons: Record<SearchResultType, React.ElementType> = {
  agent: Zap,
  alert: Bell,
  chat: MessageSquare,
  setting: Settings,
  action: Sparkles,
};

const typeLabels: Record<SearchResultType, string> = {
  agent: 'Agents',
  alert: 'Alerts',
  chat: 'Conversations',
  setting: 'Settings',
  action: 'Actions',
};

const typeColors: Record<SearchResultType, string> = {
  agent: 'text-blue-500',
  alert: 'text-orange-500',
  chat: 'text-green-500',
  setting: 'text-purple-500',
  action: 'text-pink-500',
};

export function GlobalSearch({ 
  isOpen, 
  onClose, 
  searchIndex,
  onResultClick 
}: GlobalSearchProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { query, setQuery, results, groupedResults, isSearching } = useGlobalSearch({
    searchIndex,
    minQueryLength: 1,
    maxResults: 30,
  });

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Reset query when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen, setQuery]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleResultClick(results[selectedIndex]);
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, results, onClose]);

  const handleResultClick = (result: SearchResult) => {
    triggerHaptic('light');
    onResultClick?.(result);
    
    if (result.href) {
      window.location.href = result.href;
    } else if (result.action) {
      result.action();
    }
    
    onClose();
  };

  const renderResults = () => {
    if (!query) {
      return (
        <div className="p-8 text-center">
          <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">Search Everything</h3>
          <p className="text-sm text-muted-foreground">
            Search across agents, alerts, conversations, and more
          </p>
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <Badge variant="outline" className="text-xs">Agents</Badge>
            <Badge variant="outline" className="text-xs">Alerts</Badge>
            <Badge variant="outline" className="text-xs">Chats</Badge>
            <Badge variant="outline" className="text-xs">Settings</Badge>
          </div>
        </div>
      );
    }

    if (isSearching) {
      return (
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Searching...</p>
        </div>
      );
    }

    if (results.length === 0) {
      return (
        <div className="p-8 text-center">
          <Search className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No results found for "<span className="font-medium">{query}</span>"
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Try different keywords or check your spelling
          </p>
        </div>
      );
    }

    return (
      <div className="p-2">
        {Object.entries(groupedResults).map(([type, typeResults]) => {
          if (typeResults.length === 0) return null;
          
          const TypeIcon = typeIcons[type as SearchResultType];
          const typeLabel = typeLabels[type as SearchResultType];

          return (
            <div key={type} className="mb-4 last:mb-0">
              <div className="px-3 py-2 flex items-center gap-2">
                <TypeIcon className={cn('w-4 h-4', typeColors[type as SearchResultType])} />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {typeLabel}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {typeResults.length}
                </Badge>
              </div>

              <div className="space-y-1">
                {typeResults.map((result) => {
                  const globalIndex = results.findIndex(r => r.id === result.id);
                  const isSelected = globalIndex === selectedIndex;
                  const ResultIcon = result.icon || TypeIcon;

                  return (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all',
                        'hover:bg-accent/50',
                        isSelected && 'bg-accent text-accent-foreground ring-2 ring-primary/20'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        isSelected ? 'bg-primary/20' : 'bg-muted/50'
                      )}>
                        <ResultIcon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {result.title}
                        </div>
                        {result.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {result.description}
                          </div>
                        )}
                        {result.metadata?.tags && (
                          <div className="flex gap-1 mt-1">
                            {result.metadata.tags.slice(0, 3).map((tag: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {result.metadata?.trending && (
                          <TrendingUp className="w-3 h-3 text-green-500" />
                        )}
                        {result.metadata?.recent && (
                          <Clock className="w-3 h-3 text-blue-500" />
                        )}
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 max-w-3xl top-[15%] translate-y-0">
        <div className="flex flex-col max-h-[75vh]">
          {/* Search Header */}
          <div className="flex items-center p-4 border-b border-border bg-muted/30">
            <Search className="w-5 h-5 text-muted-foreground mr-3" />
            <Input
              placeholder="Search agents, alerts, conversations, and more..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 text-base bg-transparent placeholder:text-muted-foreground/60"
              autoFocus
            />
            {query && (
              <Badge variant="secondary" className="ml-3 text-xs">
                {results.length} {results.length === 1 ? 'result' : 'results'}
              </Badge>
            )}
          </div>

          {/* Results */}
          <ScrollArea className="flex-1">
            {renderResults()}
          </ScrollArea>

          {/* Footer */}
          {query && results.length > 0 && (
            <div className="flex items-center justify-between p-3 border-t border-border text-xs text-muted-foreground bg-muted/30">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs">↑↓</Badge>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs">⏎</Badge>
                  <span>Open</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs">Esc</Badge>
                <span>Close</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
