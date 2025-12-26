import { VersionedTransaction } from '@solana/web3.js';
import { ZENWALLET_FEE_BPS } from '@/constants/tokens';

const JUPITER_API_URL = 'https://quote-api.jup.ag/v6';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
}

export interface SwapResult {
  signature: string;
  status: 'success' | 'failed';
  error?: string;
}

export interface SwapTransaction {
  transaction: VersionedTransaction;
  quote: JupiterQuote;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for fetch operations with rate limit handling
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

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : RETRY_DELAY_MS * attempt * 2;
        console.warn(`Rate limited. Retrying after ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY_MS * attempt;
        console.warn(`Fetch attempt ${attempt} failed. Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}

/**
 * Get a swap quote from Jupiter
 */
export async function getQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number = 50
): Promise<JupiterQuote | null> {
  try {
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: amount.toString(),
      slippageBps: slippageBps.toString(),
      platformFeeBps: ZENWALLET_FEE_BPS.toString(),
    });

    const response = await fetchWithRetry(`${JUPITER_API_URL}/quote?${params}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Quote failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting quote:', error);
    return null;
  }
}

/**
 * Get unsigned swap transaction from Jupiter
 * This returns the transaction WITHOUT signing - signing is handled by transactionService
 */
export async function getSwapTransaction(
  quote: JupiterQuote,
  userPublicKey: string
): Promise<SwapTransaction> {
  const response = await fetchWithRetry(`${JUPITER_API_URL}/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Swap request failed: ${response.status} - ${errorText}`);
  }

  const swapData = await response.json();

  if (swapData.error) {
    throw new Error(swapData.error);
  }

  const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
  const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

  return { transaction, quote };
}

export function calculateOutputAmount(
  quote: JupiterQuote,
  outputDecimals: number
): number {
  const outAmount = parseInt(quote.outAmount);
  return outAmount / Math.pow(10, outputDecimals);
}

export function calculatePriceImpact(quote: JupiterQuote): number {
  return parseFloat(quote.priceImpactPct) * 100;
}
