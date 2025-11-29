import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/utils/haptics";
import {
  Search,
  MessageSquare,
  Zap,
  Bell,
  Settings,
  Plus,
  History,
  Beaker,
  Command,
  ArrowRight,
  Clock,
  BarChart3,
  Users,
  FileText,
  Palette,
  Globe,
  Sparkles
} from "lucide-react";

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  category: 'navigation' | 'actions' | 'recent';
  shortcut?: string;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (section: string) => void;
  onCreateAlert?: () => void;
  onCreateAgent?: () => void;
  onNewChat?: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onCreateAlert,
  onCreateAgent,
  onNewChat
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-chat',
      title: 'New Chat',
      description: 'Start a new conversation with AI',
      icon: MessageSquare,
      action: () => { onNewChat?.(); onClose(); triggerHaptic('light'); },
      category: 'navigation',
      shortcut: '⌘N',
      keywords: ['chat', 'conversation', 'ai', 'talk', 'new']
    },
    {
      id: 'nav-agents',
      title: 'Agents',
      description: 'Manage AI trading agents',
      icon: Zap,
      action: () => { onNavigate?.('custom-agents'); onClose(); triggerHaptic('light'); },
      category: 'navigation',
      shortcut: '⌘1',
      keywords: ['agents', 'automation', 'trading', 'bots', 'ai']
    },
    {
      id: 'nav-alerts',
      title: 'Smart Alerts',
      description: 'View and manage price alerts',
      icon: Bell,
      action: () => { onNavigate?.('alerts'); onClose(); triggerHaptic('light'); },
      category: 'navigation',
      shortcut: '⌘2',
      keywords: ['alerts', 'notifications', 'price', 'monitoring', 'notify']
    },
    {
      id: 'nav-canvas',
      title: 'Chart Canvas',
      description: 'Advanced trading strategies and backtesting',
      icon: Beaker,
      action: () => { onNavigate?.('strategy-lab'); onClose(); triggerHaptic('light'); },
      category: 'navigation',
      shortcut: '⌘3',
      keywords: ['strategy', 'backtesting', 'advanced', 'lab', 'chart', 'canvas']
    },
    {
      id: 'nav-analytics',
      title: 'Analytics',
      description: 'View performance metrics and insights',
      icon: BarChart3,
      action: () => { onNavigate?.('analytics'); onClose(); triggerHaptic('light'); },
      category: 'navigation',
      shortcut: '⌘4',
      keywords: ['analytics', 'metrics', 'performance', 'stats', 'data']
    },
    {
      id: 'nav-settings',
      title: 'Settings',
      description: 'Configure your preferences',
      icon: Settings,
      action: () => { onNavigate?.('settings'); onClose(); triggerHaptic('light'); },
      category: 'navigation',
      shortcut: '⌘,',
      keywords: ['settings', 'preferences', 'configuration', 'options']
    },

    // Quick Actions
    {
      id: 'action-alert',
      title: 'Create Alert',
      description: 'Set up a new price alert',
      icon: Plus,
      action: () => { onCreateAlert?.(); onClose(); triggerHaptic('medium'); },
      category: 'actions',
      shortcut: '⌘⇧A',
      keywords: ['create', 'alert', 'price', 'notification', 'new', 'add']
    },
    {
      id: 'action-agent',
      title: 'Create Agent',
      description: 'Build a new trading agent',
      icon: Plus,
      action: () => { onCreateAgent?.(); onClose(); triggerHaptic('medium'); },
      category: 'actions',
      shortcut: '⌘⇧N',
      keywords: ['create', 'agent', 'automation', 'trading', 'new', 'build']
    },
    {
      id: 'action-export',
      title: 'Export Data',
      description: 'Export your trading data and history',
      icon: FileText,
      action: () => { console.log('Export data'); onClose(); triggerHaptic('light'); },
      category: 'actions',
      keywords: ['export', 'download', 'data', 'history', 'save']
    },
    {
      id: 'action-theme',
      title: 'Change Theme',
      description: 'Switch between light and dark mode',
      icon: Palette,
      action: () => { onNavigate?.('settings'); onClose(); triggerHaptic('light'); },
      category: 'actions',
      keywords: ['theme', 'dark', 'light', 'mode', 'appearance', 'color']
    },

    // Recent
    {
      id: 'recent-btc',
      title: 'Bitcoin Analysis',
      description: 'Recent conversation about BTC trends',
      icon: History,
      action: () => { console.log('Open BTC chat'); onClose(); triggerHaptic('light'); },
      category: 'recent',
      keywords: ['bitcoin', 'btc', 'analysis', 'conversation', 'chat']
    },
    {
      id: 'recent-eth',
      title: 'Ethereum Strategy',
      description: 'Trading strategy for ETH',
      icon: History,
      action: () => { console.log('Open ETH strategy'); onClose(); triggerHaptic('light'); },
      category: 'recent',
      keywords: ['ethereum', 'eth', 'strategy', 'trading']
    },
    {
      id: 'recent-alert',
      title: 'Price Alert Triggered',
      description: 'BTC reached $50,000',
      icon: Bell,
      action: () => { console.log('Open alert'); onClose(); triggerHaptic('light'); },
      category: 'recent',
      keywords: ['alert', 'price', 'bitcoin', 'triggered', 'notification']
    }
  ];

  // Filter commands based on query
  const filteredCommands = commands.filter(command => {
    if (!query) return true;
    
    const searchText = query.toLowerCase();
    return (
      command.title.toLowerCase().includes(searchText) ||
      command.description?.toLowerCase().includes(searchText) ||
      command.keywords?.some(keyword => keyword.includes(searchText))
    );
  });

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((groups, command) => {
    if (!groups[command.category]) {
      groups[command.category] = [];
    }
    groups[command.category].push(command);
    return groups;
  }, {} as Record<string, CommandItem[]>);

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            Math.min(prev + 1, filteredCommands.length - 1)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'navigation': return 'Navigation';
      case 'actions': return 'Quick Actions';
      case 'recent': return 'Recent';
      default: return category;
    }
  };

  const handleItemClick = (command: CommandItem) => {
    command.action();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 max-w-[600px] top-[20%] translate-y-0 border-2 border-primary">
        <div className="flex flex-col max-h-[70vh]">
          {/* Search Input */}
          <div className="flex items-center p-4 border-b border-border">
            <Search className="w-5 h-5 text-muted-foreground mr-3" />
            <Input
              placeholder="Search for commands, features, or content..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 focus:ring-0 text-base bg-transparent"
              autoFocus
            />
            <div className="flex items-center gap-1 ml-3">
              <Badge variant="outline" className="text-xs">
                <Command className="w-3 h-3 mr-1" />K
              </Badge>
            </div>
          </div>

          {/* Results */}
          <ScrollArea className="flex-1 max-h-96">
            {filteredCommands.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p>No results found for "{query}"</p>
                <p className="text-sm mt-1">Try different keywords or browse categories</p>
              </div>
            ) : (
              <div className="p-2">
                {Object.entries(groupedCommands).map(([category, categoryCommands]) => (
                  <div key={category} className="mb-4 last:mb-0">
                    <div className="px-3 py-2">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {getCategoryTitle(category)}
                      </h3>
                    </div>
                    
                    <div className="space-y-1">
                      {categoryCommands.map((command, index) => {
                        const globalIndex = filteredCommands.indexOf(command);
                        const isSelected = globalIndex === selectedIndex;
                        
                        return (
                          <button
                            key={command.id}
                            onClick={() => handleItemClick(command)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors",
                              "hover:bg-accent/50",
                              isSelected && "bg-accent text-accent-foreground"
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                              isSelected ? "bg-primary/20" : "bg-muted/50"
                            )}>
                              <command.icon className="w-4 h-4" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {command.title}
                              </div>
                              {command.description && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {command.description}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              {command.shortcut && (
                                <Badge variant="outline" className="text-xs font-mono">
                                  {command.shortcut}
                                </Badge>
                              )}
                              <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between p-3 border-t border-border text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs">↑↓</Badge>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs">⏎</Badge>
                <span>Select</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">Esc</Badge>
              <span>Close</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}