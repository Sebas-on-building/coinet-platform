// Global type definitions for custom Jest matchers
import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toBeEmptyDOMElement(): R;
      toHaveBeenCalled(): R;
      toHaveFocus(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toBe(expected: any): R;
      toBeGreaterThan(expected: number): R;
    }
  }
}

export { }; 