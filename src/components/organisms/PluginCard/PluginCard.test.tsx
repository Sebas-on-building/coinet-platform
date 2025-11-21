import React from 'react';
import { render, screen } from '@testing-library/react';
import PluginCard from './PluginCard';

const mockPlugin = {
  id: '1',
  name: 'AI Trading Bot',
  category: 'AI',
  author: 'Alice',
  version: '1.2.0',
  description: 'A revolutionary AI-powered trading bot for Coinet.',
  // ...add all fields for subcomponents
};

describe('PluginCard', () => {
  it('renders plugin meta and preview', () => {
    render(<PluginCard plugin={mockPlugin} />);
    expect(screen.getByText('AI Trading Bot')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('1.2.0')).toBeInTheDocument();
  });
}); 