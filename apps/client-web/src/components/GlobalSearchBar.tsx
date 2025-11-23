import { useState, useEffect } from 'react';
import { Search, Command } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { GlobalSearch } from '@/components/ui/global-search';
import { useSearchIndex } from '@/hooks/useGlobalSearch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface GlobalSearchBarProps {
  onNavigate?: (section: string) => void;
}

export function GlobalSearchBar({ onNavigate }: GlobalSearchBarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { searchIndex } = useSearchIndex();

  // Register keyboard shortcut for search (/)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open search with "/" key
      if (e.key === '/' && !isSearchOpen) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      
      // Also support Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsSearchOpen(true)}
        className="w-full max-w-md h-10 justify-start text-muted-foreground hover:text-foreground transition-colors group"
      >
        <Search className="w-4 h-4 mr-2 text-muted-foreground" />
        <span className="flex-1 text-left text-sm">Search everything...</span>
        <Badge variant="secondary" className="ml-2 text-xs font-normal opacity-60 group-hover:opacity-100">
          /
        </Badge>
      </Button>

      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        searchIndex={searchIndex}
        onResultClick={(result) => {
          if (result.metadata?.section) {
            onNavigate?.(result.metadata.section);
          }
        }}
      />
    </>
  );
}
