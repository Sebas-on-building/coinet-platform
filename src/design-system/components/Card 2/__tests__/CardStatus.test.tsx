import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CardStatus } from '../CardStatus';

describe('CardStatus', () => {
  it('renders children', () => {
    render(<CardStatus>Status Content</CardStatus>);
    expect(screen.getByText('Status Content')).toBeInTheDocument();
  });
  it('applies className and style', () => {
    render(<CardStatus className="test-class" style={{ color: 'purple' }}>Styled</CardStatus>);
    const status = screen.getByText('Styled');
    expect(status).toHaveClass('test-class');
    expect(status).toHaveStyle('color: purple');
  });
  it('has ARIA label', () => {
    render(<CardStatus>Status</CardStatus>);
    expect(screen.getByLabelText('Card status')).toBeInTheDocument();
  });
}); 