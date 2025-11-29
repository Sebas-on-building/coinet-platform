import React from 'react';
import styled from 'styled-components';

const StyledInput = styled.input<{ $error?: boolean }>`
  width: 100%;
  padding: 10px 16px;
  border-radius: 12px;
  border: 2px solid ${({ $error }) => $error ? 'var(--color-error)' : 'var(--color-border)'};
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 16px;
  outline: none;
  transition: border 0.18s cubic-bezier(.4,0,.2,1);
  &:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary)33;
  }
`;

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, ...props }, ref) => (
    <StyledInput ref={ref} $error={error} aria-invalid={error} {...props} />
  )
);
Input.displayName = 'Input'; 