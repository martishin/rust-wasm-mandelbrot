import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
  plugins: [
    react(),
    wasm(),            // support wasm-pack / wasm-bindgen modules
    topLevelAwait(),   // handle top-level await in JS glue
  ],
  // optionally, if you see ESM loader errors:
  optimizeDeps: {
    exclude: ['pkg/mandelbrot_wasm.js'],
  },
  build: {
    target: 'esnext',  // ensure modern browsers with native WebAssembly support
  },
})
