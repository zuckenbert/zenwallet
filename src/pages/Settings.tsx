import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWalletStore } from '@/stores/walletStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { getAddressExplorerUrl } from '@/lib/solana/connection';
import { shortenAddress } from '@/lib/solana/transactions';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { publicKey, walletType, lockWallet, clearWallet } = useWalletStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleLock = () => {
    lockWallet();
    navigate('/onboarding');
  };

  const handleDelete = async () => {
    await clearWallet();
    navigate('/onboarding');
  };

  return (
    <div className="min-h-screen p-6 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
      </motion.div>

      {/* Wallet Info */}
      {publicKey && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {/* Wallet Section */}
          <div className="bg-bg-secondary rounded-xl p-4">
            <h3 className="text-sm text-text-muted mb-3">Wallet</h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Address</span>
                <a
                  href={getAddressExplorerUrl(publicKey)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-solana-green font-mono text-sm hover:underline"
                >
                  {shortenAddress(publicKey, 6)}
                </a>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Type</span>
                <span className="text-text-primary capitalize">
                  {walletType === 'internal' ? 'ZenWallet' : 'External'}
                </span>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-bg-secondary rounded-xl p-4">
            <h3 className="text-sm text-text-muted mb-3">Security</h3>

            <div className="space-y-2">
              <button
                onClick={handleLock}
                className="w-full flex justify-between items-center py-3 text-text-primary hover:text-solana-green transition-colors"
              >
                <span>Lock Wallet</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-error/5 border border-error/20 rounded-xl p-4">
            <h3 className="text-sm text-error mb-3">Danger Zone</h3>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex justify-between items-center py-3 text-error hover:text-error/80 transition-colors"
            >
              <span>Delete Wallet</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          {/* App Info */}
          <div className="text-center pt-4">
            <p className="text-text-muted text-sm">ZenWallet v1.2.0</p>
            <p className="text-text-muted text-xs mt-1">
              Crypto made fun. For real.
            </p>
          </div>
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Wallet?"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            This will permanently delete your wallet from this device. Make sure you have your recovery phrase backed up.
          </p>

          <div className="bg-error/10 border border-error/20 rounded-xl p-4">
            <p className="text-error text-sm">
              ⚠️ This action cannot be undone. Without your recovery phrase, you will lose access to your funds forever.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="flex-1 !bg-error hover:!bg-error/80"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
