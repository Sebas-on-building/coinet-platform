"use client";

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';

export interface NetworkStatusBannerProps {
  theme?: 'light' | 'dark';
  className?: string;
  style?: React.CSSProperties;
}

export const NetworkStatusBanner: React.FC<NetworkStatusBannerProps> = ({ theme = 'light', className, style }) => {
  const [status, setStatus] = useState<'online' | 'offline' | 'reconnecting'>('online');

  useEffect(() => {
    const handleOnline = () => setStatus('online');
    const handleOffline = () => setStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Simulate reconnecting for demo
  useEffect(() => {
    if (status === 'offline') {
      const timeout = setTimeout(() => setStatus('reconnecting'), 2000);
      return () => clearTimeout(timeout);
    }
    if (status === 'reconnecting') {
      const timeout = setTimeout(() => setStatus('online'), 2000);
      return () => clearTimeout(timeout);
    }
  }, [status]);

  let label = '';
  if (status === 'online') label = 'You are online';
  if (status === 'offline') label = 'You are offline. Trying to reconnect...';
  if (status === 'reconnecting') label = 'Reconnecting...';

  return (
    <div
      className={clsx('co-network-status-banner', `co-network-status-banner-${status}`, `co-network-status-banner-${theme}`, className)}
      role="status"
      aria-live="polite"
      style={{ ...style, transition: 'background 0.3s, color 0.3s', padding: 8, textAlign: 'center' }}
    >
      {label}
    </div>
  );
}; 