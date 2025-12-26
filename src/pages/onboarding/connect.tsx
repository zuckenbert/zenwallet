import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useWalletStore } from '@/stores/walletStore';

export default function ConnectWalletPage() {
  const navigate = useNavigate();
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { setExternalWallet } = useWalletStore();

  useEffect(() => {
    if (connected && publicKey) {
      setExternalWallet(publicKey.toBase58());
      navigate('/');
    }
  }, [connected, publicKey, setExternalWallet, navigate]);

  const handleConnect = () => {
    setVisible(true);
  };

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-text-muted hover:text-text-primary"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-heading ml-4">Connect Wallet</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-accent-purple/20 flex items-center justify-center">
          <svg className="w-12 h-12 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>

        <h2 className="text-heading mb-4">Connect Your Wallet</h2>
        <p className="text-text-secondary mb-8 max-w-sm mx-auto">
          Connect your existing Phantom or Solflare wallet to start using ZenWallet.
        </p>

        <div className="space-y-4 max-w-sm mx-auto">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleConnect}
          >
            Choose Wallet
          </Button>

          {connected && (
            <Button
              variant="ghost"
              size="lg"
              className="w-full"
              onClick={() => disconnect()}
            >
              Disconnect
            </Button>
          )}
        </div>

        <div className="mt-12 space-y-4">
          <div className="flex items-center justify-center gap-6 text-text-muted">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center">
                👻
              </div>
              <span className="text-sm">Phantom</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center">
                🔥
              </div>
              <span className="text-sm">Solflare</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
