import React from 'react';
import { Button, ButtonProps } from './Button';
import { Meta, StoryObj } from '@storybook/react';

const meta: Meta<ButtonProps> = {
  title: 'Atoms/Button',
  component: Button,
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'danger', 'ghost', 'link'] },
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    fullWidth: { control: 'boolean' },
    isLoading: { control: 'boolean' },
    leftIcon: { control: false },
    rightIcon: { control: false },
    children: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component: 'Pixel-perfect, atomic Button inspired by Apple, Canva, TradingView, Solana. Accessible, themeable, extensible.'
      }
    },
    a11y: { element: '#root' },
    design: [
      { type: 'figma', url: 'https://www.figma.com/file/xyz/Button-Design' },
      { type: 'link', url: 'https://developer.apple.com/design/human-interface-guidelines/buttons' },
      { type: 'link', url: 'https://www.canva.com/colors/color-palettes/' },
      { type: 'link', url: 'https://www.tradingview.com/chart/' },
      { type: 'link', url: 'https://solana.com/' }
    ]
  }
};
export default meta;

type Story = StoryObj<ButtonProps>;

export const Primary: Story = {
  args: { children: 'Trade Now', variant: 'primary', size: 'md' }
};
export const Secondary: Story = {
  args: { children: 'Learn More', variant: 'secondary', size: 'md' }
};
export const Danger: Story = {
  args: { children: 'Delete', variant: 'danger', size: 'md' }
};
export const Ghost: Story = {
  args: { children: 'Ghost', variant: 'ghost', size: 'md' }
};
export const Link: Story = {
  args: { children: 'Link', variant: 'link', size: 'md' }
}; 