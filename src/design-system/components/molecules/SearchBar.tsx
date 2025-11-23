import React, { useRef } from 'react';
import { Input } from '../atoms/Input';
import { Icon } from '../atoms/Icon';
import { Button } from '../atoms/Button';
import clsx from 'clsx';

export interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onSearch?: () => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  autoFocus?: boolean;
  disabled?: boolean;
  loading?: boolean;
  keyboardShortcut?: string; // e.g. 'Cmd+K'
  ariaLabel?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = 'Search...',
  className,
  style,
  autoFocus = false,
  disabled = false,
  loading = false,
  keyboardShortcut = '',
  ariaLabel = 'Search',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  // Keyboard shortcut
  React.useEffect(() => {
    if (!keyboardShortcut) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === keyboardShortcut.replace(/(Cmd\+|Ctrl\+)/i, '').toLowerCase()) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [keyboardShortcut]);
  return (
    <div className={clsx('co-searchbar', className)} style={style}>
      <Input
        ref={inputRef}
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        leftIcon={<Icon name="search" size="sm" />}
        rightIcon={loading ? <Icon name="spinner" size="sm" animated /> : undefined}
        clearable
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoFocus={autoFocus}
        disabled={disabled}
        className="co-searchbar-input"
      />
      <Button
        variant="primary"
        size="sm"
        onClick={onSearch}
        disabled={disabled || loading}
        className="co-searchbar-btn"
        aria-label="Search"
      >
        <Icon name="search" size="sm" />
      </Button>
      {keyboardShortcut && <span className="co-searchbar-shortcut">{keyboardShortcut}</span>}
    </div>
  );
}; 