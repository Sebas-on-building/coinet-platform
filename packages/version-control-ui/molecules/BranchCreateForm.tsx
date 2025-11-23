import React, { useState } from 'react';
import { BranchNameInput } from '../atoms/BranchNameInput';
import { BranchActionButton } from '../atoms/BranchActionButton';

const templates = [
  { label: 'Feature', value: 'feature/' },
  { label: 'Hotfix', value: 'hotfix/' },
  { label: 'Release', value: 'release/' },
];

export function BranchCreateForm({ onCreate }) {
  const [name, setName] = useState('');
  const [template, setTemplate] = useState(templates[0].value);
  const [error, setError] = useState('');

  function handleCreate() {
    if (!name || name.length < 3) {
      setError('Branch name must be at least 3 characters.');
      return;
    }
    setError('');
    onCreate(template + name);
    setName('');
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <select
          className="rounded-lg bg-[rgba(30,34,90,0.85)] border border-blue-300 text-white px-2"
          value={template}
          onChange={e => setTemplate(e.target.value)}
          aria-label="Branch template"
        >
          {templates.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <BranchNameInput value={name} onChange={setName} error={error} />
        <BranchActionButton icon="➕" label="Create" onClick={handleCreate} disabled={!name} />
      </div>
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  );
} 