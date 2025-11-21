// =============================================================================
// COINET AI SHARED UTILITIES - VALIDATORS
// =============================================================================

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidCryptoSymbol = (symbol: string): boolean => {
  const symbolRegex = /^[A-Z]{2,10}$/;
  return symbolRegex.test(symbol);
};

export const isPositiveNumber = (value: number): boolean => {
  return typeof value === 'number' && value > 0 && !isNaN(value);
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isValidTimestamp = (timestamp: number): boolean => {
  return isPositiveNumber(timestamp) && timestamp > 0;
}; 