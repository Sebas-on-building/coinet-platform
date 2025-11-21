import { PortfolioManagementStatus } from './PortfolioManagementStatus';
import { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Portfolio-management/PortfolioManagement/PortfolioManagementStatus',
  component: PortfolioManagementStatus,
  tags: ['autodocs'],
} satisfies Meta<typeof PortfolioManagementStatus>;

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
