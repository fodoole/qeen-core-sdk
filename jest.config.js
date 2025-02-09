module.exports = {
  projects: [
    {
      displayName: 'behaviour-tests',
      preset: 'jest-puppeteer',
      testMatch: ['**/?(*.)+(test).js?(x)'],
      moduleDirectories: ['node_modules', 'frontend-serving'],
      moduleFileExtensions: ['js', 'json', 'jsx', 'node'],
    },
    {
      displayName: 'unit-tests',
      transform: {
        '^.+\\.tsx?$': 'ts-jest',
        '^.+\\.jsx?$': 'babel-jest',
        '^.+\\.mjs$': 'babel-jest',
      },
      transformIgnorePatterns: ['/node_modules/'],
      moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node', 'mjs'],
      testEnvironment: 'node',
      testMatch: ['**/?(*.)+(test).ts?(x)'],
    },
  ],
};
