import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TokenExport } from './TokenExport';

describe('TokenExport', () => {
  it('renders export buttons', () => {
    render(<TokenExport tokens={{ colors: { primary: '#0057FF' } }} />);
    expect(screen.getByText(/Export as CSS/i)).toBeInTheDocument();
    expect(screen.getByText(/Export as JSON/i)).toBeInTheDocument();
  });
  // TODO: Add tests for export status, accessibility
}); 