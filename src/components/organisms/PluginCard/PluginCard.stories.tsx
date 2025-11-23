import React from 'react';
import PluginCard from './PluginCard';

export default {
  title: 'Organisms/PluginCard',
  component: PluginCard,
};

const mockPlugin = {
  id: '1',
  name: 'AI Trading Bot',
  category: 'AI',
  author: 'Alice',
  version: '1.2.0',
  description: 'A revolutionary AI-powered trading bot for Coinet.',
  // ...add all fields for subcomponents
};

export const Default = () => (
  <PluginCard plugin={mockPlugin} />
); 