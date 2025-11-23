import React from 'react';
import PluginList from './PluginList';

export default {
  title: 'Organisms/PluginList',
  component: PluginList,
};

const mockPlugins = [
  { id: '1', name: 'AI Trading Bot', category: 'AI', author: 'Alice', version: '1.2.0' },
  { id: '2', name: 'Portfolio Tracker', category: 'Analytics', author: 'Bob', version: '2.0.1' },
  { id: '3', name: 'Security Scanner', category: 'Security', author: 'Charlie', version: '0.9.5' },
];

const categories = ['All', 'AI', 'Analytics', 'Security'];

export const Default = () => (
  <PluginList
    categories={categories}
    onPluginSelect={plugin => alert('Selected: ' + plugin.name)}
    onInstall={plugin => alert('Install: ' + plugin.name)}
    onFavorite={plugin => alert('Favorite: ' + plugin.name)}
    onShare={plugin => alert('Share: ' + plugin.name)}
    onFork={plugin => alert('Fork: ' + plugin.name)}
    onReport={plugin => alert('Report: ' + plugin.name)}
  />
); 