import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from '@/lib/motion';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlassIcon, StarIcon as StarIconOutline } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import Fuse from 'fuse.js';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Types
interface Market {
  base: string;
  quote: string;
  lastPrice: number;
  priceChangePercent: number;
  volume: number;
  isFavorite?: boolean;
}

interface MarketSelectorProps {
  selectedMarket: { base: string; quote: string };
  onSelect: (market: { base: string; quote: string }) => void;
}

// API function to fetch markets
const fetchMarkets = async (): Promise<Market[]> => {
  // This would be your actual API call
  const response = await fetch('/api/markets');
  if (!response.ok) {
    throw new Error('Failed to fetch markets');
  }
  return response.json();
};

// Mock data for demo purposes
const mockMarkets: Market[] = [
  { base: 'BTC', quote: 'USDT', lastPrice: 63245.78, priceChangePercent: 2.34, volume: 1245678901, isFavorite: true },
  { base: 'ETH', quote: 'USDT', lastPrice: 3245.92, priceChangePercent: 1.58, volume: 745123689, isFavorite: true },
  { base: 'SOL', quote: 'USDT', lastPrice: 124.56, priceChangePercent: 3.89, volume: 412567890, isFavorite: false },
  { base: 'BNB', quote: 'USDT', lastPrice: 578.23, priceChangePercent: -0.54, volume: 321456789, isFavorite: false },
  { base: 'ADA', quote: 'USDT', lastPrice: 0.5621, priceChangePercent: 1.23, volume: 154789632, isFavorite: false },
  { base: 'XRP', quote: 'USDT', lastPrice: 0.6723, priceChangePercent: -1.24, volume: 198745632, isFavorite: false },
  { base: 'DOGE', quote: 'USDT', lastPrice: 0.1289, priceChangePercent: 5.67, volume: 256789123, isFavorite: false },
  { base: 'LINK', quote: 'USDT', lastPrice: 18.45, priceChangePercent: 0.86, volume: 124563789, isFavorite: false },
  { base: 'ATOM', quote: 'USDT', lastPrice: 9.87, priceChangePercent: -2.34, volume: 98452367, isFavorite: false },
  { base: 'AVAX', quote: 'USDT', lastPrice: 34.56, priceChangePercent: 4.32, volume: 145632987, isFavorite: false },
  { base: 'BTC', quote: 'EUR', lastPrice: 58245.34, priceChangePercent: 2.31, volume: 578123456, isFavorite: false },
  { base: 'ETH', quote: 'EUR', lastPrice: 2987.45, priceChangePercent: 1.52, volume: 312456789, isFavorite: false },
  { base: 'BTC', quote: 'JPY', lastPrice: 9387456.78, priceChangePercent: 2.33, volume: 245678901, isFavorite: false },
  { base: 'ETH', quote: 'JPY', lastPrice: 483245.92, priceChangePercent: 1.55, volume: 145123689, isFavorite: false },
];

