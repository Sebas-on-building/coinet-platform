import React, { useContext } from 'react';
import { PluginListContext } from '../../organisms/PluginList/PluginList';
import styles from './PluginSortDropdown.module.css';

const sortOptions = [
  { value: 'popularity', label: 'Most Popular' },
  { value: 'latest', label: 'Latest' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'security', label: 'Security' },
  { value: 'ai', label: 'AI-Powered' },
];

const PluginSortDropdown: React.FC = () => {
  const { sort, setSort } = useContext(PluginListContext) as any;
  return (
    <select
      aria-label="Sort plugins"
      className={styles.select}
      value={sort}
      onChange={e => setSort(e.target.value)}
    >
      {sortOptions.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
};

export default PluginSortDropdown; 