import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { motion } from '@/lib/motion';
import {
  CheckIcon,
  ExclamationCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

// Types
interface OrderFormProps {
  orderType: string;
  side: 'buy' | 'sell';
  market: { base: string; quote: string };
  lastPrice: number;
  portfolio: {
    [key: string]: { available: number; locked: number; };
  };
}

interface OrderValues {
  price: number;
  amount: number;
  total: number;
  stopPrice?: number;
  limitPrice?: number;
}

// Percentage options for quick selection
const percentageOptions = [25, 50, 75, 100];

const OrderForm: React.FC<OrderFormProps> = ({
  orderType,
  side,
  market,
  lastPrice,
  portfolio,
}) => {
  // Get available balance of base and quote currencies
  const baseBalance = portfolio[market.base]?.available || 0;
  const quoteBalance = portfolio[market.quote]?.available || 0;

  // Form state
  const { register, handleSubmit, setValue, watch, control, formState: { errors, isSubmitting } } = useForm<OrderValues>({
    defaultValues: {
      price: lastPrice,
      amount: 0,
      total: 0,
      stopPrice: lastPrice * (side === 'buy' ? 1.01 : 0.99), // Default 1% above/below
      limitPrice: lastPrice,
    },
  });

  // Watch form values for calculations
  const price = watch('price');
  const amount = watch('amount');
  const total = watch('total');
  const stopPrice = watch('stopPrice');
  const limitPrice = watch('limitPrice');

  // Calculate max amount user can trade based on available balance
  const maxTradeAmount = useMemo(() => {
    if (side === 'buy') {
      // For buy orders, max is based on quote balance (e.g., USDT)
      return price > 0 ? quoteBalance / price : 0;
    } else {
      // For sell orders, max is simply the available base currency (e.g., BTC)
      return baseBalance;
    }
  }, [side, price, baseBalance, quoteBalance]);

  // Order form validation
  const validateOrder = (): string | null => {
    if (amount <= 0) return 'Amount must be greater than 0';
    if (price <= 0) return 'Price must be greater than 0';

    // Check balance
    if (side === 'buy' && total > quoteBalance) {
      return `Insufficient ${market.quote} balance`;
    }
    if (side === 'sell' && amount > baseBalance) {
      return `Insufficient ${market.base} balance`;
    }

    // Additional validation for stop and limit orders
    if (orderType === 'stop' && !stopPrice) {
      return 'Stop price is required';
    }
    if (orderType === 'limit' && !price) {
      return 'Limit price is required';
    }

    return null;
  };

  // Update total when price or amount changes
  useEffect(() => {
    const calculatedTotal = price * amount;
    setValue('total', calculatedTotal);
  }, [price, amount, setValue]);

  // Update amount when total or price changes
  const updateAmountFromTotal = (newTotal: number) => {
    if (price > 0) {
      setValue('amount', newTotal / price);
    }
  };

  // Handle selecting a percentage of max amount
  const handlePercentageSelect = (percentage: number) => {
    if (maxTradeAmount > 0) {
      const newAmount = (maxTradeAmount * percentage) / 100;
      setValue('amount', newAmount);
      setValue('total', newAmount * price);
    }
  };

  // Handle form submission
  const onSubmit = async (data: OrderValues) => {
    const error = validateOrder();
    if (error) {
      // Display error notification
      return;
    }

    try {
      // This would be your API call
      console.log('Submitting order:', { ...data, side, orderType, market });

      // Mock success for demo
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Reset form
      setValue('amount', 0);
      setValue('total', 0);

      // Show success notification (would be handled by a notification system)
    } catch (error) {
      // Show error notification
    }
  };

  // Determine button color and text based on side
  const buttonProps = {
    buy: {
      color: 'bg-green-500 hover:bg-green-600 active:bg-green-700',
      text: 'Buy',
    },
    sell: {
      color: 'bg-red-500 hover:bg-red-600 active:bg-red-700',
      text: 'Sell',
    },
  }[side];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Market notice for market orders */}
      {orderType === 'market' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-2 flex items-start">
          <InformationCircleIcon className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Market orders execute immediately at the best available price.
          </p>
        </div>
      )}

      {/* Price input (hidden for market orders) */}
      {orderType !== 'market' && (
        <div>
          <label htmlFor="price" className="flex justify-between mb-1 text-sm text-gray-600 dark:text-gray-300">
            Price
            <span className="text-gray-500 dark:text-gray-400">
              {market.quote}
            </span>
          </label>
          <Input
            id="price"
            type="number"
            step="any"
            min="0"
            placeholder={`Price in ${market.quote}`}
            className={errors.price ? 'border-red-500' : ''}
            {...register('price', { required: true, min: 0 })}
          />
          {errors.price && (
            <p className="text-red-500 text-xs mt-1">Valid price is required</p>
          )}
        </div>
      )}

      {/* Stop price (for stop orders) */}
      {orderType === 'stop' && (
        <div>
          <label htmlFor="stopPrice" className="flex justify-between mb-1 text-sm text-gray-600 dark:text-gray-300">
            Stop Price
            <span className="text-gray-500 dark:text-gray-400">
              {market.quote}
            </span>
          </label>
          <Input
            id="stopPrice"
            type="number"
            step="any"
            min="0"
            placeholder={`Trigger price in ${market.quote}`}
            className={errors.stopPrice ? 'border-red-500' : ''}
            {...register('stopPrice', { required: true, min: 0 })}
          />
          {errors.stopPrice && (
            <p className="text-red-500 text-xs mt-1">Valid stop price is required</p>
          )}
        </div>
      )}

      {/* Amount input */}
      <div>
        <label htmlFor="amount" className="flex justify-between mb-1 text-sm text-gray-600 dark:text-gray-300">
          Amount
          <span className="flex items-center text-gray-500 dark:text-gray-400">
            <span>Available: {baseBalance.toFixed(6)} {market.base}</span>
          </span>
        </label>
        <Input
          id="amount"
          type="number"
          step="any"
          min="0"
          placeholder={`Amount in ${market.base}`}
          className={errors.amount ? 'border-red-500' : ''}
          {...register('amount', { required: true, min: 0 })}
        />
        {errors.amount && (
          <p className="text-red-500 text-xs mt-1">Valid amount is required</p>
        )}

        {/* Percentage selector */}
        <div className="flex gap-1 mt-2">
          {percentageOptions.map((percentage) => (
            <button
              key={percentage}
              type="button"
              onClick={() => handlePercentageSelect(percentage)}
              className="flex-1 py-1 text-xs font-medium rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {percentage}%
            </button>
          ))}
        </div>
      </div>

      {/* Total input */}
      <div>
        <label htmlFor="total" className="flex justify-between mb-1 text-sm text-gray-600 dark:text-gray-300">
          Total
          <span className="flex items-center text-gray-500 dark:text-gray-400">
            <span>Available: {quoteBalance.toFixed(2)} {market.quote}</span>
          </span>
        </label>
        <Input
          id="total"
          type="number"
          step="any"
          min="0"
          placeholder={`Total in ${market.quote}`}
          className={errors.total ? 'border-red-500' : ''}
          value={total}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const newTotal = parseFloat(e.target.value);
            setValue('total', newTotal);
            updateAmountFromTotal(newTotal);
          }}
        />
      </div>

      {/* Order summary and fees */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Order Type:</span>
          <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">{orderType}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Side:</span>
          <span className={`font-medium capitalize ${side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
            {side}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Fee:</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            0.1% ({(total * 0.001).toFixed(6)} {market.quote})
          </span>
        </div>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-3 rounded-lg ${side === 'buy' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white font-medium flex items-center justify-center gap-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${side === 'buy' ? 'focus:ring-green-500' : 'focus:ring-red-500'}`}
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </>
        ) : (
          <>
            {side === 'buy' ? 'Buy' : 'Sell'} {market.base}
          </>
        )}
      </button>

      {/* Order error message */}
      {validateOrder() && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 flex items-start text-red-700 dark:text-red-300 text-xs">
          <ExclamationCircleIcon className="w-4 h-4 mr-1 text-red-500" />
          {validateOrder()}
        </div>
      )}
    </form>
  );
};

export default OrderForm; 