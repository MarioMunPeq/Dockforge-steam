import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages sirve el proyecto en https://<usuario>.github.io/dock-forge/
  base: '/dock-forge/',
  plugins: [react()],
})
