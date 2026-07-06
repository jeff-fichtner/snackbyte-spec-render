import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

// Flat config. This package is plain ESM .mjs (no TypeScript source), so it uses
// @eslint/js recommended + node globals, with eslint-config-prettier last to defer all
// formatting to Prettier. The generated-HTML string templates run client-side, but the
// .mjs files themselves are Node modules.
export default [
  {
    ignores: ['node_modules/**', 'coverage/**', 'dist/**', '*.tsbuildinfo'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  prettier,
];
