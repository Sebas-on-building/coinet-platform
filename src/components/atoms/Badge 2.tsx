import React from 'react';
import styled from 'styled-components';

const StyledBadge = styled.span<{ $color?: string }>`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 9999px;
  background: ${({ $color }) => $color || 'var(--color-primary)'};
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.4;
`;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: string;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ color, children, ...props }) => (
  <StyledBadge $color={color} {...props}>{children}</StyledBadge>
); 