import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CardContextMenu } from '../CardContextMenu';

describe('CardContextMenu', () => {
  const items = [
    { label: 'Edit', onClick: jest.fn() },
    { label: 'Delete', danger: true, onClick: jest.fn() },
  ];

  it('renders children and has ARIA label', () => {
    render(<CardContextMenu items={items}><div>Menu Child</div></CardContextMenu>);
    expect(screen.getByText('Menu Child')).toBeInTheDocument();
    expect(screen.getByLabelText('Card context menu')).toBeInTheDocument();
  });
  it('opens menu on right-click and calls onAction', () => {
    const onAction = jest.fn();
    render(<CardContextMenu items={items} onAction={onAction}><div>Right Click Me</div></CardContextMenu>);
    const wrapper = screen.getByLabelText('Card context menu');
    fireEvent.contextMenu(wrapper);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Edit'));
    expect(onAction).toHaveBeenCalledWith(items[0]);
  });
  it('opens menu with keyboard (ContextMenu key)', () => {
    render(<CardContextMenu items={items}><div>Keyboard Menu</div></CardContextMenu>);
    const wrapper = screen.getByLabelText('Card context menu');
    fireEvent.keyDown(wrapper, { key: 'ContextMenu' });
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
  it('menu items have correct ARIA and danger style', () => {
    render(<CardContextMenu items={items}><div>Menu</div></CardContextMenu>);
    fireEvent.contextMenu(screen.getByLabelText('Card context menu'));
    expect(screen.getByText('Delete')).toHaveClass('text-red-600');
    expect(screen.getByText('Edit')).toHaveAttribute('role', 'menuitem');
  });
}); 