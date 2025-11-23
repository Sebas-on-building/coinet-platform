/**
 * ButtonShareOption – Atomic share option for Coinet
 * Extensible, accessible, themeable
 */
import React from 'react';

export interface ButtonShareOptionProps {
  type: 'web' | 'clipboard' | 'qr' | 'social';
  data: any;
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Atomic ButtonShareOption for share methods
 */
export const ButtonShareOption: React.FC<ButtonShareOptionProps> = ({
  type,
  data,
  onClose,
  className,
  style,
}) => {
  const handleShare = () => {
    // TODO: Implement share logic for each type
    // For now, just close the menu
    onClose();
  };
  const labels: Record<string, string> = {
    web: 'Share via Web Share',
    clipboard: 'Copy to Clipboard',
    qr: 'Show QR Code',
    social: 'Share on Social',
  };
  return (
    <button
      className={["co-btn-share-option", className].filter(Boolean).join(' ')}
      style={{
        display: 'block',
        width: '100%',
        background: 'none',
        border: 'none',
        padding: '8px 0',
        color: 'var(--color-text)',
        fontSize: 15,
        textAlign: 'left',
        cursor: 'pointer',
        borderRadius: 6,
        ...style,
      }}
      onClick={handleShare}
      aria-label={labels[type]}
      role="menuitem"
    >
      {labels[type]}
    </button>
  );
}; 