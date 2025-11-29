import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        'src/examples/',
        'dist/',
      ],
    },
  },
  css: false, // Disable CSS processing for tests (avoids PostCSS config issues)
  resolve: {
    alias: {
      // Prevent loading root PostCSS config
    },
  },
});

