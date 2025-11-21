import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export default {
  title: 'Dashboard/ThemeSwitcher',
};

const themes = [
  { name: 'Light', value: '#f8fafc' },
  { name: 'Dark', value: '#18192b' },
  { name: 'Solana', value: 'linear-gradient(90deg, #23234d 0%, #00ffa3 100%)' },
  { name: 'Canva', value: 'linear-gradient(90deg, #00c4cc 0%, #0057ff 100%)' },
  { name: 'TradingView', value: 'linear-gradient(90deg, #18192b 0%, #0057ff 100%)' },
];

export const ThemeSwitcher = () => {
  const [theme, setTheme] = useState(themes[0].value);
  return (
    <div style={{ minHeight: '100vh', background: theme, padding: 32 }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {themes.map(t => (
          <Button key={t.name} onClick={() => setTheme(t.value)}>{t.name}</Button>
        ))}
      </div>
      <Card>
        <h2>Dashboard Theme Example</h2>
        <p>This dashboard supports instant theme switching, inspired by Apple, Canva, TradingView, and Solana.</p>
      </Card>
    </div>
  );
}; 