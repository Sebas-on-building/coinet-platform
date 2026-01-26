import { useState, useMemo, useCallback, useEffect } from "react";
import { 
  MessageSquare, 
  Bot, 
  Bell,
  BellRing,
  Pin,
  Crown,
  ChevronDown
} from "lucide-react";
import coinetLogo from "@/assets/coinet-logo.png";
import { useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Core navigation - Simplified to 3 primary actions
const coreFeatures = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "alerts", label: "Alerts", icon: Bell },
];

// Mock recent chats data with timestamps (newest first)
const mockRecentChats = [
  {
    id: "chat-1",
    title: "Bitcoin Price Analysis",
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    preview: "What's the current trend for BTC?",
    unread: true,
    pinned: false
  },
  {
    id: "chat-2", 
    title: "Market Sentiment Review",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    preview: "Analyzing social sentiment signals",
    unread: false,
    pinned: true
  },
  {
    id: "chat-3",
    title: "Portfolio Optimization",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    preview: "How to rebalance my crypto portfolio?",
    unread: true,
    pinned: false
  },
  {
    id: "chat-4",
    title: "Ethereum DeFi Analysis", 
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    preview: "Exploring yield farming opportunities",
    unread: false,
    pinned: false
  },
  {
    id: "chat-5",
    title: "Trading Strategy Discussion",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    preview: "Building automated trading alerts",
    unread: false,
    pinned: true
  },
  {
    id: "chat-6",
    title: "NFT Market Trends",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    preview: "Current NFT floor price analysis",
    unread: false,
    pinned: false
  },
  {
    id: "chat-7",
    title: "Altcoin Research",
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    preview: "Investigating promising altcoins",
    unread: false,
    pinned: false
  }
];

interface AppSidebarProps {
  activeItem: string;
  onItemClick: (itemId: string) => void;
  onNavigate?: (path: string) => void;
  showNotifications?: boolean;
  onToggleNotifications?: () => void;
}

