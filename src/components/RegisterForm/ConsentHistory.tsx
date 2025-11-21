import React from 'react';
import { t } from '../../utils/i18n';

export const ConsentHistory = ({ history }: { history: any[] }) => (
  <div>
    <h3 className="font-bold text-lg">{t('consent.history')}</h3>
    <ul className="divide-y divide-gray-200 dark:divide-neutral-700">
      {history.map((item, i) => (
        <li key={i} className="py-2 flex flex-col">
          <span>
            <b>{item.provider}</b> - {item.scopes.join(', ')}
          </span>
          <span className="text-xs text-gray-500">
            {t('consent.at')}: {new Date(item.consentedAt).toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  </div>
); 