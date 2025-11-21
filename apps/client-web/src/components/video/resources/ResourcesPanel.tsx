import React from 'react';
import { useTheme } from '../../../../../../packages/shared-ui/themes/useTheme';
import TradingViewEmbed from './TradingViewEmbed';
import SolanaDocsLink from './SolanaDocsLink';
import ExternalLinks from './ExternalLinks';

const ResourcesPanel = () => {
  const { typography, spacing } = useTheme();
  return (
    <div style={{ margin: `${spacing.lg}px 0 ${spacing.md}px` }}>
      <div style={{ ...typography.h4, marginBottom: spacing.sm }}>Resources</div>
      <TradingViewEmbed />
      <SolanaDocsLink />
      <ExternalLinks />
    </div>
  );
};
export default ResourcesPanel; 