"use client";
import React, { useState, Suspense } from 'react';
import { SkeletonLoader } from '@/design-system/components/atoms/SkeletonLoader';
import { ErrorMessage } from '@/design-system/components/atoms/ErrorMessage';
import { FocusTrap } from '@/design-system/components/organisms/FocusTrap';
import { A11yAnnouncer } from '@/design-system/components/atoms/A11yAnnouncer';
import ProviderButton from '@/components/RegisterForm/ProviderButton';
import { ConsentModal } from '@/components/RegisterForm/ConsentModal';
import { OAuthErrorBanner } from '@/components/RegisterForm/OAuthErrorBanner';
import { t } from '@/utils/i18n';

export default function RegisterPage() {
  // Simulated state for demo; in production, get from NextAuth session
  const [showConsent, setShowConsent] = useState(false);
  const [consentProvider, setConsentProvider] = useState<'google' | 'apple' | 'twitter' | null>(null);
  const [consentScopes, setConsentScopes] = useState<string[]>([]);
  const [needsLinking, setNeedsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulate provider click
  const handleProviderClick = (provider: 'google' | 'apple' | 'twitter') => {
    // TODO: Integrate with NextAuth signIn and session
    setConsentProvider(provider);
    setConsentScopes([
      ...(provider === 'google' ? ['openid', 'email', 'profile'] : []),
      ...(provider === 'apple' ? ['name', 'email'] : []),
      ...(provider === 'twitter' ? ['tweet.read', 'users.read', 'email'] : []),
    ]);
    setNeedsLinking(provider === 'google'); // Simulate linking for demo
    setShowConsent(true);
  };

  const handleConsentConfirm = (scopes: string[]) => {
    // TODO: Call backend to store consent, link account, etc.
    setShowConsent(false);
    setError(null);
    // TODO: Analytics event
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-white dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900">
      <A11yAnnouncer message="Register page loaded" />
      <FocusTrap>
        <div className="max-w-lg w-full p-8 rounded-3xl shadow-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl space-y-8 transition-colors duration-300">
          <h1 className="text-3xl font-extrabold text-center text-gray-900 dark:text-white mb-6 tracking-tight">
            {t('register.title')}
          </h1>
          {error && <OAuthErrorBanner error={error} />}
          <div className="flex flex-col gap-4">
            <ProviderButton provider="google" onClick={() => handleProviderClick('google')} />
            <ProviderButton provider="apple" onClick={() => handleProviderClick('apple')} />
            <ProviderButton provider="twitter" onClick={() => handleProviderClick('twitter')} />
            {/* TODO: Add more providers, show linked status, analytics */}
          </div>
          {/* TODO: Add RegisterForm for email/password as a tab or below */}
          {/* TODO: Add beautiful divider, micro-interactions, and animated transitions */}
        </div>
        <ConsentModal
          open={showConsent}
          onClose={() => setShowConsent(false)}
          provider={consentProvider || 'google'}
          scopes={consentScopes}
          onConfirm={handleConsentConfirm}
          needsLinkingConfirmation={needsLinking}
        />
      </FocusTrap>
    </div>
  );
} 