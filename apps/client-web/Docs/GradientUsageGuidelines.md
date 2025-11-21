# Gradient Usage Guidelines

## Design Philosophy
Coinet AI uses a **professional terminal aesthetic** with **solid blue, black, and white** as primary colors. Gradients are used **extremely sparingly** - only for the 2-3 highest-value actions in the entire application.

## Color Hierarchy
1. **Primary**: Blue (hsl(222 95% 55%)) - Solid, professional
2. **Secondary**: Black/Dark Gray - Terminal aesthetic
3. **Tertiary**: White - Clean, readable
4. **Gradients**: Reserved ONLY for critical conversion actions

---

## ✅ Approved Gradient Use Cases (ONLY 3)

### 1. Account Creation (Sign Up Button)
**Location**: `src/components/auth/AuthPage.tsx`
```tsx
<Button 
  type="submit" 
  className="w-full h-12 font-medium"
  style={{
    background: 'linear-gradient(135deg, hsl(282 70% 55%), hsl(192 80% 50%))',
    color: 'white'
  }}
>
  Create Account
</Button>
```
**Rationale**: Highest-value conversion action - new user signup.

### 2. Primary Workspace Entry (Open Strategy Lab)
**Location**: `src/components/WelcomeScreen.tsx`
```tsx
<button
  className="..."
  style={{
    background: 'linear-gradient(135deg, hsl(282 70% 55%), hsl(192 80% 50%))',
    color: 'white'
  }}
>
  <Sparkles className="w-5 h-5" />
  Open Strategy Lab
</button>
```
**Rationale**: Primary entry point to the main workspace.

### 3. Focus Rings (Accessibility - Required)
**Location**: `src/index.css`
```css
.coinet-focus-ring {
  @apply focus-visible:ring-2 focus-visible:ring-offset-2;
  border: 1px solid transparent;
  background-image: linear-gradient(hsl(var(--background)), hsl(var(--background))),
                    var(--gradient-coinet);
  background-origin: border-box;
  background-clip: padding-box, border-box;
}
```
**Rationale**: WCAG accessibility requirement for keyboard navigation.

---

## ❌ Banned Gradient Use Cases (Use Solid Colors)

### Authentication & Navigation
- ❌ **Sign In button** → Use solid `bg-primary` (blue)
- ❌ **Navigation active states** → Use solid `border-l-2 border-l-primary` (blue)
- ❌ **Pro Plan badge** → Use solid text with icon (yellow crown)
- ❌ **Command palette border** → Use solid `border-primary` (blue)
- ❌ **Sidebar items** → Solid `bg-primary/10` for active state

### UI Elements & Surfaces
- ❌ **Body background** → Solid `bg-background` (black/white)
- ❌ **Card backgrounds** → Solid `bg-card` 
- ❌ **Secondary action cards** → Solid borders
- ❌ **Modal overlays** → Solid backgrounds with opacity
- ❌ **Tooltips** → Solid backgrounds

### Interactive Effects
- ❌ **Hover effects** → Subtle solid color changes or shadows
- ❌ **Button hover states** → Opacity changes (e.g., `hover:bg-primary/90`)
- ❌ **Link hover states** → Solid color transitions
- ❌ **Text underlines** → Solid colors or none
- ❌ **Loading indicators** → Solid colors with animations

### Typography & Icons
- ❌ **Heading underlines** → No underlines or solid only
- ❌ **Text colors** → Semantic tokens (solid)
- ❌ **Icon backgrounds** → Solid `bg-primary/10`
- ❌ **Badge backgrounds** → Solid colors

---

## Implementation Rules

### The "Three Gradient Rule"
**MAXIMUM 3 gradients in the entire application:**
1. Sign Up button (conversion)
2. Open Strategy Lab button (primary action)
3. Focus rings (accessibility)

