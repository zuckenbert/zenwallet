import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useBalance } from '@/hooks/useBalance';
import { useSwap } from '@/hooks/useSwap';
import { TokenBalance } from '@/types/token';
import { KNOWN_TOKENS, SOL_MINT, ZENWALLET_FEE_BPS } from '@/constants/tokens';
import { getExplorerUrl } from '@/lib/solana/connection';

// Popular swap pairs
const SWAP_TOKENS = [
  SOL_MINT,
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
];

export function SwapInterface() {
  const { balances } = useBalance();
  const { quote, isLoadingQuote, isSwapping, error, fetchQuote, swap, clearQuote } = useSwap();

  const [inputToken, setInputToken] = useState<TokenBalance | null>(null);
  const [outputMint, setOutputMint] = useState<string>(
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  );
  const [inputAmount, setInputAmount] = useState('');
  const [txSignature, setTxSignature] = useState<string | null>(null);

  // Set initial input token
  useEffect(() => {
    if (balances.length > 0 && !inputToken) {
      setInputToken(balances[0]);
    }
  }, [balances, inputToken]);

  // Debounced quote fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputToken && outputMint && parseFloat(inputAmount) > 0) {
        fetchQuote(inputToken, outputMint, parseFloat(inputAmount));
      } else {
        clearQuote();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inputToken, outputMint, inputAmount, fetchQuote, clearQuote]);

  const handleSwapTokens = () => {
    if (!inputToken || !quote) return;

    const newInputMint = outputMint;
    const newOutputMint = inputToken.mint;

    // Find the token in balances
    const newInputToken = balances.find((b) => b.mint === newInputMint);

    if (newInputToken) {
      setInputToken(newInputToken);
      setOutputMint(newOutputMint);
      setInputAmount('');
    }
  };

  const handleMaxClick = () => {
    if (!inputToken) return;
    const maxAmount = inputToken.isNative
      ? Math.max(0, inputToken.uiBalance - 0.01)
      : inputToken.uiBalance;
    setInputAmount(maxAmount.toString());
  };

  const handleSwap = async () => {
    const result = await swap();
    if (result.status === 'success') {
      setTxSignature(result.signature);
      setInputAmount('');
    }
  };

  const formatAmount = (amount: string, decimals: number): string => {
    const value = parseInt(amount) / Math.pow(10, decimals);
    if (value < 0.001) return '<0.001';
    if (value < 1) return value.toFixed(6);
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const outputToken = KNOWN_TOKENS[outputMint];

  return (
    <div className="space-y-4">
      {/* Success Message */}
      <AnimatePresence>
        {txSignature && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-success/10 border border-success/20 rounded-xl p-4"
          >
            <p className="text-success font-semibold mb-1">Swap Complete!</p>
            <a
              href={getExplorerUrl(txSignature)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-solana-green hover:underline"
            >
              View on Explorer →
            </a>
            <button
              onClick={() => setTxSignature(null)}
              className="ml-4 text-sm text-text-muted hover:text-text-primary"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Token */}
      <div className="bg-bg-secondary rounded-2xl p-4">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-text-muted">You pay</span>
          <button
            onClick={handleMaxClick}
            className="text-sm text-solana-green hover:underline"
          >
            Max: {inputToken?.uiBalance.toFixed(4) || '0'}
          </button>
        </div>

        <div className="flex gap-3">
          <select
            value={inputToken?.mint || ''}
            onChange={(e) => {
              const token = balances.find((b) => b.mint === e.target.value);
              setInputToken(token || null);
            }}
            className="bg-bg-tertiary rounded-xl px-4 py-3 text-text-primary font-semibold"
          >
            {balances.map((token) => (
              <option key={token.mint} value={token.mint}>
                {token.symbol}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            placeholder="0.00"
            className="flex-1 bg-transparent text-right text-2xl font-semibold text-text-primary placeholder:text-text-muted focus:outline-none"
          />
        </div>
      </div>

      {/* Swap Arrow */}
      <div className="flex justify-center -my-2 relative z-10">
        <button
          onClick={handleSwapTokens}
          disabled={!quote}
          className="w-10 h-10 bg-bg-tertiary rounded-xl flex items-center justify-center hover:bg-bg-secondary transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* Output Token */}
      <div className="bg-bg-secondary rounded-2xl p-4">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-text-muted">You receive</span>
        </div>

        <div className="flex gap-3">
          <select
            value={outputMint}
            onChange={(e) => setOutputMint(e.target.value)}
            className="bg-bg-tertiary rounded-xl px-4 py-3 text-text-primary font-semibold"
          >
            {SWAP_TOKENS.filter((mint) => mint !== inputToken?.mint).map((mint) => (
              <option key={mint} value={mint}>
                {KNOWN_TOKENS[mint]?.symbol || 'UNKNOWN'}
              </option>
            ))}
          </select>

          <div className="flex-1 text-right">
            {isLoadingQuote ? (
              <div className="h-8 w-24 ml-auto bg-bg-tertiary animate-pulse rounded" />
            ) : quote ? (
              <span className="text-2xl font-semibold text-text-primary">
                {formatAmount(quote.outAmount, outputToken?.decimals || 6)}
              </span>
            ) : (
              <span className="text-2xl font-semibold text-text-muted">0.00</span>
            )}
          </div>
        </div>
      </div>

      {/* Quote Details */}
      {quote && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-bg-tertiary rounded-xl p-4 space-y-2 text-sm"
        >
          <div className="flex justify-between">
            <span className="text-text-muted">Price Impact</span>
            <span
              className={
                parseFloat(quote.priceImpactPct) > 1
                  ? 'text-warning'
                  : 'text-text-primary'
              }
            >
              {(parseFloat(quote.priceImpactPct) * 100).toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">ZenWallet Fee</span>
            <span className="text-text-primary">{ZENWALLET_FEE_BPS / 100}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Route</span>
            <span className="text-text-primary text-xs">
              {quote.routePlan.map((r) => r.swapInfo.label).join(' → ')}
            </span>
          </div>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <p className="text-error text-sm text-center">{error}</p>
      )}

      {/* Swap Button */}
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={handleSwap}
        disabled={!quote || isSwapping || !inputAmount}
        isLoading={isSwapping}
      >
        {!inputAmount
          ? 'Enter amount'
          : !quote
          ? 'Getting quote...'
          : 'Swap'}
      </Button>
    </div>
  );
}
