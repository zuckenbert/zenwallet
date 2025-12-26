import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'ZenWallet',
        short_name: 'ZenWallet',
        description: 'Crypto wallet gamificada para jovens',
        theme_color: '#0A0A0B',
        background_color: '#0A0A0B',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(mainnet|devnet)\.helius-rpc\.com/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'rpc-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300, // 5 minutes
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /^https:\/\/price\.jup\.ag/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'price-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60, // 1 minute
              },
            },
          },
          {
            urlPattern: /^https:\/\/quote-api\.jup\.ag/,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/raw\.githubusercontent\.com.*token-list/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'token-logos',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 86400, // 24 hours
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'solana': ['@solana/web3.js', '@solana/spl-token'],
          'wallet-adapter': [
            '@solana/wallet-adapter-base',
            '@solana/wallet-adapter-react',
            '@solana/wallet-adapter-wallets',
          ],
          'jupiter': ['@jup-ag/api'],
          'ui': ['framer-motion', 'qrcode.react'],
        },
      },
    },
  },
});
