import React, { useContext } from 'react';
import { PluginListContext } from '../../organisms/PluginList/PluginList';
import PluginAdvancedFilters from './PluginAdvancedFilters';
import styles from './PluginFilterPanel.module.css';

const PluginFilterPanel: React.FC = () => {
  const { filters, setFilters } = useContext(PluginListContext) as any;
  // TODO: Render filter controls (security, analytics, etc.)
  return (
    <div className={styles.root}>
      <PluginAdvancedFilters filters={filters} setFilters={setFilters} />
    </div>
  );
};

export default PluginFilterPanel; 