import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy matches backend PORT in .env (default 3000)
const backend = process.env.VITE_PROXY_TARGET ?? 'http://localhost:3000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: backend,
        changeOrigin: true,
      },
      '/socket.io': {
        target: backend,
        ws: true,
      },
    },
  },
})
