import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta = {
  title: 'UI/Button',
  component: Button,
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
            id: 'button-name',
            enabled: true,
          },
        ],
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'accent', 'ghost', 'outline'],
      description: 'Visual style variant of the button',
      table: {
        defaultValue: { summary: 'primary' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size variant of the button',
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    loading: {
      control: 'boolean',
      description: 'Shows a loading spinner',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the button',
    },
    pill: {
      control: 'boolean',
      description: 'Applies pill-shaped border radius',
    },
    icon: {
      control: 'text',
      description: 'Icon element to show before text',
    },
    iconRight: {
      control: 'text',
      description: 'Icon element to show after text',
    },
    children: {
      control: 'text',
      description: 'Button content',
    },
    theme: {
      control: 'select',
      options: ['light', 'dark', 'solana', 'tradingview', 'apple', 'canva'],
      description: 'Theme variant of the button',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof Button>;

// Primary variant
export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

// Secondary variant
export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

// Accent variant
export const Accent: Story = {
  args: {
    children: 'Accent Button',
    variant: 'accent',
  },
};

// Ghost variant
export const Ghost: Story = {
  args: {
    children: 'Ghost Button',
    variant: 'ghost',
  },
};

// Outline variant
export const Outline: Story = {
  args: {
    children: 'Outline Button',
    variant: 'outline',
  },
};

// Sizes
export const Small: Story = {
  args: {
    children: 'Small Button',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    children: 'Large Button',
    size: 'lg',
  },
};

// States
export const Loading: Story = {
  args: {
    children: 'Loading Button',
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
  },
};

// With icons
export const WithLeftIcon: Story = {
  args: {
    children: 'Icon Button',
    icon: <span>👈</span>,
  },
};

export const WithRightIcon: Story = {
  args: {
    children: 'Icon Button',
    iconRight: <span>👉</span>,
  },
};

export const IconOnly: Story = {
  args: {
    icon: <span>🚀</span>,
    'aria-label': 'Launch',
  },
};

// Pill shape
export const PillShape: Story = {
  args: {
    children: 'Pill Button',
    pill: true,
  },
};

// Long text
export const LongText: Story = {
  args: {
    children: 'This is a very long button text that should wrap gracefully',
  },
};

// Interactive example
export const Interactive: Story = {
  args: {
    children: 'Interactive Button',
  },
  parameters: {
    docs: {
      description: {
        story: 'Try hovering, focusing, and clicking this button to see all interactive states.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    // Add interaction test here if needed
  },
};

// Theme variants
export const LightTheme: Story = { args: { children: 'Light Theme', theme: 'light' } };
export const DarkTheme: Story = { args: { children: 'Dark Theme', theme: 'dark' } };
export const SolanaTheme: Story = { args: { children: 'Solana Theme', theme: 'solana' } };
export const TradingViewTheme: Story = { args: { children: 'TradingView Theme', theme: 'tradingview' } };
export const AppleTheme: Story = { args: { children: 'Apple Theme', theme: 'apple' } };
export const CanvaTheme: Story = { args: { children: 'Canva Theme', theme: 'canva' } };

// All variants in all themes
export const AllThemesAndVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {['light', 'dark', 'solana', 'tradingview', 'apple', 'canva'].map(theme =>
        ['primary', 'secondary', 'accent', 'ghost', 'outline'].map(variant => (
          <Button key={theme + variant} theme={theme} variant={variant as any} style={{ margin: 4 }}>
            {theme} {variant}
          </Button>
        ))
      )}
    </div>
  ),
}; 