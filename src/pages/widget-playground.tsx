import React, { useState } from 'react';
import { DesignSystemProvider } from '@/components/design-system/DesignSystemProvider';
import { ThemeSwitcher } from '@/components/design-system/ThemeSwitcher';
import { WidgetCanvas } from '@/components/widgets/WidgetCanvas';
import { CanvasParticles } from '@/components/widgets/CanvasParticles';
import { AccessibilityChecker } from '@/components/widgets/AccessibilityChecker';
import { AIAssistant } from '@/components/widgets/AIAssistant';
// --- New atomic imports ---
import { TokenPlayground } from '@/components/widgets/TokenPlayground';
import { PluginMarketplace } from '@/components/widgets/PluginMarketplace';
import { AIAssistantPanel } from '@/components/widgets/AIAssistantPanel';

const TABS = [
  { key: 'widgets', label: 'Widget Playground', icon: '🧩' },
  { key: 'tokens', label: 'Token Playground', icon: '🎨' },
  { key: 'plugins', label: 'Plugin Marketplace', icon: '🛒' },
  { key: 'ai', label: 'AI Assistant', icon: '🤖' },
];

export default function WidgetPlayground() {
  const [tab, setTab] = useState('widgets');
  // Example: AI suggestion and accessibility issues would be dynamic in a real app
  const aiSuggestion = 'Try adding a Progress widget to track your portfolio performance!';
  const accessibilityIssues: string[] = [];
  return (
    <DesignSystemProvider>
      <CanvasParticles />
      <ThemeSwitcher />
      <nav aria-label="Playground Tabs" style={{ display: 'flex', gap: 16, margin: 24 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key}
            style={{
              fontWeight: tab === t.key ? 700 : 400,
              fontSize: 18,
              background: tab === t.key ? 'var(--co-primary)' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--co-text)',
              border: 'none',
              borderRadius: 12,
              padding: '8px 20px',
              cursor: 'pointer',
              boxShadow: tab === t.key ? '0 2px 12px 0 #0057FF33' : 'none',
              transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
            }}
          >
            <span style={{ marginRight: 8 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>
      <main style={{ position: 'relative', minHeight: 600, padding: 32, borderRadius: 24, background: 'var(--co-surface, #fff)', boxShadow: '0 4px 32px 0 #0057FF11', margin: 24, zIndex: 1 }}>
        {tab === 'widgets' && <WidgetCanvas />}
        {tab === 'tokens' && <TokenPlayground />}
        {tab === 'plugins' && <PluginMarketplace />}
        {tab === 'ai' && <AIAssistantPanel />}
      </main>
      <AIAssistant suggestion={aiSuggestion} />
      <AccessibilityChecker issues={accessibilityIssues} />
    </DesignSystemProvider>
  );
}
// TODO: Each sub-feature/component should be atomic, animated, themeable, accessible, and extensible.
// TODO: TokenPlayground: live token editor, theme switcher, export, audit, Figma sync, versioning, audit log, rollback, etc.
// TODO: PluginMarketplace: discover, install, manage plugins, plugin details, reviews, AI-powered plugin suggestions, etc.
// TODO: AIAssistantPanel: AI Q&A, auto-group, auto-theme, auto-doc, live chat, explainability, etc.
// TODO: Add Storybook stories and tests for each atomic component. 