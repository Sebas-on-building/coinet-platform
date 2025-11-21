import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CardUndoRedo } from '../CardUndoRedo';
import * as CardAnalytics from '../CardAnalytics';
import * as CardCompliance from '../CardCompliance';

describe('CardUndoRedo', () => {
  beforeEach(() => {
    jest.spyOn(CardAnalytics, 'useCardAnalytics').mockReturnValue({ track: jest.fn() });
    jest.spyOn(CardCompliance, 'useCardCompliance').mockReturnValue({ log: jest.fn() });
  });

  it('renders undo and redo buttons with ARIA labels', () => {
    render(<CardUndoRedo />);
    expect(screen.getByLabelText('Undo')).toBeInTheDocument();
    expect(screen.getByLabelText('Redo')).toBeInTheDocument();
  });
  it('calls onUndo and onRedo on button click', () => {
    const onUndo = jest.fn();
    const onRedo = jest.fn();
    render(<CardUndoRedo onUndo={onUndo} onRedo={onRedo} />);
    fireEvent.click(screen.getByLabelText('Undo'));
    fireEvent.click(screen.getByLabelText('Redo'));
    expect(onUndo).toHaveBeenCalled();
    expect(onRedo).toHaveBeenCalled();
  });
  it('calls analytics and compliance hooks on undo/redo', () => {
    const log = jest.fn();
    const track = jest.fn();
    jest.spyOn(CardCompliance, 'useCardCompliance').mockReturnValue({ log });
    jest.spyOn(CardAnalytics, 'useCardAnalytics').mockReturnValue({ track });
    render(<CardUndoRedo />);
    fireEvent.click(screen.getByLabelText('Undo'));
    fireEvent.click(screen.getByLabelText('Redo'));
    expect(log).toHaveBeenCalled();
    expect(track).toHaveBeenCalled();
  });
  it('handles keyboard shortcuts for undo/redo', () => {
    const onUndo = jest.fn();
    const onRedo = jest.fn();
    render(<CardUndoRedo onUndo={onUndo} onRedo={onRedo} />);
    fireEvent.keyDown(window, { metaKey: true, key: 'z' });
    fireEvent.keyDown(window, { ctrlKey: true, key: 'z' });
    fireEvent.keyDown(window, { metaKey: true, key: 'z', shiftKey: true });
    fireEvent.keyDown(window, { ctrlKey: true, key: 'z', shiftKey: true });
    expect(onUndo).toHaveBeenCalled();
    expect(onRedo).toHaveBeenCalled();
  });
}); 