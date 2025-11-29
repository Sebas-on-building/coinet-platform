import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PluginReviews } from './PluginReviews';

describe('PluginReviews', () => {
  it('renders reviews and allows adding', () => {
    render(<PluginReviews pluginKey="test" />);
    expect(screen.getByText(/Reviews/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Your review/i), { target: { value: 'Great!' } });
    fireEvent.change(screen.getByLabelText(/Rating/i), { target: { value: '5' } });
    fireEvent.click(screen.getByText(/Add Review/i));
    expect(screen.getByText(/Great!/i)).toBeInTheDocument();
  });
  // TODO: Add tests for average rating, accessibility
}); 