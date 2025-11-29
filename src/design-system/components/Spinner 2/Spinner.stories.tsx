import React from 'react';
import { Spinner } from './Spinner';

export default {
  title: 'Design System/Spinner',
  component: Spinner,
};

export const Default = () => <Spinner />;

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 16 }}>
    <Spinner size="sm" />
    <Spinner size="md" />
    <Spinner size="lg" />
  </div>
);

export const WithColor = () => <Spinner color="#00ffa3" />; 