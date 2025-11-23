import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { AIExplainabilitySourceDetails } from './AIExplainabilitySourceDetails';

export const AIExplainabilitySource: React.FC<{ type: string; label: string }> = ({ type, label }) => (
  <>
    <Badge color="info">{label}</Badge>
    <AIExplainabilitySourceDetails type={type} description={`Data from ${label}`} />
  </>
);
// TODO: Add animated transitions, accessibility, and extensibility for all sub-features 