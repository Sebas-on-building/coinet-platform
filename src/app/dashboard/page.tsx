// @ts-nocheck
"use client";
import React, { useState, useEffect, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import { widgetRegistry } from "@/components/dashboard/widgets/registry";
import { motion, AnimatePresence } from "framer-motion";
import MarketMoversPanel from "@/components/dashboard/MarketMoversPanel";
import OrderBookPanel from "@/components/dashboard/OrderBookPanel";
import {
  AdvancedAnalyticsWidget,
  SocialFeedWidget,
  OnboardingModal,
} from "@/components/dashboard";
import { AnomalyToast } from "@/components/dashboard/AnomalyToast";
import { useAnomaliesFeed } from "@/hooks/useAnomaliesFeed";
import { useTheme } from "next-themes";
import Link from "next/link";
import ConsentHistory from "@/components/ui/ConsentHistory";
import { ConsentAnalytics } from "@/components/dashboard/ConsentAnalytics";
import { NotificationPreferences } from "@/components/ui/NotificationPreferences";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { messages } from "@/components/ui/messages";
import { ReferralClaimForm } from '@/components/referral/ReferralClaimForm';
import { t } from '@/utils/i18n';
import { MainLayout } from 'src/components/layout/MainLayout';
import { WidgetPanelDnD } from 'src/components/dashboard/WidgetPanelDnD';
import { WidgetDashboardControls } from 'src/components/dashboard/WidgetDashboardControls';
import { WidgetRemoveButton } from 'src/components/dashboard/WidgetRemoveButton';
import { v4 as uuidv4 } from 'uuid';
import { NavigationBar } from '@/design-system/components/organisms/NavigationBar';
import { NetworkStatusBanner } from '@/design-system/components/organisms/NetworkStatusBanner';
import { SkipToContent } from '@/design-system/components/atoms/SkipToContent';
import { A11yAnnouncer } from '@/design-system/components/atoms/A11yAnnouncer';
import { SkeletonLoader } from '@/design-system/components/atoms/SkeletonLoader';
import { ErrorMessage } from '@/design-system/components/atoms/ErrorMessage';
import { FocusTrap } from '@/design-system/components/organisms/FocusTrap';
import { RippleButton } from '../../components/ui/Button/RippleButton';
import { AnimatedCard } from '../../components/ui/Card/AnimatedCard';
import { AnimatedModal } from '../../components/ui/Modal/AnimatedModal';

function WidgetConfigModal({
  widget,
  configDraft,
  setConfigDraft,
  onSave,
  onCancel,
}: {
  widget: any;
  configDraft: any;
  setConfigDraft: (draft: any) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const firstSelectRef = useRef<HTMLSelectElement>(null);

  // Focus trap and ESC/ENTER handling
  useEffect(() => {
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'input, select, button, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (widget?.configSchema?.[0]?.type === "select") {
      firstSelectRef.current?.focus();
    } else {
      firstInputRef.current?.focus();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
      if (
        e.key === "Enter" &&
        (e.target as HTMLElement).tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        onSave();
      }
      if (e.key === "Tab" && focusable && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, onSave, widget]);

  if (!widget || !widget.configSchema) return null;
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 transition-opacity duration-200 opacity-100"
      aria-modal="true"
      role="dialog"
      aria-labelledby="widget-config-modal-title"
      ref={modalRef}
    >
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md animate-fade-in">
        <h2 id="widget-config-modal-title" className="text-xl font-bold mb-4">
          Configure {widget.name}
        </h2>
        <form
          className="space-y-4"
          onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            onSave();
          }}
        >
          {widget.configSchema.map((field: any, idx: number) => (
            <div key={field.key}>
              <label className="block text-sm font-medium mb-1">
                {field.label}
              </label>
              {field.type === "select" ? (
                <select
                  className="w-full border rounded p-2"
                  value={configDraft[field.key]}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setConfigDraft({
                      ...configDraft,
                      [field.key]: e.target.value,
                    })
                  }
                  ref={idx === 0 ? firstSelectRef : undefined}
                >
                  {field.options.map((opt: string) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="w-full border rounded p-2"
                  type={field.type}
                  value={configDraft[field.key]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setConfigDraft({
                      ...configDraft,
                      [field.key]: e.target.value,
                    })
                  }
                  ref={idx === 0 ? firstInputRef : undefined}
                />
              )}
            </div>
          ))}
          <div className="flex gap-2 mt-6">
            <button
              type="button"
              className="flex-1 bg-gray-200 text-gray-700 rounded p-2 hover:bg-gray-300"
              onClick={onCancel}
              aria-label="Cancel configuration"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white rounded p-2 hover:bg-blue-700"
              aria-label="Save configuration"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ErrorBoundary for widgets
class WidgetErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <div className="text-red-600 font-bold mb-2">
            Widget failed to load.
          </div>
          <button
            className="bg-blue-600 text-white px-4 py-1 rounded"
            onClick={() => this.setState({ hasError: false })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// WidgetLoader with Suspense and ErrorBoundary
function WidgetLoader({ children }: { children: React.ReactNode }) {
  return (
    <WidgetErrorBoundary>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-32 animate-pulse">
            <div className="w-8 h-8 border-4 border-blue-300 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        {children}
      </Suspense>
    </WidgetErrorBoundary>
  );
}

// Simple tooltip component
function Tooltip({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
      ref={ref}
      aria-label={text}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute z-50 left-1/2 -translate-x-1/2 -top-10 bg-gray-900 text-white text-xs rounded px-3 py-1 shadow-lg"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            role="tooltip"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

const sections = [
  { key: "overview", label: "Overview", icon: "🏠" },
  { key: "portfolio", label: "Portfolio", icon: "💼" },
  { key: "market", label: "Market", icon: "📈" },
  { key: "news", label: "News", icon: "📰" },
  { key: "defi", label: "DeFi", icon: "🧬" },
  { key: "ai", label: "AI", icon: "🤖" },
  { key: "onchain", label: "On-Chain", icon: "⛓️" },
  { key: "social", label: "Social", icon: "💬" },
  { key: "privacy", label: "Privacy", icon: "🔒" },
  { key: "analytics", label: "Analytics", icon: "📊" },
  { key: "notifications", label: "Notifications", icon: "🔔" },
  { key: "settings", label: "Settings", icon: "⚙️" },
];

const sectionComponents: Record<string, React.ReactNode> = {
  overview: (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {Object.values(widgetRegistry)
        .filter((w) => w.key === "market-overview")
        .map((w) => (
          <w.component
            key={w.key}
            analyticsEvent={`dashboard_section_overview_widget_${w.key}`}
          />
        ))}
    </div>
  ),
  portfolio: (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {Object.values(widgetRegistry)
        .filter((w) => w.key === "portfolio")
        .map((w) => (
          <w.component
            key={w.key}
            analyticsEvent={`dashboard_section_portfolio_widget_${w.key}`}
          />
        ))}
    </div>
  ),
  market: (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {Object.values(widgetRegistry)
        .filter((w) => w.key === "market")
        .map((w) => (
          <w.component
            key={w.key}
            analyticsEvent={`dashboard_section_market_widget_${w.key}`}
          />
        ))}
    </div>
  ),
  news: (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {Object.values(widgetRegistry)
        .filter((w) => w.key === "news")
        .map((w) => (
          <w.component
            key={w.key}
            analyticsEvent={`dashboard_section_news_widget_${w.key}`}
          />
        ))}
    </div>
  ),
  defi: (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {Object.values(widgetRegistry)
        .filter((w) => w.key === "defi")
        .map((w) => (
          <w.component
            key={w.key}
            analyticsEvent={`dashboard_section_defi_widget_${w.key}`}
          />
        ))}
    </div>
  ),
  ai: (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {Object.values(widgetRegistry)
        .filter((w) => w.key === "ai")
        .map((w) => (
          <w.component
            key={w.key}
            analyticsEvent={`dashboard_section_ai_widget_${w.key}`}
          />
        ))}
    </div>
  ),
  onchain: (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {Object.values(widgetRegistry)
        .filter((w) => w.key === "onchain-metrics")
        .map((w) => (
          <w.component
            key={w.key}
            analyticsEvent={`dashboard_section_onchain_widget_${w.key}`}
          />
        ))}
    </div>
  ),
  social: (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {Object.values(widgetRegistry)
        .filter((w) => w.key === "social-sentiment")
        .map((w) => (
          <w.component
            key={w.key}
            analyticsEvent={`dashboard_section_social_widget_${w.key}`}
          />
        ))}
    </div>
  ),
  privacy: <ConsentHistory />, // Privacy & Consent
  analytics: (
    <ConsentAnalytics
      data={{ revokesOverTime: [], providerDistribution: [] }}
    />
  ), // Placeholder data
  notifications: <NotificationPreferences />,
  settings: (
    <div className="p-8 text-gray-600 dark:text-gray-300">
      Settings coming soon...
    </div>
  ),
};

export default function Dashboard() {
  const [lang, setLang] = useState("en");
  const [section, setSection] = useState("overview");
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [widgets, setWidgets] = useState([
    { id: uuidv4(), type: 'market' },
    { id: uuidv4(), type: 'portfolio' },
    { id: uuidv4(), type: 'news' },
  ]);
  const [modalOpen, setModalOpen] = useState(false);

  const handleAdd = (type: string) => setWidgets(w => [...w, { id: uuidv4(), type }]);
  const handleRemove = (id: string) => setWidgets(w => w.filter(widget => widget.id !== id));
  const handleReorder = (newWidgets: typeof widgets) => setWidgets(newWidgets);

  const renderWidget = (type: string, id: string) => {
    const WidgetComp = widgetRegistry[type]?.component;
    if (!WidgetComp) return null;
    return (
      <div style={{ position: 'relative' }}>
        <WidgetRemoveButton onRemove={() => handleRemove(id)} />
        <WidgetComp />
      </div>
    );
  };

  return (
    <MainLayout>
      <WidgetDashboardControls onAdd={handleAdd} />
      <WidgetPanelDnD
        widgets={widgets}
        onReorder={handleReorder}
        renderWidget={renderWidget}
      />
      <button onClick={() => setMarketplaceOpen(true)} style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 100 }}>
        +
      </button>
      {marketplaceOpen && (
        <WidgetMarketplace
          widgets={[
            { id: 'btc', name: 'Market Overview' },
            // ...more widgets
          ]}
        />
      )}
      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <h1>Dashboard Micro-Interactions Demo</h1>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <AnimatedCard draggable>
            <h2>Draggable Card 1</h2>
            <p>This card can be dragged around. Try it!</p>
            <RippleButton onClick={() => setModalOpen(true)}>Open Modal</RippleButton>
          </AnimatedCard>
          <AnimatedCard>
            <h2>Static Card 2</h2>
            <p>This card is static but has hover/tap animation.</p>
            <RippleButton>Action</RippleButton>
          </AnimatedCard>
        </div>
        <AnimatedModal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
          <h2>Animated Modal</h2>
          <p>This modal uses Framer Motion for smooth open/close and a glassy backdrop.</p>
          <RippleButton onClick={() => setModalOpen(false)}>Close</RippleButton>
        </AnimatedModal>
      </div>
    </MainLayout>
  );
}
