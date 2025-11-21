import React from 'react';
import { Avatar } from './Avatar';

export default {
  title: 'Design System/Avatar',
  component: Avatar,
};

export const Default = () => <Avatar src="/avatar.png" alt="User" />;

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 16 }}>
    <Avatar src="/avatar.png" alt="XS" size="xs" />
    <Avatar src="/avatar.png" alt="SM" size="sm" />
    <Avatar src="/avatar.png" alt="MD" size="md" />
    <Avatar src="/avatar.png" alt="LG" size="lg" />
    <Avatar src="/avatar.png" alt="XL" size="xl" />
  </div>
);

export const WithFallback = () => <Avatar alt="Fallback" />;

export const WithBadge = () => <Avatar src="/avatar.png" alt="With Badge" badge="online" />; 