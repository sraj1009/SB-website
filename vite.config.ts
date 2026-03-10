/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api/v1': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'SINGGLEBEE | Premium Marketplace',
          short_name: 'SINGGLEBEE',
          description: 'Premium Educational Books, Rhymes, and Supplies for kids.',
          theme_color: '#FFC107',
          background_color: '#FFFDF7',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            ui: ['lucide-react', 'react-toastify'],
            api: ['axios', '@tanstack/react-query'],
            utils: ['./utils/seo-utils.ts']
          }
        }
      },
      chunkSizeWarningLimit: 1000,
      sourcemap: mode === 'development',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./test/setup.ts'],
      css: true,
      exclude: [
        'node_modules/**',
        'server/**',
        'dist/**',
        'coverage/**',
        '**/*.config.*',
      ],
      include: [
        'test/**/*.{test,spec}.{js,ts,tsx}',
        'components/**/*.{test,spec}.{js,ts,tsx}',
        'hooks/**/*.{test,spec}.{js,ts,tsx}',
        'services/**/*.{test,spec}.{js,ts,tsx}',
      ],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'test/',
          'server/',
          '**/*.d.ts',
          '**/*.config.*',
          'dist/',
          'coverage/',
        ],
      },
    },
    define: {
      // Remove GEMINI_API_KEY from client side for security
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
        '@components': path.resolve(__dirname, './components'),
        '@services': path.resolve(__dirname, './services'),
        '@hooks': path.resolve(__dirname, './hooks'),
        '@types': path.resolve(__dirname, './types'),
      },
    },
  };
});