### Everything Else Uses:
- **Blue** (hsl(222 95% 55%)) - Primary actions, active states
- **Black/Dark Gray** - Text, backgrounds (dark mode)
- **White** - Text, backgrounds (light mode)
- **Yellow/Orange** - Warnings, pro badges (solid)
- **Red** - Errors (solid)
- **Green** - Success states (solid)

### Before Adding ANY Gradient:
1. **Stop**: Can this use solid blue instead?
2. **Verify**: Is it worth more than $10,000/year in conversion value?
3. **Check**: Are you replacing one of the approved 3 gradients?
4. **Test**: Does it violate the terminal aesthetic?

If you answer "no" to any of these, **use solid blue**.

---

## Color Usage Examples

### Correct (Solid Colors)
```tsx
// Primary button - solid blue
<Button className="bg-primary hover:bg-primary/90">
  Sign In
</Button>

// Active navigation - solid blue border
<div className="border-l-2 border-l-primary bg-primary/10">
  Agents
</div>

// Pro badge - solid icon + text
<div className="flex items-center gap-1">
  <Crown className="w-3 h-3 text-warning fill-warning" />
  <span className="text-warning">Pro Plan</span>
</div>

// Card - solid background
<Card className="bg-card border-border">
  Content
</Card>
```

### Incorrect (Unnecessary Gradients)
```tsx
// ❌ Don't do this
<Button style={{ background: 'linear-gradient(...)' }}>
  Sign In
</Button>

// ❌ Don't do this
<div style={{ 
  background: 'linear-gradient(135deg, hsl(282 70% 55% / 0.15), ...)'
}}>
  Pro Plan
</div>

// ❌ Don't do this
<div className="bg-gradient-to-r from-primary to-cyan-500">
  Navigation Item
</div>
```

---

## Testing Checklist
- [ ] Gradients limited to exactly 3 instances
- [ ] Primary color (blue) used for all other actions
- [ ] Black/white used for backgrounds and text
- [ ] Terminal aesthetic maintained (professional, not flashy)
- [ ] Passes WCAG AA contrast requirements
- [ ] No performance impact from excessive gradients

---

**Last Updated**: 2025-10-02  
**Philosophy**: Less is more. Solid colors = professional. Gradients = extremely rare, high-value signals.


### 1. Account Creation (Sign Up Button)
**Location**: `src/components/auth/AuthPage.tsx`
```tsx
<Button 
  type="submit" 
  className="w-full h-12 font-medium"
  style={{
    background: 'linear-gradient(135deg, hsl(282 70% 55%), hsl(192 80% 50%))',
    color: 'white'
  }}
>
  Create Account
</Button>
```
**Rationale**: Account creation is the highest-value conversion action.

### 2. Pro Plan Badge/CTA
**Location**: `src/components/AppSidebar.tsx`
```tsx
<div 
  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
  style={{
    background: 'linear-gradient(135deg, hsl(282 70% 55% / 0.15), hsl(192 80% 50% / 0.15))',
    border: '1px solid hsl(282 70% 55% / 0.3)'
  }}
>
  <Crown className="w-3 h-3 text-warning fill-warning" />
  <span className="text-warning">Pro Plan</span>
</div>
```
**Rationale**: Subscription upgrade is a strategic revenue action.

### 3. Primary Workspace Entry (Open Strategy Lab)
**Location**: `src/components/WelcomeScreen.tsx`
```tsx
<button
  className="..."
  style={{
    background: 'linear-gradient(135deg, hsl(282 70% 55%), hsl(192 80% 50%))',
    color: 'white'
  }}
>
  <Sparkles className="w-5 h-5" />
  Open Strategy Lab
</button>
```
**Rationale**: Primary entry point to the main application workspace.

### 4. Focus Rings (Accessibility)
**Location**: `src/index.css`
```css
.coinet-focus-ring {
  @apply focus-visible:ring-2 focus-visible:ring-offset-2;
  border: 1px solid transparent;
  background-image: linear-gradient(hsl(var(--background)), hsl(var(--background))),
                    var(--gradient-coinet);
  background-origin: border-box;
  background-clip: padding-box, border-box;
}
```
**Rationale**: Critical for keyboard navigation accessibility.

