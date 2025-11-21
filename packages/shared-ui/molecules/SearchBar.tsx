import React from 'react';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { tokens } from 'design-tokens/tokens';

export interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onSearch?: () => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = 'Search...',
}) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    background: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    boxShadow: tokens.shadows.xs,
    padding: tokens.spacing.xs,
    gap: tokens.spacing.xs,
  }}>
    <Input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ flex: 1 }}
      aria-label="Search"
    />
    <Button variant="primary" size="sm" onClick={onSearch} aria-label="Search">
      <span role="img" aria-label="search">🔍</span>
    </Button>
    {value && (
      <Button variant="ghost" size="sm" onClick={() => onChange('')} aria-label="Clear">
        <span role="img" aria-label="clear">✖️</span>
      </Button>
    )}
  </div>
); 