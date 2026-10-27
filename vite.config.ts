import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),

    // PWA: Workbox-generated service worker that precaches the whole build
    // (including lazy chunks), so the app works offline from the first visit.
    VitePWA({
      registerType: 'prompt',   // new versions wait for the user to tap "Update"
      injectRegister: false,    // registered from src/app/services/pwa.ts
      manifest: false,          // we ship our own public/manifest.webmanifest
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'robots.txt'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
        globIgnores: ['og-image.png', 'screenshots/**'],
        navigateFallback: '/index.html',
        // SPA routes (/app, /app/breathe, /privacy…) are served from the cached shell.
        navigateFallbackDenylist: [/^\/sw\.js$/, /^\/workbox-/, /\.[a-z0-9]+$/i],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // Supabase (auth + sync) is cross-origin and always goes to the network.
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  envPrefix: ['VITE_', 'SUPABASE_'],
})
