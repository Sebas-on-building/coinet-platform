import { useState } from 'react';
import styles from './CategoryTabs.module.css';

type CategoryTabsProps = {
  categories: string[];
  active: string;
  onChange: (category: string) => void;
};

export function CategoryTabs({ categories, active, onChange }: CategoryTabsProps) {
  return (
    <div className={styles.tabs} role="tablist">
      {categories.map((cat) => (
        <button
          key={cat}
          className={cat === active ? styles.active : styles.tab}
          role="tab"
          aria-selected={cat === active}
          tabIndex={cat === active ? 0 : -1}
          onClick={() => onChange(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
} 