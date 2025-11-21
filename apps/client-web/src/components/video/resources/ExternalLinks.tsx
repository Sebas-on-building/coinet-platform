import React from 'react';
import { useTheme } from '../../../../../../packages/shared-ui/themes/useTheme';

const links = [
  { label: 'Coinet Blog', url: 'https://blog.coinet.com' },
  { label: 'Crypto Twitter', url: 'https://twitter.com/search?q=crypto' },
];

const ExternalLinks = () => {
  const { typography, spacing, colors } = useTheme();
  return (
    <div style={{ marginBottom: spacing.sm }}>
      {links.map(link => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...typography.body, color: colors.info, textDecoration: 'underline', display: 'block', marginBottom: spacing.xs }}
        >
          {link.label} ↗
        </a>
      ))}
    </div>
  );
};
export default ExternalLinks; 