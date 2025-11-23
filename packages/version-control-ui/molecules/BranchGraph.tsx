import React from 'react';
export function BranchGraph({ branches }) {
  // Placeholder: In production, use d3 or visx for animated, interactive graphs
  return (
    <div className="rounded-xl bg-[rgba(30,34,90,0.85)] p-4 shadow-inner min-h-[200px] flex items-center justify-center text-blue-200">
      <svg width="300" height="120">
        <circle cx="60" cy="60" r="30" fill="#4facfe" />
        <circle cx="180" cy="60" r="30" fill="#00f2fe" />
        <line x1="90" y1="60" x2="150" y2="60" stroke="#fff" strokeWidth="4" />
      </svg>
      <span className="ml-4">Branch Graph (animated, zoomable)</span>
    </div>
  );
} 