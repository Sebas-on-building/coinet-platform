# Coinet Atomic Button Primitives

## Design Philosophy
- Inspired by Apple, Canva, TradingView, Solana
- Every feature, sub-feature, and sub-sub-feature is atomic, extensible, testable, and beautiful
- World-class design: glassmorphism, gradients, micro-interactions, dark/light mode, accessibility, beautiful transitions
- All props, events, and slots are documented and ready for future expansion
- Accessibility, analytics, compliance, and testing are first-class

## Usage
```tsx
import { Button, ButtonGroup, ButtonIcon, ButtonLoader, ButtonRipple, ButtonConfetti, ... } from './Button';

<ButtonGroup>
  <Button variant="primary">Primary</Button>
  <Button variant="secondary">Secondary</Button>
  <Button variant="success" icon={<CheckIcon />}>Success</Button>
</ButtonGroup>
```

## Subcomponents
- ButtonGroup: Grouping, orientation, ARIA, keyboard navigation
- ButtonIcon: Left/right/standalone icon, size, color, ARIA
- ButtonLoader: Loading spinner, size, color, ARIA
- ButtonRipple: Custom ripple effect, color, duration
- ButtonConfetti: Confetti/celebration effect, trigger, color
- ...and many more (see Button.tsx for full list)

## Extensibility
- Each subcomponent is its own file, with atomic tests and docs
- All design tokens, themes, and variants are ready for extension
- Analytics and compliance hooks are pluggable

## Testing
- Jest/RTL for every atomic unit
- Cypress E2E for all flows
- Visual regression, a11y, edge cases, error states

## TODO
- Implement all atomic subcomponents in Button/
- Add more world-class micro-interactions and design tokens
- Expand documentation with usage examples and best practices 