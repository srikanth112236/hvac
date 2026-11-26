import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Keep the dev proxy and the API on the same port. Move both with
// `PORT=4100 API_PORT=4100 npm run dev` when 4000 is already taken.
const apiTarget = `http://127.0.0.1:${process.env.API_PORT ?? '4000'}`

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
        target: apiTarget,
        changeOrigin: false,
        ws: true,
      },
      '/uploads': {
        target: apiTarget,
        changeOrigin: false,
      },
      '/sitemap.xml': {
        target: apiTarget,
        changeOrigin: false,
      },
      '/robots.txt': {
        target: apiTarget,
        changeOrigin: false,
      },
      '/llms.txt': {
        target: apiTarget,
        changeOrigin: false,
      },
      '/feed.xml': {
        target: apiTarget,
        changeOrigin: false,
      },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: false,
        ws: true,
      },
      '/uploads': {
        target: apiTarget,
        changeOrigin: false,
      },
      '/sitemap.xml': {
        target: apiTarget,
        changeOrigin: false,
      },
      '/robots.txt': {
        target: apiTarget,
        changeOrigin: false,
      },
      '/llms.txt': {
        target: apiTarget,
        changeOrigin: false,
      },
      '/feed.xml': {
        target: apiTarget,
        changeOrigin: false,
      },
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
  },
})
