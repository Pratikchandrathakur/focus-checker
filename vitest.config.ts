import { defineConfig } from 'vitest/config';
import path from 'path';

// Separate from vite.config.ts so the PWA plugin never runs during tests.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
