import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSearch,
  FiBell,
  FiUser,
  FiChevronDown,
  FiMenu,
  FiSun,
  FiMoon,
} from "react-icons/fi";
import {
  Home,
  BarChart,
  Newspaper,
  Users,
  Activity,
  CandlestickChart,
  TrendingUp,
  MessageCircle,
} from "lucide-react";
import Logo from "/public/logo.svg";
import { Button } from '@/components/ui/Button/Button';
import { useTheme } from '@/components/providers/ThemeProvider';

const navLinks = [
  { label: "Dashboard", href: "/", icon: <Home size={18} /> },
  { label: "Analytics", href: "/analytics", icon: <BarChart size={18} /> },
  { label: "Market Data", href: "/market", icon: <TrendingUp size={18} /> },
  { label: "Blockchain", href: "/blockchain", icon: <Activity size={18} /> },
  { label: "News", href: "/news", icon: <Newspaper size={18} /> },
  { label: "Social", href: "/social", icon: <Users size={18} /> },
  { label: "DeFi", href: "/defi", icon: <CandlestickChart size={18} /> },
  { label: "Trading", href: "/trading", icon: <BarChart size={18} /> },
];

export default function NavBar() {
  const { toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [unread, setUnread] = useState(2);
  const router = useRouter();

  return (
    <nav
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, padding: '0 var(--spacing-lg)', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <span style={{ fontWeight: 700, fontSize: 24, color: 'var(--color-primary)' }}>Coinet</span>
        {navLinks.map((link) => {
          const isActive =
            router.pathname === link.href ||
            (link.href !== "/" && router.pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: 500 }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button variant="ghost" onClick={toggleTheme} aria-label="Toggle theme">🌓</Button>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>U</div>
      </div>
    </nav>
  );
}
