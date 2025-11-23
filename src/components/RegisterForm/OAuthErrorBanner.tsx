import React from 'react';
import { t } from '../../utils/i18n';

export const OAuthErrorBanner = ({ error }: { error: string }) => (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative animate-shake" role="alert">
    <span className="block sm:inline">{t(error)}</span>
  </div>
); 