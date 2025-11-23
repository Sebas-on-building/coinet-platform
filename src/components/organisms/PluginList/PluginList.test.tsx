import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PluginList from './PluginList';

const mockPlugins = [
  { id: '1', name: 'AI Trading Bot', category: 'AI', author: 'Alice', version: '1.2.0' },
  { id: '2', name: 'Portfolio Tracker', category: 'Analytics', author: 'Bob', version: '2.0.1' },
  { id: '3', name: 'Security Scanner', category: 'Security', author: 'Charlie', version: '0.9.5' },
];

jest.mock('../../../services/pluginApi', () => ({
  fetchPlugins: () => Promise.resolve(mockPlugins),
}));

describe('PluginList', () => {
  it('renders and displays plugins', async () => {
    render(<PluginList categories={['All', 'AI', 'Analytics', 'Security']} />);
    expect(screen.getByText('Loading plugins...')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('AI Trading Bot')).toBeInTheDocument());
    expect(screen.getByText('Portfolio Tracker')).toBeInTheDocument();
    expect(screen.getByText('Security Scanner')).toBeInTheDocument();
  });

  it('filters by search', async () => {
    render(<PluginList categories={['All', 'AI', 'Analytics', 'Security']} />);
    await waitFor(() => expect(screen.getByText('AI Trading Bot')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('Search plugins, authors, tags, AI...'), { target: { value: 'Portfolio' } });
    expect(screen.getByText('Portfolio Tracker')).toBeInTheDocument();
    expect(screen.queryByText('AI Trading Bot')).toBeNull();
  });

  it('filters by category', async () => {
    render(<PluginList categories={['All', 'AI', 'Analytics', 'Security']} />);
    await waitFor(() => expect(screen.getByText('AI Trading Bot')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Security'));
    expect(screen.getByText('Security Scanner')).toBeInTheDocument();
    expect(screen.queryByText('AI Trading Bot')).toBeNull();
  });
}); 