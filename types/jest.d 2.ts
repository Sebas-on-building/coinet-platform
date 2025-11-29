// Jest global type declarations
declare global {
  // Jest testing functions
  function describe(name: string, fn: () => void): void;
  function it(name: string, fn: () => void | Promise<void>): void;
  function test(name: string, fn: () => void | Promise<void>): void;
  function beforeEach(fn: () => void | Promise<void>): void;
  function afterEach(fn: () => void | Promise<void>): void;
  function beforeAll(fn: () => void | Promise<void>): void;
  function afterAll(fn: () => void | Promise<void>): void;

  // Jest mock and expect functions
  const jest: {
    fn: <T extends (...args: any[]) => any>(implementation?: T) => any;
    spyOn: <T extends {}, M extends keyof T>(object: T, method: M) => any;
    useFakeTimers: () => void;
    useRealTimers: () => void;
    clearAllMocks: () => void;
    resetAllMocks: () => void;
  };

  const expect: {
    <T>(actual: T): {
      toBe: (expected: T) => void;
      toEqual: (expected: T) => void;
      toBeDefined: () => void;
      toBeNull: () => void;
      toBeTruthy: () => void;
      toBeFalsy: () => void;
      toBeGreaterThan: (expected: number) => void;
      toBeGreaterThanOrEqual: (expected: number) => void;
      toBeLessThan: (expected: number) => void;
      toBeLessThanOrEqual: (expected: number) => void;
      toHaveBeenCalled: () => void;
      toHaveBeenCalledWith: (...args: any[]) => void;
      toMatchObject: (expected: any) => void;
      any: (constructor: any) => any;
      objectContaining: (obj: any) => any;
      not: any;
    };
    any: (constructor: any) => any;
    objectContaining: (obj: any) => any;
  };

  // Global test utilities
  const testUtils: {
    delay: (ms: number) => Promise<void>;
    mockTimers: () => () => void;
  };
}

export {}; 