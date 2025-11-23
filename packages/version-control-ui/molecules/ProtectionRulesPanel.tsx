import React, { useEffect, useState } from 'react';
export function ProtectionRulesPanel() {
  const [rules, setRules] = useState({ requiredReviews: 0, statusChecks: false });
  useEffect(() => {
    fetch('/api/branch-protection/rules').then(res => res.json()).then(setRules);
  }, []);
  function updateRules(newRules) {
    setRules(newRules);
    fetch('/api/branch-protection/rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRules),
    });
  }
  return (
    <div>
      <label>
        Required Reviews
        <input type="number" value={rules.requiredReviews} onChange={e => updateRules({ ...rules, requiredReviews: Number(e.target.value) })} />
      </label>
      <label>
        <input type="checkbox" checked={rules.statusChecks} onChange={e => updateRules({ ...rules, statusChecks: e.target.checked })} />
        Require Status Checks
      </label>
    </div>
  );
} 