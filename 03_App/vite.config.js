import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// BASE_PATH is set by the GitHub Pages workflow (e.g. /tiktok-finds/).
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'TikTok Finds',
        short_name: 'Finds',
        description: 'Recipes and restaurants from our shared TikToks.',
        id: base,
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#15111f',
        theme_color: '#15111f',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        // Data and thumbnails come from Supabase, not the app shell.
        runtimeCaching: [
          {
            // Signed URLs carry an expiring token, so key the cache on the URL without it.
            urlPattern: ({ url }) => url.pathname.includes('/storage/v1/object/sign/thumbs/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'thumbs',
              expiration: { maxEntries: 800 },
              cacheableResponse: { statuses: [0, 200] },
              plugins: [
                {
                  cacheKeyWillBeUsed: async ({ request }) => {
                    const u = new URL(request.url)
                    return `${u.origin}${u.pathname}`
                  },
                },
              ],
            },
          },
          {
            urlPattern: ({ url }) => url.origin.includes('fonts.g'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fonts' },
          },
        ],
      },
    }),
  ],
})
