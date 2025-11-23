# Enhanced Navigation System

This document describes the enhanced navigation system with command palette, global search, breadcrumbs, and keyboard shortcuts.

## Features

### 1. Command Palette (`CommandPalette`)
**Location:** `src/components/ui/command-palette.tsx`

A quick-access command center for navigating and executing actions.

**Features:**
- ⌘K to open
- Fuzzy search across commands
- Categorized commands (Navigation, Actions, Recent)
- Keyboard navigation (↑↓, Enter, Esc)
- Keyboard shortcuts displayed

**Usage:**
```tsx
<CommandPalette
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onNavigate={(section) => navigate(section)}
  onCreateAlert={() => createAlert()}
  onCreateAgent={() => createAgent()}
  onNewChat={() => newChat()}
/>
```

### 2. Global Search (`GlobalSearch`)
**Location:** `src/components/ui/global-search.tsx`

Search across all content types (agents, alerts, conversations, settings).

**Features:**
- ⌘P to open
- Real-time search with debouncing
- Grouped results by type
- Score-based ranking
- Keyboard navigation
- Metadata badges (trending, recent)

**Usage:**
```tsx
import { GlobalSearch } from '@/components/ui/global-search';
import { useSearchIndex } from '@/hooks/useGlobalSearch';

const { searchIndex, updateIndex } = useSearchIndex();

// Add items to search
updateIndex({
  agents: [
    {
      id: '1',
      type: 'agent',
      title: 'BTC Trading Agent',
      description: 'Automated Bitcoin trading',
      icon: Zap,
      href: '/agents/1',
      metadata: { tags: ['bitcoin', 'trading'] }
    }
  ]
});

<GlobalSearch
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  searchIndex={searchIndex}
  onResultClick={(result) => handleClick(result)}
/>
```

### 3. Breadcrumb Navigation (`BreadcrumbNav`)
**Location:** `src/components/ui/breadcrumb-nav.tsx`

Visual navigation path showing current location in hierarchy.

**Variants:**
- `BreadcrumbNav` - Full breadcrumb trail
- `CompactBreadcrumb` - Mobile-friendly compact version
- `DropdownBreadcrumb` - Collapses middle items when too many

**Usage:**
```tsx
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';

const breadcrumbs = [
  { label: 'Agents', href: '/agents', icon: Zap },
  { label: 'BTC Agent', href: '/agents/btc', icon: Bitcoin },
  { label: 'Settings', current: true }
];

<BreadcrumbNav items={breadcrumbs} showHome />
```

**Mobile Usage:**
```tsx
import { CompactBreadcrumb } from '@/components/ui/breadcrumb-nav';

<CompactBreadcrumb items={breadcrumbs} />
// Shows: ← BTC Agent Settings
```

### 4. Enhanced Keyboard Shortcuts (`EnhancedKeyboardShortcuts`)
**Location:** `src/components/navigation/EnhancedKeyboardShortcuts.tsx`

Comprehensive keyboard shortcuts panel with search and categories.

**Features:**
- ⌘? to open
- Searchable shortcuts
- Categorized tabs (General, Navigation, Chat, Agents, Editing)
- Visual keyboard key display
- Shortcuts count badges

**Usage:**
```tsx
import { EnhancedKeyboardShortcuts } from '@/components/navigation';

<EnhancedKeyboardShortcuts
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
/>
```

## Keyboard Shortcuts Reference

### Core Commands
- `⌘K` - Open command palette
- `⌘P` - Global search
- `⌘?` - Show keyboard shortcuts
- `⌘,` - Open settings
- `⌘B` - Toggle sidebar
- `Esc` - Close modal/dialog

### Navigation
- `⌘N` - New chat
- `⌘1` - Go to Agents
- `⌘2` - Go to Alerts
- `⌘3` - Go to Chart Canvas
- `⌘4` - Go to Analytics
- `J/K` - Navigate up/down in lists
- `Enter` - Select item

### Chat
- `⌘Enter` - Send message
- `⇧Enter` - New line
- `⌘L` - Clear conversation

