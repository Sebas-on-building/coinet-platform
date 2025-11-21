import React from 'react';
import { Divider } from './Divider';

export default {
  title: 'Design System/Divider',
  component: Divider,
};

export const Default = () => <Divider />;

export const WithLabel = () => <Divider>Label</Divider>;

export const Vertical = () => (
  <div style={{ display: 'flex', alignItems: 'center', height: 80 }}>
    <span>Left</span>
    <Divider orientation="vertical" style={{ height: 60, margin: '0 16px' }} />
    <span>Right</span>
  </div>
); 