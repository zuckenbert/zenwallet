export interface TokenBalance {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: number;        // Raw balance
  uiBalance: number;      // Human readable balance
  usdValue: number | null;
  logoURI?: string;
  isNative?: boolean;
}

export interface TokenPrice {
  mint: string;
  priceUsd: number;
  change24h?: number;
}

export interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  fee: number;
  route: string[];
}

export interface TransactionResult {
  signature: string;
  status: 'success' | 'failed';
  error?: string;
}
