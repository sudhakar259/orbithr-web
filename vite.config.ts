import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// Detect if running `vite build` or `vite dev`
const isBuild = process.env.NODE_ENV === 'production'
const backendTarget = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],

  // 👇 Base path for assets — crucial for subdomains like tenant.orbithr.test
  base: isBuild ? '/' : '/',

  server: {
    host: true, // listen on 0.0.0.0 (accept any host header)
    port: 5173,
    strictPort: true,
    // HMR: explicitly set clientPort and use 0.0.0.0 for host so websocket works for subdomains
    hmr: {
      protocol: 'ws',
      host: '0.0.0.0',
      clientPort: 5173,
    },
    // Allow wildcard subdomains under orbithr.test (e.g. sudhakar.orbithr.test, crevol.orbithr.test)
    allowedHosts: [
      'orbithr.test',
      '.orbithr.test',
      '*.orbithr.test',
      'localhost',
      '127.0.0.1',
    ],
    proxy: {
      '/api': {
        target: backendTarget, // Laravel backend (configurable via VITE_BACKEND_URL)
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // server: {
  //   host: true,                   // Let Vite listen on 0.0.0.0 (needed for Valet)
  //   hmr: {
  //     host: 'orbithr.test',       // Your primary Valet domain
  //   },
  //   allowedHosts: [
  //     'orbithr.test',
  //     '*.orbithr.test',            // Allow wildcard tenant subdomains
  //   ],
  //   proxy: {
  //     '/api': {
  //       target: 'http://backend.test', // Your Laravel backend
  //       changeOrigin: true,
  //       secure: false,
  //     },
  //   },
  // },

  build: {
    outDir: 'public',       // Build to /public for Valet
    emptyOutDir: true,
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
