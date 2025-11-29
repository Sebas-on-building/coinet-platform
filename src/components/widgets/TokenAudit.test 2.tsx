import React from 'react';
import { render, screen } from '@testing-library/react';
import { TokenAudit } from './TokenAudit';

describe('TokenAudit', () => {
  it('renders audit results', () => {
    render(<TokenAudit tokens={{ colors: { primary: '#0057FF' } }} />);
    expect(screen.getByText(/Token Audit/i)).toBeInTheDocument();
    expect(screen.getByText(/CONTRAST/i)).toBeInTheDocument();
  });
  // TODO: Add tests for pass/warn/fail states, accessibility
}); 