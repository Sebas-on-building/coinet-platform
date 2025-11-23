/**
 * ButtonShareMenu – Atomic share menu for Coinet
 * Extensible, accessible, themeable
 */
import React from 'react';
import { ButtonShareOption } from './ButtonShareOption';

export interface ButtonShareMenuProps {
  data: any;
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Atomic ButtonShareMenu for share options
 */
export const ButtonShareMenu: React.FC<ButtonShareMenuProps> = ({
  data,
  onClose,
  className,
  style,
}) => (
  <div
    className={["co-btn-share-menu", className].filter(Boolean).join(' ')}
    style={{
      marginTop: 8,
      borderTop: '1px solid var(--color-border)',
      paddingTop: 8,
      ...style,
    }}
    role="menu"
    aria-label="Share Menu"
  >
    <ButtonShareOption type="web" data={data} onClose={onClose} />
    <ButtonShareOption type="clipboard" data={data} onClose={onClose} />
    <ButtonShareOption type="qr" data={data} onClose={onClose} />
    <ButtonShareOption type="social" data={data} onClose={onClose} />
  </div>
); 