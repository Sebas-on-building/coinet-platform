import { useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);

    // Add toast to the array
    setToasts(prev => [...prev, { id, message, type, duration }]);

    // Remove toast after duration
    if (duration !== Infinity) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // For this implementation, we're just logging the toast to the console
  // In a real app, you would render a toast component with this data
  // or use a toast library
  const renderToasts = useCallback(() => {
    toasts.forEach(toast => {
      const style = `color: white; padding: 4px 8px; border-radius: 4px; background-color: ${toast.type === 'success' ? '#10b981' :
          toast.type === 'error' ? '#ef4444' :
            toast.type === 'warning' ? '#f59e0b' :
              '#3b82f6'
        }`;

      console.log(`%c${toast.type.toUpperCase()}: ${toast.message}`, style);
    });

    return null;
  }, [toasts]);

  return { showToast, removeToast, toasts, renderToasts };
} 