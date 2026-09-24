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
    allowedHosts: ['stg.entitypradhana.id', 'localhost'],
    proxy: {
      [apiBasePath]: {
        target: apiBaseUrl,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/patchwork/, '')
      }
    }
  },
  // Fixed to match the dev server port so `vite preview` behaves the same way.
  // This is what actually serves the app in Docker (see Dockerfile) — host:
  // true binds 0.0.0.0 so it's reachable from outside the container, not
  // just from localhost inside it.
  preview: {
    port: 5173,
    host: true,
    allowedHosts: ['stg.entitypradhana.id', 'localhost']
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
