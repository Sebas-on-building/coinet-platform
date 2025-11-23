import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../atoms/Icon';
import { Button } from '../atoms/Button';
import clsx from 'clsx';

export interface HeaderProps {
  logo: React.ReactNode;
  navLinks: { label: string; href: string; icon?: string }[];
  userAvatar: string;
  notifications?: number;
  onThemeToggle?: () => void;
  theme?: 'light' | 'dark';
  sticky?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onAvatarMenuOpen?: () => void;
  onAvatarMenuClose?: () => void;
  onNotificationOpen?: () => void;
  onNotificationClose?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  logo,
  navLinks,
  userAvatar,
  notifications = 0,
  onThemeToggle,
  theme = 'light',
  sticky = true,
  className,
  style,
  onAvatarMenuOpen,
  onAvatarMenuClose,
  onNotificationOpen,
  onNotificationClose,
}) => {
  // Mobile menu state
  const [mobileOpen, setMobileOpen] = useState(false);
  // Avatar menu state
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  // Notification dropdown state
  const [notifOpen, setNotifOpen] = useState(false);
  // Keyboard navigation
  const navRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mobileOpen]);
  // Responsive: close menus on resize
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth > 900) setMobileOpen(false);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  // Avatar menu handlers
  const handleAvatarMenu = () => {
    setAvatarMenuOpen(v => {
      if (!v && onAvatarMenuOpen) onAvatarMenuOpen();
      if (v && onAvatarMenuClose) onAvatarMenuClose();
      return !v;
    });
  };
  // Notification dropdown handlers
  const handleNotifMenu = () => {
    setNotifOpen(v => {
      if (!v && onNotificationOpen) onNotificationOpen();
      if (v && onNotificationClose) onNotificationClose();
      return !v;
    });
  };
  return (
    <header
      className={clsx('co-header', sticky && 'co-header-sticky', `co-header-${theme}`, className)}
      style={style}
      role="banner"
    >
      <div className="co-header-logo" tabIndex={0} aria-label="Home" role="link">
        {logo}
      </div>
      <nav
        className={clsx('co-header-nav', mobileOpen && 'co-header-nav-mobile')}
        aria-label="Main navigation"
        ref={navRef}
      >
        {navLinks.map(link => (
          <a
            key={link.href}
            href={link.href}
            className="co-header-navlink"
            tabIndex={0}
            aria-label={link.label}
            role="menuitem"
          >
            {link.icon && <Icon name={link.icon} size="sm" className="co-header-navicon" />}
            <span>{link.label}</span>
          </a>
        ))}
      </nav>
      <Button
        variant="icon"
        size="md"
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        className="co-header-mobilemenu-btn"
        onClick={() => setMobileOpen(v => !v)}
      >
        <Icon name={mobileOpen ? 'x' : 'menu'} size="md" />
      </Button>
      <div className="co-header-actions">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Notifications"
          className={clsx('co-header-notif-btn', notifOpen && 'co-header-notif-btn-open')}
          onClick={handleNotifMenu}
          aria-haspopup="true"
          aria-expanded={notifOpen}
        >
          <Icon name="bell" size="sm" />
          {notifications > 0 && <span className="co-header-notif-dot">{notifications}</span>}
        </Button>
        {notifOpen && (
          <div className="co-header-notif-dropdown" role="menu" tabIndex={-1}>
            <div className="co-header-notif-title">Notifications</div>
            {/* Example notifications, replace with real data */}
            <div className="co-header-notif-item">No new notifications</div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          aria-label="Toggle theme"
          onClick={onThemeToggle}
          className="co-header-theme-btn"
        >
          <span className="co-header-theme-anim">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size="sm" />
          </span>
        </Button>
        <Button
          variant="icon"
          size="sm"
          aria-label="User menu"
          className={clsx('co-header-avatar-btn', avatarMenuOpen && 'co-header-avatar-btn-open')}
          onClick={handleAvatarMenu}
          aria-haspopup="true"
          aria-expanded={avatarMenuOpen}
        >
          <img src={userAvatar} alt="User avatar" className="co-header-avatar" />
        </Button>
        {avatarMenuOpen && (
          <div className="co-header-avatar-dropdown" role="menu" tabIndex={-1}>
            <div className="co-header-avatar-item">Profile</div>
            <div className="co-header-avatar-item">Settings</div>
            <div className="co-header-avatar-item">Logout</div>
          </div>
        )}
      </div>
    </header>
  );
}; 