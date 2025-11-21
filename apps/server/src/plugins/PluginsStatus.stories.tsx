import React from 'react';
import { PluginsStatus } from './PluginsStatus';

export default {
  title: 'Server/Plugins/PluginsStatus',
  component: PluginsStatus,
};

export const Active = () => <PluginsStatus status="active" />;
export const Inactive = () => <PluginsStatus status="inactive" />;
