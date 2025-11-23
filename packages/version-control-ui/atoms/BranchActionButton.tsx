import React from 'react';
export function BranchActionButton({ icon, label, onClick, disabled }) {
  return (
    <button
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white font-semibold shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      tabIndex={0}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
} 