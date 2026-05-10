import { useState, useMemo } from "react";
import { 
  MessageSquare, 
  Bot, 
  Bell,
  BellRing,
  Pin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CoinetMark, SystemLabel } from "@/components/coinet/TerminalPrimitives";
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
import { cn } from "@/lib/utils";

// Core navigation - Simplified to 3 primary actions
const coreFeatures = [
  { id: "chat", label: "Judgment", icon: MessageSquare },
  { id: "agents", label: "Modules", icon: Bot },
  { id: "alerts", label: "Monitors", icon: Bell },
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

export function AppSidebar({ activeItem, onItemClick, onToggleNotifications }: AppSidebarProps) {
  const { state } = useSidebar();
  const [pinnedChats, setPinnedChats] = useState<string[]>(() => {
    const stored = localStorage.getItem('pinnedChats');
    return stored ? JSON.parse(stored) : mockRecentChats.filter(chat => chat.pinned).map(chat => chat.id);
  });
  const [hoveredChat, setHoveredChat] = useState<string | null>(null);
  const unreadCount = 0;

  // Filter and organize recent chats (pinned first, then by date)
  const { pinnedChats: filteredPinned, regularChats: filteredRegular } = useMemo(() => {
    const chats = mockRecentChats;
    const pinned = chats.filter(chat => pinnedChats.includes(chat.id));
    const regular = chats.filter(chat => !pinnedChats.includes(chat.id));
    
    return { pinnedChats: pinned, regularChats: regular };
  }, [pinnedChats]);

  const handleItemClick = (itemId: string) => {
    onItemClick(itemId);
  };

  const handleChatClick = (chatId: string) => {
    // Handle individual chat selection
    console.log("Selected chat:", chatId);
    onItemClick("recent-chats");
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
      className="border-r border-border bg-[#030712]/95"
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
              ? "justify-center h-11 w-11 rounded-xl border border-primary/20 bg-primary/10 hover:bg-primary/20"
              : "gap-2"
          )}>
            <CoinetMark size={state === "collapsed" ? "sm" : "md"} showWordmark={state !== "collapsed"} />
            {state !== "collapsed" && (
              <div className="hidden" aria-hidden="true" />
            )}
          </div>

          {/* Toggle Button */}
          <SidebarTrigger 
            className={cn(
              "h-9 w-9 rounded-lg border border-border/60 hover:bg-accent/80 transition-all duration-200"
            )}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1">
        {/* Core Navigation - 3 Primary Actions */}
        <SidebarGroup>
          {state !== "collapsed" && (
            <SidebarGroupLabel asChild>
              <SystemLabel className="px-4 pb-2">Terminal</SystemLabel>
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-2 px-2">
              {coreFeatures.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => handleItemClick(item.id)}
                      className={cn(
                        "transition-all duration-200 font-medium",
                        state === "collapsed" 
                          ? "h-11 w-11 p-0 rounded-xl flex items-center justify-center" 
                          : "h-10",
                        isActive(item.id)
                          ? state === "collapsed"
                            ? "bg-primary text-primary-foreground shadow-brand"
                            : "border border-primary/30 bg-primary/10 text-foreground shadow-glow"
                          : state === "collapsed"
                            ? "hover:bg-accent/80 hover:shadow-md"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
            <SidebarGroupLabel className="px-4 pb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Evidence Trail
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="flex-1">
                <SidebarMenu>
                  {filteredPinned.length === 0 && filteredRegular.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-xs text-muted-foreground">
                        No recent chats
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
                              className="h-9 w-full justify-start gap-2 px-2 pr-8 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
                              className="h-9 w-full justify-start gap-2 px-2 pr-8 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
                <CoinetMark size="sm" />
              ) : (
                <>
                  <CoinetMark size="sm" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium leading-tight">Terminal Access</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Settings</p>
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