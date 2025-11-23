import React from 'react';
import { BranchProtectionBadge } from '../atoms/BranchProtectionBadge';

export const BranchProtectionSettings = ({ level, onChange }: { level: 'none' | 'basic' | 'strict' | 'custom'; onChange: (level: 'none' | 'basic' | 'strict' | 'custom') => void }) => (
  <div className="flex items-center gap-4">
    <BranchProtectionBadge level={level} />
    <select value={level} onChange={e => onChange(e.target.value as any)} className="border rounded px-2 py-1">
      <option value="none">Unprotected</option>
      <option value="basic">Basic</option>
      <option value="strict">Strict</option>
      <option value="custom">Custom</option>
    </select>
  </div>
); 