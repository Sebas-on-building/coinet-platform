import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip } from './Tooltip';

const meta = {
  title: 'UI/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
    design: {
      type: 'figma',
      url: 'YOUR_FIGMA_URL_HERE',
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'tooltip',
            enabled: true,
          },
        ],
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    content: {
      control: 'text',
      description: 'Tooltip content',
    },
    placement: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
      description: 'Tooltip placement',
      table: {
        defaultValue: { summary: 'top' },
      },
    },
    delay: {
      control: 'number',
      description: 'Delay before showing tooltip (ms)',
      table: {
        defaultValue: { summary: 100 },
      },
    },
    children: {
      control: 'text',
      description: 'Element to show tooltip on',
    },
    theme: {
      control: 'select',
      options: ['light', 'dark', 'solana', 'tradingview', 'apple', 'canva'],
      description: 'Tooltip theme',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof Tooltip>;

// Basic tooltip
export const Basic: Story = {
  args: {
    content: 'Basic Tooltip',
    children: <button>Hover me</button>,
  },
};

// All placements
export const TopPlacement: Story = {
  args: {
    content: 'Top Tooltip',
    placement: 'top',
    children: <button>Top</button>,
  },
};

export const BottomPlacement: Story = {
  args: {
    content: 'Bottom Tooltip',
    placement: 'bottom',
    children: <button>Bottom</button>,
  },
};

export const LeftPlacement: Story = {
  args: {
    content: 'Left Tooltip',
    placement: 'left',
    children: <button>Left</button>,
  },
};

export const RightPlacement: Story = {
  args: {
    content: 'Right Tooltip',
    placement: 'right',
    children: <button>Right</button>,
  },
};

// With delay
export const WithDelay: Story = {
  args: {
    content: 'Delayed Tooltip',
    delay: 1000,
    children: <button>Hover (1s delay)</button>,
  },
};

// Rich content
export const RichContent: Story = {
  args: {
    content: (
      <div>
        <h4 style={{ margin: '0 0 4px' }}>Rich Tooltip</h4>
        <p style={{ margin: 0 }}>With multiple lines</p>
      </div>
    ),
    children: <button>Rich Content</button>,
  },
};

// Long content
export const LongContent: Story = {
  args: {
    content: 'This is a very long tooltip content that demonstrates how the tooltip handles text wrapping and positioning with longer content.',
    children: <button>Long Content</button>,
  },
};

// Trading view style
export const TradingViewStyle: Story = {
  args: {
    content: 'Trading View Tooltip',
    children: <button>Trading Style</button>,
    style: {
      background: '#131722',
      color: '#D1D4DC',
      border: '1px solid #2A2E39',
    },
  },
};

// Solana style
export const SolanaStyle: Story = {
  args: {
    content: 'Solana Tooltip',
    children: <button>Solana Style</button>,
    style: {
      background: 'linear-gradient(135deg, #000000, #1E1E1E)',
      color: '#00FFA3',
      border: '1px solid #333333',
    },
  },
};

// Theme variants
export const LightTheme: Story = { args: { content: 'Light Theme', children: <button>Light</button>, theme: 'light' } };
export const DarkTheme: Story = { args: { content: 'Dark Theme', children: <button>Dark</button>, theme: 'dark' } };
export const SolanaTheme: Story = { args: { content: 'Solana Theme', children: <button>Solana</button>, theme: 'solana' } };
export const TradingViewTheme: Story = { args: { content: 'TradingView Theme', children: <button>TradingView</button>, theme: 'tradingview' } };
export const AppleTheme: Story = { args: { content: 'Apple Theme', children: <button>Apple</button>, theme: 'apple' } };
export const CanvaTheme: Story = { args: { content: 'Canva Theme', children: <button>Canva</button>, theme: 'canva' } };

// All themes and placements
export const AllThemesAndPlacements: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>
      {['light', 'dark', 'solana', 'tradingview', 'apple', 'canva'].map(theme =>
        ['top', 'bottom', 'left', 'right'].map(placement => (
          <Tooltip key={theme + placement} content={`${theme} ${placement}`} placement={placement as any} theme={theme as any}>
            <button>{theme} {placement}</button>
          </Tooltip>
        ))
      )}
    </div>
  ),
}; 