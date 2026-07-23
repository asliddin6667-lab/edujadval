import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages sub-path rejimi: asliddin6667-lab.github.io/edujadval/
  // KELAJAKDA custom domen (edujadval.uz) ulasangiz: base: '/' qiling
  // va public/CNAME faylini qayta yarating (ichida: edujadval.uz)
  base: '/edujadval/',
  server: {
    port: 5175,
    strictPort: true,
    open: true,
  },
})
