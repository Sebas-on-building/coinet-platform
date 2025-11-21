import React, { useState } from 'react';
import { Slider } from './Slider';

export default {
  title: 'Design System/Slider',
  component: Slider,
};

export const Default = () => {
  const [value, setValue] = useState(50);
  return <Slider value={value} onChange={setValue} />;
};

export const WithMarks = () => {
  const [value, setValue] = useState(30);
  return <Slider value={value} onChange={setValue} marks={[0, 25, 50, 75, 100]} />;
}; 