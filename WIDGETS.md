# Coinet Dashboard Widgets Guide

## Overview

Coinet's dashboard is powered by a modular, extensible widget system. Each widget is a self-contained analytics module, registered in a central registry with its config schema, icon, description, and layout. This guide explains how to add new widgets, config options, and extend the dashboard for future features.

---

## 1. Widget Registry System

- All widgets are registered in `src/components/dashboard/widgets/registry.ts`.
- Each entry defines:
  - `key`: Unique string identifier
  - `name`: Display name
  - `icon`: Emoji or SVG
  - `description`: Short summary
  - `component`: Dynamic import of the widget React component
  - `defaultLayout`: Grid position/size
  - `configSchema`: Array of config fields (see below)

**Example:**

```ts
{
  key: 'market-overview',
  name: 'Market Overview',
  icon: '📊',
  description: 'Global market stats, trending coins, anomalies, and AI insights.',
  component: dynamic(() => import('./MarketOverviewWidget'), { ssr: false }),
  defaultLayout: { i: 'market-overview', x: 0, y: 0, w: 2, h: 2 },
  configSchema: [
    { key: 'timeframe', label: 'Timeframe', type: 'select', options: ['24h', '7d', '30d'], default: '24h' },
  ],
}
```

---

## 2. How to Add a New Widget

1. **Create the Widget Component**

   - Place it in `src/components/dashboard/widgets/YourWidgetName.tsx`.
   - Accept a `config` prop for user settings.
   - Use Tailwind and shadcn/ui for styling.
   - Example:
     ```tsx
     interface YourWidgetProps { config?: { ... }; }
     export default function YourWidget({ config }: YourWidgetProps) { /* ... */ }
     ```

2. **Register the Widget**

   - Add an entry to `widgetRegistry` in `registry.ts`.
   - Define `key`, `name`, `icon`, `description`, `component`, `defaultLayout`, and `configSchema`.
   - Use dynamic import for the component:
     ```ts
     component: dynamic(() => import("./YourWidgetName"), { ssr: false });
     ```

3. **Define the Config Schema**

   - Each config field is an object:
     - `key`: string (field name)
     - `label`: string (display label)
     - `type`: 'select' | 'text' | 'multiselect' | ...
     - `options`: array (for select/multiselect)
     - `default`: default value
   - Example:
     ```ts
     configSchema: [
       {
         key: "asset",
         label: "Asset",
         type: "select",
         options: ["BTC", "ETH"],
         default: "BTC",
       },
       { key: "threshold", label: "Threshold", type: "text", default: "" },
     ];
     ```

4. **Test the Widget**
   - Add it via the dashboard UI, open the config modal, and verify settings persist and update the widget.

---

## 3. Adding New Config Field Types

- Supported types: `select`, `text`, `multiselect` (add more as needed).
- To add a new type (e.g., slider, toggle):
  1. Update the config modal form in `page.tsx` to render the new field type.
  2. Add handling for value changes and defaults.

---

## 4. Example: Adding a "Gas Tracker" Widget

1. **Create `GasTrackerWidget.tsx`:**
   ```tsx
   interface GasTrackerWidgetProps {
     config?: { network?: string };
   }
   export default function GasTrackerWidget({ config }: GasTrackerWidgetProps) {
     // Fetch and display gas prices for the selected network
     return <div>Gas price for {config?.network}: ...</div>;
   }
   ```
2. **Register in `registry.ts`:**
   ```ts
   {
     key: 'gas-tracker',
     name: 'Gas Tracker',
     icon: '⛽',
     description: 'Track gas prices for major blockchains.',
     component: dynamic(() => import('./GasTrackerWidget'), { ssr: false }),
     defaultLayout: { i: 'gas-tracker', x: 0, y: 4, w: 2, h: 2 },
     configSchema: [
       { key: 'network', label: 'Network', type: 'select', options: ['Ethereum', 'Polygon', 'BSC'], default: 'Ethereum' },
     ],
   }
   ```
3. **Test in the dashboard!**

---

## 5. Extending Widget Actions

- To add new widget actions (e.g., refresh, expand, export):
  - Add a button to the widget card in `page.tsx`.
  - Pass a handler to the widget component as a prop if needed.

---

## 6. Tips

- Use React.memo for widgets to optimize performance.
- Use Suspense and ErrorBoundary for loading/error handling.
- Keep widgets small, focused, and composable.
- Document new widgets and config fields for future contributors.

---

For questions or contributions, see the main `README.md` or open an issue!