### Quick Actions
- `⌘⇧N` - Create new agent
- `⌘⇧A` - Create new alert
- `⌘R` - Refresh data

### Editing
- `⌘Z` - Undo
- `⌘⇧Z` - Redo
- `⌘S` - Save
- `⌘A` - Select all
- `Delete` - Delete selected
- `F2` - Rename

## Hooks

### `useKeyboardShortcuts`
**Location:** `src/hooks/useKeyboardShortcuts.ts`

Register keyboard shortcuts with modifiers.

```tsx
import { useKeyboardShortcuts, commonShortcuts } from '@/hooks/useKeyboardShortcuts';

useKeyboardShortcuts([
  {
    ...commonShortcuts.commandPalette,
    callback: () => setCommandPaletteOpen(true)
  },
  {
    key: 'n',
    cmd: true,
    callback: () => createNewItem()
  }
]);
```

### `useGlobalSearch`
**Location:** `src/hooks/useGlobalSearch.ts`

Global search functionality with fuzzy matching.

```tsx
import { useGlobalSearch } from '@/hooks/useGlobalSearch';

const { 
  query, 
  setQuery, 
  results, 
  groupedResults, 
  isSearching 
} = useGlobalSearch({
  searchIndex: mySearchIndex,
  minQueryLength: 2,
  debounceMs: 300,
  maxResults: 20
});
```

### `useSearchIndex`
**Location:** `src/hooks/useGlobalSearch.ts`

Manage the search index for global search.

```tsx
import { useSearchIndex } from '@/hooks/useGlobalSearch';

const { searchIndex, updateIndex, addToIndex, clearIndex } = useSearchIndex();

// Add agents to search
addToIndex('agent', agentSearchResults);

// Update entire index
updateIndex({
  agents: [...],
  alerts: [...],
  chats: [...]
});
```

### `useDebounce`
**Location:** `src/hooks/useDebounce.ts`

Debounce values or callbacks.

```tsx
import { useDebounce, useDebouncedCallback } from '@/hooks/useDebounce';

// Debounce value
const debouncedQuery = useDebounce(query, 300);

// Debounce callback
const debouncedSearch = useDebouncedCallback((q) => {
  performSearch(q);
}, 300);
```

## Best Practices

1. **Command Palette**: Use for quick navigation and common actions
2. **Global Search**: Use for finding specific content across the app
3. **Breadcrumbs**: Show current location, especially in nested views
4. **Keyboard Shortcuts**: Register global shortcuts in main layout, feature-specific shortcuts in feature components

## Integration Example

```tsx
import { useState } from 'react';
import { CommandPalette } from '@/components/ui/command-palette';
import { GlobalSearch } from '@/components/ui/global-search';
import { EnhancedKeyboardShortcuts } from '@/components/navigation';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';
import { useKeyboardShortcuts, commonShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSearchIndex } from '@/hooks/useGlobalSearch';

function App() {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { searchIndex } = useSearchIndex();

  // Register global shortcuts
  useKeyboardShortcuts([
    {
      ...commonShortcuts.commandPalette,
      callback: () => setCommandPaletteOpen(true)
    },
    {
      ...commonShortcuts.globalSearch,
      callback: () => setGlobalSearchOpen(true)
    },
    {
      ...commonShortcuts.help,
      callback: () => setShortcutsOpen(true)
    }
  ]);

  const breadcrumbs = [
    { label: 'Agents', href: '/agents' },
    { label: 'My Agent', current: true }
  ];

  return (
    <div>
      <BreadcrumbNav items={breadcrumbs} showHome />
      
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(section) => navigate(section)}
      />
      
      <GlobalSearch
        isOpen={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        searchIndex={searchIndex}
      />
      
      <EnhancedKeyboardShortcuts
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
}
```

## Accessibility

All navigation components support:
- Keyboard navigation
- Screen reader labels
- ARIA attributes
- Focus management
- Escape key to close

## Performance

- Debounced search (300ms default)
- Memoized search results
- Virtualized long lists
- Lazy-loaded command palette
- Efficient keyboard event handling
