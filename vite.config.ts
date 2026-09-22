import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/cdn-audio': {
        target: 'https://cdn.frostyrhymes.com',
        changeOrigin: true,
        headers: { Referer: 'https://www.frostyrhymes.com/' },
        rewrite: (requestPath) => requestPath.replace(/^\/cdn-audio/, ''),
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes, req) => {
            if ((req.url ?? '').toLowerCase().endsWith('.pdf')) {
              proxyRes.headers['content-type'] = 'application/pdf';
              proxyRes.headers['content-disposition'] = 'inline';
            }
          });
        },
      },
    },
  },
});
