import React from 'react';

interface ServiceCardProps {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  onRestart: () => void;
  onViewLogs: () => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ name, status, onRestart, onViewLogs }) => {
  const statusColor = status === 'healthy' ? 'bg-green-400' : status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="rounded-xl shadow-lg p-6 bg-gradient-to-br from-white/80 to-gray-100/60 backdrop-blur-md border border-gray-200 flex flex-col items-start gap-4 transition hover:scale-105 hover:shadow-2xl">
      <div className="flex items-center gap-2">
        <span className={`inline-block w-3 h-3 rounded-full ${statusColor}`}></span>
        <span className="font-semibold text-lg text-gray-800">{name}</span>
      </div>
      <div className="flex gap-2 mt-2">
        <button onClick={onRestart} className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition">Restart</button>
        <button onClick={onViewLogs} className="px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition">Logs</button>
      </div>
    </div>
  );
}; 