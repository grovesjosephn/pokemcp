import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Resolve CJS build deprecation warning
    pool: 'forks',
  },
});
