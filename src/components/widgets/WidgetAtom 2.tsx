import React, { useRef, useState } from 'react';
// @ts-ignore
import { Rnd } from 'react-rnd';
import clsx from 'clsx';
import styles from './WidgetAtom.module.css';
import { useDesignSystem } from '../design-system/DesignSystemProvider';
import { Modal } from '../ui';

export interface WidgetAtomProps {
  children: React.ReactNode;
  title: string;
  icon?: React.ReactNode;
  settings?: React.ReactNode;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  glow?: boolean;
  gradient?: boolean;
}

export const WidgetAtom: React.FC<WidgetAtomProps> = ({
  children, title, icon, settings, minWidth = 200, minHeight = 80, maxWidth = 800, maxHeight = 600,
  defaultPosition = { x: 40, y: 40 }, defaultSize = { width: 320, height: 180 }, glow, gradient
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { tokens } = useDesignSystem();
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <Rnd
      default={{ ...defaultPosition, ...defaultSize }}
      minWidth={minWidth}
      minHeight={minHeight}
      maxWidth={maxWidth}
      maxHeight={maxHeight}
      bounds="window"
      className={clsx(styles.widget, { [styles.glow]: glow, [styles.gradient]: gradient })}
      aria-label={title}
      tabIndex={0}
      role="region"
      onFocus={() => ref.current?.classList.add(styles.focused)}
      onBlur={() => ref.current?.classList.remove(styles.focused)}
      style={{
        borderRadius: tokens.radii.lg,
        boxShadow: glow ? tokens.shadows.lg : tokens.shadows.md,
        background: gradient ? tokens.themeColors.primary : tokens.themeColors.surface,
        outline: 'none',
        transition: tokens.motion.normal,
      }}
    >
      <div className={styles.header} ref={ref} tabIndex={-1} role="banner">
        {icon && <span className={styles.icon}>{icon}</span>}
        <span className={styles.title}>{title}</span>
        {settings && (
          <button
            className={styles.settingsBtn}
            aria-label="Open widget settings"
            onClick={() => setSettingsOpen(true)}
            tabIndex={0}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span role="img" aria-label="settings">⚙️</span>
          </button>
        )}
      </div>
      <div className={styles.body}>{children}</div>
      {settings && (
        <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title={title + ' Settings'}>
          {settings}
        </Modal>
      )}
    </Rnd>
  );
}; 