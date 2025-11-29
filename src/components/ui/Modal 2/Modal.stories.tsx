import type { Meta, StoryObj } from '@storybook/react';
import { Modal } from './Modal';
import { useState } from 'react';

const meta = {
  title: 'UI/Modal',
  component: Modal,
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
            id: 'dialog',
            enabled: true,
          },
        ],
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Controls modal visibility',
    },
    onClose: {
      action: 'closed',
      description: 'Callback when modal is closed',
    },
    header: {
      control: 'text',
      description: 'Header content',
    },
    footer: {
      control: 'text',
      description: 'Footer content',
    },
    children: {
      control: 'text',
      description: 'Modal content',
    },
    theme: {
      control: 'select',
      description: 'Theme of the modal',
      options: ['light', 'dark', 'solana', 'tradingview', 'apple', 'canva'],
    },
  },
  decorators: [
    (Story: any) => (
      <div style={{ minHeight: '100vh', width: '100vw' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof Modal>;

// Basic modal
export const Basic: Story = {
  args: {
    open: true,
    onClose: () => { },
    children: 'Basic Modal Content',
  },
};

// With header and footer
export const WithHeaderFooter: Story = {
  args: {
    open: true,
    onClose: () => { },
    header: <div>Modal Header</div>,
    children: 'Modal Content',
    footer: <div>Modal Footer</div>,
  },
};

// Interactive example with state
const InteractiveTemplate: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Open Modal</button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          header={<h2>Interactive Modal</h2>}
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setOpen(false)}>Cancel</button>
              <button onClick={() => setOpen(false)}>Save</button>
            </div>
          }
        >
          <p>This is an interactive modal with working open/close state.</p>
          <p>Try using the escape key or clicking outside to close it.</p>
        </Modal>
      </>
    );
  },
};

export const Interactive = {
  ...InteractiveTemplate,
};

// Complex content
export const ComplexContent: Story = {
  args: {
    open: true,
    onClose: () => { },
    header: (
      <div style={{ padding: '16px', borderBottom: '1px solid #E5E7EB' }}>
        <h2 style={{ margin: 0 }}>Complex Modal</h2>
        <p style={{ margin: '8px 0 0' }}>With detailed content</p>
      </div>
    ),
    children: (
      <div style={{ padding: '16px' }}>
        <form>
          <div style={{ marginBottom: '16px' }}>
            <label>
              Name:
              <input type="text" style={{ display: 'block', width: '100%', marginTop: '4px' }} />
            </label>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label>
              Description:
              <textarea style={{ display: 'block', width: '100%', marginTop: '4px' }} />
            </label>
          </div>
        </form>
      </div>
    ),
    footer: (
      <div style={{ padding: '16px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button>Cancel</button>
        <button>Save Changes</button>
      </div>
    ),
  },
};

// Trading view style
export const TradingViewStyle: Story = {
  args: {
    open: true,
    onClose: () => { },
    children: 'Trading Modal Content',
    style: {
      background: '#131722',
      color: '#D1D4DC',
    },
  },
};

// Solana style
export const SolanaStyle: Story = {
  args: {
    open: true,
    onClose: () => { },
    children: 'Solana Modal Content',
    style: {
      background: 'linear-gradient(135deg, #000000, #1E1E1E)',
      color: '#00FFA3',
    },
  },
};

// Theme variants
export const LightTheme: Story = { args: { open: true, onClose: () => { }, children: 'Light Theme', theme: 'light' } };
export const DarkTheme: Story = { args: { open: true, onClose: () => { }, children: 'Dark Theme', theme: 'dark' } };
export const SolanaTheme: Story = { args: { open: true, onClose: () => { }, children: 'Solana Theme', theme: 'solana' } };
export const TradingViewTheme: Story = { args: { open: true, onClose: () => { }, children: 'TradingView Theme', theme: 'tradingview' } };
export const AppleTheme: Story = { args: { open: true, onClose: () => { }, children: 'Apple Theme', theme: 'apple' } };
export const CanvaTheme: Story = { args: { open: true, onClose: () => { }, children: 'Canva Theme', theme: 'canva' } };

// All themes and variants
export const AllThemes: Story = {
  render: () => (
    <>
      {['light', 'dark', 'solana', 'tradingview', 'apple', 'canva'].map(theme => (
        <Modal key={theme} open={true} onClose={() => { }} theme={theme as any}>
          {theme} Modal
        </Modal>
      ))}
    </>
  ),
}; 