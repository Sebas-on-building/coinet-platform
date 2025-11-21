import React, { useState, useMemo, useCallback, createContext, useEffect } from 'react';
import PluginSearchBar from '../../molecules/PluginSearchBar/PluginSearchBar';
import PluginFilterPanel from '../../molecules/PluginFilterPanel/PluginFilterPanel';
import PluginSortDropdown from '../../atoms/PluginSortDropdown/PluginSortDropdown';
import PluginCategoryTabs from '../../atoms/PluginCategoryTabs/PluginCategoryTabs';
import PluginCard from '../PluginCard/PluginCard';
import { fetchPlugins } from '../../../services/pluginApi';
import { Card } from '../../ui/Card';
import { ThemeProvider } from '../../design-system/DesignSystemProvider';
import styles from './PluginList.module.css';

// Context for PluginList (AI, analytics, collab, etc.)
export const PluginListContext = createContext({});

export interface PluginListProps {
  categories: string[];
  onPluginSelect?: (plugin: any) => void;
  onInstall?: (plugin: any) => void;
  onFavorite?: (plugin: any) => void;
  onShare?: (plugin: any) => void;
  onFork?: (plugin: any) => void;
  onReport?: (plugin: any) => void;
  // ... extensible props for future features
}

const PluginList: React.FC<PluginListProps> = ({
  categories,
  onPluginSelect,
  onInstall,
  onFavorite,
  onShare,
  onFork,
  onReport,
}) => {
  // State for search, filter, sort, category
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState('popularity');
  const [category, setCategory] = useState(categories[0] || 'All');
  const [plugins, setPlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchPlugins()
      .then(setPlugins)
      .catch(e => setError(e.message || 'Failed to load plugins'))
      .finally(() => setLoading(false));
  }, []);

  // Memoized filtered/sorted plugins
  const filteredPlugins = useMemo(() => {
    // Advanced filtering, AI, analytics, etc.
    return plugins.filter(p =>
      (!search || p.name.toLowerCase().includes(search.toLowerCase())) &&
      (!category || category === 'All' || p.category === category) &&
      (!filters.securityAudited || p.security?.status === 'Audited') &&
      (!filters.aiPowered || (p.aiFeatures && p.aiFeatures.length > 0)) &&
      (!filters.highAnalytics || (p.analytics && p.analytics.activeUsers > 100)) &&
      (!filters.verifiedAuthor || p.authorVerified) &&
      (!filters.openSource || p.openSource) &&
      (!filters.hasDocs || p.hasDocs) &&
      (!filters.activeUsersMin || (p.analytics && p.analytics.activeUsers >= filters.activeUsersMin))
    );
  }, [plugins, search, filters, category]);

  // Context value for subcomponents
  const contextValue = useMemo(() => ({
    search, setSearch, filters, setFilters, sort, setSort, category, setCategory,
    onPluginSelect, onInstall, onFavorite, onShare, onFork, onReport,
    // ...AI, analytics, collab, etc.
  }), [search, filters, sort, category, onPluginSelect, onInstall, onFavorite, onShare, onFork, onReport]);

  return (
    <ThemeProvider>
      <PluginListContext.Provider value={contextValue}>
        <div className={styles.pluginListRoot}>
          <div className={styles.pluginListHeader}>
            <PluginSearchBar />
            <PluginFilterPanel />
            <PluginSortDropdown />
            <PluginCategoryTabs categories={categories} />
          </div>
          <div className={styles.pluginListGrid}>
            {loading && <div>Loading plugins...</div>}
            {error && <div className={styles.error}>{error}</div>}
            {!loading && !error && filteredPlugins.map(plugin => (
              <PluginCard key={plugin.id} plugin={plugin} onInstall={onInstall} onFavorite={onFavorite} onShare={onShare} onFork={onFork} onReport={onReport} />
            ))}
          </div>
        </div>
      </PluginListContext.Provider>
    </ThemeProvider>
  );
};

export default PluginList; 