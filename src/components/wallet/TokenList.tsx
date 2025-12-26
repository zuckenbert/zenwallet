import { motion } from 'framer-motion';
import { useBalance } from '@/hooks/useBalance';
import { TokenBalance } from '@/types/token';

interface TokenRowProps {
  token: TokenBalance;
  index: number;
}

function TokenRow({ token, index }: TokenRowProps) {
  const formatBalance = (value: number) => {
    if (value < 0.001) return '<0.001';
    if (value < 1) return value.toFixed(4);
    if (value < 1000) return value.toFixed(2);
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const formatUSD = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center justify-between p-4 bg-bg-secondary rounded-xl hover:bg-bg-tertiary transition-colors"
    >
      <div className="flex items-center gap-3">
        {/* Token Logo */}
        <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center overflow-hidden">
          {token.logoURI ? (
            <img
              src={token.logoURI}
              alt={token.symbol}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span className="text-lg font-bold text-text-muted">
              {token.symbol.charAt(0)}
            </span>
          )}
        </div>

        {/* Token Info */}
        <div>
          <h3 className="font-semibold text-text-primary">{token.symbol}</h3>
          <p className="text-sm text-text-muted">{token.name}</p>
        </div>
      </div>

      {/* Balance */}
      <div className="text-right">
        <p className="font-semibold text-text-primary">
          {formatBalance(token.uiBalance)}
        </p>
        <p className="text-sm text-text-muted">{formatUSD(token.usdValue)}</p>
      </div>
    </motion.div>
  );
}

export function TokenList() {
  const { balances, isLoading, error } = useBalance();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 bg-bg-secondary rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-error">{error}</p>
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-muted">No tokens found</p>
        <p className="text-sm text-text-muted mt-1">
          Add SOL to your wallet to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {balances.map((token, index) => (
        <TokenRow key={token.mint} token={token} index={index} />
      ))}
    </div>
  );
}
