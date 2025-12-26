import { useEffect, useCallback, useRef } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { useSecurityStore } from '@/stores/securityStore';

const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
];

export function useSessionTimeout() {
  const { isUnlocked, lockWallet, walletType } = useWalletStore();
  const { sessionTimeoutMs, updateActivity, isSessionExpired } = useSecurityStore();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleActivity = useCallback(() => {
    updateActivity();

    // Reset timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (isUnlocked && walletType === 'internal') {
      timeoutRef.current = setTimeout(() => {
        if (isSessionExpired()) {
          lockWallet();
        }
      }, sessionTimeoutMs);
    }
  }, [isUnlocked, walletType, sessionTimeoutMs, updateActivity, isSessionExpired, lockWallet]);

  useEffect(() => {
    // Only track for internal wallets (not external like Phantom)
    if (!isUnlocked || walletType !== 'internal') {
      return;
    }

    // Initial activity update
    handleActivity();

    // Add event listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Check on visibility change (tab switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (isSessionExpired()) {
          lockWallet();
        } else {
          handleActivity();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isUnlocked, walletType, handleActivity, isSessionExpired, lockWallet]);
}
