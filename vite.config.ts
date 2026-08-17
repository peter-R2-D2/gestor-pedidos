import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// host: true permite acceder desde tablets de la misma red
// (http://<ip-de-tu-computadora>:5173)
export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,
    port: 5173,
  },
})
