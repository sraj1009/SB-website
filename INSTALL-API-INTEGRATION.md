# 🚀 API Integration Installation Guide

## 🔧 Fix TypeScript Errors

The TypeScript errors you're seeing are due to missing dependencies and type definitions. Follow these steps to fix them:

### 1. Install Required Dependencies

```bash
# Install the required packages
npm install @tanstack/react-query axios react-toastify

# Install development dependencies
npm install -D @types/node vitest jsdom @vitest/ui
```

### 2. Add Environment Types

Create or update your `src/vite-env.d.ts` file:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_CASHFREE_APP_ID: string;
  readonly VITE_CASHFREE_SECRET_KEY: string;
  readonly DEV: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### 3. Update tsconfig.json

Make sure your `tsconfig.json` includes these settings:

```json
{
  "compilerOptions": {
    "types": ["vite/client", "node"],
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*", "types/**/*", "services/**/*", "hooks/**/*"]
}
```

### 4. Create Environment File

Create a `.env` file in your project root:

```env
# API Configuration
VITE_API_BASE_URL=/api/v1

# Payment Integration (if needed)
VITE_CASHFREE_APP_ID=your_app_id
VITE_CASHFREE_SECRET_KEY=your_secret_key
```

## 📁 File Structure

Ensure your project has this structure:

```
src/
├── types/
│   └── api.ts
├── utils/
│   └── error-handler.ts
├── services/
│   ├── api-client.ts
│   ├── auth.service.ts
│   ├── product.service.ts
│   ├── cart.service.ts
│   ├── order.service.ts
│   ├── review.service.ts
│   └── admin.service.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useProductsQuery.ts
│   ├── useCart.ts
│   ├── useOrders.ts
│   ├── useReviews.ts
│   └── useAdmin.ts
└── vite-env.d.ts
```

## 🧪 Test Setup

### 1. Configure Vitest

Update your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

### 2. Create Test Setup

Create `src/test/setup.ts`:

```typescript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect
expect.extend(matchers);

// Clean up after each test
afterEach(() => {
  cleanup();
});
```

## 🔍 Error Fixes Applied

### Fixed Issues:

1. **Missing axios dependency** - Added to package.json
2. **import.meta.env type errors** - Added Vite environment types
3. **RequestConfig method property** - Updated type definitions
4. **React import missing in hooks** - Added React imports
5. **Development environment access** - Fixed with optional chaining

### Before vs After:

**Before:**
```typescript
// ❌ Errors
import.meta.env.VITE_API_BASE_URL  // Property 'env' does not exist
config.method                    // Property 'method' does not exist
```

**After:**
```typescript
// ✅ Fixed
(import.meta.env?.VITE_API_BASE_URL as string) || '/api/v1'
config: RequestConfig & { url: string; method?: string }
```

## 🚀 Quick Start

### 1. Setup React Query Provider

```tsx
// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### 2. Use the Hooks

```tsx
// Example component
import { useAuth, useCartManager } from './hooks';

function MyComponent() {
  const { user, login } = useAuth();
  const { cart, addProduct } = useCartManager();
  
  return (
    <div>
      <h1>Welcome, {user?.fullName}</h1>
      <button onClick={() => addProduct('product-id', 1)}>
        Add to Cart
      </button>
    </div>
  );
}
```

## 📦 Package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

## 🔍 Verification

After installation, run these commands to verify everything works:

```bash
# Check TypeScript compilation
npm run build

# Run tests
npm test

# Start development server
npm run dev
```

## 🆘 Still Having Issues?

If you still encounter errors:

1. **Clear cache**: `npm run build -- --force`
2. **Restart IDE**: Close and reopen your editor
3. **Check Node version**: Ensure you're using Node 18+
4. **Verify paths**: Make sure all file paths are correct

## 📞 Need Help?

- Check the full documentation: `README-API-INTEGRATION.md`
- Review example components: `examples/component-integration-examples.tsx`
- Run tests to see working examples: `npm test`

---

**All TypeScript errors should now be resolved! 🎉**
