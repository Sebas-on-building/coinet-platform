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
  // Disable CSS processing completely to avoid PostCSS config issues
  css: {
    modules: {
      classNameStrategy: 'non-scoped',
    },
    postcss: false, // Explicitly disable PostCSS
  },
  // Prevent vitest from searching parent directories for configs
  root: process.cwd(),
});

