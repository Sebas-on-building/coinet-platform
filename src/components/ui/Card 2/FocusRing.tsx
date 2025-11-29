import React, { useEffect, useState, useRef } from 'react';

export interface FocusRingProps {
  asChild?: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const FocusRing: React.FC<FocusRingProps> = ({ asChild, children, className, style }) => {
  const [isKeyboard, setIsKeyboard] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        setIsKeyboard(true);
      }
    };
    const handleMouseDown = () => setIsKeyboard(false);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      className: [children.props.className, isKeyboard ? 'co-focus-ring' : ''].filter(Boolean).join(' '),
      style: { ...children.props.style, ...(isKeyboard ? focusRingStyle : {}) },
      ref,
    });
  }

  return (
    <div
      ref={ref}
      className={[className, isKeyboard ? 'co-focus-ring' : ''].filter(Boolean).join(' ')}
      style={{ ...style, ...(isKeyboard ? focusRingStyle : {}) }}
      tabIndex={-1}
      aria-hidden={!isKeyboard}
    >
      {children}
    </div>
  );
};

const focusRingStyle: React.CSSProperties = {
  boxShadow: '0 0 0 3px var(--color-accent-blue)',
  borderRadius: 8,
  outline: 'none',
  transition: 'box-shadow 0.18s',
}; 