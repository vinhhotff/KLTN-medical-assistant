/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_ENABLE_DEMO_LOGIN?: 'true' | 'false';
  readonly VITE_ENABLE_DEV_TOOLS?: 'true' | 'false';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
