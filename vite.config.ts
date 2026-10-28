import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { jmeterPlugin } from './server/jmeterPlugin'

export default defineConfig({
  server: {
    port: 58936,
    strictPort: true,
  },
  plugins: [react(), jmeterPlugin()],
})

