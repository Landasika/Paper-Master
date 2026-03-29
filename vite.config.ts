import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.wasm'],
  server: {
    host: '0.0.0.0',
    port: 8000,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    proxy: {
      '/webdav-proxy': {
        target: 'http://106.54.52.227:8085',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/webdav-proxy/, ''),
      }
    }
  }
})
