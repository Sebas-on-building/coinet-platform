import React, { useEffect, useRef } from 'react';
import { t } from '../../utils/i18n';

interface ConsentModalProps {
  open: boolean;
  onClose: () => void;
  provider: string;
  scopes: string[];
  onConfirm: (consentedScopes: string[]) => void;
  needsLinkingConfirmation?: boolean;
}

const providerBrand: Record<string, { color: string; icon: string }> = {
  google: { color: 'bg-white text-gray-800', icon: '/icons/google.svg' },
  apple: { color: 'bg-black text-white', icon: '/icons/apple.svg' },
  twitter: { color: 'bg-blue-500 text-white', icon: '/icons/twitter.svg' },
};

export const ConsentModal: React.FC<ConsentModalProps> = ({
  open,
  onClose,
  provider,
  scopes,
  onConfirm,
  needsLinkingConfirmation,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [consented, setConsented] = React.useState<Record<string, boolean>>(
    Object.fromEntries(scopes.map((s) => [s, true]))
  );

  useEffect(() => {
    if (open) {
      modalRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;
  const brand = providerBrand[provider] || { color: 'bg-gray-200', icon: '' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-md mx-auto rounded-2xl shadow-2xl p-8 ${brand.color} dark:bg-neutral-900 bg-white animate-slide-up`}
        ref={modalRef}
        tabIndex={0}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        aria-label={t('consent.modal_aria')}
      >
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-red-500 focus:outline-none"
          onClick={onClose}
          aria-label={t('consent.close')}
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeWidth="2" d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>
        <div className="flex flex-col items-center gap-2 mb-4">
          {brand.icon && <img src={brand.icon} alt={provider} className="w-10 h-10" />}
          <h2 className="text-xl font-bold text-center">
            {needsLinkingConfirmation
              ? t('consent.link_title', { provider })
              : t('consent.title', { provider })}
          </h2>
        </div>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-4">
          {needsLinkingConfirmation
            ? t('consent.link_desc', { provider })
            : t('consent.desc', { provider })}
        </p>
        <div className="mb-4">
          <h3 className="font-semibold mb-2 text-sm text-gray-700 dark:text-gray-200">
            {t('consent.scopes')}
          </h3>
          <ul className="space-y-2">
            {scopes.map((scope) => (
              <li key={scope} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={consented[scope]}
                  onChange={() => setConsented((c) => ({ ...c, [scope]: !c[scope] }))}
                  id={`scope-${scope}`}
                  className="accent-blue-500"
                  aria-label={scope}
                />
                <label htmlFor={`scope-${scope}`} className="text-xs">
                  {scope}
                </label>
              </li>
            ))}
          </ul>
        </div>
        <button
          className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-500 text-white font-bold text-lg shadow-md hover:scale-105 transition-transform focus:outline-none focus:ring-4 focus:ring-blue-300"
          onClick={() => onConfirm(Object.entries(consented).filter(([_, v]) => v).map(([k]) => k))}
          aria-label={t('consent.confirm')}
        >
          {needsLinkingConfirmation ? t('consent.link_confirm') : t('consent.confirm')}
        </button>
      </div>
    </div>
  );
}; 