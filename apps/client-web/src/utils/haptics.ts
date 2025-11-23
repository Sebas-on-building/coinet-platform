/**
 * Haptic feedback utilities for mobile devices
 * Supports iOS and Android through the Vibration API
 */

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const hapticPatterns: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 10],
  warning: [10, 100, 10, 100],
  error: [10, 50, 10, 50, 10],
};

/**
 * Triggers haptic feedback if supported by the device
 */
export function triggerHaptic(style: HapticStyle = 'light'): void {
  // Check if running on mobile device
  if (!isMobileDevice()) return;

  // Use Vibration API if available
  if ('vibrate' in navigator) {
    const pattern = hapticPatterns[style];
    navigator.vibrate(pattern);
    return;
  }

  // Fallback for iOS devices with haptic feedback
  if (window.navigator && 'hapticFeedback' in window.navigator) {
    try {
      // @ts-ignore - iOS specific API
      window.navigator.hapticFeedback?.impact?.(style);
    } catch (error) {
      console.debug('Haptic feedback not available:', error);
    }
  }
}

/**
 * Triggers selection haptic feedback (for UI interactions)
 */
export function triggerSelectionHaptic(): void {
  triggerHaptic('light');
}

/**
 * Triggers notification haptic feedback
 */
export function triggerNotificationHaptic(type: 'success' | 'warning' | 'error' = 'success'): void {
  triggerHaptic(type);
}

/**
 * Checks if the device is a mobile device
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Checks if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return isMobileDevice() && ('vibrate' in navigator || 'hapticFeedback' in (window.navigator || {}));
}
