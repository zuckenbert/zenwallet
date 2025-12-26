/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOLANA_NETWORK: string;
  readonly VITE_HELIUS_API_KEY: string;
  readonly VITE_JUPITER_API_URL: string;
  readonly VITE_MIDAZ_API_URL: string;
  readonly VITE_MIDAZ_ORG_ID: string;
  readonly VITE_MIDAZ_LEDGER_ID: string;
  readonly VITE_SWAP_FEE_BPS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
