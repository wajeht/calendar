import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      APP_PASSWORD: 'test-password',
      APP_SECRET: 'test-secret-key-for-sessions'
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000
  }
});