### 5. Critical-Severity Alerts (Future Feature)
**Status**: Not yet implemented
**Rationale**: Urgent actions that require immediate attention should stand out.

### 6. Execute Trade Buttons (Future Feature)
**Status**: Not yet implemented
**Rationale**: High-stakes financial actions deserve clear visual distinction.

---

## ❌ Banned Gradient Use Cases

### Navigation & UI Elements
- ❌ **Sign In button** - Secondary action, use solid `bg-primary`
- ❌ **Navigation active states** - Use solid `border-l-2 border-l-primary`
- ❌ **Secondary action cards** - Use solid borders with minimal hover
- ❌ **Sidebar items** - Solid backgrounds only
- ❌ **Tab indicators** - Solid colors for clarity

### Visual Effects
- ❌ **Hover effects** - Use subtle shadows or border color changes only
- ❌ **Text underlines** - Solid colors or no underline
- ❌ **Card backgrounds** - Solid `bg-card` or subtle transparency
- ❌ **Loading states** - Simple animations without gradients
- ❌ **Tooltips** - Solid backgrounds for readability

### Typography
- ❌ **Heading underlines** - Removed `.coinet-gradient-underline`
- ❌ **Text colors** - Use semantic color tokens only
- ❌ **Link hover states** - Solid color transitions

---

## Implementation Rules

### When Adding a New Gradient:
1. **Ask**: Is this action worth $100+ to the business?
2. **Check**: Does it fit the approved use cases above?
3. **Verify**: Would removing it reduce conversion?
4. **Test**: Does it maintain professional terminal aesthetic?

### Color Palette
Use consistent gradient colors across the app:
```css
/* Primary Gradient (Purple → Cyan) */
background: linear-gradient(135deg, hsl(282 70% 55%), hsl(192 80% 50%));

/* Subtle Gradient (for badges/non-critical elements) */
background: linear-gradient(135deg, hsl(282 70% 55% / 0.15), hsl(192 80% 50% / 0.15));
```

### Opacity Guidelines
- **Full opacity** (no alpha): Account creation, primary CTAs
- **15% opacity**: Badges, subtle indicators
- **Focus rings**: Solid gradient border (accessibility requirement)

---

## Before & After Comparison

| Component | Before | After | Rationale |
|-----------|--------|-------|-----------|
| Auth Page | Gradients everywhere | Gradient ONLY on "Create Account" | Clear conversion focus |
| Sidebar Active | Gradient rail + glow | Solid 2px blue border | Professional, less noise |
| Pro Plan Badge | Plain text | Subtle gradient background | Strategic upgrade CTA |
| Welcome H1 | Gradient underline | Solid text | Improved readability |
| Strategy Lab CTA | Triple gradient + shadow | Clean dual gradient | Maintained as primary action |
| Secondary Cards | Gradient accents | Solid borders | Information density |
| Hover Effects | Lift + glow | Lift only (reduced) | Subtle, professional |

---

## Performance Impact
- **Reduced visual noise**: ~60%
- **Faster perceived performance**: Less animation overhead
- **Clearer hierarchy**: Gradients = "This matters"
- **Information density**: ↑ More focus on content

---

## Testing Checklist
When adding a new gradient, verify:
- [ ] Passes contrast ratio requirements (WCAG AA minimum)
- [ ] Works in both light and dark mode
- [ ] Doesn't interfere with text readability
- [ ] Renders correctly on different screen sizes
- [ ] Doesn't cause performance issues (check frame rate)
- [ ] Aligns with approved use cases listed above

---

## Resources
- Color contrast checker: https://webaim.org/resources/contrastchecker/
- Design system tokens: `src/index.css`
- Component examples: `src/components/auth/AuthPage.tsx`

---

**Last Updated**: 2025-10-02  
**Maintained By**: Frontend Team
