import React from 'react';
import { useTheme } from '../../../../../../packages/shared-ui/themes/useTheme';

const TradingViewEmbed = () => {
  const { radii, spacing } = useTheme();
  return (
    <div style={{ marginBottom: spacing.sm }}>
      <iframe
        title="TradingView Chart"
        src="https://www.tradingview.com/chart/"
        style={{ width: '100%', height: 120, border: 'none', borderRadius: radii.sm, boxShadow: '0 2px 8px #0001' }}
        loading="lazy"
      />
    </div>
  );
};
export default TradingViewEmbed; 