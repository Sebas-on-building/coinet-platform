# Coinet Card E2E Testing

> World-class, atomic, and extensible E2E tests for the Coinet Card system. Inspired by Apple, Canva, TradingView, Solana.

## Overview
- All Card features and variants are covered in `cypress/e2e/card.cy.ts`.
- The `/card-demo` page is the canonical showcase for all Card atomic features and flows.
- Tests are atomic, modular, and extensible for rapid iteration and world-class QA.

## Running E2E Tests

1. **Install dependencies:**
   ```sh
   npm install
   # or
   yarn install
   ```
2. **Run Cypress UI:**
   ```sh
   npx cypress open
   ```
3. **Run Cypress headless:**
   ```sh
   npx cypress run
   ```

## Visual Regression (Percy, Happo, Chromatic)
- Percy is integrated via `@percy/cypress`.
- Snapshots are taken in the `visual regression` test block.
- To run Percy:
  ```sh
  npx percy exec -- npx cypress run
  ```
- For Happo/Chromatic, add their snapshot commands similarly.

## Automated Accessibility (axe-core, cypress-axe)
- Accessibility checks are automated via `cypress-axe`.
- To run a11y checks:
  ```sh
  npx cypress open # or run
  # See the `automated accessibility check (axe)` test
  ```

## Test Structure & Coverage
- **All features:** drag, resize, context menu, export/share, undo/redo, analytics, compliance, error/edge cases.
- **Accessibility:** tab order, ARIA, focus ring, motion preference.
- **Visual regression:** all variants (frosted, neon, minimal, etc.).
- **Edge cases:** rapid undo/redo, failed exports, keyboard-only navigation, error states.
- **Analytics/compliance:** event tracking is stubbed for demo, ready for real integration.

## Extending Tests
- Add new Card features/variants to `/card-demo` and update `card.cy.ts`.
- Use atomic selectors (e.g., `.co-card-*`) for maintainability.
- Add new visual regression or a11y checks as features evolve.
- Follow Apple/Canva/TradingView/Solana QA standards: pixel-perfect, accessible, and delightful.

## Best Practices
- Keep tests atomic and focused.
- Use ARIA and design tokens for all accessibility and visual checks.
- Document all new flows and edge cases.
- Review Percy/Happo/Chromatic snapshots for every PR.
- Run a11y checks on every commit.

---

For questions or contributions, see the main project README or contact the Coinet QA team. 