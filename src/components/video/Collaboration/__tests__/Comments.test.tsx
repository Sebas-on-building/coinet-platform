import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Comments from '../Comments';
import * as hooks from '@/hooks/useComments';

type UseCommentsType = typeof hooks.useComments;
const mockedUseComments = hooks.useComments as jest.MockedFunction<UseCommentsType>;

jest.mock('@/hooks/useComments');

const mockComments = [
  { id: 1, user: 'User1', text: 'Comment 1', timestamp: '12:00', bookmarked: false, reactions: { like: 0, love: 0, wow: 0 } },
  { id: 2, user: 'User2', text: 'Comment 2', timestamp: '12:02', bookmarked: true, reactions: { like: 1, love: 2, wow: 0 } },
];

describe('Comments', () => {
  it('renders loading', () => {
    mockedUseComments.mockReturnValue({ isLoading: true } as any);
    render(<Comments />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
  it('renders error', () => {
    mockedUseComments.mockReturnValue({ isError: true, refetch: jest.fn() } as any);
    render(<Comments />);
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });
  it('renders empty', () => {
    mockedUseComments.mockReturnValue({ isLoading: false, isError: false, data: [] } as any);
    render(<Comments />);
    expect(screen.getByText(/no comments found/i)).toBeInTheDocument();
  });
  it('renders data and handles actions', () => {
    const bookmark = { mutate: jest.fn() };
    const react = { mutate: jest.fn() };
    mockedUseComments.mockReturnValue({ isLoading: false, isError: false, data: mockComments, bookmark, react } as any);
    render(<Comments />);
    expect(screen.getByText('User1:')).toBeInTheDocument();
    fireEvent.click(screen.getAllByLabelText('Bookmark')[0]);
    expect(bookmark.mutate).toHaveBeenCalled();
    fireEvent.click(screen.getAllByLabelText('Like')[0]);
    expect(react.mutate).toHaveBeenCalledWith({ id: 1, reaction: 'like' });
  });
}); 