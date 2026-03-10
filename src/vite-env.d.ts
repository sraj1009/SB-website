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
