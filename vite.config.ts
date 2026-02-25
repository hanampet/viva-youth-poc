import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 9400,
    host: '0.0.0.0',
    allowedHosts: ['viva-youth.meninblox.com'],
  },
  build: {
    outDir: 'dist',
  },
})
