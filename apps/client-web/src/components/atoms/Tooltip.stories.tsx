import React from 'react';
import { Tooltip, TooltipProps } from './Tooltip';
import { Meta, StoryObj } from '@storybook/react';

const meta: Meta<TooltipProps> = {
  title: 'Atoms/Tooltip',
  component: Tooltip,
  argTypes: {
    content: { control: 'text' },
    placement: { control: 'select', options: ['top', 'bottom', 'left', 'right'] },
    children: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component: 'Pixel-perfect, atomic Tooltip inspired by Apple, Canva, TradingView, Solana. Accessible, themeable, extensible.'
      }
    },
    a11y: { element: '#root' },
    design: [
      { type: 'figma', url: 'https://www.figma.com/file/xyz/Tooltip-Design' },
      { type: 'link', url: 'https://developer.apple.com/design/human-interface-guidelines/tooltips' },
      { type: 'link', url: 'https://www.canva.com/colors/color-palettes/' },
      { type: 'link', url: 'https://www.tradingview.com/chart/' },
      { type: 'link', url: 'https://solana.com/' }
    ]
  }
};
export default meta;

type Story = StoryObj<TooltipProps>;

export const Top: Story = {
  args: { content: 'Tooltip on top', placement: 'top', children: 'Hover me' }
};
export const Bottom: Story = {
  args: { content: 'Tooltip on bottom', placement: 'bottom', children: 'Hover me' }
};
export const Left: Story = {
  args: { content: 'Tooltip on left', placement: 'left', children: 'Hover me' }
};
export const Right: Story = {
  args: { content: 'Tooltip on right', placement: 'right', children: 'Hover me' }
}; 