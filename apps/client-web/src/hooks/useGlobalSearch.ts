import { useState, useEffect, useMemo } from 'react';
import { useDebounce } from './useDebounce';

export type SearchResultType = 'agent' | 'alert' | 'chat' | 'setting' | 'action';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  description?: string;
  icon?: React.ElementType;
  href?: string;
  action?: () => void;
  metadata?: Record<string, any>;
  score?: number;
  category?: string;
}

export interface SearchIndex {
  agents?: SearchResult[];
  alerts?: SearchResult[];
  chats?: SearchResult[];
  settings?: SearchResult[];
  actions?: SearchResult[];
}

interface UseGlobalSearchOptions {
  searchIndex?: SearchIndex;
  minQueryLength?: number;
  debounceMs?: number;
  maxResults?: number;
}

export function useGlobalSearch({
  searchIndex = {},
  minQueryLength = 2,
  debounceMs = 300,
  maxResults = 20,
}: UseGlobalSearchOptions = {}) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const debouncedQuery = useDebounce(query, debounceMs);

  // Combine all search sources
  const allItems = useMemo(() => {
    return [
      ...(searchIndex.agents || []),
      ...(searchIndex.alerts || []),
      ...(searchIndex.chats || []),
      ...(searchIndex.settings || []),
      ...(searchIndex.actions || []),
    ];
  }, [searchIndex]);

  // Search algorithm with fuzzy matching
  const results = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < minQueryLength) {
      return [];
    }

    const searchTerms = debouncedQuery.toLowerCase().split(' ').filter(Boolean);
    
    const scoredResults = allItems
      .map(item => {
        let score = 0;
        const titleLower = item.title.toLowerCase();
        const descLower = item.description?.toLowerCase() || '';
        const categoryLower = item.category?.toLowerCase() || '';

        // Exact match in title gets highest score
        if (titleLower === debouncedQuery.toLowerCase()) {
          score += 100;
        }

        // Title starts with query
        if (titleLower.startsWith(debouncedQuery.toLowerCase())) {
          score += 50;
        }

        // Each search term match
        searchTerms.forEach(term => {
          if (titleLower.includes(term)) score += 10;
          if (descLower.includes(term)) score += 5;
          if (categoryLower.includes(term)) score += 3;
          
          // Metadata search
          if (item.metadata) {
            Object.values(item.metadata).forEach(value => {
              if (String(value).toLowerCase().includes(term)) {
                score += 2;
              }
            });
          }
        });

        return { ...item, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    return scoredResults;
  }, [debouncedQuery, allItems, minQueryLength, maxResults]);

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<SearchResultType, SearchResult[]> = {
      agent: [],
      alert: [],
      chat: [],
      setting: [],
      action: [],
    };

    results.forEach(result => {
      groups[result.type].push(result);
    });

    return groups;
  }, [results]);

  // Update searching state
  useEffect(() => {
    if (query !== debouncedQuery) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [query, debouncedQuery]);

  return {
    query,
    setQuery,
    results,
    groupedResults,
    isSearching,
    hasResults: results.length > 0,
    totalResults: results.length,
  };
}

// Hook for adding items to search index
export function useSearchIndex() {
  const [searchIndex, setSearchIndex] = useState<SearchIndex>({
    agents: [],
    alerts: [],
    chats: [],
    settings: [],
    actions: [],
  });

  const addToIndex = (type: SearchResultType, items: SearchResult[]) => {
    setSearchIndex(prev => ({
      ...prev,
      [type + 's']: items,
    }));
  };

  const updateIndex = (newIndex: Partial<SearchIndex>) => {
    setSearchIndex(prev => ({
      ...prev,
      ...newIndex,
    }));
  };

  const clearIndex = (type?: SearchResultType) => {
    if (type) {
      setSearchIndex(prev => ({
        ...prev,
        [type + 's']: [],
      }));
    } else {
      setSearchIndex({
        agents: [],
        alerts: [],
        chats: [],
        settings: [],
        actions: [],
      });
    }
  };

  return {
    searchIndex,
    addToIndex,
    updateIndex,
    clearIndex,
  };
}
