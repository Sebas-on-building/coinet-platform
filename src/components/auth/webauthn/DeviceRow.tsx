import React from 'react';

export const DeviceRow: React.FC<{
  device: { id: string; name: string; type: string; registeredAt: string };
  onRevoke: (id: string) => void;
}> = ({ device, onRevoke }) => (
  <li className="flex justify-between items-center py-2 border-b last:border-b-0 group transition-all">
    <span>
      {device.name} <span className="text-xs text-slate-500">({device.type})</span>
    </span>
    <span className="text-xs text-slate-400">{device.registeredAt}</span>
    <button
      onClick={() => onRevoke(device.id)}
      className="text-red-500 hover:underline focus:outline-none focus:ring-2 focus:ring-red-400 rounded transition-all"
      aria-label={`Revoke device ${device.name}`}
      title="Revoke this device"
    >
      Revoke
    </button>
  </li>
); 