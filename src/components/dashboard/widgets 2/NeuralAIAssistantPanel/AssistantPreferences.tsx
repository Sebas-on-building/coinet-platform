import React, { useState } from 'react';
import styles from './design.module.css';

export const AssistantPreferences: React.FC<{
  preferences: any;
  onChange: (prefs: any) => void;
}> = ({ preferences, onChange }) => {
  const [localPrefs, setLocalPrefs] = useState(preferences);

  const handleChange = (key: string, value: any) => {
    const updated = { ...localPrefs, [key]: value };
    setLocalPrefs(updated);
    onChange(updated);
  };

  return (
    <div className={styles['assistant-preferences']}>
      <h4 className={styles['assistant-preferences-title']}>AI Assistant Preferences</h4>
      <div className={styles['assistant-preferences-group']}>
        <label>Assistant Tone</label>
        <select value={localPrefs.tone} onChange={e => handleChange('tone', e.target.value)}>
          <option value="friendly">Friendly</option>
          <option value="professional">Professional</option>
          <option value="concise">Concise</option>
          <option value="detailed">Detailed</option>
        </select>
      </div>
      <div className={styles['assistant-preferences-group']}>
        <label>Verbosity</label>
        <select value={localPrefs.verbosity} onChange={e => handleChange('verbosity', e.target.value)}>
          <option value="short">Short</option>
          <option value="medium">Medium</option>
          <option value="long">Long</option>
        </select>
      </div>
      <div className={styles['assistant-preferences-group']}>
        <label>Theme</label>
        <select value={localPrefs.theme} onChange={e => handleChange('theme', e.target.value)}>
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      <div className={styles['assistant-preferences-group']}>
        <label>Behavior</label>
        <select value={localPrefs.behavior} onChange={e => handleChange('behavior', e.target.value)}>
          <option value="default">Default</option>
          <option value="creative">Creative</option>
          <option value="analytical">Analytical</option>
        </select>
      </div>
    </div>
  );
}; 