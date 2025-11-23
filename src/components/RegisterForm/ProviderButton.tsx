"use client";
import React from 'react';
import { t } from '../../utils/i18n';

export const ProviderButton = ({
  provider,
  onClick,
  linked,
}: {
  provider: 'google' | 'apple' | 'twitter';
  onClick: () => void;
  linked?: boolean;
}) => {
  const brand = {
    google: { color: 'bg-white text-gray-800', icon: '/icons/google.svg' },
    apple: { color: 'bg-black text-white', icon: '/icons/apple.svg' },
    twitter: { color: 'bg-blue-500 text-white', icon: '/icons/twitter.svg' },
  }[provider];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg font-semibold shadow hover:shadow-lg border transition-all focus:outline-none focus:ring-2 ${brand.color} ${linked ? 'ring-2 ring-green-400' : ''}`}
      aria-label={t(`oauth.${provider}`)}
    >
      <img src={brand.icon} alt={provider} className="w-5 h-5" />
      {t(`oauth.${provider}`)}
      {linked && <span className="ml-2 text-green-500 animate-pulse">{t('oauth.linked')}</span>}
    </button>
  );
};

export default ProviderButton; 