import js from '@eslint/js';
import globals from 'globals';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
  // 1. ESLint's recommended rules
  js.configs.recommended,

  // 2. Configuration for TypeScript
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/*.d.ts',
      '**/jest.config.js',
      '**/webpack.config.js',
      '**/tailwind.config.js',
      '**/next.config.js',
      '**/postcss.config.js',
    ],

    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        typescriptVersion: '5.5.0',
        project: [
          './tsconfig.json',
          './tsconfig.base.json',
          './packages/*/tsconfig.json',
          './services/*/tsconfig.json',
          './apps/*/tsconfig.json',
          './ai-services/*/tsconfig.json',
          './services/anomaly-detection/tsconfig.json',
          './services/notification/tsconfig.json',
          './services/gdpr-compliance-service/tsconfig.json',
          './services/backup-encryption-service/tsconfig.json',
          './services/rate-limiting-service/tsconfig.json',
          './services/key-management-service/tsconfig.json',
          './services/encryption-service/tsconfig.json',
          './services/generate-ai-insights/tsconfig.json',
          './services/parse-natural-language/tsconfig.json',
          './services/send-notifications/tsconfig.json',
          './services/evaluate-alert-conditions/tsconfig.json',
          './services/market-signal-processor/tsconfig.json',
          './services/on-chain-monitor/tsconfig.json',
          './services/defi-protocol-metrics/tsconfig.json',
          './services/news-aggregator/tsconfig.json',
          './services/social-media-sentiment/tsconfig.json',
          './services/live-market-feeds/tsconfig.json',
          './services/websocket-server/tsconfig.json',
          './services/portfolio/tsconfig.json',
          './packages/market-data-pipeline/tsconfig.json',
          './packages/onchain-data-pipeline/tsconfig.json',
          './packages/social-data-pipeline/tsconfig.json',
          './packages/api-client/tsconfig.json',
          './services/ingest/tsconfig.json',
          './services/context/tsconfig.json',
          './services/coinet-ai/tsconfig.json',
          './services/inference/tsconfig.json',
          './services/api-gateway/tsconfig.json',
          './services/user/tsconfig.json',
          './services/data-aggregator/tsconfig.json',
          './apps/web-client/tsconfig.json',
          './packages/shared-utils/tsconfig.json',
          './ai-services/llm-gateway/tsconfig.json',
          './cypress/tsconfig.json',
          './packages/shared-models/tsconfig.json',
          './packages/shared-ui/tsconfig.json',
          './packages/shared-db/tsconfig.json',
          './services/stream-processor/tsconfig.json'
        ]
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        jest: true,
        es2022: true,
      },
    },

    plugins: {
      '@typescript-eslint': typescriptPlugin,
    },

    rules: {
      // General rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': 'off', // Covered by @typescript-eslint
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      'no-var': 'error',
      'prefer-const': 'error',

      // TypeScript rules
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-case-declarations': 'off',
    },
  },
  // 3. Configuration for JavaScript files (Node.js environment)
  {
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: {
      globals: {
        ...globals.node,
        require: true,
        module: true,
        __filename: true,
        __dirname: true,
      },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'commonjs',
      },
    },
    rules: {
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      'no-undef': 'error',
    },
  },
  // 3. Configuration for JavaScript files (Node.js environment)
  {
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: {
      globals: {
        ...globals.node,
        require: true,
        module: true,
        __filename: true,
        __dirname: true,
      },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'commonjs',
      },
    },
    rules: {
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      'no-undef': 'off',  // Allow Node.js globals
    },
  },
];