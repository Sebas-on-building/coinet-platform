import React, { useState } from 'react';
import { Switch } from './Switch';

export default {
  title: 'Design System/Switch',
  component: Switch,
};

export const Default = () => {
  const [checked, setChecked] = useState(false);
  return <Switch checked={checked} onChange={setChecked} />;
};

export const WithLabel = () => {
  const [checked, setChecked] = useState(true);
  return <Switch checked={checked} onChange={setChecked} label="Enable feature" />;
}; 