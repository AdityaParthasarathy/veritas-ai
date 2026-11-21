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
    // Override with VITE_DEV_API_TARGET to point the dev server at a deployed API (for example the Vercel backend).
    proxy: { '/api': { target: process.env.VITE_DEV_API_TARGET || 'http://localhost:8000', changeOrigin: true } },
  },
  preview: {
    port: 5173,
  }
})