const MarketSelector: React.FC<MarketSelectorProps> = ({ selectedMarket, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeQuote, setActiveQuote] = useState('USDT');
  const [favorites, setFavorites] = useState<Market[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Fetch markets data
  const { data: marketsData, isLoading, error } = useQuery({
    queryKey: ['markets'],
    queryFn: fetchMarkets,
    placeholderData: mockMarkets, // Use mock data until real API is connected
    staleTime: 60 * 1000, // 1 minute
  });

  // Quote currency options
  const quoteOptions = Array.from(new Set(marketsData?.map(m => m.quote) || []));

  // Filter markets based on active quote and search term
  const filteredMarkets = React.useMemo(() => {
    if (!marketsData) return [];

    let filtered = marketsData.filter(market => market.quote === activeQuote);

    if (searchTerm) {
      const fuse = new Fuse(filtered, {
        keys: ['base', 'quote'],
        threshold: 0.3,
      });
      return fuse.search(searchTerm).map(result => result.item);
    }

    return filtered;
  }, [marketsData, activeQuote, searchTerm]);

  // Update favorites when markets data changes
  useEffect(() => {
    if (marketsData) {
      setFavorites(marketsData.filter(market => market.isFavorite));
    }
  }, [marketsData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleFavorite = (market: Market) => {
    // This would be handled by an API call in a real implementation
    // For now, we'll just update the local state
    const updatedMarkets = marketsData?.map(m =>
      (m.base === market.base && m.quote === market.quote)
        ? { ...m, isFavorite: !m.isFavorite }
        : m
    );

    // This would normally be handled by the useQuery mutation
    // For demo purposes, we're just showing the UI effect
  };

  const handleSelectMarket = (market: Market) => {
    onSelect({ base: market.base, quote: market.quote });
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Market selector button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-md shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"
        aria-label="Select market"
        aria-expanded={isOpen}
      >
        <div className="flex items-center">
          <img
            src={`/crypto-icons/${selectedMarket.base.toLowerCase()}.svg`}
            alt={selectedMarket.base}
            className="w-6 h-6 mr-2"
            onError={(e) => {
              // Fallback to a default icon if the SVG doesn't exist
              (e.target as HTMLImageElement).src = '/crypto-icons/generic.svg';
            }}
          />
          <span className="font-bold">{selectedMarket.base}</span>
          <span className="text-gray-500 dark:text-gray-400 mx-1">/</span>
          <span>{selectedMarket.quote}</span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 mt-2 w-[400px] max-h-[500px] overflow-hidden rounded-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl shadow-lg border border-gray-200 dark:border-gray-700"
          >
            {/* Search and filters */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative mb-2">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search markets..."
                  className="pl-9 py-2 w-full bg-white/60 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Quote currency tabs */}
              <div className="flex gap-1 mt-2 overflow-x-auto pb-1 no-scrollbar">
                {quoteOptions.map(quote => (
                  <Badge
                    key={quote}
                    variant={quote === activeQuote ? 'primary' : 'secondary'}
                    onClick={() => setActiveQuote(quote)}
                    className="cursor-pointer px-3 py-1"
                  >
                    {quote}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Market list container */}
            <div className="overflow-y-auto max-h-[400px] divide-y divide-gray-100 dark:divide-gray-700">
              {/* Favorites section */}
              {favorites.length > 0 && (
                <div>
                  <div className="sticky top-0 bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Favorites
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {favorites.map(market => (
                      <MarketRow
                        key={`${market.base}-${market.quote}-fav`}
                        market={market}
                        onSelect={handleSelectMarket}
                        onToggleFavorite={toggleFavorite}
                        isSelected={selectedMarket.base === market.base && selectedMarket.quote === market.quote}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All markets section */}
              <div>
                <div className="sticky top-0 bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {activeQuote} Markets
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {isLoading ? (
                    <div className="flex justify-center items-center p-8">
                      <LoadingSpinner size="md" text="Loading markets..." />
                    </div>
                  ) : filteredMarkets.length > 0 ? (
                    filteredMarkets.map(market => (
                      <MarketRow
                        key={`${market.base}-${market.quote}`}
                        market={market}
                        onSelect={handleSelectMarket}
                        onToggleFavorite={toggleFavorite}
                        isSelected={selectedMarket.base === market.base && selectedMarket.quote === market.quote}
                      />
                    ))
                  ) : (
                    <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                      No markets found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Market row component
const MarketRow: React.FC<{
  market: Market;
  onSelect: (market: Market) => void;
  onToggleFavorite: (market: Market) => void;
  isSelected: boolean;
}> = ({ market, onSelect, onToggleFavorite, isSelected }) => {
  // Determine price change color
  const priceChangeColor =
    market.priceChangePercent > 0 ? 'text-green-500 dark:text-green-400' :
      market.priceChangePercent < 0 ? 'text-red-500 dark:text-red-400' :
        'text-gray-500 dark:text-gray-400';

  // Format volume
  const formattedVolume = (volume: number) => {
    if (volume >= 1_000_000_000) {
      return `$${(volume / 1_000_000_000).toFixed(2)}B`;
    } else if (volume >= 1_000_000) {
      return `$${(volume / 1_000_000).toFixed(2)}M`;
    } else if (volume >= 1_000) {
      return `$${(volume / 1_000).toFixed(2)}K`;
    }
    return `$${volume.toFixed(2)}`;
  };

  return (
    <div
      className={`px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/80 dark:bg-blue-900/20' : ''
        }`}
      onClick={() => onSelect(market)}
    >
      <div className="flex items-center">
        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(market);
          }}
          className="mr-3 text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors"
          aria-label={market.isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {market.isFavorite ? (
            <StarIconSolid className="w-5 h-5 text-yellow-500" />
          ) : (
            <StarIconOutline className="w-5 h-5" />
          )}
        </button>

        {/* Market symbol */}
        <div className="flex items-center">
          <img
            src={`/crypto-icons/${market.base.toLowerCase()}.svg`}
            alt={market.base}
            className="w-7 h-7 mr-3"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/crypto-icons/generic.svg';
            }}
          />
          <div>
            <div className="font-medium">
              {market.base}<span className="text-gray-500 dark:text-gray-400">/</span>{market.quote}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Vol: {formattedVolume(market.volume)}
            </div>
          </div>
        </div>
      </div>

      {/* Price and change */}
      <div className="text-right">
        <div className="font-medium">${market.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div className={`text-sm ${priceChangeColor}`}>
          {market.priceChangePercent > 0 ? '+' : ''}{market.priceChangePercent.toFixed(2)}%
        </div>
      </div>
    </div>
  );
};

export default MarketSelector; 