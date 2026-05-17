import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Repo-root env: `.env`, `.env.[mode]`, `.env.[mode].local` (see `backend/lib/loadRootEnv.js` + README)
  envDir: path.resolve(__dirname, '.'),
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    watch: {
      ignored: ['**/Agent Files/**', '**/.agents/**'],
    },
  },
})
