import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getConnection } from './connection';
import { TokenBalance } from '@/types/token';
import { KNOWN_TOKENS, SOL_MINT, getTokenMetadata } from '@/constants/tokens';

const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY || '';

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

export async function fetchBalances(publicKey: string): Promise<TokenBalance[]> {
  const connection = getConnection();
  const balances: TokenBalance[] = [];

  // 1. Get native SOL balance
  try {
    const lamports = await connection.getBalance(new PublicKey(publicKey));
    const solBalance = lamports / LAMPORTS_PER_SOL;

    balances.push({
      mint: SOL_MINT,
      symbol: 'SOL',
      name: 'Solana',
      decimals: 9,
      balance: lamports,
      uiBalance: solBalance,
      usdValue: null, // Will be fetched separately
      logoURI: KNOWN_TOKENS[SOL_MINT]?.logoURI,
      isNative: true,
    });
  } catch (error) {
    console.error('Error fetching SOL balance:', error);
  }

  // 2. Get SPL tokens via Helius DAS API (if available)
  if (HELIUS_API_KEY) {
    try {
      const response = await fetch(
        `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
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

      const data = await response.json();
      const assets: HeliusAsset[] = data?.result?.items || [];

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
    } catch (error) {
      console.error('Error fetching SPL tokens:', error);
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

export async function fetchTokenPrices(mints: string[]): Promise<Record<string, number>> {
  // Use Jupiter price API
  try {
    const response = await fetch(
      `https://price.jup.ag/v6/price?ids=${mints.join(',')}`
    );
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
