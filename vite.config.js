import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Custom domen (edujadval.uz) ulangani uchun '/' — sub-path emas.
  // Agar domensiz GitHub Pages'ga qaytsangiz: '/edujadval/' qiling.
  base: '/',
  server: {
    port: 5175,
    strictPort: true,
    open: true,
  },
})
