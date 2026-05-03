import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
const webBasePath = process.env.VITE_WEB_BASE_PATH || '/patchwork/web';
const apiPrefix = process.env.VITE_API_PREFIX || '/patchwork/api';
const apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:5090';

// Extract base path from prefix (e.g., '/patchwork/api' from '/patchwork/api/v1')
const apiBasePath = apiPrefix.split('/v')[0] || '/patchwork/api';

export default defineConfig({
  base: `${webBasePath}`,
  plugins: [svelte()],
  optimizeDeps: {
    exclude: ['svelte-routing']
  },
  server: {
    port: 5173,
    allowedHosts: ['dev.aligness-teamweb.com', 'localhost'],
    proxy: {
      [apiBasePath]: {
        target: apiBaseUrl,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/patchwork/, '')
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-tiptap': ['@tiptap/core', '@tiptap/starter-kit', '@tiptap/extension-text-align'],
          'vendor-utils': ['immer', 'lodash.debounce', 'ajv', 'sortablejs'],
          'vendor-toast': ['@zerodevx/svelte-toast']
        }
      }
    }
  }
})
