/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Default `/api/v1` */
  readonly VITE_API_PREFIX?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
