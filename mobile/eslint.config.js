// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettier,
  { ignores: ['dist/*', 'coverage/*', '.expo/*', 'expo-env.d.ts'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'error',
    },
  },
  // Layers (.claude/01-architecture.md, section 5): the View only draws.
  {
    files: ['src/screens/**/*.view.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'axios', message: 'The View never calls the API.' },
            { name: '@tanstack/react-query', message: 'Queries live in the Model.' },
          ],
          patterns: [{ group: ['@/service/*'], message: 'The View never calls the API.' }],
        },
      ],
    },
  },
  // The Model only knows service interfaces.
  {
    files: ['src/screens/**/*.model.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'axios', message: 'Use a service interface (I*Service).' }],
          patterns: [
            {
              group: [
                '@/service/implementations/*',
                '@/service/fakes/*',
                '@/service/container',
                '@/service/AxiosInstance',
              ],
              message: 'The Model imports only I*Service interfaces; the Page wires the instance.',
            },
          ],
        },
      ],
    },
  },
]);
