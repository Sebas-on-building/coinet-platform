import React, { useState } from 'react';
import styled from 'styled-components';

const TooltipContainer = styled.span`
  position: relative;
  display: inline-block;
`;
const TooltipBubble = styled.span`
  position: absolute;
  bottom: 125%;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-surface);
  color: var(--color-text);
  padding: 8px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 16px #0002;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  z-index: 100;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s cubic-bezier(.4,0,.2,1);
  &[data-visible='true'] {
    opacity: 1;
    pointer-events: auto;
  }
`;

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [visible, setVisible] = useState(false);
  return (
    <TooltipContainer
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      tabIndex={0}
      aria-label={typeof content === 'string' ? content : undefined}
    >
      {children}
      <TooltipBubble data-visible={visible}>{content}</TooltipBubble>
    </TooltipContainer>
  );
}; 