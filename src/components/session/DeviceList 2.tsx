import React from 'react';
import { t } from '../../utils/i18n';

export const DeviceList = ({ devices, onRevoke }: { devices: any[], onRevoke: (deviceId: string) => void }) => (
  <div className="space-y-4">
    <h2 className="text-xl font-bold">{t('session.devices')}</h2>
    <ul className="divide-y divide-gray-200 dark:divide-neutral-700">
      {devices.map((d) => (
        <li key={d.deviceId} className="flex items-center justify-between py-3">
          <div>
            <div className="font-semibold">{d.meta?.deviceName || t('session.unknown_device')}</div>
            <div className="text-xs text-gray-500">{d.meta?.ip} · {d.meta?.location} · {d.meta?.lastUsed}</div>
          </div>
          <button
            className="px-3 py-1 rounded bg-red-500 text-white font-bold hover:bg-red-600 transition"
            onClick={() => onRevoke(d.deviceId)}
            aria-label={t('session.revoke')}
          >
            {t('session.revoke')}
          </button>
        </li>
      ))}
    </ul>
  </div>
); 