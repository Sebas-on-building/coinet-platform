import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { 
  Keyboard, 
  Search, 
  Command,
  Navigation,
  Zap,
  MessageSquare,
  BarChart3
} from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
  category: 'general' | 'navigation' | 'chat' | 'agents' | 'editing';
}

const shortcuts: Shortcut[] = [
  // General
  { keys: ['⌘', 'K'], description: 'Open command palette', category: 'general' },
  { keys: ['⌘', 'P'], description: 'Global search', category: 'general' },
  { keys: ['⌘', ','], description: 'Open settings', category: 'general' },
  { keys: ['⌘', '?'], description: 'Show keyboard shortcuts', category: 'general' },
  { keys: ['⌘', 'B'], description: 'Toggle sidebar', category: 'general' },
  { keys: ['⌘', 'F'], description: 'Toggle fullscreen', category: 'general' },
  { keys: ['Esc'], description: 'Close modal/dialog', category: 'general' },
  
  // Navigation
  { keys: ['⌘', '1'], description: 'Go to Agents', category: 'navigation' },
  { keys: ['⌘', '2'], description: 'Go to Alerts', category: 'navigation' },
  { keys: ['⌘', '3'], description: 'Go to Chart Canvas', category: 'navigation' },
  { keys: ['⌘', '4'], description: 'Go to Analytics', category: 'navigation' },
  { keys: ['⌘', 'N'], description: 'New chat', category: 'navigation' },
  { keys: ['J'], description: 'Navigate down', category: 'navigation' },
  { keys: ['K'], description: 'Navigate up', category: 'navigation' },
  { keys: ['Enter'], description: 'Select item', category: 'navigation' },
  
  // Chat
  { keys: ['⌘', 'Enter'], description: 'Send message', category: 'chat' },
  { keys: ['⇧', 'Enter'], description: 'New line', category: 'chat' },
  { keys: ['⌘', 'L'], description: 'Clear conversation', category: 'chat' },
  { keys: ['/'], description: 'Focus search', category: 'chat' },
  
  // Agents & Alerts
  { keys: ['⌘', '⇧', 'N'], description: 'Create new agent', category: 'agents' },
  { keys: ['⌘', '⇧', 'A'], description: 'Create new alert', category: 'agents' },
  { keys: ['⌘', 'R'], description: 'Refresh data', category: 'agents' },
  
  // Editing
  { keys: ['⌘', 'Z'], description: 'Undo', category: 'editing' },
  { keys: ['⌘', '⇧', 'Z'], description: 'Redo', category: 'editing' },
  { keys: ['⌘', 'S'], description: 'Save', category: 'editing' },
  { keys: ['⌘', 'A'], description: 'Select all', category: 'editing' },
  { keys: ['Delete'], description: 'Delete selected', category: 'editing' },
  { keys: ['F2'], description: 'Rename', category: 'editing' },
];

const categoryIcons = {
  general: Command,
  navigation: Navigation,
  chat: MessageSquare,
  agents: Zap,
  editing: BarChart3,
};

const categoryLabels = {
  general: 'General',
  navigation: 'Navigation',
  chat: 'Chat',
  agents: 'Agents & Alerts',
  editing: 'Editing',
};

interface EnhancedKeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EnhancedKeyboardShortcuts({ isOpen, onClose }: EnhancedKeyboardShortcutsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  const filteredShortcuts = useMemo(() => {
    let filtered = shortcuts;

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        s => s.description.toLowerCase().includes(query) ||
        s.keys.some(k => k.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (activeTab !== 'all') {
      filtered = filtered.filter(s => s.category === activeTab);
    }

    return filtered;
  }, [searchQuery, activeTab]);

  const groupedShortcuts = useMemo(() => {
    const groups: Record<string, Shortcut[]> = {};
    filteredShortcuts.forEach(shortcut => {
      if (!groups[shortcut.category]) {
        groups[shortcut.category] = [];
      }
      groups[shortcut.category].push(shortcut);
    });
    return groups;
  }, [filteredShortcuts]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Keyboard Shortcuts</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Master these shortcuts to boost your productivity
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="px-6 pt-4">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="all" className="flex items-center gap-2">
                All
                <Badge variant="secondary" className="text-xs">
                  {shortcuts.length}
                </Badge>
              </TabsTrigger>
              {Object.entries(categoryLabels).map(([key, label]) => {
                const count = shortcuts.filter(s => s.category === key).length;
                const Icon = categoryIcons[key as keyof typeof categoryIcons];
                return (
                  <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                    <Icon className="w-3 h-3" />
                    {label}
                    <Badge variant="secondary" className="text-xs">{count}</Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 px-6 py-4" style={{ maxHeight: 'calc(85vh - 240px)' }}>
            <TabsContent value={activeTab} className="mt-0 space-y-6">
              {filteredShortcuts.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    No shortcuts found for "{searchQuery}"
                  </p>
                </div>
              ) : (
                Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => {
                  const Icon = categoryIcons[category as keyof typeof categoryIcons];
                  const label = categoryLabels[category as keyof typeof categoryLabels];
                  
                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                          {label}
                        </h3>
                      </div>

                      <div className="space-y-2">
                        {categoryShortcuts.map((shortcut, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors group"
                          >
                            <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                              {shortcut.description}
                            </span>
                            <div className="flex items-center gap-1">
                              {shortcut.keys.map((key, keyIndex) => (
                                <kbd
                                  key={keyIndex}
                                  className={cn(
                                    'inline-flex items-center justify-center min-w-[2rem] h-7 px-2',
                                    'bg-background border border-border rounded text-xs font-mono',
                                    'shadow-sm group-hover:border-primary/30 transition-colors'
                                  )}
                                >
                                  {key === '⌘' && <Command className="w-3 h-3" />}
                                  {key !== '⌘' && key}
                                </kbd>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-background border border-border rounded">⌘</kbd>
                <span>= Command/Ctrl</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-background border border-border rounded">⇧</kbd>
                <span>= Shift</span>
              </div>
            </div>
            <p>💡 Most shortcuts work anywhere in the app</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
