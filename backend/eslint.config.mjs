import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-console': 'error',
    },
  },
  // Dependency rule (docs/ai/01-architecture.md, section 1): inner layers never import outer ones.
  {
    files: [
      'src/entities/**/*.ts',
      'src/useCases/**/*.ts',
      'src/repositories/**/*.ts',
      'src/providers/**/*.ts',
    ],
    ignores: ['src/useCases/**/index.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/infra', '**/infra/**', '**/main', '**/main/**'],
              message: 'Inner layers must not import infra or main.',
            },
          ],
          paths: [
            { name: '@prisma/client', message: 'Use a repository port.' },
            { name: 'bcrypt', message: 'Use IHashProvider.' },
            { name: 'jsonwebtoken', message: 'Use ITokenProvider.' },
            {
              name: 'express',
              allowTypeImports: true,
              message: 'Only types, and only in Controllers.',
            },
          ],
        },
      ],
    },
  },
  prettier,
);
