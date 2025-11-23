import React from 'react';
export function BranchNameInput({ value, onChange, error }) {
  return (
    <div>
      <input
        className="px-3 py-2 rounded-lg bg-[rgba(30,34,90,0.85)] backdrop-blur border border-blue-300 focus:ring-2 focus:ring-blue-400 text-lg font-medium shadow-lg transition-all duration-200 outline-none"
        placeholder="Enter branch name"
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label="Branch name"
        aria-invalid={!!error}
      />
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  );
} 