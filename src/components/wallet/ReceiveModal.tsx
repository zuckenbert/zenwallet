import { useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useWalletStore } from '@/stores/walletStore';

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiveModal({ isOpen, onClose }: ReceiveModalProps) {
  const { publicKey } = useWalletStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!publicKey) return;

    try {
      await navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!publicKey) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receive">
      <div className="text-center">
        {/* QR Code */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-4 rounded-2xl inline-block mb-6"
        >
          <QRCodeSVG
            value={publicKey}
            size={200}
            level="H"
            includeMargin={false}
            bgColor="#FFFFFF"
            fgColor="#0A0A0B"
          />
        </motion.div>

        {/* Address */}
        <p className="text-text-muted text-sm mb-2">Your Solana Address</p>
        <div className="bg-bg-tertiary rounded-xl p-4 mb-4">
          <p className="font-mono text-sm text-text-primary break-all">
            {publicKey}
          </p>
        </div>

        {/* Copy Button */}
        <Button
          variant={copied ? 'primary' : 'secondary'}
          size="lg"
          className="w-full"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                />
              </svg>
              Copy Address
            </>
          )}
        </Button>

        {/* Warning */}
        <p className="text-text-muted text-xs mt-4">
          Only send Solana (SOL) and SPL tokens to this address
        </p>
      </div>
    </Modal>
  );
}
