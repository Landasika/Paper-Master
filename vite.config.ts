import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 允许外部访问
    port: 8000,
    proxy: {
      // WebDAV代理配置
      '/webdav-proxy': {
        target: 'http://106.54.52.227:8085',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/webdav-proxy/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (_proxyReq, req) => {
            console.log('Sending request to the target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('Received response from the target:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  }
})
