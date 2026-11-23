/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_THEME?: 'foundry' | 'atelier'
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
