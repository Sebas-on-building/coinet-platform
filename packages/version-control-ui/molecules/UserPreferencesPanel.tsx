import React, { useEffect, useState } from 'react';
export function UserPreferencesPanel() {
  const [settings, setSettings] = useState({ theme: 'dark', notifications: true });
  useEffect(() => {
    fetch('/api/settings/user').then(res => res.json()).then(setSettings);
  }, []);
  function updateSettings(newSettings) {
    setSettings(newSettings);
    fetch('/api/settings/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
  }
  return (
    <div>
      <label>
        Theme
        <select value={settings.theme} onChange={e => updateSettings({ ...settings, theme: e.target.value })}>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </label>
      <label>
        <input type="checkbox" checked={settings.notifications} onChange={e => updateSettings({ ...settings, notifications: e.target.checked })} />
        Enable Notifications
      </label>
    </div>
  );
} 