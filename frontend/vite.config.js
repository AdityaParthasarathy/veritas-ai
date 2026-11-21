import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: false,
  },
  server: {
    port: 5173,
    host: 'localhost',
    // The app calls /api/v1 on its own origin; in development the backend on :8000 answers it.
    proxy: { '/api': 'http://localhost:8000' },
  },
  preview: {
    port: 5173,
  }
})
