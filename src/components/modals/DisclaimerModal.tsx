import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useSecurityStore } from '@/stores/securityStore';

export function DisclaimerModal() {
  const { disclaimerAccepted, acceptDisclaimer } = useSecurityStore();
  const [checked, setChecked] = useState(false);

  if (disclaimerAccepted) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-bg-secondary rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text-primary">Important Notice</h2>
          </div>

          <div className="space-y-4 text-sm text-text-secondary mb-6">
            <div className="bg-bg-tertiary rounded-xl p-4">
              <h3 className="font-semibold text-text-primary mb-2">Self-Custody Wallet</h3>
              <p>ZenWallet is a self-custody wallet. You are solely responsible for your seed phrase and funds. We cannot recover your wallet if you lose your seed phrase.</p>
            </div>

            <div className="bg-bg-tertiary rounded-xl p-4">
              <h3 className="font-semibold text-text-primary mb-2">Backup Your Seed Phrase</h3>
              <p>Write down your 12-word seed phrase and store it securely offline. Never share it with anyone. Anyone with your seed phrase can access your funds.</p>
            </div>

            <div className="bg-bg-tertiary rounded-xl p-4">
              <h3 className="font-semibold text-text-primary mb-2">Irreversible Transactions</h3>
              <p>Blockchain transactions are irreversible. Always double-check addresses before sending. We cannot reverse or cancel transactions.</p>
            </div>

            <div className="bg-error/10 border border-error/20 rounded-xl p-4">
              <h3 className="font-semibold text-error mb-2">Risk Warning</h3>
              <p className="text-error/80">Cryptocurrency involves significant risk. Only invest what you can afford to lose. This is not financial advice.</p>
            </div>
          </div>

          <label className="flex items-start gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-text-muted bg-bg-tertiary checked:bg-solana-green"
            />
            <span className="text-sm text-text-secondary">
              I understand that ZenWallet is a self-custody wallet, I am responsible for my seed phrase, and transactions are irreversible.
            </span>
          </label>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!checked}
            onClick={acceptDisclaimer}
          >
            I Understand, Continue
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
