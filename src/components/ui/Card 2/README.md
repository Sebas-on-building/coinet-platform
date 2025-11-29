# Coinet Atomic Card System

> Inspired by Apple, Canva, TradingView, Solana. Designed for divined perfectionality, extensibility, and world-class UX.

## Philosophy
- **Atomic, modular, and extensible**: Every feature, sub-feature, and sub-sub-feature is its own component or hook.
- **World-class design**: Glassmorphism, gradients, soft shadows, beautiful spacing, micro-interactions, and accessibility.
- **Design tokens**: All spacing, radii, colors, and shadows use your design system.
- **Accessibility**: ARIA, keyboard, screen reader, and motion preference support.
- **Compliance & Analytics**: Audit, export, and analytics hooks for every action.

---

## Main Card Component

```tsx
import { Card } from './Card';

<Card
  header={<Card.Header>Title</Card.Header>}
  footer={<Card.Footer>Footer</Card.Footer>}
  actions={<Card.Actions><Button>Action</Button></Card.Actions>}
  status={<Card.Status>Live</Card.Status>}
  badge={<Card.Badge>New</Card.Badge>}
  clickable
  selectable
  selected={isSelected}
  glass
  gradient
  outlined
  shadow
  compact
  elevated
  confetti
  variant="frosted"
  onClick={...}
>
  <Card.Content>Main content here</Card.Content>
</Card>
```

---

## Atomic Subcomponents
- `Card.Header` — Title, icon, subtitle, actions
- `Card.Content` — Main content
- `Card.Footer` — Footer, info, summary
- `Card.Actions` — Buttons, menus, icons
- `Card.Status` — Badge, label, status icon
- `Card.Badge` — Overlay badge (notification, live, new)
- `Card.Skeleton` — Loading state
- `Card.Ripple` — Ripple/tap/press feedback
- `Card.Confetti` — Confetti burst for success
- `Card.Motion` — Framer Motion wrapper
- `Card.DragHandle` — Drag-and-drop handle
- `Card.Resizable` — Resizable wrapper
- `Card.ContextMenu` — Right-click/context menu
- `Card.AnalyticsProvider` — Analytics context/hook
- `Card.ComplianceProvider` — Compliance/audit context/hook
- `Card.ExportShare` — Export/share button (CSV, PDF, image, Web Share)
- `Card.UndoRedo` — Undo/redo button group with keyboard shortcuts
- `Card.PinButton` — Atomic, animated, accessible pin/star
- `Card.EventCheckbox` — Atomic, accessible, animated checkbox
- `Card.SelectAllCheckbox` — Atomic, accessible, animated select all
- `Card.BatchActionBar` — Batch actions for selected events
- `Card.ShareButton` — Atomic, animated, Web Share API + modal
- `Card.FocusRing` — Always-visible, themeable focus ring

---

## Advanced Features
- **Batch actions**: Select, export, flag, review multiple events
- **Pin/star**: Pin important events to top
- **Share**: Web Share API, modal, social, QR
- **Confetti**: Framer Motion-powered, ARIA-live
- **Live event updates**: Animate new events, ARIA live
- **Accessibility**: ARIA, keyboard, focus ring, motion preference
- **Design tokens**: All styles use tokens for consistency
- **Visual variants**: `variant="frosted"`, `variant="neon"`, `variant="minimal"`, etc.

---

## Usage Examples

### Batch Actions
```tsx
<EventCheckbox checked={selected} onChange={setSelected} />
<SelectAllCheckbox checked={allSelected} indeterminate={indeterminate} onChange={setAll} />
<BatchActionBar selectedCount={selectedIds.length} onExport={...} onFlag={...} onReview={...} onClear={...} />
```

### Pin/Star
```tsx
<PinButton pinned={isPinned} onToggle={togglePin} />
```

### Share
```tsx
<ShareButton url={url} title="Share this event" />
```

### Confetti
```tsx
<ConfettiBurst trigger={showConfetti} />
```

### Focus Ring
```tsx
<FocusRing asChild><button>Focusable</button></FocusRing>
```

### Design Tokens & Theme
```tsx
import { ThemeProvider } from './ThemeProvider';
<ThemeProvider mode="dark">...</ThemeProvider>
```

### Analytics & Compliance Hooks
```tsx
import { useAnalyticsEvent } from './hooks/useAnalyticsEvent';
import { useComplianceEvent } from './hooks/useComplianceEvent';
const logEvent = useAnalyticsEvent({ provider: 'amplitude' });
const logCompliance = useComplianceEvent({ provider: 'backend', gdprConsent: true });
logEvent('card_click', { cardId });
logCompliance('export', { ids });
```

### E2E/Unit Tests
- Jest/RTL: All atomic components, micro-interactions, accessibility
- Cypress: E2E for batch, pin, share, confetti, a11y, visual regression

---

## Extensibility
- Add new subcomponents or variants as needed
- Integrate with analytics, compliance, export, and more
- Use as a foundation for all dashboard, widget, and content layouts
- All tokens and theming are extensible for Apple/Canva/TradingView/Solana hybrid

---

## Accessibility & Design
- All interactive areas ≥44×44px
- Color contrast, ARIA, keyboard, screen reader
- Glassmorphism, gradients, soft shadows, beautiful transitions
- Touch, pointer, and keyboard support for all features
- FocusRing for all interactive elements
- ARIA live regions for updates, confetti, batch actions

---

## Analytics & Compliance
- Every action can be logged via hooks
- Pluggable providers (Amplitude, Segment, custom, backend)
- GDPR/CCPA ready, extensible for audit/compliance

---

## Credits
- Inspired by Apple, Canva, TradingView, Solana
- Designed for Coinet by world-class standards

## Event Details Modal (Atomic, World-Class)

### Components
- **EventDetailsModal**: Atomic, animated, glassmorphic, dark/light, ARIA, focus trap, Framer Motion ready. Shows all event metadata, actions, timeline, compliance notes, and is fully extensible.
- **MetadataView**: Atomic, beautiful, copy-to-clipboard for every field, JSON/raw toggle, micro-interactions, extensible.
- **Timeline**: Atomic, beautiful, shows related events as a timeline, highlights current event, micro-interactions, extensible.
- **ComplianceNotes**: Atomic, editable, glassmorphic, for compliance/audit notes, micro-interactions, extensible.
- **ActionBar**: Atomic, beautiful, shows actions (export, share, flag, add note, mark as reviewed), each as its own atomic button for extensibility.

### Usage
```tsx
import { EventDetailsModal } from './EventDetailsModal';

<EventDetailsModal
  open={open}
  event={event}
  relatedEvents={relatedEvents}
  onClose={...}
  onExport={...}
  onShare={...}
  onFlag={...}
  onAddNote={...}
  onMarkReviewed={...}
/>
```

### Extensibility
- Add more actions, analytics, compliance, review workflows.
- Integrate with backend for audit, export, review, and analytics.
- Style with design tokens for Apple/Canva/TradingView/Solana hybrid.

### Accessibility
- ARIA roles, keyboard nav, focus trap, color contrast, motion preference.
- Screen reader support, tooltips, micro-interactions.

### Design Philosophy
- Every feature is atomic, logged, and extensible.
- Modal and subcomponents are world-class, beautiful, and ready for further perfection. 