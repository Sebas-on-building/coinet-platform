import React from 'react';
import clsx from 'clsx';

export interface SkipToContentProps {
  targetId?: string;
  theme?: 'light' | 'dark';
  className?: string;
}

export const SkipToContent: React.FC<SkipToContentProps> = ({ targetId = 'main-content', theme = 'light', className }) => (
  <a
    href={`#${targetId}`}
    className={clsx('co-skip-to-content', `co-skip-to-content-${theme}`, className)}
    tabIndex={0}
    style={{ position: 'absolute', left: 0, top: 0, zIndex: 1000, background: '#fff', color: '#000', padding: 8, borderRadius: 4, transform: 'translateY(-200%)', transition: 'transform 0.2s', outline: 'none' }}
    onFocus={e => (e.currentTarget.style.transform = 'translateY(0)')}
    onBlur={e => (e.currentTarget.style.transform = 'translateY(-200%)')}
  >
    Skip to main content
  </a>
); 