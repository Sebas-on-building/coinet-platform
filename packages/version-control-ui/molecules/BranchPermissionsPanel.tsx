import React, { useEffect, useState } from 'react';
export function BranchPermissionsPanel({ branch }) {
  const [permissions, setPermissions] = useState({ protected: false, requireReview: false });
  useEffect(() => {
    fetch(`/api/branches/permissions?branch=${branch}`)
      .then(res => res.json())
      .then(setPermissions);
  }, [branch]);
  function updatePermissions(newPerms) {
    setPermissions(newPerms);
    fetch(`/api/branches/permissions?branch=${branch}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPerms),
    });
  }
  return (
    <div className="rounded-xl bg-[rgba(30,34,90,0.85)] p-4 shadow-inner text-blue-200 flex flex-col gap-2">
      <div className="font-bold text-lg mb-2">Branch Permissions</div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={permissions.protected}
          onChange={e => updatePermissions({ ...permissions, protected: e.target.checked })}
        />
        Protected Branch
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={permissions.requireReview}
          onChange={e => updatePermissions({ ...permissions, requireReview: e.target.checked })}
        />
        Require Review
      </label>
    </div>
  );
} 