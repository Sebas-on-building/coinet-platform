import React from 'react';
import { BranchProtectionRuleTemplateBadge } from '../atoms/BranchProtectionRuleTemplateBadge';

const templates = [
  { type: 'review', label: 'Required Review' },
  { type: 'status-check', label: 'Status Checks' },
  { type: 'commit-lint', label: 'Commit Linting' },
  { type: 'custom', label: 'Custom Rule' },
];

export const BranchProtectionRuleTemplateSelector = ({ selected, onSelect }: { selected: string[]; onSelect: (type: string) => void }) => (
  <div className="flex gap-2 flex-wrap">
    {templates.map(t => (
      <button
        key={t.type}
        type="button"
        onClick={() => onSelect(t.type)}
        className={`border rounded px-2 py-1 flex items-center gap-2 ${selected.includes(t.type) ? 'border-blue-500' : 'border-gray-300'}`}
      >
        <BranchProtectionRuleTemplateBadge type={t.type as any} />
        {t.label}
      </button>
    ))}
  </div>
); 