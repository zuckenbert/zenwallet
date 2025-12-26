import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getConnection, getHeliusApiKey, hasHeliusApiKey, getNetwork } from './connection';
import { TokenBalance } from '@/types/token';
import { KNOWN_TOKENS, SOL_MINT, getTokenMetadata } from '@/constants/tokens';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

interface HeliusAsset {
  id: string;
  interface: string;
  content: {
    metadata: {
      name: string;
      symbol: string;
    };
    links?: {
      image?: string;
    };
  };
  token_info?: {
    balance: number;
    decimals: number;
    price_info?: {
      price_per_token: number;
    };
  };
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with retry and rate limit handling
 */
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : RETRY_DELAY_MS * attempt * 2;
        console.warn(`Rate limited on tokens fetch. Retrying after ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY_MS * attempt;
        console.warn(`Token fetch attempt ${attempt} failed. Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Token fetch failed after retries');
}

/**
 * Fetch SOL balance with retry
 */
async function fetchSolBalance(publicKey: string): Promise<TokenBalance | null> {
  const connection = getConnection();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const lamports = await connection.getBalance(new PublicKey(publicKey));
      const solBalance = lamports / LAMPORTS_PER_SOL;

      return {
        mint: SOL_MINT,
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        balance: lamports,
        uiBalance: solBalance,
        usdValue: null,
        logoURI: KNOWN_TOKENS[SOL_MINT]?.logoURI,
        isNative: true,
      };
    } catch (error) {
      console.warn(`SOL balance fetch attempt ${attempt} failed:`, error);
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  console.error('Failed to fetch SOL balance after retries');
  return null;
}

/**
 * Fetch SPL tokens via Helius DAS API
 */
async function fetchSplTokensHelius(publicKey: string): Promise<TokenBalance[]> {
  const apiKey = getHeliusApiKey();
  const network = getNetwork();
  const cluster = network === 'mainnet-beta' ? 'mainnet' : 'devnet';

  const response = await fetchWithRetry(
    `https://${cluster}.helius-rpc.com/?api-key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'zenwallet',
        method: 'searchAssets',
        params: {
          ownerAddress: publicKey,
          tokenType: 'fungible',
          displayOptions: {
            showNativeBalance: false,
          },
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Helius API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Helius API error');
  }

  const assets: HeliusAsset[] = data?.result?.items || [];
  const balances: TokenBalance[] = [];

  for (const asset of assets) {
    if (!asset.token_info || asset.token_info.balance === 0) continue;

    const knownToken = getTokenMetadata(asset.id);
    const uiBalance = asset.token_info.balance / Math.pow(10, asset.token_info.decimals);

    balances.push({
      mint: asset.id,
      symbol: knownToken?.symbol || asset.content?.metadata?.symbol || 'UNKNOWN',
      name: knownToken?.name || asset.content?.metadata?.name || 'Unknown Token',
      decimals: asset.token_info.decimals,
      balance: asset.token_info.balance,
      uiBalance,
      usdValue: asset.token_info.price_info
        ? uiBalance * asset.token_info.price_info.price_per_token
        : null,
      logoURI: knownToken?.logoURI || asset.content?.links?.image,
    });
  }

  return balances;
}

/**
 * Fetch all balances for a wallet
 */
export async function fetchBalances(publicKey: string): Promise<TokenBalance[]> {
  const balances: TokenBalance[] = [];

  // 1. Get native SOL balance
  const solBalance = await fetchSolBalance(publicKey);
  if (solBalance) {
    balances.push(solBalance);
  }

  // 2. Get SPL tokens via Helius DAS API (if available)
  if (hasHeliusApiKey()) {
    try {
      const splTokens = await fetchSplTokensHelius(publicKey);
      balances.push(...splTokens);
    } catch (error) {
      console.error('Error fetching SPL tokens:', error);
      // Continue without SPL tokens rather than failing completely
    }
  }

  // Sort by USD value (highest first), then by balance
  return balances.sort((a, b) => {
    if (a.isNative) return -1;
    if (b.isNative) return 1;
    if (a.usdValue && b.usdValue) return b.usdValue - a.usdValue;
    if (a.usdValue) return -1;
    if (b.usdValue) return 1;
    return b.uiBalance - a.uiBalance;
  });
}

/**
 * Fetch token prices from Jupiter
 */
export async function fetchTokenPrices(mints: string[]): Promise<Record<string, number>> {
  if (mints.length === 0) return {};

  try {
    const response = await fetchWithRetry(
      `https://price.jup.ag/v6/price?ids=${mints.join(',')}`
    );

    if (!response.ok) {
      throw new Error(`Price API error: ${response.status}`);
    }

    const data = await response.json();

    const prices: Record<string, number> = {};
    for (const [mint, info] of Object.entries(data.data || {})) {
      prices[mint] = (info as { price: number }).price;
    }
    return prices;
  } catch (error) {
    console.error('Error fetching prices:', error);
    return {};
  }
}
