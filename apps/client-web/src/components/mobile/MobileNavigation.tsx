import { useState, useMemo } from 'react';
import { 
  MessageSquare, 
  Bot, 
  Bell,
  Clock, 
  Settings,
  X,
  Menu,
  Search,
  Pin
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CoinetMark, SystemLabel } from '@/components/coinet/TerminalPrimitives';

// Simplified to 3 core navigation items
const primaryFeatures = [
  { id: 'chat', label: 'Judgment', icon: MessageSquare },
  { id: 'agents', label: 'Modules', icon: Bot },
  { id: 'alerts', label: 'Monitors', icon: Bell },
];

const secondaryFeatures = [
  { id: 'recent-chats', label: 'Recent Chats', icon: Clock },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// Mock recent chats data with timestamps (newest first)
const mockRecentChats = [
  {
    id: "chat-1",
    title: "Bitcoin Price Analysis",
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    preview: "What's the current trend for BTC?"
  },
  {
    id: "chat-2", 
    title: "Market Sentiment Review",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    preview: "Analyzing social sentiment signals"
  },
  {
    id: "chat-3",
    title: "Portfolio Optimization",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    preview: "How to rebalance my crypto portfolio?"
  },
  {
    id: "chat-4",
    title: "Ethereum DeFi Analysis", 
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    preview: "Exploring yield farming opportunities"
  },
  {
    id: "chat-5",
    title: "Trading Strategy Discussion",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    preview: "Building automated trading alerts"
  },
  {
    id: "chat-6",
    title: "NFT Market Trends",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    preview: "Current NFT floor price analysis"
  },
  {
    id: "chat-7",
    title: "Altcoin Research",
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    preview: "Investigating promising altcoins"
  }
];

interface MobileNavigationProps {
  activeItem: string;
  onItemClick: (itemId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function MobileNavigation({ activeItem, onItemClick, isOpen, onClose }: MobileNavigationProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pinnedChats, setPinnedChats] = useState<string[]>(() => {
    const stored = localStorage.getItem('pinnedChats');
    return stored ? JSON.parse(stored) : [];
  });
  const [hoveredChat, setHoveredChat] = useState<string | null>(null);

  // Filter and organize recent chats (pinned first, then by date)
  const { pinnedChats: filteredPinned, regularChats: filteredRegular } = useMemo(() => {
    let chats = mockRecentChats;
    
    if (searchQuery.trim()) {
      chats = chats.filter(chat =>
        chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.preview.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    const pinned = chats.filter(chat => pinnedChats.includes(chat.id));
    const regular = chats.filter(chat => !pinnedChats.includes(chat.id));
    
    return { pinnedChats: pinned, regularChats: regular };
  }, [searchQuery, pinnedChats]);

  const handleItemClick = (itemId: string) => {
    onItemClick(itemId);
    setSheetOpen(false);
    onClose?.();
  };

  const handleChatClick = (chatId: string) => {
    console.log("Selected chat:", chatId);
    setSheetOpen(false);
    onClose?.();
  };

  const togglePin = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedChats(prev => {
      const newPinned = prev.includes(chatId) 
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId];
      localStorage.setItem('pinnedChats', JSON.stringify(newPinned));
      return newPinned;
    });
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  const isActive = (itemId: string) => activeItem === itemId;

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="lg:hidden h-10 w-10 hover:bg-accent/50 transition-colors"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="left" 
        className="w-80 border-r border-border/70 bg-[#030712]/95 p-0 backdrop-blur-xl"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="border-b border-border/50 p-6 pb-4 text-left">
            <div className="flex items-center gap-3">
              <CoinetMark showWordmark />
            </div>
            <SheetDescription asChild>
              <SystemLabel>Terminal Navigation</SystemLabel>
            </SheetDescription>
          </SheetHeader>

          {/* Navigation Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Search Bar */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 border-border/50 bg-surface/60 pl-10 pr-10 transition-colors focus:border-primary/50"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-accent"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Primary Actions - 3 Core Items */}
            <div className="space-y-2">
              {primaryFeatures.map((item) => (
                <Button
                  key={item.id}
                  variant={isActive(item.id) ? 'default' : 'ghost'}
                  className={`h-11 w-full justify-start text-left ${
                    isActive(item.id)
                      ? 'border border-primary/30 bg-primary/10 text-foreground shadow-glow'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  } transition-all duration-150`}
                  onClick={() => handleItemClick(item.id)}
                >
                  <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span>{item.label}</span>
                </Button>
              ))}
            </div>

            <Separator className="opacity-50" />

            {/* Secondary Features */}
            <div className="space-y-2">
              <h3 className="px-2 mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                More Features
              </h3>
              {secondaryFeatures.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={`w-full justify-start h-11 text-left ${
                    isActive(item.id)
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                  } transition-all duration-200`}
                  onClick={() => handleItemClick(item.id)}
                >
                  <item.icon className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span>{item.label}</span>
                </Button>
              ))}
            </div>

            {/* Recent Chats */}
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Recent Chats
                </h3>
                <span className="text-xs text-muted-foreground">
                  {searchQuery ? `${filteredPinned.length + filteredRegular.length} found` : `${mockRecentChats.length} total`}
                </span>
              </div>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {filteredPinned.length === 0 && filteredRegular.length === 0 ? (
                  <div className="px-2 py-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      {searchQuery ? "No chats found" : "No recent chats"}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Pinned Chats */}
                    {filteredPinned.map((chat) => (
                      <div
                        key={chat.id}
                        className="relative group"
                        onMouseEnter={() => setHoveredChat(chat.id)}
                        onMouseLeave={() => setHoveredChat(null)}
                      >
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-auto py-3 px-3 pr-10 text-left hover:bg-accent/30 transition-all duration-200 flex-col items-start gap-1"
                          onClick={() => handleChatClick(chat.id)}
                        >
                          <div className="w-full flex items-center gap-2">
                            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                            <span className="truncate font-medium text-foreground text-sm">{chat.title}</span>
                          </div>
                          <div className="w-full pl-5 flex items-center justify-between gap-2">
                            <span className="truncate text-muted-foreground text-xs">
                              {chat.preview}
                            </span>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatTimeAgo(chat.timestamp)}
                            </span>
                          </div>
                        </Button>
                        <button
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-0 hover:opacity-70 active:opacity-100 touch-manipulation transition-opacity opacity-100"
                          onClick={(e) => togglePin(chat.id, e)}
                        >
                          <Pin className="w-4 h-4 fill-current text-muted-foreground" />
                        </button>
                      </div>
                    ))}

                    {/* Regular Chats */}
                    {filteredRegular.map((chat) => (
                      <div
                        key={chat.id}
                        className="relative group"
                        onMouseEnter={() => setHoveredChat(chat.id)}
                        onMouseLeave={() => setHoveredChat(null)}
                      >
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-auto py-3 px-3 pr-10 text-left hover:bg-accent/30 transition-all duration-200 flex-col items-start gap-1"
                          onClick={() => handleChatClick(chat.id)}
                        >
                          <div className="w-full flex items-center gap-2">
                            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                            <span className="truncate font-medium text-foreground text-sm">{chat.title}</span>
                          </div>
                          <div className="w-full pl-5 flex items-center justify-between gap-2">
                            <span className="truncate text-muted-foreground text-xs">
                              {chat.preview}
                            </span>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatTimeAgo(chat.timestamp)}
                            </span>
                          </div>
                        </Button>
                        <button
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-0 opacity-0 group-hover:opacity-70 active:opacity-100 touch-manipulation transition-opacity"
                          onClick={(e) => togglePin(chat.id, e)}
                        >
                          <Pin className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}