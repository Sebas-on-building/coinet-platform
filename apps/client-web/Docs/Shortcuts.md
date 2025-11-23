# Keyboard Shortcuts & Navigation

## Global Shortcuts

### Quick Actions
- `Cmd/Ctrl + K` - Open command palette (search everything)
- `/` - Focus AI chat input
- `Esc` - Close current modal/drawer or return to main view
- `Cmd/Ctrl + N` - Start new chat
- `Cmd/Ctrl + ,` - Open settings

### Navigation
- `J` / `K` - Navigate up/down in lists (alerts, agents, chat history)
- `Enter` - Select highlighted item or submit active form
- `Tab` / `Shift + Tab` - Navigate between interactive elements
- `Cmd/Ctrl + 1-6` - Jump to sidebar sections (New Chat, Recent, Agents, Alerts, Strategy Lab, Settings)

### Chat Interface
- `↑` / `↓` - Navigate through chat history
- `Cmd/Ctrl + Enter` - Send message
- `Shift + Enter` - Add line break in message
- `Cmd/Ctrl + L` - Clear current conversation

### Data Tables & Lists
- `Space` - Select/deselect item in multi-select lists
- `Cmd/Ctrl + A` - Select all items
- `Delete` - Remove selected items (with confirmation)
- `F2` - Rename selected item (where applicable)

## Context-Specific Shortcuts

### Alert Management
- `A` - Create new alert (when in alerts section)
- `T` - Test selected alert
- `M` - Mute/unmute selected alert
- `D` - Duplicate selected alert

### Agent Builder
- `Cmd/Ctrl + S` - Save agent configuration
- `Cmd/Ctrl + T` - Test agent logic
- `R` - Run agent manually

### Chart Navigation
- `+` / `-` - Zoom in/out on charts
- `←` / `→` - Navigate time periods
- `F` - Toggle fullscreen chart view
- `C` - Copy chart data/image

## Accessibility Features

### Screen Reader Support
- All interactive elements have proper ARIA labels
- Complex data visualizations include text alternatives
- Live regions announce important status changes

### Keyboard Focus Management
- Focus trapping in modals and drawers  
- Logical tab order through all interface elements
- Clear focus indicators with high contrast
- Skip links for main content areas

### Visual Accessibility
- High contrast mode support
- Reduced motion preferences respected
- Scalable fonts and interface elements
- Color-blind friendly data visualizations

## Implementation Notes

### Focus Management
- Modal opens: Focus moves to first interactive element
- Modal closes: Focus returns to trigger element
- List navigation: Focus follows selection
- Form submission: Focus moves to success message or first error

### Visual Feedback
- Pressed state for all clickable elements
- Loading states for async operations
- Clear hover states on interactive elements
- Smooth transitions (respecting prefers-reduced-motion)

### Search & Command Palette
- Fuzzy search across all features and content
- Recent commands prioritized in results
- Keyboard shortcuts displayed in results
- Contextual suggestions based on current view