import React from 'react';
import NavigationBar from '../organisms/NavigationBar';
import { TabBar } from '../organisms/TabBar';
import { SkeletonLoader } from '../atoms/SkeletonLoader';
import { ErrorMessage } from '../atoms/ErrorMessage';
import { A11yAnnouncer } from '../atoms/A11yAnnouncer';
import { SkipToContent } from '../atoms/SkipToContent';
import { NetworkStatusBanner } from '../organisms/NetworkStatusBanner';
import { FocusTrap } from '../organisms/FocusTrap';
import tokens from '../../tokens';

export const StyleGuidePage: React.FC = () => (
  <div className="co-styleguide-page">
    <h1>Coinet Design System & UX Flows</h1>
    <section>
      <h2>User Flows (Mapped)</h2>
      <ol>
        <li>Login → Dashboard → Open Chart → Set Alert → Log Out</li>
        <li>Register → Onboarding → Dashboard</li>
        <li>Dashboard → Portfolio → Asset Details → News → Social Feed</li>
        <li>Dashboard → Settings → Account/Theme/Accessibility</li>
        <li>Asset → News → Verified News → Project News Manager</li>
      </ol>
      <p className="text-gray-500 text-sm mt-2">Every flow is engineered for accessibility, extensibility, and pixel-perfect design. All navigation, loading, and error states are consistent and accessible.</p>
    </section>
    <section>
      <h2>2.4 UX Flows & Accessibility</h2>
      <ol>
        <li>Login → Dashboard → Open Chart → Set Alert → Log Out</li>
        <li>Register → Onboarding → Dashboard</li>
        <li>Dashboard → Portfolio → Asset Details → News → Social Feed</li>
        <li>Asset → News → Verified News → Project News Manager</li>
      </ol>
      <h3>Navigation Patterns</h3>
      <NavigationBar
        items={[
          { icon: '🏠', label: 'Dashboard', onClick: () => { }, active: true },
          { icon: '📈', label: 'Chart', onClick: () => { } },
          { icon: '🔔', label: 'Alerts', onClick: () => { } },
          { icon: '👤', label: 'Profile', onClick: () => { } },
        ]}
        mode="desktop"
      />
      <TabBar
        items={[
          { icon: '🏠', label: 'Dashboard', onClick: () => { }, active: true },
          { icon: '📈', label: 'Chart', onClick: () => { } },
          { icon: '🔔', label: 'Alerts', onClick: () => { } },
          { icon: '👤', label: 'Profile', onClick: () => { } },
        ]}
      />
      <SkipToContent />
      <h3>Loading & Error States</h3>
      <SkeletonLoader variant="rect" width={200} height={32} />
      <ErrorMessage message="Failed to load data." code={500} onRetry={() => { }} />
      <NetworkStatusBanner />
      <h3>Accessibility Best Practices</h3>
      <ul>
        <li>Screen-reader labels (aria-label, aria-live, aria-atomic)</li>
        <li>Keyboard navigation (Tab, Arrow keys, FocusTrap)</li>
        <li>Sufficient color contrast (WCAG AA+)</li>
        <li>Semantic HTML (main, nav, section, role attributes)</li>
        <li>Skip to Content link for fast navigation</li>
        <li>Live region announcements (A11yAnnouncer)</li>
        <li>Touch targets ≥ 44x44px</li>
      </ul>
      <A11yAnnouncer message="Live region: Welcome to Coinet!" />
      <FocusTrap>
        <button>Focusable 1</button>
        <button>Focusable 2</button>
      </FocusTrap>
      <h3>Best Practices</h3>
      <ul>
        <li>All flows are modular, extensible, and accessible by default.</li>
        <li>Navigation is consistent across all screens and platforms.</li>
        <li>Loading and error states are always visible and accessible.</li>
        <li>All code uses semantic HTML and ARIA for accessibility.</li>
        <li>Design is inspired by Apple, Canva, TradingView, Solana.</li>
      </ul>
    </section>
    <section>
      <h2>Design Tokens</h2>
      <ul>
        <li>Color: --co-primary, --co-bg, --co-text, --co-accent, --co-error, --co-success, --co-warning</li>
        <li>Spacing: --co-space-xs, --co-space-sm, --co-space-md, --co-space-lg, --co-space-xl</li>
        <li>Typography: --co-font-sans, --co-font-mono, --co-font-size-base, --co-font-size-lg</li>
        <li>Border Radius: --co-radius-sm, --co-radius-md, --co-radius-lg</li>
        <li>Shadow: --co-shadow-xs, --co-shadow-md, --co-shadow-lg</li>
      </ul>
    </section>
    <section>
      <h2>2.5 Design Tools & Collaboration</h2>
      <ol>
        <li><strong>Design Mockups</strong>
          <ul>
            <li>Figma/Sketch live file: <a href="https://www.figma.com/file/EXAMPLE/COINET-DESIGN-SYSTEM" target="_blank" rel="noopener">Open Figma</a></li>
            <li>Real-time sync: All changes are instantly reflected in the developer workspace.</li>
            <li>Version history: Every design iteration is tracked, revertible, and commentable.</li>
            <li>Design tokens are linked directly to Figma variables for live updates.</li>
            <li>Design review: Pixel-perfect overlays, annotation, and accessibility checks.</li>
            <li>Design QA: Automated visual regression and accessibility testing.</li>
          </ul>
        </li>
        <li><strong>Component Library</strong>
          <ul>
            <li>Storybook: <a href="/storybook" target="_blank" rel="noopener">Open Storybook</a> — Live, versioned, and documented.</li>
            <li>Zeroheight: <a href="https://zeroheight.com/" target="_blank" rel="noopener">Open Zeroheight</a> — Designer/developer handoff, live docs, and design specs.</li>
            <li>Atomic structure: Atoms, Molecules, Organisms, Templates, Pages, all with live code and design previews.</li>
            <li>Live controls: Adjust props, themes, and tokens in real time.</li>
            <li>Accessibility panel: Automated a11y checks, color contrast, keyboard nav, and screen reader simulation.</li>
            <li>Design/dev sync: All changes are reviewed and merged via PRs with visual diffs and a11y reports.</li>
          </ul>
        </li>
        <li><strong>Design Token Export</strong>
          <ul>
            <li>Export to CSS variables: <code>tokens.css</code> auto-generated for global theming.</li>
            <li>Export to JSON: <code>tokens.json</code> for programmatic use in apps, docs, and design tools.</li>
            <li>Live sync: Updates in Figma/Sketch flow directly into code via token sync scripts.</li>
            <li>Multi-theme support: Apple, Canva, TradingView, Solana, and custom themes.</li>
            <li>Token versioning: Every change is tracked, reviewed, and revertible.</li>
            <li>Token audit: Automated checks for contrast, naming, and usage.</li>
            <li>Token playground: Live editor to preview and export custom token sets.</li>
          </ul>
          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <h4>Live Token Export Example</h4>
            <pre style={{ background: '#f3f4f6', borderRadius: 8, padding: 16, fontSize: 13 }}>
              {JSON.stringify(tokens, null, 2)}
            </pre>
          </div>
        </li>
        <li><strong>Collaboration & Review</strong>
          <ul>
            <li>Live comments: Designers and devs can annotate any component or token.</li>
            <li>Presence: See who is viewing or editing in real time.</li>
            <li>Design/dev chat: Integrated chat for instant feedback and discussion.</li>
            <li>Review workflow: Assign reviewers, track approvals, and automate merge on approval.</li>
            <li>Design handoff: Automated asset export, redlines, and code snippets.</li>
            <li>Design QA: Visual regression, a11y, and performance checks before merge.</li>
          </ul>
        </li>
        <li><strong>Extensibility & Future-Proofing</strong>
          <ul>
            <li>Plugin system: Add new design tools, integrations, or export formats.</li>
            <li>API: Programmatic access to tokens, components, and docs.</li>
            <li>Marketplace: Share and discover new widgets, templates, and tokens.</li>
            <li>AI-powered suggestions: Auto-group, auto-theme, and auto-document components.</li>
            <li>Version history: Full audit trail for every design, token, and component.</li>
            <li>Design system health: Automated reports on coverage, usage, and a11y.</li>
          </ul>
        </li>
      </ol>
      <h3>Best Practices</h3>
      <ul>
        <li>Design and code are always in sync, with live updates and version control.</li>
        <li>All tokens, components, and docs are modular, extensible, and accessible.</li>
        <li>Design system is inspired by Apple, Canva, TradingView, and Solana, but sets a new industry standard.</li>
        <li>Every feature is engineered for pixel-perfect, accessible, and delightful UX.</li>
        <li>All flows are documented, reviewed, and ready for future innovation.</li>
      </ul>
    </section>
    <section>
      <h2>Design Principles & Inspiration</h2>
      <ul>
        <li><strong>Apple:</strong> Clarity, depth, large touch targets, subtle gradients, and Human Interface Guidelines for iOS/macOS. <a href="https://developer.apple.com/design/human-interface-guidelines/" target="_blank" rel="noopener">Apple HIG</a></li>
        <li><strong>Canva:</strong> Friendliness, playful micro-interactions, approachable UI, and easy onboarding.</li>
        <li><strong>TradingView:</strong> Rich chart interactivity, advanced controls, and professional analytics.</li>
        <li><strong>Solana:</strong> Vibrant, modern color palette and gradients for brand identity.</li>
        <li><strong>Minimalism:</strong> High contrast text, plenty of whitespace, and focus on content.</li>
        <li><strong>Responsive:</strong> Breakpoints for mobile, tablet, desktop; tab bars on iOS, material guidelines on Android.</li>
      </ul>
      <h3>Live Color Palette & Gradients</h3>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        {Object.entries(tokens.colors.light).map(([key, value]) => (
          <div key={key} style={{ background: value, color: '#fff', borderRadius: 8, padding: 12, minWidth: 80, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>{key}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        {Object.entries(tokens.colors.gradients).map(([key, value]) => (
          <div key={key} style={{ background: value, color: '#fff', borderRadius: 8, padding: 12, minWidth: 120, textAlign: 'center', fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>{key}</div>
        ))}
      </div>
      <h3>Responsive Breakpoints</h3>
      <ul>
        {Object.entries(tokens.breakpoints).map(([key, value]) => (
          <li key={key}><strong>{key}:</strong> {value}</li>
        ))}
      </ul>
      <h3>Best Practices</h3>
      <ul>
        <li>Use whitespace and high contrast for clarity and focus.</li>
        <li>Follow platform conventions for navigation and layout.</li>
        <li>All UI is pixel-perfect, themeable, and accessible by default.</li>
        <li>Design is modular, extensible, and ready for future innovation.</li>
      </ul>
    </section>
    <section>
      <h2>UI Style Guide & Component Library</h2>
      <ul>
        <li><strong>Typography:</strong> Font families, sizes, weights, and line heights. All text uses design tokens for consistency.</li>
        <li><strong>Color Palette:</strong> Light/dark variants, brand accents, and gradients. All colors are tokenized and themeable.</li>
        <li><strong>Iconography:</strong> Consistent, scalable icons for all UI elements, referencing a shared icon set.</li>
        <li><strong>Spacing:</strong> Margin, padding, and layout driven by spacing tokens.</li>
        <li><strong>Component Specs:</strong> All atomic UI elements (Button, Input, Chart, Modal, Tooltip, etc.) are documented with props, states, and token-driven styles.</li>
        <li><strong>Storybook:</strong> Components are developed in isolation and documented live. <a href="/storybook" target="_blank" rel="noopener">Open Storybook</a></li>
        <li><strong>Atomic Design:</strong> Atoms, Molecules, Organisms, Templates, Pages. <a href="https://bradfrost.com/blog/post/atomic-design-and-storybook/" target="_blank" rel="noopener">Learn more</a></li>
        <li><strong>NPM Package:</strong> The design system is published as an NPM package for use across all platforms (web, iOS, Android, desktop).</li>
        <li><strong>References:</strong> Apple, Canva, TradingView, Solana.</li>
      </ul>
      <h3>Live Typography</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {Object.entries(tokens.typography.fontSize).map(([key, value]) => (
          <div key={key} style={{ fontSize: value, fontFamily: tokens.typography.fontFamily.sans, fontWeight: 600 }}>{key}: {value}</div>
        ))}
      </div>
      <h3>Live Color Palette (Light/Dark)</h3>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        {Object.entries(tokens.colors.light).map(([key, value]) => (
          <div key={key} style={{ background: value, color: '#fff', borderRadius: 8, padding: 12, minWidth: 80, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>{key}</div>
        ))}
        {Object.entries(tokens.colors.dark).map(([key, value]) => (
          <div key={key} style={{ background: value, color: '#fff', borderRadius: 8, padding: 12, minWidth: 80, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>{key}</div>
        ))}
      </div>
      <h3>Live Iconography</h3>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        {/* Example icons, replace with your icon set */}
        <span role="img" aria-label="Home" style={{ fontSize: 32 }}>🏠</span>
        <span role="img" aria-label="Chart" style={{ fontSize: 32 }}>📈</span>
        <span role="img" aria-label="Alert" style={{ fontSize: 32 }}>🔔</span>
        <span role="img" aria-label="Profile" style={{ fontSize: 32 }}>👤</span>
      </div>
      <h3>Live Spacing Tokens</h3>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        {Object.entries(tokens.spacing).map(([key, value]) => (
          <div key={key} style={{ background: '#f3f4f6', color: '#18181b', borderRadius: 8, padding: 12, minWidth: 80, textAlign: 'center', fontWeight: 600 }}>{key}: {value}</div>
        ))}
      </div>
      <h3>Component Specifications (Live)</h3>
      <ul>
        <li><strong>Button:</strong> <code>&lt;Button size="md" type="primary" /&gt;</code> — Padding, border-radius, and color driven by tokens.</li>
        <li><strong>Input:</strong> <code>&lt;Input size="md" variant="outline" /&gt;</code> — Spacing, font, and border driven by tokens.</li>
        <li><strong>Chart:</strong> <code>&lt;ChartWidget /&gt;</code> — Colors, grid, and typography from tokens.</li>
        <li><strong>Modal:</strong> <code>&lt;Modal open /&gt;</code> — Overlay, border-radius, and shadow from tokens.</li>
        <li><strong>Tooltip:</strong> <code>&lt;Tooltip text="Info" /&gt;</code> — Padding, color, and animation from tokens.</li>
      </ul>
      <h3>Best Practices</h3>
      <ul>
        <li>All UI code references design tokens/variables for centralized theming.</li>
        <li>Components are developed and documented in Storybook, then published as a shared NPM package.</li>
        <li>Pixel-perfect consistency across all platforms and products.</li>
        <li>Design system is modular, extensible, and ready for future innovation.</li>
      </ul>
    </section>
    <section>
      <h2>Atomic Design Methodology</h2>
      <ul>
        <li><strong>Atoms:</strong> Basic elements like <code>&lt;Text&gt;</code>, <code>&lt;Icon&gt;</code>, <code>&lt;Input&gt;</code>, <code>&lt;Button&gt;</code>, each with style variants.</li>
        <li><strong>Molecules:</strong> Small UI groups, e.g. <code>&lt;SearchBar&gt;</code> (input + button), <code>&lt;AssetRow&gt;</code> (icon + text + price), <code>&lt;ChartToolControl&gt;</code>.</li>
        <li><strong>Organisms:</strong> Complex sections, e.g. <code>&lt;Header&gt;</code> (logo + nav), <code>&lt;DashboardCard&gt;</code> (title + value + sparkline), <code>&lt;AssetTable&gt;</code> (rows of assets).</li>
        <li><strong>Templates:</strong> Page layouts combining organisms, e.g. <code>&lt;DashboardTemplate&gt;</code>, <code>&lt;PortfolioTemplate&gt;</code>.</li>
        <li><strong>Pages:</strong> Real content, e.g. <code>&lt;DashboardPage&gt;</code>, <code>&lt;PortfolioPage&gt;</code>, <code>&lt;TradingPage&gt;</code>.</li>
        <li><strong>References:</strong> <a href="https://bradfrost.com/blog/post/atomic-design-and-storybook/" target="_blank" rel="noopener">Brad Frost Atomic Design</a>, Apple, Canva, TradingView, Solana.</li>
      </ul>
      <h3>Live Atomic Examples</h3>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 24 }}>
        {/* Atoms */}
        <div>
          <h4>Atoms</h4>
          <button style={{ padding: tokens.spacing.md, borderRadius: tokens.radius.md, background: tokens.colors.light.primary, color: '#fff', fontWeight: 600 }}>Button</button>
          <input style={{ padding: tokens.spacing.sm, borderRadius: tokens.radius.sm, border: `1px solid ${tokens.colors.light.border}`, marginTop: 8 }} placeholder="Input" />
          <span role="img" aria-label="Icon" style={{ fontSize: 24, marginLeft: 8 }}>📈</span>
          <span style={{ fontFamily: tokens.typography.fontFamily.sans, fontWeight: 500, marginLeft: 8 }}>Text</span>
        </div>
        {/* Molecules */}
        <div>
          <h4>Molecules</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${tokens.colors.light.border}`, borderRadius: tokens.radius.sm, padding: tokens.spacing.sm }}>
            <input style={{ border: 'none', outline: 'none', fontSize: tokens.typography.fontSize.base }} placeholder="Search..." />
            <button style={{ background: tokens.colors.light.primary, color: '#fff', border: 'none', borderRadius: tokens.radius.sm, padding: tokens.spacing.xs }}>Go</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span role="img" aria-label="Asset" style={{ fontSize: 20 }}>🪙</span>
            <span style={{ fontWeight: 600 }}>BTC</span>
            <span style={{ color: tokens.colors.light.success, marginLeft: 8 }}>$67,000</span>
          </div>
        </div>
        {/* Organisms */}
        <div>
          <h4>Organisms</h4>
          <div style={{ border: `1px solid ${tokens.colors.light.border}`, borderRadius: tokens.radius.md, padding: tokens.spacing.md, minWidth: 180 }}>
            <div style={{ fontWeight: 700, fontSize: tokens.typography.fontSize.lg }}>Portfolio Value</div>
            <div style={{ fontSize: tokens.typography.fontSize['2xl'], color: tokens.colors.light.primary }}>$123,456</div>
            <div style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.textSecondary.light }}>+4.2% today</div>
          </div>
          <div style={{ border: `1px solid ${tokens.colors.light.border}`, borderRadius: tokens.radius.md, padding: tokens.spacing.md, marginTop: 8 }}>
            <div style={{ fontWeight: 700, fontSize: tokens.typography.fontSize.lg }}>Asset Table</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span role="img" aria-label="Asset">🪙</span> BTC <span style={{ marginLeft: 'auto', color: tokens.colors.light.success }}>$67,000</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span role="img" aria-label="Asset">🪙</span> ETH <span style={{ marginLeft: 'auto', color: tokens.colors.light.success }}>$3,200</span></div>
            </div>
          </div>
        </div>
        {/* Templates */}
        <div>
          <h4>Templates</h4>
          <div style={{ border: `2px dashed ${tokens.colors.light.primary}`, borderRadius: tokens.radius.lg, padding: tokens.spacing.lg, minWidth: 220 }}>
            <div style={{ fontWeight: 700, fontSize: tokens.typography.fontSize.xl }}>Dashboard Layout</div>
            <div style={{ color: tokens.colors.textSecondary.light, fontSize: tokens.typography.fontSize.sm }}>Header + Sidebar + Widgets</div>
          </div>
        </div>
        {/* Pages */}
        <div>
          <h4>Pages</h4>
          <div style={{ border: `2px solid ${tokens.colors.light.primary}`, borderRadius: tokens.radius.lg, padding: tokens.spacing.lg, minWidth: 220 }}>
            <div style={{ fontWeight: 700, fontSize: tokens.typography.fontSize.xl }}>Portfolio Page</div>
            <div style={{ color: tokens.colors.textSecondary.light, fontSize: tokens.typography.fontSize.sm }}>Real data, live widgets, user content</div>
          </div>
        </div>
      </div>
      <h3>Best Practices</h3>
      <ul>
        <li>Each level (atom → molecule → organism → template → page) is modular, extensible, and reusable.</li>
        <li>All components are documented and developed in Storybook, then published as a shared NPM package.</li>
        <li>Design system is pixel-perfect, accessible, and ready for future innovation.</li>
      </ul>
    </section>
    <section>
      <h2>References</h2>
      <ul>
        <li>Apple Human Interface Guidelines</li>
        <li>Canva Design System</li>
        <li>TradingView UI/UX</li>
        <li>Solana Design Language</li>
      </ul>
    </section>
  </div>
); 