import React from 'react';
import { Input } from '@/components/ui/Input';

export const PluginReviewFormField: React.FC<{ id: string; label: string; value: string | number; onChange: (v: string) => void; type?: string }> = ({ id, label, value, onChange, type = 'text' }) => (
  <div style={{ marginBottom: 8 }}>
    <label htmlFor={id} style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>{label}</label>
    <Input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} />
    {/* TODO: Add animated transitions, accessibility, and extensibility for all sub-features */}
  </div>
); 