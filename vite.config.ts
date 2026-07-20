import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative assets work on both repository Pages URLs and custom domains.
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@supabase')) return 'supabase'
          if (id.includes('node_modules/react')) return 'react'
          if (id.includes('node_modules/lucide-react')) return 'icons'
          return undefined
        },
      },
    },
  },
})