export function AppSidebar({ activeItem, onItemClick, onNavigate, showNotifications = false, onToggleNotifications }: AppSidebarProps) {
  const { state } = useSidebar();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [pinnedChats, setPinnedChats] = useState<string[]>(() => {
    const stored = localStorage.getItem('pinnedChats');
    return stored ? JSON.parse(stored) : mockRecentChats.filter(chat => chat.pinned).map(chat => chat.id);
  });
  const [hoveredChat, setHoveredChat] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter and organize recent chats (pinned first, then by date)
  const { pinnedChats: filteredPinned, regularChats: filteredRegular } = useMemo(() => {
    let chats = mockRecentChats;
    
    if (debouncedSearchQuery.trim()) {
      chats = chats.filter(chat => 
        chat.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        chat.preview.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }
    
    const pinned = chats.filter(chat => pinnedChats.includes(chat.id));
    const regular = chats.filter(chat => !pinnedChats.includes(chat.id));
    
    return { pinnedChats: pinned, regularChats: regular };
  }, [debouncedSearchQuery, pinnedChats]);

  const handleItemClick = (itemId: string) => {
    onItemClick(itemId);
  };

  const handleChatClick = (chatId: string) => {
    // Handle individual chat selection
    console.log("Selected chat:", chatId);
    onItemClick("recent-chats");
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

  const isActive = (itemId: string) => activeItem === itemId;

  return (
    <Sidebar 
      className="bg-card border-r border-border"
      collapsible="icon"
      style={{
        "--sidebar-width-icon": "4.5rem" // 72px for better breathing room
      } as React.CSSProperties}
    >
      {/* Header with logo and toggle */}
      <SidebarHeader className={cn(
        "py-4 transition-all duration-200",
        state === "collapsed" ? "px-2" : "px-3"
      )}>
        <div className={cn(
          "flex items-center transition-all duration-200",
          state === "collapsed" 
            ? "flex-col gap-3" 
            : "justify-between"
        )}>
          {/* Logo Section */}
          <div className={cn(
            "flex items-center transition-all duration-200",
            state === "collapsed" 
              ? "justify-center h-11 w-11 rounded-xl bg-primary/10 hover:bg-primary/20" 
              : "gap-2"
          )}>
            <div className={cn(
              "flex items-center justify-center transition-all duration-200",
              state === "collapsed" ? "" : "w-8 h-8"
            )}>
              <img 
                src={coinetLogo} 
                alt="Coinet AI" 
                className={cn(
                  "transition-all duration-200",
                  state === "collapsed" ? "w-6 h-6" : "w-7 h-7"
                )} 
              />
            </div>
            {state !== "collapsed" && (
              <span className="text-sm font-semibold">Coinet AI</span>
            )}
          </div>

          {/* Toggle Button */}
          <SidebarTrigger 
            className={cn(
              "h-9 w-9 rounded-lg hover:bg-accent/80 transition-all duration-200"
            )}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1">
        {/* Core Navigation - 3 Primary Actions */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2 px-2">
              {coreFeatures.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => handleItemClick(item.id)}
                      className={cn(
                        "transition-all duration-200",
                        state === "collapsed" 
                          ? "h-11 w-11 p-0 rounded-xl flex items-center justify-center" 
                          : "h-10",
                        isActive(item.id)
                          ? state === "collapsed"
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : "bg-primary/10"
                          : state === "collapsed"
                            ? "hover:bg-accent/80 hover:shadow-md"
                            : "hover:bg-accent"
                      )}
                      tooltip={state === "collapsed" ? item.label : undefined}
                    >
                      {state === "collapsed" ? (
                        <Icon className="w-5 h-5" />
                      ) : (
                        <>
                          <Icon className="w-5 h-5" />
                          <span>{item.label}</span>
                        </>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Recent Chats Section */}
        {state !== "collapsed" && (
          <SidebarGroup className="flex-1 pt-4">
            <SidebarGroupLabel className="text-xs text-muted-foreground font-normal px-4 pb-2">
              Recent
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="flex-1">
                <SidebarMenu>
                  {filteredPinned.length === 0 && filteredRegular.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-xs text-muted-foreground">
                        {searchQuery ? "No chats found" : "No recent chats"}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Pinned Chats */}
                      {filteredPinned.map((chat) => (
                        <SidebarMenuItem key={chat.id}>
                          <div 
                            className="relative group px-2"
                            onMouseEnter={() => setHoveredChat(chat.id)}
                            onMouseLeave={() => setHoveredChat(null)}
                          >
                            <SidebarMenuButton 
                              className="h-9 w-full justify-start gap-2 hover:bg-accent transition-colors px-2 pr-8"
                              onClick={() => handleChatClick(chat.id)}
                            >
                              <MessageSquare className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate text-sm">{chat.title}</span>
                            </SidebarMenuButton>
                            <button
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-0 hover:opacity-70 transition-opacity opacity-100"
                              onClick={(e) => togglePin(chat.id, e)}
                            >
                              <Pin className="w-3.5 h-3.5 fill-current text-primary" />
                            </button>
                          </div>
                        </SidebarMenuItem>
                      ))}

                      {/* Regular Chats */}
                      {filteredRegular.map((chat) => (
                        <SidebarMenuItem key={chat.id}>
                          <div 
                            className="relative group px-2"
                            onMouseEnter={() => setHoveredChat(chat.id)}
                            onMouseLeave={() => setHoveredChat(null)}
                          >
                            <SidebarMenuButton 
                              className="h-9 w-full justify-start gap-2 hover:bg-accent transition-colors px-2 pr-8"
                              onClick={() => handleChatClick(chat.id)}
                            >
                              <MessageSquare className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate text-sm">{chat.title}</span>
                            </SidebarMenuButton>
                            <button
                              className={`absolute right-3 top-1/2 -translate-y-1/2 p-0 hover:opacity-70 transition-opacity ${
                                hoveredChat === chat.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                              onClick={(e) => togglePin(chat.id, e)}
                            >
                              <Pin className="w-3.5 h-3.5 text-primary" />
                            </button>
                          </div>
                        </SidebarMenuItem>
                      ))}
                    </>
                  )}
                </SidebarMenu>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Visual separator for collapsed state */}
      {state === "collapsed" && (
        <div className="px-3 py-2">
          <div className="h-px bg-border/50" />
        </div>
      )}

      {/* Footer - User Profile, Feedback & Support */}
      <SidebarFooter className="pb-3 px-2">
        <SidebarMenu className="gap-2">
          {/* Notifications */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onToggleNotifications}
              className={cn(
                "relative transition-all duration-200",
                state === "collapsed" 
                  ? "h-11 w-11 p-0 rounded-xl flex items-center justify-center hover:bg-accent/80 hover:shadow-md" 
                  : "h-10 hover:bg-accent"
              )}
              tooltip={state === "collapsed" ? "Notifications" : undefined}
            >
              {state === "collapsed" ? (
                <>
                  {unreadCount > 0 ? (
                    <BellRing className="w-5 h-5 text-primary animate-pulse" />
                  ) : (
                    <Bell className="w-5 h-5" />
                  )}
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px] bg-destructive">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </>
              ) : (
                <>
                  {unreadCount > 0 ? (
                    <BellRing className="w-5 h-5 text-primary" />
                  ) : (
                    <Bell className="w-5 h-5" />
                  )}
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <Badge className="ml-auto h-5 px-1.5 text-xs bg-destructive">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarSeparator className="my-1" />

          {/* User Profile */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => handleItemClick("settings")}
              className={cn(
                "transition-all duration-200",
                state === "collapsed" 
                  ? "h-11 w-11 p-0 rounded-xl flex items-center justify-center hover:bg-accent/80 hover:shadow-md" 
                  : "h-10 hover:bg-accent"
              )}
              tooltip={state === "collapsed" ? "User Profile" : undefined}
            >
              {state === "collapsed" ? (
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                  <img src={coinetLogo} alt="User" className="w-4 h-4 object-contain" />
                </div>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <img src={coinetLogo} alt="User" className="w-5 h-5 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium leading-tight">Coinet User</p>
                  </div>
                </>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}