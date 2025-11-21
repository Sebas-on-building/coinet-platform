import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta = {
  title: 'UI/Card',
  component: Card,
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
            id: 'region',
            enabled: true,
          },
        ],
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    elevation: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Shadow elevation of the card',
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    header: {
      control: 'text',
      description: 'Header content',
    },
    footer: {
      control: 'text',
      description: 'Footer content',
    },
    sectioned: {
      control: 'boolean',
      description: 'Whether to apply section padding',
    },
    children: {
      control: 'text',
      description: 'Card content',
    },
    theme: {
      control: 'select',
      options: ['light', 'dark', 'solana', 'tradingview', 'apple', 'canva'],
      description: 'Theme of the card',
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof Card>;

// Basic card
export const Basic: Story = {
  args: {
    children: 'Basic Card Content',
  },
};

// With header and footer
export const WithHeaderFooter: Story = {
  args: {
    header: <div>Card Header</div>,
    children: 'Card Content',
    footer: <div>Card Footer</div>,
  },
};

// Elevations
export const SmallElevation: Story = {
  args: {
    children: 'Small Elevation',
    elevation: 'sm',
  },
};

export const LargeElevation: Story = {
  args: {
    children: 'Large Elevation',
    elevation: 'lg',
  },
};

// Sectioned
export const Sectioned: Story = {
  args: {
    children: 'Sectioned Content',
    sectioned: true,
  },
};

// Complex content
export const ComplexContent: Story = {
  args: {
    header: (
      <div style={{ padding: '16px', borderBottom: '1px solid #E5E7EB' }}>
        <h3 style={{ margin: 0 }}>Complex Header</h3>
        <p style={{ margin: '8px 0 0' }}>With subtitle</p>
      </div>
    ),
    children: (
      <div style={{ padding: '16px' }}>
        <p>This is a card with complex content including:</p>
        <ul>
          <li>Multiple paragraphs</li>
          <li>Lists</li>
          <li>And other elements</li>
        </ul>
      </div>
    ),
    footer: (
      <div style={{ padding: '16px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button>Cancel</button>
        <button>Save</button>
      </div>
    ),
  },
};

// Interactive card
export const Interactive: Story = {
  args: {
    children: 'Interactive Card',
    onClick: () => console.log('Card clicked'),
    style: { cursor: 'pointer' },
  },
  parameters: {
    docs: {
      description: {
        story: 'This card is interactive. Try hovering and clicking it.',
      },
    },
  },
};

// Long content
export const LongContent: Story = {
  args: {
    children: `
      This is a very long content that demonstrates how the card handles overflow.
      It should scroll gracefully when the content exceeds the card's height.
      Lorem ipsum dolor sit amet, consectetur adipiscing elit.
      Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
      Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
    `.repeat(3),
    style: { maxHeight: '400px', overflow: 'auto' },
  },
};

// Trading view style
export const TradingViewStyle: Story = {
  args: {
    children: 'Trading Card Content',
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
    children: 'Solana Card Content',
    style: {
      background: 'linear-gradient(135deg, #000000, #1E1E1E)',
      color: '#00FFA3',
      border: '1px solid #333333',
    },
  },
};

// Theme variants
export const LightTheme: Story = { args: { children: 'Light Theme', theme: 'light' } };
export const DarkTheme: Story = { args: { children: 'Dark Theme', theme: 'dark' } };
export const SolanaTheme: Story = { args: { children: 'Solana Theme', theme: 'solana' } };
export const TradingViewTheme: Story = { args: { children: 'TradingView Theme', theme: 'tradingview' } };
export const AppleTheme: Story = { args: { children: 'Apple Theme', theme: 'apple' } };
export const CanvaTheme: Story = { args: { children: 'Canva Theme', theme: 'canva' } };

// All themes, variants, and states
export const AllThemesAndStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {['light', 'dark', 'solana', 'tradingview', 'apple', 'canva'].map(theme =>
        ['sm', 'md', 'lg'].map(elevation => (
          <Card key={theme + elevation} theme={theme} elevation={elevation as any} style={{ minWidth: 200, margin: 4 }}>
            {theme} {elevation}
          </Card>
        ))
      )}
    </div>
  ),
}; 