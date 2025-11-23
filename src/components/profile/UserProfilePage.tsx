import React, { useState } from 'react';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';

const themes = ['Light', 'Dark', 'Solarized'];
const languages = ['English', 'Deutsch', 'Español', 'Français'];

const UserProfilePage = React.memo(() => {
  const [name, setName] = useState('Satoshi Nakamoto');
  const [theme, setTheme] = useState(themes[0]);
  const [lang, setLang] = useState(languages[0]);
  const [notifications, setNotifications] = useState(true);
  return (
    <Card style={{ maxWidth: 480, margin: '40px auto', padding: 32 }}>
      <h2>User Profile</h2>
      <div style={{ marginBottom: 16 }}>
        <label>Name</label>
        <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--color-border)' }} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label>Theme Preset</label>
        <select value={theme} onChange={e => setTheme(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6 }}>
          {themes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label>Language</label>
        <select value={lang} onChange={e => setLang(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6 }}>
          {languages.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label><input type="checkbox" checked={notifications} onChange={e => setNotifications(e.target.checked)} /> Enable Notifications</label>
      </div>
      <Button variant="primary" size="md">Save Changes</Button>
    </Card>
  );
});

export default UserProfilePage; 