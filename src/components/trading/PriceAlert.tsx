'use client';

import React, { useState } from 'react';
import { motion } from '@/lib/motion';
import { BellIcon, BellSlashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface PriceAlertProps {
  symbol: string;
  currentPrice: number;
  onCreateAlert?: (alert: PriceAlertConfig) => void;
}

interface PriceAlertConfig {
  symbol: string;
  type: 'above' | 'below';
  price: number;
  notifyVia: ('email' | 'push' | 'sms')[];
  repeat: 'once' | 'always';
}

const PriceAlert: React.FC<PriceAlertProps> = ({
  symbol,
  currentPrice,
  onCreateAlert,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [alertType, setAlertType] = useState<'above' | 'below'>('above');
  const [alertPrice, setAlertPrice] = useState(alertType === 'above' ?
    (currentPrice * 1.05).toFixed(2) :
    (currentPrice * 0.95).toFixed(2)
  );
  const [notifyVia, setNotifyVia] = useState<('email' | 'push' | 'sms')[]>(['push']);
  const [repeat, setRepeat] = useState<'once' | 'always'>('once');
  const [created, setCreated] = useState(false);

  const handleToggleForm = () => {
    setShowForm(!showForm);
    // Reset created state when opening the form
    if (!showForm) setCreated(false);
  };

  const handleTypeChange = (type: 'above' | 'below') => {
    setAlertType(type);
    // Update default price based on selected type
    setAlertPrice(type === 'above' ?
      (currentPrice * 1.05).toFixed(2) :
      (currentPrice * 0.95).toFixed(2)
    );
  };

  const handleNotifyViaToggle = (option: 'email' | 'push' | 'sms') => {
    setNotifyVia(prev =>
      prev.includes(option)
        ? prev.filter(o => o !== option)
        : [...prev, option]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const alert: PriceAlertConfig = {
      symbol,
      type: alertType,
      price: parseFloat(alertPrice),
      notifyVia,
      repeat,
    };

    if (onCreateAlert) {
      onCreateAlert(alert);
    }

    setCreated(true);
    setTimeout(() => {
      setShowForm(false);
    }, 2000);
  };

  return (
    <div className="p-4 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-medium">Price Alerts</h3>
        <Button
          variant={showForm ? "secondary" : "primary"}
          size="sm"
          onClick={handleToggleForm}
          aria-expanded={showForm}
        >
          {showForm ? (
            <BellSlashIcon className="w-4 h-4 mr-1" />
          ) : (
            <BellIcon className="w-4 h-4 mr-1" />
          )}
          {showForm ? "Cancel" : "Create Alert"}
        </Button>
      </div>

      {/* Alert form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-4"
        >
          {created ? (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg p-3 flex items-center text-green-800 dark:text-green-300">
              <CheckIcon className="w-5 h-5 mr-2" />
              Alert created successfully!
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                  Alert me when {symbol} price is:
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={alertType === 'above' ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => handleTypeChange('above')}
                    className="flex-1"
                  >
                    Above
                  </Button>
                  <Button
                    type="button"
                    variant={alertType === 'below' ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => handleTypeChange('below')}
                    className="flex-1"
                  >
                    Below
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300 mb-1 block">
                  Price:
                </label>
                <Input
                  type="number"
                  value={alertPrice}
                  onChange={(e) => setAlertPrice(e.target.value)}
                  min="0"
                  step="0.01"
                  required
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Current price: ${currentPrice.toFixed(2)}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300 mb-1 block">
                  Notify me via:
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={notifyVia.includes('push') ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => handleNotifyViaToggle('push')}
                  >
                    Push
                  </Button>
                  <Button
                    type="button"
                    variant={notifyVia.includes('email') ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => handleNotifyViaToggle('email')}
                  >
                    Email
                  </Button>
                  <Button
                    type="button"
                    variant={notifyVia.includes('sms') ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => handleNotifyViaToggle('sms')}
                  >
                    SMS
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300 mb-1 block">
                  Repeat:
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={repeat === 'once' ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setRepeat('once')}
                    className="flex-1"
                  >
                    Once
                  </Button>
                  <Button
                    type="button"
                    variant={repeat === 'always' ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setRepeat('always')}
                    className="flex-1"
                  >
                    Always
                  </Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" variant="primary">
                  Create Alert
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      )}

      {/* Existing alerts (placeholder) */}
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
        No active price alerts for {symbol}
      </div>
    </div>
  );
};

export default PriceAlert; 