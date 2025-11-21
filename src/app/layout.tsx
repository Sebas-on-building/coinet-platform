'use client';

import React from 'react';
import { LucideHome, LucideBarChart, LucideDatabase, LucideShield, LucideNewspaper, LucideUsers, LucideZap, LucideActivity, LucideSettings } from 'lucide-react';
import { motion } from '@/lib/motion';
import Link from 'next/link';
import { Providers } from './providers';
import '../styles/globals.css';
import { UserFlowProvider } from '@/design-system/components/organisms/UserFlowProvider';
import NavigationBar from '@/design-system/components/organisms/NavigationBar';
import { TabBar } from '@/design-system/components/organisms/TabBar';
import { MenuDrawer } from '@/design-system/components/organisms/MenuDrawer';
import { NetworkStatusBanner } from '@/design-system/components/organisms/NetworkStatusBanner';
import { SkipToContent } from '@/design-system/components/atoms/SkipToContent';
import { A11yAnnouncer } from '@/design-system/components/atoms/A11yAnnouncer';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { t } from '@/utils/i18n';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LucideHome },
  { href: '/analytics', label: 'Analytics', icon: LucideBarChart },
  { href: '/market', label: 'Market Data', icon: LucideDatabase },
  { href: '/blockchain', label: 'Blockchain', icon: LucideShield },
  { href: '/news', label: 'News', icon: LucideNewspaper },
  { href: '/social', label: 'Social', icon: LucideUsers },
  { href: '/defi', label: 'DeFi', icon: LucideZap },
  { href: '/trading', label: 'Trading', icon: LucideActivity },
  { href: '/settings', label: 'Settings', icon: LucideSettings },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Responsive navigation logic (pseudo, replace with real logic)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const navItems = [
    { icon: '🏠', label: 'Dashboard', onClick: () => { }, active: true },
    { icon: '📈', label: 'Chart', onClick: () => { } },
    { icon: '🔔', label: 'Alerts', onClick: () => { } },
    { icon: '👤', label: 'Profile', onClick: () => { } },
  ];
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans bg-gradient-to-br from-zinc-50 to-slate-100 dark:from-[#18181b] dark:to-[#23272f] min-h-screen text-zinc-900 dark:text-zinc-100 antialiased transition-colors duration-300">
        <ThemeProvider>
          <UserFlowProvider>
            <SkipToContent />
            <NetworkStatusBanner />
            {isMobile ? (
              <TabBar items={navItems} />
            ) : (
              <NavigationBar items={navItems} />
            )}
            {/* MenuDrawer can be conditionally rendered for desktop */}
            <A11yAnnouncer message={t('welcome')} />
            <Providers>
              <nav className="sticky top-0 z-30 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg border-b border-slate-200 dark:border-slate-800 flex items-center justify-center px-4 py-2">
                <div className="flex gap-2 max-w-5xl w-full mx-auto">
                  {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className="group flex items-center gap-1 px-3 py-2 rounded-xl font-medium text-base hover:bg-gradient-to-br hover:from-blue-100/80 hover:to-purple-100/60 dark:hover:from-blue-900/80 dark:hover:to-purple-900/60 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                      aria-label={t(label)}
                    >
                      <motion.span whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.95 }} className="flex items-center">
                        <Icon className="w-5 h-5 stroke-2 text-blue-500 dark:text-blue-300 group-hover:text-purple-500 transition-colors" />
                      </motion.span>
                      <span className="hidden md:inline-block group-hover:text-blue-700 dark:group-hover:text-blue-200 transition-colors">{t(label)}</span>
                    </Link>
                  ))}
                </div>
              </nav>
              <main id="main-content" role="main" aria-label="Main content" className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4">
                <motion.section
                  className="w-full max-w-4xl mx-auto py-12 flex flex-col gap-12"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                >
                  {children}
                </motion.section>
              </main>
            </Providers>
          </UserFlowProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
// TODO: Integrate brand style guide, logo, color tokens, and imagery
// TODO: Add Framer Motion page transitions and micro-interactions
// TODO: Ensure all touch targets >=44x44px, ARIA, and accessibility best practices
// TODO: Add theme switcher and user menu
