import { Connection, clusterApiUrl } from '@solana/web3.js';

const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY || '';
const NETWORK = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';

// RPC endpoints in priority order
const RPC_ENDPOINTS = {
  mainnet: [
    HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}` : null,
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
  ].filter(Boolean) as string[],
  devnet: [
    HELIUS_API_KEY ? `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}` : null,
    'https://api.devnet.solana.com',
  ].filter(Boolean) as string[],
};

let currentRpcIndex = 0;
let connection: Connection | null = null;

function getRpcUrl(): string {
  const endpoints = NETWORK === 'mainnet-beta' ? RPC_ENDPOINTS.mainnet : RPC_ENDPOINTS.devnet;
  return endpoints[currentRpcIndex] || clusterApiUrl(NETWORK as 'devnet' | 'mainnet-beta');
}

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(getRpcUrl(), {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });
  }
  return connection;
}

/**
 * Switch to next available RPC endpoint (for fallback on failures)
 */
export function switchToNextRpc(): boolean {
  const endpoints = NETWORK === 'mainnet-beta' ? RPC_ENDPOINTS.mainnet : RPC_ENDPOINTS.devnet;

  if (currentRpcIndex < endpoints.length - 1) {
    currentRpcIndex++;
    connection = null; // Force new connection
    console.warn(`Switching to fallback RPC: ${getRpcUrl()}`);
    return true;
  }

  return false;
}

/**
 * Reset to primary RPC endpoint
 */
export function resetToPrimaryRpc(): void {
  currentRpcIndex = 0;
  connection = null;
}

/**
 * Get current RPC endpoint URL (for debugging)
 */
export function getCurrentRpcUrl(): string {
  return getRpcUrl();
}

/**
 * Check if Helius API key is configured
 */
export function hasHeliusApiKey(): boolean {
  return !!HELIUS_API_KEY;
}

/**
 * Get the Helius API key (for direct API calls)
 */
export function getHeliusApiKey(): string {
  return HELIUS_API_KEY;
}

/**
 * Get current network
 */
export function getNetwork(): string {
  return NETWORK;
}

export function getExplorerUrl(signature: string): string {
  const cluster = NETWORK === 'mainnet-beta' ? '' : `?cluster=${NETWORK}`;
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
}

export function getAddressExplorerUrl(address: string): string {
  const cluster = NETWORK === 'mainnet-beta' ? '' : `?cluster=${NETWORK}`;
  return `https://explorer.solana.com/address/${address}${cluster}`;
}
