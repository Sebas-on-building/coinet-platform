import React from 'react';
import { Badge } from './Badge';

export default {
  title: 'Design System/Badge',
  component: Badge,
};

export const Default = () => <Badge>Default</Badge>;

export const Variants = () => (
  <div style={{ display: 'flex', gap: 12 }}>
    <Badge variant="primary">Primary</Badge>
    <Badge variant="secondary">Secondary</Badge>
    <Badge variant="success">Success</Badge>
    <Badge variant="warning">Warning</Badge>
    <Badge variant="danger">Danger</Badge>
    <Badge variant="info">Info</Badge>
  </div>
);

export const WithIcon = () => <Badge icon={<span>🔥</span>}>Hot</Badge>; 