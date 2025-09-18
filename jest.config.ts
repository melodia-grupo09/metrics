import type { Config } from 'jest';

const config: Config = {
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: './coverage',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
};

export default config;
