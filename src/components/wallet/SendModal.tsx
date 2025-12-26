import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useBalance } from '@/hooks/useBalance';
import { useTransaction } from '@/hooks/useTransaction';
import { TokenBalance } from '@/types/token';
import { shortenAddress } from '@/lib/solana/transactions';
import { getExplorerUrl } from '@/lib/solana/connection';

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedToken?: TokenBalance;
}

type Step = 'form' | 'confirm' | 'success' | 'error';

export function SendModal({ isOpen, onClose, preselectedToken }: SendModalProps) {
  const { balances } = useBalance();
  const { send, isLoading, error, validateAddress } = useTransaction();

  const [step, setStep] = useState<Step>('form');
  const [selectedToken, setSelectedToken] = useState<TokenBalance | null>(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [txSignature, setTxSignature] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setRecipient('');
      setAmount('');
      setTxSignature('');
      setSelectedToken(preselectedToken || balances[0] || null);
    }
  }, [isOpen, preselectedToken, balances]);

  const handleMaxClick = () => {
    if (selectedToken) {
      // Leave some SOL for fees if sending SOL
      const maxAmount = selectedToken.isNative
        ? Math.max(0, selectedToken.uiBalance - 0.01)
        : selectedToken.uiBalance;
      setAmount(maxAmount.toString());
    }
  };

  const handleContinue = () => {
    if (!selectedToken || !recipient || !amount) return;
    if (!validateAddress(recipient)) return;
    if (parseFloat(amount) > selectedToken.uiBalance) return;
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!selectedToken) return;

    const result = await send(recipient, parseFloat(amount), selectedToken);

    if (result.status === 'success') {
      setTxSignature(result.signature);
      setStep('success');
    } else {
      setStep('error');
    }
  };

  const handleClose = () => {
    setStep('form');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Send">
      <AnimatePresence mode="wait">
        {/* Step: Form */}
        {step === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Token Selector */}
            <div>
              <label className="text-sm text-text-secondary mb-2 block">Token</label>
              <select
                value={selectedToken?.mint || ''}
                onChange={(e) => {
                  const token = balances.find((b) => b.mint === e.target.value);
                  setSelectedToken(token || null);
                }}
                className="w-full bg-bg-tertiary border border-text-muted/20 rounded-xl py-3 px-4 text-text-primary"
              >
                {balances.map((token) => (
                  <option key={token.mint} value={token.mint}>
                    {token.symbol} - {token.uiBalance.toFixed(4)}
                  </option>
                ))}
              </select>
            </div>

            {/* Recipient */}
            <Input
              label="Recipient Address"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Enter Solana address"
              error={recipient && !validateAddress(recipient) ? 'Invalid address' : undefined}
            />

            {/* Amount */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-text-secondary">Amount</label>
                <button
                  onClick={handleMaxClick}
                  className="text-sm text-solana-green hover:underline"
                >
                  Max
                </button>
              </div>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                error={
                  amount && selectedToken && parseFloat(amount) > selectedToken.uiBalance
                    ? 'Insufficient balance'
                    : undefined
                }
              />
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleContinue}
              disabled={
                !selectedToken ||
                !recipient ||
                !amount ||
                !validateAddress(recipient) ||
                parseFloat(amount) > (selectedToken?.uiBalance || 0)
              }
            >
              Continue
            </Button>
          </motion.div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && selectedToken && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="bg-bg-tertiary rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-text-muted">Sending</span>
                <span className="text-text-primary font-semibold">
                  {amount} {selectedToken.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">To</span>
                <span className="text-text-primary font-mono text-sm">
                  {shortenAddress(recipient, 6)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Network Fee</span>
                <span className="text-text-primary">~0.000005 SOL</span>
              </div>
            </div>

            {error && (
              <p className="text-error text-sm">{error}</p>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => setStep('form')}
              >
                Back
              </Button>
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={handleConfirm}
                isLoading={isLoading}
              >
                Confirm
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-heading text-success mb-2">Sent!</h3>
            <p className="text-text-secondary mb-4">
              Your transaction has been confirmed
            </p>
            <a
              href={getExplorerUrl(txSignature)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-solana-green hover:underline text-sm"
            >
              View on Explorer →
            </a>
            <Button
              variant="primary"
              size="lg"
              className="w-full mt-6"
              onClick={handleClose}
            >
              Done
            </Button>
          </motion.div>
        )}

        {/* Step: Error */}
        {step === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-heading text-error mb-2">Failed</h3>
            <p className="text-text-secondary mb-4">{error || 'Transaction failed'}</p>
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => setStep('form')}
            >
              Try Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
