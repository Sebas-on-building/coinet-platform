import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EventCheckbox } from '../EventCheckbox';

describe('EventCheckbox', () => {
  it('renders and toggles checked state', () => {
    const onChange = jest.fn();
    render(<EventCheckbox checked={false} onChange={onChange} />);
    const btn = screen.getByRole('checkbox');
    expect(btn).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(btn);
    expect(onChange).toHaveBeenCalledWith(true);
  });
  it('shows indeterminate state', () => {
    render(<EventCheckbox checked={false} indeterminate onChange={() => { }} />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    // visually, indeterminate bar is rendered
  });
  it('is accessible', () => {
    render(<EventCheckbox checked={false} onChange={() => { }} ariaLabel="Select event" />);
    expect(screen.getByLabelText('Select event')).toBeInTheDocument();
  });
}); 