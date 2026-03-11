/// <reference types="vitest" />
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// import { VitePWA } from 'vite-plugin-pwa';
// import federation from '@originjs/vite-plugin-federation';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const isDevelopment = mode === 'development';
  
  return {
    plugins: [
      react(),
      // Temporarily disabled PWA and federation for basic build
      // VitePWA({
      //   registerType: 'autoUpdate',
      //   includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      //   manifest: {
      //     name: 'SINGGLEBEE | Premium Marketplace',
      //     short_name: 'SINGGLEBEE',
      //     description: 'Premium Educational Books, Rhymes, and Supplies for kids.',
      //     theme_color: '#FFC107',
      //     background_color: '#FFFDF7',
      //     display: 'standalone',
      //     orientation: 'portrait',
      //     start_url: '/',
      //     icons: [
      //       {
      //         src: 'pwa-192x192.png',
      //         sizes: '192x192',
      //         type: 'image/png',
      //       },
      //       {
      //         src: 'pwa-512x512.png',
      //         sizes: '512x512',
      //         type: 'image/png',
      //       },
      //       {
      //         src: 'pwa-512x512.png',
      //         sizes: '512x512',
      //         type: 'image/png',
      //         purpose: 'any maskable',
      //       },
      //     ],
      //   },
      //   workbox: {
      //     globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      //     runtimeCaching: [
      //       {
      //         urlPattern: /^https:\/\/api\.singglebee\.com\/.*$/,
      //         handler: 'NetworkFirst',
      //         options: {
      //           cacheName: 'api-cache',
      //           expiration: {
      //             maxEntries: 100,
      //             maxAgeSeconds: 60 * 5, // 5 minutes
      //           },
      //         },
      //       },
      //       {
      //         urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      //         handler: 'CacheFirst',
      //         options: {
      //           cacheName: 'images-cache',
      //           expiration: {
      //             maxEntries: 200,
      //             maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      //           },
      //         },
      //       },
      //       {
      //         urlPattern: /\.(?:js|css)$/,
      //         handler: 'StaleWhileRevalidate',
      //         options: {
      //           cacheName: 'static-resources',
      //           expiration: {
      //             maxEntries: 100,
      //             maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
      //           },
      //         },
      //       },
      //     ],
      //   },
      //   strategies: 'generateSW',
      //   devOptions: {
      //     enabled: false, // Disable PWA in development for faster builds
      //     type: 'module',
      //   },
      // }),
      // federation({
      //   name: 'shell',
      //   filename: 'remoteEntry.js',
      //   exposes: {
      //     './App': './src/App',
      //     './components': './components/index',
      //     './store': './store/index',
      //     './utils': './utils/index',
      //     './types': './types/index',
      //   },
      //   remotes: {
      //     // Product Catalog Micro-frontend
      //     productCatalog: {
      //       external: isDevelopment 
      //         ? 'http://localhost:3001/remoteEntry.js'
      //         : 'https://catalog.singglebee.com/remoteEntry.js',
      //       name: 'productCatalog',
      //       filename: 'remoteEntry.js',
      //       exposes: {
      //         './ProductGrid': './src/components/ProductGrid',
      //         './ProductDetails': './src/components/ProductDetails',
      //         './ProductFilters': './src/components/ProductFilters',
      //         './useProducts': './src/hooks/useProducts',
      //       },
      //       shared: ['react', 'react-dom', 'zustand', 'axios'],
      //     },
      //     
      //     // Checkout Micro-frontend
      //     checkout: {
      //       external: isDevelopment 
      //         ? 'http://localhost:3002/remoteEntry.js'
      //         : 'https://checkout.singglebee.com/remoteEntry.js',
      //       name: 'checkout',
      //       filename: 'remoteEntry.js',
      //       exposes: {
      //         './CheckoutFlow': './src/components/CheckoutFlow',
      //         './PaymentForm': './src/components/PaymentForm',
      //         './ShippingForm': './src/components/ShippingForm',
      //         './useCheckout': './src/hooks/useCheckout',
      //       },
      //       shared: ['react', 'react-dom', 'zustand', 'react-hook-form', 'zod'],
      //     },
      //     
      //     // User Account Micro-frontend
      //     userAccount: {
      //       external: isDevelopment 
      //         ? 'http://localhost:3003/remoteEntry.js'
      //         : 'https://account.singglebee.com/remoteEntry.js',
      //       name: 'userAccount',
      //       filename: 'remoteEntry.js',
      //       exposes: {
      //         './UserProfile': './src/components/UserProfile',
      //         './OrderHistory': './src/components/OrderHistory',
      //         './Wishlist': './src/components/Wishlist',
      //         './useUser': './src/hooks/useUser',
      //       },
      //       shared: ['react', 'react-dom', 'zustand', 'axios'],
      //     },
      //     
      //     // Admin Dashboard Micro-frontend
      //     adminDashboard: {
      //       external: isDevelopment 
      //         ? 'http://localhost:3004/remoteEntry.js'
      //         : 'https://admin.singglebee.com/remoteEntry.js',
      //       name: 'adminDashboard',
      //       filename: 'remoteEntry.js',
      //       exposes: {
      //         './Dashboard': './src/components/Dashboard',
      //         './ProductManager': './src/components/ProductManager',
      //         './OrderManager': './src/components/OrderManager',
      //         './useAdmin': './src/hooks/useAdmin',
      //       },
      //       shared: ['react', 'react-dom', 'zustand', 'recharts', 'axios'],
      //     },
      //   },
      //   shared: {
      //     react: {
      //       singleton: true,
      //       requiredVersion: '^19.2.3',
      //     },
      //     'react-dom': {
      //       singleton: true,
      //       requiredVersion: '^19.2.3',
      //     },
      //     zustand: {
      //       singleton: true,
      //       requiredVersion: '^4.4.7',
      //     },
      //     axios: {
      //       singleton: false,
      //       requiredVersion: '^1.6.0',
      //     },
      //     'react-hook-form': {
      //       singleton: false,
      //       requiredVersion: '^7.48.2',
      //     },
      //     zod: {
      //       singleton: false,
      //       requiredVersion: '^3.22.4',
      //     },
      //   },
      // }),
    ],
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'SINGGLEBEE | Premium Marketplace',
          short_name: 'SINGGLEBEE',
          description: 'Premium Educational Books, Rhymes, and Supplies for kids.',
          theme_color: '#FFC107',
          background_color: '#FFFDF7',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
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
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\.singglebee\.com\/.*$/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 5, // 5 minutes
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            },
            {
              urlPattern: /\.(?:js|css)$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'static-resources',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                },
              },
            },
          ],
        },
        strategies: 'generateSW',
        devOptions: {
          enabled: false, // Disable PWA in development for faster builds
          type: 'module',
        },
      }),
      federation({
        name: 'shell',
        filename: 'remoteEntry.js',
        exposes: {
          './App': './src/App',
          './components': './components/index',
          './store': './store/index',
          './utils': './utils/index',
          './types': './types/index',
        },
        remotes: {
          // Product Catalog Micro-frontend
          productCatalog: {
            external: isDevelopment 
              ? 'http://localhost:3001/remoteEntry.js'
              : 'https://catalog.singglebee.com/remoteEntry.js',
            name: 'productCatalog',
            filename: 'remoteEntry.js',
            exposes: {
              './ProductGrid': './src/components/ProductGrid',
              './ProductDetails': './src/components/ProductDetails',
              './ProductFilters': './src/components/ProductFilters',
              './useProducts': './src/hooks/useProducts',
            },
            shared: ['react', 'react-dom', 'zustand', 'axios'],
          },
          
          // Checkout Micro-frontend
          checkout: {
            external: isDevelopment 
              ? 'http://localhost:3002/remoteEntry.js'
              : 'https://checkout.singglebee.com/remoteEntry.js',
            name: 'checkout',
            filename: 'remoteEntry.js',
            exposes: {
              './CheckoutFlow': './src/components/CheckoutFlow',
              './PaymentForm': './src/components/PaymentForm',
              './ShippingForm': './src/components/ShippingForm',
              './useCheckout': './src/hooks/useCheckout',
            },
            shared: ['react', 'react-dom', 'zustand', 'react-hook-form', 'zod'],
          },
          
          // User Account Micro-frontend
          userAccount: {
            external: isDevelopment 
              ? 'http://localhost:3003/remoteEntry.js'
              : 'https://account.singglebee.com/remoteEntry.js',
            name: 'userAccount',
            filename: 'remoteEntry.js',
            exposes: {
              './UserProfile': './src/components/UserProfile',
              './OrderHistory': './src/components/OrderHistory',
              './Wishlist': './src/components/Wishlist',
              './useUser': './src/hooks/useUser',
            },
            shared: ['react', 'react-dom', 'zustand', 'axios'],
          },
          
          // Admin Dashboard Micro-frontend
          adminDashboard: {
            external: isDevelopment 
              ? 'http://localhost:3004/remoteEntry.js'
              : 'https://admin.singglebee.com/remoteEntry.js',
            name: 'adminDashboard',
            filename: 'remoteEntry.js',
            exposes: {
              './Dashboard': './src/components/Dashboard',
              './ProductManager': './src/components/ProductManager',
              './OrderManager': './src/components/OrderManager',
              './useAdmin': './src/hooks/useAdmin',
            },
            shared: ['react', 'react-dom', 'zustand', 'recharts', 'axios'],
          },
        },
        shared: {
          react: {
            singleton: true,
            requiredVersion: '^19.2.3',
          },
          'react-dom': {
            singleton: true,
            requiredVersion: '^19.2.3',
          },
          zustand: {
            singleton: true,
            requiredVersion: '^4.4.7',
          },
          axios: {
            singleton: false,
            requiredVersion: '^1.6.0',
          },
          'react-hook-form': {
            singleton: false,
            requiredVersion: '^7.48.2',
          },
          zod: {
            singleton: false,
            requiredVersion: '^3.22.4',
          },
        },
      }),
    ],
    server: {
      port: 5173,
      host: true,
      headers: {
        'Content-Security-Policy': isProduction 
          ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
          : undefined,
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: isProduction ? 'hidden' : true,
      minify: 'terser',
      target: 'esnext',
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React ecosystem
            'react-vendor': ['react', 'react-dom'],
            // Router
            'router': ['react-router-dom'],
            // UI components and icons
            'ui': ['lucide-react'],
            // Data fetching and state
            'query': ['@tanstack/react-query', 'axios'],
            // Forms and validation
            'forms': ['react-hook-form', 'zod', '@hookform/resolvers'],
            // State management
            'state': ['zustand'],
            // Animation
            'animation': ['framer-motion'],
            // Charts
            'charts': ['recharts'],
            // Date utilities
            'date': ['date-fns'],
            // Development tools (excluded from production)
            ...(isProduction ? {} : { 'dev-tools': ['@tanstack/react-query-devtools'] }),
          },
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
            return `js/${facadeModuleId}-[hash].js`;
          },
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || [];
            const ext = info[info.length - 1] || '';
            if (!assetInfo.name) return 'assets/[name]-[hash][extname]';
            if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)$/.test(assetInfo.name)) {
              return `media/[name]-[hash][extname]`;
            }
            if (/\.(png|jpe?g|gif|svg|ico|webp)$/.test(assetInfo.name)) {
              return `images/[name]-[hash][extname]`;
            }
            if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name)) {
              return `fonts/[name]-[hash][extname]`;
            }
            return `${ext}/[name]-[hash][extname]`;
          },
        },
      },
      chunkSizeWarningLimit: 500,
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          pure_funcs: isProduction ? ['console.log', 'console.info', 'console.debug'] : [],
        },
        mangle: {
          safari10: true,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./test/setup.ts'],
      css: true,
      exclude: ['node_modules/**', 'server/**', 'dist/**', 'coverage/**', '**/*.config.*'],
      include: [
        'test/**/*.{test,spec}.{js,ts,tsx}',
        'components/**/*.{test,spec}.{js,ts,tsx}',
        'hooks/**/*.{test,spec}.{js,ts,tsx}',
        'services/**/*.{test,spec}.{js,ts,tsx}',
        'utils/**/*.{test,spec}.{js,ts,tsx}',
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
          '**/stories/**',
        ],
        thresholds: {
          global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
          },
        },
      },
    },
    define: {
      // Remove sensitive data from client side
      ...(isProduction && {
        'process.env.NODE_ENV': '"production"',
      }),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
        '@components': path.resolve(__dirname, './components'),
        '@services': path.resolve(__dirname, './services'),
        '@hooks': path.resolve(__dirname, './hooks'),
        '@utils': path.resolve(__dirname, './utils'),
        '@types': path.resolve(__dirname, './types'),
        '@assets': path.resolve(__dirname, './assets'),
        '@test': path.resolve(__dirname, './test'),
        '@store': path.resolve(__dirname, './store'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
      exclude: ['@tanstack/react-query-devtools'],
    },
    preview: {
      port: 3000,
      host: true,
    },
  };
});
