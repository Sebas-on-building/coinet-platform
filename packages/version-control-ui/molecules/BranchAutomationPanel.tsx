import React, { useEffect, useState } from 'react';
export function BranchAutomationPanel({ branch }) {
  const [automation, setAutomation] = useState({ autoDeleteMerged: false, autoProtect: false });
  useEffect(() => {
    fetch(`/api/branches/automation?branch=${branch}`)
      .then(res => res.json())
      .then(setAutomation);
  }, [branch]);
  function updateAutomation(newAuto) {
    setAutomation(newAuto);
    fetch(`/api/branches/automation?branch=${branch}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAuto),
    });
  }
  return (
    <div className="rounded-xl bg-[rgba(30,34,90,0.85)] p-4 shadow-inner text-blue-200 flex flex-col gap-2">
      <div className="font-bold text-lg mb-2">Branch Automation</div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={automation.autoDeleteMerged}
          onChange={e => updateAutomation({ ...automation, autoDeleteMerged: e.target.checked })}
        />
        Auto-delete merged branches
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={automation.autoProtect}
          onChange={e => updateAutomation({ ...automation, autoProtect: e.target.checked })}
        />
        Auto-protect new branches
      </label>
    </div>
  );
} 