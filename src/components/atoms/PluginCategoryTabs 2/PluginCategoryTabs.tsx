import React, { useContext } from 'react';
import { PluginListContext } from '../../organisms/PluginList/PluginList';
import styles from './PluginCategoryTabs.module.css';

interface PluginCategoryTabsProps {
  categories: string[];
}

const PluginCategoryTabs: React.FC<PluginCategoryTabsProps> = ({ categories }) => {
  const { category, setCategory } = useContext(PluginListContext) as any;
  return (
    <div className={styles.tabs} role="tablist" aria-label="Plugin categories">
      {categories.map(cat => (
        <button
          key={cat}
          className={category === cat ? styles.active : styles.tab}
          role="tab"
          aria-selected={category === cat}
          tabIndex={category === cat ? 0 : -1}
          onClick={() => setCategory(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
};

export default PluginCategoryTabs; 