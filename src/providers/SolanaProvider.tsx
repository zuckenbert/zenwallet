import { ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface SolanaProviderProps {
  children: ReactNode;
}

export function SolanaProvider({ children }: SolanaProviderProps) {
  const network = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';
  const heliusKey = import.meta.env.VITE_HELIUS_API_KEY;

  const endpoint = useMemo(() => {
    if (heliusKey) {
      const cluster = network === 'mainnet-beta' ? 'mainnet' : 'devnet';
      return `https://${cluster}.helius-rpc.com/?api-key=${heliusKey}`;
    }
    return clusterApiUrl(network as 'devnet' | 'mainnet-beta');
  }, [network, heliusKey]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
