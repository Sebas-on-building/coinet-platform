import { ClientWebStatus } from './ClientWebStatus';
import { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Client-web/ClientWeb/ClientWebStatus',
  component: ClientWebStatus,
  tags: ['autodocs'],
} satisfies Meta<typeof ClientWebStatus>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Active: Story = {
  args: {
    status: "active",
  },
};

export const Inactive: Story = {
  args: {
    status: "inactive",
  },
};
