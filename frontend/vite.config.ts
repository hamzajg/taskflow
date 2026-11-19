/// <reference types="vitest/config" />
import { defineConfig, ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

// /projects and /tasks are both SPA routes and API prefixes: page
// navigations (Accept: text/html) must fall through to the SPA while
// fetch() calls are proxied to the backend.
const apiProxy: ProxyOptions = {
  target: 'http://localhost:8080',
  bypass(req) {
    if ((req.headers.accept ?? '').includes('text/html')) return req.url
  },
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:8080',
      '/workspaces': 'http://localhost:8080',
      '/projects': apiProxy,
      '/tasks': apiProxy,
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
