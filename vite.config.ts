import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base cesta: na githube pages je appka na /ecosort_DP_simcikova/
// workflow nastavuje BASE_PATH automaticky
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/ecosort_logo.png', 'data/*.json'],
      manifest: {
        name: 'EcoSort - triedenie odpadu',
        short_name: 'EcoSort',
        description: 'Rozpoznanie odpadu z fotky, kontrola zalohy a najblizsie zberne miesto',
        lang: 'sk',
        theme_color: '#1b7a3d',
        background_color: '#f4faf5',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/ecosort_logo.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/ecosort_logo.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/ecosort_logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // wasm pre zxing a vlastny model sa musia dostat do cache, aby appka isla aj offline
        globPatterns: ['**/*.{js,css,html,png,svg,json,wasm,bin}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // vahy baseline modelu a tesseract data sa stahuju z cdn pri prvom pouziti, potom ostanu v cache
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(tfhub\.dev|www\.kaggle\.com|storage\.googleapis\.com|cdn\.jsdelivr\.net|tessdata\.projectnaptha\.com)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ecosort-model-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
})
