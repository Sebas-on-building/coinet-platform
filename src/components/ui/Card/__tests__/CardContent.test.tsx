import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CardContent } from '../CardContent';

describe('CardContent', () => {
  it('renders children', () => {
    render(<CardContent>Card Body</CardContent>);
    expect(screen.getByText('Card Body')).toBeInTheDocument();
  });
  it('applies className and style', () => {
    render(<CardContent className="test-class" style={{ color: 'blue' }}>Styled</CardContent>);
    const content = screen.getByText('Styled');
    expect(content).toHaveClass('test-class');
    expect(content).toHaveStyle('color: blue');
  });
  it('has ARIA label', () => {
    render(<CardContent>Content</CardContent>);
    expect(screen.getByLabelText('Card content')).toBeInTheDocument();
  });
}); 