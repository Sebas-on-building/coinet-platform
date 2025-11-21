// Atomic haptic feedback utility for web/mobile
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    if (type === 'light') navigator.vibrate(10);
    else if (type === 'medium') navigator.vibrate([20, 10, 20]);
    else if (type === 'heavy') navigator.vibrate([40, 20, 40]);
  }
  // TODO: Extend for native/hardware (Cordova, Capacitor, React Native, etc.)
} 