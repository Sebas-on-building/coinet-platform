import { useState, useMemo, useEffect } from "react";
import { 
  MessageSquare, 
  Bot, 
  Bell,
  BellRing,
  Pin,
  Plus,
  Trash2,
  Loader2
} from "lucide-react";
import coinetLogo from "@/assets/coinet-logo.png";
import { useLocation } from "react-router-dom";
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
import { cn } from "@/lib/utils";
import { apiClient, ConversationSummary } from "@/services/api-client";
import { useToast } from "@/hooks/use-toast";

// Core navigation - Simplified to 3 primary actions
const coreFeatures = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "alerts", label: "Alerts", icon: Bell },
];

interface AppSidebarProps {
  activeItem: string;
  onItemClick: (itemId: string) => void;
  onNavigate?: (path: string) => void;
  showNotifications?: boolean;
  onToggleNotifications?: () => void;
  // New: conversation management
  selectedConversationId?: string | null;
  onSelectConversation?: (conversationId: string | null) => void;
}

export function AppSidebar({ 
  activeItem, 
  onItemClick, 
  onNavigate, 
  showNotifications = false, 
  onToggleNotifications,
  selectedConversationId,
  onSelectConversation
}: AppSidebarProps) {
  const { state } = useSidebar();
  const location = useLocation();
  const { toast } = useToast();
  
  // Conversation state
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [pinnedChats, setPinnedChats] = useState<string[]>(() => {
    const stored = localStorage.getItem('pinnedChats');
    return stored ? JSON.parse(stored) : [];
  });
  const [hoveredChat, setHoveredChat] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const response = await apiClient.listConversations({ limit: 50 });
      if (response.success) {
        setConversations(response.data.conversations);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      // Don't show error toast on initial load - user might not be logged in yet
    } finally {
      setIsLoadingConversations(false);
    }
  };

  // Filter and organize recent chats (pinned first, then by date)
  const { pinnedChats: filteredPinned, regularChats: filteredRegular } = useMemo(() => {
    const pinned = conversations.filter(chat => pinnedChats.includes(chat.id));
    const regular = conversations.filter(chat => !pinnedChats.includes(chat.id));
    
    return { pinnedChats: pinned, regularChats: regular };
  }, [conversations, pinnedChats]);

  const handleItemClick = (itemId: string) => {
    // When clicking "Chat" in nav, start a new conversation
    if (itemId === 'chat') {
      onSelectConversation?.(null);
    }
    onItemClick(itemId);
  };

  const handleChatClick = (chatId: string) => {
    // Select the conversation and switch to chat view
    onSelectConversation?.(chatId);
    onItemClick("chat");
  };

  const handleNewChat = () => {
    // Clear selected conversation to start fresh
    onSelectConversation?.(null);
    onItemClick("chat");
  };

  const handleDeleteConversation = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.deleteConversation(chatId);
      setConversations(prev => prev.filter(c => c.id !== chatId));
      // If we deleted the currently selected conversation, clear selection
      if (selectedConversationId === chatId) {
        onSelectConversation?.(null);
      }
      toast({
        title: "Chat deleted",
        description: "Conversation removed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    }
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
            <div className="flex items-center justify-between px-4 pb-2">
              <SidebarGroupLabel className="text-xs text-muted-foreground font-normal p-0">
                Recent
              </SidebarGroupLabel>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md hover:bg-accent"
                onClick={handleNewChat}
                title="New chat"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <SidebarGroupContent>
              <div className="flex-1">
                <SidebarMenu>
                  {isLoadingConversations ? (
                    <div className="px-4 py-8 text-center">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  ) : filteredPinned.length === 0 && filteredRegular.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-xs text-muted-foreground">No recent chats</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Start a new conversation</p>
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
                              className={cn(
                                "h-9 w-full justify-start gap-2 hover:bg-accent transition-colors px-2 pr-14",
                                selectedConversationId === chat.id && "bg-accent"
                              )}
                              onClick={() => handleChatClick(chat.id)}
                            >
                              <MessageSquare className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate text-sm">{chat.title || 'New Chat'}</span>
                            </SidebarMenuButton>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              <button
                                className="p-1 hover:opacity-70 transition-opacity opacity-100"
                                onClick={(e) => togglePin(chat.id, e)}
                                title="Unpin"
                              >
                                <Pin className="w-3.5 h-3.5 fill-current text-primary" />
                              </button>
                              <button
                                className={cn(
                                  "p-1 hover:text-destructive transition-all",
                                  hoveredChat === chat.id ? 'opacity-100' : 'opacity-0'
                                )}
                                onClick={(e) => handleDeleteConversation(chat.id, e)}
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
                              className={cn(
                                "h-9 w-full justify-start gap-2 hover:bg-accent transition-colors px-2 pr-14",
                                selectedConversationId === chat.id && "bg-accent"
                              )}
                              onClick={() => handleChatClick(chat.id)}
                            >
                              <MessageSquare className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate text-sm">{chat.title || 'New Chat'}</span>
                            </SidebarMenuButton>
                            <div className={cn(
                              "absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 transition-opacity",
                              hoveredChat === chat.id ? 'opacity-100' : 'opacity-0'
                            )}>
                              <button
                                className="p-1 hover:opacity-70 transition-opacity"
                                onClick={(e) => togglePin(chat.id, e)}
                                title="Pin"
                              >
                                <Pin className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                              <button
                                className="p-1 hover:text-destructive transition-colors"
                                onClick={(e) => handleDeleteConversation(chat.id, e)}
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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