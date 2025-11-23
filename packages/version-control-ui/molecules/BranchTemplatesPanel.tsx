import React, { useEffect, useState } from 'react';
export function BranchTemplatesPanel({ onSelect }) {
  const [templates, setTemplates] = useState([]);
  const [newTemplate, setNewTemplate] = useState('');
  useEffect(() => {
    fetch('/api/branches/templates')
      .then(res => res.json())
      .then(setTemplates);
  }, []);
  function addTemplate() {
    if (!newTemplate) return;
    fetch('/api/branches/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newTemplate, value: newTemplate.toLowerCase() + '/' }),
    })
      .then(res => res.json())
      .then(t => setTemplates([...templates, t]));
    setNewTemplate('');
  }
  return (
    <div className="rounded-xl bg-[rgba(30,34,90,0.85)] p-4 shadow-inner text-blue-200 flex flex-col gap-2">
      <div className="font-bold text-lg mb-2">Branch Templates</div>
      <div className="flex gap-2 mb-2">
        <input
          className="px-2 py-1 rounded bg-blue-900/30 text-white"
          value={newTemplate}
          onChange={e => setNewTemplate(e.target.value)}
          placeholder="Add template..."
        />
        <button
          className="px-3 py-1 rounded bg-blue-500 text-white font-semibold"
          onClick={addTemplate}
        >
          Add
        </button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {templates.map(t => (
          <button
            key={t.value}
            className="px-3 py-1 rounded-lg bg-gradient-to-r from-blue-500 to-blue-300 hover:from-blue-600 hover:to-blue-400 text-white font-semibold shadow"
            onClick={() => onSelect(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
} 