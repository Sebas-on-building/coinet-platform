import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FocusRing } from '../FocusRing';

describe('FocusRing', () => {
  it('renders children', () => {
    render(<FocusRing>Test</FocusRing>);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
  it('shows focus ring on keyboard nav', () => {
    render(<FocusRing>Test</FocusRing>);
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.querySelector('.co-focus-ring')).toBeInTheDocument();
  });
  it('supports asChild', () => {
    render(<FocusRing asChild><button>Btn</button></FocusRing>);
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(screen.getByRole('button').className).toContain('co-focus-ring');
  });
}); 