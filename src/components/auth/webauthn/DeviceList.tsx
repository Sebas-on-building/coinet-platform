import React from 'react';
import { DeviceRow } from './DeviceRow';
import { ExportButton } from './ExportButton';

export const DeviceList: React.FC<{
  devices: any[];
  onRevoke: (id: string) => void;
  onUndo: () => void;
  canUndo: boolean;
}> = ({ devices, onRevoke, onUndo, canUndo }) => (
  <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 p-4 shadow border w-full max-w-md mx-auto">
    <div className="flex justify-between items-center mb-2">
      <h4 className="font-semibold">Registered Devices</h4>
      <ExportButton data={devices} filename="devices.csv" />
    </div>
    <ul>
      {devices.map(d => (
        <DeviceRow key={d.id} device={d} onRevoke={onRevoke} />
      ))}
    </ul>
    {canUndo && (
      <button onClick={onUndo} className="text-blue-500 hover:underline mt-2" aria-label="Undo last revoke">
        Undo
      </button>
    )}
  </div>
); 