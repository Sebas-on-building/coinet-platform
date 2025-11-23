import React from 'react';
export function BranchStatusBadge({ status }) {
  const statusMap = {
    active: { color: 'bg-green-500', label: 'Active', icon: '●' },
    merged: { color: 'bg-purple-500', label: 'Merged', icon: '⇄' },
    protected: { color: 'bg-blue-500', label: 'Protected', icon: '🔒' },
    deleted: { color: 'bg-gray-400', label: 'Deleted', icon: '✖' },
    default: { color: 'bg-gray-600', label: status, icon: '●' },
  };
  const { color, label, icon } = statusMap[status] || statusMap.default;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${color} text-white shadow transition-all`}
      aria-label={`Branch status: ${label}`}
    >
      <span>{icon}</span>
      {label}
    </span>
  );
} 