import React from 'react';
import { Progress } from './Progress';

export default {
  title: 'Design System/Progress',
  component: Progress,
};

export const Default = () => <Progress value={50} />;

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 16 }}>
    <Progress value={25} size="sm" />
    <Progress value={50} size="md" />
    <Progress value={75} size="lg" />
  </div>
);

export const WithLabel = () => <Progress value={70} label="70%" />; 