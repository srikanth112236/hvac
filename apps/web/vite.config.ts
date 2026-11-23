import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const CSP = [
  "default-src 'self'",
  "script-src 'self' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: https://www.google-analytics.com https://region1.google-analytics.com",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

/** Production build only: a meta CSP for hosts that cannot set headers. */
function cspMeta(): Plugin {
  return {
    name: 'hvac-csp-meta',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '</head>',
        `    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n  </head>`,
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), cspMeta()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@hvac/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5175,
    strictPort: true,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: false,
      },
      '/uploads': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: false,
      },
      '/sitemap.xml': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: false,
      },
      '/robots.txt': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: false,
      },
      '/llms.txt': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: false,
      },
      '/feed.xml': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: false,
      },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: false,
      },
      '/uploads': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: false,
      },
      '/sitemap.xml': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: false,
      },
      '/robots.txt': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: false,
      },
      '/llms.txt': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: false,
      },
      '/feed.xml': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: false,
      },
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
  },
})
