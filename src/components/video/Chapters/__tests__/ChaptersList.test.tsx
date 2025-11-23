import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChaptersList from '../ChaptersList';
import * as hooks from '@/hooks/useChapters';

type UseChaptersType = typeof hooks.useChapters;
const mockedUseChapters = hooks.useChapters as jest.MockedFunction<UseChaptersType>;

jest.mock('@/hooks/useChapters');

const mockChapters = [
  { id: 1, title: 'Chapter 1', timestamp: '0:00', description: 'Desc', bookmarked: false, reactions: { like: 0, love: 0, wow: 0 } },
  { id: 2, title: 'Chapter 2', timestamp: '2:00', description: 'Desc', bookmarked: true, reactions: { like: 1, love: 2, wow: 0 } },
];

describe('ChaptersList', () => {
  it('renders loading', () => {
    mockedUseChapters.mockReturnValue({ isLoading: true } as any);
    render(<ChaptersList />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
  it('renders error', () => {
    mockedUseChapters.mockReturnValue({ isError: true, refetch: jest.fn() } as any);
    render(<ChaptersList />);
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });
  it('renders empty', () => {
    mockedUseChapters.mockReturnValue({ isLoading: false, isError: false, data: [] } as any);
    render(<ChaptersList />);
    expect(screen.getByText(/no chapters found/i)).toBeInTheDocument();
  });
  it('renders data and handles actions', () => {
    const bookmark = { mutate: jest.fn() };
    const react = { mutate: jest.fn() };
    mockedUseChapters.mockReturnValue({ isLoading: false, isError: false, data: mockChapters, bookmark, react } as any);
    render(<ChaptersList />);
    expect(screen.getByText('Chapter 1')).toBeInTheDocument();
    fireEvent.click(screen.getAllByLabelText('Bookmark')[0]);
    expect(bookmark.mutate).toHaveBeenCalled();
    fireEvent.click(screen.getAllByLabelText('Like')[0]);
    expect(react.mutate).toHaveBeenCalledWith({ id: 1, reaction: 'like' });
  });
}); 