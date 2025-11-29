"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiMenu,
  FiX,
  FiSun,
  FiMoon,
  FiSearch,
  FiUser,
  FiBell,
  FiPlus,
  FiHelpCircle,
} from "react-icons/fi";
import { RiWallet3Line } from "react-icons/ri";
import { getTypographyClasses } from "../../styles/typography";
import { Sidebar } from "./Sidebar";
import NavBar from "./NavBar";
import { PortfolioSummaryWidget } from "@/components/dashboard/PortfolioSummaryWidget";
import { AlertsSignalsPanel } from "@/components/dashboard/AlertsSignalsPanel";
import { PersonalizedInsightsPanel } from "@/components/dashboard/PersonalizedInsightsPanel";
import { ForwardSignalsPanel } from "@/components/dashboard/ForwardSignalsPanel";
import { MarketMoversCarousel } from "@/components/dashboard/MarketMoversCarousel";
import { DeepAssetAnalyticsPanel } from "@/components/dashboard/DeepAssetAnalyticsPanel";
import { SocialTrendsTimelinePanel } from "@/components/dashboard/SocialTrendsTimelinePanel";
import { AnomalyRiskPanel } from "@/components/dashboard/AnomalyRiskPanel";
import { ExpertQuotesRegionalTrends } from "@/components/dashboard/ExpertQuotesRegionalTrends";
import { CustomAlertsTradingViewPanel } from "@/components/dashboard/CustomAlertsTradingViewPanel";
import { CrossAssetCorrelationMatrix } from "@/components/dashboard/CrossAssetCorrelationMatrix";
import { VolatilityHeatmap } from "@/components/dashboard/VolatilityHeatmap";
import { LiveOrderBookTradesTicker } from "@/components/dashboard/LiveOrderBookTradesTicker";
import { SectorTrendsPanel } from "@/components/dashboard/SectorTrendsPanel";
import { NewsImpactTimeline } from "@/components/dashboard/NewsImpactTimeline";
import { SmartWatchlistScreener } from "@/components/dashboard/SmartWatchlistScreener";
import { CustomizableWidgetsGrid } from "@/components/dashboard/CustomizableWidgetsGrid";
import { NewsSentimentExplorer } from "@/components/dashboard/NewsSentimentExplorer";
import { MacroOnChainAnalyticsPanel } from "@/components/dashboard/MacroOnChainAnalyticsPanel";
import { UserSettingsThemePanel } from "@/components/dashboard/UserSettingsThemePanel";
import { MultiAssetComparisonPanel } from "@/components/dashboard/MultiAssetComparisonPanel";
import { StrategyBacktestPanel } from "@/components/dashboard/StrategyBacktestPanel";
import { AIPoweredInsightsPanel } from "@/components/dashboard/AIPoweredInsightsPanel";
import { CollaborationSharingPanel } from "@/components/dashboard/CollaborationSharingPanel";
import { OnboardingTour } from "@/components/dashboard/OnboardingTour";
import Footer from "./Footer";
import { colors } from 'src/styles/tokens/colors';
import { spacing } from 'src/styles/tokens/spacing';
import { shadows } from 'src/styles/tokens/shadows';

interface MainLayoutProps {
  children: React.ReactNode;
}

const orbVariants = {
  animate: (custom: any) => ({
    x: [0, custom.x, 0],
    y: [0, custom.y, 0],
    scale: [1, custom.scale, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: custom.duration,
      repeat: Infinity,
      repeatType: "reverse" as const,
      ease: "easeInOut",
    },
  }),
};

