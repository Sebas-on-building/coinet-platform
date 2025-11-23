import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CardResizable } from '../CardResizable';

describe('CardResizable', () => {
  it('renders children and has ARIA label', () => {
    render(<CardResizable><div>Resizable Content</div></CardResizable>);
    expect(screen.getByText('Resizable Content')).toBeInTheDocument();
    expect(screen.getByLabelText('Resize card')).toBeInTheDocument();
  });
  it('applies className and style', () => {
    render(<CardResizable className="test-class" style={{ background: 'pink' }}><div>Styled</div></CardResizable>);
    const resizable = screen.getByLabelText('Resize card');
    expect(resizable).toHaveClass('test-class');
    expect(resizable).toHaveStyle('background: pink');
  });
  it('calls onResize on keyboard resize', () => {
    const onResize = jest.fn();
    render(<CardResizable onResize={onResize}><div>Resize</div></CardResizable>);
    const resizable = screen.getByLabelText('Resize card');
    fireEvent.keyDown(resizable, { key: 'ArrowRight' });
    expect(onResize).toHaveBeenCalled();
  });
  it('calls onResize on mouse resize', () => {
    const onResize = jest.fn();
    render(<CardResizable onResize={onResize}><div>Resize</div></CardResizable>);
    const handle = screen.getByLabelText('Resize handle');
    fireEvent.mouseDown(handle, { clientX: 0, clientY: 0 });
    // Simulate mousemove event
    fireEvent.mouseMove(window, { clientX: 50, clientY: 50 });
    fireEvent.mouseUp(window);
    expect(onResize).toHaveBeenCalled();
  });
}); 