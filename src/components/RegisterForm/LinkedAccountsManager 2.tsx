import React from 'react';
import { ProviderButton } from './ProviderButton';
import { t } from '../../utils/i18n';

export const LinkedAccountsManager = ({
  linkedProviders,
  onLink,
  onUnlink,
}: {
  linkedProviders: { [provider: string]: boolean };
  onLink: (provider: string) => void;
  onUnlink: (provider: string) => void;
}) => (
  <div className="space-y-2">
    <h3 className="font-bold text-lg">{t('oauth.manage_accounts')}</h3>
    {['google', 'apple', 'twitter'].map((provider) => (
      <div key={provider} className="flex items-center gap-2">
        <ProviderButton
          provider={provider as any}
          onClick={() => linkedProviders[provider] ? onUnlink(provider) : onLink(provider)}
          linked={linkedProviders[provider]}
        />
        {linkedProviders[provider] && (
          <button
            onClick={() => onUnlink(provider)}
            className="text-xs text-red-500 underline ml-2"
            aria-label={t('oauth.unlink', { provider })}
          >
            {t('oauth.unlink', { provider })}
          </button>
        )}
      </div>
    ))}
  </div>
); 