const expoPreset = require('jest-expo/jest-preset');

const babelTransform = expoPreset.transform['\\.[jt]sx?$'];

// msw 3 and its dependencies ship only ESM; Babel turns them into CommonJS for Jest.
const esmPackages = [
  'msw',
  '@msw',
  '@mswjs',
  'rettime',
  'until-async',
  'outvariant',
  'headers-polyfill',
  'is-node-process',
  'cookie',
  'tough-cookie',
  'tldts',
  'tldts-core',
  'strict-event-emitter',
  '@open-draft',
];

const expoPackages = [
  '.pnpm',
  'react-native',
  '@react-native',
  '@react-native-community',
  'expo',
  '@expo',
  '@expo-google-fonts',
  'react-navigation',
  '@react-navigation',
  '@sentry/react-native',
  'native-base',
  'standard-navigation',
];

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testEnvironment: '<rootDir>/test/environment.js',
  transform: { '\\.mjs$': babelTransform },
  transformIgnorePatterns: [
    `/node_modules/(?!(${[...expoPackages, ...esmPackages].join('|')}))`,
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  setupFiles: ['<rootDir>/jest.env.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/src/**/*.spec.ts?(x)', '<rootDir>/test/**/*.spec.ts?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/app/**', '!src/**/*.spec.{ts,tsx}'],
};
