import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Debe coincidir EXACTAMENTE con el nombre del repositorio, incluidas las
  // mayúsculas: https://<usuario>.github.io/Dockforge-steam/
  base: '/Dockforge-steam/',
  plugins: [react()],
})
