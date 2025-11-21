import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TooltipProps {
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  children: React.ReactElement;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, placement = 'top', delay = 120, children, className }) => {
  const [open, setOpen] = useState(false);
  const timer = useRef<number>();

  const show = () => { timer.current = window.setTimeout(() => setOpen(true), delay); };
  const hide = () => { clearTimeout(timer.current); setOpen(false); };

  return (
    <span style={{ position: 'relative', display: 'inline-block' }} onMouseEnter={show} onFocus={show} onMouseLeave={hide} onBlur={hide}>
      {React.cloneElement(children, { 'aria-describedby': open ? 'co-tooltip' : undefined })}
      <AnimatePresence>
        {open && (
          <motion.div
            id="co-tooltip"
            initial={{ opacity: 0, y: placement === 'top' ? 8 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: placement === 'top' ? 8 : -8 }}
            transition={{ duration: 0.18 }}
            role="tooltip"
            className={className}
            style={{
              position: 'absolute',
              [placement]: '100%',
              left: placement === 'top' || placement === 'bottom' ? '50%' : undefined,
              top: placement === 'left' || placement === 'right' ? '50%' : undefined,
              transform: placement === 'top' || placement === 'bottom' ? 'translateX(-50%)' : 'translateY(-50%)',
              background: 'var(--color-surface-glass)',
              color: 'var(--color-text)',
              borderRadius: 8,
              boxShadow: 'var(--shadow-md)',
              padding: '6px 14px',
              fontSize: 14,
              fontWeight: 500,
              zIndex: 100,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}; 