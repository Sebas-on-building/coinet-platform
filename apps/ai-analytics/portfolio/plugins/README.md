# Coinet Portfolio Evaluator Plugin System

## Overview
The plugin system allows you to add new analytics, notifications, and integrations with zero friction. Each plugin is a simple JS file exporting one or more hooks.

## Plugin Directory
- Place plugins in the `plugins/` directory.
- Each plugin can export any of the following hooks:
  - `onPortfolioTick(context)` — called on every tick for every portfolio holding the symbol.
  - `onAlertCheck(context)` — called on every alert check (after value/P&L update).

## Example Plugin: Advanced Analytics
```js
module.exports = {
  async onPortfolioTick({ portfolioId, symbol, price, value, pnl }) {
    // Compute custom analytics, store in Redis/DB, etc.
  },
};
```

## Example Plugin: Email Notification
```js
module.exports = {
  async onAlertCheck({ portfolioId, symbol, price, pnl }) {
    // Send email if alert condition met
  },
};
```

## Example Plugin: Webhook Integration
```js
module.exports = {
  async onPortfolioTick(context) {
    // Post to external API/webhook
  },
};
```

## Adding a Plugin
1. Create a `.js` file in `plugins/`.
2. Export one or more hooks.
3. Use any Node.js or external libraries.

## Design Principles
- **Modular**: Each plugin is self-contained.
- **Extensible**: Add new analytics, notifications, or integrations instantly.
- **Beautiful**: Code and docs are as elegant as the UI.

---

For more, see the plugin examples in this directory and the main `portfolio_evaluator.js`. 