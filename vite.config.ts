import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // ✅ PRODUCTION: Build optimizations
  build: {
    // Output directory for production build
    outDir: 'dist',

    // Generate source maps for debugging (disable in production if not needed)
    sourcemap: false,

    // Minify the output
    minify: 'esbuild',

    // Chunk size warning limit (500kb)
    chunkSizeWarningLimit: 500,

    // Rollup options for better code splitting
    rollupOptions: {
      output: {
        // Manual chunking for better caching
        manualChunks: {
          // Vendor chunk for React and React-DOM
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // Icons chunk
          'icons': ['@fortawesome/react-fontawesome', '@fortawesome/free-solid-svg-icons', 'react-icons'],

          // HTTP client chunk
          'http': ['axios'],
        },
      },
    },
  },

  // ✅ PRODUCTION: Preview server configuration (for testing production build locally)
  preview: {
    port: 4173,
    strictPort: false,
    open: true,
  },

  // ✅ DEVELOPMENT: Dev server configuration
  server: {
    port: 5173,
    strictPort: false,
    open: true,
  },
})
