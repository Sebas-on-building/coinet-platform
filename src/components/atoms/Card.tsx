import React from 'react';
import styled, { css } from 'styled-components';

type Elevation = 'sm' | 'md' | 'lg' | 'neon' | 'glass';

const elevations: Record<Elevation, ReturnType<typeof css>> = {
  sm: css`box-shadow: 0 1px 4px #0001;`,
  md: css`box-shadow: 0 4px 16px #0002;`,
  lg: css`box-shadow: 0 8px 32px #0003;`,
  neon: css`box-shadow: 0 0 16px 2px #00ffa3;`,
  glass: css`backdrop-filter: blur(16px); background: rgba(255,255,255,0.7); box-shadow: 0 8px 32px 0 rgba(0,255,163,0.08);`,
};

interface StyledCardProps {
  $elevation: Elevation;
}

const StyledCard = styled.div<StyledCardProps>`
  border-radius: 16px;
  background: var(--color-surface);
  padding: 24px;
  ${({ $elevation }) => elevations[$elevation]};
  transition: box-shadow 0.18s cubic-bezier(.4,0,.2,1);
`;

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: Elevation;
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ elevation = 'md', children, ...props }, ref) => (
    <StyledCard ref={ref} $elevation={elevation} {...props}>
      {children}
    </StyledCard>
  )
);
Card.displayName = 'Card'; 