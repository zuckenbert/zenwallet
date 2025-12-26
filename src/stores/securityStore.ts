import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SecurityState {
  // Disclaimer acceptance
  disclaimerAccepted: boolean;
  disclaimerAcceptedAt: string | null;

  // Session tracking
  lastActivity: number;
  sessionTimeoutMs: number;

  // Actions
  acceptDisclaimer: () => void;
  updateActivity: () => void;
  setSessionTimeout: (ms: number) => void;
  isSessionExpired: () => boolean;
}

const DEFAULT_SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set, get) => ({
      disclaimerAccepted: false,
      disclaimerAcceptedAt: null,
      lastActivity: Date.now(),
      sessionTimeoutMs: DEFAULT_SESSION_TIMEOUT,

      acceptDisclaimer: () => {
        set({
          disclaimerAccepted: true,
          disclaimerAcceptedAt: new Date().toISOString(),
        });
      },

      updateActivity: () => {
        set({ lastActivity: Date.now() });
      },

      setSessionTimeout: (ms: number) => {
        set({ sessionTimeoutMs: ms });
      },

      isSessionExpired: () => {
        const { lastActivity, sessionTimeoutMs } = get();
        return Date.now() - lastActivity > sessionTimeoutMs;
      },
    }),
    {
      name: 'zenwallet-security',
      partialize: (state) => ({
        disclaimerAccepted: state.disclaimerAccepted,
        disclaimerAcceptedAt: state.disclaimerAcceptedAt,
        sessionTimeoutMs: state.sessionTimeoutMs,
      }),
    }
  )
);
