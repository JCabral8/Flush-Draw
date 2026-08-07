import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/sim/**/*.ts'],
      reporter: ['text', 'text-summary'],
      thresholds: { lines: 85, functions: 85, branches: 85, statements: 85 },
    },
  },
})
