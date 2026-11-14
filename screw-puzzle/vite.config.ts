import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/rooms': { target: 'ws://127.0.0.1:2567', ws: true } } },
})
