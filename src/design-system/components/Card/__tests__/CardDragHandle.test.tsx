import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CardDragHandle } from '../CardDragHandle';

describe('CardDragHandle', () => {
  it('renders and has ARIA label', () => {
    render(<CardDragHandle />);
    expect(screen.getByLabelText('Drag card')).toBeInTheDocument();
  });
  it('applies className and style', () => {
    render(<CardDragHandle className="test-class" style={{ color: 'red' }} />);
    const handle = screen.getByLabelText('Drag card');
    expect(handle).toHaveClass('test-class');
    expect(handle).toHaveStyle('color: red');
  });
  it('renders SVG icon', () => {
    render(<CardDragHandle />);
    expect(screen.getByLabelText('Drag card').querySelector('svg')).toBeInTheDocument();
  });
  it('calls onDragStart and onDragEnd (pointer)', () => {
    const onDragStart = jest.fn();
    const onDragEnd = jest.fn();
    render(<CardDragHandle onDragStart={onDragStart} onDragEnd={onDragEnd} />);
    const handle = screen.getByLabelText('Drag card');
    fireEvent.dragStart(handle);
    fireEvent.dragEnd(handle);
    expect(onDragStart).toHaveBeenCalled();
    expect(onDragEnd).toHaveBeenCalled();
  });
  it('calls onDragStart and onDragEnd (keyboard)', () => {
    const onDragStart = jest.fn();
    const onDragEnd = jest.fn();
    render(<CardDragHandle onDragStart={onDragStart} onDragEnd={onDragEnd} />);
    const handle = screen.getByLabelText('Drag card');
    fireEvent.keyDown(handle, { key: ' ' });
    fireEvent.keyUp(handle, { key: ' ' });
    expect(onDragStart).toHaveBeenCalled();
    expect(onDragEnd).toHaveBeenCalled();
  });
}); 