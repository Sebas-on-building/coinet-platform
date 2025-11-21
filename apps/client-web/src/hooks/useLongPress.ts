import { useCallback, useRef } from 'react';

interface LongPressOptions {
  onLongPress: (event: TouchEvent | MouseEvent) => void;
  onPress?: (event: TouchEvent | MouseEvent) => void;
  delay?: number;
}

export function useLongPress({ 
  onLongPress, 
  onPress, 
  delay = 500 
}: LongPressOptions) {
  const timerRef = useRef<NodeJS.Timeout>();
  const isLongPressRef = useRef(false);

  const start = useCallback((event: TouchEvent | MouseEvent) => {
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress(event);
      
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, delay);
  }, [onLongPress, delay]);

  const clear = useCallback((event: TouchEvent | MouseEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // If it wasn't a long press and we have an onPress handler
    if (!isLongPressRef.current && onPress) {
      onPress(event);
    }
  }, [onPress]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    isLongPressRef.current = false;
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: cancel,
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: cancel,
  };
}
