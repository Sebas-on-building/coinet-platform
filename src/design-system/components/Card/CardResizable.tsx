/**
 * Atomic CardResizable for Coinet Card system
 * Resizable wrapper for Card, with drag handles and keyboard support
 * Uses design tokens, ARIA, and full documentation
 */
import React, { useRef, useState } from 'react';

export interface CardResizableProps {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  defaultWidth?: number;
  defaultHeight?: number;
  onResize?: (size: { width: number; height: number }) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const CardResizable: React.FC<CardResizableProps> = ({
  minWidth = 180,
  minHeight = 120,
  maxWidth = 1200,
  maxHeight = 900,
  defaultWidth = 320,
  defaultHeight = 180,
  onResize,
  children,
  className,
  style,
}) => {
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight });
  const resizing = useRef(false);
  const start = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    resizing.current = true;
    start.current = { x: e.clientX, y: e.clientY, width: size.width, height: size.height };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };
  const onMouseMove = (e: MouseEvent) => {
    if (!resizing.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    let newWidth = Math.max(minWidth, Math.min(maxWidth, start.current.width + dx));
    let newHeight = Math.max(minHeight, Math.min(maxHeight, start.current.height + dy));
    setSize({ width: newWidth, height: newHeight });
    onResize?.({ width: newWidth, height: newHeight });
  };
  const onMouseUp = () => {
    resizing.current = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  // Keyboard resize (arrow keys)
  const onKeyDown = (e: React.KeyboardEvent) => {
    let { width, height } = size;
    if (e.key === 'ArrowRight') width = Math.min(maxWidth, width + 10);
    if (e.key === 'ArrowLeft') width = Math.max(minWidth, width - 10);
    if (e.key === 'ArrowDown') height = Math.min(maxHeight, height + 10);
    if (e.key === 'ArrowUp') height = Math.max(minHeight, height - 10);
    setSize({ width, height });
    onResize?.({ width, height });
  };

  return (
    <div
      className={['co-card-resizable', className].filter(Boolean).join(' ')}
      style={{ width: size.width, height: size.height, position: 'relative', ...style }}
      tabIndex={0}
      aria-label="Resize card"
      onKeyDown={onKeyDown}
    >
      {children}
      <div
        className="co-card-resize-handle"
        style={{
          position: 'absolute',
          right: 2,
          bottom: 2,
          width: 18,
          height: 18,
          cursor: 'nwse-resize',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 1px 4px 0 rgb(0 0 0 / 8%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
        onMouseDown={onMouseDown}
        tabIndex={0}
        aria-label="Resize handle"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 12l10-10M6 12l6-6M10 12l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </div>
    </div>
  );
}; 