// =========================
// Animated Particles Background (Canvas)
// =========================
const AnimatedParticlesBackground: React.FC = () => {
  // Particle system: performant, beautiful, gradients, glows
  // Uses requestAnimationFrame for smooth animation
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId: number;
    const dpr = window.devicePixelRatio || 1;
    let width = window.innerWidth;
    let height = 400;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx?.scale(dpr, dpr);
    // Particle config
    const PARTICLE_COUNT = 48;
    const particles = Array.from({ length: PARTICLE_COUNT }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 8 + Math.random() * 16,
      dx: -0.5 + Math.random(),
      dy: -0.5 + Math.random(),
      color: `hsla(${Math.floor(Math.random() * 360)}, 80%, 60%, 0.7)`
    }));
    function animate() {
      ctx?.clearRect(0, 0, width, height);
      for (const p of particles) {
        // Draw glow
        if (ctx) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          grad.addColorStop(0, p.color);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 32;
          ctx.globalAlpha = 0.7;
          ctx.fill();
          ctx.restore();
        }
        // Move
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > width) p.dx *= -1;
        if (p.y < 0 || p.y > height) p.dy *= -1;
      }
      animationId = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(animationId);
  }, []);
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: 400,
        zIndex: 1,
        pointerEvents: 'none',
        borderRadius: '0 0 48px 48px',
      }}
      tabIndex={-1}
    />
  );
};

// =========================
// AI Panel Placeholder (Slide-in)
// =========================
const AIPanelPlaceholder: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => (
  <AnimatePresence>
    {open && (
      <motion.aside
        className="fixed top-0 right-0 h-full w-[420px] bg-gradient-to-br from-[#23234d] to-[#0057ff] shadow-2xl border-l border-blue-900/30 z-50 flex flex-col"
        initial={{ x: 480 }}
        animate={{ x: 0 }}
        exit={{ x: 480 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        role="complementary"
        aria-label="AI Assistant Panel"
        tabIndex={0}
      >
        <div className="flex items-center justify-between p-6 border-b border-blue-900/30">
          <span className="text-xl font-bold text-white">AI Analyst</span>
          <button
            className="text-blue-200 hover:text-white text-2xl focus:outline-none"
            onClick={onClose}
            aria-label="Close AI Panel"
          >
            ×
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-blue-100">
          <span className="text-3xl mb-4">🤖</span>
          <p className="text-lg font-medium mb-2">Your AI Analyst will appear here.</p>
          <p className="text-base text-blue-200">Ask questions, get insights, and receive personalized analysis.</p>
        </div>
      </motion.aside>
    )}
  </AnimatePresence>
);

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(true); // For theme toggle demo
  const [aiPanelOpen, setAIPanelOpen] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle theme toggle (replace with your theme logic if needed)
  const toggleTheme = () => setIsDark((v) => !v);

  // Responsive sidebar toggle
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Navigation items - simplified and organized
  const navItems = [
    {
      label: "Markets",
      href: "/markets",
      submenu: [
        { label: "Spot Markets", href: "/markets/spot" },
        { label: "Futures", href: "/markets/futures" },
        { label: "NFTs", href: "/markets/nfts" },
      ],
    },
    {
      label: "Trade",
      href: "/trade",
      submenu: [
        { label: "Spot Trading", href: "/trade/spot" },
        { label: "Margin Trading", href: "/trade/margin" },
        { label: "Futures", href: "/trade/futures" },
      ],
    },
    {
      label: "Learn",
      href: "/learn",
      submenu: [
        { label: "Getting Started", href: "/learn/getting-started" },
        { label: "Trading Guide", href: "/learn/trading-guide" },
        { label: "Security", href: "/learn/security" },
      ],
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.dark.backgroundGradient,
        color: colors.dark.text,
        fontFamily: 'Inter, SF Pro Display, Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          padding: spacing.lg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: colors.gradients.solana,
          boxShadow: shadows.card,
        }}
        aria-label="Main navigation"
        role="banner"
      >
        <span style={{ fontWeight: 700, fontSize: 28, letterSpacing: -1 }}>Coinet</span>
        {/* Nav, user menu, etc. */}
      </header>
      <main style={{ flex: 1, padding: spacing.xl }}>{children}</main>
      <footer
        style={{
          padding: spacing.md,
          textAlign: 'center',
          fontSize: 14,
          opacity: 0.7,
          background: colors.dark.surface,
        }}
        aria-label="Footer"
        role="contentinfo"
      >
        © 2025 Coinet
      </footer>
    </div>
  );
};
