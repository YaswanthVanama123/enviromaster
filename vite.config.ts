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

    // Target modern browsers for smaller bundle size
    target: 'esnext',

    // Optimize CSS
    cssCodeSplit: true,
    cssMinify: true,

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

        // Asset file naming for better caching
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.');
          let extType = info?.[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType || '')) {
            extType = 'img';
          } else if (/woff|woff2|eot|ttf|otf/i.test(extType || '')) {
            extType = 'fonts';
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        },

        // Chunk file naming
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },

    // Optimize dependencies
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
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
    cors: true,
  },

  // ✅ OPTIMIZATION: Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      '@fortawesome/react-fontawesome',
      '@fortawesome/free-solid-svg-icons',
      'react-icons',
    ],
  },
})
