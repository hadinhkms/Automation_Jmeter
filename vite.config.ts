import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { jmeterPlugin } from './server/jmeterPlugin'

export default defineConfig({
  plugins: [react(), jmeterPlugin()],
})

