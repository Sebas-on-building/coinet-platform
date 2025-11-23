# Coinet Shared UI (shared-ui)

> Atomic, themeable, accessible UI components for Coinet. Inspired by Apple, Canva, TradingView, and Solana.

---

## ✨ Features
- **Atomic Design**: Atoms, Molecules, Organisms, Templates, Pages
- **Design Tokens**: Centralized, versioned, exported to CSS/JSON
- **Themeable**: Light/dark, custom themes, device-adaptive
- **Accessible**: WCAG AA+, ARIA, keyboard, color contrast
- **Storybook**: Live docs, device emulation, design token panel
- **Extensible**: Plugins, widgets, marketplace

---

## 🚀 Quick Start
1. `cd packages/shared-ui`
2. `npm install`
3. `npm run storybook`

---

## 🏗️ Structure
- `/atoms` — Buttons, Inputs, Badges, etc.
- `/molecules` — SearchBar, AssetRow, ChartToolControl
- `/organisms` — Header, DashboardCard, WidgetBuilder
- `/templates` — Dashboard, Portfolio, Trading
- `/pages` — Dashboard, Portfolio, Trading, Settings

---

## 📦 Usage Example
```tsx
import { Button } from 'shared-ui/atoms/Button';
<Button variant="primary">Trade Now</Button>
```

---

## Atomic Theming
- Theme tokens in `design-tokens/tokens/theme.json` (light/dark, Apple/Canva/TradingView/Solana fusion)
- Use `useTheme()` hook for theme switching and access to tokens
- All components consume theme tokens for color, background, etc.

## Accessibility
- Use `VisuallyHidden` for screen-reader-only content
- All components support ARIA and keyboard navigation
- Follow WCAG and Apple/Canva/TradingView/Solana accessibility best practices

## Plugin System
- Register plugins with `PluginProvider` and `useRegisterPlugin`
- Render plugins in extension slots (panel, widget, action) with `usePlugins(slot)`
- Plugins can extend UI with new panels, widgets, or actions

## Usage
```tsx
import { PluginProvider, usePlugins, useRegisterPlugin } from './plugins/PluginSystem';
import { useTheme } from '../themes/useTheme';

// Wrap your app
<PluginProvider>
  <App />
</PluginProvider>

// Register a plugin
useRegisterPlugin({ id: 'my-widget', slot: 'widget', render: () => <MyWidget /> });

// Render all widgets
const widgets = usePlugins('widget');
return <>{widgets.map(w => w.render())}</>;
```

---

> **Build the future of crypto analytics and trading.**
> **Pixel-perfect. Infinitely extensible. Designed for humans.**
