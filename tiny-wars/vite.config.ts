import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@core':      resolve(__dirname, 'src/core'),
      '@data':      resolve(__dirname, 'src/data'),
      '@rendering': resolve(__dirname, 'src/rendering'),
      '@scenes':    resolve(__dirname, 'src/scenes'),
      '@ui':        resolve(__dirname, 'src/ui'),
      '@input':     resolve(__dirname, 'src/input'),
      '@config':    resolve(__dirname, 'src/config'),
    },
  },
  build: {
    target: 'es2017',
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
  },
  server: {
    port: 5173,
    host: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
