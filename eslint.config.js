import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

// Flat config for a source-shipped ESM .mjs package: @eslint/js recommended + Node
// globals, with eslint-config-prettier last so formatting is Prettier's alone. No
// typescript-eslint — there is no TypeScript source.
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
