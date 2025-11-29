import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CardHeader } from '../CardHeader';

describe('CardHeader', () => {
  it('renders children', () => {
    render(<CardHeader>Header Content</CardHeader>);
    expect(screen.getByText('Header Content')).toBeInTheDocument();
  });
  it('applies className and style', () => {
    render(<CardHeader className="test-class" style={{ color: 'red' }}>Styled</CardHeader>);
    const header = screen.getByText('Styled');
    expect(header).toHaveClass('test-class');
    expect(header).toHaveStyle('color: red');
  });
  it('has ARIA label', () => {
    render(<CardHeader>Header</CardHeader>);
    expect(screen.getByLabelText('Card header')).toBeInTheDocument();
  });
}); 