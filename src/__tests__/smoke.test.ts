/**
 * Smoke test to ensure test infrastructure is working
 */
describe('Smoke Test', () => {
  it('should pass basic arithmetic', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });

  it('should verify environment', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });
});
