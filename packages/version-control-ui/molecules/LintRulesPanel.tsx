import React, { useEffect, useState } from 'react';
export function LintRulesPanel() {
  const [rules, setRules] = useState({ conventional: false, customRegex: '' });
  useEffect(() => {
    fetch('/api/commit-linting/rules').then(res => res.json()).then(setRules);
  }, []);
  function updateRules(newRules) {
    setRules(newRules);
    fetch('/api/commit-linting/rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRules),
    });
  }
  return (
    <div>
      <label>
        <input type="checkbox" checked={rules.conventional} onChange={e => updateRules({ ...rules, conventional: e.target.checked })} />
        Conventional Commits
      </label>
      <input
        value={rules.customRegex}
        onChange={e => updateRules({ ...rules, customRegex: e.target.value })}
        placeholder="Custom Regex"
      />
    </div>
  );
} 