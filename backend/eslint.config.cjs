const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const prettierPlugin = require('eslint-plugin-prettier');
const localPlugin = require('./eslint-rules/index.cjs');

module.exports = [
  { ignores: ['dist', 'node_modules', 'eslint-rules', 'src/db/migrations', 'src/db/seeders'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: './tsconfig.json', tsconfigRootDir: __dirname, sourceType: 'module' }
    },
    plugins: { '@typescript-eslint': tseslint, prettier: prettierPlugin, local: localPlugin },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['error', { allow: ['error'] }]
    }
  },
  {
    files: ['src/modules/**/*.ts'],
    rules: { 'local/no-raw-error-throw': 'error', 'local/enforce-path-aliases': 'error' }
  },
  {
    files: ['src/**/*.controller.ts'],
    rules: { 'local/no-direct-response': 'error', 'local/no-sequelize-in-controllers': 'error' }
  },
  {
    files: ['src/**/*.routes.ts'],
    rules: { 'local/no-patch-route': 'error' }
  }
];
