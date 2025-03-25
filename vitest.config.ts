import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-server/**',
      '**/.local/**', // Exclude .local directory
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],
  },
})
