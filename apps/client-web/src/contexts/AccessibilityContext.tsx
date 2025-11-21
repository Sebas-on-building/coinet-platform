import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAriaLive } from '@/hooks/useAccessibility';
import { LiveRegion } from '@/components/ui/live-region';

interface AccessibilitySettings {
  reduceMotion: boolean;
  highContrast: boolean;
  fontSize: 'normal' | 'large' | 'xlarge';
  keyboardOnly: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    const saved = localStorage.getItem('accessibility-settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback to defaults
      }
    }
    return {
      reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
      fontSize: 'normal',
      keyboardOnly: false,
    };
  });

  const { announce, announceRef } = useAriaLive();

  const updateSettings = useCallback((newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('accessibility-settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  useEffect(() => {
    // Apply settings to document
    document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion);
    document.documentElement.classList.toggle('high-contrast', settings.highContrast);
    document.documentElement.setAttribute('data-font-size', settings.fontSize);
    document.documentElement.classList.toggle('keyboard-only', settings.keyboardOnly);
  }, [settings]);

  useEffect(() => {
    // Detect keyboard usage
    const handleMouseDown = () => {
      if (settings.keyboardOnly) {
        updateSettings({ keyboardOnly: false });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !settings.keyboardOnly) {
        updateSettings({ keyboardOnly: true });
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [settings.keyboardOnly, updateSettings]);

  return (
    <AccessibilityContext.Provider value={{ settings, updateSettings, announce }}>
      {children}
      <LiveRegion ref={announceRef} />
    </AccessibilityContext.Provider>
  );
}

export function useAccessibilityContext() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibilityContext must be used within AccessibilityProvider');
  }
  return context;
}
