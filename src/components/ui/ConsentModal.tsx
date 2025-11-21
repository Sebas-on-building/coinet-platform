/**
 * Atomic ConsentModal component for Coinet
 * Inspired by Apple, Canva, TradingView, Solana
 * All props are documented and extensible
 */
import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConsentScope {
  label: string;
  description: string;
}

interface ConsentModalProps {
  /**
   * Open state
   */
  open: boolean;
  /**
   * Accept handler
   */
  onAccept: () => void;
  /**
   * Close handler
   */
  onClose: () => void;
  /**
   * OAuth provider name
   */
  provider: string;
  /**
   * Scopes to display
   */
  scopes: ConsentScope[];
  /**
   * Modal title
   */
  title?: string;
  /**
   * Modal description
   */
  description?: string;
  /**
   * ARIA label
   */
  'aria-label'?: string;
  /**
   * Additional className
   */
  className?: string;
  /**
   * Additional style
   */
  style?: React.CSSProperties;
  /**
   * Any other props
   */
  [key: string]: any;
}

/**
 * Atomic ConsentModal component
 */
export const ConsentModal: React.FC<ConsentModalProps> = ({
  open,
  onAccept,
  onClose,
  provider,
  scopes,
  title = 'Consent Required',
  description = 'To continue, please review and accept the requested permissions for your account:',
  className,
  style,
  ...rest
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      aria-label={rest['aria-label'] || title}
      className={className}
      style={style}
      {...rest}
    >
      <p className="mb-6 text-gray-600 dark:text-gray-300" style={{ fontSize: 'var(--font-size-base)' }}>{description}</p>
      <ul className="mb-6 text-left space-y-2">
        {scopes.map((scope) => (
          <li key={scope.label} className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" aria-hidden="true"></span>
            <span className="font-semibold text-gray-800 dark:text-gray-100">{scope.label}</span>
            <span className="text-gray-500 dark:text-gray-400">— {scope.description}</span>
          </li>
        ))}
      </ul>
      <Button variant="primary" size="lg" fullWidth onClick={onAccept} aria-label="Accept and Continue">
        Accept & Continue
      </Button>
    </Modal>
  );
}; 