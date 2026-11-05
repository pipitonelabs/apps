/// <reference types="vitest/config" />
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    proxy: {
      '/api': 'http://localhost:9090',
      '/kromgo': {
        target: 'https://kromgo.pipitonelabs.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/kromgo\/(.+)$/, '/badges/$1?format=json'),
      },
    },
  },
  test: { environment: 'node' },
})
