"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart2,
  TrendingUp,
  MessageCircle,
  Zap,
  Activity,
  Settings,
  Newspaper,
  Blocks,
} from "lucide-react";

export function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname?.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Analytics", href: "/analytics", icon: BarChart2 },
    { name: "Market Data", href: "/market", icon: TrendingUp },
    { name: "Blockchain", href: "/blockchain", icon: Blocks },
    { name: "News", href: "/news", icon: Newspaper },
    { name: "Social", href: "/social", icon: MessageCircle },
    { name: "DeFi", href: "/defi", icon: Zap },
    { name: "Trading", href: "/trading", icon: Activity },
  ];

  return (
    <nav
      className="flex items-center space-x-2 md:space-x-4 py-2 px-4 bg-gradient-to-r from-[#23234d] to-[#1a1a2e] shadow-lg rounded-xl border border-blue-900/30 backdrop-blur-xl"
      role="navigation"
      aria-label="Main Navigation"
    >
      {navItems.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className={`px-4 py-2 rounded-lg text-base font-semibold flex items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ffa3] focus-visible:ring-offset-2 focus-visible:ring-offset-[#181836] group
            ${
              isActive(item.href)
                ? "bg-gradient-to-r from-[#00ffa3]/30 to-[#0057ff]/30 text-white shadow-lg animate-nav-active"
                : "text-blue-200 hover:bg-white/10 hover:text-white"
            }
          `}
          aria-current={isActive(item.href) ? "page" : undefined}
          tabIndex={0}
        >
          <item.icon className="h-5 w-5 mr-2" aria-hidden="true" />
          <span className="relative">
            {item.name}
            {isActive(item.href) && (
              <span className="absolute left-0 -bottom-1 w-full h-1 bg-gradient-to-r from-[#00ffa3] to-[#0057ff] rounded-full animate-pulse" />
            )}
          </span>
        </Link>
      ))}
      <Link
        href="/settings"
        className="px-4 py-2 rounded-lg text-base font-semibold flex items-center transition-colors text-blue-200 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ffa3] focus-visible:ring-offset-2 focus-visible:ring-offset-[#181836]"
        tabIndex={0}
      >
        <Settings className="h-5 w-5" aria-hidden="true" />
      </Link>
    </nav>
  );
}
