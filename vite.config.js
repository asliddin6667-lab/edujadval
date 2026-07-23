import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/edujadval/',
  server: {
    port: 5175,
    strictPort: true,
    open: true,
  },
})
