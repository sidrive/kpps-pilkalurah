import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [],
      manifest: {
        name: 'KPPS Pilkalurah',
        short_name: 'KPPS',
        description: 'Asisten Digital KPPS - Presensi, Tally, Rekapitulasi',
        theme_color: '#062d3d',
        background_color: '#eef4f7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/'
      },
      workbox: {
        // App shell + assets di-cache. Data Firestore ditangani terpisah oleh
        // persistentLocalCache (IndexedDB) di firebase.js, BUKAN oleh service worker ini.
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    host: true,
    port: 0
  }
})
