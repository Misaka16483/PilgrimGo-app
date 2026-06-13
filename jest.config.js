/** @type {import('jest').Config} */
module.exports = {
  // Expo 官方 preset：内置 react-native/expo 模块的转译与 setup
  preset: 'jest-expo',
  // 复用 tsconfig 里的 "@/*" -> "src/*" 路径别名
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.ts?(x)',
    '**/?(*.)+(spec|test).ts?(x)',
  ],
};
