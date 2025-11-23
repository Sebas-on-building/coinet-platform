import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  cmd?: boolean;
  shift?: boolean;
  alt?: boolean;
  preventDefault?: boolean;
}

interface Shortcut extends ShortcutConfig {
  callback: (event: KeyboardEvent) => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when user is typing in inputs
    const activeElement = document.activeElement;
    const isInputActive = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.getAttribute('contenteditable') === 'true'
    );

    for (const shortcut of shortcuts) {
      const {
        key,
        ctrl = false,
        cmd = false,
        shift = false,
        alt = false,
        preventDefault = true,
        callback
      } = shortcut;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdPressed = isMac ? event.metaKey : event.ctrlKey;
      const ctrlPressed = event.ctrlKey;

      const keyMatches = event.key.toLowerCase() === key.toLowerCase();
      const modifiersMatch = 
        (cmd ? cmdPressed : !event.metaKey) &&
        (ctrl ? ctrlPressed : !event.ctrlKey) &&
        (shift ? event.shiftKey : !event.shiftKey) &&
        (alt ? event.altKey : !event.altKey);

      if (keyMatches && modifiersMatch) {
        // Special case for '/' - allow in inputs for search
        if (key === '/' && isInputActive) {
          continue;
        }
        
        // Skip other shortcuts when input is active
        if (isInputActive && key !== 'Escape') {
          continue;
        }

        if (preventDefault) {
          event.preventDefault();
        }
        callback(event);
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Common shortcut configurations
export const commonShortcuts = {
  // Core commands
  commandPalette: { key: 'k', cmd: true, description: 'Open command palette' },
  globalSearch: { key: 'p', cmd: true, description: 'Global search' },
  search: { key: '/', description: 'Focus search input' },
  escape: { key: 'Escape', description: 'Close modal or return to main view' },
  
  // Navigation
  newChat: { key: 'n', cmd: true, description: 'Start new chat' },
  settings: { key: ',', cmd: true, description: 'Open settings' },
  agents: { key: '1', cmd: true, description: 'Go to agents' },
  alerts: { key: '2', cmd: true, description: 'Go to alerts' },
  canvas: { key: '3', cmd: true, description: 'Go to chart canvas' },
  analytics: { key: '4', cmd: true, description: 'Go to analytics' },
  
  // List navigation
  navUp: { key: 'k', description: 'Navigate up in list' },
  navDown: { key: 'j', description: 'Navigate down in list' },
  select: { key: 'Enter', description: 'Select highlighted item' },
  
  // Chat specific
  sendMessage: { key: 'Enter', cmd: true, description: 'Send message' },
  newLine: { key: 'Enter', shift: true, description: 'Add line break' },
  clearChat: { key: 'l', cmd: true, description: 'Clear conversation' },
  
  // Quick actions
  createAlert: { key: 'a', cmd: true, shift: true, description: 'Create new alert' },
  createAgent: { key: 'n', cmd: true, shift: true, description: 'Create new agent' },
  
  // Data manipulation
  selectAll: { key: 'a', cmd: true, description: 'Select all items' },
  delete: { key: 'Delete', description: 'Delete selected items' },
  rename: { key: 'F2', description: 'Rename selected item' },
  
  // Standard actions
  refresh: { key: 'r', cmd: true, description: 'Refresh data' },
  save: { key: 's', cmd: true, description: 'Save changes' },
  undo: { key: 'z', cmd: true, description: 'Undo last action' },
  redo: { key: 'z', cmd: true, shift: true, description: 'Redo last action' },
  
  // View controls
  toggleSidebar: { key: 'b', cmd: true, description: 'Toggle sidebar' },
  fullscreen: { key: 'f', cmd: true, description: 'Toggle fullscreen' },
  zoom: { key: '=', cmd: true, description: 'Zoom in' },
  zoomOut: { key: '-', cmd: true, description: 'Zoom out' },
  
  // Help
  help: { key: '?', cmd: true, description: 'Show keyboard shortcuts' },
};

// Hook for specific feature areas
export function useChatShortcuts({
  onSendMessage,
  onNewChat,
  onClearChat,
  onFocusInput
}: {
  onSendMessage?: () => void;
  onNewChat?: () => void;
  onClearChat?: () => void;
  onFocusInput?: () => void;
}) {
  useKeyboardShortcuts([
    {
      ...commonShortcuts.sendMessage,
      callback: () => onSendMessage?.()
    },
    {
      ...commonShortcuts.newChat,
      callback: () => onNewChat?.()
    },
    {
      ...commonShortcuts.clearChat,
      callback: () => onClearChat?.()
    },
    {
      ...commonShortcuts.search,
      callback: () => onFocusInput?.()
    }
  ]);
}

export function useListNavigation({
  items,
  selectedIndex,
  onSelect,
  onSelectionChange
}: {
  items: any[];
  selectedIndex: number;
  onSelect?: (index: number) => void;
  onSelectionChange?: (index: number) => void;
}) {
  useKeyboardShortcuts([
    {
      ...commonShortcuts.navUp,
      callback: () => {
        const newIndex = Math.max(0, selectedIndex - 1);
        onSelectionChange?.(newIndex);
      }
    },
    {
      ...commonShortcuts.navDown,
      callback: () => {
        const newIndex = Math.min(items.length - 1, selectedIndex + 1);
        onSelectionChange?.(newIndex);
      }
    },
    {
      ...commonShortcuts.select,
      callback: () => {
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          onSelect?.(selectedIndex);
        }
      }
    }
  ]);
}

// Hook for global shortcuts that should work everywhere
export function useGlobalShortcuts({
  onOpenCommandPalette,
  onOpenSettings,
  onEscape
}: {
  onOpenCommandPalette?: () => void;
  onOpenSettings?: () => void;
  onEscape?: () => void;
}) {
  useKeyboardShortcuts([
    {
      ...commonShortcuts.commandPalette,
      callback: () => onOpenCommandPalette?.()
    },
    {
      ...commonShortcuts.settings,
      callback: () => onOpenSettings?.()
    },
    {
      ...commonShortcuts.escape,
      callback: () => onEscape?.()
    }
  ]);